/**
 * Shared utilities for the curations UX redesign.
 * Auto-slug generation and product field auto-detection.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

export function generateRuleSlug(query: string): string {
  if (!query.trim()) return '';
  return `rule-${slugify(query)}`;
}

export function generateSynonymSlug(words: string[]): string {
  const slug = words.slice(0, 4).map((w) => slugify(w)).join('-');
  return `syn-${slug}`;
}

export function generateStopwordId(locale: string): string {
  const ts = Date.now().toString(36);
  const loc = locale || 'default';
  return `ignored-words-${loc}-${ts}`;
}

const TITLE_FIELD_NAMES = ['name', 'title', 'product_name', 'product_title'];

export function detectProductNameField(fields: any[]): string | null {
  if (!fields || fields.length === 0) return null;

  for (const candidate of TITLE_FIELD_NAMES) {
    const match = fields.find(
      (f: any) => f.name.toLowerCase() === candidate && (f.type === 'string' || f.type === 'string[]'),
    );
    if (match) return match.name;
  }

  const firstString = fields.find((f: any) => f.type === 'string' && f.name !== 'id');
  return firstString?.name || null;
}

export function getProductDisplayName(doc: any, fields: any[]): string {
  if (!doc) return '';
  const nameField = detectProductNameField(fields);
  if (nameField && doc[nameField]) {
    const val = doc[nameField];
    return Array.isArray(val) ? val[0] : String(val);
  }
  return String(doc.id || '');
}

export function getProductAttributes(
  doc: any,
  fields: any[],
  max = 3,
): { label: string; value: string }[] {
  if (!doc || !fields) return [];

  const nameField = detectProductNameField(fields);
  const skipFields = new Set(['id', nameField]);
  const attrs: { label: string; value: string }[] = [];

  for (const f of fields) {
    if (attrs.length >= max) break;
    if (skipFields.has(f.name)) continue;
    if (f.name.startsWith('_')) continue;
    if (!['string', 'string[]', 'int32', 'int64', 'float', 'bool'].includes(f.type)) continue;

    const val = doc[f.name];
    if (val === null || val === undefined || val === '') continue;

    const display = Array.isArray(val) ? val.join(', ') : String(val);
    if (display.length > 100) continue;

    attrs.push({ label: f.name, value: display });
  }

  return attrs;
}

// ---- Override payload helpers ----

export interface IncludeItem {
  id: string;
  position: number;
}

export interface ExcludeItem {
  id: string;
}

export interface OverrideFormData {
  rule: { query: string; match: 'exact' | 'contains' };
  includes: IncludeItem[];
  excludes: ExcludeItem[];
  filter_by: string;
  sort_by: string;
  effective_from_ts: number | undefined;
  effective_to_ts: number | undefined;
}

export function buildOverridePayload(form: OverrideFormData, tags: string[]): any {
  const payload: any = {
    rule: { ...form.rule },
  };
  if (form.includes.length > 0) {
    payload.includes = form.includes.map((i) => ({ id: String(i.id), position: i.position }));
  }
  if (form.excludes.length > 0) {
    payload.excludes = form.excludes.map((e) => ({ id: String(e.id) }));
  }
  if (form.filter_by) {
    payload.filter_by = form.filter_by;
  }
  if (form.sort_by) {
    payload.sort_by = form.sort_by;
  }
  if (form.effective_from_ts) {
    payload.effective_from_ts = form.effective_from_ts;
  }
  if (form.effective_to_ts) {
    payload.effective_to_ts = form.effective_to_ts;
  }
  if (tags.length > 0) {
    payload.metadata = { tags };
  }
  return payload;
}

export function applyPayloadToForm(
  payload: any,
): { form: OverrideFormData; tags: string[] } {
  return {
    form: {
      rule: {
        query: payload.rule?.query || '',
        match: payload.rule?.match || 'exact',
      },
      includes: (payload.includes || []).map((i: { id: string; position: number }) => ({
        id: String(i.id),
        position: Number(i.position),
      })),
      excludes: (payload.excludes || []).map((e: { id: string }) => ({
        id: String(e.id),
      })),
      filter_by: payload.filter_by || '',
      sort_by: payload.sort_by || '',
      effective_from_ts: payload.effective_from_ts || undefined,
      effective_to_ts: payload.effective_to_ts || undefined,
    },
    tags: payload.metadata?.tags || [],
  };
}
