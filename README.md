# RegWatch HK

GitHub Pages demo for monitoring official Hong Kong regulatory updates.

## Automation

The GitHub Action runs every six hours and can also be started manually from the Actions tab. It checks HKMA Press Releases plus HKEX Regulatory Announcements, Corporate News, Market Communications, Market Consultations, Participant and Members Circulars, Market Data Client Notices, and Hosting Subscriber Notices. It updates `dist/data/latest-run.json` and deploys `dist` to GitHub Pages.

If the repository secret `OPENAI_API_KEY` is available, new releases receive evidence-constrained AI triage. Without that secret, the collector still runs and uses a conservative deterministic classification with human review required.
