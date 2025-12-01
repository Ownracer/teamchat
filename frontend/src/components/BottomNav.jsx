import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    // 👇 removed `md:hidden`, made it fixed at bottom with z-index
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around py-2 z-30">
      <button
        onClick={() => navigate('/chats')}
        className={`flex flex-col items-center px-4 py-2 ${
          isActive('/chats') ? 'text-teal-600' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-xs mt-1">Chats</span>
      </button>

      <button
        onClick={() => navigate('/ideas')}
        className={`flex flex-col items-center px-4 py-2 ${
          isActive('/ideas') ? 'text-purple-600' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span className="text-xs mt-1">Ideas</span>
      </button>

      <button
        onClick={() => navigate('/calendar')}
        className={`flex flex-col items-center px-4 py-2 ${
          isActive('/calendar') ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-xs mt-1">Calendar</span>
      </button>

      <button
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center px-4 py-2 ${
          isActive('/profile') ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="text-xs mt-1">Profile</span>
      </button>
    </div>
  );
};
