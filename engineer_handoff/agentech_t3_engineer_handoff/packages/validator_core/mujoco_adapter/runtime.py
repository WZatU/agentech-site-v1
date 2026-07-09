from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from .errors import (
    MuJoCoRuntimeError,
    RuntimeErrorRecord,
    invalid_control_shape_error,
    load_failed_error,
    nan_state_error,
    not_installed_error,
    step_failed_error,
    xml_not_found_error,
)
from .types import RuntimeConfig


AEGIS_LEG_JOINTS = [
    "FL_ABAD_JOINT",
    "FL_HIP_JOINT",
    "FL_KNEE_JOINT",
    "FR_ABAD_JOINT",
    "FR_HIP_JOINT",
    "FR_KNEE_JOINT",
    "RR_ABAD_JOINT",
    "RR_HIP_JOINT",
    "RR_KNEE_JOINT",
    "RL_ABAD_JOINT",
    "RL_HIP_JOINT",
    "RL_KNEE_JOINT",
]


def load_mujoco_model(mujoco_module, model_path: Path):
    """Load MJCF normally and the Aegis URDF with the prior controlled dog scene."""
    model_path = Path(model_path)
    if model_path.suffix.lower() != ".urdf":
        return mujoco_module.MjModel.from_xml_path(str(model_path))

    spec = mujoco_module.MjSpec.from_file(str(model_path))
    spec.visual.global_.offwidth = 1280
    spec.visual.global_.offheight = 720
    spec.option.timestep = 0.002
    spec.option.gravity = [0.0, 0.0, -9.81]

    base = spec.body("BASE_LINK")
    if base is None:
        raise ValueError("Missing BASE_LINK body in Aegis URDF")
    base.add_freejoint(name="floating_base_joint")

    for joint_name in AEGIS_LEG_JOINTS:
        if spec.joint(joint_name) is None:
            continue
        spec.add_actuator(
            name=joint_name.replace("_JOINT", "_MOTOR"),
            trntype=mujoco_module.mjtTrn.mjTRN_JOINT,
            target=joint_name,
            gear=[1, 0, 0, 0, 0, 0],
            ctrllimited=True,
            ctrlrange=[-2.0, 2.0],
            forcelimited=True,
            forcerange=[-25.0, 25.0],
        )

    world = spec.worldbody
    world.add_geom(
        name="floor",
        type=mujoco_module.mjtGeom.mjGEOM_PLANE,
        size=[0, 0, 0.05],
        rgba=[0.06, 0.07, 0.08, 1],
    )
    world.add_geom(
        name="runway",
        type=mujoco_module.mjtGeom.mjGEOM_BOX,
        pos=[0.05, 0, 0.002],
        size=[0.62, 0.24, 0.002],
        rgba=[0.10, 0.13, 0.16, 1],
    )
    world.add_light(pos=[0, -1.1, 2.4], dir=[0, 0.35, -1], diffuse=[1.0, 1.0, 1.0])
    world.add_light(pos=[-1.0, 0.8, 1.5], dir=[0.4, -0.3, -1], diffuse=[0.5, 0.55, 0.65])
    world.add_camera(
        name="demo_camera",
        pos=[1.35, -1.05, 0.42],
        xyaxes=[0.9, 0.44, 0, -0.12, 0.24, 0.96],
    )

    model = spec.compile()
    style_aegis_model(mujoco_module, model)
    return model


def style_aegis_model(mujoco_module, model) -> None:
    body_shell = np.array([0.92, 0.95, 1.00, 1.0], dtype=np.float32)
    hip_shell = np.array([1.00, 0.52, 0.12, 1.0], dtype=np.float32)
    leg_shell = np.array([0.18, 0.22, 0.28, 1.0], dtype=np.float32)
    foot_shell = np.array([0.05, 0.06, 0.07, 1.0], dtype=np.float32)

    for geom_id in range(model.ngeom):
        name = mujoco_module.mj_id2name(model, mujoco_module.mjtObj.mjOBJ_GEOM, geom_id)
        if name in {"floor", "runway", "start_pad", "goal_pad"}:
            continue
        if model.geom_group[geom_id] == 0:
            model.geom_rgba[geom_id] = [0.0, 0.0, 0.0, 0.0]
            continue
        body_name = mujoco_module.mj_id2name(
            model, mujoco_module.mjtObj.mjOBJ_BODY, int(model.geom_bodyid[geom_id])
        ) or ""
        if body_name == "BASE_LINK":
            model.geom_rgba[geom_id] = body_shell
        elif "ABAD" in body_name or "HIP" in body_name:
            model.geom_rgba[geom_id] = hip_shell
        elif "FOOT" in body_name:
            model.geom_rgba[geom_id] = foot_shell
        else:
            model.geom_rgba[geom_id] = leg_shell


class MuJoCoRuntime:
    """Shared MuJoCo access layer for T4, T5, and T6.

    This class intentionally keeps benchmark logic out. It only loads, steps,
    reads state, applies controls, and exports raw simulation data.
    """

    def __init__(self, config: RuntimeConfig):
        self.config = config
        self.xml_path = Path(config.xml_path)
        self.mujoco = None
        self.model = None
        self.data = None
        self.errors: list[RuntimeErrorRecord] = []
        self.samples: list[dict[str, Any]] = []

    def load(self) -> bool:
        if not self.xml_path.exists():
            self.errors.append(xml_not_found_error(str(self.xml_path)))
            return False

        try:
            import mujoco  # type: ignore
        except Exception as exc:
            self.errors.append(not_installed_error(exc))
            return False

        try:
            self.mujoco = mujoco
            self.model = load_mujoco_model(mujoco, self.xml_path)
            self.data = mujoco.MjData(self.model)
            return True
        except Exception as exc:
            self.errors.append(load_failed_error(str(self.xml_path), exc))
            return False

    def require_loaded(self) -> None:
        if self.mujoco is None or self.model is None or self.data is None:
            raise MuJoCoRuntimeError(
                RuntimeErrorRecord(
                    code="MUJOCO_RUNTIME_NOT_LOADED",
                    message="Runtime is not loaded.",
                    suggestion="Call runtime.load() before reset(), step(), or read methods.",
                )
            )

    def reset(self) -> None:
        self.require_loaded()
        self.mujoco.mj_resetData(self.model, self.data)
        self.mujoco.mj_forward(self.model, self.data)
        self.samples.clear()

    def step(self, n_steps: int = 1, sample: bool = True) -> bool:
        self.require_loaded()
        try:
            for index in range(n_steps):
                self.mujoco.mj_step(self.model, self.data)
                if self.config.fail_on_nan and self.has_invalid_state():
                    self.errors.append(nan_state_error())
                    return False
                if sample and index % max(1, self.config.sample_every) == 0:
                    self.samples.append(self.export_snapshot())
            return True
        except Exception as exc:
            self.errors.append(step_failed_error(exc))
            return False

    def set_controls(self, controls: Iterable[float]) -> bool:
        self.require_loaded()
        values = np.asarray(list(controls), dtype=float)
        expected = int(self.model.nu)
        if len(values) != expected:
            self.errors.append(invalid_control_shape_error(expected=expected, actual=len(values)))
            return False
        self.data.ctrl[:] = values
        return True

    def zero_controls(self) -> None:
        self.require_loaded()
        if self.model.nu:
            self.data.ctrl[:] = np.zeros(self.model.nu)

    def model_info(self) -> dict[str, Any]:
        self.require_loaded()
        return {
            "joint_count": int(self.model.njnt),
            "actuator_count": int(self.model.nu),
            "body_count": int(self.model.nbody),
            "sensor_count": int(self.model.nsensor),
            "geom_count": int(self.model.ngeom),
            "qpos_size": int(self.model.nq),
            "qvel_size": int(self.model.nv),
            "timestep": float(self.model.opt.timestep),
            "joints": self.names("joint", self.model.njnt),
            "actuators": self.names("actuator", self.model.nu),
            "bodies": self.names("body", self.model.nbody),
            "sensors": self.names("sensor", self.model.nsensor),
        }

    def names(self, object_type: str, count: int) -> list[str]:
        self.require_loaded()
        type_map = {
            "body": self.mujoco.mjtObj.mjOBJ_BODY,
            "joint": self.mujoco.mjtObj.mjOBJ_JOINT,
            "actuator": self.mujoco.mjtObj.mjOBJ_ACTUATOR,
            "sensor": self.mujoco.mjtObj.mjOBJ_SENSOR,
            "geom": self.mujoco.mjtObj.mjOBJ_GEOM,
        }
        mj_type = type_map[object_type]
        names: list[str] = []
        for item_id in range(count):
            name = self.mujoco.mj_id2name(self.model, mj_type, item_id)
            names.append(name or f"{object_type}_{item_id}")
        return names

    def read_joint_state(self) -> dict[str, Any]:
        self.require_loaded()
        return {
            "qpos": self.data.qpos.copy().tolist(),
            "qvel": self.data.qvel.copy().tolist(),
            "qacc": self.data.qacc.copy().tolist(),
            "ctrl": self.data.ctrl.copy().tolist() if self.model.nu else [],
        }

    def read_body_state(self) -> list[dict[str, Any]]:
        self.require_loaded()
        bodies = []
        names = self.names("body", self.model.nbody)
        for body_id, name in enumerate(names):
            bodies.append(
                {
                    "id": body_id,
                    "name": name,
                    "xpos": self.data.xpos[body_id].copy().tolist(),
                    "xquat": self.data.xquat[body_id].copy().tolist(),
                }
            )
        return bodies

    def read_sensor_data(self) -> dict[str, Any]:
        self.require_loaded()
        return {
            "sensor_names": self.names("sensor", self.model.nsensor),
            "sensordata": self.data.sensordata.copy().tolist() if self.model.nsensor else [],
        }

    def read_contacts(self) -> list[dict[str, Any]]:
        self.require_loaded()
        contacts = []
        geom_names = self.names("geom", self.model.ngeom)
        for contact_id in range(int(self.data.ncon)):
            contact = self.data.contact[contact_id]
            geom1 = int(contact.geom1)
            geom2 = int(contact.geom2)
            contacts.append(
                {
                    "id": contact_id,
                    "geom1": geom_names[geom1] if 0 <= geom1 < len(geom_names) else str(geom1),
                    "geom2": geom_names[geom2] if 0 <= geom2 < len(geom_names) else str(geom2),
                    "distance": float(contact.dist),
                    "position": contact.pos.copy().tolist(),
                }
            )
        return contacts

    def has_invalid_state(self) -> bool:
        self.require_loaded()
        arrays = [self.data.qpos, self.data.qvel, self.data.qacc]
        if self.model.nu:
            arrays.append(self.data.ctrl)
        return any(not np.all(np.isfinite(array)) for array in arrays)

    def export_snapshot(self) -> dict[str, Any]:
        self.require_loaded()
        return {
            "time": float(self.data.time),
            "joint_state": self.read_joint_state(),
            "contacts": self.read_contacts(),
        }

    def export_simulation_output(self, status: str | None = None) -> dict[str, Any]:
        loaded = self.model is not None and self.data is not None
        final_status = status or ("FAIL" if self.errors else "PASS")
        output: dict[str, Any] = {
            "status": final_status,
            "xml_path": str(self.xml_path),
            "errors": [error.to_dict() for error in self.errors],
        }

        if loaded:
            output.update(
                {
                    "model_info": self.model_info(),
                    "timing": {
                        "steps_requested": int(self.config.steps),
                        "timestep": float(self.model.opt.timestep),
                        "sim_time": float(self.data.time),
                    },
                    "final_state": self.read_joint_state(),
                    "body_state": self.read_body_state(),
                    "sensor_data": self.read_sensor_data(),
                    "contacts": self.read_contacts(),
                    "samples": self.samples,
                }
            )
        return output

    def write_simulation_output(self, output_path: str | None = None) -> Path:
        path = Path(output_path or self.config.output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = self.export_simulation_output()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return path
