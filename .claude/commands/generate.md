Generate Help Center articles from source repositories. Show each article to the user for approval before saving.

Run this after `/analyze` has been approved and `collections.yaml` is finalized.

## Step 1 — Load context

Read `collections.yaml` (structure) and `sources.yaml` (repos).
If `.sources/` is missing or empty, run `npm run fetch-sources` first.

## Step 2 — Generate articles one collection at a time

For each collection in `collections.yaml`, work through it fully before moving to the next.

### For each collection:

**2a. Explore the source**

Use the Explore subagent to find everything in `.sources/` relevant to this collection:
screens, flows, i18n strings, error codes, edge cases. Be thorough — you are the only
reader of this code; the article's accuracy depends on what you find here.

**2b. Draft all articles for this collection**

For each planned article, compose the full content internally. Then present it to the user like this:

---

**Collection: Getting started — Article 1 of 3**

`docs/en/getting-started/first-login.md`

```markdown
---
slug: first-login
title: Sign in for the first time
collection: getting-started
locale: en
state: draft
---

[full article body]
```

*Sources used: `.sources/my-app/src/screens/LoginScreen.tsx:42`, `.sources/my-app/src/i18n/en.json:18`*

**Reply:** `ok` to save and continue · `edit: [your changes]` to revise · `skip` to skip this article

---

Wait for the user's response before saving or moving on.

- `ok` → save the file, move to next article
- `edit: ...` → apply the requested changes, show the revised version again, wait for another response
- `skip` → do not save, move to next article

**2c. After all articles in a collection are handled**, show a brief summary:
"**Getting started** — 3 saved, 0 skipped. Moving to next collection."

## Step 3 — Translations

If `collections.yaml` has additional locales beyond the default, after finishing all default-locale
articles for a collection, generate the translations the same way: show each one, wait for approval.

Translation rule: prose is translated; all UI strings (button labels, screen names, error messages)
stay exactly as they appear in the product — do not translate them.

## Step 4 — Final summary

After all collections are done:

---

**Done. Summary:**
- X articles saved across Y collections
- Z articles skipped
- Locales: en [, fr, ...]

**Next step:** review the drafts in `docs/`, change `state: draft` → `state: published` on articles
you want to go live, then run `/publish`.

---

Then run `npm run validate` automatically and report any errors.

## Hard rules

- Never write a file without user approval.
- Never invent UI strings, button names, or error messages not found in source code.
- Never set `state: published` — that is always the user's call.
- If a claim cannot be verified in `.sources/`, note it inline as `<!-- TODO: could not verify — review before publishing -->` and mention it when showing the article.
- Always cite the source files you used at the bottom of each article preview.
