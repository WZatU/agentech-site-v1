"""Shared HTTP boundary for robot-specific MuJoCo preview runtimes."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AliasChoices, BaseModel, Field


SIMULATORS_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class RobotRuntime:
    directory: str
    timeout_seconds: int

    @property
    def root(self) -> Path:
        return SIMULATORS_ROOT / self.directory

    @property
    def adapter(self) -> Path:
        return self.root / "web_adapter.py"


ROBOT_RUNTIMES = {
    "Aegies": RobotRuntime(directory="aegis", timeout_seconds=20),
    "Navi": RobotRuntime(directory="navi", timeout_seconds=50),
}


class SimulationRequest(BaseModel):
    code: str = Field(default="")
    robot_model: str = Field(
        default="Aegies",
        validation_alias=AliasChoices("robot_model", "robotModel", "model"),
    )
    max_render_frames: int = Field(default=32, ge=1, le=48)
    render_width: int = Field(default=480, ge=240, le=960)
    render_height: int = Field(default=320, ge=180, le=720)


app = FastAPI(title="Agentech MuJoCo Simulator", version="2.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "AGENTECH_SIMULATOR_ALLOWED_ORIGINS",
        "http://localhost:3000,https://www.agent-tech.ai,https://agent-tech.ai",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _normalized_model(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"aegis", "aegies"}:
        return "Aegies"
    if normalized == "navi":
        return "Navi"
    raise HTTPException(status_code=400, detail="Choose Aegies or Navi.")


def _run_runtime(model: str, request: SimulationRequest) -> dict[str, Any]:
    runtime = ROBOT_RUNTIMES[model]
    if not runtime.adapter.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"{model} simulator runtime is unavailable.",
        )

    payload = {
        "code": request.code,
        "robot_model": model,
        "max_render_frames": request.max_render_frames,
        "render_width": request.render_width,
        "render_height": request.render_height,
    }
    try:
        result = subprocess.run(
            [sys.executable, str(runtime.adapter)],
            cwd=runtime.root,
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            timeout=runtime.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail=f"{model} simulation timed out.",
        ) from exc

    try:
        response = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        detail = result.stderr.strip() or f"{model} simulator returned invalid output."
        raise HTTPException(status_code=500, detail=detail) from exc

    if result.returncode != 0:
        status = 400 if result.returncode == 2 else 500
        raise HTTPException(
            status_code=status,
            detail=response.get("error") or f"{model} simulation failed.",
        )
    return response


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "agentech-mujoco-simulator",
        "models": list(ROBOT_RUNTIMES),
        "runtime_layout": "simulators/<robot>/web_adapter.py",
        "navi_translator_version": "1.0.0",
    }


@app.post("/simulate")
def simulate(request: SimulationRequest) -> dict[str, Any]:
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No Agentech code provided.")
    model = _normalized_model(request.robot_model)
    try:
        return _run_runtime(model, request)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc
