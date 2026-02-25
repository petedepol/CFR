// NeoTuneCard.jsx - Card displaying a Neo tune image with metadata
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)

import { MoreVertical, Trash2, Edit3 } from "lucide-react";
import { useState } from "react";

function formatDateTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

export function NeoTuneCard({ tune, onTap, onEdit, onDelete, isAdmin = false, theme = "light" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === "dark";

  const { full_spec, timestamp, mechanic } = tune;
  const { tune_name, image_url, image_urls } = full_spec || {};
  const imageCount = image_urls?.length || (image_url ? 1 : 0);

  return (
    <div className="relative group">
      {/* Card - Glass tile container */}
      <button
        onClick={onTap}
        className={`
          w-full text-left rounded-2xl overflow-hidden
          backdrop-blur-sm transition-all active:scale-[0.98]
          ${isDark
            ? "bg-app-surface border border-chrome-strong ring-1 ring-[rgba(255,255,255,0.05)] shadow-[0_10px_28px_rgba(0,0,0,0.40)]"
            : "bg-light-surface/75 border border-[rgba(0,0,0,0.08)] ring-1 ring-[rgba(30,51,49,0.12)] shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
          }
        `}
      >
        {/* Image */}
        <div className={`relative aspect-[3/4] overflow-hidden ${isDark ? "bg-app-elevated" : "bg-[rgba(30,51,49,0.06)]"}`}>
          {image_url ? (
            <img
              src={image_url}
              alt={tune_name || "Neo tune"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-app-elevated" : "bg-[#1e3331]"}`}>
              <span className={`text-[48px] ${isDark ? "opacity-30" : "opacity-40"}`}>⚡</span>
            </div>
          )}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.60)] text-white text-[10px] font-semibold backdrop-blur-sm">
              {imageCount} images
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-3">
          <p className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-brand-green"}`}>
            {tune_name || "Untitled"}
          </p>
          {mechanic && (
            <p className={`text-xs mt-0.5 truncate ${isDark ? "text-text-muted" : "text-text-accent-light"}`}>
              {mechanic.includes("@") ? mechanic.split("@")[0] : mechanic}
            </p>
          )}
          <p className={`text-xs mt-1 ${isDark ? "text-text-muted" : "text-text-muted"}`}>
            {formatDateTime(timestamp)}
          </p>
        </div>
      </button>

      {/* Admin Menu Button */}
      {isAdmin && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className={`
              p-1.5 rounded-full transition-all backdrop-blur-sm
              ${isDark ? "bg-[rgba(0,0,0,0.60)]" : "bg-[rgba(30,51,49,0.70)]"}
            `}
          >
            <MoreVertical size={16} color="#fff" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />

              {/* Menu */}
              <div
                className={`
                  absolute top-10 right-0 z-50 min-w-[140px] rounded-xl overflow-hidden
                  backdrop-blur-sm
                  ${isDark
                    ? "bg-app-surface border border-chrome-strong shadow-[0_10px_28px_rgba(0,0,0,0.50)]"
                    : "bg-light-surface/98 border border-[rgba(0,0,0,0.08)] shadow-[0_10px_28px_rgba(0,0,0,0.20)]"
                  }
                `}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit?.();
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                    isDark
                      ? "text-white hover:bg-[rgba(255,255,255,0.06)]"
                      : "text-brand-green hover:bg-[rgba(30,51,49,0.06)]"
                  }`}
                >
                  <Edit3 size={16} />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete?.();
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                    isDark
                      ? "text-status-destructive hover:bg-[rgba(239,68,68,0.10)]"
                      : "text-red-600 hover:bg-[rgba(239,68,68,0.08)]"
                  }`}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
