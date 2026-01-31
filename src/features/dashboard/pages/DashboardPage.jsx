// src/features/dashboard/pages/DashboardPage.jsx
// iOS-style widget dashboard

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useTheme } from "../../../ui/v3Theme.js";
import { pageBg, headerBar, navButton, navIcon, dateButton, dateText, eventText, clearButton, importButton } from "../../../ui/widgetStyles.js";

import { ClockWidget } from "../components/ClockWidget.jsx";
import { CountdownWidget } from "../components/CountdownWidget.jsx";
import { WeatherWidgetV2 } from "../components/WeatherWidgetV2.jsx";
import { ScheduleWidget } from "../components/ScheduleWidget.jsx";
import { TasksWidget } from "../components/TasksWidget.jsx";
import { ImportPlanModal } from "../components/ImportPlanModal.jsx";
import { fetchPlanByDate, savePlan, deletePlan, updatePlanData } from "../api/dailyPlansApi.js";

function formatDateShort(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const isDark = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Fetch plan when date changes
  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      try {
        const data = await fetchPlanByDate(selectedDate);
        setPlan(data);
      } catch (err) {
        console.error("Failed to load plan:", err);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [selectedDate]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Toggle pin on an item
  const handleTogglePin = async (itemId, type) => {
    if (!plan?.id || !plan?.plan_data) return;

    const planData = { ...plan.plan_data };

    if (type === "timeBlock") {
      const blocks = planData.timeBlocks || [];
      const index = blocks.findIndex((b) => b.id === itemId);
      if (index !== -1) {
        blocks[index] = { ...blocks[index], pinned: !blocks[index].pinned };
        planData.timeBlocks = blocks;
      }
    } else if (type === "task") {
      const tasks = planData.tasks || [];
      const index = tasks.findIndex((t) => t.id === itemId);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], pinned: !tasks[index].pinned };
        planData.tasks = tasks;
      }
    }

    try {
      const updated = await updatePlanData(plan.id, planData, displayName);
      setPlan(updated);
    } catch (err) {
      console.error("Failed to update pin:", err);
    }
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId) => {
    if (!plan?.id || !plan?.plan_data) return;

    const planData = { ...plan.plan_data };
    const tasks = planData.tasks || [];
    const index = tasks.findIndex((t) => t.id === taskId);

    if (index !== -1) {
      const task = tasks[index];
      tasks[index] = {
        ...task,
        completed: !task.completed,
        completedBy: !task.completed ? displayName : null,
        completedAt: !task.completed ? new Date().toISOString() : null,
      };
      planData.tasks = tasks;

      try {
        const updated = await updatePlanData(plan.id, planData, displayName);
        setPlan(updated);
      } catch (err) {
        console.error("Failed to toggle task:", err);
      }
    }
  };

  // Handle plan import (simplified - always merge + dedupe)
  const handlePlanImported = async (importedData) => {
    try {
      let planData;

      if (plan?.plan_data) {
        // Merge with existing + deduplicate
        const existingBlocks = plan.plan_data.timeBlocks || [];
        const existingTasks = plan.plan_data.tasks || [];

        // Dedupe helper
        const isDupeBlock = (a, b) =>
          a.time === b.time && a.title?.toLowerCase() === b.title?.toLowerCase();
        const isDupeTask = (a, b) =>
          a.time === b.time && a.text?.toLowerCase() === b.text?.toLowerCase();

        // Add new blocks that aren't dupes
        const newBlocks = (importedData.timeBlocks || []).filter(
          (newB) => !existingBlocks.some((existB) => isDupeBlock(existB, newB))
        );
        const newTasks = (importedData.tasks || []).filter(
          (newT) => !existingTasks.some((existT) => isDupeTask(existT, newT))
        );

        planData = {
          timeBlocks: [...existingBlocks, ...newBlocks],
          tasks: [...existingTasks, ...newTasks],
          notes: plan.plan_data.notes || importedData.notes || "",
        };
      } else {
        planData = {
          timeBlocks: importedData.timeBlocks || [],
          tasks: importedData.tasks || [],
          notes: importedData.notes || "",
        };
      }

      const saved = await savePlan({
        planDate: selectedDate,
        event: importedData.event || plan?.event || "Race Day",
        location: plan?.location || null,
        locationLat: plan?.location_lat || null,
        locationLon: plan?.location_lon || null,
        radioChannel: importedData.radioChannel || plan?.radio_channel || null,
        planData,
        createdBy: displayName || "Unknown",
      });

      setPlan(saved);
      setImportModalOpen(false);
    } catch (err) {
      console.error("Failed to save plan:", err);
    }
  };

  // Clear plan
  const handleClearPlan = async () => {
    if (!plan?.id) return;
    if (!window.confirm("Clear all data for this day?")) return;

    try {
      await deletePlan(plan.id);
      setPlan(null);
    } catch (err) {
      console.error("Failed to clear plan:", err);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const timeBlocks = plan?.plan_data?.timeBlocks || [];
  const tasks = plan?.plan_data?.tasks || [];

  // Theme-aware skeleton colors
  const skeletonBg = isDark ? "bg-white/5" : "bg-slate-200";

  return (
    <div className={pageBg(isDark)}>
      {/* Header */}
      <header className={headerBar(isDark)}>
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <button
              onClick={() => navigate("/v3")}
              className={`${navButton(isDark)} -ml-2`}
            >
              <ArrowLeft size={20} className={navIcon(isDark)} />
            </button>

            {/* Date navigator */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousDay}
                className={navButton(isDark)}
              >
                <ChevronLeft size={18} className={navIcon(isDark)} />
              </button>

              <button
                onClick={goToToday}
                className={dateButton(isDark)}
              >
                <span className={dateText(isDark)}>
                  {isToday ? "Today" : formatDateShort(selectedDate)}
                </span>
              </button>

              <button
                onClick={goToNextDay}
                className={navButton(isDark)}
              >
                <ChevronRight size={18} className={navIcon(isDark)} />
              </button>
            </div>

            {/* Clear button */}
            {plan && (
              <button
                onClick={handleClearPlan}
                className={clearButton(isDark)}
              >
                Clear
              </button>
            )}
            {!plan && <div className="w-12" />}
          </div>

          {/* Event name */}
          {plan?.event && (
            <p className={`text-center mt-1 ${eventText(isDark)}`}>{plan.event}</p>
          )}
        </div>
      </header>

      {/* Widget Grid */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-24 rounded-[28px] ${skeletonBg} animate-pulse`}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Clock Widget */}
            <ClockWidget />

            {/* Countdown Widget */}
            <CountdownWidget timeBlocks={timeBlocks} tasks={tasks} />

            {/* Weather Widget */}
            <WeatherWidgetV2
              location={plan?.location}
              lat={plan?.location_lat}
              lon={plan?.location_lon}
            />

            {/* Schedule Widget */}
            <ScheduleWidget
              timeBlocks={timeBlocks}
              onTogglePin={handleTogglePin}
            />

            {/* Tasks Widget */}
            <TasksWidget
              tasks={tasks}
              onTogglePin={handleTogglePin}
              onToggleComplete={handleToggleComplete}
            />
          </motion.div>
        )}
      </main>

      {/* Import Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setImportModalOpen(true)}
          className={importButton}
        >
          <Sparkles size={18} />
          Import Plan
        </motion.button>
      </div>

      {/* Import Modal */}
      <ImportPlanModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handlePlanImported}
        currentDate={selectedDate}
        existingPlan={plan}
      />
    </div>
  );
}
