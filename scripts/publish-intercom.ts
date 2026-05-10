import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import { marked } from 'marked';

interface CollectionsConfig {
  locales: { default: string; available: string[] };
  collections: Array<{
    slug: string;
    name: string;
    description: string;
    order: number;
    icon?: string;
    translated_content?: Record<string, { name: string; description: string }>;
  }>;
}

interface Article {
  slug: string;
  title: string;
  collection: string;
  locale: string;
  state: 'published' | 'draft';
  bodyHtml: string;
  rawPath: string;
}

interface State {
  collections: Record<string, string>;
  articles: Record<string, string>;
}

const ROOT = process.cwd();
const STATE_FILE = join(ROOT, '.intercom-state.json');

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadEnvFile(join(ROOT, '.env'));

const TOKEN = process.env.INTERCOM_TOKEN;
const REGION = process.env.INTERCOM_REGION ?? 'us';
const ADMIN_ID = process.env.INTERCOM_ADMIN_ID;
const DRY_RUN = process.argv.includes('--dry-run');

if (!TOKEN || !ADMIN_ID) {
  console.error('Missing INTERCOM_TOKEN or INTERCOM_ADMIN_ID.\nCopy .env.example → .env and fill in values.');
  process.exit(1);
}

const apiBase = REGION === 'us' ? 'https://api.intercom.io' : `https://api.${REGION}.intercom.io`;

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  if (DRY_RUN) {
    const preview = body ? ` ${JSON.stringify(body).slice(0, 80)}…` : '';
    console.log(`  [dry-run] ${method} ${path}${preview}`);
    return { id: `dry-run-${Math.random().toString(36).slice(2, 8)}` } as T;
  }
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Intercom-Version': '2.11',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) return { collections: {}, articles: {} };
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as State;
}

function saveState(state: State): void {
  if (DRY_RUN) return;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function findArticleFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('_') || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findArticleFiles(full, files);
    else if (entry.endsWith('.md') && entry !== 'README.md') files.push(full);
  }
  return files;
}

function loadArticles(): Article[] {
  const articles: Article[] = [];
  for (const f of findArticleFiles(join(ROOT, 'docs'))) {
    const { data, content } = matter(readFileSync(f, 'utf8'));
    articles.push({
      slug: String(data.slug),
      title: String(data.title),
      collection: String(data.collection),
      locale: String(data.locale),
      state: data.state === 'published' ? 'published' : 'draft',
      bodyHtml: marked.parse(content) as string,
      rawPath: relative(ROOT, f),
    });
  }
  return articles;
}

async function syncCollections(config: CollectionsConfig, state: State): Promise<void> {
  console.log(`\n[collections] ${config.collections.length} declared`);
  for (const col of config.collections) {
    const payload: Record<string, unknown> = {
      name: col.name,
      description: col.description,
      order: col.order,
    };
    if (col.icon) payload.icon = col.icon;
    if (col.translated_content && Object.keys(col.translated_content).length) {
      const tc: Record<string, unknown> = {};
      for (const [locale, t] of Object.entries(col.translated_content)) {
        tc[locale] = { type: 'group_content', name: t.name, description: t.description };
      }
      payload.translated_content = tc;
    }
    const existingId = state.collections[col.slug];
    if (existingId) {
      console.log(`  PUT ${col.slug} → ${existingId}`);
      await api('PUT', `/help_center/collections/${existingId}`, payload);
    } else {
      console.log(`  POST ${col.slug}`);
      const res = await api<{ id: string | number }>('POST', '/help_center/collections', payload);
      state.collections[col.slug] = String(res.id);
      saveState(state);
    }
  }
}

async function syncArticles(articles: Article[], state: State, config: CollectionsConfig): Promise<void> {
  const bySlug = new Map<string, Article[]>();
  for (const a of articles) {
    if (a.state !== 'published') continue;
    const arr = bySlug.get(a.slug) ?? [];
    arr.push(a);
    bySlug.set(a.slug, arr);
  }

  const drafts = articles.filter(a => a.state === 'draft').length;
  console.log(`\n[articles] ${bySlug.size} unique slug(s) to publish${drafts ? ` (${drafts} draft skipped)` : ''}`);

  const defaultLocale = config.locales.default;
  let failed = 0;

  for (const [slug, variants] of bySlug) {
    const primary = variants.find(a => a.locale === defaultLocale) ?? variants[0];
    const collectionId = state.collections[primary.collection];
    if (!collectionId) {
      console.error(`  SKIP ${slug}: collection "${primary.collection}" not in state — run publish again if this is a new collection`);
      failed++;
      continue;
    }

    const translatedContent: Record<string, unknown> = {};
    for (const v of variants) {
      if (v.locale === defaultLocale) continue;
      translatedContent[v.locale] = {
        type: 'article_content',
        title: v.title,
        body: v.bodyHtml,
        author_id: Number(ADMIN_ID),
        state: 'published',
      };
    }

    const payload: Record<string, unknown> = {
      title: primary.title,
      description: '',
      body: primary.bodyHtml,
      author_id: Number(ADMIN_ID),
      state: 'published',
      parent_id: Number(collectionId),
      parent_type: 'collection',
    };
    if (Object.keys(translatedContent).length) payload.translated_content = translatedContent;

    try {
      const existingId = state.articles[slug];
      if (existingId) {
        console.log(`  PUT ${slug} → ${existingId}`);
        await api('PUT', `/articles/${existingId}`, payload);
      } else {
        console.log(`  POST ${slug}`);
        const res = await api<{ id: string | number }>('POST', '/articles', payload);
        state.articles[slug] = String(res.id);
        saveState(state);
      }
    } catch (e) {
      console.error(`  FAIL ${slug}: ${(e as Error).message}`);
      failed++;
    }
  }

  if (failed) {
    console.error(`\n${failed} item(s) failed.`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Region: ${REGION} | Admin: ${ADMIN_ID}`);
  const config = parseYaml(readFileSync(join(ROOT, 'collections.yaml'), 'utf8')) as CollectionsConfig;
  const state = loadState();
  const articles = loadArticles();

  await syncCollections(config, state);
  await syncArticles(articles, state, config);

  console.log('\nDone.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
