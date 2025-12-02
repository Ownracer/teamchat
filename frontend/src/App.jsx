import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Chats } from './pages/Chats';
import { Ideas } from './pages/Ideas';
import { Calendar } from './pages/Calendar';
import { authAPI, workspaceAPI } from './services/api';
import { Profile } from './pages/Profile';
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      setIsAuthenticated(true);
      localStorage.setItem('userId', response.data.id);
      
      // Check if user has workspace
      if (!response.data.workspace_id) {
        const workspace = await workspaceAPI.create('My Workspace');
        localStorage.setItem('workspaceId', workspace.data.id);
      } else {
        localStorage.setItem('workspaceId', response.data.workspace_id);
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('workspaceId');
      localStorage.removeItem('userId');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/chats" />}
        />
        <Route
          path="/chats"
          element={isAuthenticated ? <Chats /> : <Navigate to="/login" />}
        />
        <Route
          path="/ideas"
          element={isAuthenticated ? <Ideas /> : <Navigate to="/login" />}
        />
        <Route
          path="/calendar"
          element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/chats" />} />
         <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/chats" />} />
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;

