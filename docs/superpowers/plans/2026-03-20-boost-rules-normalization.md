# Boost Rules Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tier-based promotion rules with additive boost scoring on a unified 1-100 scale using percentile normalization.

**Architecture:** All changes are in `RankingFormula.vue`. We remove the `_eval` sort slot and `computeBoostTier`, unify boost contributions into `computeScore`, switch from min-max to percentile rank normalization, and update the UI labels/sliders. No new files needed.

**Tech Stack:** Vue 3 + Quasar (existing), TypeScript, Typesense API

---

### Task 1: Remove `_eval` generation and simplify `generatedSortBy`

**Files:**
- Modify: `src/pages/RankingFormula.vue:700-708` (buildEvalExpression, activeBoostRules)
- Modify: `src/pages/RankingFormula.vue:783-795` (generatedSortBy)

- [ ] **Step 1: Delete `ruleToFilter` and `buildEvalExpression`**

`ruleToFilter` (lines 640-658) is only called by `buildEvalExpression`. Delete both.

```ts
// DELETE function ruleToFilter (lines 640-658)
// DELETE function buildEvalExpression (lines 702-708)
```

- [ ] **Step 2: Simplify `generatedSortBy`**

Replace the current 3-slot computed (lines 785-795):

```ts
const generatedSortBy = computed(() => {
  const parts: string[] = [];
  for (const e of sortEntries) parts.push(`${e.name}:${e.direction}`);
  if (activeFactors.value.length > 0 || activeBoostRules.value.length > 0) {
    parts.push(`${SCORE_FIELD}:desc`);
  }
  return parts.join(',');
});
```

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: No errors related to `buildEvalExpression` or `ruleToFilter`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "refactor: remove _eval generation, simplify sort_by to boolean sorts + weighted_score"
```

---

### Task 2: Replace tier-based preview with unified score

**Files:**
- Modify: `src/pages/RankingFormula.vue:497-504` (PreviewProduct interface)
- Modify: `src/pages/RankingFormula.vue:800-821` (computeScore, computeBoostTier)
- Modify: `src/pages/RankingFormula.vue:1108-1139` (recomputePreview)
- Modify: `src/pages/RankingFormula.vue:395-418` (preview template)
- Modify: `src/pages/RankingFormula.vue:780` (maxPossibleScore)

- [ ] **Step 1: Update `PreviewProduct` — remove tier fields**

```ts
interface PreviewProduct {
  id: string;
  title: string;
  score: number;
  breakdown: string[];
}
```

Remove `tierLevel`, `tierLabel`.

- [ ] **Step 2: Delete `computeBoostTier` function**

Delete the entire function (lines 814-821).

- [ ] **Step 3: Update `computeScore` — add boost contributions**

Replace the current `computeScore` (lines 800-812):

```ts
function computeScore(doc: Record<string, unknown>): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];

  // Ranking factors (normalized)
  for (const f of activeFactors.value) {
    const raw = Number(doc[f.field] ?? 0);
    const stats = fieldStats.value[f.field];
    const normalized = stats ? normalizeValue(raw, stats) : 0;
    const contribution = Math.round(normalized * f.weight);
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
```

Note: We keep `normalizeValue` (min-max) for now — percentile rank comes in Task 4. This task focuses on removing tiers.

- [ ] **Step 4: Update `maxPossibleScore` to include boosts**

Replace line 780:

```ts
const maxPossibleScore = computed(() => {
  const factorMax = activeFactors.value.reduce((sum, f) => sum + f.weight, 0);
  const boostMax = activeBoostRules.value.reduce((sum, r) => sum + r.boost, 0);
  return factorMax + boostMax;
});
```

- [ ] **Step 5: Update `recomputePreview` — remove tier sorting**

Replace the `recomputePreview` function (lines 1108-1139). We use an intermediate `ScoredDoc` type with `doc` for sorting, then map to `PreviewProduct` (which has no `doc`):

```ts
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
```

- [ ] **Step 6: Update preview template — remove tier badge**

Replace the tier badge and score section in the template (lines 395-418). Remove the `v-if="p.tierLevel > 0"` block entirely. The score display stays as-is (it already shows `p.score / maxPossibleScore`).

Delete lines 395-399:
```html
                  <q-item-label v-if="p.tierLevel > 0" caption>
                    <q-badge color="amber-8" text-color="white" class="q-mr-xs">
                      ★ {{ p.tierLabel }} (priority {{ p.tierLevel }})
                    </q-badge>
                  </q-item-label>
```

- [ ] **Step 7: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 8: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "refactor: replace tier-based preview with unified additive score"
```

---

### Task 3: Update Boost Rules UI — rename, rescale slider, update labels

**Files:**
- Modify: `src/pages/RankingFormula.vue:82-168` (Promotion Rules template section)
- Modify: `src/pages/RankingFormula.vue:626-638` (ruleDescription)
- Modify: `src/pages/RankingFormula.vue:680-693` (addBoostRule default boost)
- Modify: `src/pages/RankingFormula.vue:918-931` (default boost values)
- Modify: `src/pages/RankingFormula.vue:448-449` (confirm dialog message)
- Modify: `src/pages/RankingFormula.vue:997-1000` (migrateBoostValue)

- [ ] **Step 1: Rename section and update labels in template**

Change lines 84-89:
```html
              <div class="text-subtitle1 text-weight-bold">Boost Rules</div>
              <div class="text-caption text-grey-7">
                Boost products that match these conditions.
                Higher boost = more impact on ranking. 1 = subtle nudge, 100 = strong push.
              </div>
```

- [ ] **Step 2: Change slider from 1-10 to 1-100**

Replace the label and slider (lines 134-153). Change "Priority level" to "Boost", and `:max` from 10 to 100. Keep the numeric input but update its max:

```html
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
```

- [ ] **Step 3: Update `ruleDescription` to show boost instead of priority**

Replace `ruleDescription` (lines 626-638):
```ts
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
```

- [ ] **Step 4: Update default boost values**

In `addBoostRule` (~line 686), change default boost from 5 to 30:
```ts
    boost: 30,
```

In `onCollectionChange` defaults (~lines 927-931), update:
```ts
    if (featured) {
      boostRules.push({ id: `r${++ruleIdSeq}`, field: 'is_featured', condition: 'is_true', value: '', boost: 40 });
    }
    const createdAt = schemaFields.value.find((f) => f.name === 'created_at');
    if (createdAt) {
      boostRules.push({ id: `r${++ruleIdSeq}`, field: 'created_at', condition: 'newer_than_days', value: '30', boost: 20 });
    }
```

- [ ] **Step 5: Remove `migrateBoostValue` clamp**

Replace `migrateBoostValue` (lines 997-1000):
```ts
function migrateBoostValue(boost: number): number {
  return Math.min(100, Math.max(1, Math.round(boost)));
}
```

- [ ] **Step 6: Update confirm dialog message**

Replace line 448-449:
```html
          <p v-if="activeBoostRules.length > 0" class="q-mt-sm q-mb-none">
            Boost rules ({{ activeBoostRules.length }}) are included in the recalculation.
            Time-based rules may become stale between recalculations.
          </p>
```

- [ ] **Step 7: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 8: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "feat: rename Promotion Rules to Boost Rules, rescale slider to 1-100"
```

---

### Task 4: Switch normalization from min-max to percentile rank

**Files:**
- Modify: `src/pages/RankingFormula.vue:516-521` (fieldStats type and constants)
- Modify: `src/pages/RankingFormula.vue:845-875` (fetchFieldStats)
- Modify: `src/pages/RankingFormula.vue:877-884` (normalizeValue)
- Modify: `src/pages/RankingFormula.vue:800-812` (computeScore — drop `* 10`)

- [ ] **Step 1: Replace `FieldStats` with percentile rank map**

Replace the `FieldStats` interface and `fieldStats` ref (~lines 512-518):

```ts
// Percentile rank maps: field name → (value → percentile 0.0-1.0)
const percentileRanks = ref<Record<string, Map<number, number>>>({});
```

- [ ] **Step 2: Add `computePercentileRanks` utility**

Add after the percentileRanks ref:

```ts
function computePercentileRanks(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n <= 1) {
    const map = new Map<number, number>();
    if (n === 1) map.set(sorted[0], 0.5);
    return map;
  }
  const map = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (!map.has(sorted[i])) {
      map.set(sorted[i], i / (n - 1));
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
```

- [ ] **Step 3: Replace `fetchFieldStats` with percentile computation for preview**

Replace `fetchFieldStats` (~lines 845-875). For the live preview, we compute percentile ranks from the fetched sample:

```ts
function computePreviewPercentiles(docs: Record<string, unknown>[], fields: string[]) {
  const result: Record<string, Map<number, number>> = {};
  for (const field of fields) {
    const values = docs.map(d => Number(d[field] ?? 0));
    result[field] = computePercentileRanks(values);
  }
  percentileRanks.value = { ...percentileRanks.value, ...result };
}
```

- [ ] **Step 4: Update `computeScore` — use percentile rank, drop `* 10`**

```ts
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

  for (const r of activeBoostRules.value) {
    if (ruleMatches(r, doc)) {
      score += r.boost;
      breakdown.push(`${friendlyFactorLabel(r.field)} +${r.boost}`);
    }
  }

  return { score, breakdown };
}
```

- [ ] **Step 5: Delete `normalizeValue` function**

Delete lines 877-884 (the old min-max normalizer).

- [ ] **Step 6: Update callers**

In `fetchPreview` (~line 1098-1099), after fetching `rawDocs`, compute percentiles:
```ts
    rawDocs = (result?.hits ?? []).map((h: any) => h.document ?? {});
    const factorFields = activeFactors.value.map((f) => f.field);
    if (factorFields.length > 0) computePreviewPercentiles(rawDocs, factorFields);
    recomputePreview();
```

In `onCollectionChange` (~lines 952-955), replace `fetchFieldStats` call:
```ts
  // Percentile ranks are computed from preview docs in fetchPreview
  void fetchPreview();
```

Remove the `fetchFieldStats` call and the standalone `fetchFieldStats` function.

In `addRankingFactor` (~lines 746-749), simplify:
```ts
  factorToAdd.value = null;
  if (selectedCollection.value) void fetchPreview();
```

In `removeRankingFactor`, remove the fieldStats cleanup:
```ts
function removeRankingFactor(idx: number) {
  rankingFactors.splice(idx, 1);
}
```

- [ ] **Step 7: Update `runBatchUpdate` — two-pass percentile computation**

Replace the batch update logic. Pass 1 builds percentile rank maps from the full collection. Pass 2 computes scores.

In `runBatchUpdate`, replace the stats section and update loop:

```ts
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

    // Count total docs
    const countResult = await api.search(collectionName, { q: '*', query_by: 'name', per_page: 0, page: 1 });
    const totalDocs = countResult?.found ?? 0;
    if (totalDocs === 0) { batchRunning.value = false; batchDone.value = true; return; }

    // Pass 1: Build percentile rank maps from all documents
    // Progress: show as "Analyzing..." phase, reuse batchCurrent/batchTotal
    const totalPages = Math.ceil(totalDocs / BATCH_SIZE);
    batchTotal.value = totalPages;  // Pass 1 progress
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
          allFieldValues[field].push(Number(doc[field] ?? 0));
        }
      }
      fetched += hits.length;
      batchCurrent.value += 1;
      page += 1;
    }

    // Build percentile maps
    const pctMaps: Record<string, Map<number, number>> = {};
    for (const field of factorFields) {
      pctMaps[field] = computePercentileRanks(allFieldValues[field]);
    }
    percentileRanks.value = pctMaps;

    // Pass 2: Compute and write scores — reset progress for write phase
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
```

- [ ] **Step 8: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 9: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "feat: switch to percentile rank normalization, unify boost scoring in weighted_score"
```

---

### Task 5: Filter out `weighted_score` and timestamp fields from ranking factors

**Files:**
- Modify: `src/pages/RankingFormula.vue:724-731` (availableFactorOptions)
- Modify: `src/pages/RankingFormula.vue:888-898` (loadSchemaFields or numericFields)

- [ ] **Step 1: Filter `weighted_score` and timestamp fields from factor options**

Update `availableFactorOptions` (~line 724):

```ts
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "feat: filter out weighted_score and timestamp fields from ranking factor options"
```

---

### Task 6: Update formula display and recalculate dialog

**Files:**
- Modify: `src/pages/RankingFormula.vue:261-273` (formula display)
- Modify: `src/pages/RankingFormula.vue:437-450` (confirm dialog)
- Modify: `src/pages/RankingFormula.vue:294` (recalculate button disable condition)

- [ ] **Step 1: Update formula display to include boost rules**

Replace the formula section (lines 263-273):

```html
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
```

- [ ] **Step 2: Update confirm dialog formula to include boosts**

In the confirm dialog (~lines 440-450), update the formula display similarly and update the message:

```html
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
```

- [ ] **Step 3: Enable recalculate button when boost rules exist**

Replace the `:disable` condition on the Recalculate button (~line 294):

```html
                  :disable="rankingFactors.length === 0 && activeBoostRules.length === 0"
```

- [ ] **Step 4: Update `q-separator` condition and "What Matters Most" description**

The `q-separator` at ~line 275 has `v-if="rankingFactors.length > 0"` — update to match:
```html
            <q-separator v-if="rankingFactors.length > 0 || activeBoostRules.length > 0" />
```

Update the "What Matters Most" description (~line 176) to mention boost rules require recalculation too:
```html
                Requires "Recalculate" to take effect (boost rules are also included).
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "feat: show boost rules in formula display and recalculate dialog"
```

---

### Task 7: Clean up dead code

**Files:**
- Modify: `src/pages/RankingFormula.vue`

- [ ] **Step 1: Remove dead code**

Remove any remaining references to:
- `isDateField` function (if only used by `ruleToFilter`, which was deleted in Task 1) — actually check if `conditionOptions` uses it. If it does, keep it.
- `ruleToFilter` (already deleted in Task 1)
- `buildEvalExpression` (already deleted in Task 1)
- `computeBoostTier` (already deleted in Task 2)
- `normalizeValue` (already deleted in Task 4)
- `fetchFieldStats` (already deleted in Task 4)
- `fieldStats` ref (already deleted in Task 4)
- `FieldStats` interface (already deleted in Task 4)

Grep for any remaining references to confirm nothing is broken.

- [ ] **Step 2: Remove unused watcher for boost rules `_eval` regeneration**

The watcher at ~line 1143-1149 watches both `rankingFactors` and `boostRules` to call `recomputePreview`. This is still needed — boost rule changes should trigger a re-rank. But verify the watch expression is correct after changes.

- [ ] **Step 3: Verify build**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Run lint**

Run: `cd /Users/renatobeltrao/Projects/typesense-dashboard && npx eslint src/pages/RankingFormula.vue 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/pages/RankingFormula.vue
git commit -m "chore: remove dead code from ranking formula refactor"
```
