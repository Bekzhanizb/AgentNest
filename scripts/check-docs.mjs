import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';
import MarkdownIt from 'markdown-it';
import { lint } from 'markdownlint/sync';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const failures = [];
const verify = (condition, message) => {
  if (!condition) failures.push(message);
};

function markdownFiles(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}

function checkMarkdown() {
  const files = markdownFiles();
  const results = lint({ files, config: JSON.parse(read('.markdownlint.json')) });
  const errors = Object.values(results).reduce((total, entries) => total + entries.length, 0);
  if (errors) failures.push(results.toString());
  console.log(`Linted ${files.length} Markdown files: ${errors} issues.`);
}

function checkLinks() {
  const parser = new MarkdownIt();
  const documents = new Map();
  for (const file of markdownFiles()) {
    const tokens = parser.parse(readFileSync(file, 'utf8'), {});
    const slugger = new GithubSlugger();
    const anchors = new Set();
    for (let index = 0; index < tokens.length; index += 1) {
      if (tokens[index].type !== 'heading_open') continue;
      const text = (tokens[index + 1].children ?? [])
        .filter((token) => ['text', 'code_inline', 'image'].includes(token.type))
        .map((token) => token.content).join('');
      anchors.add(slugger.slug(text));
    }
    documents.set(file, { tokens, anchors });
  }

  let count = 0;
  function inspect(tokens, source) {
    for (const token of tokens) {
      const href = token.type === 'link_open' ? token.attrGet('href')
        : token.type === 'image' ? token.attrGet('src') : null;
      if (href && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
        count += 1;
        const label = `${path.relative(root, source)}: ${href}`;
        try {
          const hash = href.indexOf('#');
          const pathname = decodeURIComponent((hash < 0 ? href : href.slice(0, hash)).split('?')[0]);
          const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
          const target = pathname ? path.resolve(path.dirname(source), pathname) : source;
          const relative = path.relative(root, target);
          if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
            failures.push(`${label}: target escapes repository`);
            continue;
          }
          if (!existsSync(target)) {
            failures.push(`${label}: target does not exist`);
            continue;
          }
          if (fragment && statSync(target).isFile() && target.endsWith('.md')) {
            verify(documents.get(target)?.anchors.has(fragment), `${label}: heading anchor does not exist`);
          }
        } catch (error) {
          failures.push(`${label}: ${error.message}`);
        }
      }
      if (token.children) inspect(token.children, source);
    }
  }
  for (const [source, document] of documents) inspect(document.tokens, source);
  console.log(`Checked ${count} local links across ${documents.size} Markdown files; external URLs skipped.`);
}

function checkStructure() {
  const required = [
    'README.md', 'PRODUCT.md', 'ROADMAP.md', 'AGENTS.md', 'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md', 'SECURITY.md', 'CHANGELOG.md', 'LICENSE',
    'docs/README.md', 'docs/ru/README.md', 'docs/adr/ADR-001-local-architecture.md',
    'docs/LICENSING.md', 'docs/LABELS.md', 'docs/COMMUNICATIONS.md',
    'docs/CHANGELOG_CONVENTIONS.md', 'docs/REPOSITORY_AUDIT.md', 'docs/VERIFICATION.md',
    '.github/pull_request_template.md', '.github/workflows/docs.yml',
  ];
  for (const file of required) verify(existsSync(path.join(root, file)), `${file}: required file missing`);

  const formFiles = readdirSync(path.join(root, '.github/ISSUE_TEMPLATE'))
    .filter((file) => file.endsWith('.yml') && file !== 'config.yml');
  verify(formFiles.length >= 3, 'Expected bug, proposal, and documentation issue forms');
  for (const file of formFiles) {
    const form = parse(read(`.github/ISSUE_TEMPLATE/${file}`), { uniqueKeys: true });
    verify(typeof form.name === 'string' && typeof form.description === 'string', `${file}: missing form metadata`);
    assert(Array.isArray(form.body), `${file}: body must be an array`);
    const ids = new Set();
    for (const field of form.body) {
      verify(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'].includes(field.type), `${file}: unknown field type`);
      if (field.type === 'markdown') {
        verify(typeof field.attributes?.value === 'string', `${file}: markdown value required`);
        continue;
      }
      verify(typeof field.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(field.id), `${file}: valid field id required`);
      verify(!ids.has(field.id), `${file}: duplicate field id ${field.id}`);
      ids.add(field.id);
      verify(typeof field.attributes?.label === 'string', `${file}: field label required`);
      if (['checkboxes', 'dropdown'].includes(field.type)) {
        verify(Array.isArray(field.attributes?.options) && field.attributes.options.length > 0, `${file}: options required`);
      }
    }
    verify(!form.labels?.length, `${file}: forms must not depend on uncreated labels`);
  }

  const config = parse(read('.github/ISSUE_TEMPLATE/config.yml'), { uniqueKeys: true });
  verify(config.blank_issues_enabled === false, 'Issue config: blank issues should be disabled');
  verify(config.contact_links?.some((link) => link.url === 'https://github.com/Bekzhanizb/AgentNest/blob/main/SECURITY.md'), 'Issue config: security policy link required');

  const workflow = parse(read('.github/workflows/docs.yml'), { uniqueKeys: true });
  verify(Object.hasOwn(workflow.on, 'push') && Object.hasOwn(workflow.on, 'pull_request'), 'Workflow: push and PR triggers required');
  verify(workflow.permissions?.contents === 'read', 'Workflow: repository access must be read-only');
  verify(Object.keys(workflow.permissions ?? {}).length === 1, 'Workflow: unexpected extra permissions');
  const steps = workflow.jobs?.docs?.steps ?? [];
  verify(steps.some((step) => step.run === 'npm ci'), 'Workflow: npm ci required');
  verify(steps.some((step) => step.run === 'npm run check'), 'Workflow: documentation checks required');
  for (const step of steps.filter((entry) => entry.uses)) {
    verify(/@[a-f0-9]{40}$/.test(step.uses), `Workflow: immutable action reference required: ${step.uses}`);
  }

  const manifest = JSON.parse(read('package.json'));
  verify(manifest.private === true, 'Documentation package must be private');
  console.log(`Checked ${required.length} required files, ${formFiles.length} issue forms, issue config, and CI structure.`);
}

try {
  const mode = process.argv[2];
  assert(['lint', 'links', 'structure'].includes(mode), 'Usage: node scripts/check-docs.mjs lint|links|structure');
  if (mode === 'lint') checkMarkdown();
  else if (mode === 'links') checkLinks();
  else checkStructure();
} catch (error) {
  failures.push(error.message);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log('PASS');
}
