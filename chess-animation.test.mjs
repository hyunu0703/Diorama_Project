import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './three.module.js';
import { createPieceAnimator } from './chess-animation.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('movement interpolates, eases, and ends exactly on the destination',()=>{
  const a=createPieceAnimator(),p=new THREE.Group();p.position.set(0,.12,0);
  const target=new THREE.Vector3(2,.12,2);let completed=0;
  a.move(p,target,{duration:1,onComplete:()=>completed++});
  a.update(.1);assert.ok(p.position.x>0&&p.position.x<.2);
  a.update(.4);near(p.position.x,1);assert.ok(p.position.y>.12);
  a.update(.5);assert.deepEqual(p.position.toArray(),target.toArray());
  assert.equal(a.busy,false);assert.equal(completed,1);a.update(5);assert.equal(completed,1);
});
test('knight leaps above intervening pieces and lands at board height',()=>{
  const a=createPieceAnimator(),p=new THREE.Group();p.position.y=.12;
  a.move(p,new THREE.Vector3(1,.12,-2),{duration:1,knight:true});
  a.update(.5);assert.ok(p.position.y>2);a.update(.5);near(p.position.y,.12);
});
test('capture waits for impact, spins and hides only after flying off the board',()=>{
  for(const [x,z] of [[.5,.5],[-3.5,3.5],[3.5,-3.5],[-.5,-.5],[0,0]]){
    const a=createPieceAnimator(),p=new THREE.Group();p.position.set(x,.12,z);let impacts=0;
    a.capture(p,{delay:.4,duration:1,onStart:()=>impacts++});
    a.update(.2);assert.deepEqual(p.position.toArray(),[x,.12,z]);assert.equal(impacts,0);
    a.update(.7);assert.equal(impacts,1);assert.equal(p.visible,true);assert.ok(p.position.y>3);
    assert.ok(p.position.x>x);near(p.position.z,z);
    assert.ok(p.rotation.toArray().some(v=>typeof v==='number'&&Math.abs(v)>1));
    a.update(.5);assert.equal(p.visible,false);assert.equal(a.busy,false);
    assert.ok(Math.max(Math.abs(p.position.x),Math.abs(p.position.z))>6);
  }
});
test('all capture squares continue the attacking move vector through the outer boundary',()=>{
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[1,2],[-2,1],[2,-1],[-1,-2]];
  for(let row=0;row<8;row++)for(let column=0;column<8;column++)for(const [dx,dz] of directions){
    const a=createPieceAnimator(),p=new THREE.Group(),x=column-3.5,z=row-3.5;
    p.position.set(x,.12,z);a.capture(p,{duration:1,direction:{x:dx,z:dz}});
    for(let step=0;step<4;step++){
      a.update(.25);const offsetX=p.position.x-x,offsetZ=p.position.z-z;
      near(offsetX*dz-offsetZ*dx,0);assert.ok(offsetX*dx+offsetZ*dz>0);
    }
    near(Math.max(Math.abs(p.position.x),Math.abs(p.position.z)),7.2);
    assert.equal(p.visible,false);
  }
});
test('reset cancels delayed capture callbacks and concurrent castling timelines finish together',()=>{
  const a=createPieceAnimator(),king=new THREE.Group(),rook=new THREE.Group();let launched=false;
  a.capture(rook,{delay:1,onStart:()=>launched=true});a.clear();a.update(2);
  assert.equal(launched,false);assert.equal(rook.visible,true);assert.equal(a.busy,false);
  a.move(king,new THREE.Vector3(2,.12,0),{duration:.8});
  a.move(rook,new THREE.Vector3(1,.12,0),{duration:.8});a.update(.4);
  assert.equal(a.busy,true);near(king.position.x,1);near(rook.position.x,.5);
  a.update(.4);assert.equal(a.busy,false);near(king.position.x,2);near(rook.position.x,1);
});
