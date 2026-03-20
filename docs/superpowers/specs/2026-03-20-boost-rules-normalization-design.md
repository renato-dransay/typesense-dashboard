# Boost Rules Normalization — Design Spec

## Problem

The Ranking Formula page has three issues:

1. **Promotion Rules use tiers (1-10)** — a product matching a rule jumps to a tier, creating pin-like behavior rather than a gradual boost. The client-side preview (`computeBoostTier`) only picks the first matching rule, which doesn't match what Typesense `_eval` actually does.

2. **`created_at` as a ranking factor doesn't work** — it's a unix timestamp normalized min-max, so a product created 1 year ago vs 2 years ago gets nearly the same score. Freshness should be modeled as a boost rule ("new products < X days"), not a continuous factor.

3. **`weighted_score` as a ranking factor is circular** — `weighted_score` is the field the formula writes to. Using it as input creates a feedback loop from previous calculations.

## Solution: Unified Additive Scoring

Unify boost rules and ranking factors into a single additive scoring system on a 1-100 scale:

- **All boost rules** (static and time-based) → baked into `weighted_score` at recalculation time

The user sees one unified list of "Boost Rules". All rules are pre-computed into `weighted_score` during batch recalculation.

### Why pre-compute everything?

1. Typesense `_eval` takes the **MAX score** (not sum) when a document matches multiple filter expressions ([typesense/typesense#2014](https://github.com/typesense/typesense/issues/2014)). Pre-computing avoids this limitation entirely.
2. Using `_eval` as a separate `sort_by` slot creates a hard partition — any boosted product sorts above all non-boosted products regardless of score, which is the tier/pin behavior we're eliminating.
3. Time-based rules (e.g., "newer than 30 days") become stale between recalculations, but this is acceptable since the thresholds are coarse (days, not minutes).

## Scoring Model

### Formula

```
weighted_score = sum(ranking_factor_contributions) + sum(static_boost_contributions)
```

At search time:
```
sort_by: "is_available:desc, weighted_score:desc"
```

Time-based boost rules are estimated during recalculation and baked into `weighted_score` alongside everything else. An `_eval` expression is **not** used as a separate sort slot — this avoids creating a hard partition where any time-boosted product always ranks above all non-boosted products regardless of score (which would be tier/pin behavior).

The trade-off: time-based boosts become stale between recalculations. A product that crossed the "30 days" threshold yesterday won't lose its boost until the next recalc. This is acceptable because:
- Recalculation is already expected for ranking factor changes
- Freshness thresholds (e.g., 30 days) are coarse — one day of staleness is negligible
- The alternative (`_eval` as separate sort slot) creates the exact tier behavior we're eliminating

### Ranking Factors (unchanged concept, improved normalization)

Each numeric field is normalized using **percentile rank** (0.0 to 1.0) across the collection, then multiplied by its weight (1-100).

```
contribution = percentile_rank(field_value) * weight
```

**Why percentile rank?** Unlike min-max normalization, percentile rank is not affected by outliers and works regardless of how wide/narrow or skewed the distribution is. A product at the 80th percentile for popularity always contributes `0.8 * weight`, no matter if the top product has 10x or 1000x the views.

Example with weight 30:
- Product at 90th percentile: 0.9 * 30 = 27
- Product at 50th percentile: 0.5 * 30 = 15
- Product at 10th percentile: 0.1 * 30 = 3

### Boost Rules (1-100 scale, additive)

Each boost rule has a condition and a boost value (1-100). When the condition matches, the boost value is added to the score.

- **Boost 1-20:** Subtle nudge. A product just barely edges ahead of similar products.
- **Boost 21-50:** Moderate push. Equivalent to a mid-weight ranking factor at a high percentile.
- **Boost 51-80:** Strong boost. Likely moves the product above most non-boosted products.
- **Boost 81-100:** Dominant boost. Close to guaranteed top placement if other signals are weak.

Example with two ranking factors (weight 30 + 70) and one boost rule:
- Max possible from factors: 30 + 70 = 100
- Boost rule "is_featured" at 40: adds 40 when true
- A featured product at 50th percentile: 15 + 35 + 40 = 90
- A non-featured product at 90th percentile: 27 + 63 + 0 = 90
- Result: featured but average product ties with an excellent non-featured product. The boost matters but doesn't dominate.

### Preventing tier/pin behavior

Because boosts are **additive** to the same score that ranking factors contribute to, a boost of 100 is roughly equivalent to a perfect ranking factor at weight 100. It can never completely override strong ranking signals. This is the key difference from the current tier system where `tierLevel` is sorted before `score`.

A user who wants stronger promotion increases the boost value. A user who wants promotion to be less influential increases ranking factor weights. The relationship is intuitive.

## Changes to the UI

### Section: "What Matters Most" (Ranking Factors)

Keep the list of numeric fields with 1-100 weight sliders. The UI structure is unchanged.

**Changes:**
- Filter out `weighted_score` from the available fields (prevent circular reference)
- Filter out timestamp fields like `created_at` from available fields (guide users to boost rules for freshness)
- Change normalization from min-max to **percentile rank** — this is an algorithmic change. The current approach uses 2 queries per field (min/max). The new approach requires fetching all values for each field to build the rank map during batch recalculation. For the live preview (50 docs), percentile rank is computed from the sample — this is approximate but sufficient for a preview.
- Update the "Requires Recalculate" messaging to note boost rules are included

### Section: "Promotion Rules" → "Boost Rules"

**Rename** from "Promotion Rules" to "Boost Rules".

**Change the slider** from 1-10 (priority/tier) to 1-100 (boost score).

**Change the labels:**
- Old: "Higher priority = shown first"
- New: "Higher boost = more impact on ranking. 1 = subtle nudge, 100 = strong push."
- Old rule description: "Featured products get priority level 7"
- New rule description: "Featured products get +40 boost"

**Change the recalculate messaging:**
- Old: "Promotion rules are applied at search time and don't need recalculation."
- New: "All boost rules are included in the recalculation. Time-based rules (e.g., 'newer than X days') may become stale between recalculations."

### Section: "Sort Order"

**No change.** Boolean sort fields remain slot 1.

### Preview Panel

**Replace tier-based display** with unified score display:
- Remove `tierLevel` / `tierLabel` from preview
- Show a single score that includes both factor contributions and boost contributions
- Show breakdown like: `Popularity 27 + Avg rating 42 + Featured +40 = 109`
- **`maxPossibleScore`** must include boost contributions: `sum(factor_weights) + sum(active_boost_values)`. The progress bar shows the score relative to the theoretical maximum if a product matched all boosts and was at 100th percentile for all factors.
- Drop the `* 10` multiplier from `computeScore`. The current code multiplies by 10 for legacy reasons (finer granularity with min-max). Percentile rank on a 1-100 weight scale already provides sufficient granularity. Stored `weighted_score` values will be on the natural 0-N scale (where N = sum of weights + sum of boosts).

## Changes to the Data Model

### BoostRule interface

```ts
interface BoostRule {
  id: string;
  field: string;
  condition: string; // 'is_true' | 'is_false' | 'newer_than_days' | 'older_than_days' | 'above' | 'below' | 'equals'
  value: string;
  boost: number; // 1-100 (was 1-10)
}
```

Only the scale changes. The interface shape stays the same.

### Preset storage

The saved preset already stores `boost_rules` as an array. The only change is that `boost` values will now be 1-100 instead of 1-10. Old presets with values 1-10 will still work — they'll just have very low boosts, which is fine (user can adjust).

### Generated sort_by

```ts
// Before:
// "is_available:desc, _eval([ (is_featured:true):7, (created_at:>CUT):3 ]):desc, weighted_score:desc"

// After:
// "is_available:desc, weighted_score:desc"
// (all boost rules baked into weighted_score, no _eval slot)
```

## Changes to Score Computation

### `computeScore` — add all boost contributions

```ts
function computeScore(doc: Record<string, unknown>): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];

  // Ranking factors (percentile-normalized)
  for (const f of activeFactors.value) {
    const raw = Number(doc[f.field] ?? 0);
    const pct = percentileRank(f.field, raw); // 0.0 - 1.0
    const contribution = Math.round(pct * f.weight);
    score += contribution;
    breakdown.push(`${label(f.field)} ${contribution}/${f.weight}`);
  }

  // All boost rules (additive) — including time-based
  for (const r of activeBoostRules.value) {
    if (ruleMatches(r, doc)) {
      score += r.boost;
      breakdown.push(`${label(r.field)} +${r.boost}`);
    }
  }

  return { score, breakdown };
}
```

Note: `ruleMatches` already handles time-based conditions (`newer_than_days`, `older_than_days`) by computing the cutoff timestamp at evaluation time. String equality conditions (`equals`) are classified the same way — all conditions go through the same path.

### `buildEvalExpression` — removed

No `_eval` expression is generated. All boost rules (including time-based) are pre-computed into `weighted_score`. The `buildEvalExpression` function and related `ruleToFilter` logic for `_eval` generation can be removed.

The `generatedSortBy` simplifies to:
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

### Percentile rank computation

During batch recalculation, we already fetch all documents. We can compute percentile ranks in a single pass:

```ts
function computePercentileRanks(docs: Record<string, unknown>[], field: string): Map<number, number> {
  const values = docs.map(d => Number(d[field] ?? 0)).sort((a, b) => a - b);
  const n = values.length;
  if (n <= 1) {
    // Single document or empty: assign percentile 0.5 (neutral)
    const rankMap = new Map<number, number>();
    if (n === 1) rankMap.set(values[0], 0.5);
    return rankMap;
  }
  const rankMap = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (!rankMap.has(values[i])) {
      rankMap.set(values[i], i / (n - 1)); // 0.0 to 1.0
    }
  }
  return rankMap;
}
```

For the **live preview** (50 docs), percentile rank is computed from the fetched sample. For **batch recalculation**, we compute it from the full collection in a first pass (fetch all values for each factor field, sort, build rank map).

### Batch recalculation changes

The batch update (`runBatchUpdate`) needs a two-pass approach:

1. **Pass 1:** For each ranking factor field, fetch all values to build percentile rank maps. This can be done with sorted searches (asc) paginated through the full collection, or by fetching just the field values.

2. **Pass 2:** Paginate through all documents, compute `weighted_score = factors + static boosts`, write back.

This is structurally similar to the current approach (which already does a stats pass + update pass), just with percentile instead of min-max.

## Migration / Backwards Compatibility

- Old presets with `boost: 1-10` values load fine — they just mean very small boosts now. Remove the existing `migrateBoostValue()` clamp (which caps at 10) so values above 10 are accepted.
- No schema changes needed — `weighted_score` field stays as `int64`
- The `_eval` slot is removed from `sort_by`; old saved presets with `sort_by` containing `_eval` will be regenerated on next save
- The `* 10` multiplier is dropped from `computeScore`, changing the stored score scale. First recalculation after the change will update all scores to the new normalization. Until recalculation, old scores (0-1000 scale) and new scores (0-N scale) may coexist, but this only affects relative ordering temporarily.

## Out of Scope

- Native Typesense `pinned_hits`/overrides support (complementary feature, separate work)
- Multiplicative boosting (additive is the right fit for merchandising nudges)
- Real-time time-based boosts via `_eval` (blocked by [typesense/typesense#2014](https://github.com/typesense/typesense/issues/2014) MAX-not-sum behavior and the partition problem; pre-computation is the pragmatic alternative)
