import React, { useState } from 'react';

export default function StonkChart({ stonk, isGain = true }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [timeframe, setTimeframe] = useState('24H');

  const prices = stonk?.sparkline && stonk.sparkline.length > 1
    ? stonk.sparkline
    : [stonk?.current_price || 100, (stonk?.current_price || 100) * 1.05];

  const minPrice = Math.min(...prices) * 0.96;
  const maxPrice = Math.max(...prices) * 1.04;
  const range = maxPrice - minPrice || 1;

  const width = 600;
  const height = 220;
  const paddingX = 20;
  const paddingY = 25;

  const getX = (index) => paddingX + (index / (prices.length - 1)) * (width - 2 * paddingX);
  const getY = (price) => height - paddingY - ((price - minPrice) / range) * (height - 2 * paddingY);

  const points = prices.map((price, idx) => ({ x: getX(idx), y: getY(price), price }));

  // Create smooth SVG cubic bezier path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const strokeColor = isGain ? '#10b981' : '#f43f5e';
  const gradientId = `chart-gradient-${stonk?.id || 'default'}`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spot Price</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800 }}>
            {hoveredPoint ? hoveredPoint.price.toFixed(2) : stonk?.current_price?.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--edge-purple)' }}>EC</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-tertiary)', padding: '0.2rem', borderRadius: '6px' }}>
          {['1H', '24H', '7D', 'ALL'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? 'var(--bg-card-hover)' : 'transparent',
                color: timeframe === tf ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

        {/* Area fill */}
        <path d={fillD} fill={`url(#${gradientId})`} />

        {/* Price Line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 2px 8px ${strokeColor}44)` }}
        />

        {/* Hover Points & Crosshairs */}
        {points.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r="12"
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoveredPoint(pt)}
          />
        ))}

        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={height - paddingY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
