Validate and publish articles to Intercom. Always show a full summary and wait for explicit approval before sending anything.

## Step 1 — Validate

Run `npm run validate`.

If validation fails, show the errors clearly and stop:
"Validation failed. Fix the errors above before publishing."

## Step 2 — Show publish plan

Read `docs/` and `.intercom-state.json`. Present the full publish plan:

---

**Publish plan**

**Ready to publish** (state: published):
| Article | Slug | Collection | Locale | Action |
|---|---|---|---|---|
| Sign in for the first time | `first-login` | getting-started | en | CREATE (new) |
| Accept a QR payment | `accept-qr-payment` | payments | en | UPDATE (existing) |
| ... | | | | |

**Still on draft** (will be skipped):
- `account-setup` — Getting started / en
- `troubleshooting-errors` — Troubleshooting / en

**Collections:** 3 will be created or updated.

---

Then ask: **"Ready to publish these X articles to Intercom? Reply 'yes' to confirm or 'dry-run' to preview without sending."**

## Step 3 — Execute

- If user says `yes` → run `npm run publish`
- If user says `dry-run` → run `npm run publish:dry`
- Anything else → cancel and explain how to proceed

## Step 4 — Report results

After publish completes, show what happened:

---

**Published successfully**

✓ Created: `first-login` → Intercom article #12345678
✓ Updated: `accept-qr-payment` → Intercom article #87654321
✗ Failed: `mobile-money-cashout` — [error message]

State saved to `.intercom-state.json`.

---

If any articles failed, show the error and suggest next steps.
