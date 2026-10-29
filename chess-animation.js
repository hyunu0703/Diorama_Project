const smooth=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;

// Frame-driven timelines never change chess state or shared piece materials.
export function createPieceAnimator() {
  let jobs=[];
  function schedule(duration,delay,frame,{onStart,onComplete}={}) {
    jobs.push({elapsed:-delay,duration,frame,onStart,onComplete,started:false});
  }
  return {
    get busy(){return jobs.length>0;},
    move(piece,destination,{duration=.68,delay=0,knight=false,onComplete}={}) {
      const from=piece.position.clone();
      schedule(duration,delay,t=>{
        const eased=smooth(t),lift=(knight?2.05:.10)*Math.sin(Math.PI*t)**2;
        piece.position.set(mix(from.x,destination.x,eased),mix(from.y,destination.y,eased)+lift,mix(from.z,destination.z,eased));
        if(t===1)piece.position.copy(destination);
      },{onComplete});
    },
    capture(piece,{delay=0,duration=1.35,direction={x:1,z:0},onStart,onComplete}={}) {
      const from=piece.position.clone(),rotation=piece.rotation.clone();
      // Send every captured piece past the 4.21-unit frame, even from the center.
      let dx=from.x,dz=from.z;
      if(Math.hypot(dx,dz)<.01){dx=direction.x;dz=direction.z;}
      const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;
      const travel=(7.2-Math.max(Math.abs(from.x),Math.abs(from.z)))/Math.max(Math.abs(dx),Math.abs(dz));
      const end={x:from.x+dx*travel,z:from.z+dz*travel};
      schedule(duration,delay,t=>{
        const outward=1-(1-t)**1.45;
        piece.position.set(mix(from.x,end.x,outward),from.y+4*3.1*t*(1-t),mix(from.z,end.z,outward));
        piece.rotation.set(rotation.x+dz*Math.PI*2.4*t,rotation.y+Math.PI*1.6*t,rotation.z-dx*Math.PI*2.4*t);
        if(t===1)piece.visible=false;
      },{onStart,onComplete});
    },
    update(dt) {
      const complete=[];
      for(const job of jobs){
        job.elapsed+=Math.max(0,dt);
        if(job.elapsed<0)continue;
        if(!job.started){job.started=true;job.onStart?.();}
        const t=Math.min(1,job.elapsed/job.duration);job.frame(t);
        if(t===1)complete.push(job);
      }
      jobs=jobs.filter(job=>!complete.includes(job));
      for(const job of complete)job.onComplete?.();
    },
    clear(){jobs=[];}
  };
}
