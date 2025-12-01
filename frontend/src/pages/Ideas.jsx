import React, { useState, useEffect } from 'react';
import { ideasAPI } from '../services/api';
import { BottomNav } from '../components/BottomNav';

export const Ideas = () => {
  const [ideas, setIdeas] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const workspaceId = localStorage.getItem('workspaceId');

  useEffect(() => {
    loadIdeas();
  }, [filter]);

  const loadIdeas = async () => {
    try {
      const response = await ideasAPI.getAll(workspaceId, {
        status: filter !== 'all' ? filter : null
      });
      setIdeas(response.data);
    } catch (error) {
      console.error('Error loading ideas:', error);
    }
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      blog: '📝',
      social: '📱',
      campaign: '🚀',
      event: '📅'
    };
    return emojis[category] || '💡';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">💡 Ideas Hub</h1>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'idea', 'in_progress', 'review', 'published'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                filter === status
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All Ideas' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => setSelectedIdea(idea)}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getCategoryEmoji(idea.category)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(idea.priority)}`}>
                    {idea.priority}
                  </span>
                </div>
                {idea.ai_score && (
                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    AI Score: {idea.ai_score}/10
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {idea.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {idea.description}
              </p>

              {/* Tags */}
              {idea.ai_tags && idea.ai_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {idea.ai_tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{idea.category || 'general'}</span>
                {idea.deadline && (
                  <span className="flex items-center gap-1">
                    📅 {new Date(idea.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {ideas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💡</div>
            <p className="text-gray-500">No ideas yet. Convert messages to ideas!</p>
          </div>
        )}
      </div>

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={loadIdeas}
        />
      )}

      {/* Bottom Navigation - Mobile only */}
      <BottomNav />
    </div>
  );
};

const IdeaDetailModal = ({ idea, onClose, onUpdate }) => {
  const [status, setStatus] = useState(idea.status);
  const [deadline, setDeadline] = useState(
    idea.deadline ? new Date(idea.deadline).toISOString().slice(0, 16) : ''
  );

  const handleSave = async () => {
    try {
      const updateData = {
        status,
        deadline: deadline ? new Date(deadline).toISOString() : null
      };
      await ideasAPI.update(idea.id, updateData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating idea:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">{idea.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="idea">💡 Idea</option>
              <option value="in_progress">⚙️ In Progress</option>
              <option value="review">👀 Review</option>
              <option value="published">✅ Published</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-700 whitespace-pre-wrap">{idea.description}</p>
          </div>

          {idea.ai_summary && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">🤖 AI Summary</h4>
              <p className="text-sm text-purple-700">{idea.ai_summary}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

