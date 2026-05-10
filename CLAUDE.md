# CLAUDE.md

Guidance for Claude Code when working in this repository.

This repo is a Markdown-to-Intercom publishing pipeline. Articles live in `docs/`, structure is declared in `collections.yaml`, and the scripts in `scripts/` sync everything to Intercom Articles via API. Content only — no application code.

## Commands

```bash
npm install                  # one-time setup
npm run validate             # check front matter, slug uniqueness, collection refs
npm run publish:dry          # preview API calls without touching Intercom
npm run publish              # upsert collections + articles via Intercom API
```

Publish reads `.env` (gitignored) for `INTERCOM_TOKEN`, `INTERCOM_REGION`, `INTERCOM_ADMIN_ID`. In CI, the publish job is gated on `$INTERCOM_TOKEN` — missing variable skips the job.

## Architecture invariants

- **Slug is the only stable article identifier in source.** Intercom IDs live in `.intercom-state.json`. Slug must never be renamed after first publish — doing so orphans the existing Intercom article and creates a duplicate.
- **Multi-locale via `translated_content`.** One slug = one Intercom article with multiple language variants. Not one article per locale.
- **Region, token, and admin ID are workspace-specific.** They live only in `.env` and CI variables — never in `collections.yaml` or any committed file.
- **Required front matter fields:** `slug`, `title`, `collection`, `locale`, `state`. Validator rejects missing fields, duplicate slugs within a locale, and `collection` values not in `collections.yaml`.
- **State file persistence.** `.intercom-state.json` must be committed or persisted via CI cache. Losing it means the next publish creates duplicate articles in Intercom.

## Hard rules for writing and editing articles

### 1. Only write what is true of the product

Every behavioural claim — button label, screen name, error message, navigation step, feature behaviour — must be verifiable against the actual product. Do not invent, extrapolate, or fill gaps to make an article feel complete.

If a detail cannot be confirmed:
- Omit it, or
- Ask the user to verify it, or
- Note it explicitly as unverified

Never use "probably", "typically", "usually", or "industry-standard" as a substitute for a real fact.

### 2. UI strings stay in their source language

When writing articles in any locale, all UI strings — button labels, field names, error messages, status labels, tab names, screen titles, navigation items — must appear exactly as they appear in the product interface. Only the descriptive prose around them is translated.

Rationale: keeps articles stable across locales and prevents drift if the product's interface changes.

### 3. Slugs are permanent

Never rename a `slug` field in an existing article. If a rename is required, follow the migration steps in the README.

### 4. State file is not content

Do not edit `.intercom-state.json` manually unless performing a deliberate migration (e.g., pointing an existing slug at a different Intercom article ID). Its values are managed by the publish script.

### 5. `collections.yaml` is the source of truth for structure

Do not add `collection` values to article front matter that are not declared in `collections.yaml`. The validator will reject them. Add the collection to `collections.yaml` first.

## Adding a new locale

1. Add the locale code to `collections.yaml → locales.available`.
2. Add `translated_content` blocks to any collections that need translated names.
3. Create `docs/{locale}/{collection-slug}/{article}.md` files mirroring the default locale, with the same `slug` and `collection` values but the new `locale` value.
4. Run `npm run validate` before pushing.

## Adding a new collection

1. Add an entry to `collections.yaml → collections` with a unique `slug`, `name`, `description`, and `order`.
2. Create the folder `docs/{default-locale}/{slug}/`.
3. Run `npm run publish` — the collection is created in Intercom first, then articles referencing it can be published.

## CI

Two jobs in `.github/workflows/publish.yml`:

- `validate` — runs on every PR and push to `main`.
- `publish` — runs on push to `main` only, gated on `INTERCOM_TOKEN` secret being set.

State persists between CI runs via `actions/cache` with key `intercom-state-v1`.
