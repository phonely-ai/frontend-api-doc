# Phonely Documentation

This directory contains the Mintlify docs for the Phonely frontend product and the API-key-authenticated frontend API surface.

## Local Preview

Prerequisites:

- Node.js 18 or newer

Install the Mintlify CLI:

```bash
npm i -g mint
```

Start the local preview from this directory:

```bash
mint dev
```

Optional custom port:

```bash
mint dev --port 3333
```

## Important Files

- `docs.json`: navigation, theme, indexing, contextual AI integrations
- `.mintlify/Assistant.md`: Mintlify assistant instructions
- `llms.txt`: compact LLM entrypoint
- `skill.md`: Phonely-specific agent rules
- `ai/*.mdx`: hidden indexed runbooks for agent retrieval

## Documentation Scope

This docs set covers:

- Phonely frontend routes and task flows
- public product behavior
- frontend and API-key-authenticated endpoints documented under `api-reference`

## Authoring Rules

- Prefer deterministic task docs over marketing copy.
- Keep one canonical page per concept.
- Add `title` and `description` to every indexed MDX page.
- Use `noindex: true` for legacy aliases or out-of-scope pages.
- Keep hidden AI runbooks public-safe. Hidden does not mean secret.
