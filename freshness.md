# Documentation freshness contract

The freshness ledger connects documentation pages to product sources and records which product release windows have been reviewed. It is a detection and accountability contract, not an automatic documentation writer.

Freshness has two separate guarantees:

- **Source integrity:** every declared source mapping resolves to a tracked file in an allowed product repository.
- **Content review:** a page's product facts and presentation were reviewed together on its `last-verified` date.

Visible navigation is the documentation trust boundary. Every MDX product page must complete source-backed content review before it is added to the repository and visible navigation. Published pages are eligible for documentation search and Ask AI retrieval; uncertain drafts should remain outside the documentation repository until they are ready.

Resolving a source mapping does not prove that the page is current. A page is content-reviewed only when its full factual and editorial review is complete.

## Sources of truth

- Page frontmatter owns each page's `sources` and `last-verified` metadata.
- `freshness.config.json` owns repository prefixes, the inspected commit cursor, reviewed release windows, and known documentation work from those windows.
- `scripts/freshness-ledger.mjs` validates those inputs and can generate a machine-readable ledger on demand.

An unprefixed source belongs to `phonely-frontend`. Sources in another product repository must use the repository prefix declared in `freshness.config.json`, such as `phonely-backend/`.

Source mappings are evidence pointers, not content to publish. Keep them limited to repository-relative code paths that are safe to expose. Never put credentials, environment values, private endpoints, customer data, call logs, or other sensitive implementation details in page metadata or review-window notes.

Every repository declared in `freshness.config.json` must also be provisioned as a read-only Git cache for the scheduled scanner. Add that automation support before merging documentation that introduces a new repository. The configured `rootEnv` identifies an override path; GitHub repository history remains authoritative, and the cache working tree is never the source of truth. When `accountedThrough` is set, source mappings resolve against that exact commit so the documentation can describe the deployed product snapshot instead of a newer default branch.

## Commands

Generate the ignored `freshness-ledger.json` file for local inspection or automation:

```bash
node scripts/freshness-ledger.mjs --write
```

Validate the freshness contract without writing a file:

```bash
node scripts/freshness-ledger.mjs
```

Resolve every source mapping against local product repositories:

```bash
export PHONELY_FRONTEND_ROOT=/path/to/phonely
export PHONELY_BACKEND_ROOT=/path/to/phonely-backend
export PHONELY_VOICE_INFRA_ROOT=/path/to/voice-infra
export PHONELY_DB_SVC_ROOT=/path/to/phonely-db-svc
node scripts/freshness-ledger.mjs --resolve-sources
```

On Windows PowerShell:

```powershell
$env:PHONELY_FRONTEND_ROOT = "C:\path\to\phonely"
$env:PHONELY_BACKEND_ROOT = "C:\path\to\phonely-backend"
$env:PHONELY_VOICE_INFRA_ROOT = "C:\path\to\voice-infra"
$env:PHONELY_DB_SVC_ROOT = "C:\path\to\phonely-db-svc"
node scripts/freshness-ledger.mjs --resolve-sources
```

This command is read-only. It checks tracked paths with `git ls-files`; it does not inspect secrets, runtime data, or production systems.

## Review a product change

For each release window:

1. Compare exact commits after the repository's `accountedThrough` SHA.
2. Enumerate the complete commit diff and relevant changelog entries, then match changed files to page sources and collect other approved repository evidence.
3. Keep unmatched changed files, new public routes, and new user-facing capabilities as review signals. A change without an existing page mapping must not be silently ignored.
4. Classify each signal as `docs-updated`, `already-covered`, `no-doc-change`, `needs-doc-update`, or `not-public`. Use `needs-doc-update` only after the affected public pages and the follow-up work are known.
5. Verify behavior against the necessary repositories. Backend, voice, and data-service code may confirm the public contract, but internal mechanics must not be copied into user-facing prose unless users need them to use the product safely and correctly.
6. Review the entire affected page for accuracy, terminology, order, duplication, links, examples, and visual shape, not only the changed sentence.
7. Review neighboring pages when the change affects a shared concept or user journey. At the end of a product area, review the section as a whole.
8. Record every disposition before advancing the repository cursor. Unclassified signals block advancement; classified `needs-doc-update` signals remain visible after the cursor advances. Record an explicit resolution of the pending behavior ID when that work is complete; an unrelated update to the same page does not clear pending work.

Classify the user-visible contract rather than the commit title, code location, or implementation size. A change is documentation-worthy when it adds, changes, or removes a stable user task or entry point; a visible input, output, default, state, limit, availability rule, or term; or guidance users need for safe use, recovery, support, or troubleshooting. Internal refactors, tests, diagnostics, storage, analytics, triage, and cosmetic changes do not require documentation unless they alter that public contract. For a mixed change, document the public consequence without exposing its internal implementation.

Use dispositions consistently: `docs-updated` means the affected pages were changed and fully reviewed; `already-covered` means the existing pages already describe the reviewed behavior accurately; `no-doc-change` means the reviewed signal has no customer-facing documentation consequence; `needs-doc-update` records a known page gap that remains open; and `not-public` is reserved for internal-only changes with no public page mapping.

`accountedThrough` is a scan cursor, not a claim that every documentation page is current. It means every product change through that exact commit was inspected and given a disposition. The generated ledger reports pages named by `needs-doc-update` separately from pages awaiting their first content review.

Set `last-verified` only after both the factual and editorial review of the whole page are complete. A correct local patch is not enough if it makes the page or surrounding section inconsistent.

## Ask AI boundary

Indexed documentation owns stable product facts, terminology, supported behavior, limitations, and user guidance. Ask AI prompts own its role, tone, safety rules, retrieval policy, and tool-selection behavior. Tools and application code own live state, call diagnostics, mutations, executable schemas, and internal operations.

Moving product facts into documentation reduces duplicated prompt knowledge, but do not move operational instructions or sensitive implementation details there. Ask AI should retrieve the smallest relevant documentation context and use tools for current agent, flow, or call state.

## Operating boundary

Automation may compare commits after a repository's `accountedThrough` SHA, combine the exact diff with changelog evidence, match changed files to page sources, and open or update one review task with concise evidence. Source matches and unmatched changes are candidates, not proof that prose is wrong. Content changes require human review; skipped signals require a recorded disposition. Existing `needs-doc-update` items stay in the task until their pages are reviewed even though later scans begin from the newer cursor.

Repository access must be read-only and scoped to approved repositories and paths. Evidence stored in tasks or the ledger should be limited to commits, file paths, and safe summaries. The pipeline must not read secret stores or customer data, generate speculative documentation prose, modify product repositories, or open recurring content PRs without review.

## Precise pending work and periodic review

Each `needs-doc-update` item is identified by `<window.id>/<disposition.id>`. A later `docs-updated` disposition closes only IDs listed in its `resolves` array, and must cover every page of each resolved item. Unknown, duplicate, or already-resolved IDs fail validation.

A repair without new product commits appends a top-level `resolutions` record: `{id, issue, reviewedOn, pages, note, resolves: [pendingId]}`. Existing resolution records are immutable. The pipeline review must contain the same appended records and audit the affected pages. Product cursors and historical review windows remain unchanged during this repair. `node scripts/freshness-pending.mjs` prints the remaining behavior items.

The scanner selects up to three pages whose whole-page review is at least 90 days old. An optional `reviewPolicy` config can specify `maxAgeDays`, `batchSize` (1¨C20), and `priorityPages`. This adds review candidates; it does not create a schedule. Review and renew those pages even without new source commits. A review date is only recorded after completing source and editorial checks.

## Affected-page and question checks

`node scripts/docs-impact.mjs <base-sha>` includes directly changed pages, consumers of changed shared content/media, API wrappers affected by OpenAPI changes, and pages affected by navigation changes. OpenAPI and navigation expansion is deliberately conservative. It follows literal paths and extensionless imports; dynamic imports and undocumented aliases require the writer's explicit impact review. Removed published pages require manual handling rather than being silently excluded.

`node scripts/check-docs-questions.mjs` validates the seed question set and expected headings only. It does not evaluate retrieval or product truth. Use `--request` to export the questions with a digest of their current source pages. Run the questions through the actual approved retrieval/assistant surface, preserving retrieved page/heading pairs and answers. A separate reviewer grades each required fact and prohibited misconception with reasons. Pass the result file to the same script to report retrieval and answer correctness separately. Changes to questions or source pages invalidate old evaluation results.

Result format: `{digest, runId, reviewerSession, cases: [{id, answer, retrievedSections: [{page, heading}], usedLiveTool, facts: [{index, pass, reason}], misconceptions: [{index, pass, reason}]}]}`. Indices follow the case arrays; `pass` for a misconception means the incorrect claim was avoided. Live-state cases require actual authorized tool use, not a promise to look it up. Reviewer identity and tool-use fields are attestations; the operator must preserve the real execution evidence. Store artifacts in restricted pipeline state, not public docs.

Before first rollout, establish source-reviewed expected answers and a baseline using the deployed retrieval system. Compare missing facts, wrong conditions, citation quality and appropriate live-tool use. Keep these runtime results distinct from green build and corpus-contract checks.
