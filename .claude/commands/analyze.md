Analyze source repositories and propose a Help Center structure. Do not write any files until the user approves.

## Step 1 — Fetch sources

Run `npm run fetch-sources` to clone or update all repos from `sources.yaml` into `.sources/`.
If `sources.yaml` has no entries, stop and ask the user to fill it in first.

## Step 2 — Explore repos

For each repo in `.sources/`, use the Explore subagent to map:
- All screens, pages, and views (navigation structure)
- All user-facing features and flows end-to-end
- All error messages and edge cases
- All settings and options available to the user
- i18n/localization files (these give you the exact UI strings)

Do this thoroughly — the quality of the generated articles depends entirely on how well you understand the product here.

## Step 3 — Propose structure

Present the proposed Help Center structure to the user in this format:

---

**Proposed Help Center structure**

```yaml
locales:
  default: en
  available: [en]   # list any additional locales if relevant

collections:
  - slug: getting-started
    name: Getting started
    description: ...
    order: 1

  - slug: ...
```

**Planned articles per collection:**

**Getting started** (3 articles)
- `first-login` — How to sign in for the first time
- `account-setup` — Completing your profile and initial settings
- `navigation-overview` — Understanding the main screens

**[Next collection]** (N articles)
- `slug` — one-line description
- ...

---

Then ask: **"Does this structure look right? Reply with any changes, or say 'approve' to write the files."**

## Step 4 — Apply after approval

Only after the user explicitly approves (or approves with edits):
1. Write the confirmed structure to `collections.yaml`.
2. Confirm: "Structure saved to `collections.yaml`. Run `/generate` to write the articles."

Do not create any `docs/` files here — that is `/generate`'s job.
