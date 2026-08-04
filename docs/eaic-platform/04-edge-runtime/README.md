# 04 - Repository Edge and Robot Runtime

This layer performs authorized execution near the robot.

## Execution chain

```text
Approved project
  -> Repository project / AI service
  -> Constrained behavior package
  -> Vendor-adapted Robot Runtime
  -> Robot and venue execution
```

## Boundary rules

- Raw customer code does not directly enter the robot.
- The edge verifies package hash, reservation, and deployment authorization.
- Behavior parsing produces constrained, inspectable instructions.
- Vendor adapters expose state and control through one runtime contract.
- On-site staff have final stop and refusal authority.
- Emergency stop, robot reset, and cell reset remain local and authoritative.
