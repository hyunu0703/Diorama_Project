import * as THREE from './three.module.js';

// Object-space inclusions: the five depth samples move by parallax as the camera orbits.
// This is an art-directed volume approximation, not a texture painted on the surface.
function inclusions(material, day) {
  material.onBeforeCompile = shader => {
    // Internal scattering blurs transmitted artwork without blurring the polished reflections.
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>',
      THREE.ShaderChunk.transmission_pars_fragment.replace(
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, max(lod, 0.8) );'));
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
          // The same trapped golden light fills the pedestal, torso, neck and head.
          float pedestal=.62;
          light+=vec3(1.0,.69,.28)*(0.012+pedestal*(.055+.20*cloud));
          light+=vec3(1.0,.60,.15)*.32*.25;
          light+=vec3(1.0,.79,.43)*star*7.5;
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
      vec3 gemWorldNormal=inverseTransformDirection(normal,viewMatrix);
      float gemBlueSoft=pow(max(dot(gemWorldNormal,normalize(vec3(-.7,.8,.5))),0.0),5.0);
      float gemBlueSide=pow(max(dot(gemWorldNormal,normalize(vec3(.8,.3,-.6))),0.0),8.0);
      // View-dependent glossy reflections occur on every sculpted surface, at every height.
      // There is no blue diffuse wash: black remains black between the reflected highlights.
      vec3 gemReflected=reflect(-normalize(gemView),gemWorldNormal);
      float gemSpecKey=pow(max(dot(gemReflected,normalize(vec3(-.5,.85,.55))),0.0),44.0);
      float gemSpecFill=pow(max(dot(gemReflected,normalize(vec3(.8,.55,-.65))),0.0),32.0);
      float gemSpecFront=pow(max(dot(gemReflected,normalize(vec3(-.3,.4,1.0))),0.0),64.0);
      // Narrow studio strips extend up the neck and body. Their angular mask keeps
      // unlit black glass black, while a separate overhead catchlight reaches each head.
      float gemUpper=smoothstep(.20,.55,gemPosition.y);
      float gemUpperGain=mix(1.0,4.0,gemUpper);
      vec2 gemAzimuth=normalize(gemReflected.xz+vec2(.00001));
      float gemStrip=pow(max(dot(gemAzimuth,normalize(vec2(-.65,.76))),0.0),100.0);
      gemStrip*=smoothstep(-.65,-.30,gemReflected.y)*(1.0-smoothstep(.88,.99,gemReflected.y));
      float gemCrown=pow(max(gemReflected.y,0.0),64.0);
      totalEmissiveRadiance += ${day ? 'vec3(1.0,.92,.76)*(.006+.22*gemEdge+.06*gemBlueSoft)+vec3(1.0,.95,.85)*(gemUpperGain*(.85*gemSpecKey+.55*gemSpecFill+.40*gemSpecFront)+gemUpper*(1.5*gemStrip+2.0*gemCrown))' : 'vec3(.035,.25,1.0)*(.20*gemEdge*gemEdge*(.20+.80*gemBlueSoft)+gemUpperGain*1.25*gemSpecFill)+vec3(.65,.82,1.0)*(gemUpperGain*(.95*gemSpecKey+.50*gemSpecFront)+gemUpper*(2.2*gemStrip+2.4*gemCrown))'};

    `);
  };
  material.customProgramCacheKey = () => `celestial-reference-${day ? 'gold-all-heights-v6' : 'obsidian-upper-v5'}`;
  return material;
}

// Pastel cut crystal: triangular optical facets and view-dependent pearlescent colour.
function pastelCrystal(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 crystalLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ncrystalLocal=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 crystalLocal;
      float crystalHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 crystalGrid=vec2(atan(crystalLocal.z,crystalLocal.x)*1.8,crystalLocal.y*5.);
      vec2 crystalCell=floor(crystalGrid), crystalUV=fract(crystalGrid);
      float crystalHalf=step(crystalUV.x,crystalUV.y);
      float crystalSeed=crystalHash(crystalCell+crystalHalf*17.);
      vec3 crystalTint=mix(vec3(.43,.27,.86),vec3(.78,.46,.83),smoothstep(.15,.65,crystalSeed));
      crystalTint=mix(crystalTint,vec3(.38,.80,1.),smoothstep(.65,.95,crystalSeed));
      diffuseColor.rgb*=mix(vec3(.88,.91,1.),crystalTint,.50);
    `).replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      vec3 crystalFacet=normalize(vec3(crystalHash(crystalCell+3.)-.5,crystalHash(crystalCell+9.)-.5,crystalHash(crystalCell+27.)-.5));
      normal=normalize(normal+crystalFacet*.22);
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float crystalEdge=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
      float crystalDiagonal=abs(crystalUV.x-crystalUV.y)*.7071;
      float crystalBorder=min(min(crystalUV.x,1.-crystalUV.x),min(crystalUV.y,1.-crystalUV.y));
      float crystalLine=1.-smoothstep(.008,.035,min(crystalDiagonal,crystalBorder));
      totalEmissiveRadiance+=crystalTint*(.10+.22*crystalEdge)+vec3(.85,.90,1.)*crystalLine*.10;
    `);
  };
  material.customProgramCacheKey=()=> 'pastel-cut-crystal-v1';
  return material;
}

export function createGemMaterials() {
  const common = { metalness:0, roughness:.045, clearcoat:1, clearcoatRoughness:.035,
    ior:1.54, specularIntensity:1, envMapIntensity:1.15 };
  const crystalParameters={...common,color:'#f5efff',transmission:.68,thickness:.35,
    roughness:.055,ior:1.78,dispersion:.75,iridescence:1,iridescenceIOR:1.3,
    iridescenceThicknessRange:[180,420],attenuationColor:'#c9bcff',attenuationDistance:2.8,
    clearcoat:1,clearcoatRoughness:.025,envMapIntensity:1.65};
  const ivory=pastelCrystal(new THREE.MeshPhysicalMaterial(crystalParameters));
  const ivoryTop=ivory;
  const obsidian = inclusions(new THREE.MeshPhysicalMaterial({...common, color:'#020409',
    transmission:.06, thickness:.78, ior:1.56, attenuationColor:'#07152e',
    attenuationDistance:.28, envMapIntensity:1.4}), false);
  const amberBase=ivory;
  const whiteTrim=pastelCrystal(new THREE.MeshPhysicalMaterial({...crystalParameters,
    transmission:.55,thickness:.10,envMapIntensity:1.9}));
  const blackTrim = new THREE.MeshPhysicalMaterial({...common, color:'#030811', transmission:.08,
    thickness:.10, emissive:'#1875df', emissiveIntensity:.035, envMapIntensity:1.4});
  return {ivory,ivoryTop,obsidian,amberBase,whiteTrim,blackTrim};
}
