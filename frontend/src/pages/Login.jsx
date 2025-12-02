import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, workspaceAPI } from '../services/api';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // ✅ LOGIN FLOW - FIXED
        console.log('🔐 Logging in...');
        
        // 1. Login and get token
        const loginResponse = await authAPI.login(email, password);
        const token = loginResponse.data.access_token;
        localStorage.setItem('token', token);
        console.log('✅ Token saved');
        
        // 2. Get user data using the token
        const userResponse = await authAPI.getMe();
        const userData = userResponse.data;
        console.log('✅ User data received:', userData);
        
        // 3. Store user data in localStorage
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('userName', userData.name);  // ✅ FIX: Store username
        localStorage.setItem('userEmail', userData.email);  // ✅ FIX: Store email
        console.log('✅ User data stored in localStorage');
        
        // 4. Handle workspace
        if (!userData.workspace_id) {
          console.log('📦 Creating workspace...');
          const workspace = await workspaceAPI.create('My Workspace');
          localStorage.setItem('workspaceId', workspace.data.id);
          console.log('✅ Workspace created:', workspace.data.id);
        } else {
          localStorage.setItem('workspaceId', userData.workspace_id);
          console.log('✅ Workspace ID stored:', userData.workspace_id);
        }
        
        // 5. Reload to ensure all data is properly loaded
        console.log('✅ Login complete! Reloading...');
        window.location.href = '/chats';
        
      } else {
        // ✅ REGISTER FLOW
        console.log('📝 Registering new user...');
        await authAPI.register(email, password, name);
        console.log('✅ Registration successful');
        setIsLogin(true);
        setError('Registration successful! Please login.');
        setPassword(''); // Clear password for security
      }
    } catch (err) {
      console.error('❌ Error:', err);
      const errorMessage = err.response?.data?.detail || 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TeamChat</h1>
          <p className="text-gray-600 mt-2">WhatsApp-style collaboration</p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              isLogin
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              !isLogin
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            error.includes('successful') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Your name"
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Please wait...
              </>
            ) : (
              isLogin ? 'Login' : 'Register'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-teal-600 hover:text-teal-700 font-semibold"
            disabled={loading}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};