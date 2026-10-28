import * as THREE from './three.module.js';

// The miniature stage uses its own light layer so the chess sculptures keep
// their existing materials, reflections and lighting.
export function createDioramaStage(scene, camera) {
  const stage = new THREE.Group();
  stage.name = 'Celestial miniature plinth';
  scene.add(stage);
  camera.layers.enable(1);
  const stone = new THREE.MeshStandardMaterial({color:'#27354c',roughness:.84,metalness:.12});
  const edge = new THREE.MeshStandardMaterial({color:'#121c30',roughness:.65,metalness:.3});
  const brass = new THREE.MeshStandardMaterial({color:'#ad9061',roughness:.4,metalness:.6,emissive:'#5c3918',emissiveIntensity:.12});
  function slab(width, depth, top, thickness, material, bevel) {
    const s = new THREE.Shape(), h = width/2, r = .3;
    s.moveTo(-h+r,-h);s.lineTo(h-r,-h);s.quadraticCurveTo(h,-h,h,-h+r);
    s.lineTo(h,h-r);s.quadraticCurveTo(h,h,h-r,h);s.lineTo(-h+r,h);
    s.quadraticCurveTo(-h,h,-h,h-r);s.lineTo(-h,-h+r);s.quadraticCurveTo(-h,-h,-h+r,-h);
    const geometry = new THREE.ExtrudeGeometry(s,{depth:thickness-2*bevel,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:8});
    const m = new THREE.Mesh(geometry,material);
    m.rotation.x=-Math.PI/2;m.position.y=top-thickness+bevel;m.scale.y=depth/width;
    m.layers.set(1);m.castShadow=true;m.receiveShadow=true;stage.add(m);return m;
  }
  slab(10.5,10.5,-.34,.24,stone,.06);
  slab(10.25,10.25,-.58,.065,brass,.015);
  slab(10.1,10.1,-.645,.84,edge,.09);
  slab(10.3,10.3,-1.485,.075,brass,.02);
  slab(10.65,10.65,-1.56,.25,stone,.07);

  const fill=new THREE.HemisphereLight('#dbeaff','#635775',2.2);fill.layers.set(1);scene.add(fill);
  const warm=new THREE.DirectionalLight('#ffe2b6',2.8);warm.position.set(-5,8,6);warm.layers.set(1);scene.add(warm);
  const cool=new THREE.DirectionalLight('#7b9fec',1.6);cool.position.set(5,4,-6);cool.layers.set(1);scene.add(cool);

  const pearl=new THREE.MeshStandardMaterial({color:'#f4e5d8',roughness:1,metalness:0});
  const twilight=new THREE.MeshStandardMaterial({color:'#929fca',roughness:1,metalness:0});
  const sphere=new THREE.SphereGeometry(1,24,16), clouds=[];
  function cloud(x,y,z,size,night,phase) {
    const g=new THREE.Group();g.position.set(x,y,z);stage.add(g);
    // Overlapping ellipsoids form sculpted, opaque miniature cumulus clouds.
    const lobes=[[-.66,0,0,.58,.27,.4],[-.25,.13,.02,.63,.38,.46],[.28,.08,0,.65,.32,.44],[.75,-.04,.02,.43,.23,.32],[-.16,.38,-.05,.37,.39,.34],[.31,.29,-.09,.36,.31,.33],[0,-.12,.15,.9,.19,.4]];
    for(const [a,b,c,sx,sy,sz] of lobes){const m=new THREE.Mesh(sphere,night?twilight:pearl);m.position.set(a,b,c);m.scale.set(sx,sy,sz);m.layers.set(1);g.add(m);}
    g.scale.setScalar(size);g.rotation.y=phase;clouds.push({g,y,phase});
  }
  // All clusters sit outside the playable squares, leaving the pieces visible.
  cloud(-4.95,-.18,2.7,.85,false,.2);
  cloud(-5.22,-.05,.5,1.05,false,.8);
  cloud(-4.9,.05,-2.5,.83,true,1.4);
  cloud(4.95,-.08,2.7,.9,false,2.6);
  cloud(5.12,.02,.1,1.03,true,1.7);
  cloud(4.85,.05,-2.9,.8,true,2.2);
  cloud(-2.8,-.35,5.05,.75,false,.1);
  cloud(.05,-.38,5.22,.85,false,0);
  cloud(2.8,-.32,5.05,.72,false,.5);
  cloud(-2.8,.02,-5.05,.9,true,.3);
  cloud(-.2,.14,-5.15,1.05,true,0);
  cloud(2.8,.02,-5.05,.85,true,.4);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  document.body.dataset.diorama='ready';
  return time=>{for(const {g,y,phase} of clouds)g.position.y=y+(reducedMotion.matches?0:Math.sin(time*.00035+phase)*.045);};
}
