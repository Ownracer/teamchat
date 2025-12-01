// frontend/src/pages/Chats.jsx
import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { BottomNav } from '../components/BottomNav';
import { channelAPI } from '../services/api';

export const Chats = () => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showChatList, setShowChatList] = useState(true);

  const workspaceId = localStorage.getItem('workspaceId');

  useEffect(() => {
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChannels = async () => {
    if (!workspaceId) return;

    try {
      const response = await channelAPI.list(workspaceId);
      const list = response.data || [];
      setChannels(list);

      // auto-select first channel if nothing selected
      if (list.length > 0 && !selectedChannel) {
        setSelectedChannel(list[0]);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setShowChatList(false); // on mobile, hide list when a chat is opened
  };

  // called whenever a channel is deleted (from sidebar or chat header)
  const handleChannelDeleted = (channelId) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));

    if (selectedChannel && selectedChannel.id === channelId) {
      setSelectedChannel(null);
      setShowChatList(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: channel list */}
        <div
          className={`${
            showChatList ? 'block' : 'hidden'
          } md:block w-full md:w-96 bg-white border-r`}
        >
          <ChatList
            channels={channels}
            selectedChannel={selectedChannel}
            onChannelSelect={handleChannelSelect}
            onCreateChannel={loadChannels}
            onChannelDeleted={handleChannelDeleted}
          />
        </div>

        {/* RIGHT: chat window */}
        <div
          className={`${
            showChatList ? 'hidden' : 'block'
          } md:block flex-1`}
        >
          <ChatWindow
            channel={selectedChannel}
            onBack={() => setShowChatList(true)}
            allChannels={channels}
            onChannelDeleted={handleChannelDeleted}
          />
        </div>
      </div>

      {/* bottom navigation bar */}
      <BottomNav />
    </div>
  );
};

export default Chats;
