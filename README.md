# intercom-docs-publisher

A drop-in template for publishing Markdown docs to [Intercom Articles](https://www.intercom.com/help-center).  
Works with any product. No vendor lock-in beyond Intercom itself.

## How it works

```
docs/
  en/
    getting-started/
      my-article.md      ← Markdown with YAML front matter
collections.yaml         ← declares Help Center sections
.intercom-state.json     ← auto-managed; maps slugs → Intercom IDs
```

On every push to `main`, CI validates your docs and publishes changed articles to Intercom.  
State is cached in CI so articles are updated (not duplicated) on subsequent runs.

---

## Quick start

### 1. Clone this repo (or use it as a template)

```bash
git clone <this-repo> my-docs
cd my-docs
npm install
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env: fill in INTERCOM_TOKEN, INTERCOM_REGION, INTERCOM_ADMIN_ID
```

Getting those values:
- **INTERCOM_TOKEN** — Intercom Developer Hub → your app → Authentication → Access token
- **INTERCOM_REGION** — `us`, `eu`, or `au` (must match your workspace)
- **INTERCOM_ADMIN_ID** — call `GET https://api.intercom.io/admins` with your token, pick your admin's `id`

### 3. Define your Help Center structure

Edit [`collections.yaml`](collections.yaml):

```yaml
locales:
  default: en
  available: [en]

collections:
  - slug: getting-started
    name: Getting started
    description: First steps.
    order: 1
```

Each `slug` corresponds to a folder under `docs/{locale}/{slug}/`.

### 4. Write articles

Copy [`docs/_templates/article.md`](docs/_templates/article.md) to the right path:

```
docs/en/getting-started/my-article.md
```

Required front matter fields:

| Field        | Description |
|-------------|-------------|
| `slug`       | Stable kebab-case ID. **Never rename after first publish.** |
| `title`      | Article title shown in Intercom. |
| `collection` | Must match a `slug` in `collections.yaml`. |
| `locale`     | Must be in `collections.yaml → locales.available`. |
| `state`      | `draft` (local only) or `published` (sent to Intercom). |

### 5. Validate and dry-run

```bash
npm run validate          # check front matter, slugs, locales
npm run publish:dry       # preview what would be sent to Intercom
```

### 6. Publish

```bash
npm run publish           # live — creates/updates articles in Intercom
```

Or push to `main` and let CI do it.

---

## CI setup

### GitHub Actions

Add these secrets in **Settings → Secrets and variables → Actions**:
- `INTERCOM_TOKEN`
- `INTERCOM_REGION`
- `INTERCOM_ADMIN_ID`

The workflow at [`.github/workflows/publish.yml`](.github/workflows/publish.yml) runs automatically.

### GitLab CI

Add the same three variables in **Settings → CI/CD → Variables**.  
The pipeline at [`.gitlab-ci.yml`](.gitlab-ci.yml) runs automatically.

---

## Multi-language support

Add locales to `collections.yaml`:

```yaml
locales:
  default: en
  available: [en, fr, ar]
```

Then create matching files:

```
docs/en/getting-started/my-article.md   ← slug: my-article, locale: en
docs/fr/getting-started/my-article.md   ← slug: my-article, locale: fr
docs/ar/getting-started/my-article.md   ← slug: my-article, locale: ar
```

The publisher groups articles by slug and attaches non-default locales as `translated_content`.

---

## State file

`.intercom-state.json` maps your slugs to Intercom's internal IDs so articles are updated, not duplicated.  
It is committed to the repo **or** cached in CI (see the CI config). Committing is more durable.

---

## License

MIT
