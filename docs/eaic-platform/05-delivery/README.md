# 05 - Live Data and Delivery

This layer returns operational evidence and customer results through the unified API.

## Delivery areas

| Area | Responsibility |
| --- | --- |
| Livestream | Current RGB stream; future multi-camera and additional sensors |
| Status and logs | Telemetry, run events, errors, and human intervention |
| Files and storage | Video, images, files, base quota, and quota expansion |
| Results and reports | Run result packages; PDF, HTML, and JSON outputs |
| Usage and billing | Runtime, livestream, storage, and validation metering |

All delivery records reference the same Run ID and return through the unified API to the appropriate client.
