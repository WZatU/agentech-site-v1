"""Audit the source Navi URDF and validate the compiled MuJoCo model."""

from __future__ import annotations

import ast
import json
import math
import struct
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

import mujoco
import numpy as np

from controller import TrotGaitController
from model_config import (
    BODY_HEIGHT,
    EFFORT_LIMITS,
    FOOT_RADIUS,
    JOINT_LIMITS,
    JOINT_ORDER,
    STANDING_JOINT_TARGETS,
)
from simulation import (
    FOOT_GEOM_NAMES,
    MODEL_PATH,
    PROJECT_ROOT,
    foot_contact_state,
    keyframe_id,
    load_model,
    reset_to_keyframe,
    run_headless,
)


RESULTS_DIRECTORY = PROJECT_ROOT / "results"
JSON_REPORT = RESULTS_DIRECTORY / "model_validation.json"
MARKDOWN_REPORT = RESULTS_DIRECTORY / "model_validation.md"
RUNTIME_FILES = (
    PROJECT_ROOT / "controller.py",
    PROJECT_ROOT / "demo.py",
    PROJECT_ROOT / "simulation.py",
)


def _vector(text: str) -> list[float]:
    return [float(value) for value in text.split()]


def _inertia_matrix(attributes: dict[str, str]) -> np.ndarray:
    return np.array(
        [
            [float(attributes["ixx"]), float(attributes["ixy"]), float(attributes["ixz"])],
            [float(attributes["ixy"]), float(attributes["iyy"]), float(attributes["iyz"])],
            [float(attributes["ixz"]), float(attributes["iyz"]), float(attributes["izz"])],
        ]
    )


def _binary_stl_bounds(path: Path) -> dict[str, object]:
    raw = path.read_bytes()
    triangle_count = struct.unpack_from("<I", raw, 80)[0]
    if len(raw) != 84 + triangle_count * 50:
        raise ValueError(f"Expected binary STL: {path}")
    vertices = []
    for index in range(triangle_count):
        values = struct.unpack_from("<12f", raw, 84 + 50 * index)
        vertices.extend((values[3:6], values[6:9], values[9:12]))
    array = np.asarray(vertices, dtype=float)
    minimum = array.min(axis=0)
    maximum = array.max(axis=0)
    return {
        "triangles": triangle_count,
        "minimum": minimum.tolist(),
        "maximum": maximum.tolist(),
        "size": (maximum - minimum).tolist(),
    }


def audit_source_urdf() -> dict[str, object]:
    urdf_path = PROJECT_ROOT / "urdf" / "navi.urdf"
    root = ET.parse(urdf_path).getroot()
    links: dict[str, dict[str, object]] = {}
    invalid_inertias = []
    negative_mesh_scales = []
    mesh_collisions = []

    for link in root.findall("link"):
        name = str(link.get("name"))
        inertial = link.find("inertial")
        link_record: dict[str, object] = {"name": name}
        if inertial is not None:
            mass = float(inertial.find("mass").get("value"))
            matrix = _inertia_matrix(inertial.find("inertia").attrib)
            eigenvalues = np.linalg.eigvalsh(matrix)
            diagonal = np.diag(matrix)
            triangle_ok = bool(
                diagonal[0] + diagonal[1] >= diagonal[2]
                and diagonal[0] + diagonal[2] >= diagonal[1]
                and diagonal[1] + diagonal[2] >= diagonal[0]
            )
            positive_definite = bool(np.all(eigenvalues > 0.0))
            link_record.update(
                {
                    "mass": mass,
                    "com": _vector(inertial.find("origin").get("xyz")),
                    "inertia_matrix": matrix.tolist(),
                    "inertia_eigenvalues": eigenvalues.tolist(),
                    "positive_definite": positive_definite,
                    "triangle_inequalities": triangle_ok,
                }
            )
            if not positive_definite or not triangle_ok:
                invalid_inertias.append(
                    {
                        "link": name,
                        "eigenvalues": eigenvalues.tolist(),
                        "positive_definite": positive_definite,
                        "triangle_inequalities": triangle_ok,
                    }
                )
        for mesh in link.findall("visual/geometry/mesh"):
            scale = _vector(mesh.get("scale", "1 1 1"))
            if any(value < 0.0 for value in scale):
                negative_mesh_scales.append(
                    {"link": name, "filename": mesh.get("filename"), "scale": scale}
                )
        for mesh in link.findall("collision/geometry/mesh"):
            mesh_collisions.append({"link": name, "filename": mesh.get("filename")})
        links[name] = link_record

    joints = []
    joint_lookup = {}
    for joint in root.findall("joint"):
        limit_element = joint.find("limit")
        record = {
            "name": joint.get("name"),
            "type": joint.get("type"),
            "parent": joint.find("parent").get("link"),
            "child": joint.find("child").get("link"),
            "origin_xyz": _vector(joint.find("origin").get("xyz")),
            "origin_rpy": _vector(joint.find("origin").get("rpy")),
            "axis": _vector(joint.find("axis").get("xyz")),
            "limit": None
            if limit_element is None
            else {key: float(value) for key, value in limit_element.attrib.items()},
        }
        joints.append(record)
        joint_lookup[record["name"]] = record

    controlled_joints = [joint_lookup[name] for name in JOINT_ORDER]
    body_collision = root.find("link[@name='body']/collision/geometry/box")
    stl_bounds = {
        path.name: _binary_stl_bounds(path)
        for path in sorted((PROJECT_ROOT / "meshes").glob("*_link.STL"))
        if "mirror" not in path.name
    }
    axes_by_kind = {
        kind: sorted({tuple(joint_lookup[f"{leg}_{kind}_joint"]["axis"]) for leg in (
            "front_left", "front_right", "hind_left", "hind_right"
        )})
        for kind in ("abad", "hip", "knee")
    }
    total_mass = sum(float(record.get("mass", 0.0)) for record in links.values())
    return {
        "urdf_path": str(urdf_path),
        "controlled_joint_order": list(JOINT_ORDER),
        "controlled_joints": controlled_joints,
        "all_joints": joints,
        "links": links,
        "total_mass": total_mass,
        "body_collision_size": _vector(body_collision.get("size")),
        "body_visual_stl_size": stl_bounds["base_link.STL"]["size"],
        "leg_geometry": {
            "front_hind_mount_x": [0.176, -0.176],
            "abad_mount_y": [0.0525, -0.0525],
            "hip_outward_offset": 0.077,
            "left_right_hip_joint_separation": 2.0 * (0.0525 + 0.077),
            "upper_leg_length": 0.15,
            "lower_leg_length": 0.15,
            "foot_radius": FOOT_RADIUS,
        },
        "axes_by_joint_kind": axes_by_kind,
        "invalid_inertias": invalid_inertias,
        "negative_mesh_scales": negative_mesh_scales,
        "mesh_collision_links": mesh_collisions,
        "stl_bounds": stl_bounds,
        "simulation_approximations": {
            "hip_diagonal_inertia": [0.001954009163, 0.002178598212, 0.000345729243],
            "basis": "box-equivalent inertia from hip STL axis-aligned bounds and URDF mass",
            "collision": "visual STL replaced by body box, limb cylinders/capsules, and foot spheres",
            "mirrored_visuals": "negative URDF mesh scales baked into derived STL copies with corrected winding",
        },
    }


def scan_root_injection(paths: tuple[Path, ...] = RUNTIME_FILES) -> list[dict[str, object]]:
    """Return any runtime assignment to qpos/qvel or banned assist helper."""

    violations: list[dict[str, object]] = []
    banned_symbols = ("velocity_assist", "apply_velocity_assist", "set_rpy")
    for path in paths:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
        for node in ast.walk(tree):
            targets = []
            if isinstance(node, (ast.Assign, ast.AnnAssign)):
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            elif isinstance(node, ast.AugAssign):
                targets = [node.target]
            for target in targets:
                if (
                    isinstance(target, ast.Subscript)
                    and isinstance(target.value, ast.Attribute)
                    and target.value.attr in {"qpos", "qvel"}
                ):
                    violations.append(
                        {
                            "file": str(path),
                            "line": node.lineno,
                            "reason": f"assignment to {target.value.attr}",
                        }
                    )
        for symbol in banned_symbols:
            for node in ast.walk(tree):
                if isinstance(node, (ast.Name, ast.Attribute)) and getattr(
                    node, "id", getattr(node, "attr", None)
                ) == symbol:
                    violations.append(
                        {"file": str(path), "line": node.lineno, "reason": f"banned symbol {symbol}"}
                    )
    return violations


def dynamic_root_injection_audit(model: mujoco.MjModel) -> dict[str, object]:
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data)
    controller = TrotGaitController(model)
    maximum_qpos_change = 0.0
    maximum_qvel_change = 0.0
    for command in ("forward", "strafe_left", "turn_left"):
        controller.set_command(command)
        for _ in range(250):
            root_position_before = data.qpos[0:7].copy()
            root_velocity_before = data.qvel[0:6].copy()
            controller.apply(data)
            maximum_qpos_change = max(
                maximum_qpos_change,
                float(np.max(np.abs(data.qpos[0:7] - root_position_before))),
            )
            maximum_qvel_change = max(
                maximum_qvel_change,
                float(np.max(np.abs(data.qvel[0:6] - root_velocity_before))),
            )
            mujoco.mj_step(model, data)
    return {
        "controller_apply_max_root_qpos_change": maximum_qpos_change,
        "controller_apply_max_root_qvel_change": maximum_qvel_change,
    }


def validate() -> dict[str, object]:
    checks: list[dict[str, object]] = []

    def add(number: int, name: str, status: str, value: object, details: str = "") -> None:
        checks.append(
            {"id": number, "name": name, "status": status, "value": value, "details": details}
        )

    source_audit = audit_source_urdf()
    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data)
    add(1, "scene.xml load", "PASS", str(MODEL_PATH), "MjModel.from_xml_path succeeded")
    add(2, "nq", "PASS" if model.nq == 19 else "FAIL", model.nq, "expected 19")
    add(3, "nv", "PASS" if model.nv == 18 else "FAIL", model.nv, "expected 18")
    add(4, "nu", "PASS" if model.nu == 12 else "FAIL", model.nu, "expected 12")
    add(5, "joint count", "PASS" if model.njnt == 13 else "FAIL", model.njnt, "1 free + 12 hinge")
    add(6, "actuator count", "PASS" if model.nu == 12 else "FAIL", model.nu)
    add(7, "sensor count", "PASS" if model.nsensor >= 42 else "FAIL", model.nsensor, "expected at least 42")

    controller = TrotGaitController(model)
    mapped_names = [mapping.name for mapping in controller.mappings]
    add(8, "12-joint mapping", "PASS" if mapped_names == JOINT_ORDER else "FAIL", mapped_names)
    transmissions = []
    actuator_mapping_ok = True
    for mapping in controller.mappings:
        transmitted_joint_id = int(model.actuator_trnid[mapping.actuator_id, 0])
        transmitted_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, transmitted_joint_id)
        transmissions.append({"actuator_id": mapping.actuator_id, "joint": transmitted_name})
        actuator_mapping_ok &= transmitted_joint_id == mapping.joint_id
    add(9, "actuator transmissions", "PASS" if actuator_mapping_ok else "FAIL", transmissions)

    ranges_ok = True
    range_values = {}
    for mapping in controller.mappings:
        actual = model.jnt_range[mapping.joint_id].astype(float)
        expected = np.asarray(JOINT_LIMITS[mapping.name])
        ranges_ok &= bool(actual[0] < actual[1] and np.allclose(actual, expected, atol=1e-9))
        range_values[mapping.name] = actual.tolist()
    add(10, "joint ranges", "PASS" if ranges_ok else "FAIL", range_values)

    control_ranges_ok = True
    control_values = {}
    for mapping in controller.mappings:
        actual = model.actuator_ctrlrange[mapping.actuator_id].astype(float)
        effort = EFFORT_LIMITS[mapping.name]
        control_ranges_ok &= bool(actual[0] >= -effort and actual[1] <= effort)
        control_values[f"{mapping.name}_motor"] = actual.tolist()
    add(11, "actuator ctrlrange", "PASS" if control_ranges_ok else "FAIL", control_values)

    inertia_values = model.body_inertia[1:].astype(float)
    inertia_positive = bool(np.all(inertia_values > 0.0))
    inertia_triangle = bool(
        np.all(inertia_values[:, 0] + inertia_values[:, 1] >= inertia_values[:, 2])
        and np.all(inertia_values[:, 0] + inertia_values[:, 2] >= inertia_values[:, 1])
        and np.all(inertia_values[:, 1] + inertia_values[:, 2] >= inertia_values[:, 0])
    )
    add(
        12,
        "compiled inertia validity",
        "PASS" if inertia_positive and inertia_triangle else "FAIL",
        {
            "minimum_principal_inertia": float(inertia_values.min()),
            "source_invalid_links": [item["link"] for item in source_audit["invalid_inertias"]],
        },
        "source hip inertias replaced by documented simulation approximations",
    )

    standing_key = keyframe_id(model, "standing")
    standing_qpos = model.key_qpos[standing_key]
    initial_limits_ok = True
    initial_joint_values = {}
    for mapping, target in zip(controller.mappings, STANDING_JOINT_TARGETS):
        actual = float(standing_qpos[mapping.qpos_address])
        lower, upper = JOINT_LIMITS[mapping.name]
        initial_limits_ok &= lower <= actual <= upper and math.isclose(actual, float(target), abs_tol=1e-9)
        initial_joint_values[mapping.name] = actual
    add(13, "standing keyframe within limits", "PASS" if initial_limits_ok else "FAIL", initial_joint_values)

    foot_bottoms = {}
    for geom_name in FOOT_GEOM_NAMES:
        geom_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, geom_name)
        foot_bottoms[geom_name] = float(data.geom_xpos[geom_id, 2] - model.geom_size[geom_id, 0])
    feet_near_ground = all(abs(value) <= 0.0025 for value in foot_bottoms.values())
    add(14, "initial feet near ground", "PASS" if feet_near_ground else "FAIL", foot_bottoms, "sphere bottom z")

    body_geom_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, "body_collision")
    body_bottom = float(data.geom_xpos[body_geom_id, 2] - model.geom_size[body_geom_id, 2])
    add(15, "body ground penetration", "PASS" if body_bottom > 0.0 else "FAIL", body_bottom, "body collision bottom z")

    root_joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "root")
    root_actuators = [
        actuator_id
        for actuator_id in range(model.nu)
        if int(model.actuator_trnid[actuator_id, 0]) == root_joint_id
    ]
    add(16, "root actuator", "PASS" if not root_actuators else "FAIL", root_actuators)

    static_violations = scan_root_injection()
    dynamic_audit = dynamic_root_injection_audit(model)
    root_injection_ok = (
        not static_violations
        and dynamic_audit["controller_apply_max_root_qpos_change"] == 0.0
        and dynamic_audit["controller_apply_max_root_qvel_change"] == 0.0
    )
    add(
        17,
        "root qpos/qvel injection",
        "PASS" if root_injection_ok else "FAIL",
        {"static_violations": static_violations, **dynamic_audit},
    )

    _, _, _, standing_metrics = run_headless("stand", duration=5.0, settle_time=0.5)
    add(18, "5-second finite simulation", "PASS" if standing_metrics["finite"] else "FAIL", standing_metrics["finite"])
    upright = (
        standing_metrics["final_height"] > 0.20
        and standing_metrics["max_abs_roll"] < 0.20
        and standing_metrics["max_abs_pitch"] < 0.20
        and all(standing_metrics["final_contacts"].values())
    )
    add(
        19,
        "5-second standing stability",
        "PASS" if upright else "FAIL",
        {
            "final_height": standing_metrics["final_height"],
            "max_abs_roll": standing_metrics["max_abs_roll"],
            "max_abs_pitch": standing_metrics["max_abs_pitch"],
            "final_contacts": standing_metrics["final_contacts"],
        },
    )
    drift = float(np.linalg.norm(standing_metrics["xy_displacement"]))
    add(20, "standing horizontal drift", "PASS" if drift < 0.03 else "WARN", drift, "5-second threshold 0.03 m")

    summary = {
        "nq": model.nq,
        "nv": model.nv,
        "nu": model.nu,
        "number_of_joints": model.njnt,
        "number_of_actuators": model.nu,
        "number_of_sensors": model.nsensor,
        "standing_keyframe_height": float(standing_qpos[2]),
        "standing_height_after_5s": standing_metrics["final_height"],
        "total_mass": float(model.body_mass.sum()),
    }
    counts = Counter(check["status"] for check in checks)
    return {
        "model_summary": summary,
        "status_summary": dict(counts),
        "checks": checks,
        "standing_metrics": standing_metrics,
        "source_audit": source_audit,
        "verification_scope": {
            "headless_verified": True,
            "viewer_manually_verified": False,
        },
    }


def write_reports(report: dict[str, object]) -> None:
    RESULTS_DIRECTORY.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = report["model_summary"]
    audit = report["source_audit"]
    lines = [
        "# Navi MuJoCo Model Validation",
        "",
        "## Model summary",
        "",
        f"- nq: `{summary['nq']}`",
        f"- nv: `{summary['nv']}`",
        f"- nu: `{summary['nu']}`",
        f"- joints: `{summary['number_of_joints']}` (1 free + 12 driven)",
        f"- actuators: `{summary['number_of_actuators']}`",
        f"- sensors: `{summary['number_of_sensors']}`",
        f"- standing keyframe height: `{summary['standing_keyframe_height']:.6f} m`",
        f"- standing height after 5 s: `{summary['standing_height_after_5s']:.6f} m`",
        f"- total mass: `{summary['total_mass']:.9f} kg`",
        "",
        "## Checks",
        "",
        "| # | Check | Status | Actual value |",
        "|---:|---|:---:|---|",
    ]
    for check in report["checks"]:
        value = json.dumps(check["value"], ensure_ascii=False, separators=(",", ":"))
        lines.append(f"| {check['id']} | {check['name']} | {check['status']} | `{value}` |")
    lines.extend(
        [
            "",
            "## Source URDF audit",
            "",
            f"- Invalid inertia links: `{[item['link'] for item in audit['invalid_inertias']]}`.",
            f"- Negative visual mesh scales: `{len(audit['negative_mesh_scales'])}` entries.",
            f"- Mesh collision links: `{[item['link'] for item in audit['mesh_collision_links']]}`.",
            "- Hip inertia repair: box-equivalent positive diagonal inertia from STL bounds and original URDF mass; simulation approximation.",
            "- Collision repair: visual STL is non-colliding; stable primitive geoms handle all contact.",
            "- Mirror repair: negative scales were baked into derived visual STL copies with corrected triangle winding.",
            "",
            "## Verification scope",
            "",
            "- headless verified",
            "- viewer not manually verified",
        ]
    )
    MARKDOWN_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    report = validate()
    write_reports(report)
    for check in report["checks"]:
        print(f"[{check['status']}] {check['id']:02d} {check['name']}: {check['value']}")
    print(f"JSON report: {JSON_REPORT}")
    print(f"Markdown report: {MARKDOWN_REPORT}")
    return 1 if any(check["status"] == "FAIL" for check in report["checks"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
