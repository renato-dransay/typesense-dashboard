---
title: Curations UX Redesign - Behavior & Logic
connie-publish: true
---

# Curations UX Redesign - Behavior & Logic

> ⚠️ **Generated from Git (MARKETPLACE-DOCS). Do not edit in Confluence. Propose changes via PR.**

## Overview

The Typesense Dashboard curations pages (Overrides, Synonyms, Stopwords) expose raw API concepts that are meaningless to non-technical users. This initiative replaces all developer-oriented terminology, labels, and form inputs with business-friendly language and visual builders — making the pages usable by Product Managers, Marketing Managers, and Merchandisers without Typesense knowledge.

**Key design principles:**
- Every label answers "What does this do for my customers?" — not "What API parameter does this map to?"
- Advanced/technical options are hidden behind toggles, not removed
- All Typesense API calls remain unchanged — visual builders produce the same strings the API expects
- URL paths stay the same to avoid breaking bookmarks

**Pages affected:**
1. Overrides → **Search Rules** (terminology + visual filter/sort builders + rich product cards)
2. Synonyms (terminology + simplified form + table cleanup)
3. Stopwords → **Ignored Words** (terminology + explanation banner + language dropdown)
4. Sidebar navigation (rename "Curations" section)

## User Journeys & Testing

### User Journey 1: Create a Search Rule (was "Override")

**Description**: A merchandiser wants to influence what customers see when they search for a specific term — pinning promoted products to the top, hiding irrelevant ones, or filtering/sorting results. They should be able to do this without knowing Typesense syntax.

**Independent Test**: Can be fully tested by creating a new search rule with a query, pinning a product, adding a filter condition, saving it, and verifying it appears in the rules table with correct human-readable data.

#### Scenario: User sees the renamed page and form
- **WHEN** the user navigates to the Search Rules page
- **THEN** the page title reads "Search Rules" (not "Visual Override Editor")
- **AND** the form section heading reads "Search Rule" (not "Override Rule")
- **AND** the first field is labeled "Rule Name" (not "Override ID")
- **AND** the Rule Name field is auto-populated with a readable slug derived from the query pattern (e.g., `rule-blue-dream` when query is "blue dream")
- **AND** if no query has been entered yet, the Rule Name shows a generated ID that updates when the query changes

#### Scenario: User enters a query pattern with human-readable match types
- **WHEN** the user types "blue dream" in the "When someone searches for..." field
- **THEN** the Rule Name auto-updates to `rule-blue-dream`
- **AND** the match type dropdown shows "Exact phrase match" and "Contains these words" (not "exact" and "contains")
- **AND** the selected match type defaults to "Exact phrase match"

#### Scenario: User configures a filter using the visual builder
- **WHEN** the user clicks the filter builder area (labeled "Only show results matching...")
- **THEN** a compound filter builder is displayed with:
  - A row containing: a field dropdown (populated from the collection schema), an operator dropdown ("is", "is not", "greater than", "less than", "between"), and a value input
  - An "Add condition" button to add more rows
  - A logic toggle (AND / OR) between rows when multiple conditions exist
- **AND** the field dropdown only shows filterable fields from `store.currentCollection.fields` (fields where `facet: true` or `type` is numeric/boolean)
- **AND** when the user selects field "category", operator "is", value "flower"
- **THEN** the builder internally produces the string `category:flower` for the API

#### Scenario: User configures a filter with multiple conditions
- **WHEN** the user has one filter row (`category:flower`) and clicks "Add condition"
- **THEN** a second row appears with its own field/operator/value dropdowns
- **AND** a logic toggle (AND / OR) appears between the two rows, defaulting to AND
- **WHEN** the user sets the second row to field "price", operator "less than", value "50"
- **AND** the logic toggle is set to AND
- **THEN** the builder internally produces the string `category:flower && price:<50`

#### Scenario: User configures sorting using the visual builder
- **WHEN** the user interacts with the sort builder area (labeled "Sort results by...")
- **THEN** a sort builder is displayed with:
  - A field dropdown (populated from sortable fields in the collection schema — numeric fields and fields with `sort: true`)
  - A direction toggle: "Low to High" / "High to Low" (not "asc" / "desc")
- **AND** when the user selects field "price" and direction "Low to High"
- **THEN** the builder internally produces the string `price:asc` for the API

#### Scenario: User pins a product and sees a rich product card
- **WHEN** the user searches for products in the "Search Products to Pin / Hide" section
- **THEN** search results show product cards with:
  - The product's **name/title** (auto-detected: first field matching `name`, `title`, `product_name`, or falling back to the first `string` type field)
  - Up to 3 **key attributes** displayed as secondary text (remaining string/number fields, excluding `id` and internal fields starting with `_`)
- **WHEN** the user clicks "Pin" on a product
- **THEN** the product appears in the "Pinned Products" section as a card with:
  - A **green pin badge/indicator** on the left
  - The product name and key attributes (same as search results)
  - The position number
  - A remove button

#### Scenario: User hides a product and sees a distinct visual
- **WHEN** the user clicks "Hide" on a product from search results
- **THEN** the product appears in the "Hidden Products" section as a card with:
  - A **red hidden badge/indicator** on the left
  - The product name and key attributes
  - A remove button

#### Scenario: User edits an existing rule and sees product details
- **WHEN** the user clicks "Edit" on an existing rule that has pinned products (e.g., includes `[{ id: "p001", position: 1 }]`)
- **THEN** the system fetches the document details for each pinned/hidden product ID from the collection
- **AND** displays the product cards with name and attributes (not just `ID: p001 - Position: 1`)
- **AND** if the document fetch fails (e.g., product was deleted), the card falls back to showing the raw ID with a warning indicator

#### Scenario: Advanced options are accessible but hidden
- **WHEN** the user wants to see the raw Rule ID or edit it manually
- **THEN** they can expand an "Advanced" section below the Rule Name field
- **AND** the Advanced section shows the raw Override ID field (editable)
- **AND** the "Edit JSON" button remains available in the page header for power users

#### Scenario: User views the rules table with improved columns
- **WHEN** the user views the "Existing Rules" table (renamed from "Existing Overrides")
- **THEN** the table columns are:
  - **Name** (was "ID") — shows the rule name/ID
  - **Query** — the search query pattern
  - **Match** — shows "Exact" or "Contains" (not "exact" / "contains")
  - **Pinned** (was "Includes") — shows product names (comma-separated, max 3 with "+N more") or count if names can't be resolved
  - **Hidden** (was "Excludes") — same format as Pinned
  - **Status** — badge showing "Active" (green), "Scheduled" (blue), or "Expired" (grey), derived from `effective_from_ts` and `effective_to_ts` relative to current time. If no dates are set, shows "Always active" (green).
  - **Tags** — unchanged
  - **Actions** — Edit / Delete (unchanged)

---

### User Journey 2: Manage Synonyms with Plain Language

**Description**: A marketing manager wants to add synonym groups so that customers searching for "weed" also find results for "cannabis" and "marijuana". They should understand the difference between two-way and one-way synonyms without reading API docs.

**Independent Test**: Can be fully tested by creating a two-way synonym group, creating a one-way synonym, and verifying the table shows human-readable type labels and hides advanced columns.

#### Scenario: User sees simplified synonym creation form
- **WHEN** the user navigates to the Synonyms page
- **AND** the creation form is displayed (either expanded or via a prominent "Create Synonym" button)
- **THEN** the ID field is NOT visible in the default form
- **AND** the type selector shows two options with descriptions:
  - **"These words mean the same thing"** with subtitle: _"When someone searches for any of these words, show results for all of them."_
  - **"This word should also match..."** with subtitle: _"Also show results for these alternatives, but not the other way around."_
- **AND** the default selection is "These words mean the same thing"

#### Scenario: User creates a two-way synonym
- **WHEN** the user selects "These words mean the same thing"
- **AND** enters synonyms: "weed", "cannabis", "marijuana", "herb"
- **AND** clicks "Add Synonym"
- **THEN** the synonym is created with an auto-generated ID slug: `syn-weed-cannabis-marijuana-herb` (first 4 words, joined by hyphens)
- **AND** the synonym appears in the table

#### Scenario: User creates a one-way synonym
- **WHEN** the user selects "This word should also match..."
- **THEN** a "Trigger word" field appears (was "Root")
- **AND** the "Trigger word" field has a helper subtitle: _"When someone searches for this word..."_
- **AND** the synonyms field has a helper subtitle: _"...also show results for these words"_

#### Scenario: User views the simplified synonyms table
- **WHEN** the user views the synonyms table
- **THEN** the visible columns are:
  - **Type** — shows "Two-way" or "One-way" (not "multi-way" / "one-way")
  - **Trigger word** (was "Root") — only populated for one-way synonyms
  - **Synonyms** — comma-separated list
  - **Actions** — Edit / Delete
- **AND** the "ID", "Symbols to Index", and "Locale" columns are NOT visible by default

#### Scenario: User accesses advanced synonym options
- **WHEN** the user wants to set Symbols to Index or Locale
- **THEN** they can expand an "Advanced Options" section in the creation form
- **AND** the Advanced section contains:
  - The ID field (editable, pre-populated with auto-generated slug)
  - "Special Characters" field (was "Symbols to Index") with hint: _"Enter a character (e.g., +, -) and press Enter"_
  - "Language" field (was "Locale") with hint: _"Leave blank to auto-detect"_

---

### User Journey 3: Configure Ignored Words (was "Stopwords")

**Description**: A product manager wants to configure words that should be ignored during search so that common filler words don't dilute result quality. They need to understand what this feature does without knowing the term "stopwords".

**Independent Test**: Can be fully tested by viewing the explanation banner, creating a word list with the language dropdown, and verifying the table shows updated terminology.

#### Scenario: User sees the renamed page with explanation
- **WHEN** the user navigates to the Ignored Words page
- **THEN** the page title reads "Ignored Words" (not "Stopwords Sets")
- **AND** a persistent explanation banner is displayed at the top:
  - **Title**: "What are Ignored Words?"
  - **Body**: _"Some common words (like 'the', 'and', 'of') can clutter search results. Add words here that should be ignored when customers search, so they get more relevant results."_
  - **Example**: _"Example: If you add 'the' as an ignored word, searching 'the blue dress' works the same as 'blue dress'."_
- **AND** the banner can be dismissed but reappears on page reload (it's informational, not a one-time alert)

#### Scenario: User creates a word list without seeing technical fields
- **WHEN** the user opens the creation form (renamed from "Add Stopwords Set" to "Add Word List")
- **THEN** the ID field is NOT visible (auto-generated as `ignored-words-{locale}` or `ignored-words-{timestamp}`)
- **AND** the "Locale" text input is replaced with a **Language dropdown** containing:
  - English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Dutch (nl), and a "Other..." option that reveals a raw text input for custom locale codes
- **AND** the words input is labeled "Words to ignore" (not "Stopwords") with hint: _"Type a word and press Enter"_
- **AND** the "Documentation" link to Typesense API docs is removed

#### Scenario: User views the word lists table
- **WHEN** the user views the existing word lists table
- **THEN** the table heading reads "Word Lists" (not "Stopwords Sets")
- **AND** the columns are:
  - **Language** (was "Locale") — shows the full language name (e.g., "English") instead of locale code
  - **Words** (was "Stopwords") — displayed as chips
  - **Actions** — Edit / Delete
- **AND** the "ID" column is NOT visible by default

---

### User Journey 4: Navigate Using Renamed Sidebar

**Description**: Users should see business-friendly navigation labels that match the page content.

**Independent Test**: Can be fully tested by visually inspecting the sidebar and clicking each link to confirm correct navigation.

#### Scenario: Sidebar shows renamed section
- **WHEN** the user views the sidebar navigation
- **THEN** the section previously labeled "Curations" is now labeled "Search Merchandising"
- **AND** the section icon remains `sym_s_low_priority` (or updates to a more relevant icon like `sym_s_manage_search`)
- **AND** the children are:
  - "Search Rules" (was "Overrides") — links to `/curations/overrides` (URL unchanged)
  - "Synonyms" — links to `/collection/{name}/synonyms` (unchanged)
  - "Ignored Words" (was "Stopwords") — links to `/stopwords` (URL unchanged)
- **AND** the `sections` reactive object key is renamed from `curations` to `searchMerchandising` (or the key stays the same with only the label changing — implementation detail)

---

## Functional Requirements

### Cross-cutting
- **FR-001**: System MUST replace all API-centric terminology with user-friendly equivalents per the terminology mapping below. This applies to page titles, form labels, table headers, button labels, and notification messages.
- **FR-002**: System MUST rename the sidebar "Curations" section to "Search Merchandising", "Overrides" to "Search Rules", and "Stopwords" to "Ignored Words". URL paths MUST remain unchanged.
- **FR-003**: All underlying Typesense API calls MUST remain functionally unchanged. Visual builders produce the same `filter_by`, `sort_by`, synonym, and stopword API payloads as before.

### Search Rules (Overrides)
- **FR-010**: Page title MUST read "Search Rules".
- **FR-011**: "Override ID" field MUST be replaced with "Rule Name" that auto-generates a slug from the query pattern (format: `rule-{query-words-joined-by-hyphens}`). Raw ID MUST be accessible in an "Advanced" collapsed section.
- **FR-012**: "Query pattern" field MUST be relabeled to "When someone searches for..." with the field still binding to `overrideForm.rule.query`.
- **FR-013**: "Match type" dropdown MUST show "Exact phrase match" (value: `exact`) and "Contains these words" (value: `contains`).
- **FR-014**: "Filter injection (filter_by clause)" text input MUST be replaced with a visual compound filter builder. The builder MUST:
  - Show a row with: field dropdown (filterable fields from collection schema), operator dropdown, and value input
  - Support adding multiple rows with AND/OR logic toggle between them
  - Produce valid `filter_by` strings (e.g., `category:flower && price:<50`)
  - Parse existing `filter_by` strings back into structured form when editing existing rules
- **FR-015**: "Sort injection (sort_by clause)" text input MUST be replaced with a visual sort builder. The builder MUST:
  - Show a field dropdown (sortable fields from collection schema) and a direction toggle ("Low to High" / "High to Low")
  - Produce valid `sort_by` strings (e.g., `price:asc`)
  - Parse existing `sort_by` strings back into structured form when editing existing rules
- **FR-016**: Product search results and pinned/hidden product lists MUST display rich product cards showing auto-detected product name/title and key attributes instead of raw document IDs. Auto-detection logic:
  1. Look for a field named `name`, `title`, `product_name`, or `product_title` (case-insensitive) for the display name
  2. Fall back to the first `string` type field in the schema
  3. Show up to 3 additional string/number fields as secondary attributes
- **FR-017**: Pinned products MUST display a green pin badge/indicator. Hidden products MUST display a red hidden badge/indicator.
- **FR-018**: When editing an existing rule with pinned/hidden products, the system MUST fetch document details by ID from the collection to display product cards. If a document is not found, fall back to showing the raw ID with a warning.
- **FR-019**: The rules table MUST show:
  - "Pinned" column with product names (max 3, with "+N more" overflow) instead of numeric count
  - "Hidden" column with same format
  - "Status" column with Active/Scheduled/Expired badge derived from `effective_from_ts`/`effective_to_ts`

### Synonyms
- **FR-020**: Synonym type options MUST read "These words mean the same thing" (multi-way) and "This word should also match..." (one-way), each with a one-line descriptive subtitle.
- **FR-021**: The ID field MUST be hidden from the default creation form. IDs MUST be auto-generated as slugs from synonym words (format: `syn-{first-4-words-joined-by-hyphens}`).
- **FR-022**: "Root" field MUST be renamed to "Trigger word".
- **FR-023**: The synonyms table MUST hide "ID", "Symbols to Index", and "Locale" columns by default. "Type" column MUST show "Two-way" / "One-way".
- **FR-024**: "Symbols to Index" and "Locale" MUST be accessible in an "Advanced Options" collapsed section within the creation form. "Symbols to Index" is relabeled "Special Characters", "Locale" is relabeled "Language".

### Ignored Words (Stopwords)
- **FR-030**: Page title MUST read "Ignored Words". All references to "Stopwords" in visible UI text MUST be replaced.
- **FR-031**: A persistent explanation banner MUST be displayed describing what ignored words are, with a before/after example.
- **FR-032**: The set ID field MUST be hidden by default. IDs MUST be auto-generated.
- **FR-033**: "Locale" text input MUST be replaced with a language dropdown (English/en, Spanish/es, French/fr, German/de, Italian/it, Portuguese/pt, Dutch/nl, plus "Other..." for custom codes).
- **FR-034**: The "Documentation" link to Typesense API docs MUST be removed.
- **FR-035**: The table MUST show "Language" (full name, not code), "Words" (chips), and "Actions" columns. "ID" column MUST be hidden.

## Terminology Mapping

| Current (API-centric) | New (User-centric) | Context |
|---|---|---|
| Visual Override Editor | Search Rules | Page title |
| Override / Override Rule | Search Rule | Form section, table |
| Override ID | Rule Name | Form field |
| Query pattern | When someone searches for... | Form field |
| Match type: exact | Exact phrase match | Dropdown option |
| Match type: contains | Contains these words | Dropdown option |
| Filter injection (filter_by clause) | Only show results matching... | Form section |
| Sort injection (sort_by clause) | Sort results by... | Form section |
| Includes / Pinned Products (includes) | Pinned Products | Section heading |
| Excludes / Hidden Products (excludes) | Hidden Products | Section heading |
| Existing Overrides | Existing Rules | Table heading |
| Multi-way synonyms | These words mean the same thing | Radio option |
| One-way synonym | This word should also match... | Radio option |
| Root | Trigger word | Form field |
| Symbols to Index | Special Characters | Form field (advanced) |
| Stopwords / Stopwords Sets | Ignored Words / Word Lists | Page title, table |
| Locale | Language | Form field |
| Curations | Search Merchandising | Sidebar section |
| Overrides | Search Rules | Sidebar item |
| Stopwords | Ignored Words | Sidebar item |

## Key Entities

- **Search Rule** (Override): A configuration that modifies search behavior for a specific query. Contains a query pattern, match type, optional filter/sort injections, optional pinned/hidden products, optional scheduling dates, and tags.
- **Synonym Group**: A set of words treated as equivalent during search. Can be two-way (all words equivalent) or one-way (trigger word expands to alternatives).
- **Word List** (Stopwords Set): A collection of words to be ignored during search, scoped to a language/locale.

## Success Criteria

### Measurable Outcomes
- **SC-001**: No Typesense API jargon ("filter_by", "sort_by", "override", "stopwords") is visible in the default UI across all three pages and sidebar navigation.
- **SC-002**: Users can create a search rule with a filter condition using only dropdowns — no raw syntax typing required.
- **SC-003**: Pinned/hidden products display the product's name and attributes, not raw document IDs.
- **SC-004**: All existing API functionality remains intact — creating, editing, deleting rules/synonyms/stopwords produces identical API payloads to the current implementation.

## Edge Cases

- **Filter builder parse failure**: When editing an existing rule whose `filter_by` string uses syntax the visual builder can't parse (e.g., complex nested expressions), fall back to displaying the raw text input with a note: "This filter uses advanced syntax. You can edit it directly." The raw string MUST be preserved — never silently discard unparseable filters.
- **Sort builder parse failure**: Same approach as filter builder — fall back to raw text input for unparseable `sort_by` strings.
- **Product not found**: When editing a rule that references a product ID that no longer exists in the collection, show the raw ID with a warning badge: "Product not found — it may have been deleted."
- **Empty collection schema**: If the collection has no filterable/sortable fields, the filter/sort builders MUST show an informational message instead of empty dropdowns: "No filterable fields available in this collection."
- **Auto-generated ID collision**: If the auto-generated slug for a rule/synonym already exists, append a numeric suffix (e.g., `rule-blue-dream-2`).
- **Language dropdown "Other"**: When the user selects "Other..." in the language dropdown, a text input appears for entering a custom locale code. The dropdown reverts to showing the custom code as the selected value.

## Open Questions

_None remaining — all clarification questions have been resolved._
