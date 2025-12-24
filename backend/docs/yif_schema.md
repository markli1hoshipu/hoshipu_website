# YIF Payment Management System - Database Schema

## Overview

YIF (欠条付款管理系统) uses PostgreSQL with Row Level Security (RLS) for data isolation.

## Tables

### 1. `yif_workers` (用户表)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| username | VARCHAR(100) | UNIQUE NOT NULL | Login username |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| display_name | VARCHAR(200) | | Display name |
| user_code | VARCHAR(10) | | User code (e.g., "QFF") |
| role | VARCHAR(50) | | Role: admin, manager, user |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_yif_workers_username` on `username`

---

### 2. `yif_ious` (欠条主表)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ious_id | VARCHAR(50) | UNIQUE NOT NULL | IOU ID (e.g., "QFF230811D01") |
| worker_id | INTEGER | NOT NULL, FK → yif_workers | Creator |
| user_code | VARCHAR(10) | NOT NULL | User code |
| ious_date | VARCHAR(6) | NOT NULL | Date in YYMMDD format |
| total_amount | DECIMAL(12,2) | NOT NULL DEFAULT 0 | Total amount |
| status | INTEGER | NOT NULL DEFAULT 0 | Payment status (see below) |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time (auto-updated) |

**Status Codes:**
| Code | Description |
|------|-------------|
| 0 | 未付款 (Unpaid) |
| 1 | 未付清 (Partially paid) |
| 2 | 已付清 (Fully paid) |
| 3 | 初始为负 (Initially negative) |
| 4 | 超额支付 (Overpaid) |

**Indexes:**
- `idx_yif_ious_worker_id` on `worker_id`
- `idx_yif_ious_ious_id` on `ious_id`
- `idx_yif_ious_date` on `ious_date`
- `idx_yif_ious_status` on `status`

---

### 3. `yif_iou_items` (欠条明细表)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ious_id | INTEGER | NOT NULL, FK → yif_ious (CASCADE) | Parent IOU |
| worker_id | INTEGER | FK → yif_workers | Creator (for RLS) |
| item_index | INTEGER | NOT NULL DEFAULT 0 | Item order within IOU |
| client | VARCHAR(200) | NOT NULL | Debtor client name |
| amount | DECIMAL(12,2) | NOT NULL | Amount |
| flight | VARCHAR(100) | | Flight segment |
| ticket_number | VARCHAR(100) | | Ticket number |
| remark | TEXT | | Remark |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Indexes:**
- `idx_yif_iou_items_ious_id` on `ious_id`
- `idx_yif_iou_items_worker_id` on `worker_id`
- `idx_yif_iou_items_client` on `client`
- `idx_yif_iou_items_ticket` on `ticket_number`

---

### 4. `yif_payments` (付款表)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ious_id | INTEGER | NOT NULL, FK → yif_ious (CASCADE) | Related IOU |
| worker_id | INTEGER | NOT NULL, FK → yif_workers | Creator |
| user_code | VARCHAR(10) | NOT NULL | Operator code |
| payment_date | VARCHAR(6) | NOT NULL | Date in YYMMDD format |
| payer_name | VARCHAR(200) | NOT NULL | Payer name |
| amount | DECIMAL(12,2) | NOT NULL | Payment amount |
| remark | TEXT | | Remark |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Indexes:**
- `idx_yif_payments_ious_id` on `ious_id`
- `idx_yif_payments_worker_id` on `worker_id`
- `idx_yif_payments_date` on `payment_date`
- `idx_yif_payments_payer` on `payer_name`

---

### 5. `yif_logs` (操作日志表)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| worker_id | INTEGER | FK → yif_workers | Operator |
| action | VARCHAR(50) | NOT NULL | Action type |
| target_type | VARCHAR(50) | | Target type: iou, payment, import |
| target_id | VARCHAR(100) | | Target ID |
| details | TEXT | | Additional details |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Action Types:**
- `create_iou` - Create IOU
- `update_iou` - Update IOU
- `delete_iou` - Delete IOU
- `create_payment` - Create payment
- `delete_payment` - Delete payment
- `import_ious` - Import IOUs from Excel
- `export_data` - Export data
- `login` - User login
- `logout` - User logout

**Indexes:**
- `idx_yif_logs_worker_id` on `worker_id`
- `idx_yif_logs_action` on `action`
- `idx_yif_logs_created_at` on `created_at`

---

## Row Level Security (RLS)

All YIF tables have RLS enabled with the following policies:

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| admin | All | All | All | All |
| manager | All | All | All | All |
| user | Own only | Own only | Own only | Own only |

**Usage in Python:**

```python
# Set user context before queries
cursor.execute("SELECT set_yif_user_context(%s, %s)", (user_id, role))

# Queries will automatically filter based on role
cursor.execute("SELECT * FROM yif_ious")  # Returns all for admin/manager, own for user
```

---

## Functions & Triggers

### Functions

| Function | Description |
|----------|-------------|
| `update_yif_updated_at()` | Auto-update `updated_at` timestamp |
| `calculate_iou_status(total, paid)` | Calculate IOU status code |
| `update_iou_status_on_payment()` | Update IOU status when payment changes |
| `set_yif_user_context(user_id, role)` | Set RLS context for current session |

### Triggers

| Trigger | Table | Event | Description |
|---------|-------|-------|-------------|
| `trigger_yif_ious_updated_at` | yif_ious | BEFORE UPDATE | Auto-update timestamp |
| `trigger_update_iou_status` | yif_payments | AFTER INSERT/UPDATE/DELETE | Auto-update IOU status |

---

## Entity Relationship Diagram

```
yif_workers (1) ──────────────────┬──── (N) yif_ious
     │                            │
     │                            └──── (N) yif_iou_items
     │                            │
     │                            └──── (N) yif_payments
     │
     └──────────────────────────────── (N) yif_logs


yif_ious (1) ──┬── (N) yif_iou_items  [CASCADE DELETE]
               │
               └── (N) yif_payments   [CASCADE DELETE]
```

---

## Migration Scripts

| Script | Description |
|--------|-------------|
| `create_yif_workers_table.py` | Create workers table with default admin |
| `create_yif_tables.py` | Create ious, iou_items, payments, logs tables |
| `add_yif_rls.py` | Enable RLS and create policies |

---

## Notes

1. **Date Format**: All dates use `YYMMDD` format (e.g., "241220" for Dec 20, 2024)
2. **Cascade Delete**: Deleting an IOU will automatically delete its items and payments
3. **Auto Status Update**: IOU status is automatically calculated when payments change
4. **UNIQUE Constraint**: `ious_id` is unique, preventing duplicate imports (replaces import_id.txt)
