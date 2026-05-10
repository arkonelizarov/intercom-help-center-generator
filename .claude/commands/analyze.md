Analyze the source repositories and propose a Help Center structure.

## Steps

1. Read `sources.yaml` to get the list of repositories and their descriptions.

2. Run `npm run fetch-sources` to clone or update all repos into `.sources/`.

3. For each repo in `.sources/`, use the Explore subagent to thoroughly map:
   - All screens, pages, and views (navigation structure)
   - All user-facing features and flows
   - All error messages and edge cases
   - All settings, configurations, and options available to the user
   - Any i18n/localization files (these are the most direct source of UI strings)

4. Synthesize across all repos. Group related functionality into logical Help Center sections.

5. Output a proposed `collections.yaml` with:
   - A `locales` block (ask the user which languages are needed if not already set)
   - A `collections` list where each collection maps to a coherent topic area
   - For each collection: a recommended list of articles with slugs and one-line descriptions

6. Ask the user to review and confirm the structure before anything is written to disk.
   Do not modify `collections.yaml` or create any files until the user approves.

## Output format

Present the proposed structure as a YAML code block ready to paste into `collections.yaml`,
followed by a per-collection breakdown listing the articles you plan to generate.
