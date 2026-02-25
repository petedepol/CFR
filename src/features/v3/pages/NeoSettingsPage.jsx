// NeoSettingsPage.jsx - Fox Live Valve shock tune image storage
// Store screenshots of Neo settings per rider per bike type

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useOutletContext, useLocation } from "react-router-dom";
import { ArrowLeft, Plus, X, Upload, ChevronDown, Loader2 } from "lucide-react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession } from "../../measurements/api/measurementsApi";
import {
  fetchNeoSettingsByRider,
  insertNeoSettings,
  updateNeoSettings,
  deleteNeoSettings,
  uploadNeoImage,
  cleanupOldNeoSettings,
} from "../api/neoSettingsApi.js";
import { NeoTuneCard } from "../components/NeoTuneCard.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { EmptyStatePreset, SpinnerOverlay } from "../../../components/ui/index.js";

import { RIDERS, VALID_RIDER_NAMES } from "../constants/riders.js";

// Race bike only
const RACE_BIKE = "Jekyll";

export default function NeoSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, displayName } = useAuth();
  const toast = useToast();
  const { isDark } = useOutletContext();

  // State
  const initialRider = searchParams.get("rider") || "";
  const [rider, setRider] = useState(VALID_RIDER_NAMES.has(initialRider) ? initialRider : "");
  const [tunes, setTunes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modals
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [editingTune, setEditingTune] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Close modals on navigation (fixes iOS swipe-back leaving modals open)
  const location = useLocation();
  useEffect(() => {
    const closeAllModals = () => {
      setRiderPickerOpen(false);
      setImportModalOpen(false);
      setFullscreenImage(null);
      setEditingTune(null);
      setDeleteConfirm(null);
    };

    // Close on route change
    closeAllModals();

    // Also listen to popstate for iOS swipe-back gesture
    window.addEventListener('popstate', closeAllModals);
    return () => window.removeEventListener('popstate', closeAllModals);
  }, [location.pathname]);

  // Import form state
  const [importFiles, setImportFiles] = useState([]);
  const [importPreviews, setImportPreviews] = useState([]);
  const [importTuneName, setImportTuneName] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null);

  // Everyone is admin for this internal tool
  useEffect(() => {
    setIsAdmin(true);
  }, []);

  // Load tunes when rider changes
  useEffect(() => {
    if (!rider) return;
    loadTunes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider]);

  async function loadTunes() {
    setLoading(true);
    try {
      await ensureSession();
      const data = await fetchNeoSettingsByRider(rider);
      setTunes(data);
    } catch (err) {
      console.error("Failed to load neo settings:", err);
      toast.error("Failed to load tunes");
    } finally {
      setLoading(false);
    }
  }

  // Filter tunes by bike type
  // Filter to race bike only
  const filteredTunes = tunes.filter((t) => t.full_spec?.bike_type === RACE_BIKE);

  // Handle file selection (multiple)
  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const validFiles = [];
    const validPreviews = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image — skipped`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB — skipped`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length === 0) return;

    setImportFiles((prev) => [...prev, ...validFiles]);
    setImportPreviews((prev) => [...prev, ...validPreviews]);
  }

  // Remove a single file from the import list
  function removeImportFile(index) {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
    setImportPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Handle import
  async function handleImport() {
    if (importFiles.length === 0 || !importTuneName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setImporting(true);
    try {
      await ensureSession();

      // Upload all images sequentially
      const mechanic = displayName || user?.email || "unknown";
      const imageUrls = [];
      for (const file of importFiles) {
        const url = await uploadNeoImage(file, rider, mechanic);
        imageUrls.push(url);
      }

      // Insert record with all image URLs
      await insertNeoSettings({
        rider,
        mechanic,
        bikeType: RACE_BIKE,
        tuneName: importTuneName.trim(),
        imageUrls,
        notes: importNotes.trim(),
      });

      toast.success(`Tune imported with ${imageUrls.length} image${imageUrls.length > 1 ? "s" : ""}`);
      setImportModalOpen(false);
      resetImportForm();

      // Cleanup old tunes (keep last 20)
      cleanupOldNeoSettings(rider, 20).catch(() => {});

      loadTunes();
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import tune");
    } finally {
      setImporting(false);
    }
  }

  function resetImportForm() {
    importPreviews.forEach((url) => URL.revokeObjectURL(url));
    setImportFiles([]);
    setImportPreviews([]);
    setImportTuneName("");
    setImportNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Handle edit
  async function handleEditSave() {
    if (!editingTune) return;
    try {
      await ensureSession();
      await updateNeoSettings(editingTune.id, {
        tuneName: editingTune.newName,
        notes: editingTune.newNotes,
      });
      toast.success("Tune updated");
      setEditingTune(null);
      loadTunes();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update tune");
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await ensureSession();
      await deleteNeoSettings(deleteConfirm.id);
      toast.success("Tune deleted");
      setDeleteConfirm(null);
      loadTunes();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete tune");
    }
  }

  // Theme-specific colors
  const theme = isDark ? "dark" : "light";
  const pageBackground = isDark ? "var(--bg-app)" : "rgba(232,228,220,1)";
  const pageGradient = isDark
    ? "none"
    : "radial-gradient(520px 360px at 50% 0, rgba(30,51,49,0.30), rgba(30,51,49,0.12) 35%, transparent 70%)";

  // If no rider selected, show rider picker
  if (!rider) {
    return (
      <div
        className="min-h-dvh font-sans selection:bg-[rgba(233,78,27,0.30)]"
        style={{
          backgroundColor: pageBackground,
          backgroundImage: pageGradient,
          backgroundAttachment: "fixed",
        }}
      >
        {/* Header */}
        <header className={`sticky top-0 z-40 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3 backdrop-blur-sm border-b ${
          isDark
            ? "bg-[rgba(14,28,27,0.85)] border-chrome-strong"
            : "bg-[rgba(232,228,220,0.85)] border-[rgba(0,0,0,0.08)]"
        }`}>
          <button
            onClick={() => navigate("/v3")}
            className={`p-2 -ml-2 rounded-xl ${
              isDark
                ? "text-white active:bg-[rgba(255,255,255,0.06)]"
                : "text-text-accent-light active:bg-[rgba(30,51,49,0.06)]"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-brand-green"}`}>
            Neo Settings
          </h1>
        </header>

        {/* Rider Selection */}
        <div className="p-6">
          <p className={`text-center mb-6 ${isDark ? "text-text-muted" : "text-text-accent-light"}`}>
            Select a rider to view shock tunes
          </p>

          {/* Pyramid Layout */}
          <div className="flex flex-col items-center">
            {/* Top row - 3 riders */}
            <div className="flex justify-center gap-4 mb-6">
              {RIDERS.slice(0, 3).map((r) => (
                <Avatar
                  key={r.id}
                  name={r.name}
                  initial={r.name[0]}
                  image={r.image}
                  onClick={() => setRider(r.name)}
                  theme={theme}
                />
              ))}
            </div>

            {/* Bottom row - 2 riders, centered */}
            <div className="flex justify-center gap-4">
              {RIDERS.slice(3).map((r) => (
                <Avatar
                  key={r.id}
                  name={r.name}
                  initial={r.name[0]}
                  image={r.image}
                  onClick={() => setRider(r.name)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh pb-32 font-sans selection:bg-[rgba(233,78,27,0.30)]"
      style={{
        backgroundColor: pageBackground,
        backgroundImage: pageGradient,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className={`sticky top-0 z-40 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between backdrop-blur-sm border-b ${
        isDark
          ? "bg-[rgba(14,28,27,0.85)] border-chrome-strong"
          : "bg-[rgba(232,228,220,0.85)] border-[rgba(0,0,0,0.08)]"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/v3")}
            className={`p-2 -ml-2 rounded-xl ${
              isDark
                ? "text-white active:bg-[rgba(255,255,255,0.06)]"
                : "text-text-accent-light active:bg-[rgba(30,51,49,0.06)]"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-brand-green"}`}>
            Neo Settings
          </h1>
        </div>

        {/* Rider Switcher */}
        <button
          onClick={() => setRiderPickerOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            isDark
              ? "bg-app-surface text-white active:bg-app-elevated"
              : "bg-[rgba(30,51,49,0.06)] text-brand-green active:bg-[rgba(30,51,49,0.10)]"
          }`}
        >
          <img
            src={RIDERS.find((r) => r.name === rider)?.image || ""}
            alt={rider}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="font-medium text-sm">{rider}</span>
          <ChevronDown size={16} className={isDark ? "text-text-muted" : "text-text-muted"} />
        </button>
      </header>

      {/* Tunes Grid */}
      <div className="px-4 py-2">
        {loading ? (
          <SpinnerOverlay />
        ) : filteredTunes.length === 0 ? (
          <EmptyStatePreset preset="tunes" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredTunes.map((tune) => (
              <NeoTuneCard
                key={tune.id}
                tune={tune}
                isAdmin={isAdmin}
                onTap={() => setFullscreenImage(tune)}
                onEdit={() =>
                  setEditingTune({
                    id: tune.id,
                    newName: tune.full_spec?.tune_name || "",
                    newNotes: tune.full_spec?.notes || "",
                  })
                }
                onDelete={() => setDeleteConfirm(tune)}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Button - Fixed Bottom */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-30">
        <button
          onClick={() => setImportModalOpen(true)}
          className="
            w-full py-4 rounded-2xl font-bold text-white
            flex items-center justify-center gap-2
            bg-brand-orange
            shadow-[0_8px_24px_rgba(233,78,27,0.40)]
            active:scale-[0.98] transition-transform
          "
        >
          <Plus size={20} />
          Import Neo Tune
        </button>
      </div>

      {/* Rider Picker Modal */}
      <Drawer.Root open={riderPickerOpen} onOpenChange={setRiderPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark
                ? "var(--bg-surface)"
                : "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%)," +
                  "rgba(232,228,220,0.98)",
            }}
          >
            {/* Drag handle */}
            <div className="p-4 rounded-t-[32px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${
                isDark ? "bg-text-muted" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
            </div>
            <Drawer.Title className="sr-only">Select Rider</Drawer.Title>

            {/* Rider Grid - Pyramid Layout */}
            <div className="px-4 py-6">
              {/* Top row - 3 riders */}
              <div className="flex justify-center gap-4 mb-6">
                {RIDERS.slice(0, 3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => {
                      setRider(r.name);
                      setRiderPickerOpen(false);
                    }}
                    theme={theme}
                  />
                ))}
              </div>

              {/* Bottom row - 2 riders, centered */}
              <div className="flex justify-center gap-4">
                {RIDERS.slice(3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => {
                      setRider(r.name);
                      setRiderPickerOpen(false);
                    }}
                    theme={theme}
                  />
                ))}
              </div>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Import Modal */}
      <Drawer.Root
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) resetImportForm();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark ? "var(--bg-surface)" : "rgba(232,228,220,0.98)",
              maxHeight: "90vh",
            }}
          >
            <div className="p-4 overflow-y-auto">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-text-muted" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
              <Drawer.Title className="sr-only">Import Neo Tune</Drawer.Title>

              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-brand-green"}`}>
                  Import Neo Tune
                </h2>
                <button
                  onClick={() => setImportModalOpen(false)}
                  className={`p-2 rounded-full ${
                    isDark
                      ? "bg-app-elevated text-text-muted"
                      : "bg-[rgba(30,51,49,0.08)] text-text-accent-light"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* File Input / Preview */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-text-muted" : "text-brand-green"}`}>
                  Screenshots *
                </label>
                {importPreviews.length > 0 ? (
                  <div className="space-y-3">
                    {/* Thumbnail grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {importPreviews.map((preview, i) => (
                        <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden">
                          <img
                            src={preview}
                            alt={`Preview ${i + 1}`}
                            className={`w-full h-full object-cover ${
                              isDark ? "bg-app-elevated" : "bg-[rgba(30,51,49,0.06)]"
                            }`}
                          />
                          <button
                            onClick={() => removeImportFile(i)}
                            className="absolute top-1 right-1 p-1.5 rounded-full bg-[rgba(0,0,0,0.60)]"
                          >
                            <X size={12} color="#fff" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add more button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-colors ${
                        isDark
                          ? "border-chrome-strong text-text-muted hover:border-[#444444]"
                          : "border-[rgba(30,51,49,0.20)] text-text-accent-light hover:border-[rgba(30,51,49,0.35)]"
                      }`}
                    >
                      <Plus size={16} />
                      Add more images
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-12 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
                      isDark
                        ? "border-chrome-strong text-text-muted hover:border-[#444444]"
                        : "border-[rgba(30,51,49,0.20)] text-text-accent-light hover:border-[rgba(30,51,49,0.35)]"
                    }`}
                  >
                    <Upload size={32} />
                    <span>Tap to select images</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Tune Name */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-text-muted" : "text-brand-green"}`}>
                  Tune Name *
                </label>
                <input
                  type="text"
                  value={importTuneName}
                  onChange={(e) => setImportTuneName(e.target.value)}
                  placeholder="e.g., Race - Leogang"
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-text-muted" : "text-brand-green"}`}>
                  Notes (optional)
                </label>
                <textarea
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                  placeholder="e.g., Bump sensitivity position 2"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl resize-none border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleImport}
                disabled={importing || importFiles.length === 0 || !importTuneName.trim()}
                className="
                  w-full py-4 rounded-2xl font-bold text-white
                  flex items-center justify-center gap-2
                  bg-brand-orange
                  shadow-[0_8px_20px_rgba(233,78,27,0.35)]
                  transition-all disabled:opacity-50
                "
              >
                {importing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Save Tune
                  </>
                )}
              </button>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreenImage && (() => {
          const spec = fullscreenImage.full_spec || {};
          const allImages = spec.image_urls?.length > 0
            ? spec.image_urls
            : spec.image_url ? [spec.image_url] : [];
          const totalImages = allImages.length;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col bg-[rgba(30,51,49,0.95)]"
              onClick={() => setFullscreenImage(null)}
            >
              <button
                className="absolute top-4 right-4 p-3 rounded-full z-10 bg-[rgba(255,255,255,0.10)]"
              >
                <X size={24} color="#fff" />
              </button>

              {/* Scrollable images */}
              <div
                className="flex-1 overflow-y-auto flex flex-col items-center justify-start gap-4 py-16 px-4"
                onClick={(e) => e.stopPropagation()}
              >
                {allImages.map((url, i) => (
                  <motion.img
                    key={i}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    src={url}
                    alt={`${spec.tune_name || "Neo tune"} ${i + 1}`}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                ))}
              </div>

              {/* Info overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none"
                style={{
                  background: "linear-gradient(transparent, rgba(30,51,49,0.90))",
                }}
              >
                <p className="text-white font-bold text-lg">
                  {spec.tune_name}
                </p>
                <p className="text-white/60 text-sm">
                  {spec.bike_type}
                </p>
                {spec.notes && (
                  <p className="text-white/50 text-sm mt-2">
                    {spec.notes}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Edit Modal */}
      <Drawer.Root open={!!editingTune} onOpenChange={(open) => !open && setEditingTune(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{ background: isDark ? "var(--bg-surface)" : "rgba(232,228,220,0.98)" }}
          >
            <div className="p-4">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-text-muted" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
              <Drawer.Title className="sr-only">Edit Tune</Drawer.Title>
              <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-brand-green"}`}>
                Edit Tune
              </h2>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-text-muted" : "text-brand-green"}`}>
                  Tune Name
                </label>
                <input
                  type="text"
                  value={editingTune?.newName || ""}
                  onChange={(e) =>
                    setEditingTune((prev) => prev && { ...prev, newName: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-text-muted" : "text-brand-green"}`}>
                  Notes
                </label>
                <textarea
                  value={editingTune?.newNotes || ""}
                  onChange={(e) =>
                    setEditingTune((prev) => prev && { ...prev, newNotes: e.target.value })
                  }
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl resize-none border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-muted focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              <button
                onClick={handleEditSave}
                className="
                  w-full py-4 rounded-2xl font-bold text-white
                  bg-brand-orange
                  shadow-[0_8px_20px_rgba(233,78,27,0.35)]
                "
              >
                Save Changes
              </button>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Delete Confirmation */}
      <Drawer.Root open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{ background: isDark ? "var(--bg-surface)" : "rgba(232,228,220,0.98)" }}
          >
            <div className="p-4">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-text-muted" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
              <Drawer.Title className="sr-only">Delete Tune</Drawer.Title>
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-brand-green"}`}>
                Delete Tune?
              </h2>
              <p className={`mb-6 ${isDark ? "text-text-muted" : "text-text-accent-light"}`}>
                This will permanently delete "{deleteConfirm?.full_spec?.tune_name}". This
                action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 py-3 rounded-xl font-semibold ${
                    isDark
                      ? "bg-app-elevated text-white"
                      : "bg-[rgba(30,51,49,0.08)] text-brand-green"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
