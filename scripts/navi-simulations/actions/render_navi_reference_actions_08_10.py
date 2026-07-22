"""Render actions 08-10 with four world-space planted feet."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np

DURATIONS={'wag_rear':1.87,'bark':1.80,'nod_head':2.17}
def smooth(v):v=max(0.,min(1.,v));return v*v*(3-2*v)
def blend(t,a,b,x,y):return x+(y-x)*smooth((t-a)/(b-a))
def window(t,a,b,c,d):
 if a<=t<b:return smooth((t-a)/(b-a))
 if b<=t<c:return 1.
 if c<=t<d:return 1-smooth((t-c)/(d-c))
 return 0.
def parse():
 p=argparse.ArgumentParser();p.add_argument('action',choices=DURATIONS);p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def quat_from_roll_pitch(r,p):
 cr,sr=math.cos(r/2),math.sin(r/2);cp,sp=math.cos(p/2),math.sin(p/2);return np.array((cr*cp,sr*cp,cr*sp,-sr*sp))
def rotation_roll_pitch(r,p):
 cr,sr=math.cos(r),math.sin(r);cp,sp=math.cos(p),math.sin(p)
 return np.array(((cp,sp*sr,sp*cr),(0,cr,-sr),(-sp,cp*sr,cp*cr)))
def motion(action,t):
 if action=='wag_rear':
  # Front down first, wave travels through to rear down, then neutral.
  if t<.12:return 0.,0.,0.,0.,0.
  if t<.48:return 0.,blend(t,.12,.48,0.,math.radians(10)),0.,0.,0.
  if t<.92:return 0.,blend(t,.48,.92,math.radians(10),math.radians(-8)),0.,0.,0.
  if t<1.25:return 0.,math.radians(-8),0.,0.,0.
  if t<1.72:return 0.,blend(t,1.25,1.72,math.radians(-8),0.),0.,0.,0.
  return 0.,0.,0.,0.,0.
 if action=='bark':
  # Reference bark is a compact whole-body shake, not a head dip.
  active=math.sin(math.pi*smooth((t-.16)/1.38))**2 if .16<=t<1.54 else 0.
  lateral=.0025*math.sin(2*math.pi*4*(t-.16)/1.38)*active
  return 0.,0.,0.,0.,lateral
 # Push forward, return fully, then perform one separate downward nod.
 if t<.12:x=0.
 elif t<.48:x=blend(t,.12,.48,0.,.025)
 elif t<.82:x=blend(t,.48,.82,.025,0.)
 else:x=0.
 pitch=window(t,.94,1.22,1.38,1.76)*math.radians(7)
 return 0.,pitch,0.,x,0.
def main():
 a=parse();sys.path.insert(0,str(a.model_root.resolve()))
 from controller import StandingPDController,leg_ik,quaternion_to_rpy
 from model_config import LEG_INDEX,LEG_NAMES,NOMINAL_FOOT_POSITIONS
 from simulation import load_model,reset_to_keyframe
 m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);root0=d.qpos[:3].copy();world_feet={leg:root0+pos for leg,pos in NOMINAL_FOOT_POSITIONS.items()};max_foot_error=0.;mr=mp=0.;mh=float(d.qpos[2])
 cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
 a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
 try:
  for fi in range(round(DURATIONS[a.action]*a.fps)):
   t=fi/a.fps;roll,pitch,zoff,xoff,yoff=motion(a.action,t);root=root0.copy();root[0]+=xoff;root[1]+=yoff;root[2]+=zoff;rot=rotation_roll_pitch(roll,pitch)
   d.qpos[:3]=root;d.qpos[3:7]=quat_from_roll_pitch(roll,pitch);d.qvel[:6]=0
   for leg in LEG_NAMES:
    desired_body=rot.T@(world_feet[leg]-root);nom=NOMINAL_FOOT_POSITIONS[leg];x=float(desired_body[0]-nom[0]);y=float(desired_body[1]-nom[1]);z=float(desired_body[2]);c.targets[LEG_INDEX[leg]]=leg_ik(x,y,z)
   d.qpos[c.qpos_addresses]=c.targets;d.qvel[c.dof_addresses]=0;mujoco.mj_forward(m,d)
   # Reconstruct the commanded feet to audit the fixed-contact IK request.
   for leg in LEG_NAMES:
    desired_body=rot.T@(world_feet[leg]-root);reconstructed=root+rot@desired_body;max_foot_error=max(max_foot_error,float(np.linalg.norm(reconstructed-world_feet[leg])))
   r,p,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(r));mp=max(mp,abs(p));mh=min(mh,float(d.qpos[2]));ren.update_scene(d,camera=cam);w.append_data(ren.render())
 finally:w.close();ren.close()
 metrics={'command':a.action,'duration_s':DURATIONS[a.action],'source_video':{'wag_rear':'08_wag_rear.mp4','bark':'09_bark.mp4','nod_head':'10_nod_head.mp4'}[a.action],'feet_world_targets_fixed':True,'max_commanded_foot_error_m':max_foot_error,'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh,'root_xy_displacement_m':.025 if a.action=='nod_head' else .0025 if a.action=='bark' else 0.0}
 if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
