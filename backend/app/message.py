# backend/app/messages.py

from fastapi import APIRouter
from typing import Any
import uuid

from .schemas import MessageCreate

router = APIRouter()

# This will become: /api/v1/channels/{channel_id}/messages
# if you include the router with prefix="/api/v1" in main.py

@router.post("/channels/{channel_id}/messages")
async def post_message(channel_id: uuid.UUID, payload: MessageCreate) -> dict[str, Any]:
    """
    Example payloads:

    Text message:
    {
        "type": "text",
        "content": "Hello there!"
    }

    File message:
    {
        "type": "file",
        "file_url": "/uploads/13a0e70f-db9a-4f4f-9325-0b4dcdfa2ae8.jpg",
        "file_type": "image/jpeg"
    }
    """

    # Make sure channel_id from path is set in the payload if needed
    if payload.channel_id is None:
        payload.channel_id = channel_id

    # TODO: save to DB or broadcast via WebSocket here

    return {
        "ok": True,
        "channel_id": str(channel_id),
        "message": payload.model_dump(),
    }
