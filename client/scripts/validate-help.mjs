import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const srcRoot = path.join(root, 'src');
const helpDir = path.join(srcRoot, 'help');
const docsPath = path.join(root, 'public', 'docs', 'risk-register-law.html');

const baseRegistry = JSON.parse(fs.readFileSync(path.join(helpDir, 'field_help_registry.json'), 'utf8'));
const overrideRegistry = JSON.parse(fs.readFileSync(path.join(helpDir, 'field_help_overrides.json'), 'utf8'));
const registry = { ...baseRegistry, ...overrideRegistry };
const docHtml = fs.readFileSync(docsPath, 'utf8');

const normalize = (text) => (text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const docNormalized = normalize(docHtml);

const pageMatches = [...docHtml.matchAll(/id="page-(\d+)"/g)].map((m) => Number(m[1]));
const minPage = Math.min(...pageMatches);
const maxPage = Math.max(...pageMatches);

function collectFieldKeys(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const keys = new Set();

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      for (const key of collectFieldKeys(fullPath)) keys.add(key);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = /fieldKey="([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }

  return keys;
}

const usedKeys = [...collectFieldKeys(srcRoot)].sort();
const errors = [];

for (const fieldKey of usedKeys) {
  const entry = registry[fieldKey];
  if (!entry) {
    errors.push(`${fieldKey}: mapping yoxdur`);
    continue;
  }

  if (!entry.ui_label_az || entry.ui_label_az.trim().length < 2) {
    errors.push(`${fieldKey}: ui_label_az boş və ya qısa`);
  }
  if (!entry.help_text_az || entry.help_text_az.trim().length < 12) {
    errors.push(`${fieldKey}: help_text_az kifayət qədər izahlı deyil`);
  }
  if (!entry.legal_ref || entry.legal_ref.trim().length < 3) {
    errors.push(`${fieldKey}: legal_ref boşdur`);
  }
  if (!entry.legal_excerpt_az || entry.legal_excerpt_az.trim().length < 24) {
    errors.push(`${fieldKey}: legal_excerpt_az boş və ya çox qısadır`);
  }

  if (!Number.isInteger(entry.pdf_page) || entry.pdf_page < minPage || entry.pdf_page > maxPage) {
    errors.push(`${fieldKey}: pdf_page aralıqdan kənardır (${entry.pdf_page}, gözlənilən ${minPage}-${maxPage})`);
  }

  const terms = Array.isArray(entry.search_terms_az) && entry.search_terms_az.length > 0
    ? entry.search_terms_az
    : [entry.pdf_anchor].filter(Boolean);

  if (terms.length === 0) {
    errors.push(`${fieldKey}: axtarış termini yoxdur`);
    continue;
  }

  const hasHit = terms.some((term) => {
    const normalized = normalize(term);
    return normalized.length > 0 && docNormalized.includes(normalized);
  });

  if (!hasHit) {
    errors.push(`${fieldKey}: search_terms sənəddə tapılmadı (${terms.join(' | ')})`);
  }
}

if (errors.length > 0) {
  console.error('Help mapping validasiya xətaları:');
  errors.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Help mapping validasiyası uğurludur. Yoxlanılan key sayı: ${usedKeys.length}`);