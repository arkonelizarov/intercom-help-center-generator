Validate and publish all articles marked `state: published` to Intercom.

## Steps

1. Run `npm run validate`.
   - If validation fails, show the errors and stop. Do not proceed until they are fixed.

2. Show the user a summary of what will be published:
   - How many articles with `state: published`
   - How many still on `state: draft`
   - Whether this is a first publish (POST) or update (PUT) for each article
     (check `.intercom-state.json` to determine which slugs already have Intercom IDs)

3. Ask the user to confirm before proceeding.

4. Run `npm run publish`.

5. Report the result: which articles were created, which were updated, any failures.

## Dry run

To preview without touching Intercom, run `npm run publish:dry` instead of step 4.
You can trigger a dry run by adding `--dry-run` to this command: `/publish --dry-run`
