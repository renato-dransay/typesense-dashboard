<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-icon name="sym_s_low_priority" size="md" class="q-mr-sm" />
      <div class="text-h5">Search Rules</div>
      <q-space />
      <q-btn
        unelevated
        color="primary"
        icon="sym_s_add"
        label="Create New Rule"
        @click="openCreateForm"
      />
    </div>

    <!-- Collection selector if none selected -->
    <q-banner v-if="!store.currentCollection" class="bg-warning text-white q-mb-md">
      Please select a collection first.
    </q-banner>

    <template v-if="store.currentCollection">
      <!-- Existing overrides list (shown first, above the fold) -->
      <div class="q-mb-md">
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1">Existing Rules</div>
          <q-space />
          <q-input
            v-model="listFilter"
            dense
            filled
            placeholder="Filter by tag..."
            class="q-mr-sm"
            style="width: 200px"
            clearable
          />
          <q-btn flat dense icon="sym_s_refresh" @click="refreshOverrides" />
        </div>

        <!-- Empty state -->
        <div v-if="filteredOverrides.length === 0" class="text-center q-pa-xl text-grey-6">
          <q-icon name="sym_s_low_priority" size="xl" class="q-mb-sm" />
          <div class="text-body1">No search rules yet.</div>
          <div class="text-caption">Create a rule to control what products appear for specific searches.</div>
        </div>

        <!-- Rule cards -->
        <q-card
          v-for="rule in filteredOverrides"
          :key="rule.id"
          flat
          bordered
          class="q-mb-sm"
        >
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-weight-bold">{{ rule.id }}</div>
                <div class="text-body2 q-mt-xs">
                  When someone searches
                  <span class="text-weight-medium text-primary">"{{ rule.rule?.query }}"</span>
                  <q-badge
                    :label="rule.rule?.match === 'exact' ? 'Exact' : 'Contains'"
                    :color="rule.rule?.match === 'exact' ? 'deep-purple-4' : 'teal-4'"
                    class="q-ml-xs"
                  />
                </div>
                <div v-if="(rule.includes || []).length > 0" class="text-caption q-mt-xs">
                  Pinned: {{ formatProductList(rule.includes || []) }}
                </div>
                <div class="q-mt-xs q-gutter-xs">
                  <q-badge
                    :color="getOverrideStatus(rule).color"
                    :label="getOverrideStatus(rule).label"
                  />
                  <q-chip
                    v-for="tag in getOverrideTags(rule)"
                    :key="tag"
                    dense
                    size="sm"
                    color="primary"
                    text-color="white"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </div>
              <div class="col-auto q-gutter-xs">
                <q-btn flat dense icon="sym_s_edit" title="Edit" @click="editOverride(rule)" />
                <q-btn flat dense icon="sym_s_content_copy" title="Duplicate" @click="duplicateOverride(rule)" />
                <q-btn
                  flat
                  dense
                  color="negative"
                  icon="sym_s_delete_forever"
                  title="Delete"
                  @click="confirmDeleteOverride(rule.id)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Collapsible creation/edit form -->
      <template v-if="showForm">
        <!-- Main form / JSON editor toggle -->
        <template v-if="!showJsonEditor">
          <!-- Search Rule -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-sm">
                <div class="text-subtitle1">Search Rule</div>
                <q-space />
                <q-btn flat dense icon="sym_s_close" title="Close form" @click="showForm = false" />
              </div>
              <div class="row q-gutter-sm">
                <q-input
                  v-model="ruleName"
                  dense
                  filled
                  label="Rule Name"
                  class="col"
                />
                <q-input
                  v-model="overrideForm.rule.query"
                  dense
                  filled
                  label="When someone searches for..."
                  class="col"
                />
                <q-select
                  v-model="overrideForm.rule.match"
                  dense
                  filled
                  label="Match type"
                  :options="matchTypeOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  class="col-auto"
                  style="min-width: 200px"
                />
              </div>
              <q-expansion-item
                dense
                label="Advanced"
                icon="sym_s_settings"
                class="q-mt-sm"
                header-class="text-caption"
              >
                <q-input
                  v-model="overrideForm.id"
                  dense
                  filled
                  label="Override ID (internal)"
                  class="q-mt-sm"
                />
                <div class="q-mt-sm">
                  <q-btn
                    v-if="!showJsonEditor"
                    flat
                    dense
                    icon="sym_s_code"
                    label="Edit JSON"
                    @click="openJsonEditor"
                  />
                </div>
              </q-expansion-item>
            </q-card-section>
          </q-card>

          <!-- Filter, Sort, Scheduling, Tags (T-051) -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Filters &amp; Scheduling</div>
              <div class="q-mb-sm">
                <div class="text-caption q-mb-xs">Filter injection</div>
                <FilterBuilder v-model="overrideForm.filter_by" :fields="collectionFields" />
              </div>
              <div class="q-mb-sm">
                <div class="text-caption q-mb-xs">Sort injection</div>
                <SortBuilder v-model="overrideForm.sort_by" :fields="collectionFields" />
              </div>
              <div class="row q-gutter-sm q-mb-sm">
                <q-input
                  v-model="effectiveFromStr"
                  dense
                  filled
                  label="Effective from"
                  type="datetime-local"
                  class="col"
                />
                <q-input
                  v-model="effectiveToStr"
                  dense
                  filled
                  label="Effective to"
                  type="datetime-local"
                  class="col"
                />
              </div>
              <div class="row q-gutter-sm">
                <q-select
                  v-model="tags"
                  dense
                  filled
                  label="Tags"
                  class="col"
                  use-input
                  use-chips
                  multiple
                  hide-dropdown-icon
                  input-debounce="0"
                  new-value-mode="add-unique"
                  placeholder="Type and press Enter to add tags"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Search bar for finding products to pin/hide -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Search Products to Pin / Hide</div>
              <div class="row q-gutter-sm">
                <q-input
                  v-model="searchQuery"
                  dense
                  filled
                  label="Search products..."
                  class="col"
                  @keyup.enter="doSearch"
                >
                  <template #append>
                    <q-icon
                      name="sym_s_search"
                      class="cursor-pointer"
                      @click="doSearch"
                    />
                  </template>
                </q-input>
              </div>
            </q-card-section>

            <!-- Search results -->
            <q-card-section v-if="searchResults.length > 0">
              <q-list separator>
                <ProductCard
                  v-for="(hit, idx) in searchResults"
                  :key="idx"
                  :document="hit.document || hit"
                  :fields="collectionFields"
                  type="search-result"
                  @pin="pinProduct(hit, idx)"
                  @hide="hideProduct(hit)"
                >
                  <template #pin-controls>
                    <q-input
                      v-model.number="pinPositions[idx]"
                      dense
                      filled
                      type="number"
                      label="Pos"
                      style="width: 70px"
                      :min="1"
                    />
                  </template>
                </ProductCard>
              </q-list>
            </q-card-section>

            <q-card-section v-if="searchLoading">
              <q-spinner-dots size="md" />
            </q-card-section>
          </q-card>

          <!-- Pinned products -->
          <q-card v-if="overrideForm.includes.length > 0" flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Pinned Products</div>
              <q-list separator>
                <ProductCard
                  v-for="(inc, idx) in overrideForm.includes"
                  :key="'inc-' + idx"
                  :document="productDetailsCache.get(String(inc.id)) || { id: inc.id }"
                  :fields="collectionFields"
                  type="pinned"
                  :position="inc.position"
                  @remove="overrideForm.includes.splice(idx, 1)"
                />
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Hidden products -->
          <q-card v-if="overrideForm.excludes.length > 0" flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Hidden Products</div>
              <q-list separator>
                <ProductCard
                  v-for="(exc, idx) in overrideForm.excludes"
                  :key="'exc-' + idx"
                  :document="productDetailsCache.get(String(exc.id)) || { id: exc.id }"
                  :fields="collectionFields"
                  type="hidden"
                  @remove="overrideForm.excludes.splice(idx, 1)"
                />
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Save button -->
          <div class="row q-gutter-sm q-mb-md">
            <q-btn
              :loading="saving"
              unelevated
              color="primary"
              label="Save Rule"
              :disable="!canSave"
              @click="saveOverride"
            />
            <q-btn
              flat
              label="Preview"
              icon="sym_s_compare"
              @click="showPreviewPanel = !showPreviewPanel"
            />
            <q-btn flat label="Reset" @click="resetForm" />
          </div>

          <!-- Preview panel (T-052) -->
          <q-card v-if="showPreviewPanel" flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Preview: With Rule vs Without Rule</div>
              <q-btn
                :loading="previewLoading"
                dense
                flat
                label="Run Preview"
                color="primary"
                class="q-mb-sm"
                @click="runPreview"
              />
            </q-card-section>
            <q-card-section v-if="previewWithResults.length > 0 || previewWithoutResults.length > 0">
              <div class="row q-gutter-md">
                <!-- With override -->
                <div class="col">
                  <div class="text-subtitle2 q-mb-xs">With Rule</div>
                  <q-list dense separator bordered>
                    <q-item
                      v-for="(doc, idx) in previewWithResults"
                      :key="'pw-' + idx"
                      :class="previewDiffClass(doc, idx)"
                    >
                      <q-item-section>
                        <q-item-label>
                          <span class="text-caption text-grey q-mr-xs">#{{ idx + 1 }}</span>
                          <span class="text-weight-medium">{{ getDocId(doc) }}</span>
                        </q-item-label>
                        <q-item-label caption class="ellipsis">{{ getDocSummary(doc) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <!-- Without override -->
                <div class="col">
                  <div class="text-subtitle2 q-mb-xs">Without Rule</div>
                  <q-list dense separator bordered>
                    <q-item
                      v-for="(doc, idx) in previewWithoutResults"
                      :key="'pwo-' + idx"
                    >
                      <q-item-section>
                        <q-item-label>
                          <span class="text-caption text-grey q-mr-xs">#{{ idx + 1 }}</span>
                          <span class="text-weight-medium">{{ getDocId(doc) }}</span>
                        </q-item-label>
                        <q-item-label caption class="ellipsis">{{ getDocSummary(doc) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- JSON Editor mode (T-052) -->
        <template v-else>
          <q-card flat bordered class="q-mb-md" style="height: 60vh">
            <monaco-editor v-model="jsonEditorValue" />
          </q-card>
          <q-banner v-if="jsonError" inline-actions class="text-white bg-red q-mb-md">
            Invalid JSON: {{ jsonError }}
          </q-banner>
          <div class="row q-gutter-sm q-mb-md">
            <q-btn
              flat
              icon="sym_s_visibility"
              label="Visual Editor"
              @click="closeJsonEditor"
            />
            <q-btn
              :loading="saving"
              unelevated
              color="primary"
              label="Save Rule"
              :disable="!!jsonError || !canSave"
              @click="saveOverride"
            />
            <q-btn flat label="Reset" @click="resetForm" />
          </div>
        </template>
      </template>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { nanoid } from 'nanoid';
import MonacoEditor from 'src/components/MonacoEditor.vue';
import FilterBuilder from 'src/components/FilterBuilder.vue';
import SortBuilder from 'src/components/SortBuilder.vue';
import ProductCard from 'src/components/ProductCard.vue';
import { useNodeStore } from 'src/stores/node';
import {
  generateRuleSlug,
  getProductDisplayName,
  buildOverridePayload,
  applyPayloadToForm,
  type IncludeItem,
  type ExcludeItem,
} from 'src/shared/curations-utils';
import type { OverrideSchema } from 'typesense/lib/Typesense/Override';

const $q = useQuasar();
const store = useNodeStore();
const route = useRoute();

// ---- Form state ----

const overrideForm = reactive({
  id: nanoid(),
  rule: {
    query: '' as string,
    match: 'exact' as 'exact' | 'contains',
  },
  includes: [] as IncludeItem[],
  excludes: [] as ExcludeItem[],
  filter_by: '' as string,
  sort_by: '' as string,
  effective_from_ts: undefined as number | undefined,
  effective_to_ts: undefined as number | undefined,
});

const tags = ref<string[]>([]);
const showForm = ref(false);
const isEditingExisting = ref(false);
const productDetailsCache = ref<Map<string, any>>(new Map());

const collectionFields = computed(() => {
  return store.currentCollection?.fields || [];
});

const matchTypeOptions = [
  { label: 'Exact phrase match', value: 'exact' },
  { label: 'Contains these words', value: 'contains' },
];

const ruleName = computed({
  get: () => {
    const slug = generateRuleSlug(overrideForm.rule.query);
    return slug || overrideForm.id;
  },
  set: (val: string) => {
    overrideForm.id = val;
  },
});

watch(
  () => overrideForm.rule.query,
  (query) => {
    if (!isEditingExisting.value) {
      const slug = generateRuleSlug(query);
      if (slug) overrideForm.id = slug;
    }
  },
);

// Scheduling date helpers
const effectiveFromStr = computed({
  get: () => {
    if (!overrideForm.effective_from_ts) return '';
    return tsToDatetimeLocal(overrideForm.effective_from_ts);
  },
  set: (val: string) => {
    overrideForm.effective_from_ts = val ? Math.floor(new Date(val).getTime() / 1000) : undefined;
  },
});

const effectiveToStr = computed({
  get: () => {
    if (!overrideForm.effective_to_ts) return '';
    return tsToDatetimeLocal(overrideForm.effective_to_ts);
  },
  set: (val: string) => {
    overrideForm.effective_to_ts = val ? Math.floor(new Date(val).getTime() / 1000) : undefined;
  },
});

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Search state ----

const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchLoading = ref(false);
const pinPositions = ref<number[]>([]);

// ---- JSON editor state (T-052) ----

const showJsonEditor = ref(false);
const jsonError = ref<string | null>(null);

function buildPayload(): any {
  return buildOverridePayload(overrideForm, tags.value);
}

function applyPayload(payload: any) {
  const result = applyPayloadToForm(payload);
  Object.assign(overrideForm, result.form);
  tags.value = result.tags;
}

const jsonEditorValue = computed({
  get: () => {
    const payload = buildPayload();
    payload.id = overrideForm.id;
    return JSON.stringify(payload, null, 2);
  },
  set: (json: string) => {
    try {
      const parsed = JSON.parse(json);
      jsonError.value = null;
      if (parsed.id) {
        overrideForm.id = parsed.id;
      }
      applyPayload(parsed);
    } catch (e) {
      jsonError.value = (e as Error).message;
    }
  },
});

function openJsonEditor() {
  showJsonEditor.value = true;
  jsonError.value = null;
}

function closeJsonEditor() {
  if (jsonError.value) {
    $q.dialog({
      title: 'Invalid JSON',
      message: 'The JSON has errors. Switching back will discard invalid changes. Continue?',
      cancel: true,
    }).onOk(() => {
      jsonError.value = null;
      showJsonEditor.value = false;
    });
  } else {
    showJsonEditor.value = false;
  }
}

// ---- Preview state (T-052) ----

const showPreviewPanel = ref(false);
const previewLoading = ref(false);
const previewWithResults = ref<any[]>([]);
const previewWithoutResults = ref<any[]>([]);

function previewDiffClass(doc: any, idx: number): string {
  const id = getDocId(doc);
  // Check if this doc is pinned
  const isPinned = overrideForm.includes.some((inc) => String(inc.id) === String(id));
  if (isPinned) return 'bg-green-1';
  // Check if position changed compared to without-results
  const withoutIdx = previewWithoutResults.value.findIndex((d) => getDocId(d) === id);
  if (withoutIdx === -1) return 'bg-blue-1'; // New in results (maybe from filter injection)
  if (withoutIdx !== idx) return 'bg-yellow-1'; // Position changed
  return '';
}

async function runPreview() {
  if (!store.currentCollection || !overrideForm.rule.query) return;
  previewLoading.value = true;
  try {
    const queryText = overrideForm.rule.query;
    // Search with override applied (save temporarily, search, then restore)
    // Actually, we just do two searches: one normal, one simulating the override client-side
    const baseParams: any = {
      q: queryText,
      query_by: getQueryByFields(),
      per_page: 20,
    };

    // Without override
    const withoutRes = await store.search(baseParams);
    previewWithoutResults.value = withoutRes?.hits || [];

    // With override: apply includes/excludes/filter/sort client-side simulation
    const withParams = { ...baseParams };
    if (overrideForm.filter_by) {
      withParams.filter_by = overrideForm.filter_by;
    }
    if (overrideForm.sort_by) {
      withParams.sort_by = overrideForm.sort_by;
    }
    const withRes = await store.search(withParams);
    let withHits: any[] = withRes?.hits || [];

    // Remove excluded items
    const excludeIds = new Set(overrideForm.excludes.map((e) => String(e.id)));
    withHits = withHits.filter((h: any) => !excludeIds.has(String(getDocId(h))));

    // Insert pinned items at their positions
    const sortedIncludes = [...overrideForm.includes].sort((a, b) => a.position - b.position);
    for (const inc of sortedIncludes) {
      // Remove if already in results
      withHits = withHits.filter((h: any) => String(getDocId(h)) !== String(inc.id));
      // Create a placeholder hit for the pinned product
      const pos = Math.max(0, inc.position - 1);
      const pinnedHit = { document: { id: inc.id, _pinned: true } };
      withHits.splice(pos, 0, pinnedHit);
    }

    previewWithResults.value = withHits.slice(0, 20);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Preview failed: ${(err as Error).message}`,
    });
  } finally {
    previewLoading.value = false;
  }
}

function getQueryByFields(): string {
  if (!store.currentCollection?.fields) return '*';
  const stringFields = store.currentCollection.fields
    .filter((f: any) => f.type === 'string' || f.type === 'string[]')
    .map((f: any) => f.name);
  return stringFields.length > 0 ? stringFields.join(',') : '*';
}

// ---- Product search helpers ----

async function doSearch() {
  if (!store.currentCollection || !searchQuery.value.trim()) return;
  searchLoading.value = true;
  searchResults.value = [];
  try {
    const res = await store.search({
      q: searchQuery.value,
      query_by: getQueryByFields(),
      per_page: 20,
    });
    searchResults.value = res?.hits || [];
    pinPositions.value = searchResults.value.map((_, i) => i + 1);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Search failed: ${(err as Error).message}`,
    });
  } finally {
    searchLoading.value = false;
  }
}

function getDocId(hit: any): string {
  return String(hit?.document?.id || hit?.id || '');
}

function getDocSummary(hit: any): string {
  const doc = hit?.document || hit;
  if (!doc) return '';
  const keys = Object.keys(doc).filter((k) => k !== 'id' && !k.startsWith('_'));
  const parts: string[] = [];
  for (const k of keys.slice(0, 3)) {
    const val = doc[k];
    if (typeof val === 'string') {
      parts.push(`${k}: ${val.substring(0, 80)}`);
    } else if (val !== null && val !== undefined) {
      parts.push(`${k}: ${JSON.stringify(val).substring(0, 80)}`);
    }
  }
  return parts.join(' | ');
}

function pinProduct(hit: any, idx: number) {
  const id = getDocId(hit);
  if (!id) return;
  const position = pinPositions.value[idx] || overrideForm.includes.length + 1;
  // Remove if already pinned
  overrideForm.includes = overrideForm.includes.filter((i) => i.id !== id);
  // Also remove from excludes if present
  overrideForm.excludes = overrideForm.excludes.filter((e) => e.id !== id);
  overrideForm.includes.push({ id, position });
  overrideForm.includes.sort((a, b) => a.position - b.position);
}

function hideProduct(hit: any) {
  const id = getDocId(hit);
  if (!id) return;
  // Remove from includes if present
  overrideForm.includes = overrideForm.includes.filter((i) => i.id !== id);
  // Add to excludes if not already there
  if (!overrideForm.excludes.some((e) => e.id === id)) {
    overrideForm.excludes.push({ id });
  }
}

// ---- Save ----

const saving = ref(false);

const canSave = computed(() => {
  return overrideForm.id.length > 0 && overrideForm.rule.query.length > 0;
});

async function saveOverride() {
  if (!store.currentCollection || !canSave.value) return;
  saving.value = true;
  try {
    const payload = buildPayload();
    await store.createOverride({
      id: overrideForm.id,
      override: payload,
    });
    $q.notify({
      type: 'positive',
      message: `Rule "${ruleName.value}" saved successfully.`,
    });
    refreshOverrides();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Failed to save rule: ${(err as Error).message}`,
    });
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  isEditingExisting.value = false;
  overrideForm.id = nanoid();
  overrideForm.rule.query = '';
  overrideForm.rule.match = 'exact';
  overrideForm.includes = [];
  overrideForm.excludes = [];
  overrideForm.filter_by = '';
  overrideForm.sort_by = '';
  overrideForm.effective_from_ts = undefined;
  overrideForm.effective_to_ts = undefined;
  tags.value = [];
  searchResults.value = [];
  jsonError.value = null;
  previewWithResults.value = [];
  previewWithoutResults.value = [];
  productDetailsCache.value = new Map();
}

function openCreateForm() {
  resetForm();
  showForm.value = true;
  showJsonEditor.value = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Existing overrides list ----

const listFilter = ref('');


function getOverrideStatus(row: any): { label: string; color: string } {
  const from = row.effective_from_ts;
  const to = row.effective_to_ts;
  if (!from && !to) return { label: 'Always active', color: 'positive' };
  const now = Math.floor(Date.now() / 1000);
  if (to && now > to) return { label: 'Expired', color: 'grey' };
  if (from && now < from) return { label: 'Scheduled', color: 'info' };
  return { label: 'Active', color: 'positive' };
}

function formatProductList(items: any[]): string {
  if (!items || items.length === 0) return 'None';
  const fields = collectionFields.value;
  const names = items.slice(0, 3).map((item: any) => {
    const cached = productDetailsCache.value.get(String(item.id));
    if (cached) return getProductDisplayName(cached, fields);
    return String(item.id);
  });
  const display = names.join(', ');
  if (items.length > 3) return `${display} +${items.length - 3} more`;
  return display;
}

function getOverrideTags(override: OverrideSchema): string[] {
  try {
    const meta = (override as any).metadata;
    if (meta?.tags && Array.isArray(meta.tags)) return meta.tags;
    if (typeof meta === 'string') {
      const parsed = JSON.parse(meta);
      if (parsed?.tags && Array.isArray(parsed.tags)) return parsed.tags;
    }
  } catch {
    // ignore
  }
  return [];
}

const filteredOverrides = computed(() => {
  if (!listFilter.value) return store.data.overrides;
  const filterLower = listFilter.value.toLowerCase();
  return store.data.overrides.filter((o) => {
    const ovrTags = getOverrideTags(o);
    return ovrTags.some((t) => t.toLowerCase().includes(filterLower));
  });
});

async function editOverride(override: OverrideSchema) {
  isEditingExisting.value = true;
  overrideForm.id = override.id || nanoid();
  applyPayload(override);
  searchResults.value = [];
  showJsonEditor.value = false;
  showForm.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fetch product details for pinned/hidden products (T-055)
  await fetchProductDetails();
}

async function duplicateOverride(override: OverrideSchema) {
  isEditingExisting.value = false;
  overrideForm.id = `copy-of-${override.id || nanoid()}`;
  applyPayload(override);
  searchResults.value = [];
  showJsonEditor.value = false;
  showForm.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fetch product details for pinned/hidden products
  await fetchProductDetails();
}

async function fetchProductDetails() {
  if (!store.currentCollection) return;
  const allIds = [
    ...overrideForm.includes.map((i) => String(i.id)),
    ...overrideForm.excludes.map((e) => String(e.id)),
  ];
  if (allIds.length === 0) return;

  const newCache = new Map<string, any>(productDetailsCache.value);
  for (const id of allIds) {
    if (newCache.has(id)) continue;
    try {
      const res = await store.search({
        q: '*',
        query_by: getQueryByFields(),
        filter_by: `id:${id}`,
        per_page: 1,
      });
      const hit = res?.hits?.[0];
      if (hit?.document) {
        newCache.set(id, hit.document);
      }
    } catch {
      // If fetch fails, card will show raw ID with warning
    }
  }
  productDetailsCache.value = newCache;
}

function confirmDeleteOverride(id: string) {
  $q.dialog({
    title: 'Confirm',
    message: `Delete rule "${id}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void store.deleteOverride(id);
  });
}

function refreshOverrides() {
  if (store.currentCollection) {
    store.getOverrides(store.currentCollection.name);
  }
}

// ---- Lifecycle ----

onMounted(() => {
  refreshOverrides();

  // Support ?query= parameter from No-Results Queries page
  const queryParam = route.query.query;
  if (queryParam && typeof queryParam === 'string') {
    overrideForm.rule.query = queryParam;
    searchQuery.value = queryParam;
    showForm.value = true;
    void doSearch();
  }
});
</script>
