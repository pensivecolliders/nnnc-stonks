import React from 'react';

export default function TickerTape({ stonks, onSelectStonk }) {
  if (!stonks || stonks.length === 0) return null;

  // Duplicate list to create seamless infinite scroll loop
  const tickerItems = [...stonks, ...stonks];

  return (
    <div className="ticker-wrap" id="ticker-tape">
      <div className="ticker-inner">
        {tickerItems.map((stonk, idx) => {
          const isPositive = (stonk.change_24h || 0) >= 0;
          return (
            <div
              key={`${stonk.id}-${idx}`}
              className="ticker-item"
              onClick={() => onSelectStonk(stonk)}
              title="Click to view stonk"
            >
              <span className="ticker-name">u/{stonk.ticker}</span>
              <span className="ticker-price">{stonk.current_price?.toFixed(2)} EC</span>
              <span className={isPositive ? 'ticker-gain' : 'ticker-loss'}>
                {isPositive ? '+' : ''}{(stonk.change_24h || 0).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
