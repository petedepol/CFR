// NeoSettingsPage.jsx - Fox Live Valve shock tune image storage
// Store screenshots of Neo settings per rider per bike type

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useOutletContext, useLocation } from "react-router-dom";
import { ArrowLeft, Plus, X, Upload, ChevronDown, Loader2 } from "lucide-react";
import { Drawer } from "vaul";
// eslint-disable-next-line no-unused-vars
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

// Riders list
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.png" },
];

// Race bike only
const RACE_BIKE = "Jekyll";

export default function NeoSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, displayName } = useAuth();
  const toast = useToast();
  const { isDark } = useOutletContext();

  // State
  const [rider, setRider] = useState(searchParams.get("rider") || "");
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
    setRiderPickerOpen(false);
    setImportModalOpen(false);
    setFullscreenImage(null);
    setEditingTune(null);
    setDeleteConfirm(null);
  }, [location.pathname]);

  // Import form state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
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

  // Handle file selection
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setImportFile(file);
    setImportPreview(URL.createObjectURL(file));
  }

  // Handle import
  async function handleImport() {
    if (!importFile || !importTuneName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setImporting(true);
    try {
      await ensureSession();

      // Upload image - use display name from allowed_users
      const mechanic = displayName || user?.email || "unknown";
      const imageUrl = await uploadNeoImage(importFile, rider, mechanic);

      // Insert record
      await insertNeoSettings({
        rider,
        mechanic,
        bikeType: RACE_BIKE,
        tuneName: importTuneName.trim(),
        imageUrl,
        notes: importNotes.trim(),
      });

      toast.success("Tune imported successfully");
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
    setImportFile(null);
    setImportPreview(null);
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
  const pageBackground = isDark ? "#121212" : "rgba(232,228,220,1)";
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
            ? "bg-[rgba(18,18,18,0.85)] border-[#2a2a2a]"
            : "bg-[rgba(232,228,220,0.85)] border-[rgba(0,0,0,0.08)]"
        }`}>
          <button
            onClick={() => navigate("/v3")}
            className={`p-2 -ml-2 rounded-xl ${
              isDark
                ? "text-white active:bg-[rgba(255,255,255,0.06)]"
                : "text-[#5A7A70] active:bg-[rgba(30,51,49,0.06)]"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#1e3331]"}`}>
            Neo Settings
          </h1>
        </header>

        {/* Rider Selection */}
        <div className="p-6">
          <p className={`text-center mb-6 ${isDark ? "text-[#888888]" : "text-[#5A7A70]"}`}>
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
          ? "bg-[rgba(18,18,18,0.85)] border-[#2a2a2a]"
          : "bg-[rgba(232,228,220,0.85)] border-[rgba(0,0,0,0.08)]"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/v3")}
            className={`p-2 -ml-2 rounded-xl ${
              isDark
                ? "text-white active:bg-[rgba(255,255,255,0.06)]"
                : "text-[#5A7A70] active:bg-[rgba(30,51,49,0.06)]"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#1e3331]"}`}>
            Neo Settings
          </h1>
        </div>

        {/* Rider Switcher */}
        <button
          onClick={() => setRiderPickerOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            isDark
              ? "bg-[#1e1e1e] text-white active:bg-[#252525]"
              : "bg-[rgba(30,51,49,0.06)] text-[#1e3331] active:bg-[rgba(30,51,49,0.10)]"
          }`}
        >
          <img
            src={RIDERS.find((r) => r.name === rider)?.image || ""}
            alt={rider}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="font-medium text-sm">{rider}</span>
          <ChevronDown size={16} className={isDark ? "text-[#888888]" : "text-[#8A9A94]"} />
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
            bg-[#ff6b2c]
            shadow-[0_8px_24px_rgba(255,107,44,0.40)]
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
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark
                ? "#1e1e1e"
                : "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%)," +
                  "rgba(232,228,220,0.98)",
            }}
          >
            {/* Drag handle */}
            <div className="p-4 rounded-t-[32px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${
                isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
            </div>

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
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark ? "#1e1e1e" : "rgba(232,228,220,0.98)",
              maxHeight: "90vh",
            }}
          >
            <div className="p-4 overflow-y-auto">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"
              }`} />

              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#1e3331]"}`}>
                  Import Neo Tune
                </h2>
                <button
                  onClick={() => setImportModalOpen(false)}
                  className={`p-2 rounded-full ${
                    isDark
                      ? "bg-[#252525] text-[#888888]"
                      : "bg-[rgba(30,51,49,0.08)] text-[#5A7A70]"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* File Input / Preview */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-[#888888]" : "text-[#1e3331]"}`}>
                  Screenshot *
                </label>
                {importPreview ? (
                  <div className="relative">
                    <img
                      src={importPreview}
                      alt="Preview"
                      className={`w-full rounded-2xl object-contain max-h-64 ${
                        isDark ? "bg-[#252525]" : "bg-[rgba(30,51,49,0.06)]"
                      }`}
                    />
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 p-2 rounded-full bg-[rgba(30,51,49,0.70)]"
                    >
                      <X size={16} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-12 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
                      isDark
                        ? "border-[#333333] text-[#888888] hover:border-[#444444]"
                        : "border-[rgba(30,51,49,0.20)] text-[#5A7A70] hover:border-[rgba(30,51,49,0.35)]"
                    }`}
                  >
                    <Upload size={32} />
                    <span>Tap to select image</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Tune Name */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-[#888888]" : "text-[#1e3331]"}`}>
                  Tune Name *
                </label>
                <input
                  type="text"
                  value={importTuneName}
                  onChange={(e) => setImportTuneName(e.target.value)}
                  placeholder="e.g., Race - Leogang"
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-[#252525] border-[#333333] text-white placeholder:text-[#666666] focus:ring-[rgba(255,107,44,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-[#1e3331] placeholder:text-[#8A9A94] focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-[#888888]" : "text-[#1e3331]"}`}>
                  Notes (optional)
                </label>
                <textarea
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                  placeholder="e.g., Bump sensitivity position 2"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl resize-none border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-[#252525] border-[#333333] text-white placeholder:text-[#666666] focus:ring-[rgba(255,107,44,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-[#1e3331] placeholder:text-[#8A9A94] focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleImport}
                disabled={importing || !importFile || !importTuneName.trim()}
                className="
                  w-full py-4 rounded-2xl font-bold text-white
                  flex items-center justify-center gap-2
                  bg-[#ff6b2c]
                  shadow-[0_8px_20px_rgba(255,107,44,0.35)]
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
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,51,49,0.95)]"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-3 rounded-full z-10 bg-[rgba(255,255,255,0.10)]"
            >
              <X size={24} color="#fff" />
            </button>

            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={fullscreenImage.full_spec?.image_url}
              alt={fullscreenImage.full_spec?.tune_name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Info overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 p-6"
              style={{
                background: "linear-gradient(transparent, rgba(30,51,49,0.90))",
              }}
            >
              <p className="text-white font-bold text-lg">
                {fullscreenImage.full_spec?.tune_name}
              </p>
              <p className="text-white/60 text-sm">
                {fullscreenImage.full_spec?.bike_type}
              </p>
              {fullscreenImage.full_spec?.notes && (
                <p className="text-white/50 text-sm mt-2">
                  {fullscreenImage.full_spec.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <Drawer.Root open={!!editingTune} onOpenChange={(open) => !open && setEditingTune(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{ background: isDark ? "#1e1e1e" : "rgba(232,228,220,0.98)" }}
          >
            <div className="p-4">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
              <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-[#1e3331]"}`}>
                Edit Tune
              </h2>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-[#888888]" : "text-[#1e3331]"}`}>
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
                      ? "bg-[#252525] border-[#333333] text-white placeholder:text-[#666666] focus:ring-[rgba(255,107,44,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-[#1e3331] placeholder:text-[#8A9A94] focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-[#888888]" : "text-[#1e3331]"}`}>
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
                      ? "bg-[#252525] border-[#333333] text-white placeholder:text-[#666666] focus:ring-[rgba(255,107,44,0.25)]"
                      : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-[#1e3331] placeholder:text-[#8A9A94] focus:ring-[rgba(233,78,27,0.25)]"
                  }`}
                />
              </div>

              <button
                onClick={handleEditSave}
                className="
                  w-full py-4 rounded-2xl font-bold text-white
                  bg-[#ff6b2c]
                  shadow-[0_8px_20px_rgba(255,107,44,0.35)]
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
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{ background: isDark ? "#1e1e1e" : "rgba(232,228,220,0.98)" }}
          >
            <div className="p-4">
              {/* Drag handle */}
              <div className={`mx-auto w-12 h-1.5 rounded-full mb-4 ${
                isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-[#1e3331]"}`}>
                Delete Tune?
              </h2>
              <p className={`mb-6 ${isDark ? "text-[#888888]" : "text-[#5A7A70]"}`}>
                This will permanently delete "{deleteConfirm?.full_spec?.tune_name}". This
                action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 py-3 rounded-xl font-semibold ${
                    isDark
                      ? "bg-[#252525] text-white"
                      : "bg-[rgba(30,51,49,0.08)] text-[#1e3331]"
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
