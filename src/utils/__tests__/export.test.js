import { describe, it, expect } from 'vitest';
import { generateCSV, escapeCSVField, generateEscapedCSV } from '../export';

// Mock calculateWaitDays function for testing
const mockCalculateWaitDays = (date) => {
  // Simple mock: return a fixed value for testing
  if (date === '2024-01-01') return 30;
  if (date === '2024-01-15') return 15;
  return 10;
};

// ============================================
// CSV FIELD ESCAPING TESTS - CRITICAL FOR DATA INTEGRITY
// ============================================

describe('escapeCSVField', () => {

  it('should return empty string for null', () => {
    // Arrange & Act
    const result = escapeCSVField(null);

    // Assert
    expect(result).toBe("");
  });

  it('should return empty string for undefined', () => {
    // Arrange & Act
    const result = escapeCSVField(undefined);

    // Assert
    expect(result).toBe("");
  });

  it('should return simple text unchanged', () => {
    // Arrange & Act
    const result = escapeCSVField('John Doe');

    // Assert
    expect(result).toBe('John Doe');
  });

  it('should wrap field with comma in quotes', () => {
    // Arrange
    const field = 'Doe, John';

    // Act
    const result = escapeCSVField(field);

    // Assert
    expect(result).toBe('"Doe, John"');
  });

  it('should escape quotes inside quoted field', () => {
    // Arrange
    const field = 'Dr. "Best" Smith';

    // Act
    const result = escapeCSVField(field);

    // Assert
    expect(result).toBe('"Dr. ""Best"" Smith"');
  });

  it('should wrap field with newline in quotes', () => {
    // Arrange
    const field = 'Line1\nLine2';

    // Act
    const result = escapeCSVField(field);

    // Assert
    expect(result).toBe('"Line1\nLine2"');
  });

  it('should handle field with both comma and quotes', () => {
    // Arrange
    const field = 'Smith, "Dr." John';

    // Act
    const result = escapeCSVField(field);

    // Assert
    expect(result).toBe('"Smith, ""Dr."" John"');
  });

  it('should convert numbers to strings', () => {
    // Arrange & Act
    const result = escapeCSVField(123);

    // Assert
    expect(result).toBe('123');
  });

});

// ============================================
// BASIC CSV GENERATION TESTS
// ============================================

describe('generateCSV', () => {

  it('should generate CSV with headers and single patient', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Patient ID,Surgery Type,Urgency,Status,Surgeon,Wait Days,Scheduled Date');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,Dr. Smith,30,2024-12-01');
    expect(lines.length).toBe(2);
  });

  it('should generate CSV with multiple patients', () => {
    // Arrange
    const patients = [
      {
        name: 'John Doe',
        patient_id: 'P001',
        surgery_type: 'Phacoemulsification',
        urgency: 'urgent',
        status: 'Waiting',
        surgeon: 'Dr. Smith',
        added_date: '2024-01-01',
        scheduled_date: '2024-12-01'
      },
      {
        name: 'Jane Smith',
        patient_id: 'P002',
        surgery_type: 'Vitrectomy',
        urgency: 'soon',
        status: 'Pre-op Prep',
        surgeon: 'Dr. Johnson',
        added_date: '2024-01-15',
        scheduled_date: '2024-12-15'
      }
    ];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // Header + 2 patients
    expect(lines[0]).toContain('Name,Patient ID');
    expect(lines[1]).toContain('John Doe,P001');
    expect(lines[2]).toContain('Jane Smith,P002');
  });

  it('should handle empty patient array', () => {
    // Arrange
    const patients = [];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    expect(csv).toBe('Name,Patient ID,Surgery Type,Urgency,Status,Surgeon,Wait Days,Scheduled Date');
  });

  it('should handle null surgeon field', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: null,
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,,30,2024-12-01');
  });

  it('should handle null scheduled_date field', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      added_date: '2024-01-01',
      scheduled_date: null
    }];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,Dr. Smith,30,');
  });

  it('should include wait days calculated correctly', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toContain(',30,'); // Wait days from mock
  });

});

// ============================================
// ESCAPED CSV GENERATION TESTS - HANDLES SPECIAL CHARACTERS
// ============================================

describe('generateEscapedCSV', () => {

  it('should generate escaped CSV with headers and single patient', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Patient ID,Surgery Type,Urgency,Status,Surgeon,Wait Days,Scheduled Date');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,Dr. Smith,30,2024-12-01');
  });

  it('should properly escape patient name with comma', () => {
    // Arrange
    const patients = [{
      name: 'Doe, John',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Doe, John",P001,Phacoemulsification,urgent,Waiting,Dr. Smith,30,2024-12-01');
  });

  it('should properly escape surgeon name with quotes', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. "Best" Smith',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,"Dr. ""Best"" Smith",30,2024-12-01');
  });

  it('should handle empty patient array', () => {
    // Arrange
    const patients = [];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    expect(csv).toBe('Name,Patient ID,Surgery Type,Urgency,Status,Surgeon,Wait Days,Scheduled Date');
  });

  it('should handle multiple patients with special characters', () => {
    // Arrange
    const patients = [
      {
        name: 'Doe, John',
        patient_id: 'P001',
        surgery_type: 'Phacoemulsification',
        urgency: 'urgent',
        status: 'Waiting',
        surgeon: 'Dr. Smith',
        added_date: '2024-01-01',
        scheduled_date: '2024-12-01'
      },
      {
        name: 'Jane "Smith" Williams',
        patient_id: 'P002',
        surgery_type: 'Vitrectomy',
        urgency: 'soon',
        status: 'Pre-op Prep',
        surgeon: 'Dr. "Best" Johnson',
        added_date: '2024-01-15',
        scheduled_date: '2024-12-15'
      }
    ];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('"Doe, John"');
    expect(lines[2]).toContain('"Jane ""Smith"" Williams"');
    expect(lines[2]).toContain('"Dr. ""Best"" Johnson"');
  });

  it('should handle null values correctly', () => {
    // Arrange
    const patients = [{
      name: 'John Doe',
      patient_id: 'P001',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: null,
      added_date: '2024-01-01',
      scheduled_date: null
    }];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    expect(lines[1]).toBe('John Doe,P001,Phacoemulsification,urgent,Waiting,,30,');
  });

  it('should handle complex real-world scenario', () => {
    // Arrange: Patient with multiple special characters
    const patients = [{
      name: 'O\'Brien, "Dr." James, Jr.',
      patient_id: 'P-001, Complex',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith, M.D., "Chief"',
      added_date: '2024-01-01',
      scheduled_date: '2024-12-01'
    }];

    // Act
    const csv = generateEscapedCSV(patients, mockCalculateWaitDays);

    // Assert
    const lines = csv.split('\n');
    // Should properly escape all special characters
    expect(lines[1]).toContain('"O\'Brien, ""Dr."" James, Jr."');
    expect(lines[1]).toContain('"P-001, Complex"');
    expect(lines[1]).toContain('"Dr. Smith, M.D., ""Chief"""');
  });

});
