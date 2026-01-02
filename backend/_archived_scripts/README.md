# Archived Scripts

This folder contains one-time scripts that have already been executed and are no longer needed for daily operations. They are kept for reference and potential future use.

## Directory Structure

```
_archived_scripts/
├── db_init/          # Database initialization scripts
├── db_migrations/    # Database migration scripts
└── tests/            # Test and debug scripts
```

## db_init/

Database table creation scripts. These were run once during initial project setup.

| Script | Purpose |
|--------|---------|
| `init_db.py` | Initialize SQLAlchemy base tables |
| `create_yif_tables.py` | Create YIF payment system tables (ious, payments, logs) |
| `create_yif_users_table.py` | Create YIF users table with default users |
| `create_yif_workers_table.py` | Create YIF workers table with bcrypt passwords |
| `create_collection_tables.py` | Create collection system tables |
| `create_pdf_template_table.py` | Create PDF template table with default templates |
| `create_qff_tables.py` | Create QFF travel system tables |
| `create_accounting_tables.py` | Create accounting system tables |

## db_migrations/

Database schema migration scripts. These were run to update existing tables.

| Script | Purpose |
|--------|---------|
| `add_author_column.py` | Add author field to collection_items |
| `add_is_visible_column.py` | Add is_visible field to messages |
| `add_quote_column.py` | Add quote_id field for reply feature |
| `add_yif_indexes.py` | Add performance indexes for YIF tables |
| `add_yif_rls.py` | Add row-level security for YIF tables |
| `add_yif_user.py` | Old user creation script (replaced by add_yif_worker.py) |
| `sync_templates.py` | Sync PDF templates to API |
| `sync_qff_data.py` | Sync QFF travel data from YAML files |

## tests/

Test and debug scripts used during development.

| Script | Purpose |
|--------|---------|
| `test_api.py` | Test Collection API single record query |
| `test_collection.py` | Test Collection API (Chinese version) |
| `test_collection_simple.py` | Test Collection API (simplified) |
| `check_author.py` | Check author data in collection_items |

## Active Tools (kept in root)

The following scripts are still in the backend root directory as they may be needed for ongoing operations:

- `add_yif_worker.py` - Add new YIF system users
- `migrate_pickle_to_postgres.py` - Migrate data from pickle files
- `migrate_passwords_to_bcrypt.py` - Migrate passwords to bcrypt hash
