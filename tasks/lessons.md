# Lessons

## 2026-10-18 Animation prefactor
- Incorrect test assumption: three 80 ms ticks no longer span three shipped
  poses. Signal: only one changed blit. Observe a full motion window, and test
  the first unchanged tick separately.
- Incorrect boundary mock: returning `{ deny }` from a `ui.blit` hook does not
  simulate the API result. Signal: repeated blits despite denial. Return
  `{ value: { deny } }`, matching the host endpoint envelope.
- Timing tripwire: on remount, compare actual seated cells with subsequent
  blits; do not assume the next tick shares the seated pose.
