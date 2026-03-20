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

export type RuleMode = 'off' | 'creating' | 'editing';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useRuleEditor(collectionName: Ref<string>) {
  const store = useNodeStore();

  const mode = ref<RuleMode>('off');
  const isActive = computed(() => mode.value !== 'off');

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

  function pinProduct(id: string, position: number) {
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
    hiddenProducts.value = hiddenProducts.value.filter((p) => p.id !== id);
    pinnedProducts.value.push({ id, position });
    pinnedProducts.value.sort((a, b) => a.position - b.position);
  }

  function unpinProduct(id: string) {
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
  }

  function hideProduct(id: string) {
    pinnedProducts.value = pinnedProducts.value.filter((p) => p.id !== id);
    if (!hiddenProducts.value.some((p) => p.id === id)) {
      hiddenProducts.value.push({ id });
    }
  }

  function unhideProduct(id: string) {
    hiddenProducts.value = hiddenProducts.value.filter((p) => p.id !== id);
  }

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

  function applyPreview(rawResults: any[]): any[] {
    const hiddenIds = new Set(hiddenProducts.value.map((p) => p.id));
    let filtered = rawResults.filter((doc) => !hiddenIds.has(String(doc.id)));
    const pinnedIds = new Set(pinnedProducts.value.map((p) => p.id));
    filtered = filtered.filter((doc) => !pinnedIds.has(String(doc.id)));

    const sorted = [...pinnedProducts.value].sort((a, b) => a.position - b.position);
    for (const pin of sorted) {
      const pos = Math.max(0, pin.position - 1);
      const pinnedDoc = rawResults.find((doc) => String(doc.id) === pin.id)
        || { id: pin.id, _pinned: true };
      filtered.splice(pos, 0, { ...pinnedDoc, _pinned: true });
    }

    return filtered;
  }

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
