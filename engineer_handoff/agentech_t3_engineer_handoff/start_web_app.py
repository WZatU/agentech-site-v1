from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LOG_OUT = ROOT / "web_server.out.log"
LOG_ERR = ROOT / "web_server.err.log"


def main() -> int:
    env = os.environ.copy()
    env["AGENTECH_T3_PORT"] = env.get("AGENTECH_T3_PORT", "8765")
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    with LOG_OUT.open("ab") as out, LOG_ERR.open("ab") as err:
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "web_app.py")],
            cwd=str(ROOT.parent.parent),
            env=env,
            stdout=out,
            stderr=err,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=True,
        )
    print(f"Started Agentech T3 web app on http://127.0.0.1:{env['AGENTECH_T3_PORT']}")
    print(f"PID: {process.pid}")
    print(f"Logs: {LOG_OUT} / {LOG_ERR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
