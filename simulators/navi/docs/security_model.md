# Security Model

## Input trust boundary

The translator reads SDK-like Python as text and parses it with Python's AST.
It does **not** import `agentech`, execute the source, call `eval`/`exec`, or run
user functions as Python bytecode.

This is a restricted translator, not a general Python sandbox. Only files
intended as SDK command descriptions should be supplied.

## Supported and rejected syntax

Supported syntax includes the documented SDK import, supported SDK calls,
literal/static values, bounded supported control flow and `time.sleep` as a
simulation-time wait. The parser validates methods and arguments against
`config/sdk_spec.json`.

Rejected or constrained syntax includes:

- arbitrary imports and relative imports;
- file/network/process/thread access;
- `eval`, `exec`, `compile`, dynamic import and reflection helpers;
- arbitrary dynamic call targets;
- dunder access and object mutation;
- `while`, classes, lambdas, async/await, generators, try/except, with blocks,
  and comprehensions.

Rejection is structured and returns a nonzero CLI code.

## Files and outputs

- Input files are read only.
- Runtime assets resolve from the installed package.
- Results are written only to the default `./results/<run-id>` or explicit
  `--output`.
- Non-empty output directories require explicit `--overwrite`.
- The translator does not claim filesystem isolation from the invoking user.

## Backend boundary

The MuJoCo backend acts only on validated scheduled IR. Actions write actuator
controls; direct root state injection is prohibited and tested. Hardware-only
and blocked methods cannot enter a generic success path.

## Third-party dependencies

Core runtime dependencies are MuJoCo, NumPy and JSON Schema validation.
OpenCV is optional for video. Dependencies run with the permissions of the
current Python process; install them from trusted package indexes.

## Video and viewer

The viewer creates a native GUI/OpenGL context. Video encoding receives rendered
frames and writes only the selected output path. No external ffmpeg executable
path is hard-coded.

## Logs and diagnostics

CLI logs use DEBUG/INFO/WARNING/ERROR. User home prefixes are redacted from log
messages. Structured errors include a safe error code, method when available,
and message; debug tracebacks are emitted only through configured logging.

## Secrets

SDK input must not contain credentials. Release package validation scans text
for common secret patterns and rejects user-directory paths, caches, virtual
environments and unsafe ZIP entries.
