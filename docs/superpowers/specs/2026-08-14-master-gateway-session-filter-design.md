# Master Gateway Session Filter Design

The private Master camera gateway must query only active `Master` robot sessions before applying its row limit. This prevents unrelated Aegies or Navi sessions from excluding a valid three-minute Master test from the result set. Authorization, session status rules, and the three-minute expiration remain unchanged.

The query construction will live beside Master session selection as a pure function. A regression test will assert the complete PostgREST query contract, including the Master filter, time bounds, ordering, and limit. Production verification requires the gateway on AGENTECH01 to report `active: true` during a newly created Master test.
