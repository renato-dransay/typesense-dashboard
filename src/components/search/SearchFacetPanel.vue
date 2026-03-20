<template>
  <div class="search-facet-panel">
    <div v-for="facet in facetFields" :key="facet.name" class="q-mb-md">
      <div class="text-subtitle2 q-mb-xs">{{ facet.name }}</div>

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
import { reactive } from 'vue';
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
  const filter: ActiveFilter = { field, value: `${min ?? '*'}-${max ?? '*'}`, type: 'range' };
  if (min !== undefined) filter.min = min;
  if (max !== undefined) filter.max = max;
  emit('setFilter', filter);
}
</script>
