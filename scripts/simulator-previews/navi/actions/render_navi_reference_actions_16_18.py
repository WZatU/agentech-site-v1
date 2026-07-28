"""Render Cute, Ask for Play, and Enjoy Touch from reference clips 16-18."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np

DURATIONS={'cute':2.87,'ask_for_play':4.37,'enjoy_touch':5.27}
def smooth(v):v=max(0.,min(1.,v));return v*v*(3-2*v)
def window(t,a,b,c,d):
 if a<=t<b:return smooth((t-a)/(b-a))
 if b<=t<c:return 1.
 if c<=t<d:return 1-smooth((t-c)/(d-c))
 return 0.
def quat(r,p):
 cr,sr=math.cos(r/2),math.sin(r/2);cp,sp=math.cos(p/2),math.sin(p/2)
 return np.array((cr*cp,sr*cp,cr*sp,-sr*sp))
def pose(action,t):
 if action=='cute':
  # First lower only the front-left shoulder and return. Then lower the
  # complete front/head symmetrically and return to the standing pose.
  left_shoulder=window(t,.10,.50,.72,1.18)
  head_down=window(t,1.35,1.78,2.05,2.72)
  roll=-math.radians(16)*left_shoulder
  pitch=math.radians(11)*left_shoulder+math.radians(21)*head_down
  # Extra vertical compensation keeps both rear paws inside their reachable
  # workspace, so neither rear contact has to slide during the deep dips.
  return roll,pitch,-.026*left_shoulder-.042*head_down,0.,0.
 if action=='ask_for_play':
  # Head dips and returns first. Next the rear paws travel backward while the
  # front paws remain fixed. Finally the body lowers until both front knees
  # and paws share the ground plane at a 90-degree knee angle.
  head=window(t,.08,.48,.65,1.08);elbow=smooth((t-2.05)/1.55)
  return 0.,math.radians(17)*head,-.032*head-.10575*elbow,0.,0.
 # Push backward into a front-knee ground pose, then travel fully forward.
 # The forward finish raises the head, lowers the hips, and leaves the rear
 # paws trailing so the hind legs visibly lengthen behind the body.
 kneel=smooth((t-.12)/1.40);forward=smooth((t-1.85)/2.70)
 # Pitch the chest downward during the backward kneel. This lets the front
 # elbows reach the floor at about 90 degrees without collapsing the rear
 # legs; their knees remain only lightly flexed.
 x=-.100*kneel*(1-forward)+.180*forward
 z=-.050*kneel*(1-forward)-.065*forward
 pitch=math.radians(15)*kneel*(1-forward)-math.radians(14)*forward
 return 0.,pitch,z,x,0.

def foot_target(action,t,leg,base):
 target=base.copy()
 if action=='ask_for_play':
  elbow=smooth((t-2.05)/1.55)
  if leg.startswith('hind'):
   start,end=(1.10,1.58) if leg=='hind_left' else (1.52,2.00)
   u=max(0.,min(1.,(t-start)/(end-start)))
   target[0]-=.080*smooth(u)
   if start<t<end:target[2]+=.045*math.sin(math.pi*u)**2
  if leg.startswith('front'):target[0]+=.150*elbow
 elif action=='enjoy_touch':
  kneel=smooth((t-.12)/1.40)
  if leg.startswith('front'):target[0]+=.040*kneel
 return target
def parse():
 p=argparse.ArgumentParser();p.add_argument('action',choices=DURATIONS);p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def solve_leg(m,d,c,leg,target,guess):
 from model_config import LEG_INDEX
 sl=LEG_INDEX[leg];qa=c.qpos_addresses[sl];da=c.dof_addresses[sl];sid=mujoco.mj_name2id(m,mujoco.mjtObj.mjOBJ_SITE,f'{leg}_foot_site');q=guess.copy();jp=np.zeros((3,m.nv));jr=np.zeros((3,m.nv));lo=np.array((-1.134,-3.141,.436));hi=np.array((1.134,2.792,2.705))
 for _ in range(18):
  d.qpos[qa]=q;mujoco.mj_forward(m,d);err=target-d.site_xpos[sid]
  if float(np.linalg.norm(err))<2e-6:break
  mujoco.mj_jacSite(m,d,jp,jr,sid);q=np.clip(q+np.clip(np.linalg.lstsq(jp[:,da],err,rcond=1e-5)[0],-.07,.07),lo,hi)
 d.qpos[qa]=q;mujoco.mj_forward(m,d);return q,float(np.linalg.norm(target-d.site_xpos[sid]))
def main():
 a=parse();sys.path.insert(0,str(a.model_root.resolve()))
 from controller import StandingPDController,quaternion_to_rpy
 from model_config import LEG_INDEX,LEG_NAMES
 from simulation import load_model,reset_to_keyframe
 m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);root0=d.qpos[:3].copy();mujoco.mj_forward(m,d);feet={leg:d.site_xpos[mujoco.mj_name2id(m,mujoco.mjtObj.mjOBJ_SITE,f'{leg}_foot_site')].copy() for leg in LEG_NAMES};maxerr=mr=mp=md=0.;mh=float(root0[2])
 cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
 a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
 try:
  for fi in range(round(DURATIONS[a.action]*a.fps)):
   t=fi/a.fps;r,p,z,x,y=pose(a.action,t);root=root0+np.array((x,y,z));d.qpos[:3]=root;d.qpos[3:7]=quat(r,p);d.qvel[:6]=0
   for leg in LEG_NAMES:
    target=foot_target(a.action,t,leg,feet[leg]);q,err=solve_leg(m,d,c,leg,target,c.targets[LEG_INDEX[leg]]);c.targets[LEG_INDEX[leg]]=q;maxerr=max(maxerr,err)
   d.qpos[c.qpos_addresses]=c.targets;d.qvel[c.dof_addresses]=0;mujoco.mj_forward(m,d);rr,pp,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(rr));mp=max(mp,abs(pp));mh=min(mh,float(d.qpos[2]));md=max(md,math.hypot(float(d.qpos[0]-root0[0]),float(d.qpos[1]-root0[1])));ren.update_scene(d,camera=cam);w.append_data(ren.render())
 finally:w.close();ren.close()
 src={'cute':'16_cute.mp4','ask_for_play':'17_ask_for_play.mp4','enjoy_touch':'18_enjoy_being_touched.mp4'}[a.action];motion={'cute':'front_left_shoulder_dip_return_then_head_dip_return','ask_for_play':'head_dip_return_rear_paws_back_then_front_elbows_ground','enjoy_touch':'push_back_front_knees_ground_then_forward_head_up_hips_down_hind_extend'}[a.action];metrics={'command':a.action,'duration_s':DURATIONS[a.action],'source_video':src,'visible_reference_motion':motion,'ground_contact_targets_used':True,'max_foot_site_error_m':maxerr,'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh,'max_root_xy_displacement_m':md}
 if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
