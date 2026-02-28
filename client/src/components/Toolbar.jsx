import './Toolbar.css';

const COLORS = [
  { value: '#000000', label: '黒' },
  { value: '#ef4444', label: '赤' },
  { value: '#f97316', label: 'オレンジ' },
  { value: '#eab308', label: '黄' },
  { value: '#22c55e', label: '緑' },
  { value: '#3b82f6', label: '青' },
  { value: '#8b5cf6', label: '紫' },
  { value: '#ec4899', label: 'ピンク' },
];

const STROKE_WIDTHS = [2, 4, 8, 16];

export default function Toolbar({
  tool, setTool,
  color, setColor,
  strokeWidth, setStrokeWidth,
  roomId, userCount, connected,
  copied, onClear, onCopyLink,
}) {
  return (
    <header className="toolbar">
      {/* Tool selection */}
      <div className="toolbar-group">
        <button
          className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
          title="ペン"
        >
          Pen
        </button>
        <button
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="消しゴム"
        >
          Erase
        </button>
      </div>

      {/* Color palette */}
      <div className="toolbar-group">
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            className={`color-swatch ${color === value && tool === 'pen' ? 'active' : ''}`}
            style={{ '--swatch-color': value }}
            onClick={() => { setColor(value); setTool('pen'); }}
            title={label}
            aria-label={label}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
          title="カスタムカラー"
          className="color-picker"
        />
      </div>

      {/* Stroke width */}
      <div className="toolbar-group">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            className={`stroke-btn ${strokeWidth === w ? 'active' : ''}`}
            onClick={() => setStrokeWidth(w)}
            title={`${w}px`}
          >
            <span
              className="stroke-dot"
              style={{ width: w + 4, height: w + 4 }}
            />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="toolbar-group">
        <button className="tool-btn danger" onClick={onClear}>
          Clear
        </button>
        <button className="tool-btn share" onClick={onCopyLink}>
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Status */}
      <div className="toolbar-status">
        <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
        <span className="user-count">{userCount} online</span>
        {roomId && <span className="room-badge">#{roomId}</span>}
      </div>
    </header>
  );
}
