import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(scriptDirectory);
const pagesDirectory = path.join(repositoryDirectory, 'spear-hunting');
const templateDirectory = path.join(pagesDirectory, '_template');

function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function replaceSlugPlaceholder(html, slug) {
  return html.replaceAll('__SLUG__', slug);
}

async function updateHtmlSlugPlaceholders(directory, slug) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await updateHtmlSlugPlaceholders(entryPath, slug);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      const html = await readFile(entryPath, 'utf8');
      await writeFile(entryPath, replaceSlugPlaceholder(html, slug));
    }
  }
}

export async function createPage(slug) {
  if (!isValidSlug(slug)) {
    throw new Error('Slug must use lowercase letters, digits, and single hyphens.');
  }

  const targetDirectory = path.join(pagesDirectory, slug);
  try {
    await mkdir(targetDirectory);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Refusing to overwrite existing page: spear-hunting/${slug}/`);
    }
    throw error;
  }

  try {
    const entries = await readdir(templateDirectory, { withFileTypes: true });
    for (const entry of entries) {
      await cp(
        path.join(templateDirectory, entry.name),
        path.join(targetDirectory, entry.name),
        { recursive: true, errorOnExist: true, force: false },
      );
    }
    await updateHtmlSlugPlaceholders(targetDirectory, slug);
  } catch (error) {
    await rm(targetDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function main(args) {
  if (args.length !== 1) {
    throw new Error('Usage: node scripts/new-spear-hunting-page.mjs <lowercase-slug>');
  }
  const [slug] = args;
  if (!isValidSlug(slug)) {
    throw new Error('Slug must use lowercase letters, digits, and single hyphens.');
  }
  await createPage(slug);
  console.log(`Created spear-hunting/${slug}/ from _template.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Could not create spear-hunting page: ${error.message}`);
    process.exitCode = 1;
  });
}
