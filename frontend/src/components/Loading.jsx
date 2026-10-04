import React from 'react';

const Loading = ({ message = 'Processing...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-slate-400 animate-pulse">{message}</p>
    </div>
  );
};

export default Loading;
