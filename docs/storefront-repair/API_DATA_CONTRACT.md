# GarmentOS Cloud — Canonical Storefront API Data Contract

## 1. Specification Overview

- **Protocol**: RESTful HTTP / JSON over HTTPS
- **Base Route**: `/api/v1/storefront`
- **Tenant Scope Resolution**: Determined by custom domain, subdomain, or explicit route parameter (`/{tenantIdOrSlug}`). Never randomized or defaulted.
- **Contract Version**: `v1.2-canonical`

---

## 2. Canonical Public Storefront Envelope

### Endpoint: `GET /api/v1/storefront/public/{tenantIdOrSlug}`

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `preview` | `boolean` (0 or 1) | No | When `1`, returns draft configuration merged on top of published settings. |
| `wholesale_token` | `string` | No | Optional bearer token of an approved B2B wholesale customer. |

#### Canonical JSON Response Schema
```json
{
  "tenant": {
    "id": "01a14f55-ecd1-7056-98aa-fa5dd1aa9a3a",
    "name": "مصنع الدلتا للملابس الجاهزة",
    "code": "DELTA-GARMENTS",
    "subdomain": "delta-store",
    "custom_domain": null,
    "currency": "EGP"
  },
  "store_settings": {
    "id": "uuid",
    "tenant_id": "01a14f55-ecd1-7056-98aa-fa5dd1aa9a3a",
    "store_name": "مصنع الدلتا للملابس الجاهزة",
    "theme_id": "fashion_boutique",
    "theme_config": {
      "primary_color": "#0284c7",
      "secondary_color": "#0f172a",
      "accent_color": "#f43f5e",
      "font_family": "Cairo, sans-serif",
      "direction": "rtl",
      "announcement_bar_enabled": true,
      "announcement_bar_text": "شحن سريع لجميع المحافظات خلال 48 ساعة 🚚",
      "sections": [
        { "id": "hero", "name_ar": "البانر الرئيسي", "name_en": "Hero Banner", "enabled": true, "order": 1 },
        { "id": "trust_badges", "name_ar": "شارات الثقة والجودة", "name_en": "Trust Badges", "enabled": true, "order": 2 },
        { "id": "categories", "name_ar": "أقسام وتصنيفات الموديلات", "name_en": "Categories", "enabled": true, "order": 3 },
        { "id": "featured_products", "name_ar": "الموديلات الجاهزة للشحن", "name_en": "Featured Products", "enabled": true, "order": 4 },
        { "id": "promotions", "name_ar": "العروض والخصومات", "name_en": "Promotions", "enabled": true, "order": 5 },
        { "id": "wholesale_cta", "name_ar": "دعوة تجار الجملة", "name_en": "Wholesale CTA", "enabled": true, "order": 6 },
        { "id": "story", "name_ar": "قصة المصنع", "name_en": "Brand Story", "enabled": true, "order": 7 },
        { "id": "contact_info", "name_ar": "بيانات التواصل", "name_en": "Contact Info", "enabled": true, "order": 8 }
      ],
      "hero_banner": {
        "enabled": true,
        "title": "أرقى منتجات الملابس من المصنع مباشرة",
        "subtitle": "خامات قطنية 100%، تفصيل متقن، وضمان استبدال فوري.",
        "badge": "تشكيلة الموسم الجديد — جودة تصدير مباشرة",
        "cta_text": "تصفح التشكيلة الكاملة",
        "cta_destination": "shop",
        "desktop_image": "https://...",
        "mobile_image": "https://..."
      },
      "promo_banners": [
        {
          "id": "promo-1",
          "title": "خصم 20% على تشكيلة الصيف",
          "subtitle": "كود FACTORY20",
          "badge_text": "FACTORY20",
          "image_url": "https://...",
          "link_url": "shop",
          "enabled": true
        }
      ]
    },
    "is_store_enabled": true,
    "allow_cod": true,
    "allow_instapay": true,
    "currency": "EGP",
    "direction": "rtl"
  },
  "is_preview": false,
  "has_draft_changes": false,
  "available_themes": {},
  "products": [
    {
      "id": "01a14f61-f70a-711e-be2e-0501a924d888",
      "sku": "MOD-TSHIRT-1005-HDYTHY-OLAD-0-3M-ABYD-NASAA",
      "barcode": "6223970257402",
      "name": "تيشيرت بولو ولادي قطن صيفي",
      "model_name": "تيشيرت بولو ولادي قطن صيفي",
      "model_code": "MOD-TSHIRT-1005",
      "category": "أولادي صيفي",
      "description": "تيشيرت أطفال بياقة وأزرار كبس قطن 100%",
      "image": null,
      "image_url": null,
      "gallery": [],
      "size": "حديثي ولادة (0-3M)",
      "color": "أبيض ناصع",
      "price": 195.0,
      "in_stock": 49.0,
      "is_wholesale_eligible": true,
      "wholesale_price": 150.0,
      "moq": 12,
      "wholesale_tiers": []
    }
  ],
  "variants": [],
  "catalog": {
    "variants": [],
    "count": 28
  },
  "categories": [
    {
      "id": "أولادي صيفي",
      "name": "أولادي صيفي",
      "name_ar": "أولادي صيفي",
      "count": 28
    }
  ],
  "wholesale_user": null
}
```

---

## 3. Strict Inventory & Pricing Protection Rules

1. **Finished Goods Only**:
   Only items associated with an active `finished_goods` warehouse and active selling status are returned. Raw fabrics, threads, trims, and WIP batches are permanently quarantined from the public storefront API.
2. **Authoritative Wholesale Shield**:
   `wholesale_price`, `moq`, and `wholesale_tiers` are returned ONLY when `wholesale_token` is present and resolves to an approved wholesale merchant (`wholesale_status === 'approved'`). For unauthenticated or retail customers, wholesale price fields are omitted or hidden.
3. **Pessimistic Stock Validation on Checkout**:
   During `POST /api/v1/storefront/orders`, variant balances in `InventoryItem` are locked using `lockForUpdate()`. Available stock is strictly calculated as `current_balance - reserved_balance`. Orders exceeding available stock are rejected with HTTP 422.
