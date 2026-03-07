// src/features/dashboard/components/ImportPlanModal.jsx
// Simplified modal for importing plans via AI parsing

import { useState } from "react";
import { Drawer } from "vaul";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "../../../ui/v3Theme.js";
import { parseWithAI } from "../api/dailyPlansApi.js";

export function ImportPlanModal({ isOpen, onClose, onImport, currentDate, existingPlan }) {
  const isDark = useTheme();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedPlan, setParsedPlan] = useState(null);
  const [error, setError] = useState(null);

  const existingItemCount =
    (existingPlan?.plan_data?.timeBlocks?.length || 0) +
    (existingPlan?.plan_data?.tasks?.length || 0);

  const handleParse = async () => {
    if (!text.trim()) return;

    setParsing(true);
    setError(null);
    setParsedPlan(null);

    try {
      const parsed = await parseWithAI(text);
      setParsedPlan(parsed);
    } catch (err) {
      console.error("Parse error:", err);
      setError(err.message || "Failed to parse plan. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = () => {
    if (!parsedPlan) return;

    onImport({
      event: parsedPlan.event || "Race Day",
      radioChannel: parsedPlan.radioChannel,
      timeBlocks: parsedPlan.timeBlocks || [],
      tasks: parsedPlan.tasks || [],
      notes: parsedPlan.notes || "",
    });

    resetForm();
  };

  const resetForm = () => {
    setText("");
    setParsedPlan(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Theme-aware colors
  const overlayBg = isDark ? "bg-black/60" : "bg-black/30";
  const sheetBg = isDark ? "bg-zinc-900" : "bg-white";
  const handleColor = isDark ? "bg-white/20" : "bg-slate-300";
  const titleColor = isDark ? "text-white" : "text-slate-900";
  const subtitleColor = isDark ? "text-white/50" : "text-slate-500";
  const infoBg = isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200";
  const infoText = isDark ? "text-white/60" : "text-slate-600";
  const inputBg = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";
  const inputFocus = isDark ? "focus:ring-orange-500/30" : "focus:ring-orange-500/20";
  const previewBg = isDark ? "bg-white/5" : "bg-slate-50";
  const previewText = isDark ? "text-white/80" : "text-slate-700";
  const previewTextMuted = isDark ? "text-white/50" : "text-slate-500";
  const previewTextLight = isDark ? "text-white/40" : "text-slate-400";
  const previewTextDash = isDark ? "text-white/30" : "text-slate-300";
  const previewDivider = isDark ? "border-white/5" : "border-slate-200";
  const notesBg = isDark ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-200";
  const notesText = isDark ? "text-orange-400" : "text-orange-600";
  const editBtnBg = isDark ? "bg-white/5 text-white/70" : "bg-slate-100 text-slate-700";

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className={`fixed inset-0 ${overlayBg} z-40`} />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none">
          <div
            className={`rounded-t-[28px] overflow-hidden ${sheetBg}`}
            style={{ maxHeight: "85dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className={`w-10 h-1 rounded-full ${handleColor}`} />
            </div>

            <Drawer.Title className="sr-only">Import Plan</Drawer.Title>
            <div className="px-6 pb-8 overflow-y-auto" style={{ maxHeight: "75dvh" }}>
              {/* Title */}
              <h2 className={`text-lg font-bold ${titleColor} text-center mb-6`}>
                Import Plan
              </h2>

              {!parsedPlan ? (
                <>
                  {/* Instructions */}
                  <p className={`text-sm ${subtitleColor} text-center mb-4`}>
                    Paste your WhatsApp message and AI will structure it automatically.
                  </p>

                  {/* Existing items info */}
                  {existingItemCount > 0 && (
                    <div className={`mb-4 px-4 py-3 rounded-xl border ${infoBg}`}>
                      <p className={`text-sm ${infoText} text-center`}>
                        Will merge with {existingItemCount} existing item
                        {existingItemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}

                  {/* Text Input */}
                  <div className="mb-4">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Paste race day plan here...

Example:
Sunday XCO race day.
0730-0900 - breakfast
0845 - JN/AS activation
1330 - Women's Race`}
                      rows={10}
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} text-sm focus:outline-none focus:ring-2 ${inputFocus} resize-none font-mono`}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                  )}

                  {/* Parse Button */}
                  <button
                    onClick={handleParse}
                    disabled={!text.trim() || parsing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                  >
                    {parsing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Parse with AI
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Preview */}
                  <div className="mb-6">
                    {/* Event name */}
                    {parsedPlan.event && (
                      <div className="text-center mb-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 text-sm font-semibold">
                          {parsedPlan.event}
                        </span>
                      </div>
                    )}

                    {/* Schedule items */}
                    <div className="space-y-2 mb-4">
                      <p className={`text-xs ${previewTextLight} uppercase tracking-wider font-semibold`}>
                        Schedule ({parsedPlan.timeBlocks?.length || 0})
                      </p>
                      <div className={`${previewBg} rounded-xl p-3 max-h-48 overflow-y-auto`}>
                        {parsedPlan.timeBlocks?.map((block, i) => (
                          <div
                            key={i}
                            className={`text-sm py-1.5 border-b ${previewDivider} last:border-0`}
                          >
                            <span className={`font-mono ${previewTextMuted}`}>{block.time}</span>
                            <span className={`mx-2 ${previewTextDash}`}>—</span>
                            <span className={previewText}>{block.title}</span>
                          </div>
                        ))}
                        {(!parsedPlan.timeBlocks || parsedPlan.timeBlocks.length === 0) && (
                          <p className={`text-sm ${previewTextMuted} text-center py-2`}>
                            No schedule items found
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tasks */}
                    {parsedPlan.tasks?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className={`text-xs ${previewTextLight} uppercase tracking-wider font-semibold`}>
                          Tasks ({parsedPlan.tasks.length})
                        </p>
                        <div className={`${previewBg} rounded-xl p-3 max-h-32 overflow-y-auto`}>
                          {parsedPlan.tasks.map((task, i) => (
                            <div
                              key={i}
                              className={`text-sm py-1 border-b ${previewDivider} last:border-0`}
                            >
                              <span className={`font-mono ${previewTextMuted}`}>{task.time}</span>
                              <span className={`mx-2 ${previewTextDash}`}>—</span>
                              <span className={previewText}>{task.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {parsedPlan.notes && (
                      <div className={`${notesBg} border rounded-xl p-3`}>
                        <p className={`text-sm ${notesText}`}>"{parsedPlan.notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setParsedPlan(null)}
                      className={`flex-1 px-6 py-4 rounded-xl ${editBtnBg} font-semibold active:scale-[0.98] transition-all`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-4 rounded-xl bg-green-500 text-white font-semibold active:scale-[0.98] transition-all"
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
