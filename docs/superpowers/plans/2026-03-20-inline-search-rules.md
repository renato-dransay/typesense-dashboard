# Inline Search Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the InstantSearch tab with a custom search that supports inline creation of Typesense overrides (search rules) with live preview, configurable result fields, and pin/hide actions.

**Architecture:** Three composables (`useCustomSearch`, `useRuleEditor`, `useFieldConfig`) manage state. `SearchCustom.vue` orchestrates the layout (left facet panel, center results, right rule drawer). The rule drawer reuses existing `FilterBuilder` and `SortBuilder`. The Overrides page stays as-is.

**Tech Stack:** Vue 3, Quasar 2, Pinia, TypeScript, Typesense JS SDK

**Verification:** No test framework exists. Each task must pass `npm run lint` and `npm run type-check`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/composables/useCustomSearch.ts` | Create | Search state, API calls, debounce, facet/filter/sort management |
| `src/composables/useFieldConfig.ts` | Create | Per-collection field visibility config, localStorage persistence |
| `src/composables/useRuleEditor.ts` | Create | Rule creation/editing state, preview logic, payload building, save |
| `src/components/search/SearchCustom.vue` | Create | Main orchestrator — layout, wires composables to child components |
| `src/components/search/SearchResultCard.vue` | Create | Configurable result card with pin/hide actions and visual states |
| `src/components/search/SearchFacetPanel.vue` | Create | Left sidebar — dynamic facets from collection schema |
| `src/components/search/SearchToolbar.vue` | Create | Hits count, sort, per-page, "Create Rule" button |
| `src/components/search/SearchActiveFilters.vue` | Create | Removable filter chips above results |
| `src/components/search/SearchBulkActions.vue` | Create | Multi-select toolbar for bulk pin/hide |
| `src/components/search/SearchFieldConfig.vue` | Create | Dialog for choosing/reordering visible result fields |
| `src/components/search/RuleDrawer.vue` | Create | Right drawer — full rule settings form |
| `src/shared/curations-utils.ts` | Modify | Extract `buildOverridePayload` + `applyPayloadToForm` here |
| `src/pages/OverridesVisual.vue` | Modify | Import extracted functions instead of inline definitions |
| `src/pages/Search.vue` | Modify | Replace `SearchInstantSearch` with `SearchCustom`, pass `ruleId` |

---

### Task 1: Extract `buildOverridePayload` and `applyPayloadToForm` into shared utils

**Files:**
- Modify: `src/shared/curations-utils.ts`
- Modify: `src/pages/OverridesVisual.vue:536-579`

- [ ] **Step 1: Add shared types and functions to curations-utils.ts**

Add to the end of `src/shared/curations-utils.ts`:

```ts
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
```

- [ ] **Step 2: Update OverridesVisual.vue to use extracted functions**

In `src/pages/OverridesVisual.vue`:

1. Update imports (around line 432):
```ts
import {
  generateRuleSlug,
  getProductDisplayName,
  buildOverridePayload,
  applyPayloadToForm,
  type IncludeItem,
  type ExcludeItem,
} from 'src/shared/curations-utils';
```

2. Remove the local `IncludeItem` and `ExcludeItem` interfaces (lines 441-447).

3. Replace the local `buildOverridePayload()` function (lines 536-562) with a call to the shared one:
```ts
function buildPayload(): any {
  return buildOverridePayload(overrideForm, tags.value);
}
```

4. Replace the local `applyPayloadToForm(payload)` function (lines 564-579):
```ts
function applyPayload(payload: any) {
  const result = applyPayloadToForm(payload);
  Object.assign(overrideForm, result.form);
  // Preserve the existing id since applyPayloadToForm doesn't handle it
  tags.value = result.tags;
}
```

5. Update all call sites: `buildOverridePayload()` → `buildPayload()`, and the old `applyPayloadToForm(p)` → `applyPayload(p)`.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/curations-utils.ts src/pages/OverridesVisual.vue
git commit -m "refactor: extract buildOverridePayload into shared curations-utils"
```

---

### Task 2: Create `useFieldConfig` composable

**Files:**
- Create: `src/composables/useFieldConfig.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useFieldConfig.ts`:

```ts
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
        // Filter out fields that no longer exist in schema
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

    // Default: first 5 non-id fields
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

  // Reset when collection changes
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
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useFieldConfig.ts
git commit -m "feat: add useFieldConfig composable for result card field visibility"
```

---

### Task 3: Create `useCustomSearch` composable

**Files:**
- Create: `src/composables/useCustomSearch.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useCustomSearch.ts`:

```ts
import { ref, computed, watch, type Ref } from 'vue';
import { useNodeStore } from 'src/stores/node';

export interface FacetFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean';
}

export interface FacetCount {
  field_name: string;
  counts: { value: string; count: number }[];
  stats?: { min: number; max: number; avg: number; sum: number };
}

export interface ActiveFilter {
  field: string;
  value: string;
  /** For numeric range filters */
  type: 'value' | 'range';
  min?: number;
  max?: number;
}

export function useCustomSearch(collectionName: Ref<string>) {
  const store = useNodeStore();

  // Search state
  const query = ref('');
  const filters = ref<ActiveFilter[]>([]);
  const sort = ref('');
  const page = ref(1);
  const perPage = ref(12);
  const results = ref<any[]>([]);
  const totalHits = ref(0);
  const searchTimeMs = ref(0);
  const facetCounts = ref<FacetCount[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Derive query_by from collection schema
  const queryByFields = computed(() => {
    const fields = store.currentCollection?.fields;
    if (!fields) return '*';
    const stringFields = (fields as any[])
      .filter((f: any) => f.index !== false && ['string', 'string[]'].includes(f.type) && !f.name.includes('.*'))
      .map((f: any) => f.name);
    return stringFields.length > 0 ? stringFields.join(',') : '*';
  });

  // Derive facetable fields from schema
  const facetFields = computed((): FacetFieldInfo[] => {
    const fields = store.currentCollection?.fields;
    if (!fields) return [];
    return (fields as any[])
      .filter((f: any) => f.facet && !f.name.includes('.*'))
      .map((f: any) => {
        let type: 'string' | 'number' | 'boolean' = 'string';
        if (['int32', 'int64', 'float', 'int32[]', 'int64[]', 'float[]'].includes(f.type)) {
          type = 'number';
        } else if (['bool', 'bool[]'].includes(f.type)) {
          type = 'boolean';
        }
        return { name: f.name, type };
      });
  });

  // Derive sortable fields from schema
  const sortableFields = computed(() => {
    const fields = store.currentCollection?.fields;
    if (!fields) return [];
    return (fields as any[])
      .filter(
        (f: any) =>
          ['int32', 'int64', 'float'].includes(f.type) || (f.type === 'string' && f.sort),
      )
      .map((f: any) => f.name);
  });

  // Build filter_by string from active filters
  const filterByString = computed(() => {
    if (filters.value.length === 0) return '';
    return filters.value
      .map((f) => {
        if (f.type === 'range') {
          const parts: string[] = [];
          if (f.min !== undefined) parts.push(`${f.field}:>=${f.min}`);
          if (f.max !== undefined) parts.push(`${f.field}:<=${f.max}`);
          return parts.join(' && ');
        }
        return `${f.field}:=${f.value}`;
      })
      .filter(Boolean)
      .join(' && ');
  });

  // Build facet_by string
  const facetByString = computed(() => {
    return facetFields.value.map((f) => f.name).join(',');
  });

  async function search() {
    if (!store.currentCollection) return;

    loading.value = true;
    error.value = null;

    try {
      const params: any = {
        q: query.value || '*',
        query_by: queryByFields.value,
        page: page.value,
        per_page: perPage.value,
      };

      if (facetByString.value) {
        params.facet_by = facetByString.value;
      }
      if (filterByString.value) {
        params.filter_by = filterByString.value;
      }
      if (sort.value) {
        params.sort_by = sort.value;
      }

      const res = await store.search(params);

      results.value = res?.hits?.map((h: any) => h.document) || [];
      totalHits.value = res?.found || 0;
      searchTimeMs.value = res?.search_time_ms || 0;
      facetCounts.value = res?.facet_counts || [];
    } catch (err) {
      error.value = (err as Error).message;
      results.value = [];
      totalHits.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function debouncedSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void search(), 300);
  }

  function immediateSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    void search();
  }

  // Filter management
  function setFilter(filter: ActiveFilter) {
    // Remove existing filter for same field+value, then add
    filters.value = filters.value.filter(
      (f) => !(f.field === filter.field && f.value === filter.value && f.type === 'value'),
    );
    // For range filters, replace existing range for same field
    if (filter.type === 'range') {
      filters.value = filters.value.filter((f) => !(f.field === filter.field && f.type === 'range'));
    }
    filters.value.push(filter);
    page.value = 1;
    immediateSearch();
  }

  function removeFilter(field: string, value?: string) {
    if (value !== undefined) {
      filters.value = filters.value.filter((f) => !(f.field === field && f.value === value));
    } else {
      filters.value = filters.value.filter((f) => f.field !== field);
    }
    page.value = 1;
    immediateSearch();
  }

  function clearFilters() {
    filters.value = [];
    page.value = 1;
    immediateSearch();
  }

  function setSort(sortBy: string) {
    sort.value = sortBy;
    page.value = 1;
    immediateSearch();
  }

  function setPage(p: number) {
    page.value = p;
    immediateSearch();
  }

  function setPerPage(pp: number) {
    perPage.value = pp;
    page.value = 1;
    immediateSearch();
  }

  // Watch query for debounced search
  watch(query, () => {
    page.value = 1;
    debouncedSearch();
  });

  // Reset on collection change
  watch(collectionName, () => {
    query.value = '';
    filters.value = [];
    sort.value = '';
    page.value = 1;
    results.value = [];
    totalHits.value = 0;
    facetCounts.value = [];
    error.value = null;
  });

  return {
    // State
    query,
    filters,
    sort,
    page,
    perPage,
    results,
    totalHits,
    searchTimeMs,
    facetCounts,
    loading,
    error,
    // Computed
    queryByFields,
    facetFields,
    sortableFields,
    filterByString,
    // Methods
    search,
    setFilter,
    removeFilter,
    clearFilters,
    setSort,
    setPage,
    setPerPage,
  };
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useCustomSearch.ts
git commit -m "feat: add useCustomSearch composable for direct Typesense API search"
```

---

### Task 4: Create `useRuleEditor` composable

**Files:**
- Create: `src/composables/useRuleEditor.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useRuleEditor.ts`:

```ts
import { ref, computed, type Ref } from 'vue';
import { useNodeStore } from 'src/stores/node';
import {
  generateRuleSlug,
  buildOverridePayload,
  applyPayloadToForm,
  type IncludeItem,
  type ExcludeItem,
  type OverrideFormData,
} from 'src/shared/curations-utils';
import type { ActiveFilter } from './useCustomSearch';

export type RuleMode = 'off' | 'creating' | 'editing';

export function useRuleEditor(collectionName: Ref<string>) {
  const store = useNodeStore();

  // Mode
  const mode = ref<RuleMode>('off');
  const isActive = computed(() => mode.value !== 'off');

  // Rule form state
  const ruleId = ref('');
  const ruleName = ref('');
  const matchType = ref<'exact' | 'contains'>('exact');
  const triggerQuery = ref('');
  const triggerFilters = ref('');
  const injectedFilter = ref('');
  const injectedSort = ref('');
  const effectiveFromTs = ref<number | undefined>(undefined);
  const effectiveToTs = ref<number | undefined>(undefined);
  const tags = ref<string[]>([]);
  const pinnedProducts = ref<IncludeItem[]>([]);
  const hiddenProducts = ref<ExcludeItem[]>([]);

  // Selection state
  const selectedIds = ref<Set<string>>(new Set());

  function enterCreateMode(query: string, filterByString: string) {
    mode.value = 'creating';
    triggerQuery.value = query;
    triggerFilters.value = filterByString;
    matchType.value = 'exact';
    ruleId.value = generateRuleSlug(query) || `rule-${Date.now()}`;
    ruleName.value = ruleId.value;
    injectedFilter.value = '';
    injectedSort.value = '';
    effectiveFromTs.value = undefined;
    effectiveToTs.value = undefined;
    tags.value = [];
    pinnedProducts.value = [];
    hiddenProducts.value = [];
    selectedIds.value = new Set();
  }

  function enterEditMode(overrideId: string) {
    const overrides = store.data.overrides || [];
    const override = overrides.find((o: any) => o.id === overrideId);
    if (!override) return false;

    mode.value = 'editing';
    ruleId.value = overrideId;

    const { form, tags: parsedTags } = applyPayloadToForm(override);
    triggerQuery.value = form.rule.query;
    matchType.value = form.rule.match;
    triggerFilters.value = '';
    pinnedProducts.value = form.includes;
    hiddenProducts.value = form.excludes;
    injectedFilter.value = form.filter_by;
    injectedSort.value = form.sort_by;
    effectiveFromTs.value = form.effective_from_ts;
    effectiveToTs.value = form.effective_to_ts;
    tags.value = parsedTags;
    ruleName.value = overrideId;
    selectedIds.value = new Set();

    return true;
  }

  function exitMode() {
    mode.value = 'off';
    ruleId.value = '';
    ruleName.value = '';
    triggerQuery.value = '';
    triggerFilters.value = '';
    matchType.value = 'exact';
    injectedFilter.value = '';
    injectedSort.value = '';
    effectiveFromTs.value = undefined;
    effectiveToTs.value = undefined;
    tags.value = [];
    pinnedProducts.value = [];
    hiddenProducts.value = [];
    selectedIds.value = new Set();
  }

  // Pin/hide operations
  function pinProduct(id: string, position: number) {
    // Remove if already pinned
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
    // Also remove from hidden
    hiddenProducts.value = hiddenProducts.value.filter((p) => p.id !== id);
    pinnedProducts.value.push({ id, position });
    pinnedProducts.value.sort((a, b) => a.position - b.position);
  }

  function unpinProduct(id: string) {
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
  }

  function hideProduct(id: string) {
    // Remove from pinned
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
    // Add to hidden if not already
    if (!hiddenProducts.value.some((p) => p.id === id)) {
      hiddenProducts.value.push({ id });
    }
  }

  function unhideProduct(id: string) {
    hiddenProducts.value = hiddenProducts.value.filter((p) => p.id !== id);
  }

  // Bulk operations
  function pinSelected(startPosition: number) {
    let pos = startPosition;
    for (const id of selectedIds.value) {
      pinProduct(id, pos);
      pos++;
    }
    selectedIds.value = new Set();
  }

  function hideSelected() {
    for (const id of selectedIds.value) {
      hideProduct(id);
    }
    selectedIds.value = new Set();
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function clearSelection() {
    selectedIds.value = new Set();
  }

  function clearPinsAndHides() {
    pinnedProducts.value = [];
    hiddenProducts.value = [];
  }

  // Preview: rearrange results with pins/hides applied
  function applyPreview(rawResults: any[]): any[] {
    const hiddenIds = new Set(hiddenProducts.value.map((p) => p.id));
    // Filter out hidden
    let filtered = rawResults.filter((doc) => !hiddenIds.has(String(doc.id)));
    // Also filter out pinned (we'll re-insert them at their positions)
    const pinnedIds = new Set(pinnedProducts.value.map((p) => p.id));
    filtered = filtered.filter((doc) => !pinnedIds.has(String(doc.id)));

    // Insert pinned at their positions
    const sorted = [...pinnedProducts.value].sort((a, b) => a.position - b.position);
    for (const pin of sorted) {
      const pos = Math.max(0, pin.position - 1);
      const pinnedDoc = rawResults.find((doc) => String(doc.id) === pin.id)
        || { id: pin.id, _pinned: true };
      filtered.splice(pos, 0, { ...pinnedDoc, _pinned: true });
    }

    return filtered;
  }

  // Build payload for saving
  function buildPayload(): { id: string; payload: any } {
    const formData: OverrideFormData = {
      rule: { query: triggerQuery.value, match: matchType.value },
      includes: pinnedProducts.value,
      excludes: hiddenProducts.value,
      filter_by: injectedFilter.value,
      sort_by: injectedSort.value,
      effective_from_ts: effectiveFromTs.value,
      effective_to_ts: effectiveToTs.value,
    };
    return {
      id: ruleId.value,
      payload: buildOverridePayload(formData, tags.value),
    };
  }

  async function save(): Promise<boolean> {
    try {
      const { id, payload } = buildPayload();
      await store.createOverride({ id, override: payload });
      exitMode();
      return true;
    } catch {
      return false;
    }
  }

  return {
    // State
    mode,
    isActive,
    ruleId,
    ruleName,
    matchType,
    triggerQuery,
    triggerFilters,
    injectedFilter,
    injectedSort,
    effectiveFromTs,
    effectiveToTs,
    tags,
    pinnedProducts,
    hiddenProducts,
    selectedIds,
    // Methods
    enterCreateMode,
    enterEditMode,
    exitMode,
    pinProduct,
    unpinProduct,
    hideProduct,
    unhideProduct,
    pinSelected,
    hideSelected,
    toggleSelection,
    clearSelection,
    clearPinsAndHides,
    applyPreview,
    buildPayload,
    save,
  };
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useRuleEditor.ts
git commit -m "feat: add useRuleEditor composable for inline rule creation/editing"
```

---

### Task 5: Create `SearchFacetPanel` component

**Files:**
- Create: `src/components/search/SearchFacetPanel.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchFacetPanel.vue`:

```vue
<template>
  <div class="search-facet-panel">
    <div v-for="facet in facetFields" :key="facet.name" class="q-mb-md">
      <div class="text-subtitle2 q-mb-xs">{{ facet.name }}</div>

      <!-- String facets: checkbox list with search -->
      <template v-if="facet.type === 'string'">
        <q-input
          v-if="getFacetValues(facet.name).length > 5"
          v-model="facetSearches[facet.name]"
          dense
          outlined
          placeholder="Search..."
          class="q-mb-xs"
          clearable
        />
        <div
          v-for="item in getFilteredFacetValues(facet.name)"
          :key="item.value"
          class="q-ml-sm"
        >
          <q-checkbox
            :model-value="isSelected(facet.name, item.value)"
            :label="`${item.value} (${item.count})`"
            dense
            @update:model-value="(checked: boolean) => onToggleFacet(facet.name, item.value, checked)"
          />
        </div>
        <div v-if="getFilteredFacetValues(facet.name).length === 0" class="text-grey q-ml-sm text-caption">
          No values
        </div>
      </template>

      <!-- Number facets: range inputs -->
      <template v-else-if="facet.type === 'number'">
        <div class="row q-gutter-sm q-ml-sm">
          <q-input
            v-model.number="rangeInputs[facet.name + '_min']"
            type="number"
            dense
            outlined
            label="Min"
            class="col"
            @change="onRangeChange(facet.name)"
          />
          <q-input
            v-model.number="rangeInputs[facet.name + '_max']"
            type="number"
            dense
            outlined
            label="Max"
            class="col"
            @change="onRangeChange(facet.name)"
          />
        </div>
      </template>

      <!-- Boolean facets: toggle -->
      <template v-else-if="facet.type === 'boolean'">
        <div class="q-ml-sm">
          <q-checkbox
            :model-value="isSelected(facet.name, 'true')"
            label="true"
            dense
            @update:model-value="(checked: boolean) => onToggleFacet(facet.name, 'true', checked)"
          />
          <q-checkbox
            :model-value="isSelected(facet.name, 'false')"
            label="false"
            dense
            @update:model-value="(checked: boolean) => onToggleFacet(facet.name, 'false', checked)"
          />
        </div>
      </template>

      <q-separator class="q-mt-sm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import type { FacetFieldInfo, FacetCount, ActiveFilter } from 'src/composables/useCustomSearch';

const props = defineProps<{
  facetFields: FacetFieldInfo[];
  facetCounts: FacetCount[];
  activeFilters: ActiveFilter[];
}>();

const emit = defineEmits<{
  setFilter: [filter: ActiveFilter];
  removeFilter: [field: string, value?: string];
}>();

const facetSearches = reactive<Record<string, string>>({});
const rangeInputs = reactive<Record<string, number | undefined>>({});

function getFacetValues(fieldName: string) {
  const fc = props.facetCounts.find((f) => f.field_name === fieldName);
  return fc?.counts || [];
}

function getFilteredFacetValues(fieldName: string) {
  const values = getFacetValues(fieldName);
  const search = facetSearches[fieldName]?.toLowerCase();
  if (!search) return values;
  return values.filter((v) => v.value.toLowerCase().includes(search));
}

function isSelected(field: string, value: string) {
  return props.activeFilters.some((f) => f.field === field && f.value === value && f.type === 'value');
}

function onToggleFacet(field: string, value: string, checked: boolean) {
  if (checked) {
    emit('setFilter', { field, value, type: 'value' });
  } else {
    emit('removeFilter', field, value);
  }
}

function onRangeChange(field: string) {
  const min = rangeInputs[field + '_min'];
  const max = rangeInputs[field + '_max'];
  if (min === undefined && max === undefined) {
    emit('removeFilter', field);
    return;
  }
  emit('setFilter', { field, value: `${min ?? '*'}-${max ?? '*'}`, type: 'range', min, max });
}
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchFacetPanel.vue
git commit -m "feat: add SearchFacetPanel component with dynamic facets"
```

---

### Task 6: Create `SearchActiveFilters` component

**Files:**
- Create: `src/components/search/SearchActiveFilters.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchActiveFilters.vue`:

```vue
<template>
  <div v-if="filters.length > 0" class="row items-center q-gutter-sm q-mb-sm">
    <q-chip
      v-for="(filter, index) in filters"
      :key="index"
      removable
      color="primary"
      text-color="white"
      size="sm"
      @remove="$emit('removeFilter', filter.field, filter.type === 'value' ? filter.value : undefined)"
    >
      <strong>{{ filter.field }}:</strong>&nbsp;
      <span v-if="filter.type === 'range'">{{ filter.min ?? '*' }} – {{ filter.max ?? '*' }}</span>
      <span v-else>{{ filter.value }}</span>
    </q-chip>
    <q-btn flat dense size="sm" label="Clear all" color="negative" @click="$emit('clearFilters')" />
  </div>
</template>

<script setup lang="ts">
import type { ActiveFilter } from 'src/composables/useCustomSearch';

defineProps<{
  filters: ActiveFilter[];
}>();

defineEmits<{
  removeFilter: [field: string, value?: string];
  clearFilters: [];
}>();
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchActiveFilters.vue
git commit -m "feat: add SearchActiveFilters chip component"
```

---

### Task 7: Create `SearchToolbar` component

**Files:**
- Create: `src/components/search/SearchToolbar.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchToolbar.vue`:

```vue
<template>
  <div class="row items-center q-gutter-sm q-mb-md">
    <!-- Hits info -->
    <div class="text-body2 text-grey-7">
      {{ totalHits }} results
      <span v-if="searchTimeMs">({{ searchTimeMs }}ms)</span>
    </div>

    <q-space />

    <!-- Sort -->
    <q-select
      :model-value="sort"
      :options="sortOptions"
      label="Sort by"
      dense
      outlined
      emit-value
      map-options
      style="min-width: 180px"
      @update:model-value="(val: string) => $emit('updateSort', val)"
    />

    <!-- Per page -->
    <q-select
      :model-value="perPage"
      :options="perPageOptions"
      label="Per page"
      dense
      outlined
      emit-value
      map-options
      style="min-width: 100px"
      @update:model-value="(val: number) => $emit('updatePerPage', val)"
    />

    <!-- Create Rule button -->
    <q-btn
      v-if="!ruleActive"
      color="primary"
      icon="sym_s_auto_fix"
      label="Create Rule"
      dense
      no-caps
      :disable="!hasQuery"
      @click="$emit('createRule')"
    />
    <q-btn
      v-else
      color="negative"
      icon="sym_s_close"
      label="Cancel Rule"
      dense
      no-caps
      @click="$emit('cancelRule')"
    />

    <!-- Field config -->
    <q-btn flat round dense icon="sym_s_settings" @click="$emit('openFieldConfig')">
      <q-tooltip>Configure visible fields</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  totalHits: number;
  searchTimeMs: number;
  sort: string;
  perPage: number;
  sortableFields: string[];
  ruleActive: boolean;
  hasQuery: boolean;
}>();

defineEmits<{
  updateSort: [value: string];
  updatePerPage: [value: number];
  createRule: [];
  cancelRule: [];
  openFieldConfig: [];
}>();

const sortOptions = computed(() => {
  const options = [{ label: 'Relevance', value: '' }];
  for (const field of props.sortableFields) {
    options.push({ label: `${field} (asc)`, value: `${field}:asc` });
    options.push({ label: `${field} (desc)`, value: `${field}:desc` });
  }
  return options;
});

const perPageOptions = [
  { label: '12', value: 12 },
  { label: '48', value: 48 },
  { label: '100', value: 100 },
  { label: '250', value: 250 },
];
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchToolbar.vue
git commit -m "feat: add SearchToolbar with sort, per-page, and create-rule button"
```

---

### Task 8: Create `SearchResultCard` component

**Files:**
- Create: `src/components/search/SearchResultCard.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchResultCard.vue`:

```vue
<template>
  <q-card
    :class="[
      'search-result-card',
      { 'pinned-card': isPinned, 'hidden-card': isHidden, 'selected-card': isSelected },
    ]"
    flat
    bordered
  >
    <q-card-section class="row no-wrap items-start q-pa-sm">
      <!-- Checkbox (rule mode only) -->
      <q-checkbox
        v-if="ruleMode"
        :model-value="isSelected"
        dense
        class="q-mr-xs"
        @update:model-value="$emit('toggleSelect', documentId)"
      />

      <!-- Image -->
      <q-img
        v-if="imageUrl"
        :src="imageUrl"
        :ratio="1"
        class="rounded-borders q-mr-sm"
        style="width: 60px; min-width: 60px"
        fit="cover"
      />

      <!-- Content -->
      <div class="col">
        <!-- Title -->
        <div class="text-subtitle2 ellipsis-2-lines">
          {{ displayName }}
        </div>
        <!-- ID -->
        <div class="text-caption text-grey">ID: {{ documentId }}</div>
        <!-- Pinned badge -->
        <q-badge v-if="isPinned" color="green" class="q-mt-xs">
          <q-icon name="sym_s_push_pin" size="xs" class="q-mr-xs" />
          Position {{ pinPosition }}
        </q-badge>
        <!-- Configured fields -->
        <div v-for="field in visibleFieldValues" :key="field.name" class="text-caption q-mt-xs">
          <span class="text-grey-7">{{ field.name }}:</span> {{ field.value }}
        </div>
      </div>

      <!-- Actions (rule mode only) -->
      <div v-if="ruleMode && !isHidden" class="column q-gutter-xs q-ml-sm">
        <q-btn
          v-if="!isPinned"
          flat
          dense
          round
          size="sm"
          icon="sym_s_push_pin"
          color="green"
          @click="onPin"
        >
          <q-tooltip>Pin this product</q-tooltip>
        </q-btn>
        <q-btn
          v-if="isPinned"
          flat
          dense
          round
          size="sm"
          icon="sym_s_close"
          color="grey"
          @click="$emit('unpin', documentId)"
        >
          <q-tooltip>Unpin</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="sym_s_visibility_off"
          color="red"
          @click="$emit('hide', documentId)"
        >
          <q-tooltip>Hide this product</q-tooltip>
        </q-btn>
      </div>
      <!-- Unhide button for hidden products -->
      <q-btn
        v-if="ruleMode && isHidden"
        flat
        dense
        size="sm"
        label="Unhide"
        color="primary"
        class="q-ml-sm"
        @click="$emit('unhide', documentId)"
      />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { detectImageField } from 'src/composables/useFieldConfig';

const $q = useQuasar();

const props = defineProps<{
  document: any;
  fields: any[];
  visibleFields: string[];
  ruleMode: boolean;
  isPinned: boolean;
  isHidden: boolean;
  isSelected: boolean;
  pinPosition?: number;
}>();

const emit = defineEmits<{
  pin: [id: string, position: number];
  unpin: [id: string];
  hide: [id: string];
  unhide: [id: string];
  toggleSelect: [id: string];
}>();

const documentId = computed(() => String(props.document?.id || ''));

const displayName = computed(() => {
  if (!props.document) return 'Unknown';
  // Use first visible string field or id
  for (const fieldName of props.visibleFields) {
    const val = props.document[fieldName];
    if (val && typeof val === 'string') return val;
    if (Array.isArray(val) && val.length > 0) return val[0];
  }
  return documentId.value;
});

const imageUrl = computed(() => {
  const imageField = detectImageField(props.fields);
  if (!imageField) return null;
  const val = props.document?.[imageField];
  if (!val) return null;
  const url = Array.isArray(val) ? val[0] : String(val);
  // Basic URL validation
  return url.startsWith('http') ? url : null;
});

const visibleFieldValues = computed(() => {
  if (!props.document) return [];
  return props.visibleFields
    .filter((name) => {
      const val = props.document[name];
      return val !== null && val !== undefined && val !== '';
    })
    .map((name) => ({
      name,
      value: formatValue(props.document[name]),
    }));
});

function formatValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  return String(val);
}

function onPin() {
  $q.dialog({
    title: 'Pin Position',
    message: 'Enter the position for this product (1 = first):',
    prompt: { model: '1', type: 'number' },
    cancel: true,
  }).onOk((position: string) => {
    const pos = parseInt(position, 10);
    if (pos > 0) {
      emit('pin', documentId.value, pos);
    }
  });
}
</script>

<style scoped>
.pinned-card {
  border-left: 3px solid var(--q-green);
}
.hidden-card {
  opacity: 0.4;
}
.selected-card {
  background-color: rgba(var(--q-primary-rgb), 0.05);
}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchResultCard.vue
git commit -m "feat: add SearchResultCard with pin/hide actions and configurable fields"
```

---

### Task 9: Create `SearchBulkActions` component

**Files:**
- Create: `src/components/search/SearchBulkActions.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchBulkActions.vue`:

```vue
<template>
  <q-banner v-if="selectedCount > 0" class="bg-blue-1 q-mb-sm" rounded>
    <div class="row items-center q-gutter-sm">
      <span class="text-body2">{{ selectedCount }} selected</span>
      <q-btn dense no-caps color="green" label="Pin selected" size="sm" @click="onPinSelected" />
      <q-btn dense no-caps color="red" label="Hide selected" size="sm" @click="$emit('hideSelected')" />
      <q-btn dense flat no-caps label="Clear selection" size="sm" @click="$emit('clearSelection')" />
    </div>
  </q-banner>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();

defineProps<{
  selectedCount: number;
}>();

const emit = defineEmits<{
  pinSelected: [startPosition: number];
  hideSelected: [];
  clearSelection: [];
}>();

function onPinSelected() {
  $q.dialog({
    title: 'Starting Position',
    message: 'Pin selected products starting at position:',
    prompt: { model: '1', type: 'number' },
    cancel: true,
  }).onOk((position: string) => {
    const pos = parseInt(position, 10);
    if (pos > 0) {
      emit('pinSelected', pos);
    }
  });
}
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchBulkActions.vue
git commit -m "feat: add SearchBulkActions toolbar for bulk pin/hide"
```

---

### Task 10: Create `SearchFieldConfig` dialog component

**Files:**
- Create: `src/components/search/SearchFieldConfig.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchFieldConfig.vue`:

```vue
<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Configure Result Fields</div>
        <div class="text-caption text-grey">
          Choose which fields to show on result cards. Drag to reorder.
        </div>
      </q-card-section>

      <q-card-section>
        <q-list>
          <q-item v-for="field in localFields" :key="field.name" dense>
            <q-item-section side>
              <q-checkbox v-model="field.visible" dense />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ field.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-xs">
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="sym_s_arrow_upward"
                  :disable="isFirst(field.name)"
                  @click="moveUp(field.name)"
                />
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="sym_s_arrow_downward"
                  :disable="isLast(field.name)"
                  @click="moveDown(field.name)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" />
        <q-btn color="primary" label="Save" @click="onSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FieldConfigEntry } from 'src/composables/useFieldConfig';

const props = defineProps<{
  modelValue: boolean;
  fields: FieldConfigEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [fields: FieldConfigEntry[]];
}>();

const localFields = ref<FieldConfigEntry[]>([]);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // Deep copy on open
      localFields.value = props.fields.map((f) => ({ ...f }));
    }
  },
);

function isFirst(name: string) {
  return localFields.value[0]?.name === name;
}

function isLast(name: string) {
  return localFields.value[localFields.value.length - 1]?.name === name;
}

function moveUp(name: string) {
  const idx = localFields.value.findIndex((f) => f.name === name);
  if (idx <= 0) return;
  const arr = [...localFields.value];
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  localFields.value = arr;
}

function moveDown(name: string) {
  const idx = localFields.value.findIndex((f) => f.name === name);
  if (idx < 0 || idx >= localFields.value.length - 1) return;
  const arr = [...localFields.value];
  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
  localFields.value = arr;
}

function onSave() {
  emit('save', localFields.value);
  emit('update:modelValue', false);
}
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchFieldConfig.vue
git commit -m "feat: add SearchFieldConfig dialog for result field visibility"
```

---

### Task 11: Create `RuleDrawer` component

**Files:**
- Create: `src/components/search/RuleDrawer.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/RuleDrawer.vue`:

```vue
<template>
  <div class="rule-drawer q-pa-md">
    <div class="text-h6 q-mb-md">
      {{ mode === 'creating' ? 'Create Search Rule' : 'Edit Search Rule' }}
    </div>

    <!-- Rule Name -->
    <q-input
      v-model="localRuleName"
      label="Rule Name"
      dense
      outlined
      class="q-mb-sm"
      @update:model-value="$emit('update:ruleName', $event)"
    />

    <!-- Trigger Summary -->
    <div class="q-mb-sm">
      <div class="text-caption text-grey">Trigger</div>
      <q-chip size="sm" color="blue-1" text-color="blue-9">
        Query: "{{ triggerQuery || '*' }}"
      </q-chip>
      <q-chip v-if="triggerFilters" size="sm" color="orange-1" text-color="orange-9">
        Filters: {{ triggerFilters }}
      </q-chip>
    </div>

    <!-- Match Type -->
    <q-select
      :model-value="matchType"
      :options="matchTypeOptions"
      label="Match type"
      dense
      outlined
      emit-value
      map-options
      class="q-mb-sm"
      @update:model-value="(val: 'exact' | 'contains') => $emit('update:matchType', val)"
    />

    <q-separator class="q-my-md" />

    <!-- Filter Injection -->
    <div class="text-subtitle2 q-mb-xs">Inject Filter</div>
    <filter-builder
      :model-value="injectedFilter"
      :fields="fields"
      @update:model-value="(val: string) => $emit('update:injectedFilter', val)"
    />

    <!-- Sort Injection -->
    <div class="text-subtitle2 q-mb-xs q-mt-md">Inject Sort</div>
    <sort-builder
      :model-value="injectedSort"
      :fields="fields"
      @update:model-value="(val: string) => $emit('update:injectedSort', val)"
    />

    <q-separator class="q-my-md" />

    <!-- Scheduling -->
    <div class="text-subtitle2 q-mb-xs">Scheduling</div>
    <q-input
      :model-value="effectiveFromStr"
      label="Effective from"
      type="datetime-local"
      dense
      outlined
      class="q-mb-sm"
      clearable
      @update:model-value="(val: string | number | null) => $emit('update:effectiveFrom', val)"
    />
    <q-input
      :model-value="effectiveToStr"
      label="Effective until"
      type="datetime-local"
      dense
      outlined
      class="q-mb-sm"
      clearable
      @update:model-value="(val: string | number | null) => $emit('update:effectiveTo', val)"
    />

    <!-- Tags -->
    <div class="text-subtitle2 q-mb-xs q-mt-md">Tags</div>
    <q-select
      :model-value="tags"
      label="Tags"
      dense
      outlined
      multiple
      use-chips
      use-input
      new-value-mode="add-unique"
      hide-dropdown-icon
      class="q-mb-md"
      @update:model-value="(val: string[]) => $emit('update:tags', val)"
    />

    <q-separator class="q-my-md" />

    <!-- Pinned Products -->
    <div v-if="pinnedProducts.length > 0">
      <div class="text-subtitle2 q-mb-xs">
        Pinned Products ({{ pinnedProducts.length }})
      </div>
      <q-list dense>
        <q-item v-for="pin in pinnedProducts" :key="pin.id" class="q-pa-xs">
          <q-item-section side>
            <q-badge color="green" :label="`#${pin.position}`" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ellipsis">{{ pin.id }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round size="xs" icon="sym_s_close" @click="$emit('unpinProduct', pin.id)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Hidden Products -->
    <div v-if="hiddenProducts.length > 0" class="q-mt-sm">
      <div class="text-subtitle2 q-mb-xs">
        Hidden Products ({{ hiddenProducts.length }})
      </div>
      <q-list dense>
        <q-item v-for="hidden in hiddenProducts" :key="hidden.id" class="q-pa-xs">
          <q-item-section>
            <q-item-label class="ellipsis">{{ hidden.id }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round size="xs" icon="sym_s_close" @click="$emit('unhideProduct', hidden.id)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-separator class="q-my-md" />

    <!-- Actions -->
    <div class="row q-gutter-sm">
      <q-btn
        color="primary"
        label="Save Rule"
        no-caps
        :loading="saving"
        class="col"
        @click="$emit('save')"
      />
      <q-btn
        outline
        color="grey"
        label="Cancel"
        no-caps
        class="col"
        @click="$emit('cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import FilterBuilder from 'src/components/FilterBuilder.vue';
import SortBuilder from 'src/components/SortBuilder.vue';
import type { IncludeItem, ExcludeItem } from 'src/shared/curations-utils';

const props = defineProps<{
  mode: 'creating' | 'editing';
  ruleName: string;
  triggerQuery: string;
  triggerFilters: string;
  matchType: 'exact' | 'contains';
  injectedFilter: string;
  injectedSort: string;
  effectiveFromStr: string;
  effectiveToStr: string;
  tags: string[];
  pinnedProducts: IncludeItem[];
  hiddenProducts: ExcludeItem[];
  fields: any[];
  saving: boolean;
}>();

defineEmits<{
  'update:ruleName': [value: string];
  'update:matchType': [value: 'exact' | 'contains'];
  'update:injectedFilter': [value: string];
  'update:injectedSort': [value: string];
  'update:effectiveFrom': [value: string | number | null];
  'update:effectiveTo': [value: string | number | null];
  'update:tags': [value: string[]];
  unpinProduct: [id: string];
  unhideProduct: [id: string];
  save: [];
  cancel: [];
}>();

const localRuleName = ref(props.ruleName);
watch(() => props.ruleName, (val) => { localRuleName.value = val; });

const matchTypeOptions = [
  { label: 'Exact phrase match', value: 'exact' },
  { label: 'Contains these words', value: 'contains' },
];
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/RuleDrawer.vue
git commit -m "feat: add RuleDrawer component with full rule settings form"
```

---

### Task 12: Create `SearchCustom` main orchestrator component

**Files:**
- Create: `src/components/search/SearchCustom.vue`

- [ ] **Step 1: Create the component**

Create `src/components/search/SearchCustom.vue`:

```vue
<template>
  <div class="row q-col-gutter-md">
    <!-- Left sidebar: Facets -->
    <div class="col-3">
      <q-input
        v-model="searchState.query.value"
        label="Search"
        dense
        outlined
        clearable
        class="q-mb-md"
      >
        <template #prepend>
          <q-icon name="sym_s_search" />
        </template>
      </q-input>

      <search-facet-panel
        :facet-fields="searchState.facetFields.value"
        :facet-counts="searchState.facetCounts.value"
        :active-filters="searchState.filters.value"
        @set-filter="searchState.setFilter"
        @remove-filter="searchState.removeFilter"
      />
    </div>

    <!-- Main area: Results -->
    <div :class="ruleEditor.isActive.value ? 'col-6' : 'col-9'">
      <!-- Toolbar -->
      <search-toolbar
        :total-hits="searchState.totalHits.value"
        :search-time-ms="searchState.searchTimeMs.value"
        :sort="searchState.sort.value"
        :per-page="searchState.perPage.value"
        :sortable-fields="searchState.sortableFields.value"
        :rule-active="ruleEditor.isActive.value"
        :has-query="!!searchState.query.value.trim()"
        @update-sort="searchState.setSort"
        @update-per-page="searchState.setPerPage"
        @create-rule="onCreateRule"
        @cancel-rule="ruleEditor.exitMode"
        @open-field-config="showFieldConfig = true"
      />

      <!-- Active filters -->
      <search-active-filters
        :filters="searchState.filters.value"
        @remove-filter="searchState.removeFilter"
        @clear-filters="searchState.clearFilters"
      />

      <!-- Preview banner -->
      <q-banner
        v-if="ruleEditor.isActive.value && (ruleEditor.pinnedProducts.value.length > 0 || ruleEditor.hiddenProducts.value.length > 0)"
        class="bg-blue-1 q-mb-sm"
        rounded
      >
        Preview: showing results with {{ ruleEditor.pinnedProducts.value.length }} pins,
        {{ ruleEditor.hiddenProducts.value.length }} hidden
        <template #action>
          <q-btn flat dense label="Clear all" @click="onClearPinsAndHides" />
        </template>
      </q-banner>

      <!-- Bulk actions -->
      <search-bulk-actions
        v-if="ruleEditor.isActive.value"
        :selected-count="ruleEditor.selectedIds.value.size"
        @pin-selected="ruleEditor.pinSelected"
        @hide-selected="ruleEditor.hideSelected"
        @clear-selection="ruleEditor.clearSelection"
      />

      <!-- Loading -->
      <q-linear-progress v-if="searchState.loading.value" indeterminate />

      <!-- Error -->
      <q-banner v-if="searchState.error.value" class="bg-red-1 q-mb-sm" rounded>
        {{ searchState.error.value }}
      </q-banner>

      <!-- Results -->
      <div class="row q-col-gutter-sm">
        <div
          v-for="doc in displayResults"
          :key="doc.id"
          class="col-12 col-sm-6 col-md-4"
        >
          <search-result-card
            :document="doc"
            :fields="collectionFields"
            :visible-fields="fieldConfig.visibleFields.value"
            :rule-mode="ruleEditor.isActive.value"
            :is-pinned="isDocPinned(doc.id)"
            :is-hidden="isDocHidden(doc.id)"
            :is-selected="ruleEditor.selectedIds.value.has(String(doc.id))"
            :pin-position="getPinPosition(doc.id)"
            @pin="ruleEditor.pinProduct"
            @unpin="ruleEditor.unpinProduct"
            @hide="ruleEditor.hideProduct"
            @unhide="ruleEditor.unhideProduct"
            @toggle-select="ruleEditor.toggleSelection"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!searchState.loading.value && displayResults.length === 0 && searchState.query.value" class="text-center q-pa-lg text-grey">
        No results found.
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="row justify-center q-mt-md">
        <q-pagination
          :model-value="searchState.page.value"
          :max="totalPages"
          :max-pages="7"
          direction-links
          boundary-links
          @update:model-value="searchState.setPage"
        />
      </div>
    </div>

    <!-- Right drawer: Rule editor -->
    <div v-if="ruleEditor.isActive.value" class="col-3">
      <rule-drawer
        :mode="ruleEditor.mode.value === 'off' ? 'creating' : ruleEditor.mode.value"
        :rule-name="ruleEditor.ruleName.value"
        :trigger-query="ruleEditor.triggerQuery.value"
        :trigger-filters="ruleEditor.triggerFilters.value"
        :match-type="ruleEditor.matchType.value"
        :injected-filter="ruleEditor.injectedFilter.value"
        :injected-sort="ruleEditor.injectedSort.value"
        :effective-from-str="effectiveFromStr"
        :effective-to-str="effectiveToStr"
        :tags="ruleEditor.tags.value"
        :pinned-products="ruleEditor.pinnedProducts.value"
        :hidden-products="ruleEditor.hiddenProducts.value"
        :fields="collectionFields"
        :saving="saving"
        @update:rule-name="ruleEditor.ruleName.value = $event"
        @update:match-type="ruleEditor.matchType.value = $event"
        @update:injected-filter="ruleEditor.injectedFilter.value = $event"
        @update:injected-sort="ruleEditor.injectedSort.value = $event"
        @update:effective-from="onUpdateEffectiveFrom"
        @update:effective-to="onUpdateEffectiveTo"
        @update:tags="ruleEditor.tags.value = $event"
        @unpin-product="ruleEditor.unpinProduct"
        @unhide-product="ruleEditor.unhideProduct"
        @save="onSaveRule"
        @cancel="ruleEditor.exitMode"
      />
    </div>

    <!-- Field config dialog -->
    <search-field-config
      v-model="showFieldConfig"
      :fields="fieldConfig.allFields.value"
      @save="fieldConfig.saveConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useNodeStore } from 'src/stores/node';
import { useCustomSearch } from 'src/composables/useCustomSearch';
import { useRuleEditor } from 'src/composables/useRuleEditor';
import { useFieldConfig } from 'src/composables/useFieldConfig';
import SearchFacetPanel from './SearchFacetPanel.vue';
import SearchToolbar from './SearchToolbar.vue';
import SearchActiveFilters from './SearchActiveFilters.vue';
import SearchBulkActions from './SearchBulkActions.vue';
import SearchResultCard from './SearchResultCard.vue';
import SearchFieldConfig from './SearchFieldConfig.vue';
import RuleDrawer from './RuleDrawer.vue';

const props = defineProps<{
  ruleId?: string;
}>();

const $q = useQuasar();
const store = useNodeStore();

const collectionName = computed(() => store.currentCollection?.name || '');
const collectionFields = computed(() => (store.currentCollection?.fields as any[]) || []);

const searchState = useCustomSearch(collectionName);
const ruleEditor = useRuleEditor(collectionName);
const fieldConfig = useFieldConfig(collectionName);

const showFieldConfig = ref(false);
const saving = ref(false);

// Load field config when collection changes
watch(
  collectionFields,
  (fields) => {
    if (fields.length > 0) {
      fieldConfig.loadConfig(fields);
    }
  },
  { immediate: true },
);

// Trigger initial search when collection is loaded
watch(
  collectionName,
  (name) => {
    if (name) {
      void searchState.search();
    }
  },
  { immediate: true },
);

// Display results with preview applied
const displayResults = computed(() => {
  if (ruleEditor.isActive.value) {
    return ruleEditor.applyPreview(searchState.results.value);
  }
  return searchState.results.value;
});

const totalPages = computed(() => {
  return Math.ceil(searchState.totalHits.value / searchState.perPage.value);
});

// Scheduling helpers
const effectiveFromStr = computed(() => {
  if (!ruleEditor.effectiveFromTs.value) return '';
  return tsToDatetimeLocal(ruleEditor.effectiveFromTs.value);
});

const effectiveToStr = computed(() => {
  if (!ruleEditor.effectiveToTs.value) return '';
  return tsToDatetimeLocal(ruleEditor.effectiveToTs.value);
});

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function onUpdateEffectiveFrom(val: string | number | null) {
  ruleEditor.effectiveFromTs.value = val && typeof val === 'string'
    ? Math.floor(new Date(val).getTime() / 1000)
    : undefined;
}

function onUpdateEffectiveTo(val: string | number | null) {
  ruleEditor.effectiveToTs.value = val && typeof val === 'string'
    ? Math.floor(new Date(val).getTime() / 1000)
    : undefined;
}

// Pin/hide helpers
function isDocPinned(id: string | number) {
  return ruleEditor.pinnedProducts.value.some((p) => p.id === String(id));
}

function isDocHidden(id: string | number) {
  return ruleEditor.hiddenProducts.value.some((p) => p.id === String(id));
}

function getPinPosition(id: string | number) {
  return ruleEditor.pinnedProducts.value.find((p) => p.id === String(id))?.position;
}

function onCreateRule() {
  ruleEditor.enterCreateMode(searchState.query.value, searchState.filterByString.value);
}

function onClearPinsAndHides() {
  ruleEditor.clearPinsAndHides();
}

async function onSaveRule() {
  saving.value = true;
  const success = await ruleEditor.save();
  saving.value = false;
  if (success) {
    $q.notify({ type: 'positive', message: 'Search rule saved successfully' });
  } else {
    $q.notify({ type: 'negative', message: 'Failed to save search rule' });
  }
}

// Handle editing existing rule via ruleId prop.
// On cold page load, store.data.overrides may not be populated yet,
// so we watch for overrides to become available before entering edit mode.
function tryLoadRule() {
  if (!props.ruleId) return false;
  const loaded = ruleEditor.enterEditMode(props.ruleId);
  if (loaded) {
    searchState.query.value = ruleEditor.triggerQuery.value;
  }
  return loaded;
}

onMounted(() => {
  if (props.ruleId && !tryLoadRule()) {
    // Overrides not loaded yet — watch for them
    const stop = watch(
      () => store.data.overrides,
      (overrides) => {
        if (overrides && overrides.length > 0) {
          tryLoadRule();
          stop();
        }
      },
    );
  }
});
</script>
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchCustom.vue
git commit -m "feat: add SearchCustom orchestrator component"
```

---

### Task 13: Update `Search.vue` to use `SearchCustom`

**Files:**
- Modify: `src/pages/Search.vue`

- [ ] **Step 1: Replace SearchInstantSearch with SearchCustom**

Replace the full contents of `src/pages/Search.vue`:

```vue
<template>
  <q-page padding>
    <q-tabs v-model="tab" dense class="bg-primary text-white" align="justify" narrow-indicator>
      <q-tab name="form" label="Search" />
      <q-tab name="json" label="JSON Mode" />
      <q-tab v-if="showPreviewMode" name="preview" label="Preview Mode" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="tab" animated keep-alive>
      <q-tab-panel name="form">
        <search-custom :rule-id="ruleId" />
      </q-tab-panel>
      <q-tab-panel name="json" class="q-pa-none">
        <search-json />
      </q-tab-panel>
      <q-tab-panel v-if="showPreviewMode" name="preview">
        <search-preview-mode />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNodeStore } from 'src/stores/node';
import SearchJson from 'src/components/search/SearchJson.vue';
import SearchCustom from 'src/components/search/SearchCustom.vue';
import SearchPreviewMode from 'src/components/search/SearchPreviewMode.vue';

const store = useNodeStore();
const route = useRoute();
const tab = ref('form');

const ruleId = computed(() => {
  const id = route.query.ruleId;
  return typeof id === 'string' ? id : undefined;
});

const PREVIEW_TRIGGER_FIELDS = ['vendor_ids', 'featured_vendor_ids', 'delivery_methods', 'default_rank_with_pin', 'default_rank'];

const showPreviewMode = computed(() => {
  const fields = store.currentCollection?.fields;
  if (!fields) return false;
  return (fields as any[]).some((f: any) => PREVIEW_TRIGGER_FIELDS.includes(f.name));
});

watch(showPreviewMode, (show) => {
  if (!show && tab.value === 'preview') {
    tab.value = 'form';
  }
});
</script>
```

Note: The old `SearchInstantSearch` import is removed. The InstantSearch CSS styles (lines 50-91 of the old file) are no longer needed and can be removed.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Search.vue
git commit -m "feat: replace InstantSearch tab with SearchCustom"
```

---

### Task 14: Manual integration testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test core search**

1. Navigate to a collection's search page
2. Verify: search box works, results appear, facets load in sidebar
3. Verify: clicking facet checkboxes filters results, chips appear above results
4. Verify: sort dropdown and per-page selector work
5. Verify: pagination works

- [ ] **Step 3: Test field configuration**

1. Click the gear icon in the toolbar
2. Verify: dialog shows all collection fields with checkboxes
3. Toggle some fields, reorder, save
4. Verify: result cards update to show only selected fields
5. Refresh page — verify config persists

- [ ] **Step 4: Test rule creation**

1. Search for something, apply a filter
2. Click "Create Rule"
3. Verify: drawer opens with trigger query and filters captured
4. Pin a product (click pin icon, enter position)
5. Verify: result rearranges to show pinned product at position
6. Hide a product — verify it disappears from results
7. Use multi-select: check 2 products, click "Pin selected"
8. Fill in rule name, tags, scheduling
9. Click "Save Rule"
10. Verify: success toast, drawer closes
11. Go to Overrides page — verify the rule appears

- [ ] **Step 5: Test rule editing**

1. From the Overrides page or directly via URL `?ruleId=<id>`, navigate to the search page
2. Verify: drawer opens pre-populated with rule data
3. Verify: search results show the rule's query
4. Modify pins/hides, save — verify update works

- [ ] **Step 6: Verify existing Overrides page still works**

1. Navigate to `/curations/overrides`
2. Create, edit, and delete a rule
3. Verify: everything works as before

- [ ] **Step 7: Final verification**

Run: `npm run lint && npm run type-check`
Expected: No errors.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from manual testing"
```
