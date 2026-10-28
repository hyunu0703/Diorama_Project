import * as THREE from './three.module.js';

// Object-space inclusions: the five depth samples move by parallax as the camera orbits.
// This is an art-directed volume approximation, not a texture painted on the surface.
function inclusions(material, day) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 gemPosition;
      varying vec3 gemView;
    `).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      gemPosition = position;
      vec3 gemWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gemView = inverseTransformDirection(cameraPosition - gemWorld, modelMatrix);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 gemPosition;
      varying vec3 gemView;
      float gemHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float gemNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(gemHash(i),gemHash(i+vec3(1,0,0)),f.x),mix(gemHash(i+vec3(0,1,0)),gemHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(gemHash(i+vec3(0,0,1)),gemHash(i+vec3(1,0,1)),f.x),mix(gemHash(i+vec3(0,1,1)),gemHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      vec3 gemInterior(vec3 p, vec3 ray) {
        vec3 light=vec3(0.0);
        for(int j=0;j<5;j++) {
          vec3 q=p-ray*(0.025+float(j)*0.045);
          float mist=gemNoise(q*5.5+vec3(2.0,0.0,4.0))*0.65+gemNoise(q*13.0)*0.35;
          vec3 cell=floor(q*38.0), f=fract(q*38.0);
          vec3 center=vec3(gemHash(cell),gemHash(cell+19.0),gemHash(cell+47.0))*.64+.18;
          float star=(1.0-smoothstep(.018,.085,length(f-center)))*step(.89,gemHash(cell+83.0));
          ${day ? `
          float cloud=smoothstep(.47,.78,mist);
          light+=mix(vec3(.022,.065,.12),vec3(.23,.27,.28),cloud)*.16;
          light+=vec3(1.0,.66,.25)*star*.55;
          ` : `
          float nebula=smoothstep(.36,.79,mist);
          light+=mix(vec3(.003,.015,.055),vec3(.095,.022,.18),nebula)*.25;
          light+=vec3(.16,.49,1.0)*star*1.55;
          `}
        }
        return light;
      }
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += gemInterior(gemPosition, normalize(gemView));
    `);
  };
  material.customProgramCacheKey = () => `celestial-gem-${day ? 'day' : 'night'}-v1`;
  return material;
}

export function createGemMaterials() {
  const common = { metalness:0, roughness:.045, clearcoat:1, clearcoatRoughness:.035,
    ior:1.54, specularIntensity:1, envMapIntensity:1.15 };
  const ivory = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#f2f8ff',
    transmission:.89, thickness:.42, attenuationColor:'#e7f3ff', attenuationDistance:2.8}), true);
  const obsidian = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#7779bb',
    transmission:.72, thickness:.68, ior:1.56, attenuationColor:'#292061', attenuationDistance:.38}), false);
  const amberBase = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff6df',
    transmission:.94, thickness:.28, attenuationColor:'#ffd28b', attenuationDistance:.8}), true);
  const whiteTrim = new THREE.MeshPhysicalMaterial({...common, color:'#fff1ce', transmission:.65,
    thickness:.08, emissive:'#ffcb78', emissiveIntensity:.08});
  const blackTrim = new THREE.MeshPhysicalMaterial({...common, color:'#394aab', transmission:.55,
    thickness:.10, emissive:'#2777e5', emissiveIntensity:.12});
  return {ivory,obsidian,amberBase,whiteTrim,blackTrim};
}
