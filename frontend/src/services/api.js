import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- AUTH ----------
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getMe: () =>
    api.get('/auth/me'),
};

// ---------- WORKSPACES ----------
export const workspaceAPI = {
  create: (name) =>
    api.post('/workspaces', { name }),
  get: (id) =>
    api.get(`/workspaces/${id}`),
};

// ---------- CHANNELS ----------
export const channelAPI = {
  create: (workspaceId, name, description, isPublic = true) =>
    api.post(`/workspaces/${workspaceId}/channels`, { 
      name, 
      description,
      is_public: isPublic 
    }),
  list: (workspaceId) =>
    api.get(`/workspaces/${workspaceId}/channels`),

  delete: (channelId) =>
    api.delete(`/channels/${channelId}`),

  clearMessages: (channelId) =>
    api.post(`/channels/${channelId}/clear`),

  // ✅ NEW: Channel discovery and membership
  discover: (search = '') =>
    api.get(`/channels/discover${search ? `?search=${search}` : ''}`),
  
  join: (channelId) =>
    api.post(`/channels/${channelId}/join`),
  
  leave: (channelId) =>
    api.post(`/channels/${channelId}/leave`),
  
  getMembers: (channelId) =>
    api.get(`/channels/${channelId}/members`),
};

// ---------- MESSAGES ----------
export const messageAPI = {
  create: (channelId, payload) =>
    api.post(`/channels/${channelId}/messages`, payload),

  list: (channelId, skip = 0, limit = 50) =>
    api.get(`/channels/${channelId}/messages?skip=${skip}&limit=${limit}`),

  getThread: (messageId) =>
    api.get(`/messages/${messageId}/thread`),

  pin: (messageId) =>
    api.patch(`/messages/${messageId}/pin`),

  addReaction: (messageId, emoji) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),

  convertToIdea: (messageId) =>
    api.post(`/messages/${messageId}/convert-to-idea`),

  processWithAI: (messageId) =>
    api.post(`/messages/${messageId}/ai-process`),

  deleteForEveryone: (messageId) =>
    api.delete(`/messages/${messageId}`),

  deleteForMe: (messageId) =>
    api.delete(`/messages/${messageId}/me`),

  forward: (messageId, targetChannelId) =>
  api.post(`/messages/${messageId}/forward`, {
    target_channel_id: targetChannelId,
  }),



  // ✅ NEW: Download file with original filename
  downloadFile: async (fileId) => {
    const response = await api.get(`/download/${fileId}`, {
      responseType: 'blob',
    });
    return response;
  },
};

// Optional helper if you ever want to call it directly
export async function sendFileMessage(
  channelId,
  fileUrl,
  fileType,
  fileName = null,
  content = null,
  parentMessageId = null
) {
  const payload = {
    type: 'file',
    file_url: fileUrl,
    file_type: fileType,
    file_name: fileName,  // ✅ Include filename
    content,
    parent_message_id: parentMessageId,
  };
  const res = await messageAPI.create(channelId, payload);
  return res.data;
}

// ---------- IDEAS ----------
export const ideasAPI = {
  getAll: (workspaceId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    return api.get(`/workspaces/${workspaceId}/ideas?${params}`);
  },
  update: (ideaId, data) =>
    api.patch(`/ideas/${ideaId}`, data),
  delete: (ideaId) =>
    api.delete(`/ideas/${ideaId}`),
};

// ---------- CALENDAR ----------
export const calendarAPI = {
  getEvents: (workspaceId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());
    return api.get(`/workspaces/${workspaceId}/calendar?${params}`);
  },
  createEvent: (workspaceId, eventData) =>
    api.post(`/workspaces/${workspaceId}/calendar`, eventData),
};

// ---------- SEARCH ----------
export const searchAPI = {
  search: (query, channelId) => {
    const params = new URLSearchParams({ q: query });
    if (channelId) params.append('channel_id', channelId);
    return api.get(`/search?${params}`);
  },
};

export default api;