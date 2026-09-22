# RegWatch HK

GitHub Pages demo for monitoring official Hong Kong regulatory updates.

## Automation

The GitHub Action runs every six hours and can also be started manually from the Actions tab. It checks HKEX Regulatory Announcements and HKMA Press Releases, updates `dist/data/latest-run.json`, and deploys `dist` to GitHub Pages.

If the repository secret `OPENAI_API_KEY` is available, new releases receive evidence-constrained AI triage. Without that secret, the collector still runs and uses a conservative deterministic classification with human review required.

## Demo access

The login is a client-side demonstration only. Static GitHub Pages cannot securely protect a fixed password because the browser receives the application code. Use a server-side identity provider for production access control.
