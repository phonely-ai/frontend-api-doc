# Phonely Docs Skill

Use this skill when answering questions or executing tasks that rely on `docs.phonely.ai`.

## Scope
- This documentation set covers Phonely's public product UI and the frontend/API-key-authenticated API surface.
- Visible pages are written for humans first and should remain easy to read.
- Hidden `/ai/` pages exist to make execution steps more deterministic for agents.

## Always
- Use exact UI labels from the app when possible: `Build`, `Help`, `Test`, `Agent Design`, `Knowledge Base`, `Settings`, `Performance`, `Call History`, `Call Events`, `Outbound Calls`.
- Use exact route and tab values when they are known.
- Prefer one canonical page per concept.
- Prefer visible canonical pages for user-facing explanations.

## Never
- Do not invent undocumented routes, tabs, or auth schemes.
- Do not treat hidden AI runbooks as private or secret. They must remain public-safe.

## Route map
- `/agent/{agentId}`: agent workspace
- `/agent/{agentId}?tab=knowledge-base`: knowledge base tab
- `/agent/{agentId}?tab=workflows`: workflows tab
- `/agent/{agentId}?tab=settings`: agent settings tab
- `/performance/{agentId}`: analytics and data tables
- `/call-history/{agentId}`: call list and transcripts
- `/agent-review/{orgId}`: issue review workspace for a specific organization
- `/event/{agentId}`: call events
- `/campaign/{agentId}`: outbound campaigns
- `/testing/ab-test`: current testing surface
- `/testing/evaluation`: legacy route kept in code, not part of current product flows
- `/settings?tab=profile|plan-and-billing|notifications|agents|numbers`: workspace settings

## Retrieval order
1. Read the matching visible product page.
2. Read the most specific AI runbook under `/ai/` when the task needs deterministic execution details.
3. Read the matching API reference or webhook reference page if the task involves requests or payloads.
