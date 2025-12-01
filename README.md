# TeamChat MVP - WhatsApp/Telegram Style with AI Integration

A modern team chat application with WhatsApp/Telegram-inspired UI, AI-powered idea detection, and smart calendar integration.

## 🚀 Features

### Design
- ✅ WhatsApp-style chat list with avatars and unread badges
- ✅ Telegram-style chat bubbles with delivery status (✓, ✓✓)
- ✅ Mobile-first bottom navigation
- ✅ Teal color scheme (#14B8A6)

### AI Features (Background)
- ✅ Auto-detects ideas from messages
- ✅ Smart categorization (blog, social, campaign, event)
- ✅ Priority scoring (High/Medium/Low)
- ✅ Deadline extraction from natural language
- ✅ AI viability score (1-10)
- ✅ Action suggestions

### Ideas Hub 💡
- ✅ Unified view of ALL ideas from ALL channels
- ✅ Visual cards with colors, emojis, tags
- ✅ Smart filters (status, category, priority)
- ✅ One-click convert messages to ideas
- ✅ AI insights (score, tags, summary)

### Smart Calendar 📅
- ✅ Auto-creates events from deadlines
- ✅ Linked to ideas (click event → see idea)
- ✅ Visual month view
- ✅ Color-coded by category
- ✅ Emoji titles (📝 Blog, 📱 Social, 🚀 Campaign, 📅 Event)

## 📁 Project Structure

```
teamchat-mvp/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── routes.py
│   │   ├── websocket.py
│   │   ├── ai_assistant.py
│   │   ├── calendar_service.py
│   │   └── ideas_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
└── docker-compose.yml
```

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or use Docker)
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
cd teamchat-mvp

# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Run database migrations (if using Alembic)
# alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teamchat
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
OPENAI_API_KEY=optional-openai-api-key
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🎯 Usage

1. **Register/Login**: Create an account or login
2. **Create Workspace**: Automatically created on first login
3. **Create Channels**: Add channels for different topics
4. **Send Messages**: Chat in channels
5. **Convert to Ideas**: Click "💡 Make Idea" on any message
6. **View Ideas Hub**: See all ideas from all channels
7. **Calendar**: View auto-created events from deadlines

## 🤖 AI Features

The AI assistant automatically:
- Detects ideas in messages (keywords: "idea", "suggestion", "what if")
- Categorizes content (blog, social, campaign, event)
- Extracts deadlines ("by Friday", "in 3 days", "next week")
- Calculates priority and viability scores
- Suggests next actions

## 🛣️ Roadmap

- [ ] Real-time WebSocket updates
- [ ] Push notifications
- [ ] File uploads and previews
- [ ] Voice messages
- [ ] OpenAI integration for better AI
- [ ] Google Calendar sync
- [ ] Mobile apps (React Native)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

