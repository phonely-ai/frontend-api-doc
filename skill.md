# Phonely Docs Skill

Use this skill when answering questions or executing tasks that rely on `docs.phonely.ai`.

## Scope
- This documentation set covers Phonely's public product UI and the frontend/API-key-authenticated API surface.

## Always
- Use exact UI labels from the app when possible: `Build`, `Help`, `Test`, `Agent Design`, `Knowledge Base`, `Settings`, `Performance`, `Call History`, `Call Events`, `Outbound Calls`.
- Use exact route and tab values when they are known.
- Prefer one canonical page per concept.
- Prefer step-by-step procedures over prose.

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
- `/event/{agentId}`: call events
- `/campaign/{agentId}`: outbound campaigns
- `/testing/ab-test`: A/B testing
- `/testing/evaluation`: evaluation testing
- `/settings?tab=profile|plan-and-billing|notifications|agents|numbers`: workspace settings

## Retrieval order
1. Read the most specific AI runbook under `/ai/`.
2. Read the matching visible product page.
3. Read the matching API reference page if the task involves requests.
4. Fall back to `/llms-full.txt` if the compact docs are insufficient.
