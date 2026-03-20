# Implementation Tasks: Curations UX Redesign Round 2

Source spec: .planning/specs/behavior.md
Test strategy: no test plan
Generated at: 2026-03-19T23:55:00Z

## Context Management
- Clear AI context between task groups.
- Each task group is self-contained.

## Foundation

- [x] **T-001**: Create stopwords data file with pre-built stopword lists for English, Spanish, French, German, Portuguese
  - Files: `src/shared/stopwords-data.ts` (create)
  - Files-write: `src/shared/stopwords-data.ts`
  - Spec ref: FR-030
  - Done when: File exports `COMMON_STOPWORDS: Record<string, string[]>` with keys `en`, `es`, `fr`, `de`, `pt`, each containing 15-30 common stopwords for that language. Also exports `hasCommonStopwords(locale: string): boolean` helper.

## Group 1: Sidebar Navigation Consolidation

> Spec ref: UJ-1
> Context-include:
>   - specs/behavior.md ## UJ-1: Navigate the Consolidated Sidebar
>   - specs/behavior.md ## Functional Requirements → FR-001 through FR-006

- [x] **T-010**: Restructure NavMenu sidebar sections from 7 to 5 groups
  - Files: `src/components/NavMenu.vue` (modify)
  - Files-write: `src/components/NavMenu.vue`
  - Spec ref: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006
  - Done when: Sidebar shows 5 sections (Search, Catalog, Search & Discovery, Analytics, Settings). "Merchandising", "Relevance", "Search Merchandising" sections no longer exist. "Catalog" contains Products + Vendors. "Search & Discovery" contains Search Rules, Synonyms, Ignored Words, Ranking Formula, Search Weights. "Settings" contains Server Status, Cluster Status, Collections, Aliases, API Keys, Search Presets, Stemming, Schema, Add Document. `sections` reactive keys updated to `search`, `catalog`, `discovery`, `analytics`, `settings`. `getGroupForRoute()` updated for new mappings. All route paths unchanged.

## Group 2: Search Rules List-First Layout

> Spec ref: UJ-2
> Parallelizable-with: Group 3, Group 4
> Context-include:
>   - specs/behavior.md ## UJ-2: View and Manage Search Rules (List-First)
>   - specs/behavior.md ## Functional Requirements → FR-010 through FR-015

- [x] **T-020**: Restructure OverridesVisual.vue to show rules list first with collapsed creation form
  - Files: `src/pages/OverridesVisual.vue` (modify)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-010, FR-011, FR-012, FR-015
  - Done when: Page loads with rules list/cards visible above the fold. A "+ Create New Rule" button at the top expands the form. "Edit JSON" button removed from header, placed inside Advanced expansion within the form. Creation form is collapsed by default (`showForm` = false).

- [x] **T-021**: Replace rules table with summary cards and add Duplicate action
  - Files: `src/pages/OverridesVisual.vue` (modify)
  - Files-write: `src/pages/OverridesVisual.vue`
  - Spec ref: FR-013, FR-014
  - Done when: Each rule displays as a card with: bold name, "When someone searches [query]" with match badge, pinned product names (not IDs), status badge (Active/Scheduled/Expired), tags as chips, Edit/Duplicate/Delete buttons. Duplicate copies rule data into form with `copy-of-` name prefix and empty override ID.

## Group 3: Synonyms Visual Improvements

> Spec ref: UJ-3
> Parallelizable-with: Group 2, Group 4
> Context-include:
>   - specs/behavior.md ## UJ-3: Understand Synonym Relationships at a Glance
>   - specs/behavior.md ## Functional Requirements → FR-020 through FR-025

- [x] **T-030**: Replace synonym table columns with single "Relationship" column using arrow notation
  - Files: `src/pages/Synonyms.vue` (modify)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-020, FR-021, FR-022
  - Done when: Table has 2 columns: "Relationship" and "Actions". Two-way shows `word1 ↔ word2 ↔ word3`. One-way shows `trigger → synonym1, synonym2`. No "Type" or "Trigger word" columns.

- [x] **T-031**: Add inline preview text in synonym creation form
  - Files: `src/pages/Synonyms.vue` (modify)
  - Files-write: `src/pages/Synonyms.vue`
  - Spec ref: FR-023, FR-024, FR-025
  - Done when: Preview sentence appears below the synonyms input when >= 2 words are entered. Two-way: "Searching for any of **word1**, **word2**, ... will show results for all of them." One-way: "When a customer searches for **trigger**, they'll also see results for **synonym1** and **synonym2**." No preview shown with < 2 words.

## Group 4: Ignored Words Improvements

> Spec ref: UJ-4
> Parallelizable-with: Group 2, Group 3
> Context-include:
>   - specs/behavior.md ## UJ-4: Set Up Ignored Words with Pre-built Suggestions
>   - specs/behavior.md ## Functional Requirements → FR-030 through FR-035

- [x] **T-040**: Add "Load common words" button and pre-populated stopwords
  - Files: `src/pages/Stopwords.vue` (modify), `src/shared/stopwords-data.ts` (read)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-031, FR-032
  - Done when: "Load common words" button appears next to the word input when selected language has a pre-built list (en/es/fr/de/pt). Clicking it populates the word chips but does not auto-save. Button hidden for languages without pre-built lists.

- [x] **T-041**: Improve empty state and rename "Add Set" to "Add Word List"
  - Files: `src/pages/Stopwords.vue` (modify)
  - Files-write: `src/pages/Stopwords.vue`
  - Spec ref: FR-033, FR-034, FR-035
  - Done when: Empty state shows "No ignored words yet" with description and two buttons: "Add common English words" (opens form with English + pre-populated words) and "Create your own list" (opens empty form). "Add Set" / "Update Set" button reads "Add Word List" / "Update Word List".

## Parallelism Analysis

| Group | Files-write | Depends on |
|-------|------------|------------|
| Foundation | `src/shared/stopwords-data.ts` | — |
| Group 1 | `src/components/NavMenu.vue` | — |
| Group 2 | `src/pages/OverridesVisual.vue` | — |
| Group 3 | `src/pages/Synonyms.vue` | — |
| Group 4 | `src/pages/Stopwords.vue` | Foundation (reads stopwords-data.ts) |

Dispatch waves:
1. **Wave 1**: Foundation + Group 1 (parallel — no file overlap)
2. **Wave 2**: Group 2 + Group 3 (parallel — no file overlap)
3. **Wave 3**: Group 4 (depends on Foundation's stopwords-data.ts)
