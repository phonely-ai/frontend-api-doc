# Phonely Docs Agent Contract

This file is the operating contract for AI agents that update the Phonely docs. It is behavior, not product knowledge.

The placement policy is: prompts are for behavior, indexed docs are for stable product knowledge, and tools are for live state. Do not put product facts here. When a product fact is needed, read the relevant indexed page, product source, API schema, or live tool result.

## Required References

- Use `writing-guidelines.md` for page structure, tone, visual placement, and formatting rules. Do not copy those rules here.
- Use the page's own `sources` frontmatter as the first search boundary for code verification. Expand only when the changelog or code references require it.

## Audience And Voice

- Write for Phonely customers: business owners, operations managers, support leads, and team members using the product.
- Explain what the customer can accomplish before naming implementation details.
- Use exact UI labels, route names, endpoint names, settings names, and option names only after verifying them against code, an API schema, a live tool result, or a canonical docs page with fresh source coverage.
- Do not describe internal component names, data structures, feature flags, or service boundaries unless the page is explicitly for developers and the claim is code-cited.
- Use `flow` and `flows` as the customer-facing product terms. Capitalize **Call Flows** only when referring to the exact UI label or a title. Keep `workflow` only in code identifiers, source paths, legacy URLs, or API fields where changing it would make the technical reference inaccurate.

## Claim Traceability

Every concrete claim in a touched page must be traceable to a source.

Concrete claims include:

- numbers, limits, caps, counts, pricing, timing, statuses, and role permissions
- UI labels, tab labels, button labels, menu names, and option lists
- routes, query params, redirects, endpoint paths, headers, request fields, and response fields
- feature availability, plan availability, admin-only behavior, legacy/current status, and default behavior
- media references and visible UI states shown by screenshots, GIFs, or videos

Rules:

- Cite every concrete product claim to a code location, API schema, or live tool result. A canonical docs page can be used only when it already has fresh source coverage for that claim.
- Prefer code over stale docs when they disagree.
- Omit unverifiable claims. Never soften an uncited claim with "typically", "usually", "may", or "should".
- Do not infer precise values from screenshots, filenames, branch names, comments, or memory.
- If a page includes tables of options, every row must be covered by the page `sources` or by an inline citation in the table.
- If code and product copy differ, use the visible product label from code and cite the file.

Canonical example: the old route map claimed the side-panel labels were `Assistant` and `Test`; code showed `Operator` and `Test Call` in `features/chat/side-panel/ui/app-side-panel.tsx`. The plausible uncited claim was wrong, so it had to be corrected or removed.

## Source And Frontmatter Obligations

When touching an indexed MDX page, refresh its frontmatter before editing body content.

Required frontmatter:

```mdx
---
title: "Customer-facing page title"
description: "One sentence describing what the customer can do or learn."
sources:
  - "path/or/glob/in/source/repo"
last-verified: "YYYY-MM-DD"
---
```

Rules:

- `sources` must name the real files or tight globs used to verify the page.
- For sources outside the frontend repository, use a repository-prefixed path such as `phonely-backend/app/agent/routes.py` so the verification boundary remains unambiguous.
- `last-verified` must be the date the agent verified the touched page against those sources.
- Do not add broad globs such as `app/**` or `features/**` unless the page truly depends on that whole area.
- Do not add an MDX product page until it has completed the same factual and editorial review required for visible navigation.
- If a page is legacy, duplicate, or intentionally excluded from indexing, keep that status explicit with the repo's existing `noindex` or `.mintignore` pattern.

## Media Contract

Text is the record. Media illustrates; it must never be required to understand the page.

Rules:

- Never create, rename, or reference a media file that does not exist.
- Before keeping a media reference, verify the file path exists in the docs repo.
- If a needed screenshot, GIF, video, or audio clip is missing, leave a TODO comment instead of inventing a path.
- TODO comments must include a capture spec: surface or route, user state, action sequence, expected end state, and suggested asset type.
- Do not make numeric or behavioral claims from media alone. Verify those claims in code or omit them.
- Prefer replacing stale GIF-dependent instructions with text steps and code-verified claims; media must illustrate a task rather than carry instructions the text omits.
- During a Phase 2 rebuild, audit media together with content and structure. For each touched page, explicitly keep, replace, remove, or decline media based on the job it performs for the reader.
- Capture or replace high-value media during Phase 2 when it materially affects comprehension or page design. Phase 4 owns automation and long-term freshness, not the first media decision.
- A page with unresolved high-value capture specs remains in progress even when its text and build checks pass.

TODO format:

```mdx
{/* TODO: Capture <asset type> for <route/surface>; state: <required data/account>; steps: <actions>; end state: <visible result>. */}
```

## Text-As-Record Rules

- A page must fully answer the customer question in text without relying on screenshots, GIFs, videos, or assistant-only context.
- Put prerequisites before steps.
- Follow `writing-guidelines.md` for section order and formatting mechanics.
- If a table repeats another canonical page, replace it with a link to that page.
- Keep API examples and endpoint details on API reference pages unless the product page needs a short, cited pointer.

## Scope Discipline

- Let the ticket or named product area define the work boundary. Do not treat a changelog entry as a complete inventory of affected documentation.
- Within that boundary, discover the affected canonical pages from existing docs, current routes and UI, source code, release history, broken link or media checks, and the customer questions the pages must answer.
- Treat changelogs and tickets as discovery signals. Verify their claims and fill their omissions from current code and product behavior before editing.
- Edit only pages supported by that discovery or by a reviewer request; record adjacent gaps separately instead of allowing the ticket to expand without limit.
- Propose new pages when a concept has no home; do not silently create new user-facing pages.
- Preserve one canonical page per concept. Merge, redirect, or point rather than duplicating.
- Keep incomplete or unstable drafts outside the documentation repository until they pass a complete source-backed review.
- Do not move product facts into `.mintlify/Assistant.md`, system prompts, or this file. Those surfaces may require documentation retrieval, but must not duplicate facts.

## Change Depth

- Preserve the information architecture, voice, and useful conceptual material of foundational pages that do not closely mirror the application UI. Correct inaccurate claims and improve genuine comprehension gaps without rewriting for uniformity.
- For platform-dependent task pages, update steps, labels, routes, options, and structure as much as current product behavior requires.
- Do not restructure a page merely because its screenshot or video is stale. Preserve useful text, decide what visual the page actually needs, and replace high-value media during Phase 2 when possible.
- When a larger rewrite is warranted, be able to name the user problem or factual mismatch it solves. Style preference alone is not sufficient.

## PR Self-Check

Before finalizing a docs PR, verify:

- Every touched page has refreshed `sources` and `last-verified` frontmatter when applicable.
- Every concrete claim is cited, source-covered, or removed.
- Every route, tab, and UI-label claim is verified against current product source.
- Every media reference exists, or a TODO with a capture spec replaces it.
- The page remains useful as text-only documentation.
- The change does not add a new canonical concept page without explicit reviewer agreement.
- The docs build, link check, indexing contract check, and orphan-media check pass.
