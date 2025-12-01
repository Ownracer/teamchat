import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { AIAssistant } from './AIAssistant';
import { messageAPI, channelAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Paperclip, X, Send } from 'lucide-react';

export const ChatWindow = ({ channel, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});
  const currentUserId = localStorage.getItem('userId');

  const { isConnected, connectionError, sendMessage: sendWS } = useWebSocket(
    channel?.id,
    (newMessage) => {
      if (newMessage.type === 'message') {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.data.id);
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

    const maxSize = 10000000 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
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
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
        status_tag: null,
        parent_message_id: replyTo ? replyTo.id : null,
      };

      const response = await messageAPI.create(channel.id, payload);
      const newMessage = response.data;

      if (fileName) {
        newMessage.file_name = fileName;
      }

      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMessage.id);
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
      alert('Message failed to send. Please try again.');
      setInputValue(messageText);
    } finally {
      setIsSending(false);
    }
  };

  // ----- DELETE HANDLERS -----

  const handleDeleteMessageForMe = async (msg) => {
    try {
      await messageAPI.deleteForMe(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      console.error('Delete for me failed:', err);
      alert('Failed to delete message for you.');
    }
  };

  const handleDeleteMessageForEveryone = async (msg) => {
    const yes = window.confirm('Delete this message for everyone?');
    if (!yes) return;

    try {
      await messageAPI.deleteForEveryone(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      // TODO: optionally broadcast over WS so others also remove it
    } catch (err) {
      console.error('Delete for everyone failed:', err);
      alert('Failed to delete message for everyone.');
    }
  };

  // ----- FORWARD HANDLER -----

  const handleForwardMessage = async (msg) => {
    const targetName = window.prompt(
      'Enter the target channel NAME to forward to (e.g. MARKETING):'
    );
    if (!targetName) return;

    try {
      await messageAPI.forward(msg.id, targetName.trim());
      alert('Message forwarded successfully.');
    } catch (err) {
      console.error('Forward failed:', err);
      alert('Failed to forward message. Check that the channel name is correct.');
    }
  };


  // ----- CLEAR CHAT / DELETE CHANNEL -----

  const handleClearChannel = async () => {
    const yes = window.confirm('Clear all messages in this chat for you?');
    if (!yes || !channel?.id) return;

    try {
      await channelAPI.clearMessages(channel.id);
      setMessages([]);
    } catch (err) {
      console.error('Clear channel failed:', err);
      alert('Failed to clear chat.');
    }
  };

  const handleDeleteChannel = async () => {
    const yes = window.confirm('Delete this channel for everyone?');
    if (!yes || !channel?.id) return;

    try {
      await channelAPI.delete(channel.id);
      if (onBack) onBack();
    } catch (err) {
      console.error('Delete channel failed:', err);
      alert('Failed to delete channel.');
    }
  };

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

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
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
          <p className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
            {isConnected ? 'Online' : 'Connecting...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChannel}
            className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded"
          >
            Clear chat
          </button>
          <button
            onClick={handleDeleteChannel}
            className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded"
          >
            Delete channel
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className={`p-2 rounded-full ${
              showAI ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
            }`}
          >
            🤖
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const parent = message.parent_message_id
            ? messages.find(m => m.id === message.parent_message_id)
            : null;

          return (
            <div
              key={message.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current[message.id] = el;
                }
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
                onForward={handleForwardMessage}   // ✅ NEW
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
              ✕
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
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
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
    </div>
  );
};
