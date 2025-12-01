import React, { useState, useEffect } from 'react';
import { messageAPI } from '../services/api';
import { Download, FileText, File as FileIcon } from 'lucide-react';

const FILE_BASE_URL = 'http://localhost:8000';
const MAX_REPLY_CHARS = 80;
const MAX_FILENAME_CHARS = 40;

function getFullFileUrl(fileUrl) {
  if (!fileUrl) return null;

  // extract only stored UUID filename
  const storedName = fileUrl.split('/').pop();

  // IMPORTANT: route through backend download API
  return `http://localhost:8000/api/v1/download/${storedName}`;
}



export const MessageBubble = ({
  message,
  isOwnMessage,
  onReply,
  replyTarget,
  onJumpToMessage,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');
  const isOwn = !!isOwnMessage;

  useEffect(() => {
    const updateTime = () => {
      setTimeAgo(formatTimestamp(message.created_at));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [message.created_at]);

  const getStatusIcon = () => {
    const icons = { sent: '✓', delivered: '✓✓', read: '✓✓' };
    return icons[message.delivery_status] || '';
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'just now';
      const messageDate = new Date(timestamp);
      const now = new Date();
      if (isNaN(messageDate.getTime())) return 'just now';

      const diffMs = now - messageDate;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 10) return 'just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'just now';
    }
  };

  const handleConvertToIdea = async () => {
    try {
      await messageAPI.convertToIdea(message.id);
      alert('Converted to idea! Check Ideas Hub 💡');
    } catch (error) {
      console.error('Error converting to idea:', error);
      alert('Failed to convert to idea');
    }
  };

  const renderFileContent = () => {
    if (!message.file_url) return null;

    const fileType = message.file_type || '';
    const fileName = message.file_name || 'File';
    const fullUrl = getFullFileUrl(message.file_url);
    if (!fullUrl) return null;

    // === image preview ===
    if (fileType.startsWith('image/')) {
      return (
        <div className="mt-2">
          <img
            src={fullUrl}
            alt={fileName}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => window.open(fullUrl, '_blank')}
          />
        </div>
      );
    }

    // === video preview ===
    if (fileType.startsWith('video/')) {
      return (
        <div className="mt-2">
          <video controls className="max-w-xs rounded-lg" src={fullUrl} />
        </div>
      );
    }

    // === audio preview ===
    if (fileType.startsWith('audio/')) {
      return (
        <div className="mt-2">
          <audio controls className="max-w-xs">
            <source src={fullUrl} type={fileType} />
          </audio>
        </div>
      );
    }

    // === other files (pdf, docx, etc.) -> use /download/<stored_name> ===
    const storedName = message.file_url.split('/').pop(); // e.g. "35afdb0f-....docx"
    const downloadUrl = `http://localhost:8000/api/v1/download/${storedName}`;

    const shortName =
      fileName.length > MAX_FILENAME_CHARS
        ? fileName.slice(0, MAX_FILENAME_CHARS) + '…'
        : fileName;

    return (
      <a
        href={downloadUrl}
        className={`mt-2 flex items-center gap-2 p-3 rounded-lg border ${
          isOwn ? 'bg-teal-600 border-teal-400' : 'bg-gray-50 border-gray-200'
        } hover:opacity-80 transition-opacity`}
      >
        {fileType.includes('pdf') ? (
          <FileText size={24} className={isOwn ? 'text-white' : 'text-red-500'} />
        ) : (
          <FileIcon size={24} className={isOwn ? 'text-white' : 'text-gray-500'} />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              isOwn ? 'text-white' : 'text-gray-900'
            }`}
          >
            {shortName}
          </p>
          <p className={`text-xs ${isOwn ? 'text-teal-100' : 'text-gray-500'}`}>
            Click to download
          </p>
        </div>
        <Download size={18} className={isOwn ? 'text-white' : 'text-gray-500'} />
      </a>
    );
  };

  const renderReplyTarget = () => {
    if (!replyTarget) return null;

    const name = replyTarget.author?.name || replyTarget.user_name || 'Unknown user';
    let rawSnippet =
      replyTarget.content ||
      replyTarget.file_name ||
      '[attachment]';

    if (rawSnippet.length > MAX_REPLY_CHARS) {
      rawSnippet = rawSnippet.slice(0, MAX_REPLY_CHARS) + '…';
    }

    const handleClick = () => {
      if (onJumpToMessage && replyTarget.id) {
        onJumpToMessage(replyTarget.id);
      }
    };

    return (
      <div
        onClick={handleClick}
        className={`mb-2 px-2 py-1 rounded border-l-4 text-xs max-h-12 overflow-hidden cursor-pointer ${
          isOwn ? 'border-teal-200 bg-teal-600/40' : 'border-gray-300 bg-gray-100'
        } hover:opacity-90 transition`}
      >
        <p className="font-semibold truncate">Replying to {name}</p>
        <p className="truncate opacity-80">{rawSnippet}</p>
      </div>
    );
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwn
              ? 'bg-teal-500 text-white rounded-br-none'
              : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
          }`}
        >
          {renderReplyTarget()}

          {!isOwn && (
            <p className="text-xs font-semibold mb-1 text-teal-600">
              {message.author?.name || message.user_name || 'Unknown'}
            </p>
          )}

          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {renderFileContent()}

          {message.status_tag && (
            <div
              className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                isOwn ? 'bg-teal-600' : 'bg-gray-100'
              }`}
            >
              {message.status_tag === 'idea' && '💡'}
              {message.status_tag === 'in_progress' && '⚙️'}
              {message.status_tag === 'review' && '👀'}
              {message.status_tag === 'published' && '✅'}{' '}
              {message.status_tag}
            </div>
          )}

          <div
            className={`flex items-center gap-1 mt-1 text-xs ${
              isOwn ? 'text-teal-100 justify-end' : 'text-gray-500'
            }`}
          >
            <span>{timeAgo}</span>
            {isOwn && (
              <span className={message.delivery_status === 'read' ? 'text-blue-200' : ''}>
                {getStatusIcon()}
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2 mt-1 px-2">
            <button
              onClick={handleConvertToIdea}
              className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
            >
              💡 Make Idea
            </button>

            <button
              onClick={() => onReply && onReply(message)}
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              🔗 Reply
            </button>

            <button
              onClick={() => onForward && onForward(message)}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              📤 Forward
            </button>

            <button
              onClick={() => onDeleteForMe && onDeleteForMe(message)}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              🗑 Delete for me
            </button>

            {isOwn && (
              <button
                onClick={() => onDeleteForEveryone && onDeleteForEveryone(message)}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                🧨 Delete for everyone
              </button>
            )}

            {message.ai_suggestions?.is_idea && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded">
                AI: Detected Idea
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
