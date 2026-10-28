import * as THREE from './three.module.js';

// All surfaces are shared by both ranks. Curved profiles preserve silhouettes at close range.
function revolved(draw) {
  const path = new THREE.Path();
  draw(path);
  const geometry = new THREE.LatheGeometry(path.getPoints(10), 112);
  geometry.computeBoundingBox();
  return geometry;
}

function turnedBody(height) {
  return revolved(p => {
    p.moveTo(0, .185); p.lineTo(.255, .185);
    p.bezierCurveTo(.29, .195, .30, .252, .263, .295);
    p.bezierCurveTo(.20, .375, .137, height * .61, .12, height * .75);
    p.bezierCurveTo(.112, height * .81, .12, height * .85, .169, height * .864);
    p.bezierCurveTo(.225, height * .872, .238, height * .914, .216, height * .945);
    p.bezierCurveTo(.198, height * .977, .163, height, .126, height);
    p.lineTo(0, height); p.closePath();
  });
}

function smoothUnion(a, b, k = .065) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * .25;
}
function ellipsoid(x, y, z, cx, cy, cz, rx, ry, rz, tilt = 0) {
  x -= cx; y -= cy; z -= cz;
  const u = Math.cos(tilt) * x + Math.sin(tilt) * y;
  const v = -Math.sin(tilt) * x + Math.cos(tilt) * y;
  return (Math.hypot(u / rx, v / ry, z / rz) - 1) * Math.min(rx, ry, rz);
}

// Indexed marching tetrahedra with field-gradient normals. This creates rounded solid
// sculpture rather than a beveled silhouette with a flat front and back.
export function implicitSurface(field, min, max, resolution) {
  const [nx, ny, nz] = resolution;
  const sx = nx + 1, sy = ny + 1;
  const points = [], values = [];
  for (let z = 0; z <= nz; z++) for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    const p = [min[0] + (max[0] - min[0]) * x / nx, min[1] + (max[1] - min[1]) * y / ny, min[2] + (max[2] - min[2]) * z / nz];
    points.push(p); values.push(field(...p));
  }
  const positions = [], normals = [], indices = [], edges = new Map();
  const epsilon = .001;
  function vertex(a, b) {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (edges.has(key)) return edges.get(key);
    const t = values[a] / (values[a] - values[b]);
    const p = points[a].map((v, i) => v + (points[b][i] - v) * t);
    const [x, y, z] = p;
    const normal = new THREE.Vector3(
      field(x + epsilon, y, z) - field(x - epsilon, y, z),
      field(x, y + epsilon, z) - field(x, y - epsilon, z),
      field(x, y, z + epsilon) - field(x, y, z - epsilon)
    ).normalize();
    const id = positions.length / 3; positions.push(...p); normals.push(normal.x, normal.y, normal.z); edges.set(key, id);
    return id;
  }
  function triangle(a, b, c) {
    const pa = new THREE.Vector3().fromArray(positions, a * 3), pb = new THREE.Vector3().fromArray(positions, b * 3), pc = new THREE.Vector3().fromArray(positions, c * 3);
    const normal = new THREE.Vector3().fromArray(normals, a * 3);
    if (pb.sub(pa).cross(pc.sub(pa)).dot(normal) < 0) indices.push(a, c, b); else indices.push(a, b, c);
  }
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = x + y * sx + z * sx * sy;
    const cube = [a, a + 1, a + 1 + sx, a + sx, a + sx * sy, a + sx * sy + 1, a + sx * sy + 1 + sx, a + sx * sy + sx];
    if (cube.every(i => values[i] > 0) || cube.every(i => values[i] <= 0)) continue;
    for (const tet of tetrahedra) {
      const inside = [], outside = [];
      for (const corner of tet) (values[cube[corner]] <= 0 ? inside : outside).push(cube[corner]);
      if (!inside.length || !outside.length) continue;
      if (inside.length === 1) triangle(...outside.map(b => vertex(inside[0], b)));
      else if (outside.length === 1) triangle(...inside.map(a => vertex(a, outside[0])));
      else {
        const a = vertex(inside[0], outside[0]), b = vertex(inside[0], outside[1]), c = vertex(inside[1], outside[0]), d = vertex(inside[1], outside[1]);
        triangle(a, b, c); triangle(b, d, c);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function createKnightField() {
  // Reference silhouette: diagonal Roman nose, defined jaw, deep throat and a swept back.
  // A varying, rounded cross section gives this outline a sculpted volume, not flat faces.
  const profile = new THREE.Path();
  profile.moveTo(-.275, .325);
  profile.bezierCurveTo(-.28, .46, -.19, .66, -.105, .855);
  profile.bezierCurveTo(-.054, .967, -.04, 1.074, -.091, 1.16);
  profile.quadraticCurveTo(-.146, 1.227, -.219, 1.185);
  profile.quadraticCurveTo(-.288, 1.12, -.365, 1.133);
  profile.quadraticCurveTo(-.435, 1.125, -.486, 1.178);
  profile.quadraticCurveTo(-.53, 1.217, -.505, 1.265);
  profile.bezierCurveTo(-.461, 1.327, -.392, 1.36, -.337, 1.414);
  profile.bezierCurveTo(-.259, 1.48, -.215, 1.563, -.12, 1.603);
  profile.bezierCurveTo(-.054, 1.636, .035, 1.635, .113, 1.584);
  profile.bezierCurveTo(.218, 1.514, .267, 1.36, .259, 1.164);
  profile.bezierCurveTo(.254, 1.007, .188, .841, .18, .70);
  profile.bezierCurveTo(.173, .553, .244, .431, .297, .325);
  profile.closePath();
  const outline = profile.getPoints(12);
  const minX=-.65, maxX=.43, minY=.23, maxY=1.85, nx=192, ny=288;
  const distances = new Float32Array((nx+1)*(ny+1));
  function exactDistance(x,y) {
    let distance=Infinity, inside=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
      const a=outline[j], b=outline[i], dx=b.x-a.x,dy=b.y-a.y;
      const t=THREE.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
      distance=Math.min(distance,(x-a.x-t*dx)**2+(y-a.y-t*dy)**2);
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return Math.sqrt(distance)*(inside?-1:1);
  }
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)distances[x+y*(nx+1)]=exactDistance(minX+(maxX-minX)*x/nx,minY+(maxY-minY)*y/ny);
  // Smooth medial-axis creases while retaining the drawn silhouette and carved jaw.
  const kernel=[1,4,6,4,1],scratch=new Float32Array(distances.length);
  for(let pass=0;pass<3;pass++){
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=distances[THREE.MathUtils.clamp(x+k,0,nx)+y*(nx+1)]*kernel[k+2];scratch[x+y*(nx+1)]=sum/16;}
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=scratch[x+THREE.MathUtils.clamp(y+k,0,ny)*(nx+1)]*kernel[k+2];distances[x+y*(nx+1)]=sum/16;}
  }
  function distance2D(x,y) {
    const gx=THREE.MathUtils.clamp((x-minX)/(maxX-minX)*nx,0,nx-.00001), gy=THREE.MathUtils.clamp((y-minY)/(maxY-minY)*ny,0,ny-.00001);
    const ix=Math.floor(gx),iy=Math.floor(gy),tx=gx-ix,ty=gy-iy,a=ix+iy*(nx+1);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(distances[a],distances[a+1],tx),THREE.MathUtils.lerp(distances[a+nx+1],distances[a+nx+2],tx),ty);
  }
  function body(x,y,z) {
    const head=THREE.MathUtils.smoothstep(y,1.12,1.48);
    const halfWidth=THREE.MathUtils.lerp(.202,.155,head);
    return distance2D(x,y)+.145*Math.pow(Math.abs(z)/halfWidth,2.6);
  }
  function surfaceDepth(x,y) {
    let a=0,b=.34;
    for(let i=0;i<22;i++){const z=(a+b)/2;if(body(x,y,z)<0)a=z;else b=z;}
    return (a+b)/2;
  }
  const eyes={x:-.213,y:1.458,z:surfaceDepth(-.213,1.458)};
  const nostrils={x:-.472,y:1.253,z:surfaceDepth(-.472,1.253)};
  function field(x,y,z) {
    let d=body(x,y,z);
    // Two separate, tapered ears. Tips are angled forward, rather than rounded rabbit ears.
    for(const side of[-1,1]){
      const h=(y-1.535)/.245,t=THREE.MathUtils.clamp(h,0,1);
      const radius=.051*Math.sin(Math.PI*Math.pow(t,.65));
      const ear=Math.max(Math.hypot(x-(-.035-.072*t),(z-side*(.098+.018*t))/.66)-radius,-h*.245,(h-1)*.245);
      d=smoothUnion(d,ear,.018);
      // Small recessed sockets; their insets follow the rounded cheek instead of floating.
      d=Math.max(d,-ellipsoid(x,y,z,eyes.x,eyes.y,side*(eyes.z-.004),.027,.022,.018));
      d=Math.max(d,-ellipsoid(x,y,z,nostrils.x,nostrils.y,side*(nostrils.z-.002),.014,.011,.012));
    }
    return d;
  }
  return {field,surfaceDepth,eyes,nostrils};
}
const knightSculpture=createKnightField();

function bishopField(x, y, z) {
  let d = ellipsoid(x, y, z, 0, 1.255, 0, .18, .255, .18);
  d = smoothUnion(d, ellipsoid(x, y, z, 0, 1.435, 0, .065, .13, .065), .025);
  const slot = Math.max(Math.abs(x + .48 * (y - 1.31)) - .021, 1.23 - y);
  return Math.max(d, -slot);
}

function rookBattlement() {
  const s = new THREE.Shape(), start = -.32, end = .32;
  s.absarc(0, 0, .28, start, end, false);
  s.lineTo(Math.cos(end) * .185, Math.sin(end) * .185);
  s.absarc(0, 0, .185, end, start, true); s.closePath();
  const geometry = new THREE.ExtrudeGeometry(s, { depth: .17, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 4, curveSegments: 14 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, 1.255, 0);
  return geometry;
}

function crossGeometry() {
  const s = new THREE.Shape(), w = .053;
  s.moveTo(-w, -.17);s.lineTo(w, -.17);s.lineTo(w, -.033);s.lineTo(.16, -.033);s.lineTo(.16, .06);s.lineTo(w, .06);s.lineTo(w, .19);s.lineTo(-w, .19);s.lineTo(-w, .06);s.lineTo(-.16, .06);s.lineTo(-.16, -.033);s.lineTo(-w, -.033);s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .065, bevelEnabled: true, bevelSize: .014, bevelThickness: .014, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 1.625, -.0325); return g;
}

function queenCrown() {
  const positions = [], indices = [], segments = 128;
  const profile = [[.132, 1.10, 0], [.16, 1.15, 0], [.215, 1.235, .3], [.265, 1.32, 1], [.25, 1.33, 1], [.197, 1.25, .3], [.13, 1.16, 0]];
  for (let j = 0; j < profile.length; j++) for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2, [r, y, weight] = profile[j];
    const scallop = (Math.cos(a * 8) + 1) * .5;
    positions.push(Math.cos(a) * r, y + weight * scallop * .095, Math.sin(a) * r);
    if (j && i) {const b = j * (segments + 1) + i;indices.push(b, b - segments - 2, b - 1, b, b - segments - 1, b - segments - 2);}
  }
  const g = new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createSculptures() {
  return {
    base: revolved(p => {
      p.moveTo(0, 0);p.lineTo(.315, 0);p.bezierCurveTo(.355, 0, .393, .028, .393, .065);
      p.bezierCurveTo(.393, .097, .38, .12, .353, .135);
      p.bezierCurveTo(.335, .148, .334, .177, .30, .193);p.quadraticCurveTo(.275, .21, .25, .215);p.lineTo(0,.215);p.closePath();
    }),
    pawn: turnedBody(.70), king: turnedBody(1.28), queen: turnedBody(1.22), bishop: turnedBody(1.015),
    knightPlinth: revolved(p => {p.moveTo(0,.18);p.lineTo(.26,.18);p.quadraticCurveTo(.29,.25,.23,.32);p.quadraticCurveTo(.21,.36,.22,.405);p.lineTo(0,.405);p.closePath();}),
    knight: implicitSurface(knightSculpture.field, [-.63,.26,-.32], [.40,1.84,.32], [88,128,56]),
    bishopHead: implicitSurface(bishopField, [-.23,1.0,-.23], [.23,1.59,.23], [42,60,42]),
    rook: revolved(p => {p.moveTo(0,.19);p.lineTo(.26,.19);p.quadraticCurveTo(.30,.24,.26,.30);p.bezierCurveTo(.19,.40,.165,.77,.17,1.00);p.quadraticCurveTo(.173,1.10,.25,1.13);p.quadraticCurveTo(.29,1.16,.29,1.205);p.lineTo(.28,1.27);p.lineTo(.18,1.27);p.lineTo(.18,1.195);p.lineTo(0,1.195);p.closePath();}),
    rookBattlement: rookBattlement(), queenCrown: queenCrown().translate(0,.1,0), kingCross: crossGeometry(),
    sphere: new THREE.SphereGeometry(1,64,40),
  };
}

export function buildChessPieces({ board, ivory, amberBase, obsidian, whiteTrim, blackTrim, whiteGlow, blackGlow, shadowMap, poolMap, disk, random }) {
  const shapes = createSculptures(), pieces = [];
  const eye = new THREE.MeshPhysicalMaterial({color:'#211508',roughness:.12,metalness:.15,clearcoat:1});
  const blueEye = new THREE.MeshPhysicalMaterial({color:'#06172a',roughness:.1,metalness:.4,clearcoat:1});
  function add(geometry, material, parent, x=0, y=0, z=0) {const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ball(radius,material,parent,x,y,z){const m=add(shapes.sphere,material,parent,x,y,z);m.scale.setScalar(radius);return m;}
  const ringGeometryCache = new Map();
  function ring(r,t,y,material,parent){const key=`${r}:${t}`;if(!ringGeometryCache.has(key))ringGeometryCache.set(key,new THREE.TorusGeometry(r,t,16,112));const m=add(ringGeometryCache.get(key),material,parent,0,y,0);m.rotation.x=Math.PI/2;return m;}
  function curve(points,radius,material,parent){const line=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(new THREE.TubeGeometry(line,40,radius,8,false),material,parent);}
  function piece(type,column,row,white) {
    const p=new THREE.Group();p.name=`${white?'ivory':'obsidian'}-${type}-${column}`;p.position.set(column-3.5,.12,row-3.5);board.add(p);
    const material=white?ivory:obsidian,trim=white?whiteTrim:blackTrim,glow=white?whiteGlow:blackGlow;
    disk(p,.98,.002,shadowMap,'#000000',.74);
    // Light stays inside the glass pedestal. The matte board has no specular reflection or halo decals.
    add(shapes.base,white?amberBase:obsidian,p);ring(.365,.009,.061,glow,p);ring(.333,.010,.142,trim,p);
    if(white){
      ring(.266,.013,.104,glow,p);ring(.18,.009,.115,whiteTrim,p);
      const core=ball(.16,whiteGlow,p,0,.084,0);core.scale.y=.022;
      for(let j=0;j<3;j++){
        const points=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,r=.14+j*.057;points.push([Math.cos(a)*r,.075+Math.sin(a*3+j)*.025,Math.sin(a)*r]);}
        curve(points,.0035,whiteGlow,p);
      }
    }
    const positions=[];for(let i=0;i<40;i++){const a=random()*Math.PI*2,r=.15+random()*.20;positions.push(Math.cos(a)*r,.10+random()*.05,Math.sin(a)*r);}
    const glints=new THREE.BufferGeometry();glints.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const color=new THREE.Color(white?'#ffd48a':'#29a5ff').multiplyScalar(white?4:2.8);
    p.add(new THREE.Points(glints,new THREE.PointsMaterial({color,size:white?.027:.022,map:poolMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
    if(type==='pawn') {add(shapes.pawn,material,p);ball(.205,material,p,0,.867,0);ring(.173,.008,.663,trim,p);}
    if(type==='king') {add(shapes.king,material,p);ring(.19,.008,1.18,trim,p);ball(.121,material,p,0,1.37,0);add(shapes.kingCross,material,p);}
    if(type==='queen') {add(shapes.queen,material,p);add(shapes.queenCrown,material,p);ring(.19,.008,1.15,trim,p);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(.031,material,p,Math.cos(a)*.258,1.518,Math.sin(a)*.258);}ball(.087,material,p,0,1.53,0);ball(.038,material,p,0,1.64,0);}
    if(type==='bishop') {add(shapes.bishop,material,p);add(shapes.bishopHead,material,p);ring(.174,.009,.961,trim,p);ball(.042,material,p,0,1.58,0);}
    if(type==='rook') {add(shapes.rook,material,p);for(let i=0;i<6;i++){const battlement=add(shapes.rookBattlement,material,p);battlement.rotation.y=i*Math.PI/3;}ring(.274,.009,1.18,trim,p);}
    if(type==='knight') {
      add(shapes.knightPlinth,material,p);add(shapes.knight,material,p);
      const {eyes,nostrils,surfaceDepth}=knightSculpture;
      for(const side of [-1,1]){
        const e=ball(.016,white?eye:blueEye,p,eyes.x,eyes.y,side*(eyes.z-.009));e.scale.z*=.65;
        const n=ball(.009,white?eye:blueEye,p,nostrils.x,nostrils.y,side*(nostrils.z-.006));n.scale.set(.010,.007,.006);
        const mouth=[[-.49,1.207],[-.448,1.188],[-.376,1.19]].map(([x,y])=>[x,y,side*(surfaceDepth(x,y)+.001)]);
        curve(mouth,.0028,white?eye:blueEye,p);
      }
      // One broad continuous mane follows the poll and back. No transverse wire bands.
      const mane=curve([[.067,1.62,0],[.183,1.529,0],[.256,1.36,0],[.276,1.17,0],[.244,.98,0],[.205,.79,0],[.222,.59,0]],.025,material,p);
      mane.scale.z=2.25;
      ring(.215,.009,.36,trim,p);
    }
    if(white)p.rotation.y=Math.PI;
    pieces.push(p);return p;
  }
  const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];
  for(let c=0;c<8;c++){piece(order[c],c,0,false);piece('pawn',c,1,false);piece('pawn',c,6,true);piece(order[c],c,7,true);}
  return {pieces,shapes};
}
