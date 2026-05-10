Generate Help Center articles from the source repositories.

Run this after `/analyze` and after `collections.yaml` has been confirmed by the user.

## Steps

1. Read `collections.yaml` to get the approved structure: collections, locales, slugs.

2. Read `sources.yaml` to know which repos are the source of truth and what each one owns.

3. If `.sources/` is missing or stale, run `npm run fetch-sources` first.

4. For each collection in `collections.yaml`:

   a. Use the Explore subagent to deeply investigate the relevant parts of `.sources/`
      for every feature, flow, screen, and error state that belongs to this collection.
      Focus especially on i18n files, screen components, and API error definitions.

   b. For each article planned for this collection (from the `/analyze` output or as
      determined by the code exploration), write a complete draft article:
      - File path: `docs/{default-locale}/{collection-slug}/{article-slug}.md`
      - Front matter: `slug`, `title`, `collection`, `locale`, `state: draft`
      - Body: step-by-step instructions grounded entirely in what the code shows.
        Every UI string must match exactly what appears in the source (i18n files are
        authoritative). Every step must correspond to a real screen or action in the code.

   c. If other locales are configured, create the translated variants:
      - Same slug, same collection, different locale
      - Translate only prose; keep all UI strings in their original English form

5. After all files are written, run `npm run validate` and fix any errors.

6. Present a summary: how many articles written, per collection, per locale.
   Remind the user to review drafts and change `state: draft` to `state: published`
   for articles ready to go live.

## Hard rules

- Never invent UI strings, button names, or error messages. If it is not in the source code, it does not go in the article.
- Never write "probably", "typically", or "usually" as a substitute for a real fact.
- If a flow or feature cannot be found in `.sources/`, write a note in the article body: `<!-- TODO: could not verify in source — review before publishing -->` and keep state as draft.
- Do not set `state: published` on any generated article. That is always the user's decision.
