import React, { useEffect, useState } from 'react';

export const AIAssistant = ({ messages, onSuggest }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    analyzeMessages();
  }, [messages]);

  const analyzeMessages = () => {
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const recentMessages = messages.slice(-5);
      const detectedIdeas = recentMessages.filter(m => 
        m.content.toLowerCase().includes('idea') ||
        m.content.toLowerCase().includes('suggestion') ||
        m.content.toLowerCase().includes('what if')
      );

      const newSuggestions = [];

      if (detectedIdeas.length > 0) {
        newSuggestions.push({
          type: 'idea',
          text: `${detectedIdeas.length} potential ideas detected`,
          action: 'Convert to Ideas Hub'
        });
      }

      // Check for deadlines
      const hasDeadline = recentMessages.some(m =>
        m.content.toLowerCase().includes('deadline') ||
        m.content.toLowerCase().includes('due') ||
        m.content.toLowerCase().includes('by')
      );

      if (hasDeadline) {
        newSuggestions.push({
          type: 'calendar',
          text: 'Deadline mentioned - add to calendar?',
          action: 'Add to Calendar'
        });
      }

      // Suggest templates
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.content.toLowerCase().includes('blog')) {
          newSuggestions.push({
            type: 'template',
            text: 'Use Blog Post Template?',
            action: 'Apply Template'
          });
        }
      }

      setSuggestions(newSuggestions);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="bg-purple-50 border-t border-purple-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
          🤖
        </div>
        <div>
          <h3 className="text-sm font-semibold text-purple-900">AI Assistant</h3>
          <p className="text-xs text-purple-600">
            {isProcessing ? 'Analyzing conversation...' : 'Ready to help'}
          </p>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {suggestion.type === 'idea' && '💡'}
                {suggestion.type === 'calendar' && '📅'}
                {suggestion.type === 'template' && '📝'}
                <span className="text-sm text-gray-700">{suggestion.text}</span>
              </div>
              <button className="text-xs bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600">
                {suggestion.action}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-purple-600 text-center">
          No suggestions at the moment
        </p>
      )}
    </div>
  );
};

