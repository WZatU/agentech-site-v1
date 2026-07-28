"""Capture Navi's 12 joint states while one reviewed action runs."""

from __future__ import annotations

import argparse
import json
import threading
import time
from pathlib import Path

from agentech import Agentech
from agentech.robots.navi.transport import RosbridgeClient


JOINT_TOPIC = "/alphadog_node/joint_states"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=(
            "wait_for_praise",
            "lucky_cat",
            "jingle",
            "flex_muscles",
            "good_night_wave",
            "cry",
            "encourage",
            "playful_greeting",
            "push_ahead",
            "brace",
            "shake_hand_quick",
            "pee_quick",
        ),
    )
    parser.add_argument("--host", default="192.168.4.65")
    parser.add_argument("--port", type=int, default=9090)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--timeout", type=float, default=8.0)
    parser.add_argument("--throttle-ms", type=int, default=20)
    parser.add_argument("--sample-interval", type=float, default=0.5)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    Agentech.use(
        "navi",
        host=args.host,
        port=args.port,
        timeout=args.timeout,
        dry_run=False,
    )
    before = Agentech.get_status()
    if before.get("error") or before.get("warning") or before.get("estop"):
        raise RuntimeError(f"Navi is not healthy enough to record: {before}")

    origin = time.monotonic()
    samples: list[dict[str, object]] = []
    ready = threading.Event()
    stop = threading.Event()
    capture_error: list[str] = []

    def capture() -> None:
        try:
            with RosbridgeClient(args.host, args.port, timeout=args.timeout) as client:
                client.subscribe(
                    JOINT_TOPIC,
                    throttle_rate_ms=args.throttle_ms,
                    queue_length=1,
                )
                ready.set()
                latest: dict[str, object] | None = None
                latest_received_s: float | None = None
                next_sample_s = time.monotonic()
                try:
                    while not stop.is_set():
                        message = client.receive_topic(JOINT_TOPIC, timeout=0.1)
                        now = time.monotonic()
                        if message:
                            latest = message
                            latest_received_s = now - origin
                        if latest is None or now < next_sample_s:
                            continue
                        samples.append(
                            {
                                "time_s": now - origin,
                                "source_received_s": latest_received_s,
                                "names": list(latest.get("name", ())),
                                "positions": list(latest.get("position", ())),
                                "velocities": list(latest.get("velocity", ())),
                                "efforts": list(latest.get("effort", ())),
                            }
                        )
                        next_sample_s = now + args.sample_interval
                finally:
                    client.unsubscribe(JOINT_TOPIC)
        except BaseException as error:  # Preserve telemetry failure in output.
            capture_error.append(repr(error))
            ready.set()

    worker = threading.Thread(target=capture, name="navi-joint-capture", daemon=True)
    worker.start()
    if not ready.wait(args.timeout):
        raise TimeoutError("Joint-state recorder did not connect")
    if capture_error:
        raise RuntimeError(capture_error[0])

    time.sleep(0.7)
    action_start_s = time.monotonic() - origin
    result = getattr(Agentech, args.action)()
    action_end_s = time.monotonic() - origin
    time.sleep(1.2)
    stop.set()
    worker.join(args.timeout)
    after = Agentech.get_status()

    if not samples:
        raise RuntimeError("No joint-state samples were received")
    payload = {
        "version": 1,
        "robot": "navi",
        "host": args.host,
        "port": args.port,
        "action": args.action,
        "sample_count": len(samples),
        "sample_throttle_ms": args.throttle_ms,
        "sample_interval_s": args.sample_interval,
        "action_start_s": action_start_s,
        "action_end_s": action_end_s,
        "before": before,
        "result": result,
        "after": after,
        "capture_error": capture_error,
        "samples": samples,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: payload[key] for key in (
        "action", "sample_count", "action_start_s", "action_end_s", "result", "after"
    )}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
