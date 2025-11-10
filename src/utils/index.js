export function calculateWaitDays(date) {
  if (!date) return 0;
  const now = new Date();
  const d = new Date(date);
  return Math.ceil((now - d) / (1000 * 60 * 60 * 24));
}

export function filterPatients(patients, filters) {
  return patients.filter((p) => {
    if (
      filters.searchTerm &&
      !`${p.name} ${p.patient_id}`
        .toLowerCase()
        .includes(filters.searchTerm.toLowerCase())
    )
      return false;
    if (filters.urgency !== "all" && p.urgency !== filters.urgency) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.surgeon !== "all" && p.surgeon !== filters.surgeon) return false;
    if (
      filters.surgeryType !== "all" &&
      p.surgery_type !== filters.surgeryType
    )
      return false;
    return true;
  });
}

export function sortPatients(patients) {
  const order = { urgent: 0, soon: 1, routine: 2 };
  return [...patients].sort(
    (a, b) => (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3)
  );
}

export function getUniqueSurgeons(patients) {
  const surgeons = patients.map((p) => p.surgeon).filter(Boolean);
  return [...new Set(surgeons)];
}

export function calculateStats(patients, calculateWaitDays) {
  if (!patients.length) return {};
  const total = patients.length;
  const completed = patients.filter((p) => p.status === "Completed").length;
  const highUrgency = patients.filter((p) => p.urgency === "urgent").length;
  const averageWaitDays = Math.round(
    patients.reduce((sum, p) => sum + calculateWaitDays(p.created_at), 0) /
      total
  );
  return { total, completed, highUrgency, averageWaitDays };
}

export function exportPatientsToCSV(patients, calculateWaitDays) {
  const headers = [
    "Name",
    "Patient ID",
    "Surgeon",
    "Surgery Type",
    "Urgency",
    "Status",
    "Wait Days",
  ];
  const rows = patients.map((p) => [
    p.name,
    p.patient_id,
    p.surgeon,
    p.surgery_type,
    p.urgency,
    p.status,
    calculateWaitDays(p.created_at),
  ]);
  const csv =
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "patients.csv";
  link.click();
}
