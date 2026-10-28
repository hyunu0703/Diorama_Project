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

function knightField(x, y, z) {
  let d = ellipsoid(x, y, z, .09, .53, 0, .265, .255, .235, -.1);
  d = smoothUnion(d, ellipsoid(x, y, z, .115, .78, 0, .195, .36, .185, .12));
  d = smoothUnion(d, ellipsoid(x, y, z, .035, 1.09, 0, .17, .32, .155, .24));
  d = smoothUnion(d, ellipsoid(x, y, z, -.075, 1.335, 0, .19, .205, .164, .05));
  d = smoothUnion(d, ellipsoid(x, y, z, -.265, 1.285, 0, .235, .145, .145, .43), .07);
  d = smoothUnion(d, ellipsoid(x, y, z, -.445, 1.177, 0, .135, .105, .142, .15), .045);
  d = smoothUnion(d, ellipsoid(x, y, z, -.235, 1.183, 0, .15, .115, .132), .04);
  // Throat undercut makes a proper arched equine neck.
  d = Math.max(d, -ellipsoid(x, y, z, -.235, .95, 0, .23, .205, .4));
  for (const side of [-1, 1]) d = smoothUnion(d, ellipsoid(x, y, z, -.025, 1.50, side * .108, .061, .12, .047, -.2), .018);
  return d;
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
    knightPlinth: revolved(p => {p.moveTo(0,.18);p.lineTo(.26,.18);p.quadraticCurveTo(.29,.25,.23,.32);p.quadraticCurveTo(.21,.36,.22,.405);p.lineTo(0,.405);p.closePath();}),
    knight: implicitSurface(knightField, [-.63,.26,-.30], [.40,1.75,.30], [64,88,40]),
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
      for(let j=0;j<3;j++){
        const points=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,r=.14+j*.057;points.push([Math.cos(a)*r,.075+Math.sin(a*3+j)*.025,Math.sin(a)*r]);}
        curve(points,.0035,whiteGlow,p);
      }
    }
    const positions=[];for(let i=0;i<40;i++){const a=random()*Math.PI*2,r=.15+random()*.20;positions.push(Math.cos(a)*r,.10+random()*.05,Math.sin(a)*r);}
    const glints=new THREE.BufferGeometry();glints.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const color=new THREE.Color(white?'#ffe7aa':'#29a5ff').multiplyScalar(white?2.4:2);
    p.add(new THREE.Points(glints,new THREE.PointsMaterial({color,size:.016,map:poolMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
    if(type==='pawn') {add(shapes.pawn,material,p);ball(.205,material,p,0,.867,0);ring(.173,.008,.663,trim,p);}
    if(type==='king') {add(shapes.king,material,p);ring(.19,.008,1.18,trim,p);ball(.121,material,p,0,1.37,0);add(shapes.kingCross,material,p);}
    if(type==='queen') {add(shapes.queen,material,p);add(shapes.queenCrown,material,p);ring(.19,.008,1.15,trim,p);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(.031,material,p,Math.cos(a)*.258,1.518,Math.sin(a)*.258);}ball(.087,material,p,0,1.53,0);ball(.038,material,p,0,1.64,0);}
    if(type==='bishop') {add(shapes.bishop,material,p);add(shapes.bishopHead,material,p);ring(.174,.009,.961,trim,p);ball(.042,material,p,0,1.58,0);}
    if(type==='rook') {add(shapes.rook,material,p);for(let i=0;i<6;i++){const battlement=add(shapes.rookBattlement,material,p);battlement.rotation.y=i*Math.PI/3;}ring(.274,.009,1.18,trim,p);}
    if(type==='knight') {
      add(shapes.knightPlinth,material,p);add(shapes.knight,material,p);
      // Eyes, muzzle and a raised flowing mane are real geometry on a rounded head.
      for(const z of [-1,1]){
        const e=ball(.023,white?eye:blueEye,p,-.245,1.355,z*.147);e.scale.z*=.55;
        const nostril=ball(.016,white?eye:blueEye,p,-.488,1.204,z*.124);nostril.scale.set(.016,.011,.006);
        curve([[-.555,1.135,z*.035],[-.51,1.115,z*.103],[-.444,1.12,z*.13]],.0038,white?whiteTrim:blackTrim,p);
      }
      curve([[.03,1.475,0],[.14,1.33,0],[.207,1.12,0],[.245,.9,0],[.258,.68,0]],.027,material,p);
      for(let i=0;i<7;i++){const y=.78+i*.085,x=.25-(y-.78)*.19;curve([[x-.02,y,.115],[x+.014,y-.035,0],[x-.02,y-.06,-.115]],.006,trim,p);}
      ring(.215,.009,.36,trim,p);
    }
    if(white)p.rotation.y=Math.PI;
    pieces.push(p);return p;
  }
  const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];
  for(let c=0;c<8;c++){piece(order[c],c,0,false);piece('pawn',c,1,false);piece('pawn',c,6,true);piece(order[c],c,7,true);}
  return {pieces,shapes};
}
