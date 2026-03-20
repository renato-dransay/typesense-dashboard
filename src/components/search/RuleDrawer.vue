<template>
  <div class="rule-drawer q-pa-md">
    <div class="text-h6 q-mb-md">
      {{ mode === 'creating' ? 'Create Search Rule' : 'Edit Search Rule' }}
    </div>

    <q-input
      v-model="localRuleName"
      label="Rule Name"
      dense
      outlined
      class="q-mb-sm"
      @update:model-value="onRuleNameChange"
    />

    <div class="q-mb-sm">
      <div class="text-caption text-grey">Trigger</div>
      <q-chip size="sm" color="blue-1" text-color="blue-9">
        Query: "{{ triggerQuery || '*' }}"
      </q-chip>
      <q-chip v-if="triggerFilters" size="sm" color="orange-1" text-color="orange-9">
        Filters: {{ triggerFilters }}
      </q-chip>
    </div>

    <q-select
      :model-value="matchType"
      :options="matchTypeOptions"
      label="Match type"
      dense
      outlined
      emit-value
      map-options
      class="q-mb-sm"
      @update:model-value="(val: 'exact' | 'contains') => $emit('update:matchType', val)"
    />

    <q-separator class="q-my-md" />

    <div class="text-subtitle2 q-mb-xs">Inject Filter</div>
    <filter-builder
      :model-value="injectedFilter"
      :fields="fields"
      @update:model-value="(val: string) => $emit('update:injectedFilter', val)"
    />

    <div class="text-subtitle2 q-mb-xs q-mt-md">Inject Sort</div>
    <sort-builder
      :model-value="injectedSort"
      :fields="fields"
      @update:model-value="(val: string) => $emit('update:injectedSort', val)"
    />

    <q-separator class="q-my-md" />

    <div class="text-subtitle2 q-mb-xs">Scheduling</div>
    <q-input
      :model-value="effectiveFromStr"
      label="Effective from"
      type="datetime-local"
      dense
      outlined
      class="q-mb-sm"
      clearable
      @update:model-value="(val: string | number | null) => $emit('update:effectiveFrom', val)"
    />
    <q-input
      :model-value="effectiveToStr"
      label="Effective until"
      type="datetime-local"
      dense
      outlined
      class="q-mb-sm"
      clearable
      @update:model-value="(val: string | number | null) => $emit('update:effectiveTo', val)"
    />

    <div class="text-subtitle2 q-mb-xs q-mt-md">Tags</div>
    <q-select
      :model-value="tags"
      label="Tags"
      dense
      outlined
      multiple
      use-chips
      use-input
      new-value-mode="add-unique"
      hide-dropdown-icon
      class="q-mb-md"
      @update:model-value="(val: string[]) => $emit('update:tags', val)"
    />

    <q-separator class="q-my-md" />

    <div v-if="pinnedProducts.length > 0">
      <div class="text-subtitle2 q-mb-xs">
        Pinned Products ({{ pinnedProducts.length }})
      </div>
      <q-list dense>
        <q-item v-for="pin in pinnedProducts" :key="pin.id" class="q-pa-xs">
          <q-item-section side>
            <q-badge color="green" :label="`#${pin.position}`" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ellipsis">{{ pin.id }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round size="xs" icon="sym_s_close" @click="$emit('unpinProduct', pin.id)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <div v-if="hiddenProducts.length > 0" class="q-mt-sm">
      <div class="text-subtitle2 q-mb-xs">
        Hidden Products ({{ hiddenProducts.length }})
      </div>
      <q-list dense>
        <q-item v-for="hidden in hiddenProducts" :key="hidden.id" class="q-pa-xs">
          <q-item-section>
            <q-item-label class="ellipsis">{{ hidden.id }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round size="xs" icon="sym_s_close" @click="$emit('unhideProduct', hidden.id)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-separator class="q-my-md" />

    <div class="row q-gutter-sm">
      <q-btn
        color="primary"
        label="Save Rule"
        no-caps
        :loading="saving"
        class="col"
        @click="$emit('save')"
      />
      <q-btn
        outline
        color="grey"
        label="Cancel"
        no-caps
        class="col"
        @click="$emit('cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import FilterBuilder from 'src/components/FilterBuilder.vue';
import SortBuilder from 'src/components/SortBuilder.vue';
import type { IncludeItem, ExcludeItem } from 'src/shared/curations-utils';

const props = defineProps<{
  mode: 'creating' | 'editing';
  ruleName: string;
  triggerQuery: string;
  triggerFilters: string;
  matchType: 'exact' | 'contains';
  injectedFilter: string;
  injectedSort: string;
  effectiveFromStr: string;
  effectiveToStr: string;
  tags: string[];
  pinnedProducts: IncludeItem[];
  hiddenProducts: ExcludeItem[];
  fields: any[];
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:ruleName': [value: string];
  'update:matchType': [value: 'exact' | 'contains'];
  'update:injectedFilter': [value: string];
  'update:injectedSort': [value: string];
  'update:effectiveFrom': [value: string | number | null];
  'update:effectiveTo': [value: string | number | null];
  'update:tags': [value: string[]];
  unpinProduct: [id: string];
  unhideProduct: [id: string];
  save: [];
  cancel: [];
}>();

const localRuleName = ref(props.ruleName);
watch(() => props.ruleName, (val) => { localRuleName.value = val; });

function onRuleNameChange(val: string | number | null) {
  emit('update:ruleName', String(val ?? ''));
}

const matchTypeOptions = [
  { label: 'Exact phrase match', value: 'exact' },
  { label: 'Contains these words', value: 'contains' },
];
</script>
