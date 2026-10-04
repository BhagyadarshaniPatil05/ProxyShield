import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ErrorMessage = ({ message, retry }) => {
  let displayMessage = 'An unexpected error occurred.';
  if (typeof message === 'string' && message.trim()) {
    displayMessage = message;
  } else if (typeof message === 'object' && message !== null) {
    displayMessage = message.message || message.error || JSON.stringify(message);
  }

  return (
    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 my-4">
      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <h4 className="font-semibold text-rose-200">System Error</h4>
        <p className="mt-0.5 text-xs text-rose-300/80">{displayMessage}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 text-xs underline hover:text-rose-100 transition-colors"
          >
            Retry request
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
