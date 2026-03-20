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
