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
      <q-checkbox
        v-if="ruleMode"
        :model-value="isSelected"
        dense
        class="q-mr-xs"
        @update:model-value="$emit('toggleSelect', documentId)"
      />

      <q-img
        v-if="imageUrl"
        :src="imageUrl"
        :ratio="1"
        class="rounded-borders q-mr-sm"
        style="width: 60px; min-width: 60px"
        fit="cover"
      />

      <div class="col">
        <div class="text-subtitle2 ellipsis-2-lines">
          {{ displayName }}
        </div>
        <div class="text-caption text-grey">ID: {{ documentId }}</div>
        <q-badge v-if="isPinned" color="green" class="q-mt-xs">
          <q-icon name="sym_s_push_pin" size="xs" class="q-mr-xs" />
          Position {{ pinPosition }}
        </q-badge>
        <div v-for="field in visibleFieldValues" :key="field.name" class="text-caption q-mt-xs">
          <span class="text-grey-7">{{ field.name }}:</span> {{ field.value }}
        </div>
      </div>

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
