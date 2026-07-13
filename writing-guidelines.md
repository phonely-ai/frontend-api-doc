# Phonely Documentation Writing Guidelines

These guidelines apply to all pages at `docs.phonely.ai`. Read `skill.md` first for audience and tone.

## Page Structure

Choose the depth of change before rewriting. Foundational pages should normally retain their established narrative and organization; platform-dependent task pages may need deeper revision to match the current product. A stale image alone is media debt, not evidence that the surrounding structure is wrong.

Every indexed page needs frontmatter:

```mdx
---
title: "Page Title"
description: "One sentence: what the customer can do or learn here."
sources:
  - "tight/path/or/glob/in-the-source-repo/**"
last-verified: "YYYY-MM-DD"
---
```

Use `skill.md` for the full source and claim-traceability contract. Refresh `last-verified` only after checking the page against its listed sources.

### Ordering Within a Page

1. **Value statement** (1-2 sentences): what this feature does for the customer and why they'd use it.
2. **How to use it**: numbered steps when order matters, bullets when it doesn't.
3. **Expected result**: tell the reader what changes or what they should see.
4. **What you can do with it**: practical examples framed as customer goals (e.g., "Find out why calls are dropping off at the greeting step").
5. **Reference details and troubleshooting**: put options, settings, filters, and common recovery steps after the main task.
6. **Media decision**: decide whether a current screenshot, GIF, video, or no media best supports the page. Media is optional, but the decision is not.

### What Good Looks Like

```mdx
---
title: "Analyze with AI"
description: "Use AI to understand what's happening in your calls and spot trends across conversations."
sources:
  - "features/call-history/**"
  - "features/chat/assistant/**"
last-verified: "YYYY-MM-DD"
---

When you're reviewing calls, you can select any group of calls and ask AI to
help you understand what's happening -- why callers are reaching out, where
conversations go well, and where they don't.

{/* TODO: Capture a screenshot for /call-history/{agentId}; state: at least two completed calls are available; steps: select the calls and choose Analyze with AI; end state: Ask AI opens with the selected calls attached. */}

## How to Use It

1. Open **Call History** from the left navigation.
2. Select one or more calls using the checkboxes.
3. Click **Analyze with AI** in the action bar.
4. Ask a question about the selected calls.

## What You Can Ask

- "Why are callers hanging up during the greeting?"
- "Which of these calls resulted in a booked appointment?"
- "What are the most common questions callers are asking?"
- "Are there any calls where the agent gave incorrect information?"
```

### What Bad Looks Like

- "Selected calls are sent to the AI assistant as a visual attachment showing call type, phone number, sentiment, and duration." (implementation detail, not customer value)
- "Summarize common themes across the selected calls." (generic, doesn't help the customer imagine a real use case)
- Leading with a feature table before explaining what the feature does.
- Describing internal data structures or component names.

## Visuals

- Text is the record. A reader must be able to complete the task without viewing an image, GIF, or video.
- Design content and media together during the documentation rebuild. Do not wait until the end of a page to decide what a visual should teach.
- Use screenshots for static UI states and short videos or GIFs only when motion adds useful context.
- Place media next to the text it illustrates; do not force it ahead of the instructions.
- Never infer a product fact from media alone.
- Do not reuse a generic product image on several pages unless it has a distinct, necessary purpose on each page.
- If a high-value visual shapes comprehension or page structure, capture or replace it during Phase 2. If capture is blocked, leave a capture-spec TODO and keep the page in progress.
- Phase 4 automates capture, freshness checks, replacement, and asset lifecycle; it does not make the initial page-level media decisions.
- If current media is unavailable, leave a capture-spec TODO as defined in `skill.md`; do not invent an asset path.
- Store new assets in `/assets/` with descriptive kebab-case names.

## Sections and Formatting

- Keep sections short and scannable.
- One concept per section.
- Use exact UI labels and route names.
- Use `flow` and `flows` in customer-facing prose. Capitalize **Call Flows** only as an exact UI label or title; reserve `workflow` for technical identifiers, source paths, legacy URLs, and API fields.
- Use tables for options, filters, and comparisons.
- Never use vague phrases like "click here."
- Mark legacy pages with `noindex: true` or add to `.mintignore`.

## API and Webhook Pages

- Show auth mechanism and required headers.
- Show request and response shapes.
- List common error responses.

## Hidden AI Pages

- Place deterministic agent runbooks under `/ai/`.
- Use literal, step-by-step language.
- Keep them public-safe.
