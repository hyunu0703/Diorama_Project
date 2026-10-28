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
  // A fully rounded sculpture: a tapered bowed neck, cheek, muzzle and two ears.
  function body(x,y,z) {
    const t=THREE.MathUtils.clamp((y-.49)/.88,0,1);
    const cx=.025+.13*Math.sin(t*Math.PI)-.065*t;
    const rx=.275-.15*t,rz=.265-.14*t;
    const neck=(Math.hypot((x-cx)/rx,z/rz)-1)*Math.min(rx,rz);
    let d=Math.max(neck,Math.max(.485-y,y-1.39));
    d=smoothUnion(d,ellipsoid(x,y,z,-.095,1.345,0,.19,.22,.145,.38),.075);
    d=smoothUnion(d,ellipsoid(x,y,z,-.292,1.233,0,.205,.105,.123,.53),.05);
    d=smoothUnion(d,ellipsoid(x,y,z,-.405,1.172,0,.095,.078,.12,.35),.025);
    d=smoothUnion(d,ellipsoid(x,y,z,-.105,1.235,0,.125,.135,.159,-.25),.045);
    for(const side of[-1,1])d=smoothUnion(d,ellipsoid(x,y,z,-.006,1.525,side*.095,.044,.125,.042,-.15),.018);
    // A narrow raised mane follows the back of the arched neck.
    for(let i=0;i<9;i++){
      const u=i/8,yy=.65+u*.76,xx=.27-.17*u+.025*Math.sin(u*Math.PI);
      d=smoothUnion(d,ellipsoid(x,y,z,xx,yy,0,.065,.10,.095,-.2),.025);
    }
    return d;
  }
  function surfaceDepth(x,y){let a=0,b=.36;for(let i=0;i<20;i++){const z=(a+b)/2;if(body(x,y,z)<0)a=z;else b=z;}return(a+b)/2;}
  const eyes={x:-.166,y:1.372,z:surfaceDepth(-.166,1.372)};
  const nostrils={x:-.420,y:1.204,z:surfaceDepth(-.420,1.204)};
  function field(x,y,z){
    let d=body(x,y,z);
    for(const side of[-1,1]){
      d=Math.max(d,-ellipsoid(x,y,z,eyes.x,eyes.y,side*(eyes.z-.004),.025,.019,.018));
      d=Math.max(d,-ellipsoid(x,y,z,nostrils.x,nostrils.y,side*(nostrils.z-.003),.019,.014,.016,.3));
      // Delicate mouth incision, curved cheek and shallow carved mane channels.
      d=Math.max(d,-ellipsoid(x,y,z,-.411,1.148,side*.107,.075,.0045,.015,.2));
      for(let i=0;i<7;i++){
        const u=i/6,yy=.74+u*.60,xx=.275-.16*u;
        d=Math.max(d,-ellipsoid(x,y,z,xx,yy,side*.08,.049,.009,.026,-.5));
      }
    }
    return d;
  }
  return {field,surfaceDepth,eyes,nostrils};
}
const knightSculpture=createKnightField();

function createKnightMesh(){
  const g=implicitSurface(knightSculpture.field,[-.52,.44,-.37],[.43,1.66,.37],[96,128,80]);
  const positions=g.getAttribute('position'),uv=[];
  for(let i=0;i<positions.count;i++)uv.push(.5+Math.atan2(positions.getZ(i),positions.getX(i))/(Math.PI*2),positions.getY(i)/1.66);
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}

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
    knightPlinth: revolved(p => {p.moveTo(0,.18);p.lineTo(.28,.18);p.quadraticCurveTo(.31,.215,.27,.25);p.bezierCurveTo(.22,.275,.185,.305,.19,.345);p.quadraticCurveTo(.193,.39,.282,.414);p.quadraticCurveTo(.347,.435,.323,.464);p.lineTo(.310,.493);p.lineTo(0,.493);p.closePath();}),
    knight: createKnightMesh(),
    bishopHead: implicitSurface(bishopField, [-.23,1.0,-.23], [.23,1.59,.23], [42,60,42]),
    rook: revolved(p => {p.moveTo(0,.19);p.lineTo(.26,.19);p.quadraticCurveTo(.30,.24,.26,.30);p.bezierCurveTo(.19,.40,.165,.77,.17,1.00);p.quadraticCurveTo(.173,1.10,.25,1.13);p.quadraticCurveTo(.29,1.16,.29,1.205);p.lineTo(.28,1.27);p.lineTo(.18,1.27);p.lineTo(.18,1.195);p.lineTo(0,1.195);p.closePath();}),
    rookBattlement: rookBattlement(), queenCrown: queenCrown().translate(0,.1,0), kingCross: crossGeometry(),
    sphere: new THREE.SphereGeometry(1,64,40),
  };
}

export function buildChessPieces({ board, ivory, ivoryTop, amberBase, obsidian, whiteTrim, blackTrim, whiteGlow, blackGlow, shadowMap, poolMap, disk, random }) {
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
    const material=white?ivory:obsidian,top=white?ivoryTop:obsidian,trim=white?whiteTrim:blackTrim;
    disk(p,.98,.002,shadowMap,'#000000',.74);
    // Light stays inside the glass pedestal. The matte board has no specular reflection or halo decals.
    add(shapes.base,white?amberBase:obsidian,p);ring(.365,.004,.061,white?whiteTrim:trim,p);ring(.333,.005,.142,white?whiteTrim:trim,p);
    if(white){
      ring(.266,.004,.104,whiteGlow,p);ring(.18,.003,.115,whiteTrim,p);
      // Fine trapped-light filaments, rather than a broad opaque luminous disc.
      for(let j=0;j<3;j++){
        const points=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,r=.14+j*.057;points.push([Math.cos(a)*r,.075+Math.sin(a*3+j)*.025,Math.sin(a)*r]);}
        curve(points,.0018,whiteTrim,p);
      }
    }
    const positions=[];for(let i=0;i<40;i++){const a=random()*Math.PI*2,r=.15+random()*.20;positions.push(Math.cos(a)*r,.075+random()*.09,Math.sin(a)*r);}
    const glints=new THREE.BufferGeometry();glints.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const color=new THREE.Color(white?'#ffd48a':'#29a5ff').multiplyScalar(white?2.6:1.8);
    p.add(new THREE.Points(glints,new THREE.PointsMaterial({color,size:white?.040:.027,map:poolMap,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending})));
    if(type==='pawn') {add(shapes.pawn,material,p);ball(.205,top,p,0,.867,0);ring(.173,.008,.663,trim,p);}
    if(type==='king') {add(shapes.king,material,p);ring(.19,.008,1.18,trim,p);ball(.121,top,p,0,1.37,0);add(shapes.kingCross,top,p);}
    if(type==='queen') {add(shapes.queen,material,p);add(shapes.queenCrown,top,p);ring(.19,.008,1.15,trim,p);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(.031,top,p,Math.cos(a)*.258,1.518,Math.sin(a)*.258);}ball(.087,top,p,0,1.53,0);ball(.038,top,p,0,1.64,0);}
    if(type==='bishop') {add(shapes.bishop,material,p);add(shapes.bishopHead,top,p);ring(.174,.009,.961,trim,p);ball(.042,top,p,0,1.58,0);}
    if(type==='rook') {add(shapes.rook,material,p);for(let i=0;i<6;i++){const battlement=add(shapes.rookBattlement,top,p);battlement.rotation.y=i*Math.PI/3;}ring(.274,.009,1.18,trim,p);}
    if(type==='knight') {
      const carved=white?ivory:obsidian;
      add(shapes.knightPlinth,carved,p);add(shapes.knight,carved,p);
      const {eyes,nostrils}=knightSculpture;
      for(const side of [-1,1]){
        const e=ball(.008,carved,p,eyes.x,eyes.y,side*(eyes.z-.006));e.scale.z*=.65;
        const n=ball(.006,white?eye:blueEye,p,nostrils.x,nostrils.y,side*(nostrils.z-.006));n.scale.set(.007,.005,.004);
      }
      ring(.323,.008,.448,trim,p);
    }
    if(type==='knight')p.rotation.y=column<4?Math.PI:0;
    else if(white)p.rotation.y=Math.PI;
    pieces.push(p);return p;
  }
  const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];
  for(let c=0;c<8;c++){piece(order[c],c,0,false);piece('pawn',c,1,false);piece('pawn',c,6,true);piece(order[c],c,7,true);}
  return {pieces,shapes};
}
