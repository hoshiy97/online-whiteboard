const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || '';
const allowedOrigins = CLIENT_URL
  ? [CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: allowedOrigins }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Whiteboard server is running' });
});

// roomId -> base64 canvas image (in-memory)
const roomStates = new Map();

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    // Send current canvas state to the new user
    if (roomStates.has(roomId)) {
      socket.emit('canvasState', roomStates.get(roomId));
    }

    const size = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    io.to(roomId).emit('userCount', size);
    console.log(`${socket.id} joined room ${roomId} (${size} users)`);
  });

  // Relay drawing events to everyone else in the room
  socket.on('draw', (data) => {
    socket.to(data.roomId).emit('draw', data);
  });

  // Save canvas snapshot for late joiners
  socket.on('saveState', ({ roomId, imageData }) => {
    roomStates.set(roomId, imageData);
  });

  // Clear canvas in a room
  socket.on('clearCanvas', (roomId) => {
    roomStates.delete(roomId);
    socket.to(roomId).emit('clearCanvas');
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const size = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      io.to(roomId).emit('userCount', size);
    }
    console.log('disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
