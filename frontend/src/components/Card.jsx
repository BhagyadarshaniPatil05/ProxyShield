import React from 'react';

const Card = ({ children, title, subtitle, action, className = '', headerClassName = '' }) => {
  return (
    <div className={`glass-panel p-5 ${className}`}>
      {(title || subtitle || action) && (
        <div className={`flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3 ${headerClassName}`}>
          <div>
            {title && <h3 className="font-semibold text-slate-100 text-base tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
