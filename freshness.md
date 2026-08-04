# Documentation freshness contract

The freshness ledger connects documentation pages to product sources and records which product release windows have been reviewed. It is a detection and accountability contract, not an automatic documentation writer.

Freshness has two separate guarantees:

- **Source integrity:** every declared source mapping resolves to a tracked file in an allowed product repository.
- **Content review:** a page's product facts and presentation were reviewed together on its `last-verified` date.

Resolving a source mapping does not prove that the page is current. A page is content-reviewed only when its full factual and editorial review is complete.

## Sources of truth

- Page frontmatter owns each page's `sources` and `last-verified` metadata.
- `freshness.config.json` owns repository prefixes, the inspected commit cursor, reviewed release windows, and known documentation work from those windows.
- `scripts/freshness-ledger.mjs` validates those inputs and can generate a machine-readable ledger on demand.

An unprefixed source belongs to `phonely-frontend`. Sources in another product repository must use the repository prefix declared in `freshness.config.json`, such as `phonely-backend/`.

Source mappings are evidence pointers, not content to publish. Keep them limited to repository-relative code paths that are safe to expose. Never put credentials, environment values, private endpoints, customer data, call logs, or other sensitive implementation details in page metadata or review-window notes.

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
8. Record every disposition before advancing the repository cursor. Unclassified signals block advancement; classified `needs-doc-update` signals remain visible after the cursor advances. Record a later `docs-updated` disposition for the page when that work is complete; other dispositions do not clear the pending work.

`accountedThrough` is a scan cursor, not a claim that every documentation page is current. It means every product change through that exact commit was inspected and given a disposition. The generated ledger reports pages named by `needs-doc-update` separately from pages awaiting their first content review.

Set `last-verified` only after both the factual and editorial review of the whole page are complete. A correct local patch is not enough if it makes the page or surrounding section inconsistent.

## Ask AI boundary

Documentation owns stable product facts, terminology, supported behavior, limitations, and user guidance. Ask AI prompts own its role, tone, safety rules, retrieval policy, and tool-selection behavior. Tools and application code own live state, call diagnostics, mutations, and internal operations.

Moving product facts into documentation reduces duplicated prompt knowledge, but do not move operational instructions or sensitive implementation details there. Ask AI should retrieve the smallest relevant documentation context and use tools for current agent, flow, or call state.

## Operating boundary

Automation may compare commits after a repository's `accountedThrough` SHA, combine the exact diff with changelog evidence, match changed files to page sources, and open or update one review task with concise evidence. Source matches and unmatched changes are candidates, not proof that prose is wrong. Content changes require human review; skipped signals require a recorded disposition. Existing `needs-doc-update` items stay in the task until their pages are reviewed even though later scans begin from the newer cursor.

Repository access must be read-only and scoped to approved repositories and paths. Evidence stored in tasks or the ledger should be limited to commits, file paths, and safe summaries. The pipeline must not read secret stores or customer data, generate speculative documentation prose, modify product repositories, or open recurring content PRs without review.
