import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(scriptDirectory);
const pagesDirectory = path.join(repositoryDirectory, 'spear-hunting');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.vtt']);

function checkDashCharacters(source, file) {
  const errors = [];
  const dashRules = [
    [String.fromCodePoint(0x2014), 'U+2014'],
    [String.fromCodePoint(0x2013), 'U+2013'],
  ];
  for (const [character, label] of dashRules) {
    if (source.includes(character)) errors.push({ file, message: `${label} character found.` });
  }
  return errors;
}

function getAttributes(source) {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function stripComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

function getWordCount(sentence) {
  return sentence.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function checkParagraphs(html, file) {
  const warnings = [];
  const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi;
  let paragraph;

  while ((paragraph = paragraphPattern.exec(html))) {
    const text = paragraph[1]
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:nbsp|#160);/gi, ' ')
      .replace(/&(?:amp|lt|gt|quot|apos);/gi, ' ')
      .replace(/&#\d+;|&#x[\da-f]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];

    for (const sentence of sentences) {
      const wordCount = getWordCount(sentence);
      if (wordCount > 25) {
        warnings.push({
          file,
          line: getLineNumber(html, paragraph.index),
          message: `Paragraph sentence has ${wordCount} words (limit: 25).`,
        });
      }
    }
  }

  return warnings;
}

export function checkHtml(source, file = '<input>') {
  const errors = checkDashCharacters(source, file);
  const warnings = [];
  const html = stripComments(source);
  const visibleHtml = html.replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, '');

  const htmlTag = html.match(/<html\b([^>]*)>/i);
  const status = htmlTag ? getAttributes(htmlTag[1]).get('data-status') : undefined;
  if (status?.toLowerCase() === 'ready' && visibleHtml.includes('TODO(adi)')) {
    errors.push({ file, message: 'TODO(adi) found in a page marked data-status="ready".' });
  }

  const tags = [...html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)];
  for (let index = 0; index < tags.length; index += 1) {
    const [, rawName, rawAttributes] = tags[index];
    const name = rawName.toLowerCase();
    const attributes = getAttributes(rawAttributes);
    const line = getLineNumber(html, tags[index].index);

    if (name === 'img' && !attributes.has('alt')) {
      errors.push({ file, line, message: 'Image is missing an alt attribute.' });
    }
  }

  const hasRobotsDirective = tags.some(([, rawName, rawAttributes]) => {
    if (rawName.toLowerCase() !== 'meta') return false;
    const attributes = getAttributes(rawAttributes);
    if (attributes.get('name')?.toLowerCase() !== 'robots') return false;
    const directives = (attributes.get('content') ?? '')
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    return directives.includes('noindex') && directives.includes('nofollow');
  });
  if (!hasRobotsDirective) {
    errors.push({ file, message: 'Missing robots meta with noindex,nofollow.' });
  }

  for (let index = 0; index < tags.length; index += 1) {
    const [, rawName] = tags[index];
    if (rawName.toLowerCase() !== 'video') continue;
    const openTagEnd = tags[index].index + tags[index][0].length;
    const closingTag = /<\/video\s*>/gi;
    closingTag.lastIndex = openTagEnd;
    const closeMatch = closingTag.exec(html);
    const contents = closeMatch ? html.slice(openTagEnd, closeMatch.index) : '';
    const hasCaptions = [...contents.matchAll(/<track\b([^>]*)>/gi)].some(([, rawAttributes]) =>
      getAttributes(rawAttributes).get('kind')?.toLowerCase() === 'captions',
    );
    if (!hasCaptions) {
      errors.push({
        file,
        line: getLineNumber(html, tags[index].index),
        message: 'Video is missing a captions track.',
      });
    }
  }

  warnings.push(...checkParagraphs(html, file));
  return { errors, warnings };
}

async function collectTextFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(entryPath)));
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function checkPages(directory = pagesDirectory) {
  const files = await collectTextFiles(directory);
  const results = [];
  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    const relativePath = path.relative(repositoryDirectory, filePath);
    const result = path.extname(filePath).toLowerCase() === '.html'
      ? checkHtml(source, relativePath)
      : { errors: checkDashCharacters(source, relativePath), warnings: [] };
    results.push({ filePath, ...result });
  }
  return results;
}

const siteOrigin = 'https://www.adityagujaran.com';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const oldRoutePattern = /^\/spear-hunting\/[a-z0-9-]+\/?(#.*)?$/;
const indexAlias = 'spearhuntingindex';

function getHeadUrls(source) {
  const urls = { canonical: undefined, ogUrl: undefined };
  for (const [, rawName, rawAttributes] of stripComments(source).matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const name = rawName.toLowerCase();
    const attributes = getAttributes(rawAttributes);
    if (name === 'link' && attributes.get('rel')?.toLowerCase() === 'canonical') urls.canonical = attributes.get('href');
    if (name === 'meta' && attributes.get('property')?.toLowerCase() === 'og:url') urls.ogUrl = attributes.get('content');
  }
  return urls;
}

function checkIdentity(source, file, slugValue, expectedUrl) {
  const errors = [];
  const rootTag = stripComments(source).match(/<html\b([^>]*)>/i);
  const dataSlug = rootTag ? getAttributes(rootTag[1]).get('data-slug') : undefined;
  if (dataSlug !== slugValue) {
    errors.push({ file, message: `data-slug is ${JSON.stringify(dataSlug)}, expected ${JSON.stringify(slugValue)}.` });
  }
  const { canonical, ogUrl } = getHeadUrls(source);
  if (canonical !== expectedUrl) {
    errors.push({ file, message: `Canonical is ${JSON.stringify(canonical)}, expected ${expectedUrl}.` });
  }
  if (ogUrl !== expectedUrl) {
    errors.push({ file, message: `og:url is ${JSON.stringify(ogUrl)}, expected ${expectedUrl}.` });
  }
  return errors;
}

function checkOldRouteLinks(source, file) {
  const errors = [];
  for (const [, , rawAttributes] of stripComments(source).matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const href = getAttributes(rawAttributes).get('href');
    if (href && oldRoutePattern.test(href)) {
      errors.push({ file, message: `Link to the old page route ${href}. Use /<slug>.` });
    }
  }
  return errors;
}

/* Routing rules (vercel.json): /<slug> serves spear-hunting/<slug>/index.html,
   so a company folder must not share a name with a real top-level entry, and
   every page must carry the clean URL and its slug. */
export function checkRouting({ companies, templates, indexSource, topLevelEntries }) {
  const errors = [];
  const reserved = new Set([indexAlias, ...topLevelEntries.map((entry) => entry.toLowerCase())]);

  for (const company of companies) {
    const file = `spear-hunting/${company.slug}/index.html`;
    if (!slugPattern.test(company.slug)) {
      errors.push({ file, message: 'Company folder name must use lowercase letters, digits, and single hyphens.' });
    }
    if (reserved.has(company.slug)) {
      errors.push({ file, message: `Folder name "${company.slug}" collides with a top-level route, so /${company.slug} would not reach this page.` });
    }
    errors.push(...checkIdentity(company.source, file, company.slug, `${siteOrigin}/${company.slug}`));
    errors.push(...checkOldRouteLinks(company.source, file));
    for (const extra of company.otherHtml) {
      errors.push({ file: `spear-hunting/${company.slug}/${extra}`, message: 'Company folders may only contain index.html as an HTML page. Review pages belong in _template/.' });
    }
  }
  for (const template of templates) {
    const file = `spear-hunting/${template.name}/index.html`;
    errors.push(...checkIdentity(template.source, file, '__SLUG__', `${siteOrigin}/__SLUG__`));
    errors.push(...checkOldRouteLinks(template.source, file));
  }
  if (indexSource !== undefined) {
    errors.push(...checkOldRouteLinks(indexSource, 'spearhunting/índice/index.html'));
  }
  return errors;
}

async function listHtmlFiles(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...(await listHtmlFiles(path.join(directory, entry.name), `${prefix}${entry.name}/`)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      found.push(`${prefix}${entry.name}`);
    }
  }
  return found;
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function checkRoutingFiles(directory = pagesDirectory) {
  const root = path.dirname(directory);
  const companies = [];
  const templates = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const source = await readIfExists(path.join(directory, entry.name, 'index.html'));
    if (source === undefined) continue;
    if (entry.name.startsWith('_')) {
      if (['_template', '_canvas-template'].includes(entry.name)) templates.push({ name: entry.name, source });
      continue;
    }
    const otherHtml = (await listHtmlFiles(path.join(directory, entry.name))).filter((name) => name !== 'index.html');
    companies.push({ slug: entry.name, source, otherHtml });
  }
  const topLevelEntries = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || !path.extname(entry.name))
    .map((entry) => entry.name);
  const indexSource = await readIfExists(path.join(root, 'spearhunting', 'índice', 'index.html'));
  return checkRouting({ companies, templates, indexSource, topLevelEntries });
}

export function runDashSelfTest() {
  const input = `<!doctype html><html><head><meta name="robots" content="noindex, nofollow"></head><body><p>alpha${String.fromCodePoint(0x2013)}beta</p></body></html>`;
  const result = checkHtml(input, 'self-test.html');
  if (!result.errors.some((error) => error.message.includes('U+2013'))) {
    throw new Error('Dash self-test failed: U+2013 was not reported as an error.');
  }
  console.log('Dash self-test passed: U+2013 is reported as an error.');

  const templateInput = '<!doctype html><html data-status="ready"><head><meta name="robots" content="noindex, nofollow"></head><body><template><p>TODO(adi): optional slot</p></template><p>Ready content</p></body></html>';
  const templateResult = checkHtml(templateInput, 'template-self-test.html');
  if (templateResult.errors.some((error) => error.message.includes('TODO(adi)'))) {
    throw new Error('Template self-test failed: inert template placeholders should not block a ready page.');
  }
  console.log('Template self-test passed: inert optional slots do not block a ready page.');

  const cleanPage = (slug) => `<!doctype html><html data-slug="${slug}"><head><link rel="canonical" href="${siteOrigin}/${slug}"><meta property="og:url" content="${siteOrigin}/${slug}"></head><body></body></html>`;
  const routing = (companies, topLevelEntries = ['unlocked', 'prototypes']) =>
    checkRouting({ companies: companies.map((c) => ({ otherHtml: [], ...c })), templates: [], topLevelEntries });
  if (routing([{ slug: 'acme', source: cleanPage('acme') }]).length !== 0) {
    throw new Error('Routing self-test failed: a clean page was reported.');
  }
  if (!routing([{ slug: 'unlocked', source: cleanPage('unlocked') }]).some((error) => error.message.includes('collides'))) {
    throw new Error('Routing self-test failed: a company named like a top-level folder was not reported.');
  }
  if (!routing([{ slug: 'acme', source: cleanPage('other') }]).some((error) => error.message.includes('data-slug'))) {
    throw new Error('Routing self-test failed: a mismatched data-slug was not reported.');
  }
  console.log('Routing self-test passed: collisions and mismatched slugs are reported.');
}

async function main(args) {
  if (args.length === 1 && args[0] === '--self-test') {
    runDashSelfTest();
    return;
  }
  if (args.length > 0) {
    throw new Error('Usage: node scripts/check-spear-hunting.mjs [--self-test]');
  }

  const results = await checkPages();
  if (results.length === 0) {
    throw new Error('No text files found under spear-hunting/.');
  }

  let errorCount = 0;
  let warningCount = 0;
  for (const error of await checkRoutingFiles()) {
    console.error(`ERROR ${error.file}: ${error.message}`);
    errorCount += 1;
  }
  for (const result of results) {
    for (const error of result.errors) {
      const location = error.line ? `:${error.line}` : '';
      console.error(`ERROR ${error.file}${location}: ${error.message}`);
      errorCount += 1;
    }
    for (const warning of result.warnings) {
      const location = warning.line ? `:${warning.line}` : '';
      console.warn(`WARNING ${warning.file}${location}: ${warning.message}`);
      warningCount += 1;
    }
  }

  if (errorCount > 0) {
    console.error(`Spear-hunting check failed: ${errorCount} error(s), ${warningCount} warning(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Spear-hunting check passed: ${results.length} text file(s), ${warningCount} warning(s).`);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Could not check spear-hunting pages: ${error.message}`);
    process.exitCode = 1;
  });
}
