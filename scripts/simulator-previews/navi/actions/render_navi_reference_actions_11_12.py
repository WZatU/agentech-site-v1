"""Render shake_head and confused from reference videos 11 and 12."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np
DURATIONS={'shake_head':1.37,'confused':27.53}
def smooth(v):v=max(0.,min(1.,v));return v*v*(3-2*v)
def blend(t,a,b,x,y):return x+(y-x)*smooth((t-a)/(b-a))
def parse():
 p=argparse.ArgumentParser();p.add_argument('action',choices=DURATIONS);p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def quat_rz(roll,yaw):
 cr,sr=math.cos(roll/2),math.sin(roll/2);cy,sy=math.cos(yaw/2),math.sin(yaw/2);return np.array((cr*cy,sr*cy,-sr*sy,cr*sy))
def rotation_rz(roll,yaw):
 cr,sr=math.cos(roll),math.sin(roll);cy,sy=math.cos(yaw),math.sin(yaw)
 return np.array(((cy,-sy*cr,sy*sr),(sy,cy*cr,-cy*sr),(0,sr,cr)))
def shake_pose(t):
 if t<.10:return 0.
 if t<.36:return blend(t,.10,.36,0.,math.radians(9))
 if t<.72:return blend(t,.36,.72,math.radians(9),math.radians(-9))
 if t<1.10:return blend(t,.72,1.10,math.radians(-9),0.)
 return 0.
def confused_pose(t):
 if t<.15:u=0.
 elif t<.65:u=smooth((t-.15)/.50)
 elif t<1.15:u=1.
 elif t<1.80:u=1-smooth((t-1.15)/.65)
 else:u=0.
 # Generate the lateral shoulder drop through asymmetric leg length:
 # left side shortens while the right side extends, with no body translation.
 roll=math.radians(-10)*u
 return roll,0.,0.
def main():
 a=parse();sys.path.insert(0,str(a.model_root.resolve()))
 from controller import StandingPDController,leg_ik,quaternion_to_rpy
 from model_config import LEG_INDEX,LEG_NAMES,NOMINAL_FOOT_POSITIONS,STANDING_JOINT_TARGETS
 from simulation import load_model,reset_to_keyframe
 m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);root0=d.qpos[:3].copy();world_feet={leg:root0+pos for leg,pos in NOMINAL_FOOT_POSITIONS.items()};mr=mp=maxerr=0.;mh=float(root0[2])
 cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
 a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
 try:
  for fi in range(round(DURATIONS[a.action]*a.fps)):
   t=fi/a.fps;root=root0.copy()
   if a.action=='shake_head':roll=0.;yaw=shake_pose(t)
   else:roll,yoff,zoff=confused_pose(t);root[1]+=yoff;root[2]+=zoff;yaw=0.
   rot=rotation_rz(roll,yaw);d.qpos[:3]=root;d.qpos[3:7]=quat_rz(roll,yaw);d.qvel[:6]=0
   for leg in LEG_NAMES:
    body=rot.T@(world_feet[leg]-root);nom=NOMINAL_FOOT_POSITIONS[leg];c.targets[LEG_INDEX[leg]]=leg_ik(float(body[0]-nom[0]),float(body[1]-nom[1]),float(body[2]));recon=root+rot@body;maxerr=max(maxerr,float(np.linalg.norm(recon-world_feet[leg])))
   d.qpos[c.qpos_addresses]=c.targets;d.qvel[c.dof_addresses]=0;mujoco.mj_forward(m,d);r,p,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(r));mp=max(mp,abs(p));mh=min(mh,float(d.qpos[2]));ren.update_scene(d,camera=cam);w.append_data(ren.render())
 finally:w.close();ren.close()
 metrics={'command':a.action,'duration_s':DURATIONS[a.action],'source_video':'11_shake_head.mp4' if a.action=='shake_head' else '12_confused.mp4','feet_world_targets_fixed':True,'joint_compensation_enabled':True,'max_commanded_foot_error_m':maxerr,'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh}
 if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
