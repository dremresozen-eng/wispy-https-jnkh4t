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
