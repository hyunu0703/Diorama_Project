import * as THREE from './three.module.js';

// Screen-space artwork, with a narrow seam on the board's centre plane z=0.
export function addRealmBackground(material, renderer, scene) {
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
  // Use homogeneous plane coordinates: no division or derivative spike at the horizon.
  float downward=max(-ray.y,0.);
  float seamCoordinate=eye.z*downward+(eye.y-.107)*ray.z;
  float seamWidth=max(.42*downward,max(fwidth(seamCoordinate)*6.,.00001));
  float daylight=smoothstep(-seamWidth,seamWidth,seamCoordinate);
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
  // Transmission is rendered before the final post-process. Put the same sky
  // in the opaque scene pass so refracted rays sample the visible background.
  const skyStart=material.fragmentShader.indexOf('  vec3 boundaryPoint=');
  const skyEnd=material.fragmentShader.indexOf('  c=mix(c,sky*.78',skyStart);
  if(skyStart<0||skyEnd<0)throw new Error('Missing shared realm shader');
  const skyCode=material.fragmentShader.slice(skyStart,skyEnd);
  const skyMaterial=new THREE.ShaderMaterial({
    uniforms:{...uniforms,inverseProjection:material.uniforms.inverseProjection,
      cameraWorld:material.uniforms.cameraWorld,eye:material.uniforms.eye},
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader: `varying vec2 uv0;
      uniform sampler2D nightSky,daySky;
      uniform float skyReady,viewportAspect;
      uniform mat4 inverseProjection,cameraWorld;
      uniform vec3 eye;
      void main(){
        vec4 view=inverseProjection*vec4(uv0*2.-1.,1.,1.);
        vec3 ray=normalize((cameraWorld*vec4(view.xyz/view.w,1.)).xyz-eye);
        `+skyCode+`
        gl_FragColor=vec4(mix(vec3(.001),sky*.78,skyReady),1.);
      }`,
    depthTest:false,depthWrite:false,toneMapped:false
  });
  const skyBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),skyMaterial);
  skyBackdrop.name='realm-transmission-background';
  skyBackdrop.frustumCulled=false;skyBackdrop.renderOrder=-10000;scene.add(skyBackdrop);
  addEventListener('resize', () => { uniforms.viewportAspect.value = innerWidth / innerHeight; });
}

