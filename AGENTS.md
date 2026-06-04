# Sentinel Agent Notes

## Project Shape
- TypeScript ElizaOS agent plugin in `src/` with actions, providers, evaluators, and cache utilities.
- Custom Sentinel terminal UI lives in `frontend/` and is copied into the ElizaOS client by the Docker build.
- Nosana deployment assets live in `nos_job_def/` and `scripts/`.

## Common Commands
- Install dependencies: `bun install`
- Run tests: `bun run test`
- Run agent locally: `bun run dev`
- Run custom frontend: `bun run frontend`
- Build Docker image: `docker build -t sentinel-agent:latest .`

## Conventions
- Keep repository, image, and deployment names aligned with `sentinel-nosana-agent`.
- Keep public claims evidence-backed: free/open data sources, graceful degradation, and tested agent flows are the core proof.
- Do not commit secrets; `.env.example` may contain public challenge endpoints but no private API keys.
- Keep action failure metadata generic; user-facing text can explain degradation, but returned `error` fields must not include raw provider or model exception text.
- Treat RSS/news feed fields as untrusted provider text: strip tags/entities, cap lengths, and reject non-http links before adding them to prompts.
