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

      <search-active-filters
        :filters="searchState.filters.value"
        @remove-filter="searchState.removeFilter"
        @clear-filters="searchState.clearFilters"
      />

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

      <search-bulk-actions
        v-if="ruleEditor.isActive.value"
        :selected-count="ruleEditor.selectedIds.value.size"
        @pin-selected="ruleEditor.pinSelected"
        @hide-selected="ruleEditor.hideSelected"
        @clear-selection="ruleEditor.clearSelection"
      />

      <q-linear-progress v-if="searchState.loading.value" indeterminate />

      <q-banner v-if="searchState.error.value" class="bg-red-1 q-mb-sm" rounded>
        {{ searchState.error.value }}
      </q-banner>

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

      <div v-if="!searchState.loading.value && displayResults.length === 0 && searchState.query.value" class="text-center q-pa-lg text-grey">
        No results found.
      </div>

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
        @update:rule-name="(val: string) => { ruleEditor.ruleName.value = val; }"
        @update:match-type="(val: 'exact' | 'contains') => { ruleEditor.matchType.value = val; }"
        @update:injected-filter="(val: string) => { ruleEditor.injectedFilter.value = val; }"
        @update:injected-sort="(val: string) => { ruleEditor.injectedSort.value = val; }"
        @update:effective-from="onUpdateEffectiveFrom"
        @update:effective-to="onUpdateEffectiveTo"
        @update:tags="(val: string[]) => { ruleEditor.tags.value = val; }"
        @unpin-product="ruleEditor.unpinProduct"
        @unhide-product="ruleEditor.unhideProduct"
        @save="onSaveRule"
        @cancel="ruleEditor.exitMode"
      />
    </div>

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

watch(
  collectionFields,
  (fields) => {
    if (fields.length > 0) {
      fieldConfig.loadConfig(fields);
    }
  },
  { immediate: true },
);

watch(
  collectionName,
  (name) => {
    if (name) {
      void searchState.search();
    }
  },
  { immediate: true },
);

const displayResults = computed(() => {
  if (ruleEditor.isActive.value) {
    return ruleEditor.applyPreview(searchState.results.value);
  }
  return searchState.results.value;
});

const totalPages = computed(() => {
  return Math.ceil(searchState.totalHits.value / searchState.perPage.value);
});

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
