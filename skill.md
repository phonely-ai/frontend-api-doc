# Phonely Docs - Contributing Guide

For full writing guidelines, see `writing-guidelines.md`.

## Audience

Phonely customers: business owners, ops managers, and support leads. Write for the customer, not the codebase.

## Quick Rules

- Lead with customer value, then show how to use the feature.
- Use exact UI labels: `Build`, `Help`, `Test`, `Agent Design`, `Knowledge Base`, `Settings`, `Performance`, `Call History`, `Call Events`, `Outbound Calls`.
- One canonical page per concept.
- Every page needs `title` and `description` frontmatter.
- Use `{/* TODO: description */}` for visuals you can't create yet.
- Do not invent undocumented routes or auth schemes.

## Route Map

Use `ai/route-map.mdx` as the single source of truth for frontend routes, query tabs, and task-to-route rules. Do not duplicate route tables here; update `ai/route-map.mdx` when the frontend router changes.
