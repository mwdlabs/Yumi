#!/usr/bin/env node
/**
 * Publie une nouvelle version du produit.
 *
 *   pnpm release <patch|minor|major|x.y.z>
 *
 * - met la même version dans tous les package.json du monorepo (l'app mobile la
 *   reprend via app.config.ts ; le numéro de build iOS/Android est géré par EAS) ;
 * - transforme la section « Non publié » du CHANGELOG en section datée ;
 * - crée le commit `chore(release): x.y.z` et l'étiquette `vx.y.z`.
 *
 * Rien n'est poussé : vérifier, puis `git push --follow-tags`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifests = [
  'package.json',
  'apps/api/package.json',
  'apps/mobile/package.json',
  'packages/shared/package.json',
];
const UNRELEASED = '## [Non publié]';

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const [major, minor, patch] = current.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  return fail('Usage : pnpm release <patch|minor|major|x.y.z>');
}

const bump = process.argv[2];
if (!bump) fail('Usage : pnpm release <patch|minor|major|x.y.z>');
if (git('status', '--porcelain')) fail("L'arbre de travail doit être propre (commit d'abord).");

const rootManifest = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
const version = nextVersion(rootManifest.version, bump);
if (git('tag', '--list', `v${version}`)) fail(`L'étiquette v${version} existe déjà.`);

const changelogPath = `${root}CHANGELOG.md`;
const changelog = readFileSync(changelogPath, 'utf8');
const start = changelog.indexOf(UNRELEASED);
if (start === -1) fail(`Section « ${UNRELEASED} » introuvable dans le CHANGELOG.`);
const bodyStart = start + UNRELEASED.length;
const nextSection = changelog.indexOf('\n## [', bodyStart);
const notes = changelog.slice(bodyStart, nextSection === -1 ? undefined : nextSection).trim();
if (!notes) fail('La section « Non publié » du CHANGELOG est vide : rien à publier.');

for (const path of manifests) {
  const file = `${root}${path}`;
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.version = version;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  changelogPath,
  `${changelog.slice(0, bodyStart)}\n\n## [${version}] - ${today}${changelog.slice(bodyStart)}`,
);

git('add', 'CHANGELOG.md', ...manifests);
git('commit', '-m', `chore(release): ${version}`);
git('tag', '-a', `v${version}`, '-m', `Version ${version}`);

console.log(`✔ Version ${version} prête (commit + étiquette v${version}).`);
console.log('  Pousser : git push --follow-tags');
console.log('  Build App Store : pnpm --filter @yumi/mobile build:ios');
