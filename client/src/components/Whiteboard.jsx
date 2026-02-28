import { useEffect, useRef, useCallback } from 'react';
import { socket } from '../socket';
import './Whiteboard.css';

export default function Whiteboard({ roomId, tool, color, strokeWidth }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  // Use refs so event handlers always read current prop values
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

  // Returns normalized (0-1) coordinates relative to canvas
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  // Draw a line segment using normalized coordinates and normalized width
  const drawSegment = useCallback((ctx, nx0, ny0, nx1, ny1, drawColor, nWidth, eraser) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.beginPath();
    ctx.moveTo(nx0 * w, ny0 * h);
    ctx.lineTo(nx1 * w, ny1 * h);
    ctx.strokeStyle = eraser ? '#ffffff' : drawColor;
    ctx.lineWidth = Math.max(1, nWidth * w);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
  }, []);

  // Initialize canvas and handle container resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let initialized = false;

    const setSize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;

      let prevDataURL = null;
      if (initialized) {
        prevDataURL = canvas.toDataURL();
      }

      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      if (prevDataURL) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = prevDataURL;
      }

      initialized = true;
    };

    setSize();

    const observer = new ResizeObserver(setSize);
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Socket event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const onDraw = ({ x0, y0, x1, y1, color: c, width, eraser }) => {
      drawSegment(ctx, x0, y0, x1, y1, c, width, eraser);
    };

    const onClear = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const onCanvasState = (imageData) => {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = imageData;
    };

    socket.on('draw', onDraw);
    socket.on('clearCanvas', onClear);
    socket.on('canvasState', onCanvasState);

    return () => {
      socket.off('draw', onDraw);
      socket.off('clearCanvas', onClear);
      socket.off('canvasState', onCanvasState);
    };
  }, [drawSegment]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
  }, [getPoint]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const point = getPoint(e);
    const { x: x0, y: y0 } = lastPoint.current;
    const { x: x1, y: y1 } = point;
    const eraser = toolRef.current === 'eraser';
    const nWidth = canvas.width > 0 ? strokeWidthRef.current / canvas.width : 0;

    drawSegment(ctx, x0, y0, x1, y1, colorRef.current, nWidth, eraser);

    socket.emit('draw', {
      roomId,
      x0, y0, x1, y1,
      color: colorRef.current,
      width: nWidth,
      eraser,
    });

    lastPoint.current = point;
  }, [roomId, getPoint, drawSegment]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    // Save snapshot so late joiners see the current state
    const canvas = canvasRef.current;
    socket.emit('saveState', { roomId, imageData: canvas.toDataURL() });
  }, [roomId]);

  return (
    <canvas
      ref={canvasRef}
      className="whiteboard-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
