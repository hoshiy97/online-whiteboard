import { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import Whiteboard from './components/Whiteboard';
import Toolbar from './components/Toolbar';
import './App.css';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [userCount, setUserCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Use URL hash as room ID so users can share the link
    let id = window.location.hash.replace('#', '');
    if (!id) {
      id = generateRoomId();
      window.location.hash = id;
    }
    setRoomId(id);

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinRoom', id);
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('userCount', setUserCount);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('userCount');
      socket.disconnect();
    };
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('ホワイトボードをクリアしますか？')) {
      socket.emit('clearCanvas', roomId);
    }
  }, [roomId]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('このURLをコピーしてください:', window.location.href);
    }
  }, []);

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        roomId={roomId}
        userCount={userCount}
        connected={connected}
        copied={copied}
        onClear={handleClear}
        onCopyLink={handleCopyLink}
      />
      <div className="canvas-container">
        {roomId && (
          <Whiteboard
            roomId={roomId}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
          />
        )}
      </div>
    </div>
  );
}
