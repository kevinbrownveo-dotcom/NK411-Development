const CLAUSE_PATTERN = /^\s*(\d+(?:\.\d+)+)\./;

let cachedLawLinesPromise: Promise<string[]> | null = null;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

async function loadLawLines(): Promise<string[]> {
  if (!cachedLawLinesPromise) {
    cachedLawLinesPromise = fetch('/docs/risk-register-law.html')
      .then((res) => {
        if (!res.ok) throw new Error('Qanun sənədi yüklənmədi');
        return res.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const preBlocks = Array.from(doc.querySelectorAll('.page pre'));
        const text = preBlocks.map((node) => node.textContent || '').join('\n');
        return text
          .split(/\r?\n/)
          .map(normalizeLine)
          .filter(Boolean);
      })
      .catch(() => []);
  }

  return cachedLawLinesPromise;
}

function extractClause(lines: string[], clauseId: string): string | null {
  const startIndex = lines.findIndex((line) => line.startsWith(`${clauseId}.`));
  if (startIndex === -1) return null;

  const collected: string[] = [lines[startIndex]];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(CLAUSE_PATTERN);
    if (match) break;
    collected.push(line);
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim();
}

export async function getClauseTexts(clauseIds: string[]): Promise<Record<string, string | null>> {
  const lines = await loadLawLines();
  const uniqueIds = Array.from(new Set(clauseIds));

  const result: Record<string, string | null> = {};
  for (const clauseId of uniqueIds) {
    result[clauseId] = extractClause(lines, clauseId);
  }

  return result;
}

export function extractClauseIds(legalRef: string): string[] {
  const matches = legalRef.match(/\d+(?:\.\d+)+/g);
  return matches ? Array.from(new Set(matches)) : [];
}
