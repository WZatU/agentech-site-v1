# Aegis simulator

This directory is the website's self-contained Aegis MuJoCo runtime. The
website, hosted simulator service, and preview-generation script all use this
copy; none of them depend on a sibling checkout or external runtime repository.

## Contents

- `aegis_runtime/` contains the parser, MuJoCo renderer, robot model, and meshes.
- `web_adapter.py` exposes the same JSON-over-stdin contract used by every robot
  runtime under `simulators/`.
- `pyproject.toml` makes the runtime independently installable in the hosted
  simulator image.

The runtime was extracted from the committed Aegis implementation in
`agent-tech0316/agentech_sdk` at commit
`ea2121dbdf8d9f950faa7d7ec8e6eb0c01689040`. The imported simulator source blob
is `e2a76271e845ce5abe8f86e074d0a3fdbd59930c`.
