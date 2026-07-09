from __future__ import annotations

import sys
import uuid
from pathlib import Path
from urllib import request


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_XML = ROOT / "examples" / "robot_dog_minimal.xml"
EXAMPLE_CONTROLLER = ROOT / "examples" / "agentech_zero_controller.py"


def multipart_body(steps: int, controller_path: Path | None = None) -> tuple[bytes, str]:
    boundary = f"----AgentechBoundary{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        b'Content-Disposition: form-data; name="robot_model"\r\n\r\n',
        b"robot_dog\r\n",
        f"--{boundary}\r\n".encode("utf-8"),
        b'Content-Disposition: form-data; name="steps"\r\n\r\n',
        f"{steps}\r\n".encode("utf-8"),
    ]
    if controller_path is not None:
        parts.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="controller_file"; filename="{controller_path.name}"\r\n'.encode(
                    "utf-8"
                ),
                b"Content-Type: text/x-python\r\n\r\n",
                controller_path.read_bytes(),
                b"\r\n",
            ]
        )
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    body = b"".join(parts)
    return body, boundary


def main() -> int:
    url = "http://127.0.0.1:8765/upload"
    controller_path = EXAMPLE_CONTROLLER
    steps = 100
    if len(sys.argv) > 1:
        first_arg = sys.argv[1]
        if first_arg.startswith("http://") or first_arg.startswith("https://"):
            url = first_arg
        else:
            controller_path = Path(first_arg)
    if len(sys.argv) > 2:
        steps = int(sys.argv[2])
    body, boundary = multipart_body(steps=steps, controller_path=controller_path)
    upload_request = request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with request.urlopen(upload_request, timeout=45) as response:
        html = response.read().decode("utf-8", errors="replace")
    marker = "Final Status"
    status_snippet = ""
    if marker in html:
        start = html.index(marker)
        status_snippet = html[start : start + 220]
    status_pass = '<span class="status pass">PASS</span>' in status_snippet
    print(f"HTTP status: {response.status}")
    print(f"Overall status PASS: {status_pass}")
    print(f"Contains controller validation: {'Controller Code Validation' in html}")
    print(f"Contains checklist: {'Validation Checklist' in html}")
    print(f"Contains review submit: {'Submit for Further Review' in html}")
    if status_snippet:
        print(status_snippet[:180].replace("\n", " "))
    required = [
        "Validation Checklist",
        "Submit for Further Review",
    ]
    return 0 if status_pass and all(text in html for text in required) else 1


if __name__ == "__main__":
    raise SystemExit(main())
