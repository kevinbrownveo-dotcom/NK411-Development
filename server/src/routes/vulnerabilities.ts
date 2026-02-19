import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';

// PATCH-05: severity_law avtomatik mapping
const SEVERITY_LAW_MAP: Record<string, string> = {
  'az': 'aşağı',
  'orta': 'orta',
  'yüksək': 'yüksək',
  'çox_yüksək': 'kritik',
  'kritik': 'kritik',
  'fövqəladə': 'kritik',
};

export const vulnerabilityRouter = createCrudRouter({
  table: 'vulnerabilities',
  entityType: 'boşluq',
  permissionPrefix: 'vulnerabilities',
  searchColumns: ['name', 'cve_ref'],
  beforeCreate: async (data) => {
    data.vuln_code = await generateCode('VLN');
    // Auto-map severity_law from severity_internal
    if (data.severity_internal && !data.severity_law_override) {
      data.severity_law = SEVERITY_LAW_MAP[data.severity_internal] || 'orta';
    }
    return data;
  },
  beforeUpdate: async (data, existing) => {
    // Auto-map severity_law on severity_internal change
    if (data.severity_internal && !data.severity_law_override) {
      data.severity_law = SEVERITY_LAW_MAP[data.severity_internal] || existing.severity_law;
    }
    return data;
  },
});
