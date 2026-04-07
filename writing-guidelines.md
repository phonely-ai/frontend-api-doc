# Phonely Documentation Writing Guidelines

These guidelines apply to all pages at `docs.phonely.ai`. Read `skill.md` first for audience and tone.

## Page Structure

Every indexed page needs frontmatter:

```mdx
---
title: "Page Title"
description: "One sentence: what the customer can do or learn here."
---
```

### Ordering Within a Page

1. **Value statement** (1-2 sentences): what this feature does for the customer and why they'd use it.
2. **GIF or screenshot**: show the feature in action. Required for any feature with visual interaction.
3. **How to use it**: numbered steps when order matters, bullets when it doesn't.
4. **What you can do with it**: practical examples framed as customer goals (e.g., "Find out why calls are dropping off at the greeting step").
5. **Reference details**: tables for options, settings, filters. Put these last.

### What Good Looks Like

```mdx
---
title: "Analyze with AI"
description: "Use AI to understand what's happening in your calls and spot trends across conversations."
---

When you're reviewing calls, you can select any group of calls and ask AI to
help you understand what's happening -- why callers are reaching out, where
conversations go well, and where they don't.

![Analyzing calls with AI](/assets/analyze-with-ai.gif)

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

- **GIFs**: required for features with multi-step interaction. Capture the happy path.
- **Screenshots**: use for static UI states (settings pages, result screens).
- Place visuals immediately after the value statement, before the steps.
- Store assets in `/assets/` with descriptive kebab-case names.

## Sections and Formatting

- Keep sections short and scannable.
- One concept per section.
- Use exact UI labels and route names.
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
