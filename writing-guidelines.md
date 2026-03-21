# Phonely Documentation Writing Guidelines

Write visible docs for humans first, while keeping them easy for AI systems to retrieve and follow.

## Public Pages

- Write in clear product language.
- Keep sections short and scannable.
- Use one main task or one main concept per section.
- Add frontmatter to every indexed page:

```mdx
---
title: "Page Title"
description: "One-sentence summary of the exact task or concept."
---
```

- Use exact UI labels, route names, and tab names when they help the reader complete a task.
- Prefer a short overview before the procedure when context helps.
- Use numbered steps when order matters.
- Use tables for tabs, options, and comparisons.

## Hidden AI Pages

- Put strict task runbooks under `/ai/`.
- Use more literal, deterministic language there.
- Keep hidden AI pages public-safe. Hidden does not mean secret.

## Shared Rules

- Use one canonical page per concept.
- Mark legacy or duplicate pages with `noindex: true` or exclude them with `.mintignore`.
- Keep intros short. Do not pad pages with marketing copy.
- Prefer examples that use realistic values.
- Never refer to UI controls with vague phrases like "click here".

## API And Webhook Pages

- Always show the auth mechanism.
- Always show required headers.
- Show the request or payload shape.
- Show the success shape when applicable.
- List common error responses when applicable.

## Example Pattern

```mdx
---
title: "Settings Overview"
description: "Overview of the Settings workspace and what each tab is used for."
---

Settings is where you manage account and workspace-level configuration.

## Tabs

| Tab | Route | Use it for |
| --- | --- | --- |
| Profile | `/settings?tab=profile` | account details |

## Procedure

1. Open `/settings?tab=profile`.
2. Review or update the required field.
```
