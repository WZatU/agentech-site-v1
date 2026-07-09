from __future__ import annotations

import cgi
import ast
import html
import json
import math
import os
import shutil
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request as urlrequest
from urllib.parse import unquote, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parent
PACKAGE_DIR = ROOT / "packages"
UPLOAD_DIR = ROOT / "web_uploads"
RESULT_DIR = ROOT / "web_results"
SUBMISSION_DIR = ROOT / "review_submissions"
EXAMPLE_XML = ROOT / "examples" / "robot_dog_minimal.xml"
EXAMPLE_CONTROLLER = ROOT / "examples" / "agentech_zero_controller.py"
BAD_CONTROLLER = ROOT / "examples" / "bad_unsafe_controller.py"
BAD_NON_SDK_CONTROLLER = ROOT / "examples" / "bad_non_sdk_controller.py"
EXAMPLE_MOTION_SCRIPT = ROOT / "examples" / "success_simulation.py"
AEGIS_URDF = ROOT / "assets" / "Aegis" / "urdf" / "Aegis_mujoco.urdf"
COMPANY_ROBOTS = {
    "robot_dog": {
        "name": "Agentech Aegis Robot Dog",
        "description": "Company-provided Aegis/D1 quadruped loaded from the controlled MuJoCo setup.",
        "xml_path": AEGIS_URDF,
    }
}

sys.path.insert(0, str(PACKAGE_DIR))

from validator_core.mujoco_adapter import MuJoCoRuntime, RuntimeConfig, load_mujoco_model
import agentech
from agentech_translator import validate_script as validate_real_robot_script


UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)
SUBMISSION_DIR.mkdir(exist_ok=True)


SAFE_BUILTINS = {
    "abs": abs,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "range": range,
    "round": round,
    "sum": sum,
    "tuple": tuple,
    "ValueError": ValueError,
}
BLOCKED_CALLS = {"eval", "exec", "open", "compile", "__import__", "input", "globals", "locals", "vars"}
BLOCKED_NODES = (ast.For, ast.AsyncFor, ast.While, ast.With, ast.AsyncWith, ast.Try, ast.Lambda, ast.ClassDef)
MOTION_COMMANDS = {"stand", "forward", "backward", "backflip", "stop"}
MOTION_PARAMETER_RULES = {
    "stand": {
        "required": {"stand_wait"},
        "allowed": {"stand_wait"},
        "ranges": {"stand_wait": (0.0, 10.0, True)},
        "example": "Agentech.stand(stand_wait=1)",
    },
    "forward": {
        "required": {"speed", "seconds"},
        "allowed": {"speed", "seconds", "stand_wait"},
        "ranges": {"speed": (0.0, 2.37, False), "seconds": (0.0, 10.0, False), "stand_wait": (0.0, 10.0, True)},
        "example": "Agentech.forward(speed=0.3, seconds=3)",
    },
    "backward": {
        "required": {"speed", "seconds"},
        "allowed": {"speed", "seconds", "stand_wait"},
        "ranges": {"speed": (0.0, 2.365, False), "seconds": (0.0, 10.0, False), "stand_wait": (0.0, 10.0, True)},
        "example": "Agentech.backward(speed=0.3, seconds=3)",
    },
    "backflip": {
        "required": set(),
        "allowed": set(),
        "ranges": {},
        "example": "Agentech.backflip()",
    },
    "stop": {
        "required": set(),
        "allowed": set(),
        "ranges": {},
        "example": "Agentech.stop()",
    },
}
STAND_POSE = {
    "FL_ABAD_JOINT": 0.0,
    "FL_HIP_JOINT": 0.58,
    "FL_KNEE_JOINT": -1.08,
    "FR_ABAD_JOINT": 0.0,
    "FR_HIP_JOINT": 0.58,
    "FR_KNEE_JOINT": -1.08,
    "RR_ABAD_JOINT": 0.0,
    "RR_HIP_JOINT": 0.58,
    "RR_KNEE_JOINT": -1.08,
    "RL_ABAD_JOINT": 0.0,
    "RL_HIP_JOINT": 0.58,
    "RL_KNEE_JOINT": -1.08,
}
CROUCH_POSE = {**STAND_POSE, "FL_HIP_JOINT": 1.05, "FL_KNEE_JOINT": -1.75, "FR_HIP_JOINT": 1.05, "FR_KNEE_JOINT": -1.75, "RR_HIP_JOINT": 1.05, "RR_KNEE_JOINT": -1.75, "RL_HIP_JOINT": 1.05, "RL_KNEE_JOINT": -1.75}
TUCK_POSE = {"FL_ABAD_JOINT": -0.10, "FL_HIP_JOINT": 1.34, "FL_KNEE_JOINT": -2.28, "FR_ABAD_JOINT": 0.10, "FR_HIP_JOINT": 1.34, "FR_KNEE_JOINT": -2.28, "RR_ABAD_JOINT": 0.10, "RR_HIP_JOINT": 1.18, "RR_KNEE_JOINT": -2.12, "RL_ABAD_JOINT": -0.10, "RL_HIP_JOINT": 1.18, "RL_KNEE_JOINT": -2.12}
STAND_BASE_Z = 0.37
BACKFLIP_SECONDS = 4.2


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name == "agentech":
        return agentech
    raise ImportError("Only the Agentech SDK import is allowed: import agentech")


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def clamp01(value: float) -> float:
    return clamp(value, 0.0, 1.0)


def smoothstep(value: float) -> float:
    value = clamp01(value)
    return value * value * (3.0 - 2.0 * value)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_pose(a: dict[str, float], b: dict[str, float], t: float) -> dict[str, float]:
    eased = smoothstep(t)
    return {name: lerp(a[name], b[name], eased) for name in STAND_POSE}


def joint_qpos_addr(mujoco_module, model, joint_name: str) -> int | None:
    joint_id = mujoco_module.mj_name2id(model, mujoco_module.mjtObj.mjOBJ_JOINT, joint_name)
    if joint_id < 0:
        return None
    return int(model.jnt_qposadr[joint_id])


def set_joint_pose(mujoco_module, model, data, joint_name: str, value: float) -> None:
    qpos_addr = joint_qpos_addr(mujoco_module, model, joint_name)
    if qpos_addr is not None:
        data.qpos[qpos_addr] = value


def gait_pose(time_s: float, direction: float) -> dict[str, float]:
    pose = dict(STAND_POSE)
    gait = time_s * 8.0
    for leg, phase in {"FL": 0.0, "RR": 0.0, "FR": math.pi, "RL": math.pi}.items():
        swing = math.sin(gait + phase)
        lift = max(0.0, swing)
        pose[f"{leg}_ABAD_JOINT"] = 0.06 * math.sin(gait + phase + 0.4)
        pose[f"{leg}_HIP_JOINT"] = 0.58 + direction * 0.18 * swing
        pose[f"{leg}_KNEE_JOINT"] = -1.08 - 0.24 * lift
    return pose


def backflip_pose(elapsed: float) -> tuple[float, float, float, dict[str, float]]:
    t = elapsed / BACKFLIP_SECONDS
    if t < 0.20:
        phase = t / 0.20
        return 0.0, 0.0, lerp(STAND_BASE_Z, 0.27, phase), lerp_pose(STAND_POSE, CROUCH_POSE, phase)
    if t < 0.42:
        phase = (t - 0.20) / 0.22
        return lerp(0.0, -0.10, phase), lerp(0.0, -0.42, phase), lerp(0.27, STAND_BASE_Z + 0.16, phase), lerp_pose(CROUCH_POSE, STAND_POSE, phase)
    if t < 0.82:
        phase = (t - 0.42) / 0.40
        pitch = lerp(-0.42, -2.0 * math.pi + 0.42, smoothstep(phase))
        base_z = lerp(STAND_BASE_Z + 0.16, STAND_BASE_Z - 0.04, smoothstep(phase)) + 0.56 * math.sin(math.pi * phase)
        pose = lerp_pose(STAND_POSE, TUCK_POSE, phase / 0.55) if phase < 0.55 else lerp_pose(TUCK_POSE, STAND_POSE, (phase - 0.55) / 0.45)
        return lerp(-0.10, -0.44, phase), pitch, base_z, pose
    phase = (t - 0.82) / 0.18
    return -0.44, lerp(-2.0 * math.pi + 0.42, -2.0 * math.pi, phase), STAND_BASE_Z, lerp_pose(TUCK_POSE, STAND_POSE, phase)


def set_visual_pose(mujoco_module, model, data, base_x: float, pitch: float, base_z: float, joints: dict[str, float]) -> None:
    data.qpos[:] = 0.0
    data.qvel[:] = 0.0
    data.qpos[0] = base_x
    data.qpos[1] = 0.0
    data.qpos[2] = base_z
    data.qpos[3] = math.cos(pitch * 0.5)
    data.qpos[4] = 0.0
    data.qpos[5] = math.sin(pitch * 0.5)
    data.qpos[6] = 0.0
    for joint_name, value in joints.items():
        set_joint_pose(mujoco_module, model, data, joint_name, value)
    mujoco_module.mj_forward(model, data)


def motion_plan_duration(motion_plan: list[dict]) -> float:
    duration = 0.0
    for command in motion_plan:
        name = command.get("name")
        params = command.get("params", {})
        if name == "stand":
            duration += clamp(float(params.get("stand_wait", 1.0)), 0.0, 10.0)
        elif name in {"forward", "backward"}:
            duration += clamp(float(params.get("seconds", 1.0)), 0.0, 10.0)
        elif name == "backflip":
            duration += BACKFLIP_SECONDS
        elif name == "stop":
            duration += 0.4
    return max(duration, 1.0)


def motion_pose_at(motion_plan: list[dict], time_s: float) -> tuple[float, float, float, dict[str, float]]:
    base_x = 0.0
    elapsed_cursor = 0.0
    for command in motion_plan:
        name = command.get("name")
        params = command.get("params", {})
        duration = 0.4
        if name == "stand":
            duration = clamp(float(params.get("stand_wait", 1.0)), 0.0, 10.0)
        elif name in {"forward", "backward"}:
            duration = clamp(float(params.get("seconds", 1.0)), 0.0, 10.0)
        elif name == "backflip":
            duration = BACKFLIP_SECONDS

        local_time = time_s - elapsed_cursor
        if local_time <= duration:
            if name == "forward":
                speed = clamp(float(params.get("speed", 0.3)), 0.0, 2.37)
                return base_x + speed * local_time, 0.0, STAND_BASE_Z, gait_pose(local_time, 1.0)
            if name == "backward":
                speed = clamp(float(params.get("speed", 0.3)), 0.0, 2.365)
                return base_x - speed * local_time, 0.0, STAND_BASE_Z, gait_pose(local_time, -1.0)
            if name == "backflip":
                flip_x, pitch, base_z, joints = backflip_pose(local_time)
                return base_x + flip_x, pitch, base_z, joints
            return base_x, 0.0, STAND_BASE_Z, STAND_POSE

        if name == "forward":
            base_x += clamp(float(params.get("speed", 0.3)), 0.0, 2.37) * duration
        elif name == "backward":
            base_x -= clamp(float(params.get("speed", 0.3)), 0.0, 2.365) * duration
        elif name == "backflip":
            base_x -= 0.44
        elapsed_cursor += duration
    return base_x, 0.0, STAND_BASE_Z, STAND_POSE


def page(title: str, body: str) -> bytes:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #dde5ef;
      --brand: #111827;
      --brand-soft: #f8fafc;
      --green: #0f8a54;
      --red: #c2392f;
      --bg: #f3f6fb;
      --panel: #ffffff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--ink);
    }}
    header {{
      min-height: 72px;
      background: rgba(0, 0, 0, 0.80);
      color: #ffffff;
      border-bottom: 1px solid rgba(255,255,255,0.14);
      padding: 0 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }}
    header h1 {{
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }}
    header p {{
      margin: 0;
      color: #9aa8bf;
      line-height: 1.2;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      text-align: right;
    }}
    .brand-subtitle {{ display: flex; gap: 12px; align-items: center; }}
    .brand-pill {{
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 9999px;
      padding: 10px 16px;
      font-size: 13px;
      text-decoration: none;
    }}
    main {{
      max-width: 1140px;
      margin: 0 auto;
      padding: 48px 24px 56px;
    }}
    section {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 30px;
      margin-bottom: 22px;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
    }}
    h2 {{
      color: var(--ink);
      margin: 0 0 18px;
      font-size: 28px;
      line-height: 1.15;
      font-weight: 760;
    }}
    .grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
      align-items: start;
    }}
    label {{
      display: block;
      font-weight: 720;
      margin-bottom: 9px;
      color: #1f2937;
    }}
    input[type=file], input[type=number], select {{
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 13px 14px;
      background: #ffffff;
      color: var(--ink);
      font: inherit;
    }}
    input[type=file]::file-selector-button {{
      border: 0;
      border-radius: 9px;
      background: #eef2f7;
      color: #111827;
      padding: 9px 12px;
      margin-right: 12px;
      font-weight: 720;
      cursor: pointer;
    }}
    button, .button {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 12px;
      background: var(--brand);
      color: #fff;
      padding: 12px 18px;
      text-decoration: none;
      font-weight: 760;
      cursor: pointer;
      min-height: 44px;
    }}
    .button.secondary {{
      background: #ffffff;
      color: var(--brand);
      border: 1px solid var(--line);
    }}
    .button.submit {{
      background: var(--green);
      color: #fff;
    }}
    .button.disabled {{
      background: #c9d1d8;
      color: #64717f;
      cursor: not-allowed;
      pointer-events: none;
    }}
    .actions {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }}
    .hint {{
      color: var(--muted);
      line-height: 1.55;
      margin: 0;
    }}
    .status {{
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
    }}
    .status.pass {{ background: #e7f7ef; color: var(--green); }}
    .status.fail {{ background: #fdeceb; color: var(--red); }}
    .simulation-fail {{
      display: grid;
      place-items: center;
      min-height: 260px;
      margin-top: 14px;
      border: 1px solid #f1b4ad;
      border-radius: 18px;
      background: #fff4f2;
      color: var(--red);
      text-align: center;
    }}
    .simulation-fail .x {{
      font-size: 118px;
      line-height: 1;
      font-weight: 800;
    }}
    .simulation-fail .reason {{
      margin-top: 6px;
      color: var(--red);
      font-weight: 700;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }}
    th, td {{
      border: 1px solid var(--line);
      text-align: left;
      padding: 12px 14px;
      vertical-align: top;
    }}
    th {{ background: var(--brand-soft); color: #334155; }}
    pre {{
      overflow: auto;
      max-height: 460px;
      border: 1px solid var(--line);
      background: #0f1720;
      color: #dbe7f4;
      border-radius: 8px;
      padding: 14px;
      line-height: 1.45;
      font-size: 12px;
    }}
    pre.compact {{
      max-height: 120px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }}
    img.snapshot {{
      width: 100%;
      max-width: 640px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #111;
    }}
    img.simulation {{
      width: 100%;
      max-width: 640px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #111;
    }}
    ul {{ line-height: 1.7; color: #334155; }}
    @media (max-width: 820px) {{
      .grid {{ grid-template-columns: 1fr; }}
      header {{ padding: 18px 20px; align-items: flex-start; flex-direction: column; }}
      header p {{ text-align: left; }}
      .brand-subtitle {{ flex-wrap: wrap; gap: 12px; }}
      main {{ padding: 24px 14px 32px; }}
      section {{ border-radius: 20px; padding: 22px; }}
      h2 {{ font-size: 24px; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>AGENTECH</h1>
    <div class="brand-subtitle">
      <span class="brand-pill">Simulation</span>
    </div>
  </header>
  <main>{body}</main>
</body>
</html>""".encode("utf-8")


def render_snapshot(xml_path: Path, output_png: Path) -> tuple[bool, str]:
    try:
        import mujoco

        model = load_mujoco_model(mujoco, xml_path)
        data = mujoco.MjData(model)
        mujoco.mj_resetData(model, data)
        mujoco.mj_forward(model, data)
        cam = full_model_camera(mujoco, model, data)
        renderer = mujoco.Renderer(model, height=480, width=640)
        renderer.update_scene(data, camera=cam)
        Image.fromarray(renderer.render()).save(output_png)
        return True, ""
    except Exception as exc:
        return False, str(exc)


def full_model_camera(mujoco_module, model, data=None):
    cam = mujoco_module.MjvCamera()
    cam.type = mujoco_module.mjtCamera.mjCAMERA_FREE
    cam.azimuth = 135
    cam.elevation = -18
    base_id = mujoco_module.mj_name2id(model, mujoco_module.mjtObj.mjOBJ_BODY, "BASE_LINK")
    if base_id >= 0 and data is not None:
        cam.distance = 1.25
        cam.lookat[:] = data.xpos[base_id]
        cam.lookat[2] += 0.03
        return cam
    extent = max(float(model.stat.extent), 0.8)
    cam.distance = extent * 1.7
    cam.lookat[:] = model.stat.center
    cam.lookat[2] += extent * 0.08
    return cam


def error_record(code: str, message: str, suggestion: str) -> dict:
    return {"code": code, "message": message, "suggestion": suggestion}


def validate_motion_call_parameters(node: ast.Call) -> list[dict]:
    command = node.func.attr if isinstance(node.func, ast.Attribute) else ""
    rules = MOTION_PARAMETER_RULES.get(command)
    if rules is None:
        return []

    errors: list[dict] = []
    line = int(getattr(node, "lineno", 0) or 0)
    example = rules["example"]

    if node.args:
        errors.append(
            error_record(
                "CONTROLLER_PARAMETER_POSITIONAL_BLOCKED",
                f"Line {line}: Agentech.{command}() must use named keyword parameters.",
                f"Use the documented format, for example: {example}",
            )
        )

    kwargs: dict[str, object] = {}
    for keyword in node.keywords:
        if keyword.arg is None:
            errors.append(
                error_record(
                    "CONTROLLER_PARAMETER_EXPANDED_BLOCKED",
                    f"Line {line}: Agentech.{command}() cannot use expanded keyword arguments.",
                    f"Write each parameter directly, for example: {example}",
                )
            )
            continue
        if keyword.arg not in rules["allowed"]:
            allowed = ", ".join(sorted(rules["allowed"])) or "no parameters"
            errors.append(
                error_record(
                    "CONTROLLER_PARAMETER_UNKNOWN",
                    f"Line {line}: Agentech.{command}() does not support parameter '{keyword.arg}'.",
                    f"Allowed parameters for {command}: {allowed}. Example: {example}",
                )
            )
            continue
        try:
            kwargs[keyword.arg] = ast.literal_eval(keyword.value)
        except (ValueError, TypeError):
            errors.append(
                error_record(
                    "CONTROLLER_PARAMETER_NOT_LITERAL",
                    f"Line {line}: Agentech.{command}() parameter '{keyword.arg}' must be a literal value.",
                    f"Use a direct number/string value, for example: {example}",
                )
            )

    missing = sorted(rules["required"] - set(kwargs))
    if missing:
        errors.append(
            error_record(
                "CONTROLLER_PARAMETER_REQUIRED",
                f"Line {line}: Agentech.{command}() is missing required parameter(s): {', '.join(missing)}.",
                f"Use the full documented call, for example: {example}",
            )
        )

    for name, value in kwargs.items():
        if name not in rules["ranges"]:
            continue
        low, high, allow_zero = rules["ranges"][name]
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(float(value)):
            errors.append(
                error_record(
                    "CONTROLLER_PARAMETER_TYPE_INVALID",
                    f"Line {line}: Agentech.{command}() parameter '{name}' must be a finite number.",
                    f"Use a numeric value in range {low} to {high}. Example: {example}",
                )
            )
            continue
        numeric = float(value)
        lower_ok = numeric >= low if allow_zero else numeric > low
        if not lower_ok or numeric > high:
            lower_text = f">= {low}" if allow_zero else f"> {low}"
            errors.append(
                error_record(
                    "CONTROLLER_PARAMETER_RANGE_INVALID",
                    f"Line {line}: Agentech.{command}() parameter '{name}' is out of range: {numeric}.",
                    f"Required range: {lower_text} and <= {high}. Example: {example}",
                )
            )

    return errors


def validate_controller_source(source: str) -> list[dict]:
    errors: list[dict] = []
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return [
            error_record(
                "CONTROLLER_SYNTAX_ERROR",
                f"Controller Python syntax error: {exc.msg}.",
                "Fix the Python file and upload it again.",
            )
        ]

    controller_defs = [
        node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "controller"
    ]
    motion_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "Agentech"
        and node.func.attr in MOTION_COMMANDS
    ]
    if controller_defs and len(controller_defs[0].args.args) != 1:
        errors.append(
            error_record(
                "CONTROLLER_SIGNATURE_INVALID",
                "controller() must accept exactly one argument named observation.",
                "Use: def controller(observation):",
            )
        )

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name != "agentech":
                    errors.append(
                        error_record(
                            "CONTROLLER_IMPORT_BLOCKED",
                            f"Blocked import: {alias.name}.",
                            "Customer code can only use: import agentech",
                        )
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module != "agentech" or node.level != 0:
                errors.append(
                    error_record(
                        "CONTROLLER_IMPORT_BLOCKED",
                        f"Blocked import from: {node.module or 'relative import'}.",
                        "Customer code can only import from the Agentech SDK.",
                    )
                )
        elif isinstance(node, BLOCKED_NODES):
            errors.append(
                error_record(
                    "CONTROLLER_UNSAFE_STRUCTURE",
                    f"Blocked Python structure: {type(node).__name__}.",
                    "For this prototype, customer controller code cannot use loops, classes, try blocks, or context managers.",
                )
            )
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
            errors.append(
                error_record(
                    "CONTROLLER_UNSAFE_CALL",
                    f"Blocked function call: {node.func.id}().",
                    "Use the Agentech SDK only; file, system, and dynamic execution calls are not allowed.",
                )
            )
        elif isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            errors.append(
                error_record(
                    "CONTROLLER_PRIVATE_ACCESS_BLOCKED",
                    f"Blocked private attribute access: {node.attr}.",
                    "Do not access Python private or dunder attributes.",
                )
            )
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            owner = node.func.value
            if isinstance(owner, ast.Name) and owner.id == "Agentech" and node.func.attr in MOTION_COMMANDS:
                errors.extend(validate_motion_call_parameters(node))
                continue
            if isinstance(owner, ast.Name) and owner.id == "agentech":
                continue
            errors.append(
                error_record(
                    "CONTROLLER_UNAPPROVED_SDK_CALL",
                    f"Blocked SDK call: {node.func.attr}().",
                    "Use documented calls such as Agentech.forward(...), Agentech.backward(...), Agentech.backflip(), or agentech.zero_action(observation).",
                )
            )
    if not controller_defs and not motion_calls:
        errors.append(
            error_record(
                "CONTROLLER_FUNCTION_MISSING",
                "Controller file must define controller(observation) or use Agentech motion commands.",
                "Example: from agentech import Agentech; Agentech.forward(speed=0.3, seconds=3)",
            )
        )
    return errors


def load_controller(controller_path: Path) -> tuple[object | None, list[dict], list[dict]]:
    source = controller_path.read_text(encoding="utf-8", errors="replace")
    errors = validate_controller_source(source)
    if errors:
        return None, errors, []
    namespace = {
        "__builtins__": {**SAFE_BUILTINS, "__import__": safe_import},
        "agentech": agentech,
        "Agentech": agentech.Agentech,
    }
    try:
        agentech.Agentech.reset_script()
        exec(compile(source, str(controller_path), "exec"), namespace, namespace)
    except Exception as exc:
        return None, [
            error_record(
                "CONTROLLER_LOAD_FAILED",
                f"Controller failed while loading: {exc}",
                "Keep code simple and use only Agentech SDK motion commands or controller(observation).",
            )
        ], []
    controller = namespace.get("controller")
    motion_plan = agentech.Agentech.consume_script()
    if callable(controller):
        return controller, [], []
    if motion_plan:
        return None, [], motion_plan
    return None, [
        error_record(
            "CONTROLLER_NOT_CALLABLE",
            "No runnable Agentech command or controller function was found.",
            "Use Agentech.forward(...), Agentech.backward(...), Agentech.backflip(), or define controller(observation).",
        )
    ], []


def controller_observation(model, data, step_index: int) -> dict:
    return {
        "step": int(step_index),
        "time": float(data.time),
        "actuator_count": int(model.nu),
        "qpos": data.qpos.copy().tolist(),
        "qvel": data.qvel.copy().tolist(),
        "qacc": data.qacc.copy().tolist(),
        "ctrl": data.ctrl.copy().tolist() if model.nu else [],
    }


def controller_controls(controller, observation: dict) -> tuple[list[float], dict | None]:
    try:
        values = controller(observation)
        controls = [float(value) for value in values]
    except Exception as exc:
        return [], error_record(
            "CONTROLLER_RUNTIME_ERROR",
            f"Controller crashed: {exc}",
            "Check controller(observation) and return a numeric list of actuator commands.",
        )
    expected = int(observation["actuator_count"])
    if len(controls) != expected:
        return [], error_record(
            "CONTROLLER_OUTPUT_SIZE_INVALID",
            f"Controller returned {len(controls)} values, but the robot expects {expected}.",
            "Return one motor command per actuator, or use agentech.zero_action(observation).",
        )
    if any(not math.isfinite(value) for value in controls):
        return [], error_record(
            "CONTROLLER_OUTPUT_INVALID",
            "Controller returned NaN or infinite actuator commands.",
            "Return finite numeric motor commands.",
        )
    return controls, None


def render_simulation_gif(
    xml_path: Path, output_gif: Path, steps: int, controller=None, motion_plan: list[dict] | None = None
) -> tuple[bool, str, list[dict]]:
    try:
        import mujoco

        model = load_mujoco_model(mujoco, xml_path)
        data = mujoco.MjData(model)
        mujoco.mj_resetData(model, data)
        if model.nu:
            data.ctrl[:] = 0

        cam = full_model_camera(mujoco, model, data)
        renderer = mujoco.Renderer(model, height=480, width=640)
        frames: list[Image.Image] = []

        if motion_plan:
            total_seconds = motion_plan_duration(motion_plan)
            frame_count = min(140, max(40, int(total_seconds * 12)))
            for frame_index in range(frame_count + 1):
                time_s = total_seconds * frame_index / max(1, frame_count)
                base_x, pitch, base_z, joints = motion_pose_at(motion_plan, time_s)
                set_visual_pose(mujoco, model, data, base_x, pitch, base_z, joints)
                cam = full_model_camera(mujoco, model, data)
                renderer.update_scene(data, camera=cam)
                frames.append(Image.fromarray(renderer.render()))
            if hasattr(renderer, "close"):
                renderer.close()
            frames[0].save(
                output_gif,
                save_all=True,
                append_images=frames[1:],
                duration=85,
                loop=0,
                optimize=True,
            )
            return True, "", []

        max_frames = 90
        stride = max(1, steps // max_frames)

        for step_index in range(max(1, steps) + 1):
            if step_index > 0:
                if controller is not None:
                    controls, control_error = controller_controls(
                        controller, controller_observation(model, data, step_index)
                    )
                    if control_error:
                        return False, control_error["message"], [control_error]
                    data.ctrl[:] = controls
                mujoco.mj_step(model, data)
            if step_index == 0 or step_index % stride == 0 or step_index == steps:
                renderer.update_scene(data, camera=cam)
                frames.append(Image.fromarray(renderer.render()))

        if hasattr(renderer, "close"):
            renderer.close()
        if not frames:
            return False, "No frames were rendered."
        duration_ms = 80
        frames[0].save(
            output_gif,
            save_all=True,
            append_images=frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=True,
        )
        return True, "", []
    except Exception as exc:
        return False, str(exc), [
            error_record(
                "SIMULATION_RENDER_FAILED",
                f"Simulation video failed: {exc}",
                "Check the XML and controller output.",
            )
        ]


def run_runtime_steps(runtime: MuJoCoRuntime, steps: int, controller=None) -> list[dict]:
    if controller is None:
        runtime.zero_controls()
        runtime.step(steps)
        return []

    controller_errors: list[dict] = []
    for step_index in range(max(1, steps)):
        observation = controller_observation(runtime.model, runtime.data, step_index)
        controls, control_error = controller_controls(controller, observation)
        if control_error:
            controller_errors.append(control_error)
            break
        if not runtime.set_controls(controls):
            break
        if not runtime.step(1):
            break
    return controller_errors


def run_motion_plan(runtime: MuJoCoRuntime, motion_plan: list[dict]) -> list[dict]:
    runtime.require_loaded()
    total_seconds = motion_plan_duration(motion_plan)
    sample_count = min(240, max(40, int(total_seconds * 20)))
    for frame_index in range(sample_count + 1):
        time_s = total_seconds * frame_index / max(1, sample_count)
        base_x, pitch, base_z, joints = motion_pose_at(motion_plan, time_s)
        set_visual_pose(runtime.mujoco, runtime.model, runtime.data, base_x, pitch, base_z, joints)
        if frame_index % max(1, runtime.config.sample_every) == 0:
            runtime.samples.append(runtime.export_snapshot())
    return []


def build_real_robot_script(motion_plan: list[dict]) -> str:
    lines = [
        "import agentech as agt",
        "",
        "dog = agt.Dog()",
    ]
    for command in motion_plan:
        name = command.get("name")
        params = command.get("params", {})
        if name == "stand":
            duration = float(params.get("stand_wait", 1.0))
            lines.append(f"dog.agt.stand(duration={duration!r})")
        elif name == "forward":
            speed = float(params.get("speed", 0.3))
            duration = float(params.get("seconds", 1.0))
            lines.append(f"dog.agt.walk_forward(speed={speed!r}, duration={duration!r})")
        elif name == "backward":
            speed = float(params.get("speed", 0.3))
            duration = float(params.get("seconds", 1.0))
            lines.append(f"dog.agt.walk_backward(speed={speed!r}, duration={duration!r})")
        elif name == "backflip":
            lines.append("dog.agt.do_action('backflip')")
        elif name == "stop":
            lines.append("dog.agt.stop(duration=0.7)")
        else:
            lines.append(f"dog.agt.{name}()")
    lines.append("dog.agt.close()")
    lines.append("")
    return "\n".join(lines)


def run_translation_check(result_dir: Path, motion_plan: list[dict], controller_errors: list[dict]) -> dict:
    translated_dir = result_dir / "translation"
    translated_dir.mkdir(parents=True, exist_ok=True)
    translated_script = translated_dir / "real_robot_script.py"

    if controller_errors:
        result = {
            "status": "FAIL",
            "translatable": False,
            "reason": "Skipped because uploaded code did not pass SDK/code validation.",
            "translated_script": None,
            "items": [],
        }
        return result

    if not motion_plan:
        result = {
            "status": "FAIL",
            "translatable": False,
            "reason": "No Agentech motion commands were found to translate.",
            "translated_script": None,
            "items": [],
        }
        return result

    translated_script.write_text(build_real_robot_script(motion_plan), encoding="utf-8")
    validation = validate_real_robot_script(translated_script)
    failed_items = [item for item in validation.get("items", []) if item.get("status") != "pass"]
    if validation.get("status") == "pass":
        return {
            "status": "PASS",
            "translatable": True,
            "reason": "Uploaded Agentech commands can be translated into the real-robot SDK command format.",
            "translated_script": str(translated_script),
            "items": validation.get("items", []),
        }
    return {
        "status": "FAIL",
        "translatable": False,
        "reason": failed_items[0].get("reason", "Translator validation failed.") if failed_items else "Translator validation failed.",
        "translated_script": str(translated_script),
        "items": validation.get("items", []),
    }


def run_validation(
    xml_path: Path,
    result_id: str,
    steps: int,
    controller_path: Path | None = None,
    robot_info: dict | None = None,
) -> dict:
    result_dir = RESULT_DIR / result_id
    result_dir.mkdir(parents=True, exist_ok=True)
    output_json = result_dir / "simulation_output.json"
    snapshot_png = result_dir / "snapshot.png"
    simulation_gif = result_dir / "simulation.gif"
    controller = None
    motion_plan: list[dict] = []
    controller_errors: list[dict] = []
    translation_check: dict = {
        "status": "NOT_RUN",
        "translatable": False,
        "reason": "Translation check has not run yet.",
        "translated_script": None,
        "items": [],
    }
    controller_info = {
        "uploaded": controller_path is not None,
        "filename": controller_path.name if controller_path else None,
        "sdk_policy": "Only import agentech / from agentech import ... is allowed.",
        "loops_allowed": False,
        "mode": "NOT_UPLOADED",
        "motion_plan": [],
        "status": "NOT_UPLOADED",
    }

    if controller_path is not None:
        if controller_path.suffix.lower() != ".py":
            controller_errors = [
                error_record(
                    "CONTROLLER_EXTENSION_INVALID",
                    "Controller upload must be a .py file.",
                    "Upload a Python file that defines controller(observation).",
                )
            ]
        else:
            controller, controller_errors, motion_plan = load_controller(controller_path)
        controller_info["status"] = "PASS" if not controller_errors else "FAIL"
        controller_info["mode"] = "motion_script" if motion_plan else "controller"
        controller_info["motion_plan"] = motion_plan
    else:
        controller_errors = [
            error_record(
                "CONTROLLER_REQUIRED",
                "Controller code is required for this test.",
                "Upload a .py file that defines controller(observation) and uses the agentech SDK.",
            )
        ]
        controller_info["status"] = "FAIL"

    runtime = MuJoCoRuntime(RuntimeConfig(xml_path=str(xml_path), steps=steps, output_path=str(output_json)))
    loaded = runtime.load()
    if loaded and not controller_errors:
        runtime.reset()
        if motion_plan:
            controller_errors.extend(run_motion_plan(runtime, motion_plan))
        else:
            controller_errors.extend(run_runtime_steps(runtime, steps, controller=controller))
    runtime.write_simulation_output(str(output_json))

    snapshot_ok = False
    snapshot_error = ""
    simulation_ok = False
    simulation_error = ""
    simulation_errors: list[dict] = []
    if loaded and not controller_errors:
        snapshot_ok, snapshot_error = render_snapshot(xml_path, snapshot_png)
        simulation_ok, simulation_error, simulation_errors = render_simulation_gif(
            xml_path, simulation_gif, steps, controller=controller, motion_plan=motion_plan
        )

    data = json.loads(output_json.read_text(encoding="utf-8"))
    if controller_errors:
        data["status"] = "FAIL"
        data.setdefault("errors", [])
        data["errors"].extend(controller_errors)
        controller_info["status"] = "FAIL"
    elif controller_path is not None:
        controller_info["status"] = "PASS"
    translation_check = run_translation_check(result_dir, motion_plan, controller_errors)
    if translation_check.get("status") == "FAIL":
        data["status"] = "FAIL"
    if simulation_errors:
        data.setdefault("warnings", [])
        data["warnings"].extend(simulation_errors)
    data["controller_validation"] = controller_info
    data["translation_check"] = translation_check
    data["robot_selection"] = robot_info or {}
    data["validation_checklist"] = build_validation_checklist(data)
    data["web_result"] = {
        "result_id": result_id,
        "output_json": f"/results/{result_id}/simulation_output.json",
        "snapshot_png": f"/results/{result_id}/snapshot.png" if snapshot_ok else None,
        "snapshot_error": snapshot_error,
        "simulation_gif": f"/results/{result_id}/simulation.gif" if simulation_ok else None,
        "simulation_error": simulation_error,
    }
    output_json.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return data


def build_validation_checklist(data: dict) -> list[dict]:
    errors = data.get("errors", [])
    error_codes = {error.get("code") for error in errors}
    controller_info = data.get("controller_validation", {})
    translation_info = data.get("translation_check", {})
    has_controller = controller_info.get("uploaded") is True
    sdk_error_codes = {"CONTROLLER_IMPORT_BLOCKED", "CONTROLLER_UNAPPROVED_SDK_CALL"}
    logic_error_codes = {"CONTROLLER_UNSAFE_STRUCTURE", "CONTROLLER_UNSAFE_CALL", "CONTROLLER_PRIVATE_ACCESS_BLOCKED"}
    command_error_codes = {
        "CONTROLLER_REQUIRED",
        "CONTROLLER_FUNCTION_MISSING",
        "CONTROLLER_SIGNATURE_INVALID",
        "CONTROLLER_NOT_CALLABLE",
        "CONTROLLER_SYNTAX_ERROR",
        "CONTROLLER_EXTENSION_INVALID",
        "CONTROLLER_LOAD_FAILED",
    }
    parameter_error_codes = {
        "CONTROLLER_PARAMETER_POSITIONAL_BLOCKED",
        "CONTROLLER_PARAMETER_EXPANDED_BLOCKED",
        "CONTROLLER_PARAMETER_UNKNOWN",
        "CONTROLLER_PARAMETER_NOT_LITERAL",
        "CONTROLLER_PARAMETER_REQUIRED",
        "CONTROLLER_PARAMETER_TYPE_INVALID",
        "CONTROLLER_PARAMETER_RANGE_INVALID",
    }
    runtime_error_codes = {"CONTROLLER_OUTPUT_SIZE_INVALID", "CONTROLLER_OUTPUT_INVALID", "CONTROLLER_RUNTIME_ERROR"}
    return [
        {
            "name": "Robot model selected",
            "status": "PASS" if data.get("robot_selection", {}).get("name") else "FAIL",
            "detail": data.get("robot_selection", {}).get("name", "No company robot selected."),
        },
        {
            "name": "Agentech SDK check",
            "status": "FAIL" if sdk_error_codes & error_codes or not has_controller else "PASS",
            "detail": "Customer code must use the Agentech SDK only, for example Agentech.forward(...).",
        },
        {
            "name": "Logic safety check",
            "status": "FAIL" if logic_error_codes & error_codes or not has_controller else "PASS",
            "detail": "No loops, dynamic execution, file access, or private Python access.",
        },
        {
            "name": "Agentech command check",
            "status": "FAIL" if command_error_codes & error_codes else "PASS",
            "detail": "Requires documented Agentech motion commands such as stand, forward, backward, backflip, or stop.",
        },
        {
            "name": "SDK parameter requirement check",
            "status": "FAIL" if parameter_error_codes & error_codes or command_error_codes & error_codes else "PASS",
            "detail": "Movement commands must include the documented required keyword parameters and safe numeric ranges.",
        },
        {
            "name": "Motion conversion check",
            "status": "FAIL" if runtime_error_codes & error_codes or parameter_error_codes & error_codes or command_error_codes & error_codes else "PASS",
            "detail": "Approved Agentech commands are converted into Aegis MuJoCo movement poses.",
        },
        {
            "name": "Real robot translation check",
            "status": translation_info.get("status", "FAIL"),
            "detail": translation_info.get(
                "reason",
                "Checks whether uploaded customer code can be translated into our real-robot SDK format.",
            ),
        },
        {
            "name": "MuJoCo simulation check",
            "status": data.get("status", "FAIL"),
            "detail": "Runs selected robot with uploaded controller in the standard MuJoCo validation run.",
        },
    ]


def prepare_company_xml(robot_key: str, upload_dir: Path) -> tuple[Path | None, dict, list[dict]]:
    robot = COMPANY_ROBOTS.get(robot_key)
    if robot is None:
        return None, {}, [
            error_record(
                "ROBOT_SELECTION_INVALID",
                "Selected robot is not available.",
                "Choose the company-provided robot dog model.",
            )
        ]
    source_xml = Path(robot["xml_path"])
    robot_info = {
        "key": robot_key,
        "name": robot["name"],
        "description": robot["description"],
        "source_xml": str(source_xml),
    }
    if not source_xml.exists():
        return None, robot_info, [
            error_record(
                "ROBOT_XML_NOT_FOUND",
                f"Company robot XML was not found: {source_xml}",
                "Check that the Aegis robot dog model and mesh folder are available in the previous MuJoCo workspace.",
            )
        ]

    return prepare_uploaded_xml(source_xml), robot_info, []


def prepare_uploaded_xml(xml_path: Path) -> Path:
    return xml_path


def submit_result_for_review(result_id: str) -> tuple[bool, str]:
    safe_result_id = "".join(ch for ch in result_id if ch.isalnum())
    if not safe_result_id:
        return False, "Invalid result id."
    result_json = RESULT_DIR / safe_result_id / "simulation_output.json"
    if not result_json.exists():
        return False, "Result JSON was not found."
    data = json.loads(result_json.read_text(encoding="utf-8"))
    checklist = data.get("validation_checklist", [])
    if data.get("status") != "PASS" or not all(item.get("status") == "PASS" for item in checklist):
        return False, "This result cannot be submitted because not all checks passed."

    payload = {
        "result_id": safe_result_id,
        "robot": data.get("robot_selection", {}),
        "controller_validation": data.get("controller_validation", {}),
        "validation_checklist": checklist,
        "status": data.get("status"),
        "timing": data.get("timing", {}),
        "web_result": data.get("web_result", {}),
    }
    pending_path = SUBMISSION_DIR / f"{safe_result_id}.json"
    pending_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return True, "Submitted for further review."


def index_html() -> bytes:
    body = """
<section>
  <h2>Run Agentech Code On Company Robot</h2>
  <div class="grid">
    <form action="/upload" method="post" enctype="multipart/form-data">
      <label for="robot_model">Company robot model</label>
      <select id="robot_model" name="robot_model" required>
        <option value="robot_dog">Agentech Robot Dog</option>
      </select>
      <div style="height: 12px"></div>
      <label for="controller_file">Agentech code (.py)</label>
      <input id="controller_file" name="controller_file" type="file" accept=".py" required>
      <div class="actions">
        <button type="submit">Run Code Simulation</button>
        <a class="button secondary" href="/example/success_simulation.py">Download Success Simulation</a>
        <a class="button secondary" href="/example/bad_non_sdk_controller.py">Download Failed Example</a>
      </div>
    </form>
    <div>
      <p class="hint">Customers choose the robot dog our company provides, upload controller code, and see what the code does in MuJoCo.</p>
      <ul>
        <li>No customer XML upload on this page.</li>
        <li>Code can use documented commands such as <code>Agentech.forward(speed=0.3, seconds=3)</code>.</li>
        <li>Code must use only the <code>agentech</code> SDK.</li>
        <li>Loops and unsafe Python calls are blocked before the code runs.</li>
      </ul>
    </div>
  </div>
</section>
<section>
  <h2>What You Will See</h2>
  <table>
    <tr><th>Output</th><th>Description</th></tr>
    <tr><td>Status</td><td>PASS or FAIL with structured errors.</td></tr>
    <tr><td>Checklist</td><td>SDK check, logic safety check, Agentech command check, SDK parameter requirement check, real robot translation check, and MuJoCo simulation check.</td></tr>
    <tr><td>Translation Check</td><td>Shows whether the uploaded customer code can be translated into our real-robot SDK command format.</td></tr>
    <tr><td>Simulation Video</td><td>Animated MuJoCo physics check of the uploaded Agentech code on the selected robot.</td></tr>
    <tr><td>Review Submit</td><td>Enabled only when all checks pass.</td></tr>
  </table>
</section>
"""
    return page("Agentech T3 Loader", body)


def result_html(data: dict) -> bytes:
    status = data.get("status", "UNKNOWN")
    web = data.get("web_result", {})
    controller_validation = data.get("controller_validation", {})
    translation_check = data.get("translation_check", {})
    robot_selection = data.get("robot_selection", {})
    checklist = data.get("validation_checklist", [])
    errors = data.get("errors", [])
    warnings = data.get("warnings", [])
    simulation = web.get("simulation_gif")
    error_block = ""
    if errors:
        items = "".join(
            f"<li><strong>{html.escape(err.get('code', 'ERROR'))}</strong>: {html.escape(err.get('message', ''))}<br>{html.escape(err.get('suggestion', ''))}</li>"
            for err in errors
        )
        error_block = f"<section><h2>Errors</h2><ul>{items}</ul></section>"
    warning_block = ""
    if warnings:
        items = "".join(
            f"<li><strong>{html.escape(warning.get('code', 'WARNING'))}</strong>: {html.escape(warning.get('message', ''))}<br>{html.escape(warning.get('suggestion', ''))}</li>"
            for warning in warnings
        )
        warning_block = f"<section><h2>Warnings</h2><ul>{items}</ul></section>"
    controller_rows = "".join(
        f"<tr><td>{html.escape(str(key))}</td><td>{html.escape(str(value))}</td></tr>"
        for key, value in {
            "Uploaded": controller_validation.get("uploaded", False),
            "Filename": controller_validation.get("filename") or "None",
            "Code Status": controller_validation.get("status", "NOT_UPLOADED"),
            "SDK Rule": controller_validation.get("sdk_policy", "Only Agentech SDK is allowed."),
            "Loops Allowed": controller_validation.get("loops_allowed", False),
        }.items()
    )
    motion_plan = controller_validation.get("motion_plan", [])
    motion_rows = "".join(
        "<tr>"
        f"<td>{index}</td>"
        f"<td>{html.escape(command.get('name', 'command'))}</td>"
        f"<td>{html.escape(json.dumps(command.get('params', {}), ensure_ascii=False))}</td>"
        "</tr>"
        for index, command in enumerate(motion_plan, start=1)
    )
    motion_block = (
        f"""
<section>
  <h2>Agentech Movement List</h2>
  <table>
    <tr><th>#</th><th>Command</th><th>Parameters</th></tr>
    {motion_rows}
  </table>
</section>
"""
        if motion_rows
        else ""
    )
    all_checks_passed = status == "PASS" and all(item.get("status") == "PASS" for item in checklist)
    submit_button = (
        f'<a class="button submit" href="/submit/{html.escape(web.get("result_id", ""))}">Submit for Further Review</a>'
        if all_checks_passed
        else '<span class="button disabled">Submit for Further Review</span>'
    )
    final_hint = (
        "All checks passed. This result is ready to submit for further review."
        if all_checks_passed
        else "Submission is locked until every checklist item passes."
    )
    checklist_rows = "".join(
        "<tr>"
        f"<td>{html.escape(item.get('name', 'Check'))}</td>"
        f"<td><span class=\"status {'pass' if item.get('status') == 'PASS' else 'fail'}\">{html.escape(item.get('status', 'FAIL'))}</span></td>"
        f"<td>{html.escape(item.get('detail', ''))}</td>"
        "</tr>"
        for item in checklist
    )
    robot_rows = "".join(
        f"<tr><td>{html.escape(str(key))}</td><td>{html.escape(str(value))}</td></tr>"
        for key, value in {
            "Selected Robot": robot_selection.get("name", "Unknown"),
            "Description": robot_selection.get("description", ""),
        }.items()
    )
    simulation_block = (
        f'<img class="simulation" src="{html.escape(simulation)}" alt="Animated MuJoCo simulation">'
        if simulation
        else f"""
  <div class="simulation-fail" role="img" aria-label="Simulation failed">
    <div>
      <div class="x">X</div>
      <div class="reason">Simulation blocked because validation failed.</div>
      <p class="hint">{html.escape(web.get("simulation_error", "Fix the checklist items before simulation can run."))}</p>
    </div>
  </div>
"""
    )

    body = f"""
{error_block}
{warning_block}
<section>
  <h2>Validation Checklist</h2>
  <table>
    <tr><th>Check</th><th>Status</th><th>Meaning</th></tr>
    {checklist_rows}
  </table>
</section>
<section>
  <h2>Selected Company Robot</h2>
  <table>{robot_rows}</table>
</section>
<section>
  <h2>MuJoCo Simulation Video</h2>
  <p class="hint">The app reads the uploaded Agentech commands and renders what the code does on the selected robot.</p>
  {simulation_block}
</section>
<section>
  <h2>Code Validation</h2>
  <table>{controller_rows}</table>
</section>
{motion_block}
<section>
  <h2>Final Status</h2>
  <p><span class="status {'pass' if status == 'PASS' else 'fail'}">{html.escape(status)}</span></p>
  <p class="hint">{html.escape(final_hint)}</p>
  <div class="actions">
    <a class="button secondary" href="/">Run Another Test</a>
    {submit_button}
  </div>
</section>
"""
    return page("T3 Result", body)


class Handler(BaseHTTPRequestHandler):
    def send_bytes(
        self,
        content: bytes,
        status: int = 200,
        content_type: str = "text/html; charset=utf-8",
        download_name: str | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        if download_name:
            self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/":
            self.send_bytes(index_html())
            return
        if path == "/example/robot_dog_minimal.xml":
            content = EXAMPLE_XML.read_bytes()
            self.send_bytes(content, content_type="application/xml", download_name="robot_dog_minimal.xml")
            return
        if path == "/example/agentech_zero_controller.py":
            content = EXAMPLE_CONTROLLER.read_bytes()
            self.send_bytes(content, content_type="text/x-python", download_name="agentech_zero_controller.py")
            return
        if path == "/example/success_simulation.py":
            content = EXAMPLE_MOTION_SCRIPT.read_bytes()
            self.send_bytes(content, content_type="text/x-python", download_name="success_simulation.py")
            return
        if path == "/example/bad_non_sdk_controller.py":
            content = BAD_NON_SDK_CONTROLLER.read_bytes()
            self.send_bytes(content, content_type="text/x-python", download_name="bad_non_sdk_controller.py")
            return
        if path == "/example/bad_unsafe_controller.py":
            content = BAD_CONTROLLER.read_bytes()
            self.send_bytes(content, content_type="text/x-python", download_name="bad_unsafe_controller.py")
            return
        if path.startswith("/submit/"):
            result_id = Path(path.removeprefix("/submit/")).name
            ok, message = submit_result_for_review(result_id)
            status_class = "pass" if ok else "fail"
            body = f"""
<section>
  <h2>Review Submission <span class="status {status_class}">{'SUBMITTED' if ok else 'BLOCKED'}</span></h2>
  <p class="hint">{html.escape(message)}</p>
  <div class="actions">
    <a class="button secondary" href="/">Run Another Test</a>
  </div>
</section>
"""
            self.send_bytes(page("Review Submission", body))
            return
        if path.startswith("/results/"):
            file_path = (RESULT_DIR / path.removeprefix("/results/")).resolve()
            if not str(file_path).startswith(str(RESULT_DIR.resolve())) or not file_path.exists():
                self.send_bytes(b"Not found", 404, "text/plain")
                return
            if file_path.suffix == ".png":
                self.send_bytes(file_path.read_bytes(), content_type="image/png")
            elif file_path.suffix == ".gif":
                self.send_bytes(file_path.read_bytes(), content_type="image/gif")
            elif file_path.suffix == ".json":
                self.send_bytes(file_path.read_bytes(), content_type="application/json", download_name=file_path.name)
            else:
                self.send_bytes(b"Unsupported file", 400, "text/plain")
            return
        self.send_bytes(b"Not found", 404, "text/plain")

    def do_POST(self) -> None:
        if self.path != "/upload":
            self.send_bytes(b"Not found", 404, "text/plain")
            return
        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST"})
        steps = 100
        if "steps" in form:
            try:
                steps = max(1, min(5000, int(form["steps"].value)))
            except Exception:
                steps = 100
        result_id = uuid.uuid4().hex[:12]
        upload_dir = UPLOAD_DIR / result_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        robot_key = form["robot_model"].value if "robot_model" in form else "robot_dog"

        controller_path = None
        controller_field = form["controller_file"] if "controller_file" in form else None
        if controller_field is not None and getattr(controller_field, "filename", ""):
            controller_name = Path(controller_field.filename).name
            if controller_name.lower().endswith(".py"):
                controller_path = upload_dir / controller_name
                with controller_path.open("wb") as handle:
                    shutil.copyfileobj(controller_field.file, handle)
            else:
                controller_path = upload_dir / "invalid_controller_extension.txt"
                controller_path.write_text(
                    "Controller upload rejected because it is not a .py file.",
                    encoding="utf-8",
                )

        prepared_xml_path, robot_info, robot_errors = prepare_company_xml(robot_key, upload_dir)
        if robot_errors or prepared_xml_path is None:
            result_dir = RESULT_DIR / result_id
            result_dir.mkdir(parents=True, exist_ok=True)
            data = {
                "status": "FAIL",
                "errors": robot_errors,
                "model_info": {},
                "timing": {"steps_requested": steps},
                "final_state": {},
                "controller_validation": {
                    "uploaded": controller_path is not None,
                    "filename": controller_path.name if controller_path else None,
                    "status": "NOT_RUN",
                    "sdk_policy": "Only import agentech / from agentech import ... is allowed.",
                    "loops_allowed": False,
                },
                "robot_selection": robot_info,
                "web_result": {
                    "result_id": result_id,
                    "output_json": f"/results/{result_id}/simulation_output.json",
                    "snapshot_png": None,
                    "snapshot_error": "Robot XML was not available.",
                    "simulation_gif": None,
                    "simulation_error": "Robot XML was not available.",
                },
            }
            data["validation_checklist"] = build_validation_checklist(data)
            (result_dir / "simulation_output.json").write_text(
                json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
            )
        else:
            data = run_validation(
                prepared_xml_path,
                result_id,
                steps,
                controller_path=controller_path,
                robot_info=robot_info,
            )
        self.send_bytes(result_html(data))


def main() -> int:
    port = int(os.environ.get("AGENTECH_T3_PORT", "8765"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Agentech T3 web app running at http://127.0.0.1:{port}")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
