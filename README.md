# intercom-help-center-generator

A Claude Code project that turns your source repositories into a published [Intercom](https://www.intercom.com) Help Center.

**What is Intercom?** It's one of the most widely used helpdesk and customer support platforms — alongside Zendesk and Freshdesk. Among other things it has a [Help Center](https://www.intercom.com/help-center) — a public knowledge base where you publish articles your users can read (think Notion docs, but served directly inside your product's support widget).

You point this project at your codebase. Claude reads the code, proposes a documentation structure, writes the articles, and publishes them to Intercom — with your approval at every step.

---

## How it works

```
Your repos  →  Claude analyzes  →  You approve structure  →  Claude writes articles
→  You approve each article  →  You mark ready  →  Claude publishes to Intercom
```

Everything goes through three slash commands. Claude does the reading, writing, and publishing. You review and approve.

---

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- Node.js ≥ 20
- SSH access to your source repositories
- An Intercom workspace with Articles enabled

---

## Setup

### 1. Clone this repo

```bash
git clone git@github.com:arkonelizarov/intercom-help-center-generator.git my-docs
cd my-docs
npm install
```

### 2. Set up Intercom credentials

```bash
cp .env.example .env
```

Fill in `.env`:

```env
INTERCOM_TOKEN=tok:...
INTERCOM_REGION=us
INTERCOM_ADMIN_ID=12345678
```

| Variable | Where to find it |
|---|---|
| `INTERCOM_TOKEN` | Intercom → Settings → Developers → Your app → Authentication → Access token |
| `INTERCOM_REGION` | `us`, `eu`, or `au` — must match your workspace region |
| `INTERCOM_ADMIN_ID` | Call `GET https://api.intercom.io/admins` with your token and pick your admin's `id` |

### 3. Add your source repositories

Edit `sources.yaml`:

```yaml
sources:
  - url: git@github.com:your-org/your-mobile-app.git
    description: >
      Mobile app. Authoritative for screen names, button labels,
      navigation flows, and error messages.
    paths:
      - src/screens
      - src/i18n

  - url: git@github.com:your-org/your-backend.git
    description: >
      Backend API. Authoritative for status codes, error codes,
      and business logic.
    paths:
      - src
```

Add one entry per repository. `paths` is optional — omit it to let Claude search the whole repo.

### 4. Open the project in Claude Code

```bash
claude .
```

That's it for setup. The rest happens through slash commands.

---

## Workflow

### Step 1 — `/analyze`

Claude clones your repos, reads the code, and proposes a Help Center structure.

```
/analyze
```

Claude will show you something like:

```
Proposed Help Center structure

collections:
  - slug: getting-started
    name: Getting started
    ...

Planned articles:

Getting started (3 articles)
  • first-login        — How to sign in for the first time
  • account-setup      — Completing your profile
  • navigation-overview — Understanding the main screens

Payments (4 articles)
  • accept-qr-payment  — Accepting a QR code payment
  ...

Does this structure look right? Reply with any changes, or say 'approve'.
```

Reply with changes or `approve`. Claude writes `collections.yaml` only after you approve.

---

### Step 2 — `/generate`

Claude writes the articles, showing you each one before saving it.

```
/generate
```

For each article, Claude shows the full content and where it got the information:

```
Collection: Getting started — Article 1 of 3

docs/en/getting-started/first-login.md

---
slug: first-login
title: Sign in for the first time
collection: getting-started
locale: en
state: draft
---

This guide walks you through signing in for the first time.

## Before you start
You need:
- The app installed on your device
- Your username and temporary password (sent by email on account creation)

## Steps
1. Open the app. You will see the "Sign in" screen.
2. Enter your username.
3. Enter your temporary password.
4. Tap "Continue".
...

Sources: .sources/my-app/src/screens/LoginScreen.tsx:34,
         .sources/my-app/src/i18n/en.json:12

Reply: ok · edit: [your changes] · skip
```

- `ok` — save the file, move to the next article
- `edit: change X to Y` — Claude revises and shows it again
- `skip` — skip this article

Claude saves nothing without your `ok`.

---

### Step 3 — Review drafts

All generated articles have `state: draft` — they are local only, not sent to Intercom yet.

Open the articles in `docs/` and review them. When an article is ready to publish, change its front matter:

```yaml
state: draft → state: published
```

---

### Step 4 — `/publish`

Claude shows you exactly what will be sent to Intercom, then waits for confirmation.

```
/publish
```

Claude shows a publish plan:

```
Publish plan

Ready to publish:
  first-login        → CREATE (new article)
  accept-qr-payment  → UPDATE (existing article #87654321)

Still on draft (skipped):
  account-setup
  troubleshooting-errors

Reply 'yes' to publish, or 'dry-run' to preview without sending.
```

After publishing, Claude reports the result for every article.

---

## Updating docs when the product changes

When your source repos change and the docs need updating:

1. Run `npm run fetch-sources` to pull the latest code
2. Tell Claude what changed, or ask it to diff the relevant repo
3. Claude edits the affected articles, shows you the changes, waits for approval
4. Run `/publish`

---

## Multi-language support

Add locales to `collections.yaml`:

```yaml
locales:
  default: en
  available: [en, fr, ar]
```

During `/generate`, after finishing English articles for each collection, Claude generates the translations the same way — shows each one, waits for `ok`.

**Translation rule:** prose is translated; all UI strings (button labels, screen names, error messages) stay exactly as they appear in the product. This keeps articles stable if the interface changes.

---

## Repository layout

```
sources.yaml                   ← repos Claude analyzes
collections.yaml               ← Help Center structure (auto-written by /analyze)
docs/
  en/
    getting-started/
      first-login.md           ← generated articles live here
  fr/
    getting-started/
      first-login.md           ← translated variants, same slug
.sources/                      ← local repo clones (gitignored)
.intercom-state.json           ← maps slugs → Intercom IDs (auto-managed)
.env                           ← credentials (gitignored)
scripts/
  fetch-sources.ts             ← clones repos from sources.yaml
  validate-docs.ts             ← checks front matter before publish
  publish-intercom.ts          ← Intercom API sync
.claude/commands/
  analyze.md                   ← /analyze workflow
  generate.md                  ← /generate workflow
  publish.md                   ← /publish workflow
.github/workflows/publish.yml  ← CI: validate on PR, publish on main
```

---

## Manual commands

You can also run the underlying scripts directly:

```bash
npm run fetch-sources    # clone or update repos from sources.yaml
npm run validate         # validate all article front matter
npm run publish:dry      # preview Intercom API calls without sending
npm run publish          # publish live
```

---

## CI

The GitHub Actions workflow at `.github/workflows/publish.yml` runs automatically:

- **On every PR:** validates all front matter
- **On push to `main`:** validates and publishes (requires `INTERCOM_TOKEN` secret)

Set secrets in **Settings → Secrets and variables → Actions**: `INTERCOM_TOKEN`, `INTERCOM_REGION`, `INTERCOM_ADMIN_ID`.

---

## Article front matter reference

```yaml
---
slug: my-article          # permanent kebab-case ID — never rename after first publish
title: Article title
collection: getting-started  # must match a slug in collections.yaml
locale: en                   # must be in collections.yaml → locales.available
state: draft                 # draft = local only · published = sent to Intercom
---
```

> **Important:** `slug` is the article's permanent identity. Renaming it after the first publish creates a duplicate in Intercom and orphans the original. If you need to rename: delete the old article in Intercom, remove its entry from `.intercom-state.json`, then rename and republish.

---

## License

MIT
