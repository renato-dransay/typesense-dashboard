<template>
  <div class="row items-center q-gutter-sm q-mb-md">
    <div class="text-body2 text-grey-7">
      {{ totalHits }} results
      <span v-if="searchTimeMs">({{ searchTimeMs }}ms)</span>
    </div>

    <q-space />

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
