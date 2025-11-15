/**
 * Creates a snapshot of patient data for audit logging
 * Extracts only the key fields that should be tracked in audit logs
 * @param {Object} patient - Full patient object
 * @returns {Object} Snapshot with key patient fields
 */
export const getPatientSnapshot = (patient) => {
  return {
    name: patient.name,
    patient_id: patient.patient_id,
    surgery_type: patient.surgery_type,
    urgency: patient.urgency,
    status: patient.status,
    surgeon: patient.surgeon,
    scheduled_date: patient.scheduled_date
  };
};

/**
 * Calculates the changes between old and new data objects
 * CRITICAL FOR COMPLIANCE: Tracks what changed in audit logs
 * @param {Object} oldData - Previous state of data
 * @param {Object} newData - New state of data
 * @returns {Object|null} Object with changes in format { field: { from: oldValue, to: newValue } }
 */
export const calculateChanges = (oldData, newData) => {
  if (!oldData || !newData) {
    return null;
  }

  const changes = {};
  Object.keys(newData).forEach(key => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = { from: oldData[key], to: newData[key] };
    }
  });

  // Return null if no changes (empty object means no actual changes)
  return Object.keys(changes).length > 0 ? changes : null;
};
