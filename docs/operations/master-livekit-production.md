# Master Live Stream Production Check

The Master Code Checking test is a camera-view authorization only. It creates or reuses a 30-minute `preset_demo` session with no code submission attached to the robot run. Text entered in Code Checking is saved as a zero-command audit artifact and is never executed on Master.

## Victoria acceptance test

1. Sign in as `victoria_c@agent-tech.ai`.
2. Open Code Checking and select **Master**.
3. Paste any test text and start the 30-minute view-only test.
4. Confirm both display gates pass and the response says the text will not execute.
5. Select **Open Master Live Stream** and confirm the active robot model is Master and the Master-only camera controls appear.
6. Confirm another company account does not receive the Master option in Code Checking.

## Media availability boundary

Authorization and camera delivery are separate checks. If the Master page opens with the Master camera controls but video remains blank or waiting, repair or restart the AGENTECH01 relay/publisher on port `4175`. Do not weaken the account or session authorization to work around a media relay failure.

The AGENTECH01-to-Master Ethernet connection must remain available whenever the physical robot cameras are expected to publish. The website can remain deployed on Vercel independently, but it cannot display new live robot frames after that camera network path or the publisher is disconnected.
