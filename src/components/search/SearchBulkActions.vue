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
