# Waslat Worsh (وصلة ورش) — Integrated B2B Industrial Marketplace Architecture

**Date:** October 31, 2026  
**Status:** Approved Module Architecture  
**Scope:** B2B Capacity Sourcing, RFQ Bidding, Workshop Profiles, Job Order Conversion & Commission Ledger

---

## 1. Overview & Dual-Journey Concept

**Waslat Worsh** is GarmentOS Cloud's integrated B2B manufacturing exchange. It bridges the gap between:
1. **Capacity Seekers (Garment Brands & Large Factories):** Apparel companies seeking reliable subcontractors for contract cutting, sewing overflow, pleating, embroidery, or full CMT jobs.
2. **Capacity Providers (Specialized Workshops & Independent Cutters):** Sewing ateliers, specialized embroidery units, and cutting rooms offering machinery, tables, and skilled labor.

Per **ADR-012** and **ADR-018**, Waslat Worsh is **not** an external portal. It is built directly into GarmentOS Cloud, seamlessly converting awarded bids into factory `JobOrder` records and isolating customer fabric custody through `SubcontractingService`.

---

## 2. The 2 Core Marketplace Journeys

```mermaid
sequenceDiagram
    autonumber
    actor Seeker as Factory / Brand (Seeker)
    participant Waslat as Waslat Worsh Module
    actor Workshop as Subcontractor Workshop (Provider)
    participant ERP as GarmentOS Subcontracting Engine

    %% Journey 1: RFQ to Job Order
    Seeker->>Waslat: 1. Publish Cut & Make RFQ (Fabric specs, target pcs, deadline)
    Waslat->>Workshop: 2. Broadcast to verified workshops matching capability
    Workshop->>Waslat: 3. Submit Quotation / Bid (Price/pc, estimated days, sample pledge)
    Seeker->>Waslat: 4. Review bids, negotiate & Accept Winning Bid
    Waslat->>ERP: 5. Auto-generate JobOrder (SubcontractingService::createJob)
    Seeker->>ERP: 6. Issue CustomerMaterialReceipt (Custody fabric intake)
    Workshop->>ERP: 7. Execute production, dispatch bundles & track transit
    Seeker->>ERP: 8. Accept JobDeliveryNote, reconcile scrap, post JobInvoice
    Waslat->>Seeker: 9. Record platform commission (2-5%) & prompt mutual review
```

---

## 3. Database Schema Design

```mermaid
erDiagram
    workshop_profiles ||--o{ rfq_bids : submits
    tenants ||--o{ workshop_profiles : owns
    tenants ||--o{ rfqs : publishes
    rfqs ||--o{ rfq_bids : receives
    rfq_bids ||--o| job_orders : converts_to
    rfqs ||--o{ rfq_attachments : contains
    workshop_profiles ||--o{ workshop_reviews : receives
    tenants ||--o{ marketplace_commissions : incurs

    workshop_profiles {
        uuid id PK
        uuid tenant_id FK
        string workshop_name
        string specialty_type
        integer active_machines_count
        integer daily_capacity_pieces
        string city
        string address
        string phone
        string contact_person
        boolean is_verified
        decimal rating_average
        integer completed_jobs_count
        timestamps created_at
    }

    rfqs {
        uuid id PK
        uuid tenant_id FK
        string title
        string rfq_number UK
        string service_type
        text specifications
        integer target_quantity
        date expected_delivery_date
        decimal max_budget_per_piece
        string fabric_responsibility
        string status
        uuid awarded_bid_id FK
        timestamps created_at
    }

    rfq_bids {
        uuid id PK
        uuid rfq_id FK
        uuid workshop_profile_id FK
        decimal unit_rate
        integer promised_lead_days
        text notes
        string status
        uuid converted_job_order_id FK
        timestamps created_at
    }

    marketplace_commissions {
        uuid id PK
        uuid rfq_id FK
        uuid rfq_bid_id FK
        uuid job_order_id FK
        decimal commission_rate
        decimal commission_amount
        string status
        timestamps created_at
    }

    workshop_reviews {
        uuid id PK
        uuid workshop_profile_id FK
        uuid rfq_id FK
        uuid author_tenant_id FK
        integer rating_quality
        integer rating_punctuality
        integer rating_communication
        text comment
        timestamps created_at
    }
```

---

## 4. Anti-Abuse, Moderation & Commission Lifecycle

1. **Anti-Collusion & Verification:** Workshop profiles must be verified by Platform Admins (`is_verified = true`) before bidding on high-volume commercial RFQs.
2. **Double-Counting Prevention:** An awarded `rfq_bid` stores `converted_job_order_id`. Any subsequent conversion attempt is rejected idempotently.
3. **Transparent Commission Engine:** On job confirmation, platform commissions (e.g. 2.5% of CMT labor value) are recorded in `marketplace_commissions` and billed on the tenant's monthly subscription invoice.
4. **Verified Ratings:** Only tenants who completed a genuine `JobDeliveryNote` on an awarded RFQ can submit a review.

