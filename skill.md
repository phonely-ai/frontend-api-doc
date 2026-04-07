# Phonely Docs Skill

Use this skill when writing or updating pages at `docs.phonely.ai`.

## Audience

Phonely customers: business owners, ops managers, and support leads who use AI phone agents to handle calls. They care about what a feature does for them, not how it works internally. Write for someone who has never read the codebase.

## Voice and Tone

- Direct, clear, helpful. No marketing fluff, no filler paragraphs.
- Explain the benefit before the mechanics. Lead with "why this matters to you" then show "how to use it."
- Use second person ("you") and active voice.
- Keep sentences short. One idea per sentence.

## Customer-First Writing

When documenting a new feature:
1. Start with the problem it solves or the value it delivers for the customer.
2. Show how to use it with concrete steps.
3. Include a GIF or screenshot for any feature that involves visual interaction.
4. End with practical examples of what customers can do with it.

Do not:
- Lead with implementation details, data structures, or internal terminology.
- Describe what the system does technically (e.g., "sends data as a visual attachment"). Describe what the customer experiences (e.g., "shows you a summary of each call").
- Copy changelog language directly. Changelogs describe what changed for developers; docs describe what's possible for customers.

## UI Labels

Use exact labels from the app: `Build`, `Help`, `Test`, `Agent Design`, `Knowledge Base`, `Settings`, `Performance`, `Call History`, `Call Events`, `Outbound Calls`.

## Route Map

- `/agent/{agentId}`: agent workspace
- `/agent/{agentId}?tab=knowledge-base`: knowledge base tab
- `/agent/{agentId}?tab=workflows`: workflows tab
- `/agent/{agentId}?tab=settings`: agent settings tab
- `/performance/{agentId}`: analytics and data tables
- `/call-history/{agentId}`: call list and transcripts
- `/agent-review/{orgId}`: issue review workspace
- `/event/{agentId}`: call events
- `/campaign/{agentId}`: outbound campaigns
- `/testing/ab-test`: testing surface
- `/settings?tab=profile|plan-and-billing|notifications|agents|numbers`: workspace settings

## Page Types

- **Visible pages** (`/get-started/`, `/blocks/`, etc.): customer-facing, written for humans.
- **Hidden AI pages** (`/ai/`): deterministic runbooks for agents. Still public-safe.
- **API/Webhook pages**: show auth, headers, request/response shapes, error codes.

## Rules

- One canonical page per concept.
- Use exact route and tab values when known.
- Do not invent undocumented routes, tabs, or auth schemes.
- Prefer visible pages for customer-facing explanations.
