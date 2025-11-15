/**
 * Generates CSV content from an array of patients
 * CRITICAL FOR REPORTING: Ensures accurate data export for medical records
 * @param {Array} patients - Array of patient objects
 * @param {Function} calculateWaitDays - Function to calculate wait days
 * @returns {string} CSV formatted string with headers and patient data
 */
export const generateCSV = (patients, calculateWaitDays) => {
  const headers = ["Name", "Patient ID", "Surgery Type", "Urgency", "Status", "Surgeon", "Wait Days", "Scheduled Date"];

  const rows = patients.map((p) => [
    p.name,
    p.patient_id,
    p.surgery_type,
    p.urgency,
    p.status,
    p.surgeon || "",
    calculateWaitDays(p.added_date),
    p.scheduled_date || "",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};

/**
 * Escapes special characters in CSV fields (commas, quotes, newlines)
 * Ensures data integrity when fields contain special characters
 * @param {string} field - Field value to escape
 * @returns {string} Properly escaped CSV field
 */
export const escapeCSVField = (field) => {
  if (field == null) return "";

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
};

/**
 * Generates properly escaped CSV content from an array of patients
 * Handles special characters (commas, quotes, newlines) in patient data
 * @param {Array} patients - Array of patient objects
 * @param {Function} calculateWaitDays - Function to calculate wait days
 * @returns {string} Properly escaped CSV formatted string
 */
export const generateEscapedCSV = (patients, calculateWaitDays) => {
  const headers = ["Name", "Patient ID", "Surgery Type", "Urgency", "Status", "Surgeon", "Wait Days", "Scheduled Date"];

  const rows = patients.map((p) => [
    escapeCSVField(p.name),
    escapeCSVField(p.patient_id),
    escapeCSVField(p.surgery_type),
    escapeCSVField(p.urgency),
    escapeCSVField(p.status),
    escapeCSVField(p.surgeon || ""),
    escapeCSVField(calculateWaitDays(p.added_date)),
    escapeCSVField(p.scheduled_date || ""),
  ]);

  const headerRow = headers.map(h => escapeCSVField(h)).join(",");
  const dataRows = rows.map(row => row.join(",")).join("\n");

  return dataRows ? `${headerRow}\n${dataRows}` : headerRow;
};
