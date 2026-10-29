import test from 'node:test';
import assert from 'node:assert/strict';
import { createChessGame, squareName, tileAt } from './chess-rules.js';

test('starting moves, blockers, turn order and rejected moves preserve position',()=>{
  const game=createChessGame();
  assert.deepEqual(game.moves('e2').map(m=>m.to).sort(),['e3','e4']);
  assert.deepEqual(game.moves('b1').map(m=>m.to).sort(),['a3','c3']);
  assert.equal(game.moves('a1').length,0);
  assert.equal(game.moves('a7').length,0);
  const before=game.state().fen;
  for(const [from,to] of [['e2','e5'],['e2','d3'],['a1','a3'],['e1','e2'],['e2','z9']])assert.equal(game.move(from,to).ok,false);
  assert.equal(game.state().fen,before);
  assert.equal(game.move('e2','e4').ok,true);
  assert.equal(game.state().turn,'b');
  assert.equal(game.move('d2','d4').ok,false);
  assert.equal(game.move('e7','e5').ok,true);
  assert.equal(game.move('e4','e6').ok,false);
});
test('piece movement and capture stop at blockers',()=>{
  const game=createChessGame('4k3/8/3p4/8/3R1P2/8/8/4K3 w - - 0 1');
  const squares=game.moves('d4').map(m=>m.to);
  assert.ok(squares.includes('d6'));assert.ok(!squares.includes('d7'));
  assert.ok(!squares.includes('f4'));assert.ok(!squares.includes('g4'));
  assert.equal(game.move('d4','d6').captureSquare,'d6');
});
test('pinned pieces and king cannot expose their king to attack',()=>{
  const game=createChessGame('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(game.move('e2','d2').ok,false);
  assert.ok(game.moves('e2').every(m=>m.to[0]==='e'));
  const check=createChessGame('k3r3/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(check.state().check,true);assert.equal(check.move('e1','e2').ok,false);
});
test('castling returns rook move, forbids attacked transit and lost rights',()=>{
  const game=createChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.deepEqual(game.move('e1','g1').rook,{from:'h1',to:'f1'});
  assert.deepEqual(game.move('e8','c8').rook,{from:'a8',to:'d8'});
  const attacked=createChessGame('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');
  assert.equal(attacked.move('e1','g1').ok,false);
  const lost=createChessGame('4k3/8/8/8/8/8/8/4K2R w - - 0 1');
  assert.equal(lost.move('e1','g1').ok,false);
});
test('en passant captures the adjacent pawn, expires, and cannot expose a check',()=>{
  const game=createChessGame();
  for(const [a,b] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5']])assert.ok(game.move(a,b).ok);
  assert.equal(game.move('e5','d6').captureSquare,'d5');
  const expired=createChessGame();
  for(const [a,b] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5'],['h2','h3'],['a6','a5']])assert.ok(expired.move(a,b).ok);
  assert.equal(expired.move('e5','d6').ok,false);
  const pinned=createChessGame('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.equal(pinned.move('e5','d6').ok,false);
});
test('promotion requires a valid choice and supports all four pieces',()=>{
  for(const promotion of ['q','r','b','n']){
    const game=createChessGame('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const fen=game.state().fen;
    assert.equal(game.move('a7','a8').promotionRequired,true);
    assert.equal(game.state().fen,fen);
    assert.equal(game.move('a7','a8','k').ok,false);
    assert.equal(game.move('a7','a8',promotion).promotion,promotion);
  }
});
test('checkmate and stalemate prevent further moves; reset starts a new game',()=>{
  const game=createChessGame();
  for(const [a,b] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])assert.ok(game.move(a,b).ok);
  assert.equal(game.state().checkmate,true);assert.equal(game.move('a2','a3').ok,false);
  game.reset();assert.equal(game.state().over,false);assert.equal(game.state().turn,'w');
  const stale=createChessGame('k7/8/1QK5/8/8/8/8/8 b - - 0 1');
  assert.equal(stale.state().stalemate,true);assert.deepEqual(stale.moves('a8'),[]);
});
test('board coordinates round-trip across all 64 tiles',()=>{
  for(let row=0;row<8;row++)for(let column=0;column<8;column++)assert.deepEqual(tileAt(squareName({column,row})),{column,row});
});
