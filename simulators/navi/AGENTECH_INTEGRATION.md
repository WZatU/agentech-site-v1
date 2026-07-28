# Agentech website adapter

This directory contains the supplied Navi MuJoCo SDK Translator v1.0.0 source
distribution without generated caches or outputs.

`web_adapter.py` is the only website-specific addition. It converts the
translator's validated result into the same JSON-over-stdin preview contract
used by `simulators/aegis/web_adapter.py`.
