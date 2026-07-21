"""Trusted local Navi executor. It accepts inert JSON, never customer Python."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sdk_root = os.environ.get("AGENTECH_SDK_ROOT", "").strip()
if sdk_root:
    sys.path.insert(0, sdk_root)

from navi_gateway_spec import validate_navi_command  # noqa: E402

MAX_COMMANDS = 200
RECOVERABLE_TURN_COMMANDS = frozenset({"turn", "turn_left", "turn_right", "u_turn"})
TURN_TIMEOUT_PREFIX = "Navi yaw-feedback turn timed out at "


def configure_navi():
    from agentech import Agentech

    host = os.environ.get("AGENTECH_NAVI_HOST", "192.168.4.65").strip()
    port = int(os.environ.get("AGENTECH_NAVI_PORT", "9090"))
    if not host:
        raise ValueError("AGENTECH_NAVI_HOST must not be empty")
    Agentech.use("navi", host=host, port=port, dry_run=False)
    return Agentech


def load_plan(path: str) -> list[dict]:
    plan = json.loads(Path(path).read_text(encoding="utf-8"))
    commands = plan.get("commands")
    if plan.get("version") != 2 or plan.get("robot_model") != "navi" or not isinstance(commands, list):
        raise ValueError("unsupported Navi command plan")
    if not 1 <= len(commands) <= MAX_COMMANDS:
        raise ValueError(f"Navi command plan must contain 1 through {MAX_COMMANDS} commands")
    for command in commands:
        if not isinstance(command, dict):
            raise ValueError("invalid Navi command plan entry")
        validate_navi_command(command.get("name"), command.get("args"))
    return commands


def is_recoverable_turn_timeout(name: str, error: BaseException) -> bool:
    return (
        name in RECOVERABLE_TURN_COMMANDS
        and isinstance(error, TimeoutError)
        and str(error).startswith(TURN_TIMEOUT_PREFIX)
    )


def execute(path: str) -> None:
    commands = load_plan(path)
    agentech = configure_navi()
    recoverable_timeouts = 0
    try:
        for index, command in enumerate(commands, start=1):
            name = command["name"]
            arguments = command["args"]
            print(f"[navi-runner] {index}/{len(commands)} Agentech.{name}({arguments})", flush=True)
            try:
                getattr(agentech, name)(**arguments)
            except TimeoutError as error:
                if not is_recoverable_turn_timeout(name, error):
                    raise
                print(
                    f"[navi-runner] recoverable {name} timeout: {error}; "
                    "sending a safety stop, then continuing",
                    flush=True,
                )
                agentech.stop()
                recoverable_timeouts += 1
        if recoverable_timeouts:
            print(
                f"[navi-runner] completed {len(commands)} commands with "
                f"{recoverable_timeouts} recoverable turn timeout(s)",
                flush=True,
            )
    finally:
        agentech.stop()


def end_session_lie_down() -> None:
    agentech = configure_navi()
    try:
        print("[navi-runner] booked session ended; Agentech.lie_down({})", flush=True)
        agentech.lie_down()
    finally:
        agentech.stop()


def main() -> None:
    if len(sys.argv) == 2 and sys.argv[1] == "--lie-down":
        end_session_lie_down()
        return
    if len(sys.argv) == 2 and sys.argv[1] == "--stop":
        agentech = configure_navi()
        agentech.stop()
        return
    if len(sys.argv) == 3 and sys.argv[1] == "--validate":
        commands = load_plan(sys.argv[2])
        print(f"validated {len(commands)} Navi commands")
        return
    if len(sys.argv) != 2:
        raise SystemExit("usage: trusted-navi-runner.py PLAN.json | --validate PLAN.json | --lie-down | --stop")
    execute(sys.argv[1])


if __name__ == "__main__":
    main()
