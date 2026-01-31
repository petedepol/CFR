import { supabase } from "../../../lib/supabaseClient";

// ---------- Data Fetching ----------

/**
 * Fetch export data based on filters
 */
export async function fetchExportData({ dataTypes, rider, bikeType, startDate, endDate }) {
  const results = {};

  // Build date filter
  const dateFilter = (query) => {
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }
    return query;
  };

  const serviceDateFilter = (query) => {
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    return query;
  };

  // Jig measurements (type starts with "quick")
  if (dataTypes.includes("jig")) {
    let query = supabase
      .from("bike_measurements")
      .select("*")
      .like("type", "quick%")
      .order("timestamp", { ascending: false });

    if (rider && rider !== "all") {
      query = query.eq("rider", rider);
    }
    query = dateFilter(query);

    const { data, error } = await query;
    if (!error) results.jig = data || [];
  }

  // Specs (type starts with "full")
  if (dataTypes.includes("specs")) {
    let query = supabase
      .from("bike_measurements")
      .select("*")
      .like("type", "full%")
      .order("timestamp", { ascending: false });

    if (rider && rider !== "all") {
      query = query.eq("rider", rider);
    }
    query = dateFilter(query);

    const { data, error } = await query;
    if (!error) results.specs = data || [];
  }

  // Setup (settings_mtb)
  if (dataTypes.includes("setup")) {
    let query = supabase
      .from("bike_measurements")
      .select("*")
      .eq("type", "settings_mtb")
      .order("timestamp", { ascending: false });

    if (rider && rider !== "all") {
      query = query.eq("rider", rider);
    }
    query = dateFilter(query);

    const { data, error } = await query;
    if (!error) results.setup = data || [];
  }

  // Service logs
  if (dataTypes.includes("service")) {
    let query = supabase
      .from("service_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (rider && rider !== "all") {
      query = query.eq("rider_name", rider);
    }
    if (bikeType && bikeType !== "all") {
      query = query.eq("bike_type", bikeType);
    }
    query = serviceDateFilter(query);

    const { data, error } = await query;
    if (!error) results.service = data || [];
  }

  // Dashboard data
  if (dataTypes.includes("dashboard")) {
    const { data: times } = await supabase
      .from("race_dashboard_stage_times")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: notes } = await supabase
      .from("race_dashboard_stage_notes")
      .select("*")
      .order("created_at", { ascending: false });

    results.dashboard = {
      times: times || [],
      notes: notes || [],
    };
  }

  return results;
}

// ---------- CSV Generation ----------

/**
 * Convert data to CSV string
 */
function generateCSV(data) {
  if (!data || data.length === 0) return "";

  // Flatten objects for CSV
  const flattenObject = (obj, prefix = "") => {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(result, flattenObject(val, newKey));
      } else if (Array.isArray(val)) {
        result[newKey] = val.join("; ");
      } else {
        result[newKey] = val;
      }
    }
    return result;
  };

  const flatData = data.map((row) => flattenObject(row));

  // Get all unique keys
  const allKeys = new Set();
  flatData.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
  const headers = Array.from(allKeys);

  // Build CSV
  const csvRows = [headers.join(",")];
  for (const row of flatData) {
    const values = headers.map((h) => {
      const val = row[h] ?? "";
      // Escape quotes and wrap in quotes if contains comma or newline
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes("\n") || str.includes('"')
        ? `"${str}"`
        : str;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Generate combined CSV from all data types
 */
export function generateCombinedCSV(results) {
  const sections = [];

  if (results.jig?.length) {
    sections.push("=== JIG MEASUREMENTS ===");
    sections.push(generateCSV(results.jig, "jig"));
    sections.push("");
  }

  if (results.specs?.length) {
    sections.push("=== BIKE SPECS ===");
    sections.push(generateCSV(results.specs, "specs"));
    sections.push("");
  }

  if (results.setup?.length) {
    sections.push("=== SETUP/RACE SETTINGS ===");
    sections.push(generateCSV(results.setup, "setup"));
    sections.push("");
  }

  if (results.service?.length) {
    sections.push("=== SERVICE LOGS ===");
    sections.push(generateCSV(results.service, "service"));
    sections.push("");
  }

  if (results.dashboard?.times?.length || results.dashboard?.notes?.length) {
    sections.push("=== DASHBOARD - STAGE TIMES ===");
    sections.push(generateCSV(results.dashboard.times, "times"));
    sections.push("");
    sections.push("=== DASHBOARD - STAGE NOTES ===");
    sections.push(generateCSV(results.dashboard.notes, "notes"));
  }

  return sections.join("\n");
}

// ---------- PDF Generation ----------

/**
 * Generate PDF from data
 * Uses dynamic import to avoid loading jspdf until needed
 */
export async function generatePDF(results, filters) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(255, 107, 44); // CFR Orange
  doc.text("CFR Bike App - Data Export", 14, yPos);
  yPos += 10;

  // Filters summary
  doc.setFontSize(10);
  doc.setTextColor(100);
  const filterText = [
    `Generated: ${new Date().toLocaleDateString()}`,
    filters.rider && filters.rider !== "all" ? `Rider: ${filters.rider}` : "All Riders",
    filters.bikeType && filters.bikeType !== "all" ? `Bike: ${filters.bikeType}` : "All Bikes",
    filters.dateRange ? `Period: ${filters.dateRange}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  doc.text(filterText, 14, yPos);
  yPos += 15;

  // Helper to add a table section
  const addSection = (title, data, columns) => {
    if (!data || data.length === 0) return;

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 51, 49); // CFR Green
    doc.text(title, 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [columns.map((c) => c.header)],
      body: data.map((row) => columns.map((c) => c.accessor(row) ?? "")),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [255, 107, 44] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  };

  // JIG Measurements
  if (results.jig?.length) {
    addSection("JIG Measurements", results.jig, [
      { header: "Date", accessor: (r) => formatDate(r.timestamp) },
      { header: "Rider", accessor: (r) => r.rider },
      { header: "Type", accessor: (r) => r.type },
      { header: "Setback", accessor: (r) => r.saddle_setback },
      { header: "H@4cm", accessor: (r) => r.height_4cm },
      { header: "H@15cm", accessor: (r) => r.height_15cm },
      { header: "Location", accessor: (r) => r.location },
      { header: "Mechanic", accessor: (r) => r.mechanic },
    ]);
  }

  // Specs
  if (results.specs?.length) {
    addSection("Bike Specs", results.specs, [
      { header: "Date", accessor: (r) => formatDate(r.timestamp) },
      { header: "Rider", accessor: (r) => r.rider },
      { header: "Type", accessor: (r) => r.type },
      { header: "Mechanic", accessor: (r) => r.mechanic },
      { header: "Notes", accessor: (r) => (r.notes || "").substring(0, 50) },
    ]);
  }

  // Setup
  if (results.setup?.length) {
    addSection("Race Setup", results.setup, [
      { header: "Date", accessor: (r) => formatDate(r.timestamp) },
      { header: "Rider", accessor: (r) => r.rider },
      { header: "Event", accessor: (r) => r.full_spec?.event_context || "" },
      { header: "Race", accessor: (r) => (r.full_spec?.is_race ? "✓" : "") },
      { header: "Mechanic", accessor: (r) => r.mechanic },
    ]);
  }

  // Service
  if (results.service?.length) {
    addSection("Service Logs", results.service, [
      { header: "Date", accessor: (r) => formatDate(r.created_at) },
      { header: "Rider", accessor: (r) => r.rider_name },
      { header: "Bike", accessor: (r) => r.bike_type },
      { header: "Category", accessor: (r) => r.category },
      { header: "Item", accessor: (r) => r.item },
      { header: "Mechanic", accessor: (r) => r.mechanic_name },
    ]);
  }

  // Dashboard times
  if (results.dashboard?.times?.length) {
    addSection("Dashboard - Stage Times", results.dashboard.times, [
      { header: "Date", accessor: (r) => formatDate(r.created_at) },
      { header: "Rider", accessor: (r) => r.rider_name },
      { header: "Stage", accessor: (r) => r.stage_name },
      { header: "Time", accessor: (r) => r.time_value },
    ]);
  }

  return doc;
}

// ---------- Helpers ----------

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

/**
 * Trigger file download
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export async function exportData({ dataTypes, rider, bikeType, startDate, endDate, format }) {
  // Fetch data
  const results = await fetchExportData({ dataTypes, rider, bikeType, startDate, endDate });

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `cfr-export-${timestamp}`;

  if (format === "csv") {
    const csv = generateCombinedCSV(results);
    downloadFile(csv, `${filename}.csv`, "text/csv");
  } else if (format === "pdf") {
    const doc = await generatePDF(results, { rider, bikeType, dateRange: `${startDate || "Start"} to ${endDate || "Now"}` });
    doc.save(`${filename}.pdf`);
  }

  return { success: true };
}

/**
 * Generate a digest summary for Share Now
 * @param {number} days - Number of days to look back (7 for weekly, 30 for monthly)
 */
export async function generateDigestSummary(days = 7) {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - days);
  const startDate = periodStart.toISOString();

  const results = await fetchExportData({
    dataTypes: ["jig", "setup", "service"],
    rider: "all",
    bikeType: "all",
    startDate,
    endDate: null,
  });

  // Generate summary stats
  const summary = {
    period: `${new Date(startDate).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
    days,
    jigCount: results.jig?.length || 0,
    setupCount: results.setup?.length || 0,
    serviceCount: results.service?.length || 0,
    raceSetups: results.setup?.filter((s) => s.full_spec?.is_race).length || 0,
  };

  return { summary, results };
}
