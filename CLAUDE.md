# CLAUDE.md

This is a **Claude-first project**. Claude Code is the primary actor — you analyze source repositories, write articles, and publish them to Intercom. The scripts are tools you call; the intelligence is yours.

---

## What this project does

Source repositories → Claude analysis → Markdown articles → Intercom Help Center.

You read code (screens, flows, i18n strings, error definitions), write accurate user-facing documentation as Markdown, and publish it to an Intercom workspace via API.

---

## Project layout

```
sources.yaml          ← repos to analyze (filled in by the user)
collections.yaml      ← Help Center structure (collections + locales)
docs/                 ← articles you write, organized by locale and collection
.sources/             ← local clones of source repos (gitignored, populated by fetch-sources)
scripts/
  fetch-sources.ts    ← clones/updates repos from sources.yaml into .sources/
  validate-docs.ts    ← validates front matter before publish
  publish-intercom.ts ← syncs collections + articles to Intercom API
.intercom-state.json  ← maps slugs → Intercom IDs (auto-managed)
.env                  ← credentials (gitignored)
```

---

## Commands

```bash
npm run fetch-sources    # clone or update all repos from sources.yaml into .sources/
npm run validate         # validate all article front matter
npm run publish:dry      # preview Intercom API calls without touching anything
npm run publish          # upsert collections + articles to Intercom (live)
```

Intercom credentials come from `.env` (gitignored). Required variables: `INTERCOM_TOKEN`, `INTERCOM_REGION`, `INTERCOM_ADMIN_ID`.

---

## Slash commands

Use these to run the main workflows:

| Command | What it does |
|---|---|
| `/analyze` | Explore source repos and propose a Help Center structure |
| `/generate` | Write article drafts for all collections based on source code |
| `/publish` | Validate and publish articles marked `state: published` to Intercom |

---

## Standard workflow

### First time setup

1. User fills in `sources.yaml` with repo SSH URLs.
2. User fills in (or approves) `collections.yaml` with Help Center structure.
3. Run `/analyze` to explore repos and propose/refine the structure.
4. Run `/generate` to write article drafts.
5. User reviews drafts, changes `state: draft` → `state: published` on approved articles.
6. Run `/publish` to send to Intercom.

### Ongoing updates

When source repos change and docs need updating:
1. Run `npm run fetch-sources` to pull latest code.
2. Identify what changed (ask the user, or explore `.sources/` git logs).
3. Edit the relevant articles in `docs/`.
4. Run `/publish`.

---

## Architecture invariants

- **Slug is permanent.** The `slug` field in front matter is the article's external identity. Never rename it after first publish — doing so orphans the Intercom article and creates a duplicate. If a rename is needed: delete the old article in Intercom UI, remove the entry from `.intercom-state.json`, rename slug, republish.
- **Multi-locale via `translated_content`.** One slug = one Intercom article with language variants attached. Not one article per locale.
- **Credentials are never committed.** `INTERCOM_TOKEN`, `INTERCOM_REGION`, `INTERCOM_ADMIN_ID` live only in `.env` and CI secrets.
- **State file is auto-managed.** Do not edit `.intercom-state.json` manually except during deliberate workspace migrations.
- **Required front matter:** `slug`, `title`, `collection`, `locale`, `state`. Validator rejects anything missing.

---

## Hard rules for writing articles

### Only write what the code confirms

Every behavioural claim — button label, screen name, error message, navigation step, feature, flow — must be traceable to the source code in `.sources/`. Use the Explore subagent to find the exact file and line before writing.

If something cannot be found:
- Omit it, or
- Leave a `<!-- TODO: could not verify — review before publishing -->` comment and keep `state: draft`, or
- Ask the user

Never fill gaps with "probably", "typically", "usually", or "industry-standard" guesses.

### UI strings stay in their source form

When writing articles in any locale, all UI strings — button labels, field names, error messages, tab names, screen titles — must appear exactly as they appear in the product. Only the surrounding prose is translated. i18n files in the source repos are the authoritative source for these strings.

### Drafts are safe; published is the user's call

Always generate articles with `state: draft`. Never set `state: published` yourself. That decision belongs to the user.

### Verify before every claim

Workflow before writing or editing any behavioural claim:
1. Identify which repo in `sources.yaml` owns this feature.
2. Use Explore subagent to locate the exact reference in `.sources/`.
3. Cite the file path in your reasoning.
4. Write the claim.

If Explore returns "not found" — the claim is forbidden.

---

## Adding a new locale

1. Add the locale code to `collections.yaml → locales.available`.
2. Add `translated_content` to any collections that need translated names/descriptions.
3. Create `docs/{locale}/{collection-slug}/{article}.md` for each article, using the same `slug` and `collection` values, with the new `locale` value.
4. Run `npm run validate`.

## Adding a new collection

1. Add an entry to `collections.yaml → collections`.
2. Create `docs/{default-locale}/{new-slug}/`.
3. Run `/generate` or write articles manually.
4. Run `/publish` — collections are created in Intercom before articles.

---

## CI (GitHub Actions)

Two jobs in `.github/workflows/publish.yml`:
- `validate` — runs on every PR and push to `main`
- `publish` — runs on push to `main`, gated on `INTERCOM_TOKEN` secret

State persists between runs via `actions/cache` with key `intercom-state-v1`.
