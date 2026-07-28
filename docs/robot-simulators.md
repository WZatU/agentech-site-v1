# Robot simulator architecture

The EAIC Hub sends Aegies and Navi preview requests through
`POST /api/agentech-simulate`. The request includes the selected robot model,
and the response uses one shared preview contract:

- `frames`: sampled robot poses;
- `rendered_frames`: sampled JPEG data URLs;
- `final_pose`, `steps`, `duration_s`, and `command_count`;
- `robot_model` and the model resource path.

## Runtime layout

- `simulators/aegis/` contains the complete website-owned Aegis MuJoCo runtime,
  model, meshes, and adapter.
- `simulators/navi/` contains the supplied Navi translator v1.0.0 source,
  model, meshes, configuration, tests, tools, and website adapter.
- `simulators/service/app.py` exposes one hosted `/simulate` endpoint and a
  small runtime registry.
- `Dockerfile.simulator` packages both simulator runtimes for the Render
  service declared in `render.yaml`.

No simulator depends on a sibling checkout or external Git install. Runtime
code is checked into this repository.

## Local and hosted behavior

When `AGENTECH_SIMULATOR_URL` is configured, the Next.js API calls the hosted
simulator. The value may be either the service base URL or the full `/simulate`
URL. Without it, local development invokes the selected checked-in adapter:

- `simulators/aegis/web_adapter.py`;
- `simulators/navi/web_adapter.py`.

`AGENTECH_SIMULATOR_PYTHON` may select a Python executable for local
simulation. The default is `python`.

The Navi adapter uses the translator's restricted AST parser. Submitted code is
validated and translated; it is not executed with Python `exec` or `eval`.

## Preview assets

Public previews use one scalable path:

`public/assets/products/agentech-library/simulator-previews/<robot>/`

Aegis and Navi submitted functions are converted into an ordered motion plan.
The Physical Hardware Check displays the matching action assets one at a time,
in source order. Generation scripts use the parallel
`scripts/simulator-previews/<robot>/` layout.
