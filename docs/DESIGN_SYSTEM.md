# GarmentOS Cloud — Enterprise Design System Specification (v3.0)

## 1. Design Philosophy & Architectural Principles
GarmentOS Cloud is designed as a mission-critical industrial manufacturing ERP SaaS. The visual identity balances:
- **Enterprise Precision**: Dense, scan-friendly data layouts, clear tabular hierarchies, and predictable alignment.
- **Restrained Luxury Brand**: Royal Burgundy (`#7F1625`) serves as an authoritative brand anchor without overwhelming operational screens with decorative noise.
- **Editorial Typography**: Clear sans-serif typography (`Cairo` for Arabic, `Inter` for English) with strict exclusion of artificial letter-spacing on Arabic script.
- **Calm, High-Contrast Surfaces**: Eliminating washed-out grays and stark eye-straining contrast in favor of WCAG 2.2 AA compliant tokens.

---

## 2. Semantic Color System

### 2.1 Brand Tokens (Royal Burgundy Identity)
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--brand-primary` | `#7F1625` | `#9E2A3B` | Primary actions, key brand marks, active sidebar accent |
| `--brand-hover` | `#6A121E` | `#B8354A` | Interactive hover states on brand controls |
| `--brand-active` | `#540D17` | `#821E2E` | Pressed / active interactive states |
| `--brand-subtle` | `rgba(127, 22, 37, 0.08)` | `rgba(158, 42, 59, 0.18)` | Subtle highlights, active nav item background |
| `--brand-border` | `rgba(127, 22, 37, 0.20)` | `rgba(158, 42, 59, 0.35)` | Accent borders and active selection rings |

### 2.2 Surface & Canvas Tokens
| Token | Light Mode Value | Dark Mode Value | Contrast vs Text |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#F8FAFC` (Slate 50) | `#0B0F17` (Deep Obsidian) | 14.5:1 (Light) / 16.2:1 (Dark) |
| `--bg-surface` | `#FFFFFF` | `#111827` (Gray 900) | 18.2:1 (Light) / 14.8:1 (Dark) |
| `--bg-elevated` | `#FFFFFF` | `#1F2937` (Gray 800) | For popovers, dropdowns, and modals |
| `--bg-sidebar` | `#FFFFFF` | `#0F172A` (Slate 900) | Enterprise navigation sidebar |
| `--bg-muted` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | Secondary backgrounds, table headers |

### 2.3 Typography & Text Tokens
| Token | Light Mode Value | Dark Mode Value | WCAG 2.2 AA Compliance |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | 16.1:1 (Passes AAA) |
| `--text-secondary` | `#334155` (Slate 700) | `#CBD5E1` (Slate 300) | 9.8:1 (Passes AAA) |
| `--text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | 4.8:1 (Passes AA) |
| `--text-inverse` | `#FFFFFF` | `#0F172A` | For filled buttons & dark badges |

### 2.4 Border & Divider Tokens
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--border-subtle` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | Card borders, table dividers |
| `--border-strong` | `#CBD5E1` (Slate 300) | `#334155` (Slate 700) | Form input borders, panel separators |
| `--border-active` | `#7F1625` | `#9E2A3B` | Focused inputs, active tabs |

### 2.5 Operational Status Tokens
| Status | Text & Icon Color | Badge Background | Meaning |
| :--- | :--- | :--- | :--- |
| **Success** | `#059669` (Dark: `#34D399`) | `#ECFDF5` (Dark: `rgba(5, 150, 105, 0.20)`) | Completed, In Stock, Optimal, Verified |
| **Warning** | `#D97706` (Dark: `#FBBF24`) | `#FFFBEB` (Dark: `rgba(217, 119, 6, 0.20)`) | Pending Approval, In Progress, Reorder Level |
| **Danger** | `#DC2626` (Dark: `#F87171`) | `#FEF2F2` (Dark: `rgba(220, 38, 38, 0.20)`) | Critical Defect, Machine Down, Overdue |
| **Info** | `#2563EB` (Dark: `#60A5FA`) | `#EFF6FF` (Dark: `rgba(37, 99, 235, 0.20)`) | Scheduled, Draft, Informational |

---

## 3. Typography & RTL Rules

### 3.1 Arabic Typography Isolation
- **Rule**: `letter-spacing` (and Tailwind classes `tracking-tighter`, `tracking-tight`, `tracking-wide`, `tracking-wider`, `tracking-widest`) must **never** be applied to Arabic text.
- Arabic is a connected, cursive script; applying letter spacing breaks character glyph ligatures and results in fragmented text.
- All RTL elements have `letter-spacing: normal !important;` enforced at the stylesheet root.

### 3.2 Typographic Hierarchy
| Role | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | Cairo / Inter | 22px (`1.375rem`) | 800 (ExtraBold) | 1.25 |
| **Section Header** | Cairo / Inter | 16px (`1.000rem`) | 700 (Bold) | 1.35 |
| **Card / Widget Title** | Cairo / Inter | 14px (`0.875rem`) | 700 (Bold) | 1.40 |
| **Body Text** | Cairo / Inter | 13px (`0.8125rem`) | 500 (Medium) | 1.50 |
| **Table Cells & Labels**| Cairo / Inter | 12px (`0.750rem`) | 500 / 600 | 1.40 |
| **Mono Metrics** | JetBrains Mono | 20px - 28px | 800 (Bold) | 1.10 |
| **Metadata / Badges** | Cairo / Inter | 11px (`0.6875rem`) | 700 (Bold) | 1.20 |

---

## 4. Component Action Patterns

### 4.1 Primary & Secondary Actions
1. **Primary Action**: Exactly one per page or major modal (e.g., `+ أمر قص جديد`). Uses Royal Burgundy solid gradient with crisp border and subtle elevation.
2. **Secondary Action**: Bordered outline button with neutral hover state.
3. **Table Row Actions**: Replaced multiple text buttons with a unified `ActionsMenu` dropdown. Primary row action (e.g., "عرض التفاصيل") may be exposed as a compact icon button with tooltip.

---

## 5. Verification & WCAG Contrast Metrics
- Normal text contrast against `--bg-surface`: **16.1:1** (Target: ≥ 4.5:1) — **PASS**
- Large text / Headings contrast against `--bg-app`: **14.5:1** (Target: ≥ 3:1) — **PASS**
- Focus rings: 2px offset solid `#7F1625` with 3:1 boundary contrast — **PASS**
