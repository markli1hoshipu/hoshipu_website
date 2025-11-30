# Email Signature Feature - Implementation Plan

**Objective**: Email signature management with logo support and size controls - auto-appended to AI-generated CRM/Lead emails.

**Effort**: 16-18 hours | **Complexity**: Medium-High

---

## 🎯 CURRENT STATE

**Email Flow**: CRM + Lead Gen use OpenAI to generate emails ending with "Regards," (no signature)
**Key Files**: `email_service/generation/prompt_builder.py` (LINE 213), `email_service/data/fetchers.py`, `routers/email_router.py`
**Database**: `employee_info` table lacks signature fields

---

## 📐 PHASE 1: Database Migration

**File**: `prelude/prelude-user-settings/migrations/add_email_signature.sql`

```sql
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS email_signature TEXT;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_logo_url TEXT;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_font_size INTEGER DEFAULT 12;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_logo_height INTEGER DEFAULT 50;

COMMENT ON COLUMN employee_info.email_signature IS 'Signature text, max 500 chars';
COMMENT ON COLUMN employee_info.signature_logo_url IS 'Logo image URL path';
COMMENT ON COLUMN employee_info.signature_font_size IS 'Font size (px), 8-20';
COMMENT ON COLUMN employee_info.signature_logo_height IS 'Logo height (px), 30-100';

CREATE INDEX IF NOT EXISTS idx_employee_info_email_signature ON employee_info(email) WHERE email_signature IS NOT NULL;
```

**Run**: `psql -h 35.193.231.128 -U postgres -d prelude_user_analytics < add_email_signature.sql`

---

## 📐 PHASE 2: Backend API (✅ IMPLEMENTED)

**File**: `prelude/prelude-user-settings/src/routers/signature_router.py` (EXISTS)

**Key Components**:
- **Logo storage**: Google Cloud Storage (GCS) bucket `prelude-signature-logos`
- **URL format**: Full GCS URLs like `https://storage.googleapis.com/prelude-signature-logos/signatures/user_timestamp.png`
- Models: `SignatureRequest`, `SignatureResponse`, `LogoUploadResponse`
- Database: Postgres `employee_info` table

**Endpoints**:

```python
@router.post("/upload-logo")  # Upload to GCS, return full GCS URL
@router.post("/")              # Save signature + logo URL + sizes to employee_info
@router.get("/")               # Fetch signature data (all 4 fields)
@router.delete("/")            # Clear signature + logo (sets to NULL)
```

**Key SQL** (POST endpoint):
```sql
UPDATE employee_info
SET email_signature = %s, signature_logo_url = %s,
    signature_font_size = %s, signature_logo_height = %s,
    updated_at = CURRENT_TIMESTAMP
WHERE email = %s
RETURNING email, email_signature, signature_logo_url, signature_font_size, signature_logo_height, updated_at
```

**File**: `prelude/prelude-user-settings/main.py`

```python
from routers.signature_router import router as signature_router
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(signature_router, tags=["Email Signature"])
# Health check: "email_signature": True
```

---

## 📐 PHASE 3: Frontend UI

**File**: `prelude/frontend/src/pages/SettingsPage.jsx`

**Add Section**:
```javascript
{
    id: 'emailSignature',
    title: 'Email Signature',
    icon: FileSignature,
    description: 'Customize signature with logo'
}
```

**Component Features**:
- **State**: `signature`, `logoUrl`, `fontSize` (8-20), `logoHeight` (30-100)
- **Logo Upload**: Hidden file input + FormData upload to `/api/signature/upload-logo`
- **Text Input**: Textarea with 500 char limit + counter
- **Size Controls**: Range sliders for font size and logo height
- **Preview**: Live preview with `<img>` tag styled with `fontSize` and `logoHeight`
- **API Calls**: Load on mount (GET), save on click (POST), clear button

**Preview Rendering**:
```javascript
<div style={{fontSize: `${fontSize}px`}}>
    Regards,
    {logoUrl && <img src={`http://localhost:8005${logoUrl}`} style={{height: `${logoHeight}px`}} />}
    <div className="whitespace-pre-wrap">{signature}</div>
</div>
```

---

## 📐 PHASE 4: Email Generation Integration

**Strategy**: Post-processing approach (proven pattern from cosailor)
- LLM generates plain text email ending with "Regards,"
- After generation: fetch signature → format HTML → append to body
- Result: mixed plain text + HTML snippets (converted to full HTML at send-time)

---

### **Shared Utility** (Used by both CRM & Lead Gen)

**File**: `email_service/delivery/signature_formatter.py`

```python
import os
from typing import Optional

def fetch_employee_signature(user_email: str, db_connection) -> Optional[dict]:
    """Fetch signature fields from employee_info table"""
    result = db_connection.execute("""
        SELECT email_signature, signature_logo_url,
               signature_font_size, signature_logo_height
        FROM employee_info WHERE email = %s
    """, (user_email,))
    row = result.fetchone()
    if not row or not row[0]:  # No signature text
        return None
    return {
        'text': row[0],
        'logo_url': row[1],
        'font_size': row[2] or 12,
        'logo_height': row[3] or 50
    }

def format_signature_html(signature_data: dict) -> str:
    """Format signature as HTML snippet with inline styles"""
    parts = []
    font_size = signature_data.get('font_size', 12)

    # Wrap text in styled div
    text = signature_data['text'].replace('\n', '<br/>')
    parts.append(f'<div style="font-size: {font_size}px;">{text}</div>')

    # Add logo if present
    if signature_data.get('logo_url'):
        raw_logo_url = signature_data['logo_url']

        # Check if already a full URL (GCS or external)
        if raw_logo_url.startswith('http://') or raw_logo_url.startswith('https://'):
            logo_url = raw_logo_url  # Use GCS URL as-is
        else:
            # Relative path - prepend backend URL for local filesystem
            backend_url = os.getenv('USER_SETTINGS_URL', 'http://localhost:8005')
            logo_url = f"{backend_url}{raw_logo_url}"

        logo_height = signature_data.get('logo_height', 50)
        parts.append(
            f'<img src="{logo_url}" alt="Signature" '
            f'style="height: {logo_height}px; margin-top: 10px; display: block;" />'
        )

    return '\n'.join(parts)

def attach_signature_to_email(result: dict, user_email: str, db_connection) -> dict:
    """
    Post-process email result to append signature.
    Call AFTER LLM generation, BEFORE returning to frontend.
    """
    signature_data = fetch_employee_signature(user_email, db_connection)
    if not signature_data:
        return result  # No signature configured

    body = result['outreach_email']['body']
    signature_html = format_signature_html(signature_data)

    # Append signature (body is plain text, signature is HTML snippet)
    result['outreach_email']['body'] = f"{body}\n{signature_html}"

    return result
```

---

### **CRM Service** (`prelude/prelude-crm/`)

**File**: `routers/email_router.py`

```python
from email_service.delivery.signature_formatter import attach_signature_to_email

# In generate_email() endpoint (after line ~120):
result = await email_generation_manager.generate_email(...)

# POST-PROCESS: Attach signature
result = attach_signature_to_email(result, user_email, db_connection)

return result
```

---

### **Lead Gen Service** (`prelude/lead_gen/`)

**File**: `routers/email_router.py`

```python
from email_service.signature_formatter import attach_signature_to_email

# In generate_email() endpoint (after email generation):
result = await email_generation_manager.generate_email(...)

# POST-PROCESS: Attach signature
result = attach_signature_to_email(result, user_email, db_connection)

return result
```

---

## 📊 FILES IMPACTED

**New (4)**:
1. `migrations/add_email_signature.sql`
2. `prelude-user-settings/src/routers/signature_router.py`
3. `prelude-user-settings/uploads/signatures/` (auto-created)
4. `prelude-crm/email_service/signature_formatter.py` (shared by CRM & Lead Gen)

**Modified (3)**:
1. `prelude-user-settings/main.py` - Mount static files, register router
2. `prelude-crm/routers/email_router.py` - Add post-processing call
3. `prelude/lead_gen/routers/email_router.py` - Add post-processing call

---

## ✅ TESTING

**Backend**:
- [ ] Upload logo → file saved, URL returned
- [ ] Save signature → all 4 fields stored in DB
- [ ] Get signature → returns complete data
- [ ] Delete → clears all fields
- [ ] Logo accessible at `/uploads/signatures/{filename}`

**Email Generation**:
- [ ] With logo → Body ends with mixed plain text + HTML signature (includes `<img>` tag)
- [ ] Without logo → Body ends with styled text signature
- [ ] No signature configured → Body ends with "Regards," only (no append)
- [ ] Font size + logo height render correctly in preview
- [ ] Signature appended AFTER LLM generation (not in prompt)

**Frontend**:
- [ ] Upload logo → preview updates
- [ ] Size sliders → preview updates in real-time
- [ ] Save → persists on reload
- [ ] Clear → removes all data

**Edge Cases**:
- [ ] Non-image upload → rejected
- [ ] >500 char signature → rejected
- [ ] No employee_info record → 404

---

## 🚀 DEPLOYMENT

```bash
# 1. Migration
psql -h 35.193.231.128 -U postgres -d prelude_user_analytics < add_email_signature.sql

# 2. Create uploads dir
mkdir -p prelude/prelude-user-settings/uploads/signatures

# 3. Restart services
cd prelude/prelude-user-settings && python main.py &
cd prelude/prelude-crm && python main.py &
cd prelude/lead_gen && python main.py &
cd prelude/frontend && npm run dev

# 4. Test
curl http://localhost:8005/health  # Check email_signature: true
# Upload logo, set sizes, generate email, verify HTML signature
```

---

## ⚠️ RISKS & ROLLBACK

| Risk | Mitigation | Rollback |
|------|-----------|----------|
| HTML breaks email clients | Test Gmail, Outlook, Apple Mail | Revert to plaintext |
| Logo upload fails | File validation, size limits | Users skip logo |
| Signature not fetched | Graceful fallback (no append) | Remove post-processing call |
| Static files not served | Check StaticFiles mount | Fix main.py mount |
| DB query fails | Try-catch with logging | Email generates without signature |

**Rollback**: Remove `attach_signature_to_email()` calls from email routers. Keep DB columns and files (no data loss).

---

## 📝 KEY DECISIONS

- **Post-processing approach** - signature appended AFTER LLM generation (not in prompt)
- **Mixed format output** - plain text body + HTML signature snippets (cosailor pattern)
- **GCS storage (production)** - logos in `prelude-signature-logos` bucket, full URLs stored
- **Filesystem fallback (local dev)** - relative paths prepended with `USER_SETTINGS_URL`
- **Smart URL handling** - detects GCS URLs (starts with http/https) vs filesystem paths
- **Size ranges** - font 8-20px, logo 30-100px
- **DB storage** - full GCS URLs or relative filesystem paths
- **Graceful degradation** - if signature fetch fails, email generates without it

**Production Ready**:
- ✅ GCS integration complete (no filesystem dependencies)
- ✅ CDN-backed logo delivery
- ✅ No StaticFiles mounting needed
- ⚠️ Requires GCS bucket permissions and credentials

---

## 🎯 IMPLEMENTATION NOTES

**Phase 4 Approach**:
- Based on **cosailor-copperstate** production-proven pattern
- Shared `signature_formatter.py` utility used by both CRM and Lead Gen
- Simpler than prompt-engineering: LLM doesn't see signature, we append it
- Cleaner separation: email generation vs signature formatting

**Benefits**:
- ✅ Consistent HTML output (no LLM variability)
- ✅ Easier to debug and test
- ✅ Faster rollback (just remove post-processing call)
- ✅ DRY principle (one formatter for both services)

---

**ESTIMATE**: 14-16 hours | **COMPLEXITY**: Medium

**END OF PLAN** 🚀
