<template>
  <q-page padding>
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">What are Ignored Words?</div>
        <div class="q-mt-sm text-body2">
          Some common words (like 'the', 'and', 'of') can clutter search results.
          Add words here that should be ignored when customers search, so they get
          more relevant results.
        </div>
        <div class="q-mt-sm text-body2 text-italic">
          Example: If you add 'the' as an ignored word, searching 'the blue dress'
          works the same as 'blue dress'.
        </div>
      </q-card-section>
    </q-card>

    <q-expansion-item
      v-model="state.expanded"
      expand-separator
      icon="sym_s_add_circle"
      expand-icon="sym_s_unfold_more"
      expanded-icon="sym_s_unfold_less"
      :label="`${isUpdate ? 'Update' : 'Add'} Word List`"
      header-class="bg-primary text-white"
    >
      <q-card class="bg-surface column">
        <q-card-section class="q-col-gutter-md row">
          <q-select
            v-model="state.selectedLanguage"
            :options="languageDropdownOptions"
            class="col-12 col-sm-4"
            filled
            label="Language"
            emit-value
            map-options
          />
          <q-input
            v-if="state.selectedLanguage === '__other__'"
            v-model="state.customLocale"
            filled
            label="Locale code"
            class="col-12 col-sm-4"
          />
          <div class="col-12">
            <q-select
              v-model="state.stopwordsSet.stopwords"
              filled
              multiple
              use-chips
              use-input
              new-value-mode="add"
              stack-label
              hide-dropdown-icon
              label="Words to ignore"
              hint="Type a word and press Enter"
            />
            <q-btn
              v-if="showLoadCommonWords"
              flat
              dense
              no-caps
              color="primary"
              icon="sym_s_download"
              label="Load common words"
              class="q-mt-xs"
              @click="loadCommonWords()"
            />
          </div>
        </q-card-section>
        <q-banner v-if="state.jsonError" inline-actions class="text-white bg-red">
          Invalid Format: {{ state.jsonError }}
        </q-banner>

        <q-card-actions align="right" class="bg-primary">
          <q-btn
            size="md"
            padding="sm lg"
            unelevated
            color="primary"
            :disable="!!state.jsonError"
            @click="createStopwordsSet()"
            >{{ isUpdate ? 'Update' : 'Add' }} Word List
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-expansion-item>

    <q-table
      class="q-mt-md"
      flat
      bordered
      wrap-cells
      :filter="state.filter"
      :rows="store.data.stopwords"
      :columns="state.columns"
      row-key="id"
    >
      <template #top-left>
        <div class="text-h6">
          <q-icon size="md" name="sym_s_playlist_remove" />
          Word Lists
        </div>
      </template>
      <template #top-right>
        <q-input v-model="state.filter" borderless dense debounce="300" placeholder="Search">
          <template #append>
            <q-icon name="sym_s_search" />
          </template>
        </q-input>
      </template>
      <template #no-data>
        <div class="full-width column items-center q-pa-lg">
          <q-icon name="sym_s_playlist_remove" size="48px" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-7">No ignored words yet</div>
          <div class="text-body2 text-grey-6 q-mb-md" style="max-width: 400px; text-align: center;">
            Ignored words are filtered out during search so your customers get more relevant results.
          </div>
          <div class="row q-gutter-sm">
            <q-btn
              unelevated
              color="primary"
              no-caps
              label="Add common English words"
              icon="sym_s_translate"
              @click="openWithCommonEnglish()"
            />
            <q-btn
              outline
              color="primary"
              no-caps
              label="Create your own list"
              icon="sym_s_edit_note"
              @click="openEmptyForm()"
            />
          </div>
        </div>
      </template>
      <template #body-cell-language="props">
        <q-td>
          {{ localeToLanguageName(props.row.locale) }}
        </q-td>
      </template>
      <template #body-cell-stopwords="props">
        <q-td>
          <q-chip v-for="stopword in props.row.stopwords" :key="stopword">
            {{ stopword }}
          </q-chip>
        </q-td>
      </template>
      <template #body-cell-actions_op="props">
        <q-td class="text-right text-no-wrap">
          <q-btn flat icon="sym_s_edit" title="Edit" @click="editStopwordsSet(props.row)"></q-btn>
          <q-btn
            flat
            color="negative"
            icon="sym_s_delete_forever"
            title="Delete"
            @click="deleteStopwordsSet(props.row.id)"
          ></q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { useNodeStore } from 'src/stores/node';
import { computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import type { StopwordSchema } from 'typesense/lib/Typesense/Stopword';
import type { QTableProps } from 'quasar';
import { generateStopwordId } from 'src/shared/curations-utils';
import { LANGUAGE_OPTIONS, localeToLanguageName } from 'src/shared/language-options';
import { COMMON_STOPWORDS, hasCommonStopwords } from 'src/shared/stopwords-data';

const $q = useQuasar();
const store = useNodeStore();

const languageDropdownOptions = [
  ...LANGUAGE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
  { label: 'Other...', value: '__other__' },
];

const state = reactive({
  jsonError: null as string | null,
  stopwordsSet: {
    id: '',
    locale: 'en',
    stopwords: [] as string[],
  },
  selectedLanguage: 'en' as string,
  customLocale: '' as string,
  expanded: store.data.stopwords.length === 0,
  filter: '',
  columns: [
    {
      label: 'Language',
      name: 'language',
      field: 'locale',
      sortable: true,
      align: 'left',
      format: (val: string) => localeToLanguageName(val),
    },
    {
      label: 'Words',
      name: 'stopwords',
      field: 'stopwords',
      sortable: true,
      align: 'left',
    },
    {
      label: 'Actions',
      name: 'actions_op',
      align: 'right',
    },
  ] as QTableProps['columns'],
});

const effectiveLocale = computed(() => {
  if (state.selectedLanguage === '__other__') return state.customLocale;
  return state.selectedLanguage;
});

const isUpdate = computed(() =>
  store.data.stopwords.map((p: any) => p.id).includes(state.stopwordsSet.id),
);

const showLoadCommonWords = computed(() => hasCommonStopwords(state.selectedLanguage));

function loadCommonWords() {
  const key = state.selectedLanguage.slice(0, 2).toLowerCase();
  const words = COMMON_STOPWORDS[key];
  if (words) {
    state.stopwordsSet.stopwords = [...words];
  }
}

function openWithCommonEnglish() {
  state.selectedLanguage = 'en';
  state.customLocale = '';
  state.stopwordsSet = { id: '', locale: 'en', stopwords: [...(COMMON_STOPWORDS['en'] ?? [])] };
  state.expanded = true;
}

function openEmptyForm() {
  state.selectedLanguage = 'en';
  state.customLocale = '';
  state.stopwordsSet = { id: '', locale: 'en', stopwords: [] };
  state.expanded = true;
}

async function createStopwordsSet() {
  const payload = JSON.parse(JSON.stringify(state.stopwordsSet));
  payload.locale = effectiveLocale.value;
  if (!isUpdate.value) {
    payload.id = generateStopwordId(payload.locale);
  }
  await store.upsertStopwords(payload);
}

function editStopwordsSet(stopwordsSet: StopwordSchema) {
  state.stopwordsSet = JSON.parse(JSON.stringify(stopwordsSet));
  // Set the language dropdown to match the locale
  const knownLocale = LANGUAGE_OPTIONS.find((opt) => opt.value === stopwordsSet.locale);
  if (knownLocale) {
    state.selectedLanguage = knownLocale.value;
    state.customLocale = '';
  } else {
    state.selectedLanguage = '__other__';
    state.customLocale = stopwordsSet.locale || '';
  }
  state.expanded = true;
}

function deleteStopwordsSet(id: string) {
  $q.dialog({
    title: 'Confirm',
    message: `Delete word list ${id}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void store.deleteStopwords(id);
  });
}

onMounted(() => {
  void store.getStopwords();
});
</script>
