// Calculate wait days from added date
export const calculateWaitDays = (addedDate) => {
  const now = new Date();
  const added = new Date(addedDate);
  const diffTime = Math.abs(now - added);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Sort patients by urgency and wait time
export const sortPatients = (patientList, calculateWaitDays) => {
  return [...patientList].sort((a, b) => {
    if (a.urgency !== b.urgency) {
      const urgencyOrder = { urgent: 0, soon: 1, routine: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return calculateWaitDays(b.added_date) - calculateWaitDays(a.added_date);
  });
};

// Calculate statistics
export const calculateStats = (patients, calculateWaitDays) => {
  return {
    total: patients.length,
    waiting: patients.filter(p => p.status === "Waiting").length,
    urgent: patients.filter(p => p.urgency === "urgent" && p.status !== "Completed").length,
    scheduled: patients.filter(p => p.status === "Scheduled").length,
    completed: patients.filter(p => p.status === "Completed").length,
    avgWaitTime: patients.length > 0 
      ? Math.round(patients.reduce((sum, p) => sum + calculateWaitDays(p.added_date), 0) / patients.length)
      : 0,
    longWait: patients.filter(p => calculateWaitDays(p.added_date) > 30 && p.status !== "Completed").length,
  };
};

// Export to CSV
export const exportPatientsToCSV = (patients, calculateWaitDays) => {
  const headers = ["Name", "Patient ID", "Surgery Type", "Urgency", "Status", "Surgeon", "Wait Days", "Scheduled Date"];
  const rows = patients.map(p => [
    p.name,
    p.patient_id,
    p.surgery_type,
    p.urgency,
    p.status,
    p.surgeon || "",
    calculateWaitDays(p.added_date),
    p.scheduled_date || ""
  ]);

  const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `waitlist_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Filter patients
export const filterPatients = (patients, filters) => {
  const { searchTerm, urgency, status, surgeon, surgeryType } = filters;
  
  return patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgency === "all" || patient.urgency === urgency;
    const matchesStatus = status === "all" || patient.status === status;
    const matchesSurgeon = surgeon === "all" || patient.surgeon === surgeon;
    const matchesSurgeryType = surgeryType === "all" || patient.surgery_type === surgeryType;
    
    return matchesSearch && matchesUrgency && matchesStatus && matchesSurgeon && matchesSurgeryType;
  });
};

// Get unique surgeons from patients
export const getUniqueSurgeons = (patients) => {
  return [...new Set(patients.map(p => p.surgeon).filter(Boolean))];
};

// Validate session
export const validateSession = (userData, sessionDuration) => {
  if (!userData) return false;
  
  const loginTime = new Date(userData.loginTime);
  const hoursSinceLogin = (Date.now() - loginTime.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLogin < sessionDuration / (1000 * 60 * 60);
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format time for display
export const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString();
};
