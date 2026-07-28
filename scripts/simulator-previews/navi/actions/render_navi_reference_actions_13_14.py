"""Render show_affection and draw_heart from references 13 and 14."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np
DURATIONS={'show_affection':32.50,'draw_heart':21.07}
LEFT_ANGLE=np.array((.12,math.pi/2,math.pi/2),dtype=float)
def smooth(v):v=max(0.,min(1.,v));return v*v*(3-2*v)
def parse():
 p=argparse.ArgumentParser();p.add_argument('action',choices=DURATIONS);p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def heart_target(t,standing):
 if t<14.45:return standing
 if t<15.15:
  u=smooth((t-14.45)/.70);return standing*(1-u)+LEFT_ANGLE*u
 # Trace one complete heart while the left-front paw remains raised.
 if t<18.55:
  u=(t-15.15)/(18.55-15.15);theta=2*math.pi*u
  hx=math.sin(theta)**3
  raw=13*math.cos(theta)-5*math.cos(2*theta)-2*math.cos(3*theta)-math.cos(4*theta)
  hy=(raw+2.5)/14.5
  return np.array((.12+.24*hx,math.pi/2+.18*hy,math.pi/2),dtype=float)
 # One short knock in the air without lowering the leg.
 if t<19.45:
  u=(t-18.55)/.90
  knock=math.sin(math.pi*u)**2
  # The airborne knock is made only at the knee: the upper leg stays raised
  # while the lower segment folds and extends once.
  return LEFT_ANGLE+np.array((0.,0.,.38*knock),dtype=float)
 if t<20.70:
  u=smooth((t-19.45)/1.25);return LEFT_ANGLE*(1-u)+standing*u
 return standing

def affection_lateral(t):
 # The reference keeps every paw planted while the torso slides side-to-side.
 if t<14.0 or t>=19.2:return 0.
 envelope=math.sin(math.pi*min((t-14.0)/5.2,1.))**2
 return .040*math.sin(2*math.pi*2.5*(t-14.0)/5.2)*envelope

def solve_planted_leg(model,data,controller,leg,world_target,guess):
 """Numerically lock one foot site to an exact world-space ground point."""
 from model_config import LEG_INDEX
 sl=LEG_INDEX[leg];qadr=controller.qpos_addresses[sl];dadr=controller.dof_addresses[sl]
 site=mujoco.mj_name2id(model,mujoco.mjtObj.mjOBJ_SITE,f'{leg}_foot_site');q=guess.copy()
 jacp=np.zeros((3,model.nv));jacr=np.zeros((3,model.nv))
 for _ in range(14):
  data.qpos[qadr]=q;mujoco.mj_forward(model,data);err=world_target-data.site_xpos[site]
  if float(np.linalg.norm(err))<2e-6:break
  mujoco.mj_jacSite(model,data,jacp,jacr,site);step=np.linalg.lstsq(jacp[:,dadr],err,rcond=1e-5)[0]
  q+=np.clip(step,-.08,.08)
 data.qpos[qadr]=q;mujoco.mj_forward(model,data)
 return q,float(np.linalg.norm(world_target-data.site_xpos[site]))
def main():
 a=parse();sys.path.insert(0,str(a.model_root.resolve()))
 from controller import StandingPDController,leg_ik,quaternion_to_rpy
 from model_config import LEG_INDEX,LEG_NAMES,NOMINAL_FOOT_POSITIONS,STANDING_FOOT_Z,STANDING_LEG_TARGET
 from simulation import load_model,reset_to_keyframe
 m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);root0=d.qpos[:3].copy();mujoco.mj_forward(m,d);world_feet={leg:d.site_xpos[mujoco.mj_name2id(m,mujoco.mjtObj.mjOBJ_SITE,f'{leg}_foot_site')].copy() for leg in LEG_NAMES};mr=mp=md=maxerr=0.;mh=float(root0[2])
 cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
 a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
 try:
  for fi in range(round(DURATIONS[a.action]*a.fps)):
   t=fi/a.fps;root=root0.copy()
   if a.action=='show_affection':root[1]+=affection_lateral(t)
   d.qpos[:3]=root;d.qvel[:6]=0
   for leg in LEG_NAMES:
    if a.action=='draw_heart' and leg=='front_left':target=heart_target(t,STANDING_LEG_TARGET)
    elif a.action=='show_affection':
     target,err=solve_planted_leg(m,d,c,leg,world_feet[leg],c.targets[LEG_INDEX[leg]]);maxerr=max(maxerr,err)
    else:target=leg_ik(0,0,STANDING_FOOT_Z)
    c.targets[LEG_INDEX[leg]]=target
   d.qpos[c.qpos_addresses]=c.targets;d.qvel[c.dof_addresses]=0;mujoco.mj_forward(m,d);r,p,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(r));mp=max(mp,abs(p));mh=min(mh,float(d.qpos[2]));md=max(md,math.hypot(float(d.qpos[0]-root0[0]),float(d.qpos[1]-root0[1])));ren.update_scene(d,camera=cam);w.append_data(ren.render())
 finally:w.close();ren.close()
 metrics={'command':a.action,'duration_s':DURATIONS[a.action],'source_video':'13_show_affection.mp4' if a.action=='show_affection' else '14_draw_heart.mp4','visible_reference_motion':'lateral_body_slide_with_planted_feet' if a.action=='show_affection' else 'left_front_heart_trace_air_knock_and_lower','lifted_model_leg':None if a.action=='show_affection' else 'front_left','feet_world_targets_fixed':a.action=='show_affection','max_commanded_foot_error_m':maxerr,'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh,'max_root_displacement_m':md}
 if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
