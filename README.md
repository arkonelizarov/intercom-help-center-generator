# intercom-help-center-generator

A portable, CI-ready template for writing product documentation in Markdown and publishing it to [Intercom Articles](https://www.intercom.com/help-center).  
No proprietary toolchain. Works with any product, any team, any Git host.

---

## Overview

You write articles as Markdown files with YAML front matter. A TypeScript publish script converts them to HTML and upserts them into your Intercom Help Center via the Intercom API. A state file (`.intercom-state.json`) maps your slugs to Intercom's internal IDs so articles are updated in place, not duplicated.

CI validates docs on every PR and publishes on every push to `main`.

---

## Repository layout

```
.
├── collections.yaml              # Help Center structure (collections + locales)
├── sources.yaml                  # source repos whose code this knowledge base documents
├── docs/
│   ├── _templates/
│   │   └── article.md            # copy this when creating a new article
│   └── {locale}/
│       └── {collection-slug}/
│           └── {article}.md
├── scripts/
│   ├── publish-intercom.ts       # syncs collections + articles to Intercom
│   └── validate-docs.ts          # validates front matter before publish
├── .intercom-state.json          # auto-managed; maps slugs → Intercom IDs
├── .env.example                  # credential template (copy to .env)
├── .github/workflows/publish.yml # GitHub Actions CI
└── package.json
```

---

## Quick start

### 1. Use this repo as a template

Click **"Use this template"** on GitHub, or clone and re-init:

```bash
git clone git@github.com:arkonelizarov/intercom-help-center-generator.git my-docs
cd my-docs
rm -rf .git && git init
npm install
```

### 2. Set up credentials

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
INTERCOM_TOKEN=tok:...
INTERCOM_REGION=us
INTERCOM_ADMIN_ID=12345678
```

**Where to find each value:**

| Variable | Where to get it |
|---|---|
| `INTERCOM_TOKEN` | Intercom → Settings → Developers → Your app → Authentication → Access token |
| `INTERCOM_REGION` | `us`, `eu`, or `au` — must match your workspace region |
| `INTERCOM_ADMIN_ID` | Run `curl -H "Authorization: Bearer <token>" https://api.intercom.io/admins` and pick your admin's `id` |

### 3. Point to your source repositories

Edit [`sources.yaml`](sources.yaml) to list the repositories whose code this knowledge base documents. Claude uses this file to verify behavioural claims (button labels, error messages, flows) before writing or editing articles.

```yaml
sources:
  - url: git@github.com:your-org/your-app.git
    description: >
      Mobile app. Authoritative for screen names, button labels,
      error strings, and UI flows.
    paths:
      - src/screens
      - src/i18n

  - url: git@github.com:your-org/your-backend.git
    description: >
      Backend API. Authoritative for status codes and business logic.
```

If you're writing docs without a linked codebase (e.g. a manual process or external API), leave `sources` empty and verify claims manually.

### 4. Define your Help Center structure

Edit [`collections.yaml`](collections.yaml) — this is the only config file that describes your Help Center layout:

```yaml
locales:
  default: en
  available:
    - en
    - fr

collections:
  - slug: getting-started
    name: Getting started
    description: First steps and initial setup.
    order: 1
    translated_content:
      fr:
        name: Premiers pas
        description: Premières étapes et configuration initiale.

  - slug: troubleshooting
    name: Troubleshooting
    description: Common errors and how to fix them.
    order: 2
```

Rules:
- `slug` must match the folder name under `docs/{locale}/{slug}/`
- `order` controls the display order in the Help Center sidebar
- `translated_content` is optional — omit it for single-language setups

### 4. Write articles

Copy the template and fill it in:

```bash
cp docs/_templates/article.md docs/en/getting-started/my-first-article.md
```

Every article requires this front matter:

```yaml
---
slug: my-first-article      # stable kebab-case ID — never rename after first publish
title: My first article
collection: getting-started # must match a slug in collections.yaml
locale: en                  # must be in collections.yaml → locales.available
state: draft                # 'draft' stays local; 'published' goes to Intercom
---
```

The body is standard [CommonMark](https://commonmark.org/) Markdown. It is converted to HTML before being sent to Intercom.

### 5. Validate

```bash
npm run validate
```

Validation checks:
- All required front matter fields are present
- `collection` values exist in `collections.yaml`
- `locale` values exist in `collections.yaml`
- No duplicate slugs within the same locale

### 6. Preview without publishing

```bash
npm run publish:dry
```

Prints every API call that would be made without hitting Intercom.

### 7. Publish

```bash
npm run publish
```

This creates or updates collections and articles in your Intercom workspace. On subsequent runs, existing articles are updated in place (not duplicated) using the state file.

---

## Multi-language support

Add locales to `collections.yaml`, then create a mirrored file for each locale using the same `slug`:

```
docs/en/getting-started/my-article.md   # slug: my-article, locale: en
docs/fr/getting-started/my-article.md   # slug: my-article, locale: fr
```

The publisher groups files by slug. The default locale becomes the primary article; other locales are attached as `translated_content` in a single Intercom article.

---

## CI setup

### GitHub Actions

Set these secrets in **Settings → Secrets and variables → Actions**:

- `INTERCOM_TOKEN`
- `INTERCOM_REGION`
- `INTERCOM_ADMIN_ID`

The workflow at [`.github/workflows/publish.yml`](.github/workflows/publish.yml) runs automatically:
- `validate` runs on every PR and push to `main`
- `publish` runs on push to `main` only

### GitLab CI

If you're using GitLab, add a `.gitlab-ci.yml`:

```yaml
stages: [validate, publish]

default:
  image: node:20-alpine
  before_script: [npm ci]

validate:
  stage: validate
  script: [npm run validate]
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

publish:
  stage: publish
  needs: [validate]
  cache:
    key: intercom-state-v1
    paths: [.intercom-state.json]
  script: [npm run publish]
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $INTERCOM_TOKEN
```

Set the same three variables in **Settings → CI/CD → Variables**.

---

## State file

`.intercom-state.json` is created automatically on first publish and updated on every subsequent run. It maps your slugs to Intercom's internal IDs:

```json
{
  "collections": {
    "getting-started": "12345678"
  },
  "articles": {
    "my-first-article": "87654321"
  }
}
```

**Commit this file to your repo**, or persist it via CI cache (see the GitHub Actions workflow). Losing it is not catastrophic — the next publish will create new Intercom articles — but you will lose the connection to existing articles and accumulate duplicates.

**Migrating to a new Intercom workspace:** swap `.env`, delete `.intercom-state.json`, run `npm run publish`. Everything is recreated from scratch.

---

## Slug stability

The `slug` field is the article's permanent external identity. It must never be renamed after the first publish. Renaming a slug causes the publisher to create a new Intercom article (new URL) and orphan the old one.

If you need to rename an article:
1. Delete the old Intercom article manually via the Intercom UI.
2. Remove the old slug entry from `.intercom-state.json`.
3. Rename the file and update the `slug` field.
4. Publish.

---

## Available commands

| Command | Description |
|---|---|
| `npm run validate` | Validate all front matter |
| `npm run publish` | Sync to Intercom (live) |
| `npm run publish:dry` | Preview API calls without touching Intercom |

---

## Requirements

- Node.js ≥ 20
- An Intercom workspace with Articles enabled
- An Intercom access token with read/write access to Articles

---

## License

MIT
