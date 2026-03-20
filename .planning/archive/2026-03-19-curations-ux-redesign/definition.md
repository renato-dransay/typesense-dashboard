# Work Definition: Curations Pages UX Redesign

## Meta
- **Type:** Feature Change
- **JIRA:** None
- **Created:** 2026-03-19
- **Author:** renato-dransay

## Context

The Typesense Dashboard curations pages (Overrides, Synonyms, Stopwords) currently expose raw Typesense API concepts directly in the UI. Labels like "Override ID", "filter_by clause", "sort_by clause", "Match type: exact", "Multi-way synonyms", and "Stopwords Set" are developer-oriented and meaningless to the target users: Product Managers, Marketing Managers, and Merchandisers with no deep Typesense knowledge.

A thorough UX audit (see `curations-ux-report.md`) identified 30+ usability issues across the three pages, ranging from jargon-laden labels to missing visual feedback. The highest-impact problems are: (1) pinned products showing only raw IDs (`ID: p001 - Position: 1`) with no product name/image, (2) filter and sort fields requiring raw Typesense query syntax, and (3) no contextual explanations or onboarding for any feature.

This initiative focuses on the **P0 and P1 priorities** from the UX report: terminology changes, label rewording, simplified forms, rich product display in overrides, and hiding advanced options behind toggles. Higher-effort items (split-screen preview, guided wizards, CSV import) are deferred to future work.

## Scope

### In Scope
- [ ] Rename all API-centric terminology to user-friendly language across all three pages and navigation
- [ ] Overrides page: rename to "Search Rules", relabel all form fields, auto-generate rule IDs (hide from user)
- [ ] Overrides page: replace raw filter/sort text inputs with visual builder dropdowns (field + operator + value)
- [ ] Overrides page: show rich product cards (name, key attributes) when pinning/hiding instead of raw IDs
- [ ] Overrides page: visual distinction between pinned (green) and hidden (red) products
- [ ] Overrides page: improve existing rules table with human-readable columns
- [ ] Synonyms page: replace "Multi-way" / "One-way" with plain-language descriptions and inline examples
- [ ] Synonyms page: auto-generate IDs, hide ID field from creation form
- [ ] Synonyms page: simplify table columns, hide "Symbols to Index" and "Locale" behind Advanced toggle
- [ ] Stopwords page: rename to "Ignored Words", add explanation banner
- [ ] Stopwords page: hide set ID from user, replace Locale text input with language dropdown
- [ ] Stopwords page: hide advanced options behind toggle
- [ ] Sidebar navigation: rename "Curations" section and its children to match new terminology

### Out of Scope
- Split-screen live preview for overrides (P2 — high effort, future initiative)
- Guided creation wizard / step-by-step flow (P2 — high effort)
- Pre-built stopword lists per language (P2)
- Synonym templates / common pattern library (P3)
- CSV bulk import/export (P3)
- Contextual help / tooltip system across all fields (P3)
- Drag-and-drop reordering of pinned products (P2 — requires significant interaction work)
- Changes to the JSON editor mode

## Requirements

### Functional

**Cross-cutting**
1. The system MUST replace all API-centric terminology with user-friendly equivalents per the terminology mapping in the UX report (Section A — Unified Terminology).
2. The sidebar navigation MUST rename "Curations" to "Search Merchandising", "Overrides" to "Search Rules", and "Stopwords" to "Ignored Words". "Synonyms" keeps its name.

**Overrides → Search Rules**
3. The page title MUST read "Search Rules" instead of "Visual Override Editor".
4. The "Override ID" field MUST be replaced with "Rule Name", auto-generating a slug from the query pattern. The raw ID field MUST be hidden by default (available in an Advanced section).
5. The "Query pattern" field MUST include a helper subtitle explaining what it does (e.g., "When someone searches for...").
6. The "Match type" dropdown MUST use labels "Exact phrase match" and "Contains these words" instead of "exact" and "contains".
7. The "Filter injection (filter_by clause)" MUST be replaced with a visual filter builder: a dropdown of collection fields, an operator selector, and a value input. The builder MUST still produce valid `filter_by` syntax for the Typesense API.
8. The "Sort injection (sort_by clause)" MUST be replaced with a visual sort builder: a dropdown of sortable fields and an ascending/descending toggle. The builder MUST still produce valid `sort_by` syntax.
9. When products are pinned or hidden, the system MUST display product cards showing the product name/title and key attributes (fetched from the collection) instead of raw document IDs.
10. Pinned products MUST be visually distinguished with a green indicator/badge. Hidden products MUST use a red indicator/badge.
11. The existing rules table MUST replace "Includes: N / Excludes: N" with human-readable product names or descriptive summaries.
12. The existing rules table MUST show a status indicator (Active / Scheduled / Expired) derived from the effective date range.

**Synonyms**
13. The synonym type selector MUST replace "Multi-way synonyms" with "These words mean the same thing" and include a one-line description: "When someone searches for any of these words, show results for all of them."
14. The synonym type selector MUST replace "One-way synonym" with "This word should also match..." and include a one-line description: "Also show results for these alternatives, but not the other way around."
15. The ID field MUST be removed from the default creation form. A slug MUST be auto-generated from the synonym words.
16. The synonyms table MUST hide "Symbols to Index" and "Locale" columns by default. These MUST be accessible via an expandable row detail or "Advanced" toggle.
17. The "Type" column MUST show "Two-way" / "One-way" instead of "multi-way" / "one-way".
18. The "Root" column MUST be renamed to "Trigger word".

**Stopwords → Ignored Words**
19. The page title and all references MUST read "Ignored Words" instead of "Stopwords".
20. The page MUST display a persistent explanation banner describing what ignored words are and showing a before/after example.
21. The set ID field MUST be hidden from the user by default. IDs MUST be auto-generated.
22. The "Locale" text input MUST be replaced with a dropdown of common languages (English, Spanish, French, German, Italian, Portuguese, Dutch, etc.) that maps to locale codes internally.
23. The "Documentation" link MUST either be removed or link to an in-app explanation rather than the Typesense API docs.

### Non-Functional
- **Backward compatibility:** All changes are UI-only. The underlying Typesense API calls MUST remain unchanged. The visual builders produce the same `filter_by` and `sort_by` strings the API expects.
- **Performance:** The filter/sort builder dropdowns MUST load collection schema fields on page load without noticeable delay.
- **Accessibility:** All renamed labels and new components MUST maintain existing keyboard navigation and screen reader support.

## Acceptance Criteria
- [ ] AC-001: Given a user viewing the sidebar, when they look at the navigation, then they see "Search Merchandising > Search Rules, Synonyms, Ignored Words" instead of "Curations > Overrides, Synonyms, Stopwords".
- [ ] AC-002: Given a user on the Search Rules page, when they create a new rule, then they see "Rule Name" (auto-populated), "When someone searches for..." field, and "Exact phrase match" / "Contains these words" match options — no raw Typesense jargon is visible.
- [ ] AC-003: Given a user on the Search Rules page, when they configure a filter, then they see a visual builder with field/operator/value dropdowns populated from the collection schema — not a raw text input.
- [ ] AC-004: Given a user who has pinned a product, when they view the pinned products section, then they see the product's name and key attributes — not just "ID: p001 - Position: 1".
- [ ] AC-005: Given a user viewing the rules table, when an override has an active date range, then they see a status badge (Active / Scheduled / Expired) alongside the rule.
- [ ] AC-006: Given a user on the Synonyms page, when they create a new synonym, then they do NOT see an ID field, and the type options are "These words mean the same thing" / "This word should also match..." with explanatory descriptions.
- [ ] AC-007: Given a user viewing the synonyms table, then "Symbols to Index" and "Locale" columns are hidden, and the Type column shows "Two-way" / "One-way".
- [ ] AC-008: Given a user on the Ignored Words page, then they see an explanation banner, no visible set ID field, and a language dropdown instead of a raw locale text input.
- [ ] AC-009: All Typesense API calls MUST remain functionally unchanged — the visual builders produce the same `filter_by`, `sort_by`, and other API parameters as before.

## Dependencies
- **Blocks:** None
- **Blocked by:** None
- **Related:** Sidebar navigation redesign (just shipped in PR #3 — labels will change again with this work)

## Technical Hints

**Files to modify:**
- `src/pages/OverridesVisual.vue` — Main overrides page (rename, relabel, add filter/sort builders, product cards)
- `src/pages/Synonyms.vue` — Synonyms page (type labels, ID hiding, table simplification)
- `src/pages/Stopwords.vue` — Stopwords page (rename, explanation banner, language dropdown)
- `src/components/NavMenu.vue` — Sidebar navigation labels (lines ~131-171)
- `src/router/routes.ts` — Route paths/names if renaming URLs

**Codebase patterns:**
- Stack: Vue 3 + Quasar + Pinia + TypeScript
- Pages use Quasar components extensively: `q-input`, `q-select`, `q-card`, `q-expansion-item`, `q-table`
- Collection schema is accessible via the Pinia store (`store.currentCollection`) — field names and types can be derived from it for the filter/sort builders
- The Typesense JS client is used for API calls — the visual builders must produce strings compatible with the existing API call format

**Key considerations:**
- The filter builder needs to parse existing `filter_by` strings back into structured form when editing existing overrides
- The sort builder needs to parse existing `sort_by` strings back into structured form
- Product card display requires fetching document details by ID from the collection when editing existing overrides with pinned/hidden products

## Source Documents
| Document | Type | Location |
|----------|------|----------|
| Curations UX Research Report | UX Audit | `curations-ux-report.md` |
| Overrides page screenshot | Screenshot | `curations-overrides-editing.png` |
| Synonyms page screenshot | Screenshot | `curations-synonyms-add.png` |
| Stopwords page screenshot | Screenshot | `curations-stopwords.png` |

## Open Questions
- Should the URL paths also change (e.g., `/curations/overrides` → `/search-rules`) or just the visible labels? URL changes would break existing bookmarks.
- For the filter builder, should we support compound filters (multiple conditions with AND/OR) in V1, or just a single condition?
- When displaying product cards, which fields should be shown? Should this be configurable, or should we auto-detect a "title" and "image" field from the collection schema?
