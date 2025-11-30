# Team Invitations Service

Dedicated backend service for managing team invitations and user profiles.

## Features

- User invitation management
- Team member listing by company
- User profile CRUD operations  
- Database routing based on user email
- CORS configured for frontend integration

## API Endpoints

- `GET /health` - Service health check
- `GET /api/invitations/user/{email}` - Get user and team invitations
- `GET /api/invitations/company/{company}` - Get company invitations
- `POST /api/invitations` - Create new invitation
- `PUT /api/invitations/{email}` - Update invitation
- `DELETE /api/invitations/{email}` - Delete invitation
- `GET /api/invitations/check/{email}` - Check if user exists

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run the service:
```bash
python run.py
# OR
cd src && python app.py
```

## Service Details

- **Port**: 8007 (configurable via PORT env var)
- **Database**: `prelude_user_analytics` on Google Cloud PostgreSQL
- **Table**: `user_profiles`
- **CORS**: Enabled for localhost:8000 and production frontend

## Integration

This service is integrated with:
- Frontend dashboard at `http://localhost:8000`
- Invitations page in the main application
- Database router for user-specific database selection