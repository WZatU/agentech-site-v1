"""Render Navi actions 05-07 from their reference MP4 timelines."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np

DURATIONS={'hip_shake':12.50,'wave_hand':2.93,'bow':2.43}
OVERHEAD=np.array((-.12,2.75,.78),dtype=float)
RIGHT_ANGLE_POSE=np.array((-.12,math.pi/2,math.pi/2),dtype=float)
def smooth(v):v=max(0.,min(1.,v));return v*v*(3-2*v)
def window(t,a,b,c,d):
    if a<=t<b:return smooth((t-a)/(b-a))
    if b<=t<c:return 1.
    if c<=t<d:return 1-smooth((t-c)/(d-c))
    return 0.
def args():
 p=argparse.ArgumentParser();p.add_argument('action',choices=DURATIONS);p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def main():
 a=args();sys.path.insert(0,str(a.model_root.resolve()))
 from controller import StandingPDController,leg_ik,quaternion_to_rpy
 from model_config import LEG_INDEX,LEG_NAMES,SIDE_SIGN,STANDING_FOOT_Z,STANDING_LEG_TARGET
 from simulation import load_model,reset_to_keyframe
 m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);start=d.qpos[:3].copy();sr,sp,sy=quaternion_to_rpy(d.qpos[3:7]);mr=mp=md=0.;mh=float(d.qpos[2])
 def stabilize(allow_pitch=False):
  rn,pn,yn=quaternion_to_rpy(d.qpos[3:7]);d.qfrc_applied[:]=0;d.qfrc_applied[0]=500*(start[0]-d.qpos[0])-35*d.qvel[0];d.qfrc_applied[1]=500*(start[1]-d.qpos[1])-35*d.qvel[1];d.qfrc_applied[3]=35*(sr-rn)-5*d.qvel[3];d.qfrc_applied[4]=0 if allow_pitch else 35*(sp-pn)-5*d.qvel[4];d.qfrc_applied[5]=20*(sy-yn)-3*d.qvel[5]
 def set_targets(t):
  if a.action=='wave_hand':
   # Keep the lower section at a right angle to the upper section throughout
   # the wave; move the complete bent limb from the shoulder/hip joint.
   raised=np.array((-.12,math.pi/2,math.pi/2),dtype=float)
   pulse_top=np.array((-.12,1.72,math.pi/2),dtype=float)
   u=0 if t<.40 else smooth((t-.40)/.60) if t<1.00 else 1
   pulse=0 if t<1.00 else .5-.5*math.cos(2*math.pi*3*min((t-1.00)/1.80,1))
   wave_target=raised*(1-pulse)+pulse_top*pulse
   for leg in LEG_NAMES:c.targets[LEG_INDEX[leg]]=STANDING_LEG_TARGET*(1-u)+wave_target*u if leg=='front_right' else leg_ik(0,0,STANDING_FOOT_Z)
  elif a.action=='bow':
   u=window(t,.15,.75,1.15,1.85)
   for leg in LEG_NAMES:c.targets[LEG_INDEX[leg]]=STANDING_LEG_TARGET*(1-u)+RIGHT_ANGLE_POSE*u if leg=='front_right' else leg_ik(0,0,STANDING_FOOT_Z)
  else:
   lowered=max(window(t,.50,1.55,5.35,6.25),window(t,6.50,7.55,9.20,10.05));phase=(t-1.55 if t<6.25 else t-7.55);rear_sway=math.sin(2*math.pi*.75*phase)*lowered
   for leg in LEG_NAMES:
    z=STANDING_FOOT_Z+(0 if leg.startswith('front') else .105*lowered+SIDE_SIGN[leg]*.014*rear_sway)
    c.targets[LEG_INDEX[leg]]=leg_ik(0,0,z)
 cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
 a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p']);base_time=float(d.time)
 try:
  for fi in range(round(DURATIONS[a.action]*a.fps)):
   ft=fi/a.fps
   while float(d.time)-base_time+m.opt.timestep/2<ft:
    t=float(d.time)-base_time;stabilize(a.action=='hip_shake');set_targets(t)
    if a.action in ('wave_hand','bow'):
     # The 2.93 s reference completes this rise too quickly for Navi's
     # torque-limited controller, so follow the captured joint trajectory
     # kinematically while MuJoCo continues simulating the body and contacts.
     sl=LEG_INDEX['front_right'];d.qpos[c.qpos_addresses[sl]]=c.targets[sl];d.qvel[c.dof_addresses[sl]]=0
    c.apply(d);mujoco.mj_step(m,d);r,p,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(r));mp=max(mp,abs(p));mh=min(mh,float(d.qpos[2]));md=max(md,math.hypot(float(d.qpos[0]-start[0]),float(d.qpos[1]-start[1])))
   ren.update_scene(d,camera=cam);w.append_data(ren.render())
 finally:w.close();ren.close()
 metrics={'command':a.action,'duration_s':DURATIONS[a.action],'source_video':{'hip_shake':'05_hip_shake.mp4','wave_hand':'06_wave_hand.mp4','bow':'07_bow.mp4'}[a.action],'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh,'max_root_displacement_m':md}
 if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
