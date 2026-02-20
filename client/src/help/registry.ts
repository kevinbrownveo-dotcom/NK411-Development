import registry from './field_help_registry.json';
import overrides from './field_help_overrides.json';

export interface FieldHelpEntry {
  ui_label_az: string;
  help_text_az: string;
  allowed_values: string[] | null;
  legal_ref: string;
  pdf_page: number;
  pdf_anchor: string;
  search_terms_az?: string[];
  legal_excerpt_az?: string;
  example_az?: string;
}

const typedRegistry = {
  ...(registry as Record<string, FieldHelpEntry>),
  ...(overrides as Record<string, FieldHelpEntry>),
};

export interface NormalizedFieldHelpEntry extends FieldHelpEntry {
  search_terms_az: string[];
}

function normalizeEntry(entry: FieldHelpEntry): NormalizedFieldHelpEntry {
  const terms = (entry.search_terms_az && entry.search_terms_az.length > 0)
    ? entry.search_terms_az
    : [entry.pdf_anchor].filter(Boolean);

  return {
    ...entry,
    search_terms_az: terms,
  };
}

export function getFieldHelp(fieldKey: string): NormalizedFieldHelpEntry | null {
  const entry = typedRegistry[fieldKey];
  if (!entry) return null;
  return normalizeEntry(entry);
}
