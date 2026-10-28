import * as THREE from './three.module.js';

// Object-space inclusions: the five depth samples move by parallax as the camera orbits.
// This is an art-directed volume approximation, not a texture painted on the surface.
function inclusions(material, day) {
  material.onBeforeCompile = shader => {
    // Internal scattering blurs transmitted artwork without blurring the polished reflections.
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>',
      THREE.ShaderChunk.transmission_pars_fragment.replace(
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, max(lod, 4.6) );'));
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
          float star=(1.0-smoothstep(.025,.13,length(f-center)))*step(.87,gemHash(cell+83.0));
          ${day ? `
          float cloud=smoothstep(.47,.78,mist);
          light+=mix(vec3(.022,.065,.12),vec3(.23,.27,.28),cloud)*.16;
          light+=vec3(1.0,.76,.43)*star*.85;
          ` : `
          float nebula=smoothstep(.36,.79,mist);
          light+=mix(vec3(.001,.006,.019),vec3(.025,.009,.052),nebula)*.20;
          light+=vec3(.21,.55,1.0)*star*2.2;
          `}
        }
        return light;
      }
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += gemInterior(gemPosition, normalize(gemView));
    `);
  };
  material.customProgramCacheKey = () => `celestial-gem-${day ? 'day' : 'night'}-v2`;
  return material;
}

export function createGemMaterials() {
  const common = { metalness:0, roughness:.045, clearcoat:1, clearcoatRoughness:.035,
    ior:1.54, specularIntensity:1, envMapIntensity:1.15 };
  const ivory = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff6e8',
    transmission:.80, thickness:.42, attenuationColor:'#ffe8bc', attenuationDistance:1.8}), true);
  const obsidian = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#101b3e',
    transmission:.62, thickness:.78, ior:1.56, attenuationColor:'#232353', attenuationDistance:.28}), false);
  const amberBase = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff6df',
    transmission:.94, thickness:.28, attenuationColor:'#ffd28b', attenuationDistance:.8}), true);
  const whiteTrim = new THREE.MeshPhysicalMaterial({...common, color:'#fff1ce', transmission:.65,
    thickness:.08, emissive:'#ffcb78', emissiveIntensity:.08});
  const blackTrim = new THREE.MeshPhysicalMaterial({...common, color:'#132e68', transmission:.55,
    thickness:.10, emissive:'#2777e5', emissiveIntensity:.12});
  return {ivory,obsidian,amberBase,whiteTrim,blackTrim};
}
