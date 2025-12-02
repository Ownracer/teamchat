import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { AIAssistant } from './AIAssistant';
import { messageAPI, channelAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Paperclip, X, Send, MoreVertical, Search } from 'lucide-react';

export const ChatWindow = ({ channel, onBack, allChannels = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState(null);

  // Forwarding
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  // More menu + dialogs
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Members / participants
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');

  // Toast / snackbar
  const [toast, setToast] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});
  
  // ✅ Get user data from localStorage
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'Unknown user';
  const currentUserInitial = currentUserName.charAt(0).toUpperCase();

  const showToast = (type, text, duration = 2500) => {
    setToast({ type, text });
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), duration);
  };

  const { isConnected, connectionError, sendMessage: sendWS } = useWebSocket(
    channel?.id,
    (newMessage) => {
      if (newMessage.type === 'message') {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.data.id);
          if (exists) return prev;
          return [...prev, newMessage.data];
        });
      } else if (newMessage.type === 'connected') {
        console.log('WebSocket connected:', newMessage.message);
      }
    }
  );

  useEffect(() => {
    if (channel?.id) {
      loadMessages();
      removeFile();
      setReplyTo(null);
      setMessageToForward(null);
      setShowForwardModal(false);
      setShowMoreMenu(false);
      setShowClearDialog(false);
      setShowDeleteDialog(false);
      setShowMembersModal(false);
      setMembers([]);
      setMembersSearch('');
    } else {
      setMessages([]);
    }
  }, [channel?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      console.log('Loading messages for channel:', channel.id);
      const response = await messageAPI.list(channel.id);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast('error', 'Failed to load messages.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id];
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-teal-400');

    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-teal-400');
    }, 1500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('error', 'File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    );
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedFile) || !channel?.id || isSending) return;

    const messageText = inputValue.trim();
    setIsSending(true);

    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error('Upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
        });

        xhr.open('POST', 'http://localhost:8000/api/upload');
        const token = localStorage.getItem('token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);

        const uploadResult = await uploadPromise;
        fileUrl = uploadResult.file_url || uploadResult.url;
        fileType = selectedFile.type;
        fileName = uploadResult.file_name || selectedFile.name;
      }

      const payload = {
        type: selectedFile ? 'file' : 'text',
        content: messageText || (selectedFile ? `📎 ${fileName || 'File'}` : null),
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
        status_tag: null,
        parent_message_id: replyTo ? replyTo.id : null,
      };

      const response = await messageAPI.create(channel.id, payload);
      const newMessage = response.data;

      if (fileName) {
        newMessage.file_name = fileName;
      }

      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });

      if (isConnected) {
        sendWS({
          type: 'message',
          data: newMessage,
        });
      }

      setInputValue('');
      setReplyTo(null);
      removeFile();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('error', 'Message failed to send. Please try again.');
      setInputValue(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessageForMe = async (msg) => {
    try {
      await messageAPI.deleteForMe(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      console.error('Delete for me failed:', err);
      showToast('error', 'Failed to delete message for you.');
    }
  };

  const handleDeleteMessageForEveryone = async (msg) => {
    const yes = window.confirm('Delete this message for everyone?');
    if (!yes) return;

    try {
      await messageAPI.deleteForEveryone(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      console.error('Delete for everyone failed:', err);
      showToast('error', 'Failed to delete message for everyone.');
    }
  };

  const handleForwardMessage = (msg) => {
    setMessageToForward(msg);
    setShowForwardModal(true);
  };

  const doForwardToChannel = async (targetChannelId) => {
    if (!messageToForward || !targetChannelId) return;

    try {
      await messageAPI.forward(messageToForward.id, targetChannelId);
      setShowForwardModal(false);
      setMessageToForward(null);
      showToast('success', 'Message forwarded');
    } catch (err) {
      console.error('Forward failed:', err);
      const msg =
        err?.response?.data?.detail ||
        err.message ||
        'Failed to forward message.';
      showToast('error', msg);
    }
  };

  const openClearDialog = () => {
    setShowMoreMenu(false);
    setShowClearDialog(true);
  };

  const openDeleteDialog = () => {
    setShowMoreMenu(false);
    setShowDeleteDialog(true);
  };

  const handleClearChannelConfirm = async () => {
    if (!channel?.id) return;

    try {
      await channelAPI.clearMessages(channel.id);
      setMessages([]);
      showToast('success', 'Chat cleared');
    } catch (err) {
      console.error('Clear channel failed:', err);
      showToast('error', 'Failed to clear chat.');
    } finally {
      setShowClearDialog(false);
    }
  };

  const handleDeleteChannelConfirm = async () => {
    if (!channel?.id) return;

    try {
      await channelAPI.delete(channel.id);
      showToast('success', 'Channel deleted');
      setShowDeleteDialog(false);
      if (onBack) onBack();
    } catch (err) {
      console.error('Delete channel failed:', err);
      showToast('error', 'Failed to delete channel.');
      setShowDeleteDialog(false);
    }
  };

  const openMembersModal = async () => {
    if (!channel?.id) return;
    setShowMembersModal(true);
    setMembersLoading(true);
    setMembersSearch('');

    try {
      const res = await channelAPI.getMembers(channel.id);
      setMembers(res.data || []);
    } catch (err) {
      console.error('Load members failed:', err);
      showToast('error', 'Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const memberCount =
    channel?.member_count != null ? channel.member_count : members.length;

  const filteredMembers = members.filter((m) => {
    const q = membersSearch.toLowerCase();
    if (!q) return true;
    const name = (m.user_name || '').toLowerCase();
    return name.includes(q);
  });

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p>Select a channel to start messaging</p>
        </div>
      </div>
    );
  }

  const forwardableChannels = allChannels.filter((c) => c.id !== channel.id);

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 relative">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-gray-100 rounded-full"
        >
          ←
        </button>

        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
          {channel.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">{channel.name}</h2>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className={isConnected ? 'text-green-600' : ''}>
              {isConnected ? 'Online' : 'Connecting...'}
            </span>
            {memberCount > 0 && (
              <>
                <span>•</span>
                <button
                  onClick={openMembersModal}
                  className="underline decoration-dotted underline-offset-2 text-teal-700 hover:text-teal-800"
                >
                  {memberCount} {memberCount === 1 ? 'participant' : 'participants'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Current User Display - ✅ FIXED */}
        <div className="hidden md:flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {currentUserInitial}
          </div>
          <span className="text-sm text-gray-700">{currentUserName}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <MoreVertical size={20} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border text-sm z-30">
              <button
                onClick={openClearDialog}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
              >
                Clear chat
              </button>
              <button
                onClick={openDeleteDialog}
                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 border-t"
              >
                Delete channel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAI(!showAI)}
          className={`p-2 rounded-full ml-1 ${
            showAI ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
          }`}
        >
          🤖
        </button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const parent = message.parent_message_id
            ? messages.find((m) => m.id === message.parent_message_id)
            : null;

          return (
            <div
              key={message.id}
              ref={(el) => {
                if (el) messageRefs.current[message.id] = el;
              }}
            >
              <MessageBubble
                message={message}
                isOwnMessage={message.user_id === currentUserId}
                onReply={(msg) => setReplyTo(msg)}
                replyTarget={parent}
                onJumpToMessage={scrollToMessage}
                onDeleteForMe={handleDeleteMessageForMe}
                onDeleteForEveryone={handleDeleteMessageForEveryone}
                onForward={handleForwardMessage}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showAI && <AIAssistant messages={messages} onSuggest={setInputValue} />}

      {/* INPUT AREA */}
      <div className="bg-white border-t p-3">
        {replyTo && (
          <div className="mb-2 px-3 py-2 bg-gray-100 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Replying to</p>
              <p className="text-sm font-medium truncate">
                {replyTo.content || replyTo.file_name || 'Message'}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {selectedFile && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-16 w-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={removeFile}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-2 bg-white rounded border">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button onClick={removeFile} className="text-red-500">
                    <X size={20} />
                  </button>
                </>
              )}
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-3 text-gray-500 hover:text-teal-500 hover:bg-teal-50 rounded-full disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={selectedFile ? 'Add a message...' : 'Type a message...'}
              className="w-full bg-transparent focus:outline-none"
              disabled={isSending}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !selectedFile) || isSending}
            className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>

      {/* ... FORWARD MODAL, CLEAR DIALOG, DELETE DIALOG, MEMBERS MODAL - Keep all your existing modals ... */}
      
      {/* TOAST */}
      {toast && (
        <div className="fixed left-1/2 bottom-4 z-50 -translate-x-1/2">
          <div
            className={`px-4 py-2 rounded-full shadow-lg text-sm text-white flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-white/80" />
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};