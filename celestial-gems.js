import * as THREE from './three.module.js';

// Object-space inclusions: the five depth samples move by parallax as the camera orbits.
// This is an art-directed volume approximation, not a texture painted on the surface.
function inclusions(material, day) {
  material.onBeforeCompile = shader => {
    // Internal scattering blurs transmitted artwork without blurring the polished reflections.
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>',
      THREE.ShaderChunk.transmission_pars_fragment.replace(
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, max(lod, 2.2) );'));
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 gemPosition;
      varying vec3 gemView;
    `).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      gemPosition = (modelMatrix * vec4(position, 1.0)).xyz - vec3(0.0, 0.12, 0.0);
      vec3 gemWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gemView = cameraPosition - gemWorld;
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
          float pedestal=exp(-max(p.y,0.0)*5.0);
          light+=vec3(1.0,.78,.43)*(0.030+pedestal*(.16+.18*cloud));
          light+=vec3(1.0,.79,.43)*star*(1.0+3.0*exp(-max(p.y,0.0)*5.0));
          ` : `
          float nebula=smoothstep(.36,.79,mist);
          light+=mix(vec3(.001,.006,.019),vec3(.025,.009,.052),nebula)*.20;
          light+=vec3(.21,.55,1.0)*star*2.2;
          `}
        }
        return light;
      }
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += gemInterior(gemPosition, normalize(gemView)) * ${day ? '1.0' : '.55'};
      float gemEdge=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);
      totalEmissiveRadiance += ${day ? 'vec3(1.0,.90,.72)*(.035+.18*gemEdge)' : 'vec3(.025,.20,.70)*(.012+.24*gemEdge)'};
    `);
  };
  material.customProgramCacheKey = () => `celestial-reference-${day ? 'ivory-volume-v2' : 'obsidian-soft-v2'}`;
  return material;
}

export function createGemMaterials() {
  const common = { metalness:0, roughness:.045, clearcoat:1, clearcoatRoughness:.035,
    ior:1.54, specularIntensity:1, envMapIntensity:1.15 };
  // Milky glass retains its ivory silhouette instead of transmitting the board's artwork.
  const ivory = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff8e9',
    transmission:.94, roughness:.035, thickness:.24, ior:1.49,
    attenuationColor:'#ffe5af', attenuationDistance:1.6,
    emissive:'#fff0d3', emissiveIntensity:.025,
    clearcoat:1, clearcoatRoughness:.045, envMapIntensity:.8}),true);
  const ivoryTop = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff7e7',
    transmission:.70, thickness:.36, roughness:.06,
    emissive:'#fff0d5', emissiveIntensity:.04, envMapIntensity:.8}),true);
  const obsidian = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#081529',
    transmission:.06, thickness:.78, ior:1.56, attenuationColor:'#07152e',
    attenuationDistance:.28, envMapIntensity:1.3}), false);
  const amberBase = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#fff4df',
    transmission:.96, thickness:.19, attenuationColor:'#ffdd96', attenuationDistance:.8,
    emissive:'#ffcc78', emissiveIntensity:.015, envMapIntensity:.85}), true);
  const whiteTrim = new THREE.MeshPhysicalMaterial({...common, color:'#fff0ce', transmission:.9,
    thickness:.06, emissive:'#ffd18b', emissiveIntensity:.08});
  const blackTrim = new THREE.MeshPhysicalMaterial({...common, color:'#071932', transmission:.08,
    thickness:.10, emissive:'#1875df', emissiveIntensity:.025, envMapIntensity:1.2});
  return {ivory,ivoryTop,obsidian,amberBase,whiteTrim,blackTrim};
}
