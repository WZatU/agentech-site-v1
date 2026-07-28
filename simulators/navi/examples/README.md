# Release Examples

All examples are restricted SDK source files parsed as AST; they are not
executed as general Python. Run any example with:

```bash
navi-sim examples/movement/turn_then_forward.py --allow-unresolved --headless --seed 0
```

| Example | Expected result |
|---|---|
| `basic/stand.py` | stable controlled standing |
| `basic/wait.py` | simulation time advances without `time.sleep` |
| `movement/forward.py` | positive body-frame forward displacement |
| `movement/backward.py` | negative body-frame forward displacement |
| `movement/lateral.py` | left then right body-frame displacement |
| `movement/turn.py` | positive SDK angle produces a physical right turn |
| `movement/turn_then_forward.py` | forward follows the new body heading |
| `actions/wave_hand.py` | approximate evidence-backed profile executes |
| `sensing/query_state.py` | simulated MuJoCo/controller state is returned |
| `safety/stop.py` | locomotion cancels and velocity decays |
| `safety/emergency_stop.py` | simulated safety lock requires explicit recovery |
| `configuration/set_gait_limit.py` | structured unresolved-contract rejection |
| `limitations/hardware_only.py` | battery value is unavailable and not fabricated |
| `limitations/blocked_by_model.py` | structured model-capability rejection |
