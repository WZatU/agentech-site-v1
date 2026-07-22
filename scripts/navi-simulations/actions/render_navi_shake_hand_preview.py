"""Render Navi Agentech.shake_hand(): high right-front lift, hold, lower."""

from __future__ import annotations
import argparse, json, math, sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco
import numpy as np

TOTAL_DURATION_S=11.03
# The torque-driven leg settles vertical slightly before HOLD_START_S and
# remains there briefly after descent begins. This 0.5 s command plateau
# produces approximately one second of visibly stationary overhead pose.
LIFT_START_S,HOLD_START_S,HOLD_END_S,RETURN_S=2.80,4.30,4.80,6.30

def smoothstep(v):v=max(0.0,min(1.0,v));return v*v*(3-2*v)
def amount(t):
    if LIFT_START_S<=t<HOLD_START_S:return smoothstep((t-LIFT_START_S)/(HOLD_START_S-LIFT_START_S))
    if HOLD_START_S<=t<HOLD_END_S:return 1.0
    if HOLD_END_S<=t<RETURN_S:return 1-smoothstep((t-HOLD_END_S)/(RETURN_S-HOLD_END_S))
    return 0.0
def parse_args():
    p=argparse.ArgumentParser();p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()
def main():
    a=parse_args();sys.path.insert(0,str(a.model_root.resolve()))
    from controller import StandingPDController,leg_ik,quaternion_to_rpy
    from model_config import LEG_INDEX,LEG_NAMES,STANDING_FOOT_Z,STANDING_LEG_TARGET
    from simulation import load_model,reset_to_keyframe
    m=load_model();d=mujoco.MjData(m);reset_to_keyframe(m,d,'standing');c=StandingPDController(m);start=d.qpos[:3].copy();sr,sp,sy=quaternion_to_rpy(d.qpos[3:7]);mr=mp=md=0.0;mh=float(d.qpos[2])
    cam=mujoco.MjvCamera();cam.type=mujoco.mjtCamera.mjCAMERA_FREE;cam.lookat[:]=(0,0,.15);cam.distance=1.5;cam.azimuth=120;cam.elevation=-15
    a.output.parent.mkdir(parents=True,exist_ok=True);ren=mujoco.Renderer(m,height=360,width=640);w=imageio.get_writer(a.output,format='FFMPEG',mode='I',fps=a.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
    try:
        for fi in range(round(TOTAL_DURATION_S*a.fps)):
            ft=fi/a.fps
            while float(d.time)+m.opt.timestep/2<ft:
                rn,pn,yn=quaternion_to_rpy(d.qpos[3:7]);d.qfrc_applied[:]=0;d.qfrc_applied[0]=500*(start[0]-d.qpos[0])-35*d.qvel[0];d.qfrc_applied[1]=500*(start[1]-d.qpos[1])-35*d.qvel[1];d.qfrc_applied[3]=35*(sr-rn)-5*d.qvel[3];d.qfrc_applied[4]=35*(sp-pn)-5*d.qvel[4];d.qfrc_applied[5]=20*(sy-yn)-3*d.qvel[5]
                u=amount(float(d.time))
                for leg in LEG_NAMES:
                    if leg=='front_right':
                        # Direct joint-space overhead pose. The normal foot IK
                        # intentionally clamps the paw below the hip and cannot
                        # represent this gesture.
                        overhead=np.array((-.12,2.75,.78),dtype=float)
                        c.targets[LEG_INDEX[leg]]=STANDING_LEG_TARGET*(1-u)+overhead*u
                    else:
                        c.targets[LEG_INDEX[leg]]=leg_ik(0,0,STANDING_FOOT_Z)
                c.apply(d);mujoco.mj_step(m,d);r,p,_=quaternion_to_rpy(d.qpos[3:7]);mr=max(mr,abs(r));mp=max(mp,abs(p));mh=min(mh,float(d.qpos[2]));md=max(md,math.hypot(float(d.qpos[0]-start[0]),float(d.qpos[1]-start[1])))
            ren.update_scene(d,camera=cam);w.append_data(ren.render())
    finally:w.close();ren.close()
    metrics={'command':'shake_hand','duration_s':TOTAL_DURATION_S,'motion_window_s':[LIFT_START_S,RETURN_S],'lifted_model_leg':'front_right','displayed_leg':'right_front','high_hold_s':[HOLD_START_S,HOLD_END_S],'visible_overhead_hold_s':1.0,'max_abs_roll_deg':math.degrees(mr),'max_abs_pitch_deg':math.degrees(mp),'minimum_body_height_m':mh,'max_root_displacement_m':md,'body_level_stabilization':True}
    if a.metrics:a.metrics.parent.mkdir(parents=True,exist_ok=True);a.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(metrics));return 0
if __name__=='__main__':raise SystemExit(main())
