# Monitoring fixes

- [x] Verify and fix authenticated database policies referencing the protected user list.
- [x] Preserve hidden builtin and custom rating scores on edit; add regression tests (4 passed).
- [x] Verify live policy definitions, successful preview builds, and resolve the two monitoring findings.
- [ ] Signed-in end-to-end checks of blog, admin statistics, and both rating edit screens: blocked because no requesting-user account/session could be minted; user must sign in through the preview.

# Season pass and trial release

- [x] Apply `20261126120000_season_pass_and_trial.sql` from commit `85bed7c` unchanged.
- [x] Verify the new subscription fields and updated database functions.
- [x] Deploy `create-checkout`, `check-subscription`, and `revenuecat-webhook`.
- [x] Review security scan, verify the release, and publish the website.