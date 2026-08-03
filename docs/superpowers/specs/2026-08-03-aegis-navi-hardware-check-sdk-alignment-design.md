# Aegis and Navi Hardware Check SDK Alignment

## Goal

Make the Step 3 Physical Hardware Check accept and reject Aegis and Navi code according to the exact public SDK reference displayed on the EAIC Hub website. A command, parameter, profile, type, choice, or limit that is not public on the selected robot's SDK cards must not be accepted as a compatibility exception.

## Current Problem

The repository currently has three related contracts:

- `lib/aegis-sdk-reference.ts` and `lib/navi-sdk-reference.ts` drive the public SDK cards.
- `lib/agentech-validation.ts` drives the website hardware-check validation. Aegis rules are hand-written; Navi rules are partly generated from card text and then patched.
- `scripts/compile-robot-plan.py` and `scripts/navi_gateway_spec.py` contain downstream command and parameter allowlists.

Because these contracts are maintained separately, the website can document one limit while the validator enforces another, or the hardware check can pass a public call that the downstream compiler rejects.

## Source of Truth

The public Aegis and Navi SDK reference records are authoritative. Each public card will contain structured validation metadata alongside the text already rendered by the website.

The structured contract will describe:

- public command name and capability status;
- allowed and required named parameters;
- parameter type, inclusive or exclusive minimum, maximum, or enumerated choices;
- valid parameter profiles and mutually exclusive selectors;
- cross-parameter constraints such as matching turn signs and resolved diagonal component limits.

The displayed SDK card and the hardware validator will consume the same record. Development and unsupported entries remain visible only where the existing UI intentionally displays their status, but they are not approved hardware-check commands.

## Blocking Behavior

The hardware check will continue to reject:

1. Unsafe Python operations: blocked system or device imports, `eval`, `exec`, file access, dynamic imports, private/dunder access, and direct actuator, motor, torque, joint, or robot-state control.
2. Calls outside the selected public robot SDK, including commands from the other robot and Navi development or unsupported commands.
3. Positional command arguments. Public robot calls must use named parameters.
4. Parameters not listed on the selected public SDK card. Undocumented compatibility aliases such as `speed=` and `seconds=` are rejected.
5. Missing required parameters, mixed parameter profiles, wrong literal types, out-of-range literals, unsupported enumerated choices, conflicting turn signs, and invalid resolved diagonal components.
6. Submissions with no approved Aegis or Navi command.

Variables and helper expressions remain allowed at the website screening stage where a value cannot be resolved statically. Literal values are checked immediately. The trusted compiler retains its stricter deterministic-code policy for executable plans.

## Architecture

### Public contract metadata

Add reusable validation types to the SDK reference model. Aegis and Navi card definitions will declare their rules explicitly rather than relying on parsing human-readable strings such as `float (0, 10]`.

### Validator generation

Replace the hand-maintained Aegis specification and text-derived Navi specification in `lib/agentech-validation.ts` with a builder that reads the selected robot's public reference records. Generic security checks remain separate because they are Python safety policy, not SDK behavior.

Command-specific cross-parameter checks will use structured profile and constraint identifiers from the same reference entry. This keeps special behaviors explicit without coupling validation to display wording.

### Downstream consistency

The trusted Python compiler and Navi gateway may remain conservative about executable syntax, but their public command and parameter allowlists must be supersets of the public hardware-check contract for literal direct calls. Automated consistency tests will detect missing public names or parameters before a change can ship.

## Error Reporting

Existing finding categories remain stable where possible:

- `UNAPPROVED_SDK_CALL`
- `POSITIONAL_PARAMETER_BLOCKED`
- `UNKNOWN_PARAMETER`
- `REQUIRED_PARAMETER`
- `TYPE_INVALID`
- `RANGE_INVALID`
- `CHOICE_INVALID`
- `PROFILE_MIXED`
- `SIGN_CONFLICT`

Messages will continue to identify the command, parameter, line, and expected public rule. No internal robot address, transport detail, or raw controller capability will be exposed.

## Testing

Tests will load the real public Aegis and Navi reference records and validate real submitted code against them.

Coverage will include:

- every available public command is recognized for the correct robot;
- development, unsupported, unknown, and cross-robot commands are rejected;
- every public parameter name is accepted and undocumented aliases are rejected;
- inclusive boundaries pass and values immediately beyond them fail;
- exclusive boundaries fail at the boundary and pass immediately inside it;
- required parameters, valid profiles, mixed profiles, types, choices, signs, and diagonal component constraints behave as documented;
- downstream compiler/gateway allowlists contain every public literal command and parameter accepted by the hardware check;
- existing Python safety blocks remain effective.

Tests will be added before validator changes and observed failing for the current contract drift before production code is changed.

## Non-Goals

- Adding new Aegis or Navi SDK capabilities.
- Changing the public limits currently shown on the website.
- Allowing undocumented legacy aliases.
- Weakening the trusted compiler's restrictions on variables, loops, helpers, or nonliteral executable commands.
- Changing Master validation or adding Master hardware-check support in this work.

## Success Criteria

- The website card and hardware check use one structured public contract for Aegis and Navi.
- Examples shown on available public cards pass the hardware check for the correct robot.
- Values and parameter combinations outside the displayed public contract fail with actionable findings.
- Public commands and parameters that pass Step 3 are present in the downstream literal-call allowlists.
- Focused validator tests, existing robot tests, type checking, and the production build pass.
