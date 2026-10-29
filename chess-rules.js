import { Chess } from './vendor/chess.js';

export function squareName({column,row}) { return `${'abcdefgh'[column]}${8-row}`; }
export function tileAt(square) { return {column:'abcdefgh'.indexOf(square[0]),row:8-Number(square[1])}; }
export const pieceTypes={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

// The engine owns legality; the renderer only applies a successfully committed move.
export function createChessGame(fen) {
  const chess=new Chess(fen);
  function state() {
    return {turn:chess.turn(),check:chess.isCheck(),checkmate:chess.isCheckmate(),
      stalemate:chess.isStalemate(),draw:chess.isDraw(),over:chess.isGameOver(),fen:chess.fen()};
  }
  function moves(from) { return chess.isGameOver()?[]:chess.moves({square:from,verbose:true}); }
  function move(from,to,promotion) {
    const candidates=moves(from).filter(m=>m.to===to);
    if(!candidates.length)return {ok:false};
    if(candidates.some(m=>m.promotion)&&!promotion)return {ok:false,promotionRequired:true};
    if(promotion&&!candidates.some(m=>m.promotion===promotion))return {ok:false};
    const result=chess.move({from,to,...(promotion?{promotion}:{})});
    const captureSquare=result.captured?(result.flags.includes('e')?`${to[0]}${from[1]}`:to):null;
    const rank=from[1];
    const rook=result.flags.includes('k')?{from:`h${rank}`,to:`f${rank}`}:
      result.flags.includes('q')?{from:`a${rank}`,to:`d${rank}`}:null;
    return {ok:true,from,to,captureSquare,rook,promotion:result.promotion,color:result.color,san:result.san};
  }
  return {state,moves,move,reset:()=>chess.reset()};
}
