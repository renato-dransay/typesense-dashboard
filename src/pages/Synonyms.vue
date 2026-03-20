<template>
  <q-page padding>
    <q-expansion-item
      v-model="state.expanded"
      expand-separator
      icon="sym_s_add_circle"
      expand-icon="sym_s_unfold_more"
      expanded-icon="sym_s_unfold_less"
      :label="`${isUpdate ? 'Update' : 'Add'} Synonym`"
      header-class="bg-primary text-white"
    >
      <q-card class="bg-surface column">
        <q-card-section>
          <div class="q-mb-md">
            <q-list>
              <q-item
                v-for="option in typeOptions"
                :key="option.value"
                tag="label"
                clickable
                :active="state.type === option.value"
                active-class="bg-blue-1"
                class="rounded-borders q-mb-xs"
              >
                <q-item-section side>
                  <q-radio v-model="state.type" :val="option.value" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ option.label }}</q-item-label>
                  <q-item-label caption>{{ option.subtitle }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <q-input
            v-if="state.type === types.ONE_WAY"
            v-model="state.synonym.root"
            filled
            stack-label
            label="Trigger word"
            hint="When someone searches for this word..."
            class="q-mb-md"
          ></q-input>

          <q-select
            v-model="state.synonym.synonyms"
            filled
            multiple
            use-chips
            use-input
            new-value-mode="add"
            stack-label
            hide-dropdown-icon
            label="Synonyms"
            :hint="state.type === types.ONE_WAY ? '...also show results for these words' : 'Enter a synonym and press enter'"
          >
          </q-select>

          <div
            v-if="previewText"
            class="q-mt-sm q-pa-sm text-body2 text-grey-8"
            style="background: #f5f5f5; border-radius: 4px;"
            v-html="previewText"
          ></div>
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-none">
          <q-expansion-item
            label="Advanced Options"
            icon="sym_s_tune"
            header-class="text-overline"
            dense
          >
            <q-card-section>
              <q-input
                v-model="state.id"
                label="ID"
                filled
                class="q-mb-md"
                hint="Leave blank to auto-generate"
              ></q-input>

              <q-select
                v-model="state.synonym.symbols_to_index"
                filled
                multiple
                use-chips
                use-input
                new-value-mode="add"
                stack-label
                hide-dropdown-icon
                label="Special Characters"
                hint="Enter a symbol (eg: +, - ) and press enter"
              >
              </q-select>

              <q-input
                v-model="state.synonym.locale"
                filled
                stack-label
                label="Language"
                class="q-mb-md"
                hint="Leave blank to auto-detect"
              ></q-input>
            </q-card-section>
          </q-expansion-item>
        </q-card-section>

        <q-card-actions align="right" class="bg-primary">
          <q-btn
            size="md"
            padding="sm lg"
            unelevated
            color="primary"
            :disable="!isValid"
            @click="createSynonym()"
            >{{ isUpdate ? 'Update' : 'Add' }} Synonym</q-btn
          >
        </q-card-actions>
      </q-card>
    </q-expansion-item>

    <q-table
      class="q-mt-md"
      title="Synonyms"
      flat
      bordered
      :filter="state.filter"
      :rows="store.data.synonyms"
      :columns="state.columns"
      row-key="id"
      :pagination="{ rowsPerPage: 50, sortBy: 'name' }"
    >
      <template #top-left>
        <div class="text-h6"><q-icon size="md" name="sym_s_dataset_linked" /> Synonyms</div>
      </template>
      <template #top-right>
        <q-btn
          flat
          dense
          icon="sym_s_file_upload"
          label="Import"
          class="q-mr-sm"
          title="Import synonyms from JSON file"
          @click="triggerImport()"
        />
        <q-btn
          flat
          dense
          icon="sym_s_file_download"
          label="Export"
          class="q-mr-md"
          title="Export all synonyms as JSON file"
          :disable="store.data.synonyms.length === 0"
          @click="exportSynonyms()"
        />
        <q-input v-model="state.filter" borderless dense debounce="300" placeholder="Search">
          <template #append>
            <q-icon name="sym_s_search" />
          </template>
        </q-input>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileImport"
        />
      </template>
      <template #body-cell-relationship="props">
        <q-td :props="props">
          <span v-if="props.row.root">
            <strong>{{ props.row.root }}</strong> → {{ props.row.synonyms.join(', ') }}
          </span>
          <span v-else>
            {{ props.row.synonyms.join(' ↔ ') }}
          </span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td class="text-right">
          <q-btn flat icon="sym_s_edit" title="Edit" @click="editSynonym(props.row)"></q-btn>
          <q-btn
            flat
            color="negative"
            icon="sym_s_delete_forever"
            title="Delete"
            @click="deleteSynonym(props.row.id)"
          ></q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { useNodeStore } from 'src/stores/node';
import { computed, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { nanoid } from 'nanoid';
import { generateSynonymSlug } from 'src/shared/curations-utils';
import FileSaver from 'file-saver';
import type { SynonymCreateSchema } from 'typesense/lib/Typesense/Synonyms';
import type { SynonymSchema } from 'typesense/lib/Typesense/Synonym';
import type { QTableProps } from 'quasar';

const $q = useQuasar();
const store = useNodeStore();
const route = useRoute();
const fileInputRef = ref<HTMLInputElement | null>(null);

enum RootTypes {
  ONE_WAY = 'one-way',
  MULTI_WAY = 'multi-way',
}

const types = RootTypes;

const typeOptions = [
  {
    label: 'These words mean the same thing',
    subtitle: 'When someone searches for any of these words, show results for all of them.',
    value: RootTypes.MULTI_WAY,
  },
  {
    label: 'This word should also match...',
    subtitle: 'Also show results for these alternatives, but not the other way around.',
    value: RootTypes.ONE_WAY,
  },
];

const state = reactive({
  expanded: store.data.synonyms.length === 0,
  filter: '',
  type: RootTypes.MULTI_WAY,
  synonym: {
    root: '',
    synonyms: [],
    locale: '',
    symbols_to_index: [],
  } as SynonymCreateSchema,
  id: '',
  columns: [
    {
      label: 'Relationship',
      name: 'relationship',
      align: 'left',
      field: (row: SynonymSchema) =>
        row.root
          ? `${row.root} → ${row.synonyms.join(', ')}`
          : row.synonyms.join(' ↔ '),
      sortable: true,
    },
    {
      label: 'Actions',
      name: 'actions',
      align: 'right',
    },
  ] as QTableProps['columns'],
});

const isValid = computed(() => state.synonym.synonyms.length > 0);
const isUpdate = computed(() => store.data.synonyms.map((s) => s.id).includes(state.id));

const previewText = computed(() => {
  if (state.type === RootTypes.MULTI_WAY) {
    if (state.synonym.synonyms.length < 2) return '';
    const words = state.synonym.synonyms.map((w) => `<strong>${w}</strong>`).join(', ');
    return `Searching for any of ${words} will show results for all of them.`;
  } else {
    const trigger = state.synonym.root?.trim();
    if (!trigger || state.synonym.synonyms.length < 1) return '';
    const synonymWords = state.synonym.synonyms.map((w) => `<strong>${w}</strong>`);
    const last = synonymWords.pop();
    const joined = synonymWords.length > 0 ? synonymWords.join(', ') + ' and ' + last : last;
    return `When a customer searches for <strong>${trigger}</strong>, they'll also see results for ${joined}.`;
  }
});

async function createSynonym() {
  const synonym: SynonymCreateSchema = {
    synonyms: JSON.parse(JSON.stringify(state.synonym.synonyms)),
  };

  if (state.type === types.ONE_WAY) {
    synonym.root = state.synonym.root || '';
  }
  if (state.synonym.locale) {
    synonym.locale = state.synonym.locale;
  }
  if (state.synonym.symbols_to_index && state.synonym.symbols_to_index.length > 0) {
    synonym.symbols_to_index = state.synonym.symbols_to_index;
  }

  const synonymId = isUpdate.value ? state.id : (state.id || generateSynonymSlug(synonym.synonyms));

  await store.createSynonym({
    id: synonymId,
    synonym: synonym,
  });

  state.id = '';
  state.synonym = {
    root: '',
    synonyms: [],
    locale: '',
    symbols_to_index: [],
  };
  state.expanded = false;
}

function editSynonym(synonym: SynonymSchema) {
  state.id = synonym.id || nanoid();
  state.synonym = JSON.parse(JSON.stringify(synonym));
  state.type = state.synonym.root ? RootTypes.ONE_WAY : RootTypes.MULTI_WAY;
  state.synonym.locale = state.synonym.locale || '';
  state.synonym.symbols_to_index = state.synonym.symbols_to_index || [];
  state.expanded = true;
}

function deleteSynonym(id: string) {
  $q.dialog({
    title: 'Confirm',
    message: `Delete synonym with id: ${id}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void store.deleteSynonym(id);
  });
}

// T-060: Bulk export synonyms as JSON
function exportSynonyms() {
  const synonyms = store.data.synonyms.map((s: SynonymSchema) => ({
    id: s.id,
    root: s.root,
    synonyms: s.synonyms,
    locale: s.locale,
    symbols_to_index: s.symbols_to_index,
  }));
  const blob = new Blob([JSON.stringify(synonyms, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const collectionName = store.currentCollection?.name || 'synonyms';
  FileSaver.saveAs(blob, `${collectionName}-synonyms.json`);
}

// T-060: Trigger file input for import
function triggerImport() {
  fileInputRef.value?.click();
}

// T-060: Handle file import
async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const synonyms = JSON.parse(text);

    if (!Array.isArray(synonyms)) {
      $q.notify({ type: 'negative', message: 'Invalid JSON: expected an array of synonyms.' });
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const entry of synonyms) {
      try {
        const id = entry.id || nanoid();
        const synonym: SynonymCreateSchema = {
          synonyms: entry.synonyms || [],
        };
        if (entry.root) {
          synonym.root = entry.root;
        }
        if (entry.locale) {
          synonym.locale = entry.locale;
        }
        if (entry.symbols_to_index && entry.symbols_to_index.length > 0) {
          synonym.symbols_to_index = entry.symbols_to_index;
        }

        await store.createSynonym({ id, synonym });
        successCount++;
      } catch {
        failureCount++;
      }
    }

    $q.notify({
      type: failureCount === 0 ? 'positive' : 'warning',
      message: `Import complete: ${successCount} succeeded, ${failureCount} failed.`,
    });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to parse JSON file.' });
  } finally {
    // Reset file input so the same file can be re-imported
    target.value = '';
  }
}

// T-061: Pre-fill from query parameter
function applyPrefill() {
  const prefill = route.query.prefill;
  if (prefill && typeof prefill === 'string') {
    state.synonym.synonyms = [prefill] as unknown as string[];
    state.expanded = true;
  }
}

onMounted(() => {
  if (store.currentCollection) {
    void store.getSynonyms(store.currentCollection.name);
  }
  applyPrefill();
});
</script>
