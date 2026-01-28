// NeoTuneCard.jsx - Card displaying a Neo tune image with metadata

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

export function NeoTuneCard({ tune, onTap, onEdit, onDelete, isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { full_spec, timestamp, mechanic } = tune;
  const { tune_name, image_url } = full_spec || {};

  return (
    <div className="relative group">
      {/* Card */}
      <button
        onClick={onTap}
        className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
        style={{
          background: "var(--card, #fff)",
          border: "1px solid var(--border, rgba(0,0,0,0.1))",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Image */}
        <div className="aspect-[3/4] bg-foreground/5 overflow-hidden">
          {image_url ? (
            <img
              src={image_url}
              alt={tune_name || "Neo tune"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span style={{ fontSize: 48, opacity: 0.2 }}>⚡</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-3">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: "var(--foreground)" }}
          >
            {tune_name || "Untitled"}
          </p>
          {mechanic && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: "var(--muted-foreground, rgba(0,0,0,0.5))" }}
            >
              {mechanic.includes("@") ? mechanic.split("@")[0] : mechanic}
            </p>
          )}
          <p
            className="text-xs mt-1"
            style={{ color: "var(--muted-foreground, rgba(0,0,0,0.4))", opacity: 0.7 }}
          >
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
            className="p-1.5 rounded-full transition-all"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
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
                className="absolute top-10 right-0 z-50 min-w-[140px] rounded-xl overflow-hidden"
                style={{
                  background: "var(--popover, #fff)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-foreground/5 transition-colors"
                  style={{ color: "var(--foreground)" }}
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
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors"
                  style={{ color: "#ef4444" }}
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
