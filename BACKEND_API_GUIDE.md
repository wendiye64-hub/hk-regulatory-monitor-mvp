# Backend API Integration Guide

This document outlines the API contracts and architectural patterns for integrating a real backend server (e.g., Node.js / Go / Python) with the RegTech surveillance and regulatory intelligence frontend.

---

## 1. Overview & Connection Architecture

The frontend provides a **centralized API service module** at `src/services/api.ts` equipped with a **transparent fallback mechanism**:
- **With Backend**: Point `VITE_API_BASE_URL` to your backend endpoint (e.g. `https://api.yourcompany.com/v1`). The client executes HTTP REST calls against your server.
- **Without Backend / Failure**: If the backend is unreachable or returns a network error, the frontend gracefully falls back to the in-memory mock dataset, guaranteeing uninterrupted UI/UX during local development or staging demos.

---

## 2. Environment Configuration

Create or update `.env` in the root directory:

```env
# URL where your backend API is hosted
VITE_API_BASE_URL=https://api.yourdomain.com/v1

# Optional API timeout in milliseconds (defaults to 5000ms)
VITE_API_TIMEOUT_MS=5000
```

---

## 3. Core API Endpoints Specification

### 3.1. Health Check
* **`GET /health`**
* **Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-09-22T19:00:00Z"
}
```

---

### 3.2. Regulations (`/regulations`)
* **`GET /regulations`**
  * Query parameters:
    * `page` (number, default: 1)
    * `limit` (number, default: 20)
    * `search` (string, case-insensitive keyword search in title, referenceNumber, acronym)
    * `theme` (string, regulatory theme filter)
    * `category` (string, 14 statutory categories)
    * `jurisdiction` (string, country / territory)
    * `materiality` (Critical | High | Medium | Low)
    * `sortField` (publishDate | effectiveDate | aiRelevanceScore | materiality)
    * `sortOrder` (asc | desc)
  * **Response**:
  ```json
  {
    "items": [
      {
        "id": "reg-001",
        "title": "Supervisory Policy Manual SPM TM-E-1",
        "referenceNumber": "HKMA-SPM-TM-E-1",
        "docType": "Circular",
        "regulator": "Hong Kong Monetary Authority",
        "regulatorAcronym": "HKMA",
        "jurisdiction": "Hong Kong",
        "category": "Banking & Financial Stability",
        "themes": ["Operational resilience and incident reporting"],
        "publishDate": "2026-08-15",
        "effectiveDate": "2026-11-01",
        "aiRelevanceScore": 98,
        "materiality": "Critical",
        "diligenceStatus": "Not Imported",
        "owner": "Sarah Jenkins",
        "officialUrl": "https://www.hkma.gov.hk",
        "executiveSummary": "Mandates 24-hour initial notification for operational disruptions.",
        "operationalImpact": "Requires multi-cloud failover drills and incident reporting SLAs.",
        "affectedBusinessUnits": ["Trading Desk", "Risk Management", "Technology"],
        "authenticExcerpt": "Section 4.1: Authorized institutions must notify HKMA within 24 hours...",
        "auditTimeline": []
      }
    ],
    "total": 128,
    "page": 1,
    "limit": 20,
    "totalPages": 7
  }
  ```

* **`GET /regulations/:id`**
  * Returns detailed regulation item by ID.

* **`PATCH /regulations/:id/status`**
  * **Request Body**:
  ```json
  {
    "status": "In Progress",
    "performedBy": "Ivan Choy",
    "details": "Initiated compliance impact review across Trading Desks"
  }
  ```

* **`POST /regulations/:id/override`**
  * Logs expert human override on materiality or relevance.
  * **Request Body**:
  ```json
  {
    "field": "materiality",
    "newTier": "High",
    "justification": "Institutional trading desks operate within secondary threshold.",
    "user": "Sarah Jenkins"
  }
  ```

---

### 3.3. Priority Alerts & SLA Feed (`/alerts`)
* **`GET /alerts`**
  * Returns high-priority incoming publications requiring action within SLA.
* **`PATCH /alerts/:id/status`**
  * **Request Body**:
  ```json
  {
    "status": "acknowledged", // pending | acknowledged | dismissed | imported
    "actionDetails": "Accepted into enterprise monitoring scope"
  }
  ```

---

### 3.4. Supervisory Authorities Scope (`/scope`)
* **`GET /scope/regulators`**
  * Returns list of supervisory authorities with dynamic connection status, latency, cadence, and child sub-scopes.
  * **⚡ Essential Definition: Quality Status**:
    > `Quality Status` is **NOT** a static UI badge. It represents the data source's real-time connection health and ingestion telemetry (Connection Health / Connectivity Latency & Stability).
    > It is evaluated dynamically upon each scheduled crawl or ingestion cycle (`Healthy` < 4000ms latency & valid response, `Degraded` on high latency/retry, `Failed` on timeout or HTTP 4xx/5xx).
  * **🏢 Official Sector Groups (5 Core Sector Domains)**:
    1. `Corporate Governance & CoSec` (Corporate Law, Company Secretarial, Beneficial Ownership, Registry)
    2. `Financial Services & Capital Markets` (Banking, Securities & Futures, Capital Markets, Insurance, Pensions)
    3. `Compliance, Risk & Enforcement` (Risk Control, AML, Sanctions, Enforcement, Penalties, FIU)
    4. `Legal & Judicial` (Judiciary, Judgments, Legal Profession, Insolvency, Restructuring, Official Gazettes)
    5. `Commerce, Safety & Public Administration` (Competition, Antitrust, Data Privacy, Cyber, Labour, Maritime, Healthcare, ESG)
  * **📚 Official Source Categories (Source Classification Taxonomy)**:
    - **Statutory Frameworks & Repositories**: `legislation_rules_codes`, `guidelines_notices_consultations_repository`, `rules_guidelines_regulatory_repository`
    - **Licensing & Public Registries**: `licensing_register_filing`, `company_registry`, `business_registry_financial_reporting_regulator`
    - **Enforcement & Disciplinary Tribunals**: `enforcement_decisions_discipline`, `court_judgments_database`, `insolvency_bankruptcy_authority`
    - **Institutional & Regulatory Portals**: `official_institutional_website`, `banking_prudential_regulator`, `securities_regulator`, `data_protection_authority`
    - **Professional Bodies & CoSec Institutes**: `company_secretary_official_source`, `professional_body_official`, `company_secretary_professional_support`
  * **💡 Zero-Friction Excel Compatibility**:
    The backend can directly return raw rows from `global_source_registry`! The frontend client automatically recognizes and converts both camelCase and raw Excel keys:
    ```json
    [
      {
        "Source ID": "SRC-HK-001",
        "Jurisdiction": "Hong Kong",
        "Authority Name": "Hong Kong Monetary Authority",
        "Authority Type": "Central Bank / Monetary Authority",
        "Authority Abbreviation": "HKMA",
        "Sector": "Financial Services & Capital Markets",
        "Source Category": "banking_prudential_regulator",
        "Source System": "Web Crawl",
        "URL": "https://www.hkma.gov.hk",
        "URL Host": "hkma.gov.hk",
        "Access Pattern": "HTML Scraper",
        "Quality Status": "Active",
        "endpointLatencyMs": 240,
        "Summary": "Primary banking and prudential regulatory releases."
      }
    ]
    ```
* **`PATCH /scope/regulators/:id/follow`**
  * **Request Body**: `{ "isFollowed": true }`
* **`PATCH /scope/regulators/:id/cadence`**
  * **Request Body**: `{ "cadence": "Daily" }` // Daily | Weekly | Monthly
* **`POST /scope/onboarding`**
  * Saves wizard radar profile:
  ```json
  {
    "selectedArchetype": "Financial Services & Banking",
    "selectedMarkets": ["Hong Kong", "Singapore", "United Kingdom"],
    "businessSpecifics": "Global cross-border settlement and virtual asset custody",
    "selectedRegulatorIds": ["regl-001", "regl-002", "regl-003"]
  }
  ```

---

### 3.5. Global Regulatory Directory & Diligence Projects (`/directory`)
* **`GET /directory`**
  * Query parameters: `page`, `limit`, `search`, `jurisdiction`, `category`.
  * Returns paginated list of historical official circulars, rulebooks, and consultation papers.
* **`GET /directory/projects`**
  * Returns active Diligence Projects (e.g., audits, thematic reviews) to link regulatory items as evidence.

---

### 3.6. Compliance Matrix Workspaces (`/matrix`)
* **`GET /matrix/sessions`**
  * Returns saved cross-jurisdictional comparison workspaces.
* **`POST /matrix/sessions`**
  * Creates or updates a multi-jurisdictional legal comparison session.

---

## 4. Cross-Origin Resource Sharing (CORS)

If your backend is hosted on a different domain or port, configure CORS headers:

```http
Access-Control-Allow-Origin: * (or your frontend app domain)
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
```

---

## 5. Summary of Frontend Integration

The frontend code uses standard TypeScript interfaces located in `src/types.ts`. All fields, date formats (ISO / `YYYY-MM-DD`), and enum options in this guide directly match the UI rendering logic.
