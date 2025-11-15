/**
 * Calculates the number of days a patient has been waiting since admission
 * @param {string} addedDate - The date the patient was added (ISO format)
 * @returns {number} Number of days waiting (rounded up)
 */
export const calculateWaitDays = (addedDate) => {
  const now = new Date();
  const added = new Date(addedDate);
  const diffTime = Math.abs(now - added);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Sorts patients by urgency level first, then by wait time within each urgency level
 * CRITICAL FOR PATIENT SAFETY: Ensures urgent patients always appear first
 * @param {Array} patientList - Array of patient objects
 * @returns {Array} Sorted array of patients (urgent → soon → routine, longest wait first within each level)
 */
export const sortPatients = (patientList) => {
  return [...patientList].sort((a, b) => {
    // First, sort by urgency level
    if (a.urgency !== b.urgency) {
      const urgencyOrder = { urgent: 0, soon: 1, routine: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    // If same urgency, sort by wait time (longer waits first)
    return calculateWaitDays(b.added_date) - calculateWaitDays(a.added_date);
  });
};
