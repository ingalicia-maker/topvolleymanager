# Monitoring fixes

- [x] Verify and fix authenticated database policies referencing the protected user list.
- [x] Preserve hidden builtin and custom rating scores on edit; add regression tests (4 passed).
- [x] Verify live policy definitions, successful preview builds, and resolve the two monitoring findings.
- [ ] Signed-in end-to-end checks of blog, admin statistics, and both rating edit screens: blocked because no requesting-user account/session could be minted; user must sign in through the preview.