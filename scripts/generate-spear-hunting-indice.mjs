import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(scriptDirectory);
const applicationsDirectory = path.join(repositoryDirectory, 'spear-hunting');
const inventoryPath = path.join(repositoryDirectory, 'spearhunting', 'índice', 'index.html');
const startMarker = '<!-- APPLICATIONS:START -->';
const endMarker = '<!-- APPLICATIONS:END -->';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getAttribute(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? '';
}

function getPageTitle(html, fallback) {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1];
  const title = heading
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title || fallback;
}

function formatDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function isValidPublishDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

async function collectApplications() {
  const entries = await readdir(applicationsDirectory, { withFileTypes: true });
  const applications = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;

    const indexPath = path.join(applicationsDirectory, entry.name, 'index.html');
    let html = '';
    try {
      await stat(indexPath);
      html = await readFile(indexPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const slugTitle = entry.name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const rootTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
    const status = getAttribute(rootTag, 'data-status').toLowerCase();
    const publishDate = getAttribute(rootTag, 'data-published');
    const published = status === 'ready' && isValidPublishDate(publishDate);

    applications.push({
      name: getAttribute(rootTag, 'data-company') || slugTitle,
      slug: entry.name,
      title: html ? getPageTitle(html, slugTitle) : 'Page not created',
      hasPage: Boolean(html),
      isReady: status === 'ready',
      published,
      publishDate: published ? publishDate : '',
    });
  }

  return applications.sort((a, b) => {
    const dateA = a.publishDate || '';
    const dateB = b.publishDate || '';
    return dateB.localeCompare(dateA) || a.name.localeCompare(b.name);
  });
}

function renderRows(applications) {
  if (applications.length === 0) {
    return '';
  }

  return applications.map((application) => {
    const pageCell = application.hasPage
      ? `<a href="/spear-hunting/${encodeURIComponent(application.slug)}/">${escapeHtml(application.title)}<span class="material-symbols-rounded" aria-hidden="true">arrow_outward</span></a>`
      : escapeHtml(application.title);
    const dateCell = application.publishDate
      ? `<time datetime="${application.publishDate}">${formatDate(application.publishDate)}</time>`
      : '';

    return `              <tr>
                <td>${dateCell}</td>
                <td>${escapeHtml(application.name)}</td>
                <td>${pageCell}</td>
              </tr>`;
  }).join('\n');
}

export async function generateInventory() {
  const applications = await collectApplications();
  const html = await readFile(inventoryPath, 'utf8');
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Could not find the application list markers in spearhunting/índice/index.html.');
  }

  const rowsStart = start + startMarker.length;
  const rows = renderRows(applications);
  const updated = `${html.slice(0, rowsStart)}\n${rows}\n          ${html.slice(end)}`;
  await writeFile(inventoryPath, updated);
  console.log(`Generated spearhunting/índice/ with ${applications.length} application(s).`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  generateInventory().catch((error) => {
    console.error(`Could not generate spearhunting/índice/: ${error.message}`);
    process.exitCode = 1;
  });
}
