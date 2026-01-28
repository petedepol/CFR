// NeoSettingsPage.jsx - Fox Live Valve shock tune image storage
// Store screenshots of Neo settings per rider per bike type

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

// Riders list
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.jpeg" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.jpeg" },
  { id: "cole", name: "Cole", image: "/riders/cole.jpeg" },
  { id: "luca", name: "Luca", image: "/riders/luca.jpeg" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.jpeg" },
];

// Race bike only
const RACE_BIKE = "Jekyll";

export default function NeoSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, displayName } = useAuth();
  const toast = useToast();

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

  // If no rider selected, show rider picker
  if (!rider) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--background-gradient, var(--background))" }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
          style={{
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => navigate("/v3")}
            className="p-2 -ml-2 rounded-xl active:bg-foreground/5"
          >
            <ArrowLeft size={24} style={{ color: "var(--foreground)" }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            Neo Settings
          </h1>
        </header>

        {/* Rider Selection */}
        <div className="p-6">
          <p
            className="text-center mb-6"
            style={{ color: "var(--muted-foreground)" }}
          >
            Select a rider to view shock tunes
          </p>
          <div className="grid grid-cols-2 gap-3">
            {RIDERS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRider(r.name)}
                className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <img
                  src={r.image}
                  alt={r.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span
                  className="font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {r.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--background-gradient, var(--background))" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/v3")}
            className="p-2 -ml-2 rounded-xl active:bg-foreground/5"
          >
            <ArrowLeft size={24} style={{ color: "var(--foreground)" }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            Neo Settings
          </h1>
        </div>

        {/* Rider Switcher */}
        <button
          onClick={() => setRiderPickerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "var(--muted)",
            color: "var(--foreground)",
          }}
        >
          <img
            src={RIDERS.find((r) => r.name === rider)?.image || ""}
            alt={rider}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="font-medium text-sm">{rider}</span>
          <ChevronDown size={16} style={{ opacity: 0.5 }} />
        </button>
      </header>

      {/* Tunes Grid */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "#f97316" }} />
          </div>
        ) : filteredTunes.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: "var(--muted-foreground)", fontSize: 48, marginBottom: 12 }}>
              ⚡
            </p>
            <p style={{ color: "var(--muted-foreground)" }}>
              No tunes yet for {rider}
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: "var(--muted-foreground)", opacity: 0.7 }}
            >
              Tap "Import Neo Tune" to add one
            </p>
          </div>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Button - Fixed Bottom */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-30">
        <button
          onClick={() => setImportModalOpen(true)}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)",
          }}
        >
          <Plus size={20} />
          Import Neo Tune
        </button>
      </div>

      {/* Rider Picker Modal */}
      <Drawer.Root open={riderPickerOpen} onOpenChange={setRiderPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50"
            style={{ background: "var(--background)", maxHeight: "60vh" }}
          >
            <div className="p-4">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-foreground/20 mb-4" />
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Select Rider
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {RIDERS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRider(r.name);
                      setRiderPickerOpen(false);
                    }}
                    className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      background: rider === r.name ? "rgba(249, 115, 22, 0.1)" : "var(--muted)",
                      border: rider === r.name ? "2px solid #f97316" : "2px solid transparent",
                    }}
                  >
                    <img
                      src={r.image}
                      alt={r.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span
                      className="font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50"
            style={{ background: "var(--background)", maxHeight: "90vh" }}
          >
            <div className="p-4 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-foreground/20 mb-4" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Import Neo Tune
                </h2>
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="p-2 rounded-full"
                  style={{ background: "var(--muted)" }}
                >
                  <X size={20} style={{ color: "var(--foreground)" }} />
                </button>
              </div>

              {/* File Input / Preview */}
              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Screenshot *
                </label>
                {importPreview ? (
                  <div className="relative">
                    <img
                      src={importPreview}
                      alt="Preview"
                      className="w-full rounded-2xl object-contain max-h-64"
                      style={{ background: "var(--muted)" }}
                    />
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 p-2 rounded-full"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X size={16} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-12 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }}
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
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Tune Name *
                </label>
                <input
                  type="text"
                  value={importTuneName}
                  onChange={(e) => setImportTuneName(e.target.value)}
                  placeholder="e.g., Race - Leogang"
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Notes (optional)
                </label>
                <textarea
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                  placeholder="e.g., Bump sensitivity position 2"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleImport}
                disabled={importing || !importFile || !importTuneName.trim()}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                }}
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.95)" }}
            onClick={() => setFullscreenImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-3 rounded-full z-10"
              style={{ background: "rgba(255,255,255,0.1)" }}
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
                background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
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
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50"
            style={{ background: "var(--background)" }}
          >
            <div className="p-4">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-foreground/20 mb-4" />
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Edit Tune
              </h2>

              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Tune Name
                </label>
                <input
                  type="text"
                  value={editingTune?.newName || ""}
                  onChange={(e) =>
                    setEditingTune((prev) => prev && { ...prev, newName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Notes
                </label>
                <textarea
                  value={editingTune?.newNotes || ""}
                  onChange={(e) =>
                    setEditingTune((prev) => prev && { ...prev, newNotes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <button
                onClick={handleEditSave}
                className="w-full py-4 rounded-2xl font-bold text-white"
                style={{ background: "#f97316" }}
              >
                Save Changes
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Delete Confirmation */}
      <Drawer.Root open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50"
            style={{ background: "var(--background)" }}
          >
            <div className="p-4">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-foreground/20 mb-4" />
              <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                Delete Tune?
              </h2>
              <p className="mb-6" style={{ color: "var(--muted-foreground)" }}>
                This will permanently delete "{deleteConfirm?.full_spec?.tune_name}". This
                action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{
                    background: "var(--muted)",
                    color: "var(--foreground)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-semibold text-white"
                  style={{ background: "#ef4444" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
