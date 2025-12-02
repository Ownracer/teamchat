import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

export const Profile = () => {
  const navigate = useNavigate();
  
  // Get user data from localStorage
  const userName = localStorage.getItem('userName') || 'Unknown User';
  const userEmail = localStorage.getItem('userEmail') || 'No email';
  const userId = localStorage.getItem('userId') || 'N/A';
  const workspaceId = localStorage.getItem('workspaceId') || 'N/A';
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    // Clear all localStorage
    localStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  };

  const handleCopyId = (id, label) => {
    navigator.clipboard.writeText(id);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-purple-600 text-white px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-teal-600 text-3xl font-bold shadow-lg">
            {userInitial}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userName}</h1>
            <p className="text-teal-100">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 py-6 space-y-4">
        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Account Information</h2>
          </div>
          
          <div className="divide-y">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{userName}</p>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{userEmail}</p>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500">User ID</p>
                <p className="font-mono text-xs text-gray-600 truncate">{userId}</p>
              </div>
              <button
                onClick={() => handleCopyId(userId, 'User ID')}
                className="ml-2 text-teal-600 hover:text-teal-700 text-sm"
              >
                Copy
              </button>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500">Workspace ID</p>
                <p className="font-mono text-xs text-gray-600 truncate">{workspaceId}</p>
              </div>
              <button
                onClick={() => handleCopyId(workspaceId, 'Workspace ID')}
                className="ml-2 text-teal-600 hover:text-teal-700 text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Settings</h2>
          </div>
          
          <div className="divide-y">
            <button
              onClick={() => navigate('/chats')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <span className="text-gray-900">Chats</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/ideas')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <span className="text-gray-900">Ideas Hub</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <span className="text-gray-900">Calendar</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-red-100">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h2 className="font-semibold text-red-900">Danger Zone</h2>
          </div>
          
          <div className="p-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center py-6 text-sm text-gray-500">
          <p className="mb-1">TeamChat v2.0.0</p>
          <p>WhatsApp-style collaboration</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                Logout?
              </h3>
              <p className="text-center text-gray-600 mb-6">
                Are you sure you want to logout from TeamChat?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};