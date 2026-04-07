# Hardware B2B Platform — SDLC Diagram

```mermaid
flowchart TD
    %% ─────────────────────────────────────────
    %%  PHASE 1 — PLANNING
    %% ─────────────────────────────────────────
    subgraph PLAN["📋 1. PLANNING"]
        P1["Define Project Scope\n(B2B Hardware Platform — PNG Market)"]
        P2["Identify Stakeholders\n(Shops · Contractors · Admins)"]
        P3["Set Goals & Constraints\n(PNG Kina · Admin Verification · Stripe future)"]
        P1 --> P2 --> P3
    end

    %% ─────────────────────────────────────────
    %%  PHASE 2 — REQUIREMENTS
    %% ─────────────────────────────────────────
    subgraph REQ["📝 2. REQUIREMENTS ANALYSIS"]
        R1["Functional Requirements\n(Auth · Orders · Inventory · Chat · Disputes)"]
        R2["Non-Functional Requirements\n(Security · Performance · Scalability)"]
        R3["Role-Based Access\n(Shop · Contractor · Admin)"]
        R1 --> R2 --> R3
    end

    %% ─────────────────────────────────────────
    %%  PHASE 3 — SYSTEM DESIGN
    %% ─────────────────────────────────────────
    subgraph DESIGN["🏗️ 3. SYSTEM DESIGN"]
        D1["Architecture Design\n(React Frontend · Express Backend · PostgreSQL)"]
        D2["Database Design\n(ERD: users · products · orders · chat · disputes)"]
        D3["API Design\n(16 REST Route Modules + WebSocket)"]
        D4["Security Design\n(JWT · CSRF · bcrypt · Rate Limiting)"]
        D1 --> D2 --> D3 --> D4
    end

    %% ─────────────────────────────────────────
    %%  PHASE 4 — IMPLEMENTATION
    %% ─────────────────────────────────────────
    subgraph IMPL["💻 4. IMPLEMENTATION"]
        direction TB
        I1["Phase 1 — Core\n(Auth · Registration · Product Listing)"]
        I2["Phase 2 — Transactions\n(Orders · Order Items · Inventory)"]
        I3["Phase 3 — Engagement\n(Favorites · Bulk Templates · Real-Time Chat)"]
        I4["Phase 4 — Analytics\n(Sales Analytics · Fulfillment · PDF Invoices)"]
        I5["Phase 5 — Admin\n(User Verification · Disputes · Platform Settings)"]
        I6["Phase 6 — Payments ⏳\n(Stripe Integration — Pending Activation)"]
        I1 --> I2 --> I3 --> I4 --> I5 --> I6
    end

    %% ─────────────────────────────────────────
    %%  PHASE 5 — TESTING
    %% ─────────────────────────────────────────
    subgraph TEST["🧪 5. TESTING"]
        T1["Unit Tests\n(Jest · React Testing Library)"]
        T2["API Tests\n(Postman — 13 Route Modules)"]
        T3["Integration Tests\n(Auth Flow · Orders · Chat)"]
        T4["Security Tests\n(JWT Expiry · CSRF · Rate Limits)"]
        T5["UAT\n(Role-Based Access · Responsive UI)"]
        T1 --> T2 --> T3 --> T4 --> T5
    end

    %% ─────────────────────────────────────────
    %%  PHASE 6 — DEPLOYMENT
    %% ─────────────────────────────────────────
    subgraph DEPLOY["🚀 6. DEPLOYMENT"]
        DEP1["Provision Infrastructure\n(RDS PostgreSQL · EC2 / ECS Fargate)"]
        DEP2["Run DB Migrations\n(migrate.js — auto on server start)"]
        DEP3["Deploy Backend\n(AWS Elastic Beanstalk / App Runner)"]
        DEP4["Deploy Frontend\n(AWS Amplify / S3 + CloudFront)"]
        DEP5["Configure Environment\n(.env · CORS · Cloudinary · Stripe)"]
        DEP1 --> DEP2 --> DEP3 --> DEP4 --> DEP5
    end

    %% ─────────────────────────────────────────
    %%  PHASE 7 — MAINTENANCE
    %% ─────────────────────────────────────────
    subgraph MAINT["🔧 7. MAINTENANCE"]
        M1["Monitor Health\n(GET /health · Server Logs)"]
        M2["Bug Fixes & Patches\n(Resolve Issues · Security Updates)"]
        M3["Pending Items\n(Activate Stripe · Admin Routes · Remove Debug Logs)"]
        M4["Future Enhancements\n(Email Notifications · Mobile App · Multi-Currency)"]
        M1 --> M2 --> M3 --> M4
    end

    %% ─────────────────────────────────────────
    %%  PHASE FLOW
    %% ─────────────────────────────────────────
    PLAN --> REQ
    REQ --> DESIGN
    DESIGN --> IMPL
    IMPL --> TEST

    TEST -->|"Tests Pass ✅"| DEPLOY
    TEST -->|"Tests Fail ❌"| IMPL

    DEPLOY --> MAINT
    MAINT -->|"New Feature / Change Request"| PLAN

    %% ─────────────────────────────────────────
    %%  STYLES
    %% ─────────────────────────────────────────
    style PLAN   fill:#1e3a5f,stroke:#4a90d9,color:#ffffff
    style REQ    fill:#1a3a2a,stroke:#4caf50,color:#ffffff
    style DESIGN fill:#3a1a3a,stroke:#ab47bc,color:#ffffff
    style IMPL   fill:#3a2a1a,stroke:#ff9800,color:#ffffff
    style TEST   fill:#1a2a3a,stroke:#29b6f6,color:#ffffff
    style DEPLOY fill:#2a1a1a,stroke:#ef5350,color:#ffffff
    style MAINT  fill:#2a2a1a,stroke:#ffee58,color:#ffffff
```

---

## Phase Summary

| Phase | Key Activities | Status |
|---|---|---|
| 1. Planning | Scope, stakeholders, goals, constraints | ✅ Complete |
| 2. Requirements | Functional + non-functional, role-based access | ✅ Complete |
| 3. System Design | Architecture, ERD, API design, security | ✅ Complete |
| 4. Implementation | 6 development phases (Core → Payments) | 🔄 Phase 6 Pending |
| 5. Testing | Unit, API, integration, security, UAT | 🔄 In Progress |
| 6. Deployment | AWS infrastructure, migrations, CI/CD | ⏳ Upcoming |
| 7. Maintenance | Monitoring, bug fixes, enhancements | ⏳ Upcoming |

---

## Feedback Loop

```mermaid
flowchart LR
    A["🔍 Monitor"] --> B["🐛 Identify Issue / Feature"]
    B --> C["📋 Plan Change"]
    C --> D["💻 Implement"]
    D --> E["🧪 Test"]
    E --> F["🚀 Deploy"]
    F --> A
```
