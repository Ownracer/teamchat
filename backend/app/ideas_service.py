from sqlalchemy.orm import Session
from .models import Idea, Message, CalendarEvent, Channel
from .ai_assistant import AIAssistant
from datetime import datetime
import uuid

class IdeasService:
    
    @staticmethod
    def create_idea_from_message(db: Session, message_id: uuid.UUID) -> Idea:
        """Convert a message into an idea"""
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return None
        
        # Process with AI
        ai_result = AIAssistant.process_message(message.content, {})
        
        idea = Idea(
            message_id=message.id,
            channel_id=message.channel_id,
            user_id=message.user_id,
            title=ai_result['summary'],
            description=message.content,
            category=ai_result['category'],
            status='idea',
            priority=ai_result['priority'],
            deadline=ai_result['suggested_deadline'],
            ai_score=ai_result['score'],
            ai_tags=ai_result['tags'],
            ai_summary=ai_result['summary']
        )
        
        db.add(idea)
        
        # Update message
        message.ai_processed = True
        message.ai_suggestions = {
            'actions': AIAssistant.suggest_actions(ai_result),
            'detected_category': ai_result['category'],
            'priority': ai_result['priority']
        }
        
        db.commit()
        db.refresh(idea)
        
        # Create calendar event if deadline exists
        if idea.deadline:
            IdeasService.create_calendar_event(db, idea)
        
        return idea
    
    @staticmethod
    def create_calendar_event(db: Session, idea: Idea) -> CalendarEvent:
        """Create calendar event from idea"""
        # Get channel to access workspace_id
        channel = db.query(Channel).filter(Channel.id == idea.channel_id).first()
        if not channel:
            return None
        
        event = CalendarEvent(
            workspace_id=channel.workspace_id,
            idea_id=idea.id,
            title=AIAssistant.generate_calendar_title(idea.title, idea.category or 'idea'),
            description=idea.description,
            start_time=idea.deadline,
            end_time=idea.deadline
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        # Update idea with calendar event ID
        idea.calendar_event_id = str(event.id)
        db.commit()
        
        return event
    
    @staticmethod
    def get_all_ideas(db: Session, workspace_id: uuid.UUID, filters: dict = None):
        """Get all ideas across channels with filters"""
        query = db.query(Idea).join(Channel).filter(
            Channel.workspace_id == workspace_id
        )
        
        if filters:
            if filters.get('status'):
                query = query.filter(Idea.status == filters['status'])
            if filters.get('category'):
                query = query.filter(Idea.category == filters['category'])
            if filters.get('priority'):
                query = query.filter(Idea.priority == filters['priority'])
        
        return query.order_by(Idea.created_at.desc()).all()

