import React, { useState, useEffect } from 'react';
import { channelAPI } from '../services/api';
import { X, Search, Users, Lock } from 'lucide-react';

export const ChannelDiscovery = ({ onClose, onChannelJoined }) => {
  const [channels, setChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningChannelId, setJoiningChannelId] = useState(null);

  useEffect(() => {
    loadChannels();
  }, [searchQuery]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await channelAPI.discover(searchQuery);
      setChannels(response.data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId) => {
    setJoiningChannelId(channelId);
    try {
      await channelAPI.join(channelId);
      
      // Update local state
      setChannels(channels.map(ch => 
        ch.id === channelId ? { ...ch, is_member: true } : ch
      ));
      
      // Notify parent to refresh channel list
      if (onChannelJoined) {
        onChannelJoined();
      }
      
      alert('Joined channel successfully!');
    } catch (error) {
      console.error('Error joining channel:', error);
      alert('Failed to join channel');
    } finally {
      setJoiningChannelId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Discover Channels</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
              Searching...
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No channels found</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {channel.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {channel.name}
                            {!channel.is_public && (
                              <Lock size={16} className="text-gray-400" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Users size={14} />
                            {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      {channel.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {channel.description}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      {channel.is_member ? (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          ✓ Joined
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinChannel(channel.id)}
                          disabled={joiningChannelId === channel.id}
                          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
                        >
                          {joiningChannelId === channel.id ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                              Joining...
                            </div>
                          ) : (
                            'Join'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};