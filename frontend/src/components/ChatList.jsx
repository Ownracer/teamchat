import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { channelAPI } from '../services/api';
import { ChannelDiscovery } from './ChannelDiscovery';  // ✅ ADD THIS IMPORT

export const ChatList = ({
  channels,
  selectedChannel,
  onChannelSelect,
  onCreateChannel,
  onChannelDeleted,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDiscovery, setShowDiscovery] = useState(false);  // ✅ ADD THIS
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChannel = async (name, description, isPublic) => {  // ✅ ADD isPublic parameter
    const workspaceId = localStorage.getItem('workspaceId');
    try {
      await channelAPI.create(workspaceId, name, description, isPublic);  // ✅ PASS isPublic
      if (onCreateChannel) onCreateChannel();
      setShowNewChannel(false);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    setIsDeleting(true);

    try {
      await channelAPI.delete(channelId);
      setShowDeleteConfirm(null);

      if (onChannelDeleted) {
        onChannelDeleted(channelId);
      }

      if (onCreateChannel) {
        onCreateChannel();
      }
    } catch (error) {
      console.error('❌ Error deleting channel:', error);
      const msg =
        error?.response?.data?.detail ||
        error.message ||
        'Failed to delete channel';
      alert(`Failed to delete channel: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-teal-600 text-white">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">TeamChat</h1>
          <div className="flex gap-2">
            {/* ✅ ADD THIS: Discover Channels Button */}
            <button
              onClick={() => setShowDiscovery(true)}
              className="p-2 hover:bg-teal-700 rounded-full"
              title="Discover channels"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            
            <button
              onClick={() => setShowNewChannel(true)}
              className="p-2 hover:bg-teal-700 rounded-full"
              title="Create new channel"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-teal-700 text-white placeholder-teal-300 focus:outline-none"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-teal-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChannels.map((channel) => (
          <div
            key={channel.id}
            className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b transition-colors ${
              selectedChannel?.id === channel.id ? 'bg-gray-100' : ''
            }`}
          >
            {/* Channel Content - Clickable */}
            <button
              onClick={() => {
                onChannelSelect(channel);
              }}
              className="flex-1 flex items-center gap-3 text-left"
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-lg font-semibold text-white flex-shrink-0">
                {channel.name.charAt(0).toUpperCase()}
              </div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 truncate">
                    {channel.name}
                  </span>
                  {channel.last_message_at && (
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDistanceToNow(
                        new Date(channel.last_message_at),
                        { addSuffix: false }
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {channel.description || 'No messages yet'}
                  </p>
                  {channel.unread_count > 0 && (
                    <span className="ml-2 bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {channel.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(channel);
              }}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
              title="Delete channel"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}

        {filteredChannels.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-semibold mb-2">No channels found</p>
            <p className="text-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Create a new channel to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {/* ✅ ADD THIS: Channel Discovery Modal */}
      {showDiscovery && (
        <ChannelDiscovery
          onClose={() => setShowDiscovery(false)}
          onChannelJoined={() => {
            if (onCreateChannel) onCreateChannel();
            setShowDiscovery(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Delete Channel?
              </h3>
            </div>

            <p className="text-gray-600 mb-2">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">
                #{showDeleteConfirm.name}
              </strong>
              ?
            </p>
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-6">
              ⚠️ This will permanently delete all messages, ideas, and calendar
              events in this channel. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteChannel(showDeleteConfirm.id)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Channel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ UPDATED: NewChannelModal with Public/Private Checkbox
const NewChannelModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);  // ✅ ADD THIS
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onCreate(name, description, isPublic);  // ✅ PASS isPublic
      setName('');
      setDescription('');
      setIsPublic(true);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold mb-4">Create New Channel</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., general, marketing"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              disabled={isCreating}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              rows="3"
              disabled={isCreating}
            />
          </div>

          {/* ✅ ADD THIS: Public/Private Checkbox */}
          <div className="mb-6">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                disabled={isCreating}
              />
              <div className="flex-1">
                <span className="block text-sm font-medium text-gray-900">
                  🌐 Public Channel
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  {isPublic 
                    ? 'Anyone can discover and join this channel'
                    : '🔒 Private - Only invited members can join'}
                </span>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};