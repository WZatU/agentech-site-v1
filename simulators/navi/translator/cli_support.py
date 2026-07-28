"""Shared release CLI behavior: versioning, logs, outputs, and exit codes."""

from __future__ import annotations

import argparse
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from .version import __version__


EXIT_SUCCESS = 0
EXIT_ARGUMENT_ERROR = 2
EXIT_SCRIPT_PARSE_FAILED = 3
EXIT_SDK_VALIDATION_FAILED = 4
EXIT_BACKEND_LIMITATION = 5
EXIT_SAFETY_TERMINATION = 6
EXIT_SIMULATION_FAILED = 7
EXIT_TEST_FAILED = 8

LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR")


class OutputExistsError(ValueError):
    pass


class RedactingFilter(logging.Filter):
    _windows_user = re.compile(r"(?i)[A-Z]:\\Users\\[^\\\s]+")
    _posix_user = re.compile(r"/(?:home|Users)/[^/\s]+")

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        message = self._windows_user.sub("<USER_HOME>", message)
        message = self._posix_user.sub("<USER_HOME>", message)
        record.msg = message
        record.args = ()
        return True


def add_release_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument(
        "--config-dir",
        type=Path,
        help="Configuration directory (defaults to the installed config directory)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow writing into a non-empty output directory",
    )
    parser.add_argument("--log-level", choices=LOG_LEVELS, default="INFO")
    parser.add_argument("--log-file", type=Path)


def configure_logging(level: str, log_file: Path | None) -> logging.Logger:
    logger = logging.getLogger("navi_mujoco")
    logger.handlers.clear()
    logger.setLevel(getattr(logging, level))
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    redactor = RedactingFilter()
    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    stream.addFilter(redactor)
    logger.addHandler(stream)
    if log_file is not None:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(log_file, encoding="utf-8")
        handler.setFormatter(formatter)
        handler.addFilter(redactor)
        logger.addHandler(handler)
    return logger


def new_run_id(prefix: str) -> str:
    return prefix + "_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def default_output(run_id: str) -> Path:
    return Path.cwd() / "results" / run_id


def prepare_output(path: Path, *, overwrite: bool) -> Path:
    target = path.resolve()
    if target.exists() and any(target.iterdir()) and not overwrite:
        raise OutputExistsError(
            f"Output directory is not empty: {target}. Use --overwrite explicitly."
        )
    target.mkdir(parents=True, exist_ok=True)
    return target


def safe_error(error_code: str, message: str, *, method: str | None = None) -> str:
    return json.dumps(
        {
            "status": "failed",
            "error_code": error_code,
            "method": method,
            "message": message,
        },
        ensure_ascii=False,
    )
