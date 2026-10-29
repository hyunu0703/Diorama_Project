import * as THREE from './three.module.js';

// Screen-space artwork, with a narrow seam on the board's centre plane z=0.
export function addRealmBackground(material, renderer) {
  const uniforms = {
    nightSky: { value: null }, daySky: { value: null },
    skyReady: { value: 0 }, viewportAspect: { value: innerWidth / innerHeight },
  };
  Object.assign(material.uniforms, uniforms);
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  for (const [name, file] of [['nightSky', 'night-realm-v1.png'], ['daySky', 'day-realm-v1.png']]) {
    uniforms[name].value = loader.load(`./assets/realm-backgrounds/${file}`, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (++loaded === 2) {
        uniforms.skyReady.value = 1;
        document.body.dataset.realmBackground = 'ready';
      }
    }, undefined, () => { document.body.dataset.realmBackground = 'error'; });
  }
  material.fragmentShader = material.fragmentShader.replace('void main(){', `
uniform sampler2D nightSky,daySky;
uniform float skyReady,viewportAspect;
void main(){`).replace('  c*=.96;', `
  // Replace only the stage/background, preserving depth-tested pieces and tiles.
  float backdrop=step(endpoint.y,-.345);
  if(depth>.99999) backdrop=1.;
  // Intersect the actual tile surface so z=0 aligns with the board midpoint.
  vec3 boundaryPoint=eye+ray*((.107-eye.y)/min(ray.y,-.0001));
  if(ray.y>=-.0001) boundaryPoint=eye+ray*10000.;
  // Feather only the z=0 seam; keep a gentle minimum width at distant angles.
  float seamWidth=max(.42,fwidth(boundaryPoint.z)*6.);
  float daylight=smoothstep(-seamWidth,seamWidth,boundaryPoint.z);
  vec2 skyUV=uv0;
  float imageAspect=1672./941.;
  // Original centred cover framing, preserving the artwork aspect ratio.
  if(viewportAspect>imageAspect) skyUV.y=(skyUV.y-.5)*imageAspect/viewportAspect+.5;
  else skyUV.x=(skyUV.x-.5)*viewportAspect/imageAspect+.5;
  vec3 sky=mix(texture2D(nightSky,skyUV).rgb,texture2D(daySky,skyUV).rgb,daylight);
  float rimDistance=max(abs(boundaryPoint.x),abs(boundaryPoint.z))-4.21;
  sky*=mix(.60,1.,smoothstep(-.05,.65,rimDistance));
  c=mix(c,sky*.78,backdrop*skyReady);
  c*=.96;`);
  addEventListener('resize', () => { uniforms.viewportAspect.value = innerWidth / innerHeight; });
}

