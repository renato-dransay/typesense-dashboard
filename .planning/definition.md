# Work Definition: Curations UX Redesign — Round 2

## Meta
- **Type:** Feature Change
- **JIRA:** None
- **Created:** 2026-03-19
- **Author:** renato-dransay
- **Depends on:** Round 1 (archived at `.planning/archive/2026-03-19-curations-ux-redesign/`)

## Context

Round 1 delivered terminology changes across all curations pages (Search Rules, Synonyms, Ignored Words), visual filter/sort builders, rich product cards for pinned/hidden items, and sidebar renaming from "Curations" to "Search Merchandising".

This Round 2 addresses the **remaining P0 and P1 items** from the UX audit (`curations-ux-report.md`) — structural layout changes, navigation consolidation, and visual improvements that were deferred as "higher effort" in Round 1.

### What Round 1 already delivered:
- Sidebar renamed: "Curations" -> "Search Merchandising", "Overrides" -> "Search Rules", "Stopwords" -> "Ignored Words"
- Search Rules: field labels reworded, visual filter/sort builders, rich product cards, auto-generated rule names
- Synonyms: plain-language form labels, auto-generated IDs, simplified table columns
- Ignored Words: explanation banner, language dropdown, hidden IDs

### What remains (this initiative):
The UX report's P0 items #1, #4, #5 and P1 items #8, #10 are still open.

## Scope

### In Scope
- [ ] **Navigation consolidation**: Merge 3 overlapping sidebar sections (Merchandising, Relevance, Search Merchandising) into 2 clear sections: "Catalog" and "Search & Discovery". Collapse Server + Configuration into "Settings".
- [ ] **Search Rules: list-first layout**: Flip the page so existing rules table appears first (above the fold). The creation/edit form opens below or in a dialog when clicking "Create New Rule" or "Edit".
- [ ] **Search Rules: hide Edit JSON**: Move "Edit JSON" button behind an Advanced/Developer section toggle — not in the page header.
- [ ] **Search Rules: rule cards in table**: Replace the dense table with summary cards showing rule name, query, pinned product names, status badge, and tags — making rules scannable.
- [ ] **Synonyms: visual arrow notation**: Replace "Two-way" / "One-way" text in the table with visual `<->` and `->` arrow notation showing the synonym relationship inline.
- [ ] **Synonyms: inline preview text**: After entering synonyms, show a sentence explaining the effect: "When a customer searches for **X**, they'll also see results for **Y** and **Z**."
- [ ] **Ignored Words: pre-populated suggestions**: When a language is selected, offer a "Load common words" button with pre-built stopword lists for English, Spanish, French, German, Portuguese.
- [ ] **Ignored Words: better empty state**: Replace warning triangle with a helpful message and action button.

### Out of Scope
- Live split-screen search preview (P2 — requires significant backend interaction)
- Step-by-step guided rule creation wizard (P2 — deferred)
- Product Positioning redesign (P1 — separate initiative, different page)
- Vendor Controls redesign (P2 — separate initiative)
- Activity log (P2)
- Onboarding checklist (P2)
- "Preview as Customer" global mode (P2)

## Requirements

### Functional

**Navigation**
1. The sidebar MUST consolidate into the following structure:
   - **Search** (existing, unchanged)
   - **Catalog**: Products (was Product Positioning), Vendors (was Vendor Controls)
   - **Search & Discovery**: Search Rules, Synonyms, Ignored Words, Ranking (merge Ranking Formula + Search Weights under one label)
   - **Analytics** (unchanged)
   - **Settings**: Server Status, Cluster Status, API Keys, Aliases, Search Presets, Stemming, Analytics Rules
2. All route paths MUST remain unchanged — only labels and grouping change.
3. The collection selector MUST remain at the top of the sidebar.

**Search Rules — Layout**
4. The page MUST show the existing rules list FIRST (above the fold) when navigating to the page.
5. A "Create New Rule" button at the top MUST open/expand the creation form below (or in a dialog/drawer).
6. Clicking "Edit" on an existing rule MUST populate the creation/edit form with that rule's data (existing behavior, just repositioned).
7. The "Edit JSON" button MUST be moved out of the page header into an Advanced section within the form, or behind a "Developer tools" expansion.

**Search Rules — Rule Cards**
8. Each rule in the list MUST display as a summary card showing: Rule Name, trigger query, match type, pinned product names (not IDs), status badge (Active/Scheduled/Expired), and tags.
9. Each card MUST have Edit, Duplicate, and Delete actions.
10. The rule cards MUST be filterable by tag (existing functionality, repositioned).

**Synonyms — Table**
11. The synonym table MUST replace "Two-way" with a visual `<->` indicator and "One-way" with a `->` indicator.
12. For two-way synonyms, the table MUST show all words connected by `<->` in a single cell, eliminating the empty "Trigger word" column issue.
13. For one-way synonyms, the table MUST show `trigger -> synonym1, synonym2`.

**Synonyms — Preview**
14. After entering synonyms in the creation form, a preview sentence MUST appear: "When a customer searches for **[word]**, they'll also see results for **[other words]**."
15. For two-way synonyms, show: "Searching for any of **[word1]**, **[word2]**, ... will show results for all of them."

**Ignored Words — Suggestions**
16. When a language is selected in the creation form, a "Load common words" button MUST appear.
17. Clicking "Load common words" MUST populate the word list with the language's common stopwords.
18. Pre-built lists MUST exist for: English, Spanish, French, German, Portuguese (at minimum).
19. The user MUST be able to edit the pre-populated list before saving (it's a suggestion, not auto-save).

**Ignored Words — Empty State**
20. When no word lists exist, the table area MUST show a friendly empty state with a description and a call-to-action button instead of a warning triangle.

### Non-Functional
- All existing Typesense API calls MUST remain functionally unchanged.
- Navigation changes MUST NOT break any existing route paths or bookmarks.
- The page MUST remain fully functional in both light and dark mode.
