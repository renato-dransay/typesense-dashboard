---
title: Curations UX Redesign Round 2 - Behavior & Logic
---

# Curations UX Redesign Round 2 - Behavior & Logic

## Overview

Round 2 addresses structural layout changes and navigation consolidation deferred from Round 1. The focus is: (1) consolidating the sidebar from 7 sections into 5 clear user-task-oriented groups, (2) flipping Search Rules to a list-first layout, (3) hiding developer-oriented controls, (4) visual synonym relationship notation, (5) inline preview text for synonyms, (6) pre-populated stopword suggestions, and (7) improved empty states.

**Key constraint:** All route paths remain unchanged. Only labels, grouping, and page layout change.

## User Journeys

### UJ-1: Navigate the Consolidated Sidebar

**Description**: A merchandiser opens the dashboard and finds all features organized in intuitive, non-overlapping groups.

#### Scenario: Sidebar shows consolidated sections
- **WHEN** the user logs in and sees the sidebar
- **THEN** the sidebar shows these top-level sections in order:
  1. Collection selector (unchanged)
  2. **Search** — Search, Query Debugger, Autocomplete Preview (unchanged)
  3. **Catalog** — Products, Vendors
  4. **Search & Discovery** — Search Rules, Synonyms, Ignored Words, Ranking Formula, Search Weights
  5. **Analytics** — (unchanged)
  6. **Settings** — Server Status, Cluster Status, Collections, Aliases, API Keys, Search Presets, Stemming, Schema, Add Document
- **AND** "Merchandising", "Relevance", and "Search Merchandising" sections no longer exist as separate groups
- **AND** all route paths (URLs) remain identical

#### Scenario: Auto-expand works for new section groupings
- **WHEN** the user navigates to `/merchandising/products`
- **THEN** the "Catalog" section auto-expands
- **WHEN** the user navigates to `/curations/overrides` or `/relevance/ranking`
- **THEN** the "Search & Discovery" section auto-expands
- **WHEN** the user navigates to `/` (Server Status)
- **THEN** the "Settings" section auto-expands

### UJ-2: View and Manage Search Rules (List-First)

**Description**: A merchandiser navigates to Search Rules and immediately sees all existing rules above the fold, with a clear action to create a new one.

#### Scenario: Page loads with rules list first
- **WHEN** the user navigates to the Search Rules page
- **THEN** the page header shows "Search Rules" with a "+ Create New Rule" button
- **AND** the existing rules are displayed immediately below as summary cards
- **AND** no creation form is visible until the user clicks "+ Create New Rule"

#### Scenario: Rule cards show summary info
- **WHEN** the user views the rules list
- **THEN** each rule is displayed as a card showing:
  - Rule name (bold)
  - Trigger: "When someone searches **[query]**" with match type badge
  - Actions summary: pinned product names, hidden product count, filter/sort overrides
  - Status badge: Active (green), Scheduled (blue), Expired (gray)
  - Tags (as chips)
  - Action buttons: Edit, Duplicate, Delete

#### Scenario: Creating a new rule
- **WHEN** the user clicks "+ Create New Rule"
- **THEN** the creation form expands below the button (above the rules list)
- **AND** the form contains all the same fields as currently (Rule Name, query, match type, filters, sort, scheduling, pin/hide products)
- **AND** the "Edit JSON" option is hidden inside an "Advanced" expansion within the form

#### Scenario: Editing an existing rule
- **WHEN** the user clicks "Edit" on a rule card
- **THEN** the creation form expands and populates with that rule's data (same as current behavior)

#### Scenario: Duplicating a rule
- **WHEN** the user clicks "Duplicate" on a rule card
- **THEN** the creation form expands with a copy of that rule's data
- **AND** the Rule Name is set to `copy-of-[original-name]`
- **AND** the Override ID is cleared (will auto-generate on save)

#### Scenario: Edit JSON is hidden from primary UI
- **WHEN** the user views the Search Rules page
- **THEN** there is no "Edit JSON" button in the page header
- **WHEN** the user expands the creation/edit form and opens "Advanced"
- **THEN** the "Edit JSON" toggle is available within the Advanced section

### UJ-3: Understand Synonym Relationships at a Glance

**Description**: A merchandiser views the synonyms table and immediately understands the relationships without knowing technical terminology.

#### Scenario: Visual arrow notation in table
- **WHEN** the user views the synonyms table
- **THEN** two-way synonyms show as: `word1 ↔ word2 ↔ word3` (using ↔ character)
- **AND** one-way synonyms show as: `trigger → synonym1, synonym2` (using → character)
- **AND** the "Type" and "Trigger word" columns are replaced by a single "Relationship" column
- **AND** the table columns are: Relationship, Actions

#### Scenario: Inline preview when creating synonyms
- **WHEN** the user enters words in the synonym creation form
- **AND** the type is "These words mean the same thing" (two-way)
- **THEN** a preview appears below: "Searching for any of **word1**, **word2**, **word3** will show results for all of them."
- **WHEN** the type is "This word should also match..." (one-way)
- **AND** a trigger word and synonyms are entered
- **THEN** a preview appears: "When a customer searches for **trigger**, they'll also see results for **synonym1** and **synonym2**."

### UJ-4: Set Up Ignored Words with Pre-built Suggestions

**Description**: A merchandiser setting up ignored words for the first time can quickly load a common set for their language.

#### Scenario: Load common words button
- **WHEN** the user has a language selected in the creation form
- **AND** pre-built stopwords exist for that language
- **THEN** a "Load common words" button appears next to the word input
- **WHEN** the user clicks "Load common words"
- **THEN** the word list is populated with common stopwords for that language
- **AND** the user can add or remove words before saving

#### Scenario: Friendly empty state
- **WHEN** no word lists exist
- **THEN** instead of a warning triangle, the table area shows:
  - Headline: "No ignored words yet"
  - Description: "Most stores benefit from ignoring common words like 'the' and 'and' to improve search relevance."
  - Action buttons: "Add common English words" and "Create your own list"
- **WHEN** the user clicks "Add common English words"
- **THEN** the creation form opens with English selected and common English stopwords pre-populated
- **WHEN** the user clicks "Create your own list"
- **THEN** the creation form opens empty

#### Scenario: Languages with pre-built lists
- **WHEN** the user selects English, Spanish, French, German, or Portuguese
- **THEN** the "Load common words" button is available
- **WHEN** the user selects a language without a pre-built list (e.g., "Other...")
- **THEN** no "Load common words" button appears

## Functional Requirements

### Navigation
- **FR-001**: Sidebar MUST consolidate into 5 top-level sections: Search, Catalog, Search & Discovery, Analytics, Settings.
- **FR-002**: "Catalog" section MUST contain: Products (route: `/merchandising/products`), Vendors (route: `/merchandising/vendors`). Icon: `sym_s_category`.
- **FR-003**: "Search & Discovery" section MUST contain: Search Rules (route: `/curations/overrides`), Synonyms (collection-scoped), Ignored Words (route: `/stopwords`), Ranking Formula (route: `/relevance/ranking`), Search Weights (route: `/relevance/weights`). Icon: `sym_s_manage_search`.
- **FR-004**: "Settings" section MUST contain: Server Status (route: `/`), Cluster Status, Collections, Aliases, API Keys, Search Presets, Stemming, Schema, Add Document. Icon: `sym_s_settings`.
- **FR-005**: The `getGroupForRoute()` function MUST be updated to map routes to the new section keys: `catalog`, `discovery`, `settings` (replacing `merchandising`, `relevance`, `curations`, `server`, `configuration`).
- **FR-006**: All route paths MUST remain unchanged.

### Search Rules Layout
- **FR-010**: The Search Rules page MUST show the rules list first, with the creation form collapsed by default.
- **FR-011**: A "+ Create New Rule" button MUST appear at the top of the page.
- **FR-012**: The "Edit JSON" button MUST be removed from the page header and placed inside an Advanced expansion within the form.
- **FR-013**: Each rule in the list MUST be displayed as a summary card with: name, query, match type, pinned product names, status badge, tags, and Edit/Duplicate/Delete actions.
- **FR-014**: Clicking "Duplicate" MUST copy the rule data into the form with name prefixed `copy-of-` and empty Override ID.
- **FR-015**: The existing rules table (dense columns) MUST be replaced with the card-based layout.

### Synonyms
- **FR-020**: The synonyms table MUST use a single "Relationship" column replacing "Type", "Trigger word", and "Synonyms" columns.
- **FR-021**: Two-way synonyms MUST display as `word1 ↔ word2 ↔ word3`.
- **FR-022**: One-way synonyms MUST display as `trigger → synonym1, synonym2`.
- **FR-023**: An inline preview MUST appear in the creation form when synonyms are entered.
- **FR-024**: Two-way preview text: "Searching for any of **word1**, **word2**, ... will show results for all of them."
- **FR-025**: One-way preview text: "When a customer searches for **trigger**, they'll also see results for **synonym1** and **synonym2**."

### Ignored Words
- **FR-030**: Pre-built stopword lists MUST exist for: English, Spanish, French, German, Portuguese.
- **FR-031**: A "Load common words" button MUST appear when the selected language has a pre-built list.
- **FR-032**: Clicking "Load common words" MUST populate the word input but NOT auto-save.
- **FR-033**: The empty state MUST show a friendly message with "Add common English words" and "Create your own list" action buttons.
- **FR-034**: "Add common English words" MUST open the form with English selected and pre-populated.
- **FR-035**: The "Add Set" button label MUST be changed to "Add Word List" to match the section heading.

## Edge Cases

1. **Synonym preview with single word**: If only one word is entered, do not show a preview sentence (need at least 2 words for a synonym relationship to exist).
2. **Duplicate rule name collision**: When duplicating, if `copy-of-[name]` already exists, append a numeric suffix: `copy-of-[name]-2`.
3. **Search Rules with no collection**: If no collection is selected, the rules list should still show but with a banner prompting collection selection (existing behavior, preserved).
4. **Stopwords for unsupported language**: If "Other..." is selected, no "Load common words" button appears. The form works the same as today.
5. **Empty rules list**: If no rules exist, show a friendly empty state: "No search rules yet. Create a rule to control what products appear for specific searches."

## Acceptance Criteria

- **AC-01**: Sidebar shows exactly 5 top-level sections (Search, Catalog, Search & Discovery, Analytics, Settings) with correct children.
- **AC-02**: All route paths work unchanged; navigation to any page still works.
- **AC-03**: Search Rules page loads with rules list visible first; creation form is collapsed.
- **AC-04**: Edit JSON is no longer in the page header; it is inside the form's Advanced section.
- **AC-05**: Rule cards show name, query, pinned product names, status, tags, and Edit/Duplicate/Delete.
- **AC-06**: Synonyms table shows `↔` for two-way and `→` for one-way relationships in a single column.
- **AC-07**: Inline preview text appears when creating/editing synonyms.
- **AC-08**: "Load common words" button works for English, Spanish, French, German, Portuguese.
- **AC-09**: Ignored Words empty state shows friendly message with action buttons.
- **AC-10**: "Add Set" button reads "Add Word List".
