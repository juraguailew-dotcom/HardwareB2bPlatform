# INVESTOR PROPOSAL
## HardwareB2B Platform — Papua New Guinea
### Connecting Hardware Suppliers & Contractors Through Technology

---

**Document Classification:** Confidential — For Investor Review Only
**Prepared By:** HardwareB2B Platform Team
**Date:** 2025
**Version:** 1.1

---

## TABLE OF CONTENTS

1. Executive Summary
2. The Problem
3. The Solution
4. Market Opportunity
5. Product Overview
6. Technology & Architecture
7. Business Model & Revenue Streams
8. Competitive Advantage
9. Traction & Development Status
10. Go-To-Market Strategy
11. Financial Projections
12. Use of Funds
13. The Team
14. Risk Analysis & Mitigation
15. Investment Ask & Terms
16. Conclusion

---

## 1. EXECUTIVE SUMMARY

HardwareB2B is a purpose-built, full-stack digital commerce platform designed exclusively for the Papua New Guinea (PNG) hardware and construction supply industry. The platform digitises and streamlines the procurement relationship between **hardware shops** and **building contractors** — a relationship that today is almost entirely manual, phone-based, and inefficient.

PNG's construction sector is growing rapidly, driven by government infrastructure spending, LNG-related development, and urban expansion across Port Moresby, Lae, and regional centres. Yet the supply chain that feeds this growth — hardware procurement — remains fragmented, opaque, and slow. HardwareB2B solves this directly.

The platform is **already built as a working web application MVP**. A substantial implementation exists with a React frontend, Node.js/Express backend, PostgreSQL database, JWT authentication, CSRF protection, real-time Socket.IO messaging, role-based access control, PDF invoice generation, analytics, inventory management, templates, favourites, chat, notifications, reviews, and admin tooling. Payment processing and cloud deployment are **not yet implemented in the current codebase** and remain part of launch preparation rather than completed functionality.

We are seeking **K [Amount] in seed funding** to complete production hardening, formal testing, deployment, commercial onboarding, and launch execution across PNG's major commercial centres.

**This is not a concept. This is a working product that now needs launch capital and commercial execution.**

---

## 2. THE PROBLEM

### The Hardware Procurement Gap in PNG

Papua New Guinea's construction and hardware industry operates largely the same way it did 30 years ago. Contractors source materials through:

- **Phone calls and in-person visits** to multiple shops to compare prices
- **Handwritten or verbal purchase orders** with no digital trail
- **Manual stock checks** that result in delayed projects when items are out of stock
- **Inconsistent invoicing and documentation** for smaller transactions
- **Limited visibility** into request history, spending patterns, or supplier reliability

This creates compounding problems for both sides of the market:

**For Contractors:**
- Wasted hours sourcing and comparing prices across multiple suppliers
- No consolidated digital history of requests and spending
- Inability to place bulk requests efficiently or use repeat-request templates
- Limited formal workflows when fulfilment issues arise
- Poor documentation for accounting and project tracking

**For Hardware Shops:**
- No digital storefront to reach contractors beyond their immediate geography
- Manual inventory tracking leading to overselling or stockouts
- Limited data on sales trends, top products, or seasonal demand
- Inability to compete with larger suppliers who have informal digital tools
- No structured way to manage and fulfil incoming requests

**The cost of this inefficiency is real.** Project delays caused by procurement failures cost PNG contractors meaningful time and money. For a sector that contributes substantially to PNG's GDP, this is a structural problem with a clear, technology-driven solution.

---

## 3. THE SOLUTION

### HardwareB2B — The Digital Procurement Platform for PNG

HardwareB2B is a two-sided marketplace and procurement management platform that connects hardware shops and contractors on a single, secure, mobile-responsive web application.

**For Contractors, the platform provides:**
- A searchable, filterable catalogue of products from hardware suppliers
- Request creation workflows with saved templates for repeat purchases
- Request history and detail views
- Direct messaging with shops
- Favourites lists for frequently viewed or purchased products
- Spending analytics
- Access to invoices and supporting records

**For Hardware Shops, the platform provides:**
- A digital storefront with product listings, images, pricing, and stock levels
- Inventory management workflows
- Pricing tools and request fulfilment workflows
- Sales analytics and dashboard reporting
- Direct communication with contractors via the built-in messenger
- Invoice generation and order/request administration

**For Platform Administrators:**
- User management
- Dispute management views
- Platform settings
- Analytics and audit-log style administration pages

The current product language increasingly uses **requests** rather than **orders**, with backward-compatible routing maintained in parts of the backend and frontend.

---

## 4. MARKET OPPORTUNITY

### Papua New Guinea — A Digitally Underserved, High-Growth Market

PNG is one of the Pacific's largest economies and is experiencing sustained construction growth driven by:

- **Government infrastructure investment** — roads, schools, hospitals, and public housing programmes
- **LNG and resource sector expansion** — ongoing capital works tied to PNG LNG and new resource projects
- **Urban population growth** — Port Moresby and Lae are among the fastest-growing cities in the Pacific
- **SME construction sector growth** — a rising class of local contractors taking on government and private contracts

**Market Size Indicators:**

| Segment | Estimate |
|---|---|
| Registered hardware/building supply businesses in PNG | 500+ |
| Active building contractors (formal + informal) | 2,000+ |
| Annual construction sector spend (PNG) | USD 1B+ |
| Hardware & materials as % of project cost | ~40–60% |
| Estimated annual hardware procurement value | USD 400M–600M |

Even capturing a small percentage of procurement coordination and supplier software spend represents a meaningful annual revenue opportunity.

**Why Now:**
- Smartphone and mobile internet penetration in PNG is growing rapidly
- The PNG government is actively promoting digital business transformation
- The market remains operationally underserved by vertical B2B procurement software
- Supply chain disruption has increased the value of better visibility and coordination tools

---

## 5. PRODUCT OVERVIEW

### A Platform Built for the PNG Context

HardwareB2B has been designed with PNG's specific business environment in mind:

**PNG Kina (PGK) Native Currency**
The backend logs explicitly reference PNG Kina and the platform positioning is clearly local-market specific.

**Role-Based Access Control**
Three distinct user roles — Shop, Contractor, and Admin — each with tailored dashboards, permissions, and workflows.

**Real-Time Communication**
Built-in Socket.IO-powered messaging supports direct communication between users, with supporting upload/static file paths configured on the backend.

**Templates and Repeat Procurement**
Contractors can save or use request templates for recurring procurement needs.

**Invoice Workflows**
The backend includes invoice routing and PDF generation libraries, supporting business documentation and record-keeping.

**Admin Oversight**
Dedicated admin routes and frontend admin pages support platform operations including user administration, disputes, settings, analytics, and audit visibility.

---

## 6. TECHNOLOGY & ARCHITECTURE

### Current Implementation Snapshot

HardwareB2B is built on a modern JavaScript web stack and is already structured as separate frontend and backend applications.

**Frontend**
- Create React App application
- React **19.2.4**
- React Router DOM **7.13.1**
- Material UI **7**
- Emotion styling
- Axios for API communication
- Framer Motion, Recharts, Leaflet, and Socket.IO client
- Context-based state patterns for authentication, currency, and theme settings
- Current route set includes public, protected, shop-only, contractor-only, and admin-only pages

**Backend**
- Node.js with Express **5.2.1**
- PostgreSQL via `pg`
- JWT authentication via `jsonwebtoken`
- bcrypt password hashing
- CSRF support via `csrf-csrf`
- cookie-parser and CORS middleware
- Socket.IO **4.8.3**
- Multer uploads and Cloudinary integration libraries
- PDFKit, Nodemailer, and Twilio installed for supporting business workflows
- Automated database migrations executed on server startup

**Registered API Route Prefixes**
- `/api/auth`
- `/api/products`
- `/api/requests`
- `/api/v2/requests`
- `/api/orders`
- `/api/v1/orders`
- `/api/inventory`
- `/api/analytics`
- `/api/favorites`
- `/api/templates`
- `/api/invoices`
- `/api/users`
- `/api/notifications`
- `/api/locations`
- `/api/pricing`
- `/api/chat`
- `/api/reviews`
- `/api/admin`

Additional endpoints currently include `/api/csrf-token`, `/api/test`, `/health`, and static `/uploads`.

**Security**
- JWT-based protected access
- CSRF token endpoint and double-submit protection wiring
- Rate limiting for auth routes and broader API usage
- Cookie parsing, CORS, and role-aware route protection patterns

**Deployment Status**
- The application is cloud-deployable in principle, but the current repository does **not** evidence completed AWS deployment, CI/CD setup, or live infrastructure provisioning.
- Any AWS, App Runner, Amplify, or RDS plans should be treated as **deployment targets**, not completed implementation.

**Payments Status**
- The current code references pricing and invoice capabilities, but there is **no Stripe dependency or verified Stripe integration present** in the inspected package manifests and entry points.
- Payment processing should therefore be described as **future scope / commercial roadmap**, not launch-ready functionality.

**Platform Modules:**

| Module | Status |
|---|---|
| Authentication & Registration | ✅ Implemented |
| Product Catalogue & Search | ✅ Implemented |
| Request / Order Routing Layer | ✅ Implemented |
| Inventory Management | ✅ Implemented |
| Real-Time Messaging | ✅ Implemented |
| Templates | ✅ Implemented |
| Favourites | ✅ Implemented |
| Analytics | ✅ Implemented |
| Request Fulfilment | ✅ Implemented |
| Invoice Module | ✅ Implemented |
| Notifications | ✅ Implemented |
| Reviews | ✅ Implemented |
| Admin Dashboard Area | ✅ Implemented |
| Dispute Management UI | ✅ Implemented |
| Audit Log UI | ✅ Implemented |
| Payment Processing | ⏳ Future Work |
| Native Mobile App | 🗓 Roadmap |

---

## 7. BUSINESS MODEL & REVENUE STREAMS

HardwareB2B operates a multi-layered revenue model designed to generate income as adoption grows.

### Revenue Stream 1 — Shop Subscription Tiers
Monthly or annual subscription plans for hardware shops.

| Tier | Features | Price (PGK/month) |
|---|---|---|
| Basic | Core listing and account access | K 150 |
| Professional | Expanded catalogue and analytics | K 400 |
| Enterprise | Priority support and custom arrangements | K 900+ |

### Revenue Stream 2 — Featured Listings & Promotions
Shops can pay to have their products or store featured more prominently in discovery surfaces.

### Revenue Stream 3 — Premium Contractor Plans
Potential value-added features for larger contractors could include:
- More advanced reporting
- Additional templates
- Priority support
- Early feature access

### Revenue Stream 4 — Platform Services (Future)
- Logistics coordination
- Trade credit facilitation
- Market insights and reporting services

### Revenue Projection Summary

| Year | Shops | Contractors | Est. Platform Revenue (PGK) |
|---|---|---|---|
| Year 1 | 50 | 200 | K 250,000 |
| Year 2 | 150 | 600 | K 900,000 |
| Year 3 | 350 | 1,500 | K 2.5M+ |

*Illustrative projections only. Commercial assumptions should be validated during go-to-market execution.*

---

## 8. COMPETITIVE ADVANTAGE

### Why HardwareB2B Wins in This Market

**1. Built for a Specific Vertical and Geography**
This is not a generic storefront. It is shaped around hardware procurement workflows and PNG market realities.

**2. Working Product — Not a Slide Deck**
There is already a functioning frontend, backend, route structure, role model, and business workflow footprint in code. This materially reduces product-development uncertainty.

**3. Operational Feature Depth**
The platform is not limited to catalogue browsing. It already includes messaging, templates, analytics, invoices, administration, and request-management features.

**4. Role-Based Marketplace Design**
The product is intentionally structured for the needs of shops, contractors, and administrators, improving usability and trust.

**5. Trust and Oversight Potential**
Admin tooling, reviews, and dispute-related workflows support the creation of a more accountable marketplace environment.

**6. Expansion Optionality**
Once the core web product is commercialised, the platform has room to grow into payments, logistics, mobile apps, and deeper reporting layers.

---

## 9. TRACTION & DEVELOPMENT STATUS

### Where We Are Today

The current repository indicates a **substantially implemented MVP**, with the core multi-role web platform in place and launch preparation work still remaining.

| Area | Status |
|---|---|
| Core authentication and registration | ✅ Implemented |
| Product catalogue and supplier workflows | ✅ Implemented |
| Request/history/detail flows | ✅ Implemented |
| Messaging and chat routes | ✅ Implemented |
| Inventory, analytics, templates, favourites | ✅ Implemented |
| Invoices, notifications, reviews | ✅ Implemented |
| Admin area with nested routes | ✅ Implemented |
| Payment processing | ⏳ Not yet implemented in current stack |
| Production deployment | ⏳ Not yet evidenced as completed |
| Formal launch/UAT hardening | ⏳ In progress / pre-launch |

**What this means for investors:**
- Technology execution risk is materially reduced versus an idea-stage company
- The immediate need is launch readiness, testing, deployment, onboarding, and customer acquisition
- Capital can be directed toward commercial rollout and finishing steps rather than building from zero

**Observed implementation metrics:**
- 14 backend route files mounted under 18 API prefixes including compatibility aliases
- Role-based frontend route architecture across shop, contractor, admin, and shared authenticated pages
- Real-time Socket.IO infrastructure
- Automated migration execution on backend startup
- Separate backend and frontend applications with modern dependency stacks

---

## 10. GO-TO-MARKET STRATEGY

### Phase 1 — Controlled Launch
**Target:** Port Moresby hardware corridor

- Onboard anchor hardware shops through direct outreach
- Recruit an initial contractor cohort through industry relationships
- Offer assisted onboarding for supplier catalogue setup
- Use real customer feedback to refine operational workflows before wider rollout

### Phase 2 — Market Expansion
**Target:** Lae and other major commercial centres

- Expand supplier and contractor density
- Introduce paid supplier plans once marketplace utility is proven
- Formalise reporting and customer success processes
- Increase digital and relationship-driven marketing

### Phase 3 — Scale & Diversify
**Target:** National footprint and adjacent service layers

- Expand geographic coverage
- Evaluate roadmap additions such as payments, mobile delivery, and expanded notification tooling
- Explore adjacent operational services where unit economics support them

### Customer Acquisition Strategy

| Channel | Rationale |
|---|---|
| Direct sales and founder-led outreach | Relationship-driven PNG commercial environment |
| Industry referrals | Faster trust-building with suppliers and contractors |
| Facebook and digital marketing | Practical reach in the local market |
| Free or assisted onboarding | Reduces early adoption friction |

---

## 11. FINANCIAL PROJECTIONS

### 3-Year Financial Summary

**Key Assumptions:**
- Supplier subscriptions begin after controlled launch
- Additional monetisation layers are phased in gradually
- User growth remains conservative in Year 1
- Average contractor usage grows as supplier density improves

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Active Shops | 50 | 150 | 350 |
| Active Contractors | 200 | 600 | 1,500 |
| Subscription Revenue | K 80,000 | K 360,000 | K 900,000 |
| Promotions & Other Revenue | K 20,000 | K 80,000 | K 200,000 |
| Service / Transaction Revenue | K 75,000 | K 400,000 | K 1,200,000 |
| **Total Revenue** | **K 175,000** | **K 840,000** | **K 2,300,000** |

*These are planning projections, not audited forecasts. Timing of transaction-based revenue depends on final commercial model and payment implementation decisions.*

---

## 12. USE OF FUNDS

### Seed Round: K [Amount] Requested

| Category | Allocation | % |
|---|---|---|
| Infrastructure, hosting, and deployment | K [X] | 18% |
| Testing, security hardening, and launch readiness | K [X] | 12% |
| Sales & onboarding team (6 months) | K [X] | 25% |
| Marketing & customer acquisition | K [X] | 20% |
| Product development roadmap items | K [X] | 18% |
| Legal, compliance & business registration | K [X] | 7% |
| **Total** | **K [Amount]** | **100%** |

### Why This Allocation Works
- The largest allocation goes to **go-to-market execution** because a working software base already exists.
- A meaningful portion is reserved for **production hardening and deployment**, which is a realistic near-term need based on the current implementation state.
- Product roadmap funding preserves flexibility for payments, mobile expansion, and other commercial priorities.

---

## 13. THE TEAM

*[Insert team bios here — recommended structure below]*

**[Founder / CEO]**
Background in [construction / technology / business]. Deep understanding of PNG's hardware and construction market. Responsible for strategy, partnerships, and investor relations.

**[CTO / Lead Developer]**
Full-stack engineer with expertise in React, Node.js, PostgreSQL, and modern web architecture. Responsible for application delivery, infrastructure planning, and roadmap execution.

**[Head of Sales / Operations]**
Responsible for supplier onboarding, contractor acquisition, and customer success across PNG's major centres.

**Advisors**
- [Industry advisor — construction/hardware sector]
- [Technology advisor]
- [Finance/legal advisor]

---

## 14. RISK ANALYSIS & MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low initial platform adoption | Medium | High | Free onboarding period; direct sales; anchor supplier strategy |
| Internet connectivity limitations in regional PNG | Medium | Medium | Mobile-responsive web product; optimise for practical field use |
| Payments rollout complexity | Medium | Medium | Keep monetisation flexible; do not depend solely on integrated payments at launch |
| Competitor entry | Low to Medium | High | First-mover execution; supplier density; relationship-led growth |
| Production hardening gaps before launch | Medium | Medium | Focus funding on testing, deployment, and operational readiness |
| Key person dependency | Medium | High | Documentation, repository hygiene, and staged team expansion |

---

## 15. INVESTMENT ASK & TERMS

### Seed Round

**Amount Sought:** K [Amount]  
**Instrument:** [Equity / Convertible Note / SAFE — to be confirmed]  
**Equity Offered:** [X]%  
**Pre-Money Valuation:** K [Amount]  
**Minimum Investment:** K [Amount]  
**Use of Proceeds:** As detailed in Section 12

### What Investors Receive
- Exposure to a first-mover vertical software opportunity in PNG
- Quarterly financial and operational reporting
- Potential board or advisory involvement for lead investors
- Participation in future growth rounds

### Why Invest Now
- The product foundation already exists
- Capital now accelerates launch and market entry rather than greenfield software development
- PNG remains underserved by purpose-built B2B procurement software
- Early execution can establish supplier and contractor network effects

---

## 16. CONCLUSION

HardwareB2B represents a strong early-stage opportunity: a **working multi-role B2B procurement platform** targeting a **large, underserved market** with a clear operational pain point.

The problem is real. The product foundation is built. The next step is disciplined launch execution.

We invite investors to help fund the transition from implemented MVP to commercially launched platform serving PNG's hardware and construction ecosystem.

---

**Contact:**  
[Name]  
[Email]  
[Phone]  
[Website / Platform URL]

---

*This document contains forward-looking statements and financial projections based on reasonable assumptions. Actual results may differ. This proposal is confidential and intended solely for the named recipient. Unauthorised distribution is prohibited.*

---

*HardwareB2B Platform — Papua New Guinea | Confidential Investor Proposal 2025*