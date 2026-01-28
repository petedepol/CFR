// CachedDataBanner.jsx - UI indicator when showing cached offline data

import { Database, RefreshCw } from "lucide-react";
import { formatCacheAge } from "../lib/offlineCache.js";

export function CachedDataBanner({ fetchedAt, onRefresh, className = "" }) {
  const age = formatCacheAge(fetchedAt);

  return (
    <div
      className={`px-4 py-3 rounded-2xl text-sm flex items-center justify-between ${className}`}
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        border: "1px solid rgba(59, 130, 246, 0.1)",
        color: "#2563eb",
      }}
    >
      <div className="flex items-center gap-2">
        <Database size={16} />
        <span>
          Showing cached data
          {fetchedAt && (
            <span style={{ opacity: 0.7 }}> ({age})</span>
          )}
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg transition active:scale-95"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          }}
          title="Refresh data"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}
