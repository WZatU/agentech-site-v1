"""Render Navi Agentech.knock() from the 04_knock.mp4 reference timeline."""

from __future__ import annotations
import argparse, json, math, sys
from pathlib import Path
import imageio.v2 as imageio
import mujoco

TOTAL_DURATION_S = 18.03
LIFT_START_S, READY_S = 14.65, 15.18
STRIKE_S, STRIKE_HOLD_S = 15.46, 15.72
RETRACT_S, RETURN_S = 16.08, 16.62

def smoothstep(v: float) -> float:
    v=max(0.0,min(1.0,v)); return v*v*(3.0-2.0*v)

def mix(a: tuple[float,float,float], b: tuple[float,float,float], u: float):
    u=smoothstep(u); return tuple(x+(y-x)*u for x,y in zip(a,b))

def paw_target(t: float):
    stand=(0.0,0.0,0.0); ready=(0.040,-0.010,0.110); strike=(0.078,-0.010,0.075)
    if t<LIFT_START_S or t>=RETURN_S:return stand
    if t<READY_S:return mix(stand,ready,(t-LIFT_START_S)/(READY_S-LIFT_START_S))
    if t<STRIKE_S:return mix(ready,strike,(t-READY_S)/(STRIKE_S-READY_S))
    if t<STRIKE_HOLD_S:return strike
    if t<RETRACT_S:return mix(strike,ready,(t-STRIKE_HOLD_S)/(RETRACT_S-STRIKE_HOLD_S))
    return mix(ready,stand,(t-RETRACT_S)/(RETURN_S-RETRACT_S))

def parse_args():
    p=argparse.ArgumentParser();p.add_argument('--model-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metrics',type=Path);p.add_argument('--fps',type=int,default=24);return p.parse_args()

def main():
    args=parse_args();sys.path.insert(0,str(args.model_root.resolve()))
    from controller import StandingPDController,leg_ik,quaternion_to_rpy
    from model_config import LEG_INDEX,LEG_NAMES,STANDING_FOOT_Z
    from simulation import load_model,reset_to_keyframe
    model=load_model();data=mujoco.MjData(model);reset_to_keyframe(model,data,'standing');controller=StandingPDController(model)
    start=data.qpos[:3].copy();sr,sp,sy=quaternion_to_rpy(data.qpos[3:7]);maxr=maxp=maxd=0.0;minh=float(data.qpos[2])
    camera=mujoco.MjvCamera();camera.type=mujoco.mjtCamera.mjCAMERA_FREE;camera.lookat[:]=(0,0,.15);camera.distance=1.5;camera.azimuth=120;camera.elevation=-15
    args.output.parent.mkdir(parents=True,exist_ok=True);renderer=mujoco.Renderer(model,height=360,width=640)
    writer=imageio.get_writer(args.output,format='FFMPEG',mode='I',fps=args.fps,codec='libx264',quality=8,macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-pix_fmt','yuv420p'])
    try:
        for fi in range(round(TOTAL_DURATION_S*args.fps)):
            ft=fi/args.fps
            while float(data.time)+model.opt.timestep/2<ft:
                t=float(data.time);rn,pn,yn=quaternion_to_rpy(data.qpos[3:7]);data.qfrc_applied[:]=0
                data.qfrc_applied[0]=180*(start[0]-data.qpos[0])-18*data.qvel[0];data.qfrc_applied[1]=180*(start[1]-data.qpos[1])-18*data.qvel[1]
                data.qfrc_applied[3]=8*(sr-rn)-1.2*data.qvel[3];data.qfrc_applied[4]=8*(sp-pn)-1.2*data.qvel[4];data.qfrc_applied[5]=5*(sy-yn)-.8*data.qvel[5]
                for leg in LEG_NAMES:
                    x=y=dz=0.0
                    if leg=='front_right':x,y,dz=paw_target(t)
                    controller.targets[LEG_INDEX[leg]]=leg_ik(x,y,STANDING_FOOT_Z+dz)
                controller.apply(data);mujoco.mj_step(model,data);r,p,_=quaternion_to_rpy(data.qpos[3:7]);maxr=max(maxr,abs(r));maxp=max(maxp,abs(p));minh=min(minh,float(data.qpos[2]));maxd=max(maxd,math.hypot(float(data.qpos[0]-start[0]),float(data.qpos[1]-start[1])))
            renderer.update_scene(data,camera=camera);writer.append_data(renderer.render())
    finally:writer.close();renderer.close()
    metrics={'command':'knock','duration_s':TOTAL_DURATION_S,'reference_motion_window_s':[LIFT_START_S,RETURN_S],'lifted_model_leg':'front_right','displayed_leg':'right_front','knock_count':1,'max_abs_roll_deg':math.degrees(maxr),'max_abs_pitch_deg':math.degrees(maxp),'minimum_body_height_m':minh,'max_root_displacement_m':maxd,'body_level_stabilization':True}
    if args.metrics:args.metrics.parent.mkdir(parents=True,exist_ok=True);args.metrics.write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(metrics));return 0

if __name__=='__main__':raise SystemExit(main())
