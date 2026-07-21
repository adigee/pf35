#!/usr/bin/env node
/* ─────────────────────────────────────────
   CASE-STUDY LOCKER
   Encrypts the sections of a case-study page so the content is
   genuinely withheld from view-source. The password decrypts it
   client-side in the browser (components/case-study.js).

   Encryption:  AES-256-GCM, key = PBKDF2(password, salt, SHA-256).
   The exact same primitives are used to decrypt in the browser via
   the Web Crypto API — keep the two in sync (see case-study.js).

   Editing a gated page later — the cycle is:
       node tools/lock.mjs unlock <page>.html "<password>"   ← restore editable HTML
       …edit the sections in <page>.html normally…
       node tools/lock.mjs lock   <page>.html "<password>"   ← re-encrypt

   Commands
     lock    — encrypt a page's sections for the first time. Also saves a
               plaintext copy to .context/<page>.plain.html (gitignored).
     unlock  — decrypt a locked page back to editable HTML (needs the password).
     relock  — re-encrypt from .context/<page>.plain.html without touching
               the page's current ciphertext (handy after editing that copy).

   Nothing here ships to the browser; only the JSON payload it writes into
   the page does. Keep the .context/*.plain.html copies (and the password) safe.
───────────────────────────────────────── */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ITERS = 200000;                    // PBKDF2 rounds — matches case-study.js
const START = '<section class="cs-section"';   // matches both `">` and `" id="…">`
const FOOTER = '<div data-component="cs-footer">';
const MOUNT = '<div id="cs-locked-mount"></div>';

function encrypt(plaintext, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ITERS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Web Crypto expects the GCM tag appended to the ciphertext.
  const ct = Buffer.concat([body, tag]);
  return {
    v: 1,
    iters: ITERS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
  };
}

// Inverse of encrypt(); throws on a wrong password (GCM tag mismatch).
function decrypt(payload, password) {
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const ctFull = Buffer.from(payload.ct, 'base64');
  const ct = ctFull.subarray(0, ctFull.length - 16);
  const tag = ctFull.subarray(ctFull.length - 16);
  const key = pbkdf2Sync(password, salt, payload.iters, 32, 'sha256');
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

// Bounds of the injected block: from the "<!-- ── GATED CONTENT" comment
// through the closing </script>, plus the payload JSON it contains.
function payloadBounds(html) {
  const mount = html.indexOf(MOUNT);
  if (mount === -1) return null;
  const dataIdx = html.indexOf('id="cs-locked-data"');
  const end = html.indexOf('</script>', dataIdx) + '</script>'.length;
  const comment = html.lastIndexOf('<!-- ── GATED CONTENT', mount);
  const jsonStart = html.indexOf('>', dataIdx) + 1;
  const jsonEnd = html.lastIndexOf('</script>', end);
  return {
    from: comment === -1 ? mount : comment,
    end,
    payload: JSON.parse(html.slice(jsonStart, jsonEnd).trim()),
  };
}

function payloadBlock(payload) {
  return (
    '        <!-- ── GATED CONTENT ──\n' +
    '             The sections below the hero are AES-256-GCM encrypted; the password\n' +
    '             decrypts them client-side (see components/case-study.js). View-source\n' +
    '             shows only ciphertext. Edit via: tools/lock.mjs unlock <page> "<pw>". -->\n' +
    '        ' + MOUNT + '\n' +
    '        <script type="application/json" id="cs-locked-data">\n' +
    '        ' + JSON.stringify(payload) + '\n' +
    '        </script>'
  );
}

function plainPath(file) {
  return join('.context', basename(file).replace(/\.html$/, '') + '.plain.html');
}

function lock(file, password) {
  const html = readFileSync(file, 'utf8');
  if (html.includes(MOUNT)) {
    console.error(`✗ ${file} is already locked. Use "relock" to update it.`);
    process.exit(1);
  }
  const a = html.indexOf(START);
  const footerIdx = html.indexOf(FOOTER);
  if (a === -1 || footerIdx === -1) {
    console.error('✗ Could not find <section class="cs-section"> … cs-footer region.');
    process.exit(1);
  }
  const lastEnd = html.lastIndexOf('</section>', footerIdx) + '</section>'.length;
  const sections = html.slice(a, lastEnd);

  if (!existsSync('.context')) mkdirSync('.context', { recursive: true });
  writeFileSync(plainPath(file), sections);

  // Drop the section's own indentation before the block (payloadBlock is self-indented).
  const before = html.slice(0, a).replace(/[ \t]+$/, '');
  const next = before + payloadBlock(encrypt(sections, password)) + html.slice(lastEnd);
  writeFileSync(file, next);
  console.log(`✓ Locked ${file}`);
  console.log(`  plaintext saved to ${plainPath(file)} (gitignored)`);
}

function relock(file, password) {
  const html = readFileSync(file, 'utf8');
  const plain = plainPath(file);
  if (!existsSync(plain)) {
    console.error(`✗ No ${plain}. Run "lock" first, or restore the plaintext there.`);
    process.exit(1);
  }
  const sections = readFileSync(plain, 'utf8');
  const bounds = payloadBounds(html);
  if (!bounds) {
    console.error(`✗ ${file} has no lock to replace. Use "lock".`);
    process.exit(1);
  }
  const before = html.slice(0, bounds.from).replace(/[ \t]+$/, '');
  const next = before + payloadBlock(encrypt(sections, password)) + html.slice(bounds.end);
  writeFileSync(file, next);
  console.log(`✓ Re-locked ${file} from ${plain}`);
}

function unlock(file, password) {
  const html = readFileSync(file, 'utf8');
  const bounds = payloadBounds(html);
  if (!bounds) {
    console.error(`✗ ${file} is not locked (no encrypted payload found).`);
    process.exit(1);
  }
  let sections;
  try { sections = decrypt(bounds.payload, password); }
  catch { console.error('✗ Wrong password — could not decrypt.'); process.exit(1); }

  // Restore the editable page: put the plaintext sections back where the block was.
  const before = html.slice(0, bounds.from).replace(/[ \t]+$/, '');
  const next = before + '        ' + sections + html.slice(bounds.end);
  writeFileSync(file, next);
  if (existsSync('.context')) writeFileSync(plainPath(file), sections);
  console.log(`✓ Unlocked ${file} — sections are editable again. Re-lock when done:`);
  console.log(`    node tools/lock.mjs lock ${file} "<password>"`);
}

const [mode, file, password] = process.argv.slice(2);
const commands = { lock, unlock, relock };
if (!commands[mode] || !file || !password) {
  console.error('Usage: node tools/lock.mjs <lock|unlock|relock> <page>.html "<password>"');
  process.exit(1);
}
commands[mode](file, password);
