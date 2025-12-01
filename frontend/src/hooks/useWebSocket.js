import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (channelId, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!channelId) {
      setIsConnected(false);
      return;
    }

    const wsEnabled = localStorage.getItem('websocket_enabled') !== 'false';
    if (!wsEnabled) {
      console.log('WebSocket disabled by user preference');
      setIsConnected(false);
      setConnectionError('WebSocket disabled');
      return;
    }

    const connect = () => {
      try {
        const wsUrl = `ws://localhost:8000/ws/channel/${channelId}`;
        console.log('Attempting WebSocket connection to:', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;
          console.log('WebSocket connected successfully');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.type === 'connected') {
              console.log('WebSocket connection confirmed:', data.message);
            }
            
            if (onMessage) {
              onMessage(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection error');
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          console.log('WebSocket closed:', event.code, event.reason);
          
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setConnectionError('Failed to connect after multiple attempts');
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setConnectionError('Failed to create connection');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      setIsConnected(false);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    };
  }, [channelId]); // CHANGED: Removed onMessage from dependencies

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent.');
    }
  };

  return { isConnected, connectionError, sendMessage };
};