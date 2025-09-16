"use client";

import { useState } from "react";

export function EnvDebugComponent() {
  const [showDebug, setShowDebug] = useState(false);

  const envVars = {
    NEXT_PUBLIC_FORM_SPREADSHEET_URL: process.env.NEXT_PUBLIC_FORM_SPREADSHEET_URL,
    NEXT_PUBLIC_FORM_EMAIL_RECEIVER: process.env.NEXT_PUBLIC_FORM_EMAIL_RECEIVER,
    NEXT_PUBLIC_REDIRECT_TO_FRESHA: process.env.NEXT_PUBLIC_REDIRECT_TO_FRESHA,
    NODE_ENV: process.env.NODE_ENV,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-600"
      >
        🔧 Debug Env
      </button>

      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded shadow-lg p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm">Environment Variables</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="border-b pb-1">
                <div className="font-mono font-bold text-blue-600">{key}:</div>
                <div className="font-mono text-gray-700 break-all">
                  {value || <span className="text-red-500 italic">undefined</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t">
            <div className="text-xs text-gray-600">
              <p><strong>Note:</strong> Environment variables are read at build time.</p>
              <p>If you changed them, restart the dev server.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}