# Victoria Master Live Test Unlock Design

## Goal

Allow the signed-in account `victoria_c@agent-tech.ai` to select **Master** in the EAIC Hub Code Checking area, submit any text as a view-only test artifact, receive a visible test approval, and immediately obtain a 30-minute active Master viewing session on the main website.

The submitted text must never be sent to or executed on the physical Master robot. Existing Aegies and Navi review, scheduling, execution, and live-stream behavior must remain unchanged.

## Current Behavior

- Code Checking and robot-slot model validation currently accept only Aegies and Navi.
- Master live controls and the Master LiveKit room already exist.
- The live page is unlocked by a signed-in account having an active session whose `robot_model` is `Master`; a passed code check alone does not unlock it.
- The robot execution bridge consumes only sessions whose `approved_run_type` is `custom_code`.
- The Master camera gateway consumes active Master sessions independently of the execution bridge.

## Considered Approaches

### 1. Dedicated view-only Master preview session — selected

Give only the exact signed-in Victoria account a Master option in Code Checking. A Master test submission follows a separate server-side path that records a test approval and creates or reuses a 30-minute `preset_demo` Master session with no code-submission link.

This meets the testing goal while keeping the execution bridge unable to select or execute the submitted text.

### 2. Bypass both checks and create a `custom_code` Master session

This resembles the normal Aegies/Navi flow, but it would place arbitrary text in the physical execution path. The current execution bridge also rejects Master as an unsupported execution model. This approach is unsafe and does not produce a reliable test.

### 3. Bypass the active-session check in the LiveKit token route

This would unlock only the website viewer. The Master publisher gateway would still see no active Master session and would not publish the camera program. It would also weaken the existing session-bound authorization model.

## Account Authorization

- The server owns a single normalized allowlist entry: `victoria_c@agent-tech.ai`.
- The client never sends or chooses the privileged email.
- Every Master preview request derives the identity from the signed server account session and compares it to the allowlist.
- Other accounts do not see the Master Code Checking option and receive `403` if they call the preview endpoint directly.
- Company-domain membership alone does not grant this preview access.

## User Experience

1. Victoria signs in on the main website and opens Code Checking.
2. The page loads the existing review-gate response. That response includes a server-derived `masterLiveTestAccess` boolean.
3. When the boolean is true, **Master** appears alongside Aegies and Navi.
4. Selecting Master changes the copy to explain that this is a view-only livestream test and that submitted text will not execute.
5. Victoria may paste or upload any text. It is treated only as a test artifact; no Agentech command, syntax, hardware, or AI-security requirement is applied.
6. Running the Master test displays both review gates as passed for this preview flow and reports the 30-minute session expiration.
7. The Live Stream step becomes available immediately and resolves the active session as `Master`, so the page shows Master-only camera controls and joins `master-live-1`.

The UI must not describe the submitted text as approved for physical execution.

## Server Design

### Access policy

A focused module owns the exact-account predicate and preview duration. It is shared by the review-gate response and the Master preview endpoint so authorization cannot drift between the UI and API.

### Preview endpoint

A dedicated authenticated endpoint accepts the test text and optional filename. It:

1. verifies the signed server account session;
2. verifies the exact Victoria allowlist entry;
3. verifies that the account exists;
4. creates a Master test submission record for audit and restore behavior;
5. marks that test record `physical_safety_status=passed` and `ai_security_status=passed`, with zero credits charged and a summary that explicitly says `view-only, not executable`;
6. reuses an existing active Victoria Master preview session when one exists; otherwise checks for a conflicting active robot session and creates a 30-minute Master session; and
7. returns the session ID, start, end, robot model, and approval display state.

The session uses:

- `robot_model = Master`
- `requested_run_type = preset_demo`
- `approved_run_type = preset_demo`
- `preset_demo = Master live stream test (view only)`
- `benchmark_status = passed`
- `code_submission_id = null`
- `price = 0`
- a note identifying the session as a Victoria view-only Master preview

Because it is not `custom_code` and has no linked code submission, the existing robot execution bridge cannot claim or execute it.

### Session timing and conflicts

- A newly created preview starts immediately and ends 30 minutes later.
- Repeated requests during an active Victoria Master preview reuse the same session rather than extending it or creating duplicates.
- The endpoint must not overwrite, cancel, or overlap another active robot session. A conflict returns `409` with a clear retry message.
- Existing active-session status rules remain unchanged, so the LiveKit viewer and Master gateway both recognize the preview session.

## Failure Handling

- Missing or invalid signed session: `401`.
- Signed-in account is not the exact allowlisted account: `403`.
- Account record missing: `404`.
- Another active robot session conflicts with the requested 30-minute window: `409`.
- Submission persistence or session creation failure: `500` with no claim that live access was unlocked.
- A passed display response is returned only after the preview session exists or an existing eligible session was found.

If audit-record persistence succeeds but session creation fails, retrying is safe: the endpoint reuses the latest eligible Master preview audit record rather than charging credits or invoking an AI review again.

## Media Availability Boundary

This feature unlocks the production page, Master controls, viewer token, and gateway session. It does not by itself guarantee that camera media is present.

The AGENTECH01 Master wired relay and publisher must still be running and connected to Master. If the publisher is unavailable, the page must show its existing waiting/unavailable state rather than claiming that video is live.

## Testing

Automated tests must prove:

- the exact Victoria account receives `masterLiveTestAccess=true`;
- capitalization and surrounding whitespace normalize safely;
- another `@agent-tech.ai` account is not authorized;
- unauthenticated and unauthorized preview requests fail;
- arbitrary text, including text with no Agentech commands, is accepted only for the authorized Master preview path;
- the created session is Master, 30 minutes, free, `preset_demo`, and has no code-submission link;
- a repeated request reuses the active Victoria preview session;
- a conflicting active robot session prevents creation;
- the normal Aegies/Navi code checker and robot-slot tests remain unchanged and pass;
- Master controls appear only while the returned Master preview session is active; and
- the execution bridge continues to select only `custom_code` sessions.

Browser verification on the deployed main site must confirm that Victoria can select Master, obtain the view-only approval, open the Live Stream step, and see the Master-specific camera interface. It must also confirm that a non-allowlisted account does not see the Master Code Checking option.

## Out of Scope

- Executing Master code submitted through this preview path.
- Weakening normal physical-safety or AI-security checks for Aegies or Navi.
- Granting the preview to all company accounts.
- Changing Master camera resolution, frame rate, synchronization, or publisher performance.
- Fixing the currently unavailable AGENTECH01 port `4175` publisher service; that operational repair remains a separate task.
