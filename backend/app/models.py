from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
# Ensure this import points to your base declarative class
from .database import Base 


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    avatar_url = Column(String(500))
    
    # Foreign keys
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    # NOTE: user.channel_id typically points to the user's *active* or *default* channel, 
    # not a direct membership. The many-to-many relationship is handled by ChannelMember.
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id"), nullable=True)
    
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships 
    workspace = relationship("Workspace", back_populates="members")
    
    # Relationship with Message - ensures one-to-many
    messages = relationship(
        "Message",
        back_populates="user",
        # Explicitly define the foreign key on the child table (Message)
        foreign_keys="[Message.user_id]"
    )
    ideas = relationship("Idea", back_populates="user")
    # Relationship for ChannelMembership
    channel_memberships = relationship("ChannelMember", back_populates="user")


class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    members = relationship("User", back_populates="workspace")
    channels = relationship("Channel", back_populates="workspace")
    calendar_events = relationship("CalendarEvent", back_populates="workspace")


class Channel(Base):
    __tablename__ = "channels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    avatar_url = Column(String(500))
    
    # Channel specific columns
    last_message_at = Column(DateTime)
    unread_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    member_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="channels")
    messages = relationship("Message", back_populates="channel")
    ideas = relationship("Idea", back_populates="channel")
    # Relationship to the User who created the channel
    creator = relationship("User", foreign_keys=[created_by])
    # Relationship for the many-to-many link via ChannelMember
    members = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) # Message author
    content = Column(Text, nullable=False)
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"))
    status_tag = Column(String(50))
    is_pinned = Column(Boolean, default=False)
    delivery_status = Column(String(20), default='sent')
    ai_processed = Column(Boolean, default=False)
    ai_suggestions = Column(JSON)
    
    # File columns
    file_url = Column(Text, nullable=True)
    file_type = Column(String, nullable=True)
    file_name = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    edited_at = Column(DateTime)

    # Relationships
    # user = message author (fixed Ambiguity by being explicit)
    user = relationship(
        "User", 
        back_populates="messages",
        foreign_keys=[user_id] # Specify the column on Message that links to User
    ) 
    channel = relationship("Channel", back_populates="messages")
    replies = relationship("Message", remote_side=[parent_message_id]) # Self-referential relationship
    ideas = relationship("Idea", back_populates="message")
    reactions = relationship("Reaction", back_populates="message")


class Reaction(Base):
    __tablename__ = "reactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    message = relationship("Message", back_populates="reactions")


class Idea(Base):
    __tablename__ = "ideas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"))
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50))
    status = Column(String(50), default='idea')
    priority = Column(String(20), default='medium')
    
    deadline = Column(DateTime)
    scheduled_for = Column(DateTime)
    calendar_event_id = Column(String(255))
    
    ai_score = Column(Integer)
    ai_tags = Column(JSON)
    ai_summary = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    message = relationship("Message", back_populates="ideas")
    channel = relationship("Channel", back_populates="ideas")
    user = relationship("User", back_populates="ideas")
    calendar_events = relationship("CalendarEvent", back_populates="idea")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    idea_id = Column(UUID(as_uuid=True), ForeignKey("ideas.id"))
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    reminder_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    workspace = relationship("Workspace", back_populates="calendar_events")
    idea = relationship("Idea", back_populates="calendar_events")


class HiddenMessage(Base):
    __tablename__ = "hidden_messages"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ChannelMember(Base):
    __tablename__ = "channel_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel", back_populates="members")
    user = relationship("User", back_populates="channel_memberships")