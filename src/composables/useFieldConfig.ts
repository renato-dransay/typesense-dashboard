import { ref, watch, type Ref } from 'vue';

const STORAGE_PREFIX = 'ts-dashboard-field-config-';
const IMAGE_FIELD_NAMES = ['image', 'image_url', 'thumbnail', 'image_src', 'img', 'photo', 'picture'];

export interface FieldConfigEntry {
  name: string;
  visible: boolean;
}

export function detectImageField(fields: any[]): string | null {
  if (!fields) return null;
  for (const candidate of IMAGE_FIELD_NAMES) {
    const match = fields.find(
      (f: any) => f.name.toLowerCase() === candidate && (f.type === 'string' || f.type === 'string[]'),
    );
    if (match) return match.name;
  }
  return null;
}

export function useFieldConfig(collectionName: Ref<string>) {
  const visibleFields = ref<string[]>([]);
  const allFields = ref<FieldConfigEntry[]>([]);

  function storageKey() {
    return `${STORAGE_PREFIX}${collectionName.value}`;
  }

  function loadConfig(schemaFields: any[]) {
    const eligible = schemaFields.filter(
      (f: any) => f.name !== 'id' && !f.name.startsWith('_') && !f.name.includes('.*'),
    );

    const saved = localStorage.getItem(storageKey());
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        const existing = new Set(eligible.map((f: any) => f.name));
        const valid = parsed.filter((name) => existing.has(name));
        if (valid.length > 0) {
          visibleFields.value = valid;
          allFields.value = eligible.map((f: any) => ({
            name: f.name,
            visible: valid.includes(f.name),
          }));
          return;
        }
      } catch {
        // Fall through to defaults
      }
    }

    const defaults = eligible.slice(0, 5).map((f: any) => f.name);
    visibleFields.value = defaults;
    allFields.value = eligible.map((f: any) => ({
      name: f.name,
      visible: defaults.includes(f.name),
    }));
  }

  function saveConfig(fields: FieldConfigEntry[]) {
    allFields.value = fields;
    visibleFields.value = fields.filter((f) => f.visible).map((f) => f.name);
    localStorage.setItem(storageKey(), JSON.stringify(visibleFields.value));
  }

  watch(collectionName, () => {
    visibleFields.value = [];
    allFields.value = [];
  });

  return {
    visibleFields,
    allFields,
    loadConfig,
    saveConfig,
    detectImageField,
  };
}
