from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import uuid
import shutil
from pydantic import BaseModel


from .database import get_db
from .models import (
    User,
    Workspace,
    Channel,
    Message,
    Idea,
    CalendarEvent,
    HiddenMessage,
    ChannelMember
)
from .schemas import (
    UserCreate,
    UserResponse,
    Token,
    LoginRequest,
    WorkspaceCreate,
    WorkspaceResponse,
    ChannelCreate,
    ChannelResponse,
    MessageCreate,
    MessageResponse,
    IdeaResponse,
    IdeaUpdate,
    CalendarEventResponse,
    ChannelMemberResponse,
)
from .auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from .ideas_service import IdeasService
from .calendar_service import CalendarService
from .ai_assistant import AIAssistant
from .file_text_extractor import extract_text_from_file
from .upload import UPLOAD_DIR

# --- Router Initialization ---
router = APIRouter()

# --- Helper Request Models ---

class ForwardRequest(BaseModel):
    """Body used by /messages/{id}/forward"""
    target_channel_id: Optional[uuid.UUID] = None
    target_channel_name: Optional[str] = None


# ============ FILE UPLOAD SETUP ============

BASE_DIR = Path(__file__).resolve().parent.parent

# ============ AUTH ROUTES ============

@router.post("/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        name=user_data.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # 1. Query for the user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    # 2. Check if user exists OR if the hash is missing (defensive check added)
    if not user or not user.password_hash:
        # Raise 401 for incorrect email or password. 
        # Returning a generic message is standard security practice.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # 3. Verify the password
    # NOTE: The crash is often inside verify_password if its dependencies (e.g., bcrypt) 
    # are missing or misconfigured.
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # 4. Create the access token
    # NOTE: The crash is also common inside create_access_token if the JWT SECRET_KEY 
    # or ALGORITHM environment variables are missing.
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ============ WORKSPACE ROUTES ============

@router.post("/workspaces", response_model=WorkspaceResponse)
def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = Workspace(name=workspace_data.name)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    current_user.workspace_id = workspace.id
    db.commit()

    return workspace


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


# ============ CHANNEL ROUTES ============

# This is the corrected and definitive version of create_channel
@router.post("/workspaces/{workspace_id}/channels", response_model=ChannelResponse)
def create_channel(
    workspace_id: uuid.UUID,
    channel_data: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    channel = Channel(
        workspace_id=workspace_id,
        name=channel_data.name,
        description=channel_data.description,
        is_public=channel_data.is_public, 
        created_by=current_user.id, 
        member_count=1 # Creator is the first member
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    
    # Add creator as admin member
    member = ChannelMember(
        channel_id=channel.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    
    return channel


@router.get("/workspaces/{workspace_id}/channels", response_model=List[ChannelResponse])
def list_channels(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List channels the user is a member of"""
    # Get channel IDs user is a member of
    member_channel_ids = db.query(ChannelMember.channel_id).filter(
        ChannelMember.user_id == current_user.id
    ).subquery()
    
    channels = (
        db.query(Channel)
        .filter(
            Channel.workspace_id == workspace_id,
            Channel.id.in_(member_channel_ids)
        )
        .order_by(desc(Channel.last_message_at))
        .all()
    )
    
    for channel in channels:
        channel.is_member = True
    
    return channels


# ============ FILE UPLOAD & DOWNLOAD ROUTES ============

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        contents = await file.read()
        file_size = len(contents)

        # Corrected Max Size to 50MB (50 * 1024 * 1024 bytes)
        max_size = 50 * 1024 * 1024 
        if file_size > max_size:
            raise HTTPException(
                status_code=400, detail="File size must be less than 50MB"
            )

        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename

        with file_path.open("wb") as buffer:
            buffer.write(contents)

        file_url = f"/uploads/{unique_filename}"

        print(f"✅ File uploaded: {file.filename} -> {file_url}")

        return {
            "file_url": file_url,
            "file_name": file.filename, 
            "file_size": file_size,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

@router.get("/download/{stored_name}")
def download_file(
    stored_name: str,
    db: Session = Depends(get_db),
):
    """
    Public download endpoint.
    stored_name is the UUID filename: e.g. d577cbb3-....pdf
    """
    print("🔍 DOWNLOAD REQUEST FOR:", stored_name)
    print("📂 UPLOAD_DIR BEING USED:", UPLOAD_DIR)

    file_path = UPLOAD_DIR / stored_name
    print("📄 FULL FILE PATH CHECKED:", file_path)

    if not file_path.exists():
        print("❌ FILE NOT FOUND ON DISK")
        raise HTTPException(status_code=404, detail="File not found")

    msg = (
        db.query(Message)
        .filter(Message.file_url == f"/uploads/{stored_name}")
        .first()
    )
    # Safely handle the case where msg might be None
    download_name = msg.file_name if (msg and msg.file_name) else stored_name

    print("✅ FILE FOUND — SENDING:", download_name)

    return FileResponse(
        path=str(file_path),
        filename=download_name,
        media_type="application/octet-stream",
    )


# ============ MESSAGE ROUTES ============

@router.post("/channels/{channel_id}/messages", response_model=MessageResponse)
def create_message(
    channel_id: uuid.UUID,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    now = datetime.now()

    print(f"[MESSAGE] Creating: '{(message_data.content or '')[:50]}'")
    if message_data.file_url:
        print(
            f"[MESSAGE] With file: url={message_data.file_url}, name={message_data.file_name}"
        )

    msg = Message(
        channel_id=channel_id,
        user_id=current_user.id,
        content=message_data.content,
        status_tag=message_data.status_tag,
        parent_message_id=message_data.parent_message_id,
        file_url=message_data.file_url,
        file_type=message_data.file_type,
        file_name=message_data.file_name,
        created_at=now,
        updated_at=now,
    )

    db.add(msg)
    channel.last_message_at = now
    db.commit()
    db.refresh(msg)

    # Note: user_name assignment requires `user_name` to be a hybrid_property 
    # or schema field that's not mapped to the DB.
    msg.user_name = current_user.name 

    try:
        if msg.content:
            # Assumes AIAssistant is correctly imported and configured
            ai_result = AIAssistant.process_message(msg.content)
            if ai_result.get("is_idea"):
                msg.ai_processed = True
                msg.ai_suggestions = {
                    "is_idea": True,
                    "category": ai_result.get("category"),
                    "priority": ai_result.get("priority"),
                    "tags": ai_result.get("tags"),
                    "score": ai_result.get("score"),
                }
                db.commit()
    except Exception as e:
        print(f"[AI_ERROR] {e}")

    return msg


@router.get("/channels/{channel_id}/messages", response_model=List[MessageResponse])
def list_messages(
    channel_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print(f"[MESSAGES] Fetching for channel: {channel_id}")

    hidden_ids_subq = db.query(HiddenMessage.message_id).filter(
        HiddenMessage.user_id == current_user.id
    )

    messages = (
        db.query(Message)
        .filter(
            Message.channel_id == channel_id,
            Message.id.notin_(hidden_ids_subq), # Using notin_ for cleaner readability
        )
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    print(f"[MESSAGES] Found {len(messages)} messages")

    for message in messages:
        user = db.query(User).filter(User.id == message.user_id).first()
        message.user_name = user.name if user else "Unknown"

    return messages


@router.patch("/messages/{message_id}/pin")
def pin_message(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_pinned = True
    db.commit()
    return {"pinned": True}


@router.post("/messages/{message_id}/reactions")
def add_reaction(
    message_id: uuid.UUID,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"success": True}


# ----- DELETE MESSAGE (EVERYONE) -----


@router.delete("/messages/{message_id}", status_code=204)
def delete_message_for_everyone(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not allowed to delete this message"
        )

    db.delete(message)
    db.commit()
    return Response(status_code=204)


# ----- DELETE MESSAGE (ONLY ME) -----


@router.delete("/messages/{message_id}/me", status_code=204)
def delete_message_for_me(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    exists = (
        db.query(HiddenMessage)
        .filter(
            HiddenMessage.user_id == current_user.id,
            HiddenMessage.message_id == message_id,
        )
        .first()
    )

    if not exists:
        db.add(HiddenMessage(user_id=current_user.id, message_id=message_id))
        db.commit()

    return Response(status_code=204)


# ---------- FORWARD MESSAGE ----------


@router.post("/messages/{message_id}/forward", response_model=MessageResponse)
def forward_message(
    message_id: uuid.UUID,
    req: ForwardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Forward a message to another channel."""
    original = db.query(Message).filter(Message.id == message_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Message not found")

    source_channel = db.query(Channel).filter(
        Channel.id == original.channel_id
    ).first()
    if not source_channel:
        raise HTTPException(
            status_code=404, detail="Source channel not found for message"
        )

    target_channel = None

    if req.target_channel_id:
        target_channel = (
            db.query(Channel)
            .filter(Channel.id == req.target_channel_id)
            .first()
        )
    elif req.target_channel_name:
        target_channel = (
            db.query(Channel)
            .filter(
                Channel.workspace_id == source_channel.workspace_id,
                Channel.name == req.target_channel_name,
            )
            .first()
        )

    if not target_channel:
        raise HTTPException(
            status_code=404,
            detail="Target channel not found (check the name or id)",
        )

    now = datetime.now()

    new_message = Message(
        channel_id=target_channel.id,
        user_id=current_user.id,
        content=original.content,
        status_tag=original.status_tag,
        parent_message_id=None,
        file_url=original.file_url,
        file_type=original.file_type,
        file_name=original.file_name,
        created_at=now,
        updated_at=now,
    )

    db.add(new_message)
    target_channel.last_message_at = now
    db.commit()
    db.refresh(new_message)

    new_message.user_name = current_user.name
    return new_message


# ============ IDEAS ROUTES ============


@router.post("/messages/{message_id}/convert-to-idea", response_model=IdeaResponse)
def convert_message_to_idea(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Convert a message (and its attached file, if any) into an Idea."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    text_parts: List[str] = []

    if message.content:
        text_parts.append(message.content)

    if message.file_url:
        filename = Path(message.file_url).name
        file_path = UPLOAD_DIR / filename

        if file_path.exists():
            file_text = extract_text_from_file(file_path, message.file_type)
            if file_text:
                text_parts.append(file_text)
        else:
            print(f"[CONVERT_TO_IDEA] File not found on disk: {file_path}")

    combined_text = "\n\n".join(text_parts).strip()

    if not combined_text:
        raise HTTPException(
            status_code=400, detail="No text available to create an idea"
        )

    message.content = combined_text
    db.commit()
    db.refresh(message)

    idea = IdeasService.create_idea_from_message(db, message_id)
    if not idea:
        raise HTTPException(
            status_code=500, detail="Failed to create idea from message"
        )

    return idea


@router.get("/workspaces/{workspace_id}/ideas", response_model=List[IdeaResponse])
def get_ideas(
    workspace_id: uuid.UUID,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filters = {
        "status": status,
        "category": category,
        "priority": priority,
    }
    ideas = IdeasService.get_all_ideas(db, workspace_id, filters)
    return ideas


@router.patch("/ideas/{idea_id}", response_model=IdeaResponse)
def update_idea(
    idea_id: uuid.UUID,
    update_data: IdeaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(idea, key, value)

    if update_data.deadline:
        CalendarService.update_event_from_idea(db, idea)
        if not idea.calendar_event_id:
            IdeasService.create_calendar_event(db, idea)

    db.commit()
    db.refresh(idea)
    return idea


# ============ CALENDAR ROUTES ============


@router.get(
    "/workspaces/{workspace_id}/calendar", response_model=List[CalendarEventResponse]
)
def get_calendar_events(
    workspace_id: uuid.UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = CalendarService.get_events(db, workspace_id, start_date, end_date)
    return events


# ============ AI SUGGESTIONS ROUTE ============


@router.post("/messages/{message_id}/ai-process")
def process_message_with_ai(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    try:
        ai_result = AIAssistant.process_message(message.content, {})

        message.ai_processed = True
        message.ai_suggestions = {
            "is_idea": ai_result.get("is_idea"),
            "category": ai_result.get("category"),
            "priority": ai_result.get("priority"),
            "tags": ai_result.get("tags"),
            "score": ai_result.get("score"),
        }

        db.commit()

        return {
            "processed": True,
            "suggestions": message.ai_suggestions,
            "should_convert_to_idea": ai_result.get("is_idea", False),
        }
    except Exception as e:
        print(f"[AI_PROCESS_ERROR] {e}")
        raise HTTPException(status_code=500, detail="AI processing failed")


# ============ CHANNEL CLEAR / DELETE ROUTES ============


@router.post("/channels/{channel_id}/clear", status_code=204)
def clear_channel_for_me(
    channel_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all messages in this channel as 'hidden' for the current user."""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    message_ids = db.query(Message.id).filter(Message.channel_id == channel_id).all()

    for (mid,) in message_ids:
        exists = (
            db.query(HiddenMessage)
            .filter(
                HiddenMessage.user_id == current_user.id,
                HiddenMessage.message_id == mid,
            )
            .first()
        )
        if not exists:
            db.add(HiddenMessage(user_id=current_user.id, message_id=mid))

    db.commit()
    return Response(status_code=204)


@router.delete("/channels/{channel_id}", status_code=204)
def delete_channel(
    channel_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a channel for everyone."""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # 1. Authorization Check (Keep this)
    # The logic here assumes a user can only delete a channel in their own workspace.
    if current_user.workspace_id and current_user.workspace_id != channel.workspace_id:
        raise HTTPException(
            status_code=403, detail="Not allowed to delete this channel"
        )
    
    # ----------------------------------------------------------------------
    # 2. RESOLVE FOREIGN KEY REFERENCES (users.channel_id)
    # ----------------------------------------------------------------------
    # This step is necessary because the 'users' table references 'channels'.
    # This assumes you have run the migration to make users.channel_id NULLABLE.
    db.query(User).filter(User.channel_id == channel_id).update(
        {User.channel_id: None}, 
        synchronize_session=False
    )
    
    # NOTE: No commit here yet. We must maintain atomicity.
    # ----------------------------------------------------------------------
    # 3. CASCADE DELETION VIA BULK OPERATIONS
    # ----------------------------------------------------------------------
    
    # Identify Messages associated with the channel (Used for Ideas/HiddenMessages)
    message_ids_subq = (
        db.query(Message.id)
        .filter(Message.channel_id == channel_id)
        .subquery()
    )

    # Identify Ideas associated with those messages
    idea_ids_subq = (
        db.query(Idea.id)
        .filter(Idea.message_id.in_(message_ids_subq))
        .subquery()
    )

    # Delete Calendar Events linked to Ideas
    db.query(CalendarEvent).filter(
        CalendarEvent.idea_id.in_(idea_ids_subq)
    ).delete(synchronize_session=False)

    # Delete Ideas
    db.query(Idea).filter(
        Idea.id.in_(idea_ids_subq)
    ).delete(synchronize_session=False)

    # Delete Hidden Messages (references messages that are about to be deleted)
    db.query(HiddenMessage).filter(
        HiddenMessage.message_id.in_(message_ids_subq)
    ).delete(synchronize_session=False)
    
    # Delete Channel Memberships (references the channel being deleted)
    db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id
    ).delete(synchronize_session=False)

    # Delete Messages (references the channel being deleted)
    db.query(Message).filter(
        Message.channel_id == channel_id
    ).delete(synchronize_session=False)
    
    # ----------------------------------------------------------------------
    # 4. FINAL DELETION & COMMIT (The entire block executes as one transaction)
    # ----------------------------------------------------------------------
    
    # Delete the Channel object itself
    db.delete(channel) 
    
    # Commit all changes at once
    db.commit()

    return Response(status_code=204)


# ============ PUBLIC CHANNEL DISCOVERY ============

@router.get("/channels/discover", response_model=List[ChannelResponse])
def discover_channels(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Discover public channels (search and browse)"""
    query = db.query(Channel).filter(Channel.is_public == True)
    
    if search:
        query = query.filter(Channel.name.ilike(f"%{search}%"))
    
    channels = query.order_by(desc(Channel.member_count)).limit(50).all()
    
    # Check if user is already a member of each channel
    for channel in channels:
        is_member = db.query(ChannelMember).filter(
            ChannelMember.channel_id == channel.id,
            ChannelMember.user_id == current_user.id
        ).first() is not None
        channel.is_member = is_member
    
    return channels


@router.post("/channels/{channel_id}/join")
def join_channel(
    channel_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a public channel"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    if not channel.is_public:
        raise HTTPException(status_code=403, detail="This channel is private")
    
    # Check if already a member
    existing = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == current_user.id
    ).first()
    
    if existing:
        return {"message": "Already a member", "channel_id": str(channel_id)}
    
    # Add user as member
    member = ChannelMember(
        channel_id=channel_id,
        user_id=current_user.id,
        role="member"
    )
    db.add(member)
    db.flush() 

    # Update member count (correctly counts the membership we just added)
    channel.member_count = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id
    ).count()
    
    db.commit()
    
    return {"message": "Joined successfully", "channel_id": str(channel_id)}


@router.post("/channels/{channel_id}/leave", status_code=204)
def leave_channel(
    channel_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Leave a channel"""
    # Retrieve channel object (REQUIRED to access attributes like created_by)
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is the creator
    if channel.created_by == current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Channel creator cannot leave. Delete the channel instead."
        )
    
    # Remove membership
    member = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == current_user.id
    ).first()
    
    if member:
        db.delete(member)
        db.flush()  # Apply deletion to the session before counting

        # Update member count (correctly counts the remaining members)
        channel.member_count = db.query(ChannelMember).filter(
            ChannelMember.channel_id == channel_id
        ).count()
        
        db.commit()
    
    return Response(status_code=204)


@router.get("/channels/{channel_id}/members", response_model=List[ChannelMemberResponse])
def get_channel_members(
    channel_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all members of a channel"""
    # Check if user is a member
    is_member = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this channel")
    
    members = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id
    ).all()
    
    # Add user names
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        member.user_name = user.name if user else "Unknown"
    
    return members