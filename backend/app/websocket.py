from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import uuid

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel_id: uuid.UUID):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, channel_id: uuid.UUID):
        if channel_id in self.active_connections:
            try:
                self.active_connections[channel_id].remove(websocket)
                if not self.active_connections[channel_id]:
                    del self.active_connections[channel_id]
            except ValueError:
                pass
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    async def broadcast_to_channel(self, message: dict, channel_id: uuid.UUID, exclude: WebSocket = None):
        """
        Broadcast message to all connections in a channel
        exclude: Don't send to this connection (usually the sender)
        """
        if channel_id not in self.active_connections:
            return
        
        message_json = json.dumps(message, default=str)
        disconnected = []
        
        for connection in self.active_connections[channel_id]:
            # Skip the sender if exclude is specified
            if exclude and connection == exclude:
                continue
                
            try:
                await connection.send_text(message_json)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn, channel_id)

manager = ConnectionManager()

@router.websocket("/channel/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: str):
    print(f"🔵 WebSocket connection attempt for channel: {channel_id}")
    
    try:
        # Validate channel_id is a valid UUID
        channel_uuid = uuid.UUID(channel_id)
        print(f"✅ Valid UUID: {channel_uuid}")
    except ValueError as e:
        print(f"❌ Invalid channel ID: {channel_id}, error: {e}")
        await websocket.close(code=1008, reason="Invalid channel ID")
        return
    
    await manager.connect(websocket, channel_uuid)
    print(f"✅ WebSocket connected for channel: {channel_uuid}")
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "channel_id": str(channel_uuid)
        }))
        print(f"📤 Welcome message sent")
        
        while True:
            try:
                data = await websocket.receive_text()
                print(f"📩 Received data: {data}")
                
                # Parse JSON message
                try:
                    message_data = json.loads(data)
                    print(f"✅ Valid JSON received: {message_data.get('type')}")
                    
                    # Broadcast to all OTHER users (exclude sender)
                    # This prevents the sender from seeing duplicate messages
                    await manager.broadcast_to_channel(
                        message_data, 
                        channel_uuid,
                        exclude=websocket  # ✅ CRITICAL: Don't send back to sender
                    )
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Invalid JSON: {e}")
                    await websocket.send_text(json.dumps({
                        "error": "Invalid JSON", 
                        "received": data
                    }))
                    
            except WebSocketDisconnect:
                print(f"🔴 WebSocket disconnected normally")
                break
            except Exception as inner_e:
                print(f"❌ Error in message loop: {inner_e}")
                import traceback
                traceback.print_exc()
                break
                
    except WebSocketDisconnect:
        print(f"🔴 WebSocket disconnected for channel: {channel_uuid}")
    except Exception as e:
        print(f"💥 WebSocket error for channel {channel_uuid}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect(websocket, channel_uuid)
        print(f"🧹 Cleaned up connection for channel: {channel_uuid}")