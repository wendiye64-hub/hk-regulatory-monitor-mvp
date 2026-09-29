# RegWatch HK

Static demo for monitoring official Hong Kong regulatory updates. The primary deployment target is GitLab Pages; the existing GitHub Pages site can remain available during migration validation.

## Automation

The pipeline checks HKMA Press Releases, Circulars, Guidelines, Supervisory Policy Manual documents, Consultations, Guide to Authorization and Codes of Practice, plus HKEX Regulatory Announcements, Corporate News, Market Communications, Market Consultations, Participant and Members Circulars, Market Data Client Notices, and Hosting Subscriber Notices. It updates `dist/data/latest-run.json` inside the deployment artifact and publishes `dist` through Pages every six hours.

Collectors are registered in `scripts/source-registry.mjs`. Authority-specific parsers live under `scripts/lib/collectors/`; adding a source no longer requires changing the orchestration in `scripts/monitor.mjs`. Collection runs concurrently, the six HKMA regulatory categories share one repository request, new-item triage is concurrency-limited, and individual source failures are isolated in `source_runs`.

If the repository secret `OPENAI_API_KEY` is available, new releases receive evidence-constrained AI triage. Without that secret, the collector still runs and uses a conservative deterministic classification with human review required.

## GitLab configuration

The project runs without AI credentials by using conservative deterministic triage. For evidence-constrained AI triage, add masked CI/CD variables named `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` in GitLab.
