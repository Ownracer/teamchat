from sqlalchemy.orm import Session
from .models import CalendarEvent, Idea
from datetime import datetime
import uuid

class CalendarService:
    
    @staticmethod
    def get_events(
        db: Session,
        workspace_id: uuid.UUID,
        start_date: datetime = None,
        end_date: datetime = None
    ):
        """Get calendar events for a workspace"""
        query = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == workspace_id
        )
        
        if start_date:
            query = query.filter(CalendarEvent.start_time >= start_date)
        if end_date:
            query = query.filter(CalendarEvent.start_time <= end_date)
        
        return query.order_by(CalendarEvent.start_time).all()
    
    @staticmethod
    def update_event_from_idea(db: Session, idea: Idea):
        """Update calendar event when idea deadline changes"""
        if not idea.calendar_event_id:
            return None
        
        event = db.query(CalendarEvent).filter(
            CalendarEvent.id == idea.calendar_event_id
        ).first()
        
        if event and idea.deadline:
            event.start_time = idea.deadline
            event.end_time = idea.deadline
            db.commit()
            db.refresh(event)
            return event
        
        return None

