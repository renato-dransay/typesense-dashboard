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
  const a = arr[idx - 1];
  const b = arr[idx];
  if (!a || !b) return;
  arr[idx - 1] = b;
  arr[idx] = a;
  localFields.value = arr;
}

function moveDown(name: string) {
  const idx = localFields.value.findIndex((f) => f.name === name);
  if (idx < 0 || idx >= localFields.value.length - 1) return;
  const arr = [...localFields.value];
  const a = arr[idx];
  const b = arr[idx + 1];
  if (!a || !b) return;
  arr[idx] = b;
  arr[idx + 1] = a;
  localFields.value = arr;
}

function onSave() {
  emit('save', localFields.value);
  emit('update:modelValue', false);
}
</script>
