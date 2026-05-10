import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';

interface Source {
  url: string;
  description: string;
  paths?: string[];
}

interface SourcesConfig {
  sources: Source[];
}

const ROOT = process.cwd();
const SOURCES_DIR = join(ROOT, '.sources');
const SOURCES_FILE = join(ROOT, 'sources.yaml');

const config = parseYaml(readFileSync(SOURCES_FILE, 'utf8')) as SourcesConfig;

if (!config.sources?.length) {
  console.log('No sources defined in sources.yaml. Add repositories and run again.');
  process.exit(0);
}

mkdirSync(SOURCES_DIR, { recursive: true });

for (const source of config.sources) {
  const repoName = basename(source.url, '.git');
  const dest = join(SOURCES_DIR, repoName);

  if (existsSync(dest)) {
    console.log(`Updating ${repoName}...`);
    execSync('git pull --ff-only', { cwd: dest, stdio: 'inherit' });
  } else {
    console.log(`Cloning ${repoName}...`);
    execSync(`git clone --depth 1 ${source.url} ${dest}`, { stdio: 'inherit' });
  }
}

console.log(`\nDone. Sources available in .sources/`);
