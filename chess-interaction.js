import * as THREE from './three.module.js';
import { createChessGame, squareName, tileAt, pieceTypes } from './chess-rules.js';

export function setupChessInteraction({board,pieces,tiles,canvas,camera}) {
  const game=createChessGame();
  const status=document.querySelector('#placement-status');
  const gameStatus=document.querySelector('#game-state');
  const cancel=document.querySelector('#cancel-selection');
  const moveList=document.querySelector('#legal-moves');
  const promotionDialog=document.querySelector('#promotion-dialog');
  const names={pawn:'폰',rook:'룩',knight:'나이트',bishop:'비숍',queen:'퀸',king:'킹'};
  const initial=pieces.map(piece=>({piece,data:{...piece.userData},children:[...piece.children],rotation:piece.rotation.clone()}));
  const templates=new Map(initial.map(({piece})=>[`${piece.userData.white}:${piece.userData.type}`,piece.clone(true)]));
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let selectedPiece=null,legalMoves=[],pendingPromotion=null;
  function marker(geometry,color,opacity) {
    const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,toneMapped:false,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;m.position.y=.12;m.renderOrder=10;m.visible=false;board.add(m);return m;
  }
  const selectionMarker=marker(new THREE.RingGeometry(.39,.46,64),'#ffe0a0',.95);
  const destinationMarker=marker(new THREE.PlaneGeometry(.94,.94),'#9ddfff',.25);
  const quietGeometry=new THREE.CircleGeometry(.14,32),captureGeometry=new THREE.RingGeometry(.40,.47,48);
  const legalMarkers=tiles.map(tile=>{
    const m=marker(quietGeometry,'#75f1ce',.95);m.position.x=tile.position.x;m.position.z=tile.position.z;return m;
  });
  function pieceAt(square) {return pieces.find(p=>p.visible&&squareName(p.userData)===square);}
  function sideName(color) {return color==='w'?'백':'흑';}
  function updateGameStatus() {
    const state=game.state();
    gameStatus.textContent=state.checkmate?`체크메이트 · ${sideName(state.turn==='w'?'b':'w')} 승리`:
      state.stalemate?'스테일메이트 · 무승부':state.draw?'무승부':`${sideName(state.turn)} 차례${state.check?' · 체크!':''}`;
    document.body.dataset.turn=state.turn;
    document.body.dataset.gameOver=String(state.over);
  }
  function selectPiece(piece,message) {
    selectedPiece=piece;legalMoves=piece?game.moves(squareName(piece.userData)):[];
    selectionMarker.visible=!!piece;destinationMarker.visible=false;cancel.hidden=!piece;
    if(piece){selectionMarker.position.x=piece.position.x;selectionMarker.position.z=piece.position.z;}
    for(let i=0;i<tiles.length;i++){
      const move=legalMoves.find(m=>m.to===squareName(tiles[i].userData)),m=legalMarkers[i];
      m.visible=!!move;
      if(move){const capture=!!move.captured;m.geometry=capture?captureGeometry:quietGeometry;m.material.color.set(capture?'#ffaf76':'#75f1ce');}
    }
    moveList.replaceChildren();
    for(const to of new Set(legalMoves.map(m=>m.to))){
      const move=legalMoves.find(m=>m.to===to),button=document.createElement('button');
      button.type='button';button.textContent=to;button.className=move.captured?'capture-move':'';
      button.setAttribute('aria-label',`${to} ${move.captured?'잡기':'이동'}`);
      button.addEventListener('click',()=>moveTo(to));moveList.appendChild(button);
    }
    moveList.hidden=!piece||!legalMoves.length;
    status.textContent=message||(piece?`${sideName(piece.userData.white?'w':'b')} ${names[piece.userData.type]} · ${squareName(piece.userData)} 선택 — ${new Set(legalMoves.map(m=>m.to)).size}개 칸 이동 가능`:
      game.state().over?'대국이 끝났습니다. 새 게임으로 다시 시작하세요.':'내 차례의 말을 선택하세요. 표시된 칸으로만 이동할 수 있습니다.');
  }
  function relocate(piece,square) {Object.assign(piece.userData,tileAt(square));piece.position.x=piece.userData.column-3.5;piece.position.z=piece.userData.row-3.5;}
  function moveTo(to,promotion) {
    if(!selectedPiece)return;
    const piece=selectedPiece,from=squareName(piece.userData);
    const result=game.move(from,to,promotion);
    if(result.promotionRequired){pendingPromotion=to;promotionDialog.showModal();return;}
    if(!result.ok){status.textContent='이동할 수 없는 칸입니다. 표시된 이동 가능 칸을 선택하세요.';return;}
    if(result.captureSquare){const captured=pieceAt(result.captureSquare);if(captured)captured.visible=false;}
    if(result.rook)relocate(pieceAt(result.rook.from),result.rook.to);
    relocate(piece,to);
    if(result.promotion){
      const type=pieceTypes[result.promotion],template=templates.get(`${piece.userData.white}:${type}`);
      piece.clear();for(const child of template.children)piece.add(child.clone(true));
      piece.rotation.copy(template.rotation);piece.userData.type=type;
    }
    pendingPromotion=null;if(promotionDialog.open)promotionDialog.close();
    updateGameStatus();
    selectPiece(null,game.state().over?undefined:`${sideName(result.color)} ${names[piece.userData.type]} ${from} → ${to}${result.captureSquare?' · 잡기':''}${result.rook?' · 캐슬링':''}. ${sideName(game.state().turn)} 차례입니다.`);
  }
  function hitBoard(e) {
    const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects([...pieces.filter(p=>p.visible),...tiles],true).find(h=>h.object.isMesh);
    if(!hit)return null;
    let object=hit.object;while(object.parent&&object.parent!==board)object=object.parent;
    if(pieces.includes(object))return{piece:object,tile:object.userData};
    if(tiles.includes(object))return{tile:object.userData,piece:pieceAt(squareName(object.userData))};
    return null;
  }
  function placeAtPointer(e) {
    if(pendingPromotion)return;
    const hit=hitBoard(e);if(!hit){selectPiece(null);return;}
    if(game.state().over){selectPiece(null);return;}
    if(hit.piece&&(hit.piece.userData.white?'w':'b')===game.state().turn){selectPiece(hit.piece===selectedPiece?null:hit.piece);return;}
    if(selectedPiece){moveTo(squareName(hit.tile));return;}
    status.textContent=`${sideName(game.state().turn)} 차례입니다. ${sideName(game.state().turn)} 말을 선택하세요.`;
  }
  function hoverAtPointer(e) {
    if(pendingPromotion)return;
    const hit=hitBoard(e),legal=!!hit&&legalMoves.some(m=>m.to===squareName(hit.tile));
    canvas.classList.toggle('selectable',!game.state().over&&!!hit&&(legal||!!hit.piece&&(hit.piece.userData.white?'w':'b')===game.state().turn));
    destinationMarker.visible=legal;
    if(legal){destinationMarker.position.x=hit.tile.column-3.5;destinationMarker.position.z=hit.tile.row-3.5;}
  }
  function cancelSelection(){pendingPromotion=null;if(promotionDialog.open)promotionDialog.close();selectPiece(null);}
  cancel.addEventListener('click',cancelSelection);
  addEventListener('keydown',e=>{if(e.key==='Escape')cancelSelection();});
  promotionDialog.addEventListener('cancel',e=>{e.preventDefault();cancelSelection();});
  for(const button of promotionDialog.querySelectorAll('[data-promotion]'))button.addEventListener('click',()=>moveTo(pendingPromotion,button.dataset.promotion));
  document.querySelector('#new-game').addEventListener('click',()=>{
    cancelSelection();game.reset();
    for(const record of initial){const p=record.piece;p.userData={...record.data};p.visible=true;p.clear();p.add(...record.children);p.rotation.copy(record.rotation);relocate(p,squareName(record.data));}
    updateGameStatus();selectPiece(null);
  });
  updateGameStatus();selectPiece(null);
  return {placeAtPointer,hoverAtPointer,destinationMarker};
}
