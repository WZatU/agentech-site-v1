from __future__ import annotations


class Agentech:
    _commands: list[dict] = []

    @classmethod
    def reset_script(cls) -> None:
        cls._commands = []

    @classmethod
    def consume_script(cls) -> list[dict]:
        commands = list(cls._commands)
        cls.reset_script()
        return commands

    @classmethod
    def _record(cls, name: str, **params) -> dict:
        command = {"name": name, "params": params}
        cls._commands.append(command)
        return command

    @classmethod
    def stand(cls, stand_wait: float = 5.0):
        return cls._record("stand", stand_wait=float(stand_wait))

    @classmethod
    def forward(cls, speed: float = 0.3, seconds: float = 1.0, stand_wait: float = 5.0):
        return cls._record("forward", speed=float(speed), seconds=float(seconds), stand_wait=float(stand_wait))

    @classmethod
    def backward(cls, speed: float = 0.3, seconds: float = 1.0, stand_wait: float = 5.0):
        return cls._record("backward", speed=float(speed), seconds=float(seconds), stand_wait=float(stand_wait))

    @classmethod
    def backflip(cls):
        return cls._record("backflip")

    @classmethod
    def stop(cls):
        return cls._record("stop")


def actuator_count(observation: dict) -> int:
    return int(observation.get("actuator_count", 0))


def zero_action(observation: dict) -> list[float]:
    return [0.0] * actuator_count(observation)


def clamp_action(action, observation: dict, low: float = -1.0, high: float = 1.0) -> list[float]:
    count = actuator_count(observation)
    values = [float(value) for value in action]
    if len(values) != count:
        raise ValueError(f"Expected {count} actuator commands, got {len(values)}.")
    return [max(low, min(high, value)) for value in values]


class Robot:
    def __init__(self, observation: dict):
        self.observation = observation
        self.actuator_count = actuator_count(observation)

    def zero_action(self) -> list[float]:
        return zero_action(self.observation)

    def clamp_action(self, action, low: float = -1.0, high: float = 1.0) -> list[float]:
        return clamp_action(action, self.observation, low=low, high=high)
