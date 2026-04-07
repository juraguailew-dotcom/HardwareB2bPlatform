# INVESTOR PROPOSAL
## HardwareB2B Platform — Papua New Guinea
### Connecting Hardware Suppliers & Contractors Through Technology

---

**Document Classification:** Confidential — For Investor Review Only
**Prepared By:** HardwareB2B Platform Team
**Date:** 2025
**Version:** 1.0

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

The platform is **already built**. A production-ready MVP exists with a React frontend, Node.js/Express backend, PostgreSQL database, real-time WebSocket messaging, role-based access control, PDF invoicing, sales analytics, inventory management, and a dispute resolution system. Stripe payment integration is architected and ready for activation.

We are seeking **K [Amount] in seed funding** to complete final testing, activate payments, deploy to AWS cloud infrastructure, and execute our go-to-market strategy across PNG's major commercial centres.

**This is not a concept. This is a working product looking for the capital to launch.**

---

## 2. THE PROBLEM

### The Hardware Procurement Gap in PNG

Papua New Guinea's construction and hardware industry operates largely the same way it did 30 years ago. Contractors source materials through:

- **Phone calls and in-person visits** to multiple shops to compare prices
- **Handwritten or verbal purchase orders** with no digital trail
- **Manual stock checks** that result in delayed projects when items are out of stock
- **No formal invoicing system** for smaller transactions
- **Zero visibility** into order history, spending patterns, or supplier reliability

This creates compounding problems for both sides of the market:

**For Contractors:**
- Wasted hours sourcing and comparing prices across multiple suppliers
- No consolidated order history or spending analytics
- Inability to place bulk orders efficiently or use repeat-order templates
- No formal dispute resolution when orders go wrong
- Cash flow uncertainty due to lack of digital invoicing

**For Hardware Shops:**
- No digital storefront to reach contractors beyond their immediate geography
- Manual inventory tracking leading to overselling or stockouts
- No data on sales trends, top products, or seasonal demand
- Inability to compete with larger suppliers who have informal digital tools
- No structured way to manage and fulfil incoming orders

**The cost of this inefficiency is real.** Project delays caused by procurement failures cost PNG contractors an estimated significant percentage of project value in time overruns. For a sector that contributes substantially to PNG's GDP, this is a structural problem with a clear, technology-driven solution.

---

## 3. THE SOLUTION

### HardwareB2B — The Digital Procurement Platform for PNG

HardwareB2B is a two-sided marketplace and procurement management platform that connects hardware shops and contractors on a single, secure, mobile-responsive web application.

**For Contractors, the platform provides:**
- A searchable, filterable catalogue of products from verified hardware shops
- One-click bulk order creation with saved order templates for repeat purchases
- Real-time order tracking from placement through to delivery
- Direct messaging with shops — including file and image attachments
- Favourites lists for frequently purchased products
- PDF invoices for every order
- Full order history and spending analytics

**For Hardware Shops, the platform provides:**
- A digital storefront with product listings, images, pricing, and stock levels
- Flexible pricing — unit pricing and bulk/wholesale pricing tiers
- Inventory management with low-stock alerts
- Order fulfilment dashboard to manage incoming contractor orders
- Sales analytics — revenue trends, top products, order volumes
- Direct communication with contractors via the built-in messenger
- PDF invoice generation per order

**For Platform Administrators:**
- User verification and onboarding approval
- Dispute resolution management
- Platform-wide settings and configuration
- User management and role control

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

Even capturing **1–2% of procurement transactions** as platform fees represents a multi-million Kina annual revenue opportunity.

**Why Now:**
- Smartphone and mobile internet penetration in PNG is growing rapidly
- The PNG government is actively promoting digital business transformation
- No direct competitor currently occupies this specific niche in the PNG market
- Post-COVID supply chain disruptions have made digital procurement tools a priority for businesses

---

## 5. PRODUCT OVERVIEW

### A Platform Built for the PNG Context

HardwareB2B has been designed with PNG's specific business environment in mind:

**PNG Kina (PGK) Native Currency**
All pricing, invoicing, and transactions are denominated in Papua New Guinea Kina. The platform is not a generic global tool retrofitted for PNG — it was built for PNG from the ground up.

**Admin-Verified User Onboarding**
Every shop and contractor must be verified by a platform administrator before gaining full access. This ensures platform integrity, prevents fraud, and builds trust between parties — critical in a market where business relationships are built on reputation.

**Role-Based Access Control**
Three distinct user roles — Shop, Contractor, and Admin — each with tailored dashboards, permissions, and workflows. Users only see and access what is relevant to their role.

**Real-Time Communication**
Built-in WebSocket-powered messenger allows contractors and shops to communicate directly, share product images, send documents (quotes, specs, delivery notes), and resolve queries without leaving the platform.

**Bulk Order Templates**
Contractors can save frequently used order configurations as templates and reorder with a single click — a feature specifically designed for the repeat-procurement patterns common in construction projects.

**PDF Invoice Generation**
Every completed order generates a professional PDF invoice, providing contractors and shops with the documentation they need for accounting, tax, and project records.

**Dispute Resolution System**
A structured, admin-mediated dispute resolution workflow gives both parties confidence that issues will be handled fairly and transparently.

---

## 6. TECHNOLOGY & ARCHITECTURE

### Enterprise-Grade Stack, Built to Scale

HardwareB2B is built on a modern, proven, cloud-ready technology stack:

**Frontend**
- React.js with Material UI — responsive, accessible, mobile-first interface
- Context API for state management (Auth, Currency, Theme)
- Lazy-loaded components for performance
- Real-time updates via Socket.IO client

**Backend**
- Node.js with Express.js — 16 REST API route modules
- Socket.IO WebSocket server for real-time messaging
- JWT authentication with CSRF protection
- bcrypt password hashing
- Rate limiting on all API endpoints
- Multer + Cloudinary for image and file management

**Database**
- PostgreSQL — relational, ACID-compliant, production-grade
- Automated migration system (runs on server start)
- Optimised indexes for conversation queries, product search, and order lookups
- Soft-delete support for user data integrity

**Security**
- JWT token authentication on all protected routes
- CSRF double-submit cookie protection
- Role-based middleware (isShop, isContractor, isAdmin)
- Input validation and parameterised queries (SQL injection prevention)
- Rate limiting to prevent brute-force attacks

**Deployment Target (AWS)**
- Frontend: AWS Amplify / S3 + CloudFront (global CDN)
- Backend: AWS Elastic Beanstalk / App Runner
- Database: AWS RDS PostgreSQL (managed, automated backups)
- File Storage: Cloudinary (images) + local/S3 (chat attachments)

**Payments (Ready for Activation)**
- Stripe integration is fully architected in the codebase
- Payment routes, checkout UI, and order payment status tracking are built
- Pending activation upon regulatory and banking confirmation

**Platform Modules:**

| Module | Status |
|---|---|
| Authentication & Registration | ✅ Complete |
| Product Catalogue & Search | ✅ Complete |
| Order Management | ✅ Complete |
| Inventory Management | ✅ Complete |
| Real-Time Messenger + File Attachments | ✅ Complete |
| Bulk Order Templates | ✅ Complete |
| Favourites | ✅ Complete |
| Sales Analytics | ✅ Complete |
| Order Fulfilment Dashboard | ✅ Complete |
| PDF Invoice Generation | ✅ Complete |
| Admin Dashboard & User Verification | ✅ Complete |
| Dispute Resolution | ✅ Complete |
| Platform Settings | ✅ Complete |
| Stripe Payment Integration | ⏳ Pending Activation |
| Mobile App | 🗓 Roadmap |
| Email Notifications | 🗓 Roadmap |
| Multi-Currency Support | 🗓 Roadmap |

---

## 7. BUSINESS MODEL & REVENUE STREAMS

HardwareB2B operates a multi-layered revenue model designed to generate income from day one while scaling with platform growth.

### Revenue Stream 1 — Transaction Commission (Primary)
A percentage fee applied to each order processed through the platform.

- **Model:** 1.5% – 3% commission on gross merchandise value (GMV)
- **Trigger:** Activated upon Stripe payment integration go-live
- **Rationale:** Standard for B2B marketplace platforms globally; low enough to be accepted, high enough to be meaningful at scale

### Revenue Stream 2 — Shop Subscription Tiers
Monthly or annual subscription plans for hardware shops.

| Tier | Features | Price (PGK/month) |
|---|---|---|
| Basic | Up to 50 products, standard listing | K 150 |
| Professional | Unlimited products, analytics, priority listing | K 400 |
| Enterprise | Custom integrations, dedicated support | K 900+ |

### Revenue Stream 3 — Featured Listings & Promotions
Shops pay to have their products or store featured prominently in search results and the homepage — a proven model from platforms like Alibaba and Amazon.

### Revenue Stream 4 — Premium Contractor Plans
Contractors pay for advanced features such as:
- Unlimited order templates
- Advanced spending analytics and reporting
- Priority dispute resolution
- Early access to new features

### Revenue Stream 5 — Platform Services (Future)
- Logistics and delivery coordination fees
- Trade credit facilitation (buy-now-pay-later for verified contractors)
- Data and market insights reports for industry stakeholders

### Revenue Projection Summary

| Year | Shops | Contractors | Est. GMV (PGK) | Est. Revenue (PGK) |
|---|---|---|---|---|
| Year 1 | 50 | 200 | K 5M | K 250,000 |
| Year 2 | 150 | 600 | K 20M | K 900,000 |
| Year 3 | 350 | 1,500 | K 60M | K 2.5M+ |

*Projections based on conservative market penetration assumptions. GMV = total order value processed through the platform.*

---

## 8. COMPETITIVE ADVANTAGE

### Why HardwareB2B Wins in This Market

**1. First-Mover Advantage in an Uncontested Market**
There is no direct digital B2B hardware procurement platform operating in PNG today. The first platform to establish network effects — shops listing products, contractors placing orders — creates a defensible moat that is extremely difficult for later entrants to overcome.

**2. Built Specifically for PNG**
Generic e-commerce platforms (Shopify, WooCommerce) are not designed for B2B procurement workflows, bulk ordering, contractor-specific features, or PNG Kina. HardwareB2B is not adapted — it is purpose-built.

**3. Working Product — Not a Concept**
The platform is fully developed and functional. Investors are not funding an idea or a prototype. They are funding the launch and scaling of a production-ready system. This dramatically reduces technology risk.

**4. Network Effects**
Every new shop that lists products makes the platform more valuable to contractors. Every new contractor that joins makes the platform more valuable to shops. This self-reinforcing dynamic accelerates growth and raises the cost of switching to a competitor.

**5. Trust Infrastructure**
The admin verification system, dispute resolution module, and review system create a trusted marketplace environment. In PNG's business culture, where relationships and reputation are paramount, this trust layer is a significant competitive differentiator.

**6. Data Moat**
As transactions flow through the platform, HardwareB2B accumulates proprietary data on pricing, demand patterns, supplier reliability, and market trends. This data becomes increasingly valuable — to the platform itself, to shops optimising their inventory, and potentially to industry bodies and government.

**7. Switching Costs**
Once a contractor has their order templates, supplier relationships, order history, and invoices on the platform, the cost of switching to an alternative is high. This creates strong retention.

---

## 9. TRACTION & DEVELOPMENT STATUS

### Where We Are Today

The HardwareB2B platform has completed **5 of 6 development phases**:

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Core — Auth, Registration, Product Listing | ✅ Complete |
| Phase 2 | Transactions — Orders, Order Items, Inventory | ✅ Complete |
| Phase 3 | Engagement — Favourites, Templates, Real-Time Chat | ✅ Complete |
| Phase 4 | Analytics — Sales Analytics, Fulfilment, PDF Invoices | ✅ Complete |
| Phase 5 | Admin — User Verification, Disputes, Platform Settings | ✅ Complete |
| Phase 6 | Payments — Stripe Integration | ⏳ Pending Activation |

**What this means for investors:**
- Technology risk is substantially de-risked — the core product works
- Time-to-market is measured in weeks, not months or years
- Investment goes directly into launch, growth, and market capture — not into building something that may or may not work

**Development Metrics:**
- 16 REST API route modules
- 30+ frontend component modules across 9 directories
- Full WebSocket real-time infrastructure
- Automated database migration system
- Role-based access control across 3 user types
- File attachment support in messenger (images, PDFs, documents)
- AWS deployment architecture fully planned and documented

---

## 10. GO-TO-MARKET STRATEGY

### Phase 1 — Controlled Launch (Months 1–3)
**Target:** Port Moresby hardware corridor (Gordons, Waigani, Boroko)

- Onboard 20–30 anchor hardware shops through direct sales outreach
- Recruit 50–100 contractors through construction industry associations and word of mouth
- Offer free platform access for the first 6 months to drive adoption
- Assign a dedicated onboarding team to assist shops with product listing setup
- Collect feedback aggressively and iterate

### Phase 2 — Market Expansion (Months 4–9)
**Target:** Lae, Kokopo, Mt Hagen

- Expand to PNG's second and third largest commercial centres
- Activate subscription billing for shops
- Launch transaction commission model alongside Stripe payment activation
- Begin digital marketing — Facebook (dominant in PNG), Google, industry publications
- Partner with PNG hardware industry associations for credibility and reach

### Phase 3 — Scale & Diversify (Months 10–18)
**Target:** National coverage + new verticals

- Full national rollout across all major PNG centres
- Launch mobile app (iOS + Android) for on-site contractor access
- Introduce email notification system for order updates
- Explore expansion into adjacent Pacific Island markets (Solomon Islands, Vanuatu, Fiji)
- Introduce trade credit and logistics coordination services

### Customer Acquisition Strategy

| Channel | Rationale |
|---|---|
| Direct sales (field team) | PNG business culture is relationship-driven; in-person is essential |
| Facebook advertising | Highest social media penetration in PNG |
| Industry associations | CIMC, PNG Contractors Association — credibility and bulk reach |
| Referral programme | Incentivise contractors to refer other contractors |
| Free onboarding period | Remove friction for early adopters |

---

## 11. FINANCIAL PROJECTIONS

### 3-Year Financial Summary

**Key Assumptions:**
- Shop subscription revenue begins Month 4
- Transaction commission begins Month 7 (post-Stripe activation)
- Conservative 15–20% month-on-month user growth in Year 1
- Average order value: K 2,500
- Average orders per contractor per month: 4

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Active Shops | 50 | 150 | 350 |
| Active Contractors | 200 | 600 | 1,500 |
| Monthly Orders (end of year) | 800 | 2,400 | 6,000 |
| Annual GMV | K 5M | K 20M | K 60M |
| Subscription Revenue | K 80,000 | K 360,000 | K 900,000 |
| Transaction Commission Revenue | K 75,000 | K 400,000 | K 1,200,000 |
| Featured Listings & Other | K 20,000 | K 80,000 | K 200,000 |
| **Total Revenue** | **K 175,000** | **K 840,000** | **K 2,300,000** |
| Operating Costs | K 320,000 | K 580,000 | K 950,000 |
| **Net Position** | **(K 145,000)** | **K 260,000** | **K 1,350,000** |

*Year 1 net loss reflects investment in team, marketing, and infrastructure. Platform reaches profitability in Year 2.*

### Path to Profitability
- Break-even projected at **Month 18–20**
- Positive cash flow from **Year 2 onwards**
- Strong margin expansion in Year 3 as fixed costs are absorbed by growing revenue

---

## 12. USE OF FUNDS

### Seed Round: K [Amount] Requested

| Category | Allocation | % |
|---|---|---|
| AWS Cloud Infrastructure & Deployment | K [X] | 15% |
| Stripe Payment Integration & Activation | K [X] | 8% |
| Sales & Onboarding Team (6 months) | K [X] | 25% |
| Marketing & Customer Acquisition | K [X] | 20% |
| Product Development (Mobile App, Email Notifications) | K [X] | 18% |
| Legal, Compliance & Business Registration | K [X] | 7% |
| Working Capital & Contingency | K [X] | 7% |
| **Total** | **K [Amount]** | **100%** |

### Why This Allocation Works
- The largest allocation goes to **people and market acquisition** — because the technology is built. The constraint is not engineering; it is sales and adoption.
- AWS infrastructure costs are well-understood and predictable — the architecture is fully planned.
- The mobile app allocation accelerates the platform's accessibility for on-site contractors who primarily use smartphones.

---

## 13. THE TEAM

*[Insert team bios here — recommended structure below]*

**[Founder / CEO]**
Background in [construction / technology / business]. Deep understanding of PNG's hardware and construction market. Responsible for strategy, partnerships, and investor relations.

**[CTO / Lead Developer]**
Full-stack engineer with expertise in React, Node.js, PostgreSQL, and AWS. Architect and primary developer of the HardwareB2B platform. Responsible for technology, infrastructure, and product development.

**[Head of Sales / Operations]**
[Background]. Responsible for shop and contractor onboarding, field sales, and customer success across PNG's major centres.

**Advisors**
- [Industry advisor — construction/hardware sector]
- [Technology advisor]
- [Finance/legal advisor]

---

## 14. RISK ANALYSIS & MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low initial platform adoption | Medium | High | Free onboarding period; direct sales team; anchor shop strategy |
| Internet connectivity limitations in regional PNG | Medium | Medium | Mobile-optimised PWA; offline-capable features on roadmap |
| Competitor entry | Low (Year 1–2) | High | First-mover advantage; network effects; rapid feature development |
| Payment processing delays (Stripe/banking) | Medium | Medium | Revenue model does not depend solely on payments; subscriptions provide early revenue |
| Regulatory changes | Low | Medium | Legal advisor engaged; platform designed for compliance |
| Key person dependency | Medium | High | Documentation, code repository, and knowledge transfer protocols in place |
| Currency/economic instability in PNG | Low | Medium | PGK-native platform; pricing flexibility built in |

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
- Equity stake in a first-mover B2B platform in a high-growth, underserved market
- Quarterly financial and operational reporting
- Board or advisory seat (for lead investors)
- Pro-rata rights in future funding rounds
- Access to platform data and market insights

### Why Invest Now
- The product is built — capital goes to growth, not development risk
- PNG's construction market is growing and digitisation is accelerating
- No direct competitor currently exists in this space
- The founding team has domain expertise and a working product
- Early investors capture the highest equity value before market traction drives valuation up

---

## 16. CONCLUSION

HardwareB2B represents a rare investment opportunity: a **working, production-ready platform** targeting a **large, underserved market** with **no direct competition**, built by a team with **deep domain knowledge** of the Papua New Guinea construction and hardware industry.

The problem is real. The solution is built. The market is ready.

We are not asking investors to fund a vision. We are asking them to fund the launch of a platform that is already capable of transforming how PNG's hardware industry operates — and to share in the significant financial returns that will follow.

We invite you to join us in building PNG's first dedicated hardware B2B marketplace.

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
