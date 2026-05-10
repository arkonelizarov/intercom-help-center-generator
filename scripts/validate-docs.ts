import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';

interface CollectionsConfig {
  locales: { default: string; available: string[] };
  collections: Array<{ slug: string; name: string; description: string; order: number }>;
}

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, 'docs');
const COLLECTIONS_FILE = join(ROOT, 'collections.yaml');

const errors: string[] = [];

function findArticles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('_') || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findArticles(full, files);
    } else if (entry.endsWith('.md') && entry !== 'README.md') {
      files.push(full);
    }
  }
  return files;
}

const config = parseYaml(readFileSync(COLLECTIONS_FILE, 'utf8')) as CollectionsConfig;
const knownCollections = new Set(config.collections.map(c => c.slug));
const knownLocales = new Set(config.locales.available);

const articles: Array<{ rel: string; data: Record<string, unknown> }> = [];

for (const filePath of findArticles(DOCS_DIR)) {
  const rel = relative(ROOT, filePath);
  const { data } = matter(readFileSync(filePath, 'utf8'));

  for (const key of ['slug', 'title', 'collection', 'locale', 'state'] as const) {
    if (!data[key]) errors.push(`${rel}: missing required field "${key}"`);
  }
  if (data.collection && !knownCollections.has(String(data.collection))) {
    errors.push(`${rel}: unknown collection "${data.collection}" — add it to collections.yaml`);
  }
  if (data.locale && !knownLocales.has(String(data.locale))) {
    errors.push(`${rel}: unknown locale "${data.locale}" — add it to collections.yaml`);
  }
  if (data.state && data.state !== 'published' && data.state !== 'draft') {
    errors.push(`${rel}: state must be "published" or "draft", got "${data.state}"`);
  }

  articles.push({ rel, data });
}

const seenSlugPerLocale = new Map<string, Map<string, string>>();
for (const { rel, data } of articles) {
  const locale = String(data.locale ?? '');
  const slug = String(data.slug ?? '');
  if (!locale || !slug) continue;
  const localeSlugs = seenSlugPerLocale.get(locale) ?? new Map<string, string>();
  const prior = localeSlugs.get(slug);
  if (prior) {
    errors.push(`${rel}: duplicate slug "${slug}" in locale "${locale}" (also in ${prior})`);
  } else {
    localeSlugs.set(slug, rel);
  }
  seenSlugPerLocale.set(locale, localeSlugs);
}

if (errors.length) {
  console.error(`Validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  process.exit(1);
}

console.log(`OK — ${articles.length} article(s) validated across ${seenSlugPerLocale.size} locale(s).`);
