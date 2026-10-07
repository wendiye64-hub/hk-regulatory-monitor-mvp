# RegWatch HK

Vue 3 regulatory intelligence workspace backed by the existing Hong Kong official-source monitoring pipeline. The application provides News Feed, Regulator, and Tasks workspaces while remaining deployable as a static GitHub or GitLab Pages site.

## Local development

```bash
npm install
npm run dev
```

The frontend reads the checked-in crawler artifacts from `public/data/` by default. A separate API server is optional. Set `VITE_DATA_MODE=api` for an API-backed deployment, or `VITE_DATA_MODE=hybrid` to prefer the API and fall back to the bundled crawler artifacts.

To build and serve the production bundle:

```bash
npm run build
node server.mjs
```

## Automation

The pipeline checks HKMA Press Releases, Circulars, Guidelines, Supervisory Policy Manual documents, Consultations, Guide to Authorization and Codes of Practice, plus HKEX Regulatory Announcements, Corporate News, Market Communications, Market Consultations, Participant and Members Circulars, Market Data Client Notices, and Hosting Subscriber Notices. It updates `public/data/latest-run.json`, builds the Vue frontend, and publishes `dist` through Pages every six hours.

Collectors are registered in `scripts/source-registry.mjs`. Authority-specific parsers live under `scripts/lib/collectors/`; adding a source no longer requires changing the orchestration in `scripts/monitor.mjs`. Collection runs concurrently, the six HKMA regulatory categories share one repository request, new-item triage is concurrency-limited, and individual source failures are isolated in `source_runs`.

If the repository secret `OPENAI_API_KEY` is available, new releases receive evidence-constrained AI triage. Without that secret, the collector still runs and uses a conservative deterministic classification with human review required.

## GitLab configuration

The project runs without AI credentials by using conservative deterministic triage. For evidence-constrained AI triage, add masked CI/CD variables named `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` in GitLab.

## Data integration

- `public/data/latest-run.json` supplies live regulations and priority alerts.
- `public/data/hk-update-source-catalog.json` supplies the regulator directory.
- Latest `source_runs` telemetry is merged into the catalog so the 14 validated HKEX/HKMA collectors show their current health.
- `static` mode reads the bundled crawler artifacts and then the demo dataset.
- `api` mode reads the configured REST API and then the demo dataset.
- `hybrid` mode reads the REST API first, then the bundled crawler artifacts, then the demo dataset.
