from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
import uuid

# ---------------- USER ----------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    workspace_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

# ---------------- AUTH ----------------

class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ---------------- WORKSPACE ----------------

class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

# ---------------- CHANNEL ----------------

class ChannelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True  # NEW


class ChannelResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_public: bool
    created_by: Optional[uuid.UUID] = None
    member_count: int
    last_message_at: Optional[datetime] = None
    is_member: Optional[bool] = None  # NEW - indicates if current user is a member
    
    class Config:
        from_attributes = True


class ChannelMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# ---------------- MESSAGE ----------------

class MessageCreate(BaseModel):
    content: Optional[str] = None
    status_tag: Optional[str] = None
    parent_message_id: Optional[uuid.UUID] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None  # ✅ NEW: Original filename
    type: Optional[str] = "text"


class MessageResponse(BaseModel):
    id: uuid.UUID
    channel_id: uuid.UUID
    user_id: uuid.UUID
    content: Optional[str] = None
    status_tag: Optional[str] = None
    parent_message_id: Optional[uuid.UUID] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None  # ✅ NEW: Original filename
    is_pinned: bool
    delivery_status: str
    ai_processed: bool
    ai_suggestions: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# ---------------- IDEA ----------------

class IdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    deadline: Optional[datetime] = None


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    scheduled_for: Optional[datetime] = None


class IdeaResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: str
    deadline: Optional[datetime] = None
    ai_score: Optional[int] = None
    ai_tags: Optional[List[str]] = None
    ai_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ---------------- CALENDAR ----------------

class CalendarEventResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    idea_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True