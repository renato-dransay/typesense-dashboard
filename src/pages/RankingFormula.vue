<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Left panel -->
      <div class="col-12 col-md-7">
        <!-- Header -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6">Product Ranking</div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Configure how products are ranked in search results.
            </div>
          </q-card-section>
        </q-card>

        <template v-if="selectedCollection">
          <!-- ===================== PRIORITY TIERS ===================== -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Priority Tiers</div>
              <div class="text-caption text-grey-7">
                Products matching these conditions are always shown first, regardless of score.
              </div>
            </q-card-section>

            <q-list v-if="sortEntries.length > 0" separator class="sort-list">
              <q-item v-for="(entry, idx) in sortEntries" :key="entry.name">
                <q-item-section side>
                  <span class="text-grey-6 text-caption">{{ idx + 1 }}</span>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ entry.label }}</q-item-label>
                  <q-item-label caption>{{ entry.name }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row items-center no-wrap q-gutter-sm">
                    <q-btn-toggle
                      v-model="entry.direction"
                      dense
                      no-caps
                      unelevated
                      toggle-color="primary"
                      :options="[
                        { label: 'Desc', value: 'desc' },
                        { label: 'Asc', value: 'asc' },
                      ]"
                      style="font-size: 0.75rem"
                    />
                    <q-btn flat dense round icon="sym_s_close" size="sm" color="grey-6" @click="removeSortEntry(idx)" />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>

            <q-card-section v-if="sortEntries.length === 0">
              <div class="row items-center q-gutter-sm">
                <q-select
                  v-model="sortToAdd"
                  :options="availableSortOptions"
                  label="Add attribute"
                  dense
                  outlined
                  class="col"
                  use-input
                  input-debounce="0"
                  @filter="filterSortOptions"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.value }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <q-btn dense unelevated color="primary" icon="sym_s_add" :disable="!sortToAdd" @click="addSortEntry" />
              </div>
            </q-card-section>
          </q-card>

          <!-- ===================== PROMOTION RULES ===================== -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Boost Rules</div>
              <div class="text-caption text-grey-7">
                Boost products that match these conditions.
                Higher boost = more impact on ranking. 1 = subtle nudge, 100 = strong push.
              </div>
            </q-card-section>

            <q-list v-if="boostRules.length > 0" separator class="sort-list">
              <q-item v-for="(rule, idx) in boostRules" :key="rule.id" class="q-py-md">
                <q-item-section side>
                  <span class="text-grey-6 text-caption">{{ idx + 1 }}</span>
                </q-item-section>
                <q-item-section>
                  <div class="row items-center q-gutter-sm q-mb-xs">
                    <span class="text-grey-7 text-weight-medium">If</span>
                    <q-select
                      v-model="rule.field"
                      :options="allFieldOptions"
                      label="field"
                      dense
                      outlined
                      emit-value
                      map-options
                      style="min-width: 150px"
                      class="col-auto"
                      @update:model-value="onRuleFieldChange(rule)"
                    />
                    <q-select
                      v-model="rule.condition"
                      :options="conditionOptions(rule.field)"
                      label="condition"
                      dense
                      outlined
                      emit-value
                      map-options
                      style="min-width: 140px"
                      class="col-auto"
                    />
                    <q-input
                      v-if="needsValue(rule.condition)"
                      v-model="rule.value"
                      :label="valueLabel(rule.field, rule.condition)"
                      dense
                      outlined
                      style="width: 100px"
                      class="col-auto"
                    />
                  </div>
                  <div class="row items-center q-gutter-sm">
                    <span class="text-grey-7 text-weight-medium">Boost</span>
                    <q-slider
                      v-model="rule.boost"
                      :min="1"
                      :max="100"
                      :step="1"
                      label
                      :label-value="rule.boost"
                      style="min-width: 160px; max-width: 200px"
                      class="col-auto"
                      color="amber-8"
                    />
                    <q-input
                      v-model.number="rule.boost"
                      type="number"
                      dense
                      outlined
                      style="width: 60px"
                      class="col-auto"
                    />
                  </div>
                  <div class="text-caption text-grey-5 q-mt-xs">
                    {{ ruleDescription(rule) }}
                  </div>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense round icon="sym_s_close" size="sm" color="grey-6" @click="removeBoostRule(idx)" />
                </q-item-section>
              </q-item>
            </q-list>

            <q-card-section>
              <q-btn unelevated color="amber-8" text-color="white" label="Add Rule" icon="sym_s_add" @click="addBoostRule" />
            </q-card-section>
          </q-card>

          <!-- ===================== WHAT MATTERS MOST ===================== -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">What Matters Most</div>
              <div class="text-caption text-grey-7">
                Choose which product attributes influence ranking and how much each one matters.
                Requires "Recalculate" to take effect (boost rules are also included).
              </div>
            </q-card-section>

            <q-list v-if="rankingFactors.length > 0" separator class="sort-list">
              <q-item
                v-for="(factor, idx) in rankingFactors"
                :key="factor.id"
                draggable="true"
                class="cursor-move q-py-md"
                :class="{ 'bg-blue-1': factorDragIdx === idx }"
                @dragstart="onFactorDragStart(idx, $event)"
                @dragover.prevent
                @dragend="factorDragIdx = null"
                @drop.prevent="onFactorDrop(idx)"
              >
                <q-item-section side>
                  <div class="row items-center no-wrap">
                    <q-icon name="sym_s_drag_indicator" size="xs" class="text-grey-5 q-mr-xs" />
                    <span class="text-grey-6 text-caption">{{ idx + 1 }}</span>
                  </div>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ factor.label }}</q-item-label>
                  <q-item-label caption>{{ factor.field }}</q-item-label>
                  <div class="row items-center no-wrap q-gutter-sm q-mt-xs" style="max-width: 320px">
                    <q-slider
                      v-model="factor.weight"
                      :min="0"
                      :max="100"
                      :step="1"
                      label
                      label-always
                      class="col"
                      color="primary"
                    />
                    <q-input
                      v-model.number="factor.weight"
                      type="number"
                      dense
                      outlined
                      style="width: 60px"
                      :min="0"
                      :max="100"
                    />
                  </div>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense round icon="sym_s_close" size="sm" color="grey-6" @click="removeRankingFactor(idx)" />
                </q-item-section>
              </q-item>
            </q-list>

            <q-card-section>
              <div class="row items-center q-gutter-sm">
                <q-select
                  v-model="factorToAdd"
                  :options="availableFactorOptions"
                  label="Add attribute"
                  dense
                  outlined
                  class="col"
                  use-input
                  input-debounce="0"
                  @filter="filterFactorOptions"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.value }} ({{ scope.opt.type }})</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-6">No more numeric fields</q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <q-btn dense unelevated color="primary" icon="sym_s_add" :disable="!factorToAdd" @click="addRankingFactor" />
              </div>
            </q-card-section>
          </q-card>

          <!-- ===================== FORMULA & ACTIONS ===================== -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section v-if="rankingFactors.length > 0 || activeBoostRules.length > 0">
              <div class="text-subtitle2 text-grey-8 q-mb-sm">How your score is calculated</div>
              <div class="q-pa-sm bg-grey-2 rounded-borders formula-box">
                <span class="text-weight-bold">Score</span> =
                <template v-for="(factor, idx) in activeFactors" :key="factor.id">
                  <span v-if="idx > 0" class="text-grey-6"> + </span>
                  <span class="text-weight-bold text-primary">{{ factorPercent(factor) }}%</span>
                  <span class="q-ml-xs">{{ factor.label }}</span>
                </template>
                <template v-for="rule in activeBoostRules" :key="rule.id">
                  <span class="text-grey-6"> + </span>
                  <span class="text-weight-bold text-amber-8">+{{ rule.boost }}</span>
                  <span class="q-ml-xs text-caption">{{ friendlyFactorLabel(rule.field) }}</span>
                </template>
              </div>
            </q-card-section>

            <q-separator v-if="rankingFactors.length > 0 || activeBoostRules.length > 0" />

            <q-card-section>
              <div class="row items-center q-gutter-sm">
                <q-btn flat label="Reset" color="grey-7" @click="resetToDefaults" />
                <q-space />
                <q-btn
                  unelevated
                  label="Save Preset"
                  color="primary"
                  icon="sym_s_save"
                  :loading="saving"
                  @click="savePreset"
                />
                <q-btn
                  unelevated
                  label="Recalculate All Scores"
                  color="negative"
                  icon="sym_s_published_with_changes"
                  :disable="rankingFactors.length === 0 && activeBoostRules.length === 0"
                  @click="confirmApply"
                />
              </div>
            </q-card-section>

            <q-banner v-if="presetNote" class="bg-blue-1 text-blue-9 q-mx-md q-mb-md" rounded>
              <template #avatar><q-icon name="sym_s_info" color="blue" /></template>
              {{ presetNote }}
            </q-banner>

            <q-banner v-if="staleScoreCount > 0" class="bg-amber-1 text-amber-9 q-mx-md q-mb-md" rounded>
              <template #avatar><q-icon name="sym_s_warning" color="amber-8" /></template>
              {{ staleScoreCount }} products added since last calculation — scores may be outdated.
              <template #action>
                <q-btn flat color="amber-9" label="Recalculate" @click="confirmApply" />
              </template>
            </q-banner>

            <q-card-section v-if="batchRunning">
              <q-linear-progress :value="batchTotal > 0 ? batchCurrent / batchTotal : 0" size="20px" color="primary">
                <div class="absolute-full flex flex-center">
                  <q-badge color="white" text-color="primary" :label="`${batchCurrent} / ${batchTotal}`" />
                </div>
              </q-linear-progress>
              <q-btn flat label="Cancel" color="negative" class="q-mt-sm" @click="cancelBatch" />
            </q-card-section>

            <q-banner v-if="batchDone && !batchRunning" class="bg-positive text-white q-mx-md q-mb-md" rounded>
              Done. {{ batchCurrent }} batches processed.{{ batchFailures > 0 ? ` ${batchFailures} failed.` : '' }}
            </q-banner>
            <q-banner v-if="batchError" class="bg-negative text-white q-mx-md q-mb-md" rounded>
              {{ batchError }}
            </q-banner>
          </q-card>

          <!-- Generated sort_by (collapsed) -->
          <q-card flat bordered>
            <q-expansion-item
              label="Generated Parameters"
              caption="The sort_by sent to Typesense"
              icon="sym_s_code"
              header-class="text-subtitle2"
            >
              <q-card-section class="q-pt-none">
                <code class="formula-box q-pa-sm bg-grey-2 rounded-borders">
                  sort_by: {{ generatedSortBy || '(empty)' }}
                </code>
              </q-card-section>
            </q-expansion-item>
          </q-card>
        </template>

        <q-card v-else flat bordered>
          <q-card-section class="text-grey-6 text-center q-pa-lg">
            Select a collection to configure ranking.
          </q-card-section>
        </q-card>
      </div>

      <!-- ===================== LIVE PREVIEW ===================== -->
      <div class="col-12 col-md-5">
        <q-card flat bordered class="sticky-preview">
          <q-card-section class="q-pb-sm">
            <div class="text-h6">Preview</div>
            <div class="text-caption text-grey-7">
              Live ranking simulation with your current settings.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="!selectedCollection" class="text-grey-6 text-center q-pa-lg">
            Select a collection from the top bar to preview ranking.
          </q-card-section>

          <q-card-section v-else-if="previewLoading" class="text-center q-pa-lg">
            <q-spinner color="primary" size="2em" />
          </q-card-section>

          <q-card-section v-else-if="previewError" class="text-negative">
            {{ previewError }}
          </q-card-section>

          <template v-else-if="previewProducts.length > 0">
            <q-list separator>
              <q-item v-for="(p, idx) in previewProducts" :key="p.id" dense class="q-py-sm">
                <q-item-section side class="q-pr-sm">
                  <q-avatar
                    :color="idx < 3 ? 'amber' : 'grey-4'"
                    :text-color="idx < 3 ? 'white' : 'grey-8'"
                    size="28px"
                    font-size="0.7rem"
                  >
                    {{ idx + 1 }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium ellipsis" style="font-size: 0.85rem">
                    {{ p.title }}
                  </q-item-label>
                  <q-item-label caption>
                    <span class="text-primary text-weight-bold">Score: {{ p.score }} / {{ maxPossibleScore }}</span>
                  </q-item-label>
                  <q-linear-progress
                    :value="maxPossibleScore > 0 ? p.score / maxPossibleScore : 0"
                    size="6px"
                    color="primary"
                    track-color="grey-3"
                    rounded
                    class="q-my-xs"
                    style="max-width: 200px"
                  />
                  <q-item-label caption>
                    <span class="text-grey-6" style="font-size: 0.7rem">
                      <template v-for="(part, i) in p.breakdown" :key="i">
                        <span v-if="i > 0"> · </span>{{ part }}
                      </template>
                    </span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </template>

          <q-card-section v-else class="text-grey-6 text-center q-pa-lg">
            No results.
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Confirm dialog -->
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">Recalculate All Scores</div>
        </q-card-section>
        <q-card-section>
          This will recalculate the ranking score for every product
          in <strong>{{ selectedCollection }}</strong>.
          <div class="q-mt-sm formula-box q-pa-sm bg-grey-2 rounded-borders">
            <span class="text-weight-bold">Score</span> =
            <template v-for="(factor, idx) in activeFactors" :key="factor.id">
              <span v-if="idx > 0" class="text-grey-6"> + </span>
              <span class="text-weight-bold text-primary">{{ factorPercent(factor) }}%</span>
              <span class="q-ml-xs">{{ factor.label }}</span>
            </template>
            <template v-for="rule in activeBoostRules" :key="rule.id">
              <span class="text-grey-6"> + </span>
              <span class="text-weight-bold text-amber-8">+{{ rule.boost }}</span>
              <span class="q-ml-xs text-caption">{{ friendlyFactorLabel(rule.field) }}</span>
            </template>
          </div>
          <p v-if="activeBoostRules.length > 0" class="q-mt-sm q-mb-none">
            Boost rules ({{ activeBoostRules.length }}) are included in the recalculation.
            Time-based rules may become stale between recalculations.
          </p>
          <p class="text-negative q-mt-sm q-mb-none">This cannot be undone automatically.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn v-close-popup flat label="Apply" color="negative" @click="runBatchUpdate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Notify } from 'quasar';
import { useNodeStore } from 'src/stores/node';
import type { Api } from 'src/shared/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SortEntry {
  name: string;
  label: string;
  direction: 'asc' | 'desc';
}

interface BoostRule {
  id: string;
  field: string;
  condition: string;
  value: string;
  boost: number;
}

interface RankingFactor {
  id: string;
  field: string;
  label: string;
  weight: number;
}

interface SchemaField {
  name: string;
  type: string;
}

interface PreviewProduct {
  id: string;
  title: string;
  score: number;
  breakdown: string[];
}

interface SelectOption {
  label: string;
  value: string;
  type?: string;
}

// Percentile rank maps: field name → (value → percentile 0.0-1.0)
const percentileRanks = ref<Record<string, Map<number, number>>>({});

function computePercentileRanks(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n <= 1) {
    const map = new Map<number, number>();
    if (n === 1) map.set(sorted[0] as number, 0.5);
    return map;
  }
  const map = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const v = sorted[i] as number;
    if (!map.has(v)) {
      map.set(v, i / (n - 1));
    }
  }
  return map;
}

function percentileRank(field: string, value: number): number {
  const map = percentileRanks.value[field];
  if (!map || map.size === 0) return 0;
  const exact = map.get(value);
  if (exact !== undefined) return exact;
  // Interpolate: find nearest lower and upper
  let lower = 0;
  let upper = 1;
  for (const [v, pct] of map) {
    if (v <= value && pct >= lower) lower = pct;
    if (v >= value && pct <= upper) upper = pct;
  }
  return (lower + upper) / 2;
}

function computePreviewPercentiles(docs: Record<string, unknown>[], fields: string[]) {
  const result: Record<string, Map<number, number>> = {};
  for (const field of fields) {
    const values = docs.map(d => Number(d[field] ?? 0));
    result[field] = computePercentileRanks(values);
  }
  percentileRanks.value = { ...percentileRanks.value, ...result };
}

const SORTABLE_TYPES = new Set(['int32', 'int64', 'float', 'bool']);
const NUMERIC_TYPES = new Set(['int32', 'int64', 'float']);
const SCORE_FIELD = 'weighted_score';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
const store = useNodeStore();
const PRESET_NAME = 'default_product_ranking';

const selectedCollection = computed(() => store.currentCollection?.name ?? null);

const schemaFields = ref<SchemaField[]>([]);
const boolFields = computed(() => schemaFields.value.filter((f) => f.type === 'bool'));
const numericFields = computed(() => schemaFields.value.filter((f) => NUMERIC_TYPES.has(f.type)));

// ---------------------------------------------------------------------------
// Sort Order (primary boolean sort)
// ---------------------------------------------------------------------------
const sortEntries = reactive<SortEntry[]>([]);
const sortToAdd = ref<SelectOption | null>(null);
const sortFilterText = ref('');

function friendlySortLabel(name: string): string {
  const clean = name.replace(/^is_/, '').replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const availableSortOptions = computed(() => {
  const used = new Set(sortEntries.map((e) => e.name));
  const needle = sortFilterText.value.toLowerCase();
  return boolFields.value
    .filter((f) => !used.has(f.name))
    .filter((f) => !needle || f.name.toLowerCase().includes(needle))
    .map((f) => ({ label: friendlySortLabel(f.name), value: f.name }));
});

function filterSortOptions(val: string, update: (fn: () => void) => void) {
  update(() => { sortFilterText.value = val; });
}

function addSortEntry() {
  if (!sortToAdd.value) return;
  sortEntries.push({
    name: sortToAdd.value.value,
    label: sortToAdd.value.label,
    direction: 'desc',
  });
  sortToAdd.value = null;
}

function removeSortEntry(idx: number) {
  sortEntries.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Boost Rules (additive score conditions)
// ---------------------------------------------------------------------------
const boostRules = reactive<BoostRule[]>([]);
let ruleIdSeq = 0;

const allFieldOptions = computed(() =>
  schemaFields.value.map((f) => ({ label: `${friendlyFactorLabel(f.name)} (${f.type})`, value: f.name })),
);

interface ConditionOption { label: string; value: string }

function conditionOptions(fieldName: string): ConditionOption[] {
  const schema = schemaFields.value.find((f) => f.name === fieldName);
  if (!schema) return [{ label: 'is true', value: 'is_true' }];

  if (schema.type === 'bool') {
    return [
      { label: 'is true', value: 'is_true' },
      { label: 'is false', value: 'is_false' },
    ];
  }

  // int64 fields with date-like names get time-based conditions
  if (isDateField(fieldName, schema.type)) {
    return [
      { label: 'is newer than (days)', value: 'newer_than_days' },
      { label: 'is older than (days)', value: 'older_than_days' },
      { label: 'is above', value: 'above' },
      { label: 'is below', value: 'below' },
    ];
  }

  return [
    { label: 'is above', value: 'above' },
    { label: 'is below', value: 'below' },
    { label: 'equals', value: 'equals' },
  ];
}

function needsValue(condition: string): boolean {
  return condition !== 'is_true' && condition !== 'is_false';
}

function valueLabel(fieldName: string, condition: string): string {
  if (condition === 'newer_than_days' || condition === 'older_than_days') return 'days';
  const schema = schemaFields.value.find((f) => f.name === fieldName);
  if (schema?.type === 'float') return 'value';
  return 'value';
}

function ruleDescription(rule: BoostRule): string {
  const fieldLabel = friendlyFactorLabel(rule.field);
  switch (rule.condition) {
    case 'is_true': return `${fieldLabel} products get +${rule.boost} boost`;
    case 'is_false': return `Non-${fieldLabel.toLowerCase()} products get +${rule.boost} boost`;
    case 'newer_than_days': return `Products added in the last ${rule.value} days get +${rule.boost} boost`;
    case 'older_than_days': return `Products older than ${rule.value} days get +${rule.boost} boost`;
    case 'above': return `Products where ${fieldLabel} > ${rule.value} get +${rule.boost} boost`;
    case 'below': return `Products where ${fieldLabel} < ${rule.value} get +${rule.boost} boost`;
    case 'equals': return `Products where ${fieldLabel} = ${rule.value} get +${rule.boost} boost`;
    default: return '';
  }
}

function isDateField(fieldName: string, fieldType: string): boolean {
  return fieldType === 'int64' && /date|time|created|updated|_at$/i.test(fieldName);
}

function defaultConditionForField(fieldName: string): string {
  const schema = schemaFields.value.find((f) => f.name === fieldName);
  if (!schema) return 'is_true';
  if (schema.type === 'bool') return 'is_true';
  if (isDateField(fieldName, schema.type)) return 'newer_than_days';
  return 'above';
}

function defaultValueForCondition(condition: string): string {
  if (condition === 'is_true' || condition === 'is_false') return '';
  if (condition === 'newer_than_days' || condition === 'older_than_days') return '30';
  return '0';
}

function onRuleFieldChange(rule: BoostRule) {
  rule.condition = defaultConditionForField(rule.field);
  rule.value = defaultValueForCondition(rule.condition);
}

function addBoostRule() {
  const defaultField = schemaFields.value[0]?.name ?? '';
  const condition = defaultConditionForField(defaultField);
  boostRules.push({
    id: `r${++ruleIdSeq}`,
    field: defaultField,
    condition,
    value: defaultValueForCondition(condition),
    boost: 30,
  });
}

function removeBoostRule(idx: number) {
  boostRules.splice(idx, 1);
}

const activeBoostRules = computed(() => boostRules.filter((r) => r.boost > 0));

// ---------------------------------------------------------------------------
// Ranking Factors (numeric fields, written to weighted_score)
// ---------------------------------------------------------------------------
const rankingFactors = reactive<RankingFactor[]>([]);
const factorToAdd = ref<SelectOption | null>(null);
const factorFilterText = ref('');
const factorDragIdx = ref<number | null>(null);
let factorIdSeq = 0;

function friendlyFactorLabel(name: string): string {
  const clean = name.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const EXCLUDED_FACTOR_FIELDS = new Set(['weighted_score', 'default_rank', 'default_rank_with_pin']);

function isTimestampField(name: string): boolean {
  return /(_at|_date|_time|timestamp)$/i.test(name);
}

const availableFactorOptions = computed(() => {
  const used = new Set(rankingFactors.map((f) => f.field));
  const needle = factorFilterText.value.toLowerCase();
  return numericFields.value
    .filter((f) => !used.has(f.name))
    .filter((f) => !EXCLUDED_FACTOR_FIELDS.has(f.name))
    .filter((f) => !isTimestampField(f.name))
    .filter((f) => !needle || f.name.toLowerCase().includes(needle))
    .map((f) => ({ label: friendlyFactorLabel(f.name), value: f.name, type: f.type }));
});

function filterFactorOptions(val: string, update: (fn: () => void) => void) {
  update(() => { factorFilterText.value = val; });
}

function addRankingFactor() {
  if (!factorToAdd.value) return;
  rankingFactors.push({
    id: `f${++factorIdSeq}`,
    field: factorToAdd.value.value,
    label: factorToAdd.value.label,
    weight: 50,
  });
  factorToAdd.value = null;
  if (selectedCollection.value) void fetchPreview();
}

function removeRankingFactor(idx: number) {
  rankingFactors.splice(idx, 1);
}

function onFactorDragStart(idx: number, e: DragEvent) {
  factorDragIdx.value = idx;
  e.dataTransfer?.setData('text/plain', String(idx));
}
function onFactorDrop(target: number) {
  if (factorDragIdx.value === null || factorDragIdx.value === target) return;
  const item = rankingFactors.splice(factorDragIdx.value, 1)[0];
  if (item) rankingFactors.splice(target, 0, item);
  factorDragIdx.value = null;
}

const activeFactors = computed(() => rankingFactors.filter((f) => f.weight > 0));

function factorPercent(factor: RankingFactor): number {
  const total = activeFactors.value.reduce((sum, f) => sum + f.weight, 0);
  return total > 0 ? Math.round((factor.weight / total) * 100) : 0;
}

const maxPossibleScore = computed(() => {
  const factorMax = activeFactors.value.reduce((sum, f) => sum + f.weight, 0);
  const boostMax = activeBoostRules.value.reduce((sum, r) => sum + r.boost, 0);
  return factorMax + boostMax;
});

// ---------------------------------------------------------------------------
// Generated sort_by (boolean sorts + weighted_score)
// ---------------------------------------------------------------------------
const generatedSortBy = computed(() => {
  const parts: string[] = [];
  for (const e of sortEntries) parts.push(`${e.name}:${e.direction}`);
  if (activeFactors.value.length > 0 || activeBoostRules.value.length > 0) {
    parts.push(`${SCORE_FIELD}:desc`);
  }
  return parts.join(',');
});

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------
function computeScore(doc: Record<string, unknown>): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];

  for (const f of activeFactors.value) {
    const raw = Number(doc[f.field] ?? 0);
    const pct = percentileRank(f.field, raw);
    const contribution = Math.round(pct * f.weight);
    score += contribution;
    breakdown.push(`${friendlyFactorLabel(f.field)} ${contribution}/${f.weight}`);
  }

  // Boost rules (additive)
  for (const r of activeBoostRules.value) {
    if (ruleMatches(r, doc)) {
      score += r.boost;
      breakdown.push(`${friendlyFactorLabel(r.field)} +${r.boost}`);
    }
  }

  return { score, breakdown };
}

function ruleMatches(rule: BoostRule, doc: Record<string, unknown>): boolean {
  const val = doc[rule.field];
  switch (rule.condition) {
    case 'is_true': return val === true;
    case 'is_false': return val === false;
    case 'newer_than_days': {
      const days = Number(rule.value) || 0;
      const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
      return Number(val ?? 0) > cutoff;
    }
    case 'older_than_days': {
      const days = Number(rule.value) || 0;
      const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
      return Number(val ?? 0) < cutoff;
    }
    case 'above': return Number(val ?? 0) > Number(rule.value);
    case 'below': return Number(val ?? 0) < Number(rule.value);
    case 'equals': return String(val) === rule.value;
    default: return false;
  }
}


// ---------------------------------------------------------------------------
// Schema loading
// ---------------------------------------------------------------------------
function loadSchemaFields(collectionName: string) {
  const collection = store.data.collections.find((c) => c.name === collectionName);
  if (!collection?.fields) {
    schemaFields.value = [];
    return;
  }
  schemaFields.value = (collection.fields as any[])
    .filter((f: any) => SORTABLE_TYPES.has(f.type) && f.name !== 'id')
    .map((f: any) => ({ name: f.name as string, type: f.type as string }));
}

async function onCollectionChange(name: string | null) {
  sortEntries.splice(0);
  boostRules.splice(0);
  rankingFactors.splice(0);
  schemaFields.value = [];
  previewProducts.value = [];
  previewError.value = '';
  presetNote.value = '';
  batchDone.value = false;
  batchError.value = null;
  percentileRanks.value = {};

  if (!name) return;

  loadSchemaFields(name);
  await loadExistingPreset();
  await checkStaleScores();

  // Defaults if no preset loaded
  if (sortEntries.length === 0 && boostRules.length === 0 && rankingFactors.length === 0) {
    // Primary sort
    const avail = boolFields.value.find((b) => b.name === 'is_available');
    if (avail) sortEntries.push({ name: avail.name, label: friendlySortLabel(avail.name), direction: 'desc' });

    // Default boost rules
    const featured = boolFields.value.find((b) => b.name === 'is_featured');
    if (featured) {
      boostRules.push({ id: `r${++ruleIdSeq}`, field: 'is_featured', condition: 'is_true', value: '', boost: 40 });
    }
    const createdAt = schemaFields.value.find((f) => f.name === 'created_at');
    if (createdAt) {
      boostRules.push({ id: `r${++ruleIdSeq}`, field: 'created_at', condition: 'newer_than_days', value: '30', boost: 20 });
    }

    // Default ranking factors
    const defaultFactors = [
      { name: 'popularity', weight: 60 },
      { name: 'avg_rating', weight: 40 },
    ];
    for (const d of defaultFactors) {
      const f = numericFields.value.find((n) => n.name === d.name);
      if (f) {
        rankingFactors.push({
          id: `f${++factorIdSeq}`,
          field: f.name,
          label: friendlyFactorLabel(f.name),
          weight: d.weight,
        });
      }
    }
  }

  void fetchPreview();
}

function resetToDefaults() {
  sortEntries.splice(0);
  boostRules.splice(0);
  rankingFactors.splice(0);
  presetNote.value = '';
  batchDone.value = false;
  batchError.value = null;
  if (selectedCollection.value) void onCollectionChange(selectedCollection.value);
}


// ---------------------------------------------------------------------------
// Preset load / save
// ---------------------------------------------------------------------------
const saving = ref(false);
const presetNote = ref('');
const lastRecalcNumDocs = ref(0);

const staleScoreCount = ref(0);

async function checkStaleScores() {
  if (!selectedCollection.value || lastRecalcNumDocs.value === 0) {
    staleScoreCount.value = 0;
    return;
  }
  try {
    const api = store.api as Api;
    const result = await api.search(selectedCollection.value, {
      q: '*', query_by: 'name', per_page: 0, page: 1,
    } as any);
    const currentCount = result?.found ?? 0;
    const diff = currentCount - lastRecalcNumDocs.value;
    staleScoreCount.value = diff > 0 ? diff : 0;
  } catch {
    staleScoreCount.value = 0;
  }
}

function migrateBoostValue(boost: number): number {
  return Math.min(100, Math.max(1, Math.round(boost)));
}

async function loadExistingPreset() {
  try {
    await store.getSearchPresets();
    const existing = store.data.searchPresets.find((p: any) => p.name === PRESET_NAME);
    if (!existing?.value) return;
    const val = existing.value as any;

    if (val.sort_entries && Array.isArray(val.sort_entries)) {
      for (const e of val.sort_entries) {
        sortEntries.push({
          name: e.name ?? '',
          label: e.label ?? friendlySortLabel(e.name ?? ''),
          direction: e.direction === 'asc' ? 'asc' : 'desc',
        });
      }
    }

    if (val.boost_rules && Array.isArray(val.boost_rules)) {
      for (const r of val.boost_rules) {
        boostRules.push({
          id: `r${++ruleIdSeq}`,
          field: r.field ?? '',
          condition: r.condition ?? 'is_true',
          value: r.value ?? '',
          boost: migrateBoostValue(Number(r.boost ?? 5)),
        });
      }
    }

    if (val.ranking_factors && Array.isArray(val.ranking_factors)) {
      for (const f of val.ranking_factors) {
        rankingFactors.push({
          id: `f${++factorIdSeq}`,
          field: f.field ?? '',
          label: f.label ?? friendlyFactorLabel(f.field ?? ''),
          weight: Number(f.weight ?? 50),
        });
      }
    }

    if (val.last_recalc_num_docs != null) {
      lastRecalcNumDocs.value = Number(val.last_recalc_num_docs);
    }

    if (sortEntries.length > 0 || boostRules.length > 0 || rankingFactors.length > 0) {
      presetNote.value = `Loaded preset "${PRESET_NAME}".`;
    }
  } catch { /* no preset */ }
}

async function savePreset() {
  saving.value = true;
  try {
    const presetValue = {
      sort_by: generatedSortBy.value,
      sort_entries: sortEntries.map((e) => ({ name: e.name, label: e.label, direction: e.direction })),
      boost_rules: boostRules.map((r) => ({ field: r.field, condition: r.condition, value: r.value, boost: r.boost })),
      ranking_factors: rankingFactors.map((f) => ({ field: f.field, label: f.label, weight: f.weight })),
      last_recalc_at: Date.now(),
      last_recalc_num_docs: lastRecalcNumDocs.value,
    };
    await store.api?.upsertSearchPreset(PRESET_NAME, { value: presetValue } as any);
    await store.getSearchPresets();
    presetNote.value = `Preset saved.`;
    Notify.create({ position: 'top', timeout: 3000, color: 'positive', message: 'Ranking preset saved' });
  } catch (err) {
    Notify.create({ position: 'top', timeout: 5000, color: 'negative', message: 'Save failed: ' + (err as Error).message });
  } finally {
    saving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Live preview (client-side re-ranking)
// ---------------------------------------------------------------------------
const previewLoading = ref(false);
const previewError = ref('');
const previewProducts = ref<PreviewProduct[]>([]);
let rawDocs: Record<string, unknown>[] = [];

async function fetchPreview() {
  if (!selectedCollection.value) return;
  previewLoading.value = true;
  previewError.value = '';

  try {
    const api = store.api as Api;
    const boolSort = sortEntries.map((e) => `${e.name}:${e.direction}`).join(',');
    const result = await api.search(selectedCollection.value, {
      q: '*',
      query_by: 'name',
      sort_by: boolSort || undefined,
      per_page: 50,
      page: 1,
    } as any);

    rawDocs = (result?.hits ?? []).map((h: any) => h.document ?? {});
    const factorFields = activeFactors.value.map((f) => f.field);
    if (factorFields.length > 0) computePreviewPercentiles(rawDocs, factorFields);
    recomputePreview();
  } catch (err: any) {
    previewError.value = err.message ?? 'Failed';
    previewProducts.value = [];
  } finally {
    previewLoading.value = false;
  }
}

function recomputePreview() {
  if (rawDocs.length === 0) { previewProducts.value = []; return; }

  const scored = rawDocs.map((doc) => {
    const { score, breakdown } = computeScore(doc);
    return {
      id: typeof doc.id === 'string' ? doc.id : JSON.stringify(doc.id ?? ''),
      title: typeof doc.name === 'string' ? doc.name : typeof doc.title === 'string' ? doc.title : JSON.stringify(doc.id ?? 'Untitled'),
      score,
      breakdown,
      doc,
    };
  });

  const sortKeys = sortEntries.map((e) => e.name);
  scored.sort((a, b) => {
    for (const key of sortKeys) {
      const av = a.doc[key] ? 1 : 0;
      const bv = b.doc[key] ? 1 : 0;
      const dir = sortEntries.find((e) => e.name === key)?.direction === 'asc' ? 1 : -1;
      if (av !== bv) return (bv - av) * dir;
    }
    return b.score - a.score;
  });

  previewProducts.value = scored.slice(0, 20).map(({ id, title, score, breakdown }) => ({ id, title, score, breakdown }));
}

// Re-rank when weights or boost rules change
watch(
  () => [
    rankingFactors.map((f) => `${f.field}:${f.weight}`).join(','),
    boostRules.map((r) => `${r.field}:${r.condition}:${r.value}:${r.boost}`).join(','),
  ],
  () => recomputePreview(),
);

watch(
  () => sortEntries.map((e) => `${e.name}:${e.direction}`).join(','),
  () => { if (selectedCollection.value) void fetchPreview(); },
);

// ---------------------------------------------------------------------------
// Batch update
// ---------------------------------------------------------------------------
const showConfirmDialog = ref(false);
const batchRunning = ref(false);
const batchDone = ref(false);
const batchCurrent = ref(0);
const batchTotal = ref(0);
const batchFailures = ref(0);
const batchError = ref<string | null>(null);
let batchCancelled = false;

function cancelBatch() { batchCancelled = true; }

function confirmApply() {
  batchError.value = null;
  batchDone.value = false;
  showConfirmDialog.value = true;
}

async function runBatchUpdate() {
  if (!selectedCollection.value) return;
  const collectionName = selectedCollection.value;
  const api = store.api as Api;
  const BATCH_SIZE = 100;

  batchRunning.value = true;
  batchDone.value = false;
  batchCurrent.value = 0;
  batchTotal.value = 0;
  batchFailures.value = 0;
  batchError.value = null;
  batchCancelled = false;

  const factorFields = activeFactors.value.map((f) => f.field);
  const boostFields = activeBoostRules.value.map((r) => r.field);
  const allNeededFields = [...new Set([...factorFields, ...boostFields])];
  const includeFields = ['id', ...allNeededFields].join(',');

  try {
    // Ensure the weighted_score field exists
    const collection = store.data.collections.find((c) => c.name === collectionName);
    const hasScoreField = (collection?.fields as any[])?.some((f: any) => f.name === SCORE_FIELD);
    if (!hasScoreField) {
      try {
        await store.api?.updateCollection(collectionName, {
          fields: [{ name: SCORE_FIELD, type: 'int64', optional: true }],
        } as any);
        await store.getCollections();
      } catch (err: any) {
        batchError.value = `Failed to create "${SCORE_FIELD}" field: ${err.message ?? err}`;
        batchRunning.value = false;
        return;
      }
    }

    const countResult = await api.search(collectionName, { q: '*', query_by: 'name', per_page: 0, page: 1 });
    const totalDocs = countResult?.found ?? 0;
    if (totalDocs === 0) { batchRunning.value = false; batchDone.value = true; return; }

    const totalPages = Math.ceil(totalDocs / BATCH_SIZE);

    // Pass 1: Collect field values for percentile computation
    batchTotal.value = totalPages;
    const allFieldValues: Record<string, number[]> = {};
    for (const field of factorFields) allFieldValues[field] = [];

    let page = 1;
    let fetched = 0;
    while (fetched < totalDocs) {
      if (batchCancelled) break;
      const res = await api.search(collectionName, {
        q: '*', query_by: 'name',
        per_page: BATCH_SIZE, page,
        include_fields: includeFields,
      });
      const hits = res?.hits ?? [];
      if (hits.length === 0) break;
      for (const hit of hits) {
        const doc = hit.document as Record<string, unknown>;
        for (const field of factorFields) {
          allFieldValues[field]?.push(Number(doc[field] ?? 0));
        }
      }
      fetched += hits.length;
      batchCurrent.value += 1;
      page += 1;
    }

    // Build percentile maps
    const pctMaps: Record<string, Map<number, number>> = {};
    for (const field of factorFields) {
      pctMaps[field] = computePercentileRanks(allFieldValues[field] ?? []);
    }
    percentileRanks.value = pctMaps;

    // Pass 2: Compute and write scores
    batchCurrent.value = 0;
    batchTotal.value = totalPages;
    page = 1;
    let processed = 0;

    while (processed < totalDocs) {
      if (batchCancelled) { batchError.value = `Cancelled at batch ${batchCurrent.value}.`; break; }

      let hits: any[];
      try {
        const res = await api.search(collectionName, {
          q: '*', query_by: 'name',
          per_page: BATCH_SIZE, page, include_fields: includeFields,
        });
        hits = res?.hits ?? [];
      } catch (err: any) {
        batchError.value = `Fetch failed at page ${page}: ${err.message ?? err}`;
        break;
      }

      if (hits.length === 0) break;

      const updates = hits.map((hit: any) => {
        const doc = hit.document;
        const { score } = computeScore(doc);
        return { id: String(doc.id), [SCORE_FIELD]: Math.round(score) };
      });

      try {
        const result = await api.importDocuments(collectionName, updates, 'update');
        if (Array.isArray(result)) {
          batchFailures.value += result.filter((r: any) => r?.success === false).length;
        }
      } catch (err: any) {
        batchError.value = `Import failed at batch ${batchCurrent.value + 1}: ${err.message ?? err}`;
        break;
      }

      processed += hits.length;
      batchCurrent.value += 1;
      page += 1;
    }
    lastRecalcNumDocs.value = totalDocs;
  } catch (err: any) {
    batchError.value = `Unexpected error: ${err.message ?? err}`;
  } finally {
    batchRunning.value = false;
    batchDone.value = true;
    staleScoreCount.value = 0;
  }
}

// React to global collection changes (wait until connected)
watch(
  () => store.isConnected ? selectedCollection.value : null,
  (name) => void onCollectionChange(name),
);

// Load on mount if collection is already selected
onMounted(() => {
  if (store.isConnected && selectedCollection.value) {
    void onCollectionChange(selectedCollection.value);
  }
});
</script>

<style scoped>
.sticky-preview {
  position: sticky;
  top: 60px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

.cursor-move {
  cursor: move;
}

.sort-list .q-item {
  transition: background-color 0.15s;
}

.sort-list .q-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.formula-box {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
  display: block;
}
</style>
