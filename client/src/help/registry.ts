import registry from './field_help_registry.json';

export interface FieldHelpEntry {
  ui_label_az: string;
  help_text_az: string;
  allowed_values: string[] | null;
  legal_ref: string;
  pdf_page: number;
  pdf_anchor: string;
  legal_excerpt_az?: string;
  example_az?: string;
}

const typedRegistry = registry as Record<string, FieldHelpEntry>;

export function getFieldHelp(fieldKey: string): FieldHelpEntry | null {
  return typedRegistry[fieldKey] ?? null;
}
