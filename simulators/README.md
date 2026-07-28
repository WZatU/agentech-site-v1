# Robot simulators

Every supported robot has one self-contained runtime directory:

```text
simulators/
|-- aegis/
|   |-- web_adapter.py
|   `-- aegis_runtime/
|-- navi/
|   |-- web_adapter.py
|   `-- <Navi translator source>
`-- service/
    `-- app.py
```

The shared service knows only the robot directory, timeout, and adapter name.
Adding a robot means adding `simulators/<robot>/web_adapter.py` with the shared
JSON contract, then registering it in `simulators/service/app.py`.

Executable runtimes stay here. Browser-served previews are organized separately
under `public/assets/products/agentech-library/simulator-previews/<robot>/`, and
their generation scripts live under `scripts/simulator-previews/<robot>/`.

Generated environments, results, outputs, caches, and videos are ignored.
