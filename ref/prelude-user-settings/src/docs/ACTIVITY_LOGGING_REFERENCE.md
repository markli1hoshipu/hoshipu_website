# User Activity Logging Reference

## Overview

This document provides a comprehensive reference for all user activities being tracked across the Prelude Platform, specifically the CRM service. All activities are logged to the `prelude_user_analytics` PostgreSQL database using the `UserActivityLogger` service.

## Architecture

### Components

1. **UserActivityLogger** (`user_activity_logger.py`)
   - Core logging service that writes to PostgreSQL
   - Located in: `prelude/prelude-user-settings/`
   - Connects to: `prelude_user_analytics` database

2. **CRMActivityLogger** (`prelude/prelude-crm/utils/activity_logger.py`)
   - CRM-specific wrapper around UserActivityLogger
   - Provides convenience methods for CRM operations
   - Handles errors gracefully (non-blocking)

3. **Database Tables**
   - `user_activity_logs` - Individual activity records
   - `user_session_summaries` - Aggregated session data

### Database Schema

#### user_activity_logs Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_email | VARCHAR | User's email address |
| session_id | VARCHAR | Browser/WebSocket session ID |
| action_type | VARCHAR | Category: 'authentication', 'navigation', 'chat', **'crm'**, 'lead_generation', etc. |
| action_name | VARCHAR | Specific action performed |
| action_category | VARCHAR | Optional sub-category |
| page_url | VARCHAR | Frontend page/route |
| service_name | VARCHAR | Backend service (e.g., 'crm-service') |
| user_agent | VARCHAR | Browser/client information |
| ip_address | VARCHAR | User's IP address |
| action_data | JSONB | Additional data about the action |
| result_status | VARCHAR | 'success', 'error', 'pending', 'timeout' |
| result_data | JSONB | Results or error information |
| duration_ms | INTEGER | Time taken in milliseconds |
| tags | VARCHAR[] | Searchable tags |
| timestamp | TIMESTAMP | When the action occurred |
| created_at | TIMESTAMP | Record creation time |

---

## Logged Activities by Category

### 1. Customer Operations

All customer-related activities in the CRM.

#### 1.1 View All Customers
- **Action Type**: `crm`
- **Action Name**: `view_customers_list`
- **Entity Type**: `customer`
- **Triggered When**: User opens the customers list page
- **Action Data**:
  ```json
  {
    "customer_count": 50
  }
  ```
- **Page URL**: `/crm/customers`

#### 1.2 View Individual Customer
- **Action Type**: `crm`
- **Action Name**: `view_customer`
- **Entity Type**: `customer`
- **Entity ID**: Customer ID (e.g., "123")
- **Triggered When**: User views a customer profile
- **Page URL**: `/crm/customers/{customer_id}`

#### 1.3 Search Customers
- **Action Type**: `crm`
- **Action Name**: `search_customers`
- **Entity Type**: `customer`
- **Triggered When**: User searches for customers
- **Action Data**:
  ```json
  {
    "search_query": "acme corp",
    "results_count": 5
  }
  ```
- **Page URL**: `/crm/customers/search`

---

### 2. Deal Operations

All deal-related activities including CRUD operations and deal activities.

#### 2.1 View All Deals
- **Action Type**: `crm`
- **Action Name**: `view_deals_list`
- **Entity Type**: `deal`
- **Triggered When**: User opens the deals list page
- **Action Data**:
  ```json
  {
    "deal_count": 25
  }
  ```
- **Page URL**: `/crm/deals`

#### 2.2 View Individual Deal
- **Action Type**: `crm`
- **Action Name**: `view_deal`
- **Entity Type**: `deal`
- **Entity ID**: Deal ID (e.g., "456")
- **Triggered When**: User views a deal profile
- **Page URL**: `/crm/deals/{deal_id}`

#### 2.3 Create Deal
- **Action Type**: `crm`
- **Action Name**: `create_deal`
- **Entity Type**: `deal`
- **Entity ID**: New deal ID (e.g., "789")
- **Triggered When**: User creates a new deal
- **Action Data**:
  ```json
  {
    "deal_name": "Enterprise Contract",
    "value_usd": 50000.0,
    "client_id": 123
  }
  ```
- **Page URL**: `/crm/deals`

#### 2.4 Update Deal
- **Action Type**: `crm`
- **Action Name**: `update_deal`
- **Entity Type**: `deal`
- **Entity ID**: Deal ID being updated
- **Triggered When**: User modifies deal fields
- **Action Data**:
  ```json
  {
    "updated_fields": {
      "stage": "negotiation",
      "value_usd": "75000.0",
      "expected_close_date": "2025-12-31"
    }
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}`

#### 2.5 Delete Deal
- **Action Type**: `crm`
- **Action Name**: `delete_deal`
- **Entity Type**: `deal`
- **Entity ID**: Deleted deal ID
- **Triggered When**: User deletes a deal
- **Page URL**: `/crm/deals/{deal_id}`

#### 2.6 Create Deal Note
- **Action Type**: `crm`
- **Action Name**: `create_deal_note`
- **Entity Type**: `note`
- **Entity ID**: New note ID
- **Triggered When**: User adds a note to a deal
- **Action Data**:
  ```json
  {
    "deal_id": 456
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

#### 2.7 Delete Deal Note
- **Action Type**: `crm`
- **Action Name**: `delete_deal_note`
- **Entity Type**: `note`
- **Entity ID**: Deleted note ID
- **Triggered When**: User removes a note from a deal
- **Action Data**:
  ```json
  {
    "deal_id": 456
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

#### 2.8 Create Deal Call Summary
- **Action Type**: `crm`
- **Action Name**: `create_deal_call_summary`
- **Entity Type**: `interaction`
- **Entity ID**: New interaction ID
- **Triggered When**: User logs a call summary for a deal
- **Action Data**:
  ```json
  {
    "deal_id": 456,
    "type": "call"
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

#### 2.9 Delete Deal Call Summary
- **Action Type**: `crm`
- **Action Name**: `delete_deal_call_summary`
- **Entity Type**: `interaction`
- **Entity ID**: Deleted interaction ID
- **Triggered When**: User removes a call summary from a deal
- **Action Data**:
  ```json
  {
    "deal_id": 456,
    "type": "call"
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

#### 2.10 Create Deal Meeting
- **Action Type**: `crm`
- **Action Name**: `create_deal_meeting`
- **Entity Type**: `interaction`
- **Entity ID**: New interaction ID
- **Triggered When**: User schedules a meeting for a deal
- **Action Data**:
  ```json
  {
    "deal_id": 456,
    "type": "meeting",
    "meeting_title": "Quarterly Business Review"
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

#### 2.11 View Deal Activities
- **Action Type**: `crm`
- **Action Name**: `view_deal_activities`
- **Entity Type**: `deal`
- **Entity ID**: Deal ID
- **Triggered When**: User views all activities for a deal
- **Action Data**:
  ```json
  {
    "activities_count": 15
  }
  ```
- **Page URL**: `/crm/deals/{deal_id}/activities`

---

### 3. Email Operations

All email-related activities including generation and sending.

#### 3.1 Generate Email with AI
- **Action Type**: `crm`
- **Action Name**: `generate_email`
- **Entity Type**: `email`
- **Triggered When**: User generates an email using AI
- **Action Data**:
  ```json
  {
    "customer_id": 123,
    "email_type": "followup"
  }
  ```
- **Page URL**: `/crm/email/generate`

#### 3.2 Send Email
- **Action Type**: `crm`
- **Action Name**: `send_email`
- **Entity Type**: `email`
- **Triggered When**: User sends an email to a customer
- **Action Data**:
  ```json
  {
    "to_email": "customer@company.com",
    "subject": "Follow-up on our discussion",
    "customer_id": 123,
    "deal_id": 456,
    "method": "gmail_api_v2"
  }
  ```
- **Page URL**: `/crm/email/send`
- **Note**: `method` can be `gmail_api_v2`, `outlook_api_v2`, or `smtp`

---

### 4. Interaction Summary Operations

Activities related to AI-generated customer interaction summaries.

#### 4.1 Generate Interaction Summary
- **Action Type**: `crm`
- **Action Name**: `generate_interaction_summary`
- **Entity Type**: `summary`
- **Triggered When**: User generates an AI summary of customer interactions
- **Action Data**:
  ```json
  {
    "customer_id": 123,
    "days_back": 30,
    "agent_used": "NextActionInsightAgent",
    "interactions_analyzed": 15
  }
  ```
- **Page URL**: `/crm/customers/{customer_id}/summary`

#### 4.2 View Interaction Summary
- **Action Type**: `crm`
- **Action Name**: `view_interaction_summary`
- **Entity Type**: `summary`
- **Triggered When**: User views a cached interaction summary
- **Action Data**:
  ```json
  {
    "customer_id": 123,
    "from_cache": true
  }
  ```
- **Page URL**: `/crm/customers/{customer_id}/summary`

---

## Analytics & Querying

### Common Query Examples

#### 1. Get All Activities for a User
```sql
SELECT
    action_name,
    entity_type,
    action_data,
    result_status,
    timestamp
FROM user_activity_logs
WHERE user_email = 'user@company.com'
    AND action_type = 'crm'
ORDER BY timestamp DESC
LIMIT 100;
```

#### 2. Count Activities by Type
```sql
SELECT
    action_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN result_status = 'success' THEN 1 END) as success_count,
    COUNT(CASE WHEN result_status = 'error' THEN 1 END) as error_count
FROM user_activity_logs
WHERE action_type = 'crm'
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY action_name
ORDER BY total_count DESC;
```

#### 3. Get Most Active Users
```sql
SELECT
    user_email,
    COUNT(*) as activity_count,
    MAX(timestamp) as last_active
FROM user_activity_logs
WHERE action_type = 'crm'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY activity_count DESC
LIMIT 10;
```

#### 4. Track Customer Engagement
```sql
SELECT
    action_data->>'customer_id' as customer_id,
    COUNT(*) as view_count,
    array_agg(DISTINCT user_email) as users_who_viewed
FROM user_activity_logs
WHERE action_type = 'crm'
    AND action_name IN ('view_customer', 'view_deal')
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY action_data->>'customer_id'
ORDER BY view_count DESC;
```

#### 5. Email Activity Report
```sql
SELECT
    user_email,
    COUNT(CASE WHEN action_name = 'generate_email' THEN 1 END) as emails_generated,
    COUNT(CASE WHEN action_name = 'send_email' THEN 1 END) as emails_sent,
    COUNT(CASE WHEN action_name = 'send_email' AND action_data->>'method' = 'gmail_api_v2' THEN 1 END) as gmail_sent,
    COUNT(CASE WHEN action_name = 'send_email' AND action_data->>'method' = 'outlook_api_v2' THEN 1 END) as outlook_sent,
    COUNT(CASE WHEN action_name = 'send_email' AND action_data->>'method' = 'smtp' THEN 1 END) as smtp_sent
FROM user_activity_logs
WHERE action_type = 'crm'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY emails_sent DESC;
```

#### 6. Deal Pipeline Activity
```sql
SELECT
    DATE(timestamp) as date,
    COUNT(CASE WHEN action_name = 'create_deal' THEN 1 END) as deals_created,
    COUNT(CASE WHEN action_name = 'update_deal' THEN 1 END) as deals_updated,
    COUNT(CASE WHEN action_name = 'delete_deal' THEN 1 END) as deals_deleted,
    SUM(CASE
        WHEN action_name = 'create_deal'
        THEN CAST(action_data->>'value_usd' AS NUMERIC)
        ELSE 0
    END) as total_value_created
FROM user_activity_logs
WHERE action_type = 'crm'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## Integration Guide

### For New Services

To add activity logging to a new service:

1. **Install Dependencies**
   ```bash
   pip install psycopg2-binary
   ```

2. **Update .env File**
   ```env
   # Analytics Database Configuration
   ANALYTICS_DB_HOST=<your-db-host>
   ANALYTICS_DB_PORT=5432
   ANALYTICS_DB_USER=<your-db-user>
   ANALYTICS_DB_PASSWORD=<your-db-password>
   ANALYTICS_DB_NAME=prelude_user_analytics
   ```

3. **Import the Logger**
   ```python
   from prelude_user_settings.user_activity_logger import UserActivityLogger

   # Initialize
   logger = UserActivityLogger()
   ```

4. **Log Activities**
   ```python
   # Example: Log a custom action
   logger.log_activity(
       user_email="user@company.com",
       action_type="crm",  # or your service type
       action_name="custom_action",
       action_data={"key": "value"},
       result_status="success"
   )
   ```

### For CRM Service

The CRM service uses a centralized logger with convenience methods:

```python
from utils.activity_logger import crm_activity_logger

# Log customer view
crm_activity_logger.log_customer_view(
    user_email="user@company.com",
    customer_id=123,
    session_id="session-abc"
)

# Log deal creation
crm_activity_logger.log_deal_create(
    user_email="user@company.com",
    deal_id=456,
    deal_name="Enterprise Deal",
    value_usd=50000.0,
    client_id=123
)

# Log email send
crm_activity_logger.log_email_send(
    user_email="user@company.com",
    to_email="customer@company.com",
    subject="Follow-up",
    customer_id=123,
    method="gmail_api"
)
```

---

## Viewing Activity Logs

### Frontend Dashboard

Access the Usage Analytics dashboard at:
- **URL**: `http://localhost:8000/analytics`
- **API Endpoint**: `http://localhost:8005/api/analytics`

The dashboard displays:
- Total activities
- Activity breakdown by type
- Recent activities timeline
- Top visited pages
- Session summaries

### API Endpoints

#### Get Activity Summary
```http
GET /api/analytics/activities?user_email=user@company.com&days=7
```

#### Get Recent Activities
```http
GET /api/analytics/recent-activities?limit=50
```

#### Get Session Summaries
```http
GET /api/analytics/sessions?user_email=user@company.com
```

---

## Performance Considerations

### Logging Impact

- **Non-blocking**: Logging failures never break the main application flow
- **Async-safe**: All logging operations are synchronous but fast (<10ms typically)
- **Error handling**: Graceful degradation if database is unavailable

### Best Practices

1. **Session IDs**: Include session IDs when available for better user journey tracking
2. **Action Data**: Keep action_data JSON compact (< 1KB recommended)
3. **Batch Queries**: Use pagination when querying large result sets
4. **Indexes**: Database has indexes on `user_email`, `action_type`, `timestamp`

---

## Troubleshooting

### Common Issues

#### 1. Activities Not Appearing
- Check database connection in `.env`
- Verify `prelude_user_analytics` database exists
- Check service logs for logger errors
- Ensure user exists in `user_profiles` table

#### 2. Logger Initialization Fails
```python
# Check logs for:
# "UserActivityLogger: Database connection failed"
```
- Verify database credentials
- Check network connectivity to PostgreSQL host
- Ensure database is running

#### 3. Foreign Key Violations
```
IntegrityError: user_email must exist in user_profiles table
```
- Create user profile first:
```sql
INSERT INTO user_profiles (email, name, role)
VALUES ('user@company.com', 'User Name', 'admin');
```

---

## Activity Types Reference

### Current Action Types
- `authentication` - Login, logout, token refresh
- `navigation` - Page visits, route changes
- `chat` - Chat messages, AI interactions
- **`crm`** - All CRM operations (focus of this document)
- `lead_generation` - Lead search, scraping, enrichment
- `analytics` - Dashboard views, report generation
- `task_management` - Task CRUD operations
- `calendar` - Meeting scheduling, calendar sync
- `settings` - Configuration changes
- `upload` - File uploads
- `export` - Data exports

### Result Statuses
- `success` - Operation completed successfully
- `error` - Operation failed
- `pending` - Operation in progress
- `timeout` - Operation timed out

---

## Future Enhancements

### Planned Features

1. **Real-time Activity Streaming**
   - WebSocket notifications for live activity updates
   - Dashboard auto-refresh

2. **Advanced Analytics**
   - User behavior patterns
   - Activity heatmaps
   - Conversion funnel tracking

3. **Compliance & Audit**
   - GDPR data export
   - Activity retention policies
   - Audit trail reports

4. **Performance Metrics**
   - Response time tracking
   - Error rate monitoring
   - Usage trends

---

## Support

For questions or issues:
- **Documentation**: This file
- **Code**: `prelude/prelude-user-settings/user_activity_logger.py`
- **Database**: `prelude_user_analytics` on PostgreSQL
- **Service**: User Settings Service (Port 8005)

---

**Last Updated**: 2025-01-27
**Version**: 1.0
**Maintained By**: Prelude Platform Team
