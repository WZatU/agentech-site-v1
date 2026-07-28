"""Orientation and frame transforms using MuJoCo's wxyz quaternion order."""

from __future__ import annotations

import math
from typing import Iterable

import numpy as np


def wrap_angle(angle_rad: float) -> float:
    """Wrap an angle to the deterministic ``[-pi, pi)`` interval."""

    return (float(angle_rad) + math.pi) % (2.0 * math.pi) - math.pi


def angle_difference(target_rad: float, current_rad: float) -> float:
    """Shortest signed target-current difference."""

    return wrap_angle(float(target_rad) - float(current_rad))


def quaternion_to_euler(quaternion_wxyz: Iterable[float]) -> tuple[float, float, float]:
    """Return roll, pitch, yaw for a MuJoCo-order (w, x, y, z) quaternion."""

    w, x, y, z = (float(value) for value in quaternion_wxyz)
    norm = math.sqrt(w * w + x * x + y * y + z * z)
    if norm == 0.0 or not math.isfinite(norm):
        return math.nan, math.nan, math.nan
    w, x, y, z = w / norm, x / norm, y / norm, z / norm
    sin_roll = 2.0 * (w * x + y * z)
    cos_roll = 1.0 - 2.0 * (x * x + y * y)
    roll = math.atan2(sin_roll, cos_roll)
    sin_pitch = 2.0 * (w * y - z * x)
    pitch = math.asin(max(-1.0, min(1.0, sin_pitch)))
    sin_yaw = 2.0 * (w * z + x * y)
    cos_yaw = 1.0 - 2.0 * (y * y + z * z)
    yaw = math.atan2(sin_yaw, cos_yaw)
    return roll, pitch, yaw


def body_to_world(vector_body: Iterable[float], yaw_rad: float) -> np.ndarray:
    vector = np.asarray(tuple(vector_body), dtype=float)
    if vector.shape not in {(2,), (3,)}:
        raise ValueError("body_to_world expects a 2D or 3D vector")
    cosine, sine = math.cos(yaw_rad), math.sin(yaw_rad)
    result = vector.copy()
    result[0] = cosine * vector[0] - sine * vector[1]
    result[1] = sine * vector[0] + cosine * vector[1]
    return result


def world_to_body(vector_world: Iterable[float], yaw_rad: float) -> np.ndarray:
    vector = np.asarray(tuple(vector_world), dtype=float)
    if vector.shape not in {(2,), (3,)}:
        raise ValueError("world_to_body expects a 2D or 3D vector")
    cosine, sine = math.cos(yaw_rad), math.sin(yaw_rad)
    result = vector.copy()
    result[0] = cosine * vector[0] + sine * vector[1]
    result[1] = -sine * vector[0] + cosine * vector[1]
    return result
