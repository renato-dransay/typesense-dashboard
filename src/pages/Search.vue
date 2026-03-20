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
        <search-custom v-bind="ruleId !== undefined ? { ruleId } : {}" />
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
