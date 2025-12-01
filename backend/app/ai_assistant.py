from typing import Dict, List
from datetime import datetime, timedelta
import re

class AIAssistant:
    """AI Assistant that processes messages in the background"""
    
    @staticmethod
    def process_message(content: str, context: Dict = None) -> Dict:
        """Process message and extract insights"""
        if context is None:
            context = {}
            
        result = {
            'is_idea': False,
            'category': None,
            'priority': 'medium',
            'suggested_deadline': None,
            'tags': [],
            'summary': None,
            'score': 5
        }
        
        content_lower = content.lower()
        
        # Detect if it's an idea
        idea_keywords = ['idea', 'suggestion', 'proposal', 'what if', 'we could', "let's", "suppose", "consider", "what about", "how about", "what if we"]
        result['is_idea'] = any(keyword in content_lower for keyword in idea_keywords)
        
        # Detect category
        if any(word in content_lower for word in ['blog', 'article', 'post', 'write']):
            result['category'] = 'blog'
        elif any(word in content_lower for word in ['social', 'instagram', 'twitter', 'linkedin', 'reel']):
            result['category'] = 'social'
        elif any(word in content_lower for word in ['campaign', 'launch', 'promotion']):
            result['category'] = 'campaign'
        elif any(word in content_lower for word in ['event', 'webinar', 'meetup']):
            result['category'] = 'event'
        else :
            result['category'] = 'general'


        # Detect priority
        if any(word in content_lower for word in ['urgent', 'asap', 'critical', 'important']):
            result['priority'] = 'high'
            result['score'] >= 7
        elif any(word in content_lower for word in ['later', 'someday', 'maybe']):
            result['priority'] = 'low'
            result['score'] <= 5
        else:
            result['priority'] = 'medium'
        
        # Extract deadline from text
        deadline_patterns = [
            r'by (\w+ \d+)',
            r'deadline (\w+ \d+)',
            r'due (\w+ \d+)',
            r'in (\d+) days?',
            r'next (\w+)',
        ]
        
        for pattern in deadline_patterns:
            match = re.search(pattern, content_lower)
            if match:
                # Simple date parsing - in production use proper date parsing
                if 'next' in match.group(0):
                    result['suggested_deadline'] = datetime.utcnow() + timedelta(days=7)
                elif 'in' in match.group(0):
                    days_match = re.search(r'\d+', match.group(0))
                    if days_match:
                        days = int(days_match.group())
                        result['suggested_deadline'] = datetime.utcnow() + timedelta(days=days)
                else:
                    # Default to 7 days for "by [day]" patterns
                    result['suggested_deadline'] = datetime.utcnow() + timedelta(days=7)
                break
        
        # Extract tags
        hashtags = re.findall(r'#(\w+)', content)
        result['tags'] = hashtags if hashtags else [result['category']] if result['category'] else []
        
        # Generate summary (first 1000 chars for MVP)
        result['summary'] = content[:1000] + '...' if len(content) > 1000 else content
        
        # Calculate score based on various factors
        score = 0
        if result['is_idea']:
            score += 1
        if result['category']:
            score += 1
        if result['suggested_deadline']:
            score += 1
        if result['priority'] == 'high':
            score += 2
        if len(content) > 100:
            score += 1
        
        result['score'] = min(score, 10)  # Cap at 10
        
        return result
    
    @staticmethod
    def suggest_actions(idea: Dict) -> List[str]:
        """Suggest next actions based on idea"""
        suggestions = []
        
        if idea['category'] == 'blog':
            suggestions = [
                'Create outline',
                'Research keywords',
                'Write draft',
                'Review and edit',
                'Schedule publish'
            ]
        elif idea['category'] == 'social':
            suggestions = [
                'Design visuals',
                'Write caption',
                'Schedule post',
                'Track engagement'
            ]
        elif idea['category'] == 'campaign':
            suggestions = [
                'Define target audience',
                'Set budget',
                'Create timeline',
                'Design assets',
                'Launch campaign'
            ]
        elif idea['category'] == 'event':
            suggestions = [
                'Set date and venue',
                'Create agenda',
                'Send invitations',
                'Prepare materials',
                'Follow up after event'
            ]
        else:
            suggestions = [
                'Research',
                'Plan',
                'Execute',
                'Review'
            ]
        
        return suggestions
    
    @staticmethod
    def generate_calendar_title(idea_title: str, category: str) -> str:
        """Generate calendar event title"""
        emoji_map = {
            'blog': '📝',
            'social': '📱',
            'campaign': '🚀',
            'event': '📅'
        }
        emoji = emoji_map.get(category, '💡')
        return f"{emoji} {idea_title}"

