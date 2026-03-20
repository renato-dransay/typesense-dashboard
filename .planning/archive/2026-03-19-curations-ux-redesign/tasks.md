# Implementation Tasks: Curations UX Redesign

Source spec: .planning/specs/behavior.md
Test strategy: no test plan
Generated at: 2026-03-19T20:40:00Z

## Context Management
- Clear AI context between task groups (after each `## Group` section).
- Each task group is designed to be self-contained — include the spec section and relevant file paths when starting a new context.

## Foundation

- [x] **T-001**: Create shared utility functions for auto-slug generation and product field auto-detection
  - Files: `src/shared/curations-utils.ts` (create)
  - Files-write: `src/shared/curations-utils.ts`
  - Spec ref: FR-011, FR-016, FR-021, FR-032
  - Done when: File exports `generateRuleSlug(query: string): string`, `generateSynonymSlug(words: string[]): string`, `generateStopwordId(locale: string): string`, `detectProductNameField(fields: any[]): string`, `getProductDisplayName(doc: any, fields: any[]): string`, `getProductAttributes(doc: any, fields: any[], max?: number): Array<{label: string, value: string}>` functions

- [x] **T-002**: Create filter builder parser/serializer utilities for converting between visual builder state and Typesense `filter_by` strings
  - Files: `src/shared/filter-builder-utils.ts` (create)
  - Files-write: `src/shared/filter-builder-utils.ts`
  - Spec ref: FR-014, Edge Case "Filter builder parse failure"
  - Done when: File exports `parseFilterBy(filterStr: string): FilterCondition[]`, `serializeFilterBy(conditions: FilterCondition[], logic: 'AND' | 'OR'): string`, `getFilterableFields(fields: any[]): FieldOption[]`, TypeScript interfaces `FilterCondition`, `FieldOption`, and operator mappings. Handles unparseable strings by returning `null` (fallback to raw mode).

- [x] **T-003**: Create sort builder parser/serializer utilities for converting between visual builder state and Typesense `sort_by` strings
  - Files: `src/shared/sort-builder-utils.ts` (create)
  - Files-write: `src/shared/sort-builder-utils.ts`
  - Spec ref: FR-015, Edge Case "Sort builder parse failure"
  - Done when: File exports `parseSortBy(sortStr: string): SortCondition | null`, `serializeSortBy(condition: SortCondition): string`, `getSortableFields(fields: any[]): FieldOption[]`, TypeScript interface `SortCondition`. Handles unparseable strings by returning `null`.

- [x] **T-004**: Create language mapping constant for the locale-to-language dropdown
  - Files: `src/shared/language-options.ts` (create)
  - Files-write: `src/shared/language-options.ts`
  - Spec ref: FR-033
  - Done when: File exports `LANGUAGE_OPTIONS: Array<{label: string, value: string}>` containing English/en, Spanish/es, French/fr, German/de, Italian/it, Portuguese/pt, Dutch/nl, and `localeToLanguageName(code: string): string` helper that returns the full name or the raw code if unknown.

## Group 1: Sidebar Navigation Rename

> Spec ref: User Journey 4 in behavior.md
> Parallelizable-with: Group 2, Group 3
> Context-include:
>   - specs/behavior.md ## User Journey 4: Navigate Using Renamed Sidebar
>   - specs/behavior.md ## Functional Requirements → FR-002

- [x] **T-010**: Rename sidebar "Curations" section label and children labels in NavMenu
  - Files: `src/components/NavMenu.vue` (modify:lines ~131-173)
  - Files-write: `src/components/NavMenu.vue`
  - Spec ref: UJ4 Scenario "Sidebar shows renamed section", FR-002
  - Done when: Sidebar shows "Search Merchandising" (was "Curations"), "Search Rules" (was "Overrides"), and "Ignored Words" (was "Stopwords"). "Synonyms" label unchanged. All `to=` routes unchanged. Section reactive key updated if applicable.

## Group 2: Synonyms Page Redesign

> Spec ref: User Journey 2 in behavior.md
> Parallelizable-with: Group 1, Group 3
> Context-include:
>   - specs/behavior.md ## User Journey 2: Manage Synonyms with Plain Language
>   - specs/behavior.md ## Functional Requirements → FR-020, FR-021, FR-022, FR-023, FR-024
>   - specs/behavior.md ## Edge Cases → Auto-generated ID collision

- [x] **T-020**: Replace synonym type labels with plain-language descriptions and add subtitles
  - Files: `src/pages/Synonyms.vue` (modify:lines ~15-22, ~174-183)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-020, UJ2 Scenario "User sees simplified synonym creation form"
  - Done when: Type options show "These words mean the same thing" with subtitle "When someone searches for any of these words, show results for all of them." and "This word should also match..." with subtitle "Also show results for these alternatives, but not the other way around." Uses `q-option-group` with custom option slots or equivalent.

- [x] **T-021**: Hide ID field from default form, auto-generate slug, and rename Root to Trigger word
  - Files: `src/pages/Synonyms.vue` (modify:lines ~14, ~24-31, ~195-196, ~246-269)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-021, FR-022, UJ2 Scenarios "User creates a two-way synonym" and "User creates a one-way synonym"
  - Done when: ID field is hidden from the default form. ID is auto-generated using `generateSynonymSlug()` from Foundation. "Root" field label reads "Trigger word" with helper subtitle. Synonym creation still works correctly with auto-generated IDs.

- [x] **T-022**: Move Symbols to Index and Locale behind Advanced Options toggle
  - Files: `src/pages/Synonyms.vue` (modify:lines ~47-72)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-024, UJ2 Scenario "User accesses advanced synonym options"
  - Done when: "Symbols to Index" and "Locale" are inside a collapsed `q-expansion-item` labeled "Advanced Options". "Symbols to Index" is relabeled "Special Characters". "Locale" is relabeled "Language". The Advanced section also contains the editable ID field. Collapsed by default.

- [x] **T-023**: Simplify synonyms table — hide columns, rename Type values, rename Root column
  - Files: `src/pages/Synonyms.vue` (modify:lines ~196-243)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-023, UJ2 Scenario "User views the simplified synonyms table"
  - Done when: Table shows only Type ("Two-way" / "One-way"), "Trigger word" (was "Root"), Synonyms, and Actions columns. "ID", "Symbols to Index", and "Locale" columns are removed from default view.

## Group 3: Stopwords → Ignored Words Page Redesign

> Spec ref: User Journey 3 in behavior.md
> Parallelizable-with: Group 1, Group 2
> Context-include:
>   - specs/behavior.md ## User Journey 3: Configure Ignored Words
>   - specs/behavior.md ## Functional Requirements → FR-030, FR-031, FR-032, FR-033, FR-034, FR-035
>   - specs/behavior.md ## Edge Cases → Language dropdown "Other"

- [x] **T-030**: Rename page title and all visible "Stopwords" references to "Ignored Words" / "Word Lists"
  - Files: `src/pages/Stopwords.vue` (modify:lines ~9, ~65, ~82-84)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-030, UJ3 Scenario "User sees the renamed page with explanation"
  - Done when: Page shows "Add Word List" (was "Add Stopwords Set"), table heading reads "Word Lists" (was "Stopwords Sets"), words input labeled "Words to ignore" (was "Stopwords") with hint "Type a word and press Enter".

- [x] **T-031**: Add persistent explanation banner at the top of the Ignored Words page
  - Files: `src/pages/Stopwords.vue` (modify: add before expansion item)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-031, UJ3 Scenario "User sees the renamed page with explanation"
  - Done when: A `q-banner` or `q-card` is displayed at the top with title "What are Ignored Words?", explanation body text, and the before/after example from the spec. Banner is always visible (no dismiss/persist logic needed — just a static informational element).

- [x] **T-032**: Hide set ID field, auto-generate IDs, and remove Documentation link
  - Files: `src/pages/Stopwords.vue` (modify:lines ~14-38, ~127-133, ~170-172)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-032, FR-034, UJ3 Scenario "User creates a word list without seeing technical fields"
  - Done when: ID field is hidden from the form. ID is auto-generated using `generateStopwordId()` from Foundation. The "Documentation" external link button is removed. Stopword creation still works correctly.

- [x] **T-033**: Replace Locale text input with Language dropdown supporting "Other..." option
  - Files: `src/pages/Stopwords.vue` (modify:lines ~21-26)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-033, Edge Case "Language dropdown Other"
  - Done when: Locale text input is replaced with a `q-select` dropdown using `LANGUAGE_OPTIONS` from Foundation. Selecting "Other..." reveals a text input for custom locale codes. The locale value is still stored correctly for the API.

- [x] **T-034**: Simplify stopwords table — hide ID column, show Language name instead of locale code
  - Files: `src/pages/Stopwords.vue` (modify:lines ~136-163)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-035, UJ3 Scenario "User views the word lists table"
  - Done when: Table shows "Language" (full name via `localeToLanguageName()`), "Words" (chips), and "Actions" columns. "ID" column is removed.

## Group 4: Search Rules Page — Terminology & Form Rename

> Spec ref: User Journey 1 in behavior.md (Scenarios: renamed page, query pattern, match types, advanced options)
> Parallelizable-with: —  (overlaps with Group 5 on OverridesVisual.vue)
> Context-include:
>   - specs/behavior.md ## User Journey 1: Create a Search Rule → Scenarios "User sees the renamed page", "User enters a query pattern", "Advanced options"
>   - specs/behavior.md ## Functional Requirements → FR-010, FR-011, FR-012, FR-013
>   - specs/behavior.md ## Terminology Mapping

- [x] **T-040**: Rename page title, section headings, button labels, and notification messages
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~6, ~35, ~67, ~126, ~200, ~249, ~265, ~345, ~729)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-010, FR-001, UJ1 Scenario "User sees the renamed page and form"
  - Done when: Page title reads "Search Rules". Section headings read "Search Rule" (was "Override Rule"), "Filters & Scheduling" (was "Injections & Scheduling"), "Existing Rules" (was "Existing Overrides"). Button reads "Save Rule" (was "Save Override"). Notification messages use "Rule" instead of "Override".

- [x] **T-041**: Replace Override ID with Rule Name (auto-slug) and add Advanced section for raw ID
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~37-43, ~422-434, ~742-757)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-011, UJ1 Scenarios "User sees the renamed page" and "Advanced options"
  - Done when: Field labeled "Rule Name" replaces "Override ID". A computed property auto-generates slugs from query pattern (using `generateRuleSlug()`). An "Advanced" `q-expansion-item` below shows the raw ID field (editable). When query changes, the Rule Name updates (but not if user has manually edited it during an edit session). Reset generates a new nanoid.

- [x] **T-042**: Relabel Query pattern field and Match type dropdown options
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~44-59)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-012, FR-013, UJ1 Scenario "User enters a query pattern"
  - Done when: Query field label reads "When someone searches for...". Match type dropdown shows "Exact phrase match" (value: `exact`) and "Contains these words" (value: `contains`) using `option-label`/`option-value` mappings. Functional behavior unchanged.

## Group 5: Search Rules Page — Visual Builders & Product Cards

> Spec ref: User Journey 1 in behavior.md (Scenarios: filter builder, sort builder, product cards, rules table)
> Parallelizable-with: — (depends on Group 4 completing first, shares OverridesVisual.vue)
> Context-include:
>   - specs/behavior.md ## User Journey 1: Create a Search Rule → Scenarios "User configures a filter", "User configures sorting", "User pins a product", "User hides a product", "User edits an existing rule", "User views the rules table"
>   - specs/behavior.md ## Functional Requirements → FR-014, FR-015, FR-016, FR-017, FR-018, FR-019
>   - specs/behavior.md ## Edge Cases

- [x] **T-050**: Create FilterBuilder component — visual compound filter builder with field/operator/value rows
  - Files: `src/components/FilterBuilder.vue` (create)
  - Files-write: `src/components/FilterBuilder.vue`
  - Spec ref: FR-014, UJ1 Scenarios "User configures a filter" and "User configures a filter with multiple conditions", Edge Case "Filter builder parse failure", Edge Case "Empty collection schema"
  - Done when: Component accepts `modelValue` (filter_by string), `fields` (collection schema fields) props. Emits `update:modelValue` with serialized string. Renders rows with field/operator/value dropdowns, AND/OR logic toggle, "Add condition" button. Falls back to raw text input when parse fails with message "This filter uses advanced syntax. You can edit it directly." Shows "No filterable fields available" when fields list is empty.

- [x] **T-051**: Create SortBuilder component — visual sort builder with field and direction toggle
  - Files: `src/components/SortBuilder.vue` (create)
  - Files-write: `src/components/SortBuilder.vue`
  - Spec ref: FR-015, UJ1 Scenario "User configures sorting", Edge Case "Sort builder parse failure", Edge Case "Empty collection schema"
  - Done when: Component accepts `modelValue` (sort_by string), `fields` (collection schema fields) props. Emits `update:modelValue` with serialized string. Renders a field dropdown and "Low to High" / "High to Low" toggle. Falls back to raw text input when parse fails.

- [x] **T-052**: Integrate FilterBuilder and SortBuilder into OverridesVisual, replacing raw text inputs
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~64-120)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-014, FR-015
  - Done when: The filter text input is replaced with `<FilterBuilder v-model="overrideForm.filter_by" :fields="collectionFields" />`. The sort text input is replaced with `<SortBuilder v-model="overrideForm.sort_by" :fields="collectionFields" />`. A computed `collectionFields` property extracts fields from `store.currentCollection.fields`. API payloads remain identical.

- [x] **T-053**: Create ProductCard component — displays product name, attributes, and pin/hide badge
  - Files: `src/components/ProductCard.vue` (create)
  - Files-write: `src/components/ProductCard.vue`
  - Spec ref: FR-016, FR-017, UJ1 Scenarios "User pins a product", "User hides a product"
  - Done when: Component accepts `document` (product doc), `fields` (schema fields), `type` ('pinned' | 'hidden' | 'search-result'), `position` (optional number) props. Displays product name (via `getProductDisplayName()`), up to 3 attributes (via `getProductAttributes()`), green pin badge for pinned, red hidden badge for hidden. Emits `pin`, `hide`, `remove` events. Shows warning when document has no resolved name (Edge Case "Product not found").

- [x] **T-054**: Replace raw ID display in search results, pinned list, and hidden list with ProductCard
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~148-241)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-016, FR-017, UJ1 Scenarios "User pins/hides a product"
  - Done when: Search results render `<ProductCard>` instead of raw `ID: {{ getDocId(hit) }}`. Pinned products section renders `<ProductCard type="pinned">` with green indicator instead of `ID: {{ inc.id }} - Position: {{ inc.position }}`. Hidden products section renders `<ProductCard type="hidden">` with red indicator.

- [x] **T-055**: Fetch document details when editing existing rules with pinned/hidden products
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~796-802)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-018, UJ1 Scenario "User edits an existing rule and sees product details", Edge Case "Product not found"
  - Done when: `editOverride()` function fetches full document objects for each `includes[].id` and `excludes[].id` using the store's search/document retrieval. Stores fetched docs in a reactive map (`productDetailsCache`). ProductCard reads from this cache. If a document fetch fails, the card shows the raw ID with a warning indicator.

- [x] **T-056**: Improve rules table — rename columns, add Status badge, show product names in Pinned/Hidden
  - Files: `src/pages/OverridesVisual.vue` (modify:lines ~763-771, ~366-392)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-019, UJ1 Scenario "User views the rules table with improved columns"
  - Done when: Table columns renamed: "Name" (was "ID"), "Pinned" (was "Includes"), "Hidden" (was "Excludes"). Match column shows "Exact" / "Contains". Pinned/Hidden columns show product names (max 3 + "+N more") — fetching names on table render from cache or falling back to count. New "Status" column shows `q-badge` with "Active" (green), "Scheduled" (blue), "Expired" (grey), or "Always active" (green) based on `effective_from_ts`/`effective_to_ts`.

## Summary

- Total tasks: 18
- Foundation tasks: 4
- Journey groups: 5
- Estimated context sessions: 6 (Foundation + 5 groups)

## Parallelism Analysis

| Group | Files-write (unique) | Can run with |
|-------|---------------------|--------------|
| Foundation | `src/shared/curations-utils.ts`, `src/shared/filter-builder-utils.ts`, `src/shared/sort-builder-utils.ts`, `src/shared/language-options.ts` | — (must run first) |
| Group 1 | `src/components/NavMenu.vue` | Group 2, Group 3 |
| Group 2 | `src/pages/Synonyms.vue` | Group 1, Group 3 |
| Group 3 | `src/pages/Stopwords.vue` | Group 1, Group 2 |
| Group 4 | `src/pages/OverridesVisual.vue` | — (overlaps Group 5) |
| Group 5 | `src/pages/OverridesVisual.vue`, `src/components/FilterBuilder.vue`, `src/components/SortBuilder.vue`, `src/components/ProductCard.vue` | — (overlaps Group 4) |

Dispatch waves:
1. Foundation
2. Group 1 + Group 2 + Group 3 (parallel — no file overlaps)
3. Group 4
4. Group 5
