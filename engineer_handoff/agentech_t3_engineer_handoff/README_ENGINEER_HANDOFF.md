# Agentech Code Simulation Page - Engineer Handoff

This folder contains the working prototype page for customer code validation.

## What The Page Does

- Customer selects the company robot dog.
- Customer uploads Python code.
- The app checks SDK-only usage.
- The app checks whether the code can be translated into real-robot SDK commands.
- The app runs a MuJoCo simulation video for passing code.
- Failed code shows a large X instead of a simulation.
- Passing results unlock `Submit for Further Review`.

## Files To Integrate

Required:

- `web_app.py` - single-file web page and validation flow.
- `packages/agentech/` - public customer SDK stub used by uploaded code.
- `packages/agentech_translator/` - real-robot translation validator.
- `packages/validator_core/` - MuJoCo runtime adapter.
- `assets/Aegis/` - bundled Aegis robot URDF and meshes.

Helpful examples:

- `examples/success_simulation.py` - passing upload example.
- `examples/bad_non_sdk_controller.py` - failing upload example.
- `examples/web_upload_smoke_test.py` - simple local smoke test.

Optional:

- `start_web_app.py` - local launcher for this standalone prototype.

## Runtime Notes

Python dependencies:

- `mujoco`
- `Pillow`

Run locally:

```bash
python web_app.py
```

Default URL:

```text
http://127.0.0.1:8765/
```

## Integration Notes

The current prototype is Python stdlib HTTP for easy testing. For the main website, the engineer can port:

- the HTML/CSS from `page()`, `index_html()`, and `result_html()`
- the upload handler logic from `Handler.do_POST()`
- validation functions around `load_controller()`, `run_translation_check()`, and `run_validation()`

Do not expose translated real-robot code to customers. The page only shows pass/fail for translation.
