# Inline Search Rules: Unified Search & Rule Creation

## Overview

Replace the InstantSearch tab on the Search page with a custom search implementation that supports inline rule creation. Users search, apply filters, and — when they want to create a rule — enter "rule mode" where the current search state becomes the rule trigger and they can pin/hide products with live preview.

The existing Overrides page remains as a list/management view. Both paths coexist.

## Goals

- Eliminate context-switching between searching and creating rules
- Give users a live preview of how rules affect results
- Let users configure which fields appear on result cards (persisted per-collection)
- Maintain full override feature parity: pin, hide, inject filter/sort, scheduling, tags

## Non-Goals

- Replacing the JSON mode or Preview mode tabs
- Changing the Typesense override API contract
- Removing the standalone Overrides page

---

## Page Layout

Three-column layout when rule drawer is open, two-column otherwise.

| Left Sidebar (col-3) | Main Area (col-6 or col-9) | Right Drawer (col-3, conditional) |
|---|---|---|
| Dynamic facet filters | Search box + toolbar + results | Rule settings panel |
| Field config button | Active filter chips | |
| | Result cards with pin/hide actions | |

---

## Core Search (replaces InstantSearch)

Uses the Typesense API directly via `typesenseClient.collections(name).documents().search(params)`.

- `query_by` auto-built from indexed string fields (same logic as current)
- Facet selections build a `filter_by` string; sort dropdown builds `sort_by`
- Pagination via `page` and `per_page` params
- 300ms debounce on query changes; immediate on filter/sort/page changes
- Facet counts from the API response update the sidebar dynamically

### Facets & Filtering

- On collection load, scan schema for `facet: true` fields
- String facet fields: checkbox list with search input
- Numeric facet fields: range inputs (min/max)
- Boolean facet fields: checkbox toggle
- Active filters shown as removable chips above results
- Sort dropdown populated from sortable fields (`int32`, `float`, `string` with `sort: true`), each with asc/desc
- Hits per page selector: 12 / 48 / 100 / 250

### Field Configuration

- Gear icon opens a dialog listing all collection fields
- User checks which fields appear on result cards and reorders via drag
- Saved to `localStorage` keyed by collection name
- Default: first 5 non-id fields

---

## Result Cards

Each `SearchResultCard` displays user-configured fields as key-value rows.

- Image thumbnail if collection has an image field (detected by name: `image`, `image_url`, `thumbnail`, etc.)
- In rule mode, each card shows:
  - **Pin button** with position number input
  - **Hide button**
  - **Checkbox** for multi-select
- Visual states:
  - **Pinned** — green left border + pin icon with position badge
  - **Hidden** — greyed out, pushed to bottom
  - **Normal** — default styling

Outside rule mode, cards are display-only (no pin/hide clutter).

### Multi-Select Toolbar

Appears when 1+ cards are checked (rule mode only):
- "Pin selected" (prompts for starting position)
- "Hide selected"
- "Clear selection"

### Live Preview

When pins/hides are active, results rearrange client-side as a best-effort simulation:
- Pinned products inserted at specified positions
- Hidden products removed from visible list
- Remaining products fill around pins
- Banner: "Preview: showing results with N pins, M hidden" with "Clear all" link

**Important:** This is a client-side approximation, not a server-side preview. If the rule also injects filters or sort, the actual server-side behavior after saving may differ slightly from the preview (e.g., injected filters may change the result set). This matches the existing behavior of the Overrides page preview.

---

## Rule Creation Flow

### Entering Rule Mode

"Create Rule" button in the toolbar. Clicking it:
1. Captures current search query and active filters as the rule trigger
2. Opens the right-side drawer
3. Enables pin/hide actions on result cards
4. Shows multi-select checkboxes
5. Banner: "Creating rule for: '[query]' with N filters"

### Right-Side Drawer Contents

`RuleDrawer.vue` receives the collection's `fields` array as a prop from `SearchCustom.vue` (which gets it from the store's `currentCollection.fields`). This is needed by `FilterBuilder` and `SortBuilder`.

Top to bottom:
- **Rule name** — auto-generated from query slug (using existing `generateRuleSlug()` from `curations-utils.ts`), editable
- **Trigger summary** — read-only display of captured query + filters, with match type toggle (exact / contains)
- **Filter injection** — reuses existing `FilterBuilder` component (for adding extra filters beyond the trigger)
- **Sort injection** — reuses existing `SortBuilder` component (single-field sort only; multi-field sort requires raw text fallback, which SortBuilder already supports)
- **Scheduling** — effective from / effective to date pickers
- **Tags** — multi-chip input
- **Pinned products list** — compact list with position numbers and remove buttons
- **Hidden products list** — compact list with remove buttons
- **Actions** — "Save Rule", "Cancel"

### Saving

- Builds override payload in `useRuleEditor.buildPayload()`. The payload construction logic currently lives as a private function in `OverridesVisual.vue` (`buildOverridePayload`). As part of this work, extract it into `src/shared/curations-utils.ts` so both the Overrides page and the new inline rule editor can share it.
- Calls `store.createOverride()` (upsert semantics)
- Success: exits rule mode, shows toast, clears pin/hide state
- Failure: shows error, stays in rule mode

### Editing Existing Rules

The search page accepts an optional `ruleId` query parameter: `/collection/:name/search?ruleId=xyz`

- `Search.vue` reads `route.query.ruleId` and passes it to `SearchCustom.vue` as a prop
- On mount, if `ruleId` is present, `useRuleEditor.enterEditMode(ruleId)` is called:
  - Loads the override data from `store.data.overrides`
  - Sets the search query to the rule's `rule.query`
  - Restores filters from the rule's trigger
  - Populates pinned/hidden products
  - Opens the drawer in edit mode
- The Overrides list page can link to this via a router-link with the `ruleId` param

---

## Component Structure

```
src/
  components/
    search/
      SearchCustom.vue          — Main component (replaces SearchInstantSearch)
      SearchResultCard.vue      — Configurable result card with pin/hide actions
      SearchFacetPanel.vue      — Left sidebar with dynamic facets
      SearchToolbar.vue         — Hits count, sort, per-page, "Create Rule" button
      SearchActiveFilters.vue   — Removable filter chips above results
      SearchBulkActions.vue     — Multi-select toolbar (pin/hide selected)
      SearchFieldConfig.vue     — Dialog for choosing visible result fields
      RuleDrawer.vue            — Right-side drawer with full rule settings
  composables/
    useCustomSearch.ts          — Search state & API calls
    useRuleEditor.ts            — Rule creation/editing state & preview logic
    useFieldConfig.ts           — Result card field configuration
```

### Reused Components

- `FilterBuilder.vue` — in the rule drawer for injected filters
- `SortBuilder.vue` — in the rule drawer for injected sort

### Shared Utilities (extraction required)

- `buildOverridePayload()` — extract from `OverridesVisual.vue` into `src/shared/curations-utils.ts`

### Unchanged

- `SearchJson.vue` — JSON mode tab
- `SearchPreviewMode.vue` — Preview mode tab
- `Search.vue` — shell component, swaps `SearchInstantSearch` for `SearchCustom`

---

## Data Flow & State Management

### `useCustomSearch(collectionName)`

Encapsulates all search state:
- Reactive state: query, filters, sort, page, perPage, results, facetCounts, loading, error
- Methods: `search()`, `setFilter()`, `removeFilter()`, `clearFilters()`, `setSort()`, `setPage()`
- Debounces search calls (300ms on query, immediate on filter/sort/page)

### `useRuleEditor(collectionName)`

Manages rule creation/editing:
- State: mode (off/creating/editing), ruleName, matchType, injectedFilter, injectedSort, scheduling, tags, pinnedProducts, hiddenProducts
- `enterCreateMode(query, filters)` — captures current search state as trigger
- `enterEditMode(overrideId)` — loads existing rule data from store
- `exitMode()` — clears all state
- `applyPreview(results)` — rearranges results with pins inserted and hides removed (client-side simulation)
- `buildPayload()` — assembles override object (uses extracted `buildOverridePayload()`)
- `save()` — calls store, handles success/error

### `useFieldConfig(collectionName)`

Manages result card field visibility:
- `loadConfig()` — reads from localStorage, falls back to first 5 non-id fields
- `saveConfig(fields)` — persists to localStorage
- Returns reactive `visibleFields` array

### Key Principle

Search state and rule state are separate. The rule editor reads from search state (to capture triggers) and transforms search results (for preview), but doesn't own the search. Normal search works without rule mode; rule mode is a layer on top.
