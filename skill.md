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

| Route | Page |
| --- | --- |
| `/agent/{agentId}` | agent workspace |
| `/agent/{agentId}?tab=knowledge-base` | knowledge base |
| `/agent/{agentId}?tab=workflows` | workflows |
| `/agent/{agentId}?tab=settings` | agent settings |
| `/performance/{agentId}` | analytics and data tables |
| `/call-history/{agentId}` | call list and transcripts |
| `/agent-review/{orgId}` | issue review |
| `/event/{agentId}` | call events |
| `/campaign/{agentId}` | outbound campaigns |
| `/testing/ab-test` | testing |
| `/settings?tab=...` | workspace settings |
