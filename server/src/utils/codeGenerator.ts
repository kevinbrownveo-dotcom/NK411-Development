import db from '../config/database';

type EntityPrefix = 'AST' | 'THR' | 'VLN' | 'RSK' | 'INC' | 'SOL' | 'REQ';

const tableMap: Record<EntityPrefix, { table: string; column: string }> = {
  AST: { table: 'assets', column: 'asset_code' },
  THR: { table: 'threats', column: 'threat_code' },
  VLN: { table: 'vulnerabilities', column: 'vuln_code' },
  RSK: { table: 'risks', column: 'risk_code' },
  INC: { table: 'incidents', column: 'incident_code' },
  SOL: { table: 'solutions', column: 'solution_code' },
  REQ: { table: 'requirements', column: 'req_code' },
};

export async function generateCode(prefix: EntityPrefix): Promise<string> {
  const year = new Date().getFullYear();
  const { table, column } = tableMap[prefix];
  const pattern = `${prefix}-${year}-%`;

  const result = await db(table)
    .where(column, 'like', pattern)
    .orderBy(column, 'desc')
    .first();

  let nextNum = 1;
  if (result) {
    const lastCode = result[column] as string;
    const lastNum = parseInt(lastCode.split('-').pop() || '0');
    nextNum = lastNum + 1;
  }

  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}
