import { describe, it, expect } from 'vitest';
import { calculateWaitDays, sortPatients } from '../calculations';

describe('calculateWaitDays', () => {

  it('should calculate 0 or 1 days for today', () => {
    // Arrange: Set up test data
    const today = new Date().toISOString();

    // Act: Run the function
    const result = calculateWaitDays(today);

    // Assert: Check if the result is correct (could be 0 or 1 depending on exact time)
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should calculate 7 days for a week ago', () => {
    // Arrange: Create a date 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoString = weekAgo.toISOString();

    // Act: Run the function
    const result = calculateWaitDays(weekAgoString);

    // Assert: Check if result is 7 or 8 days (accounting for time precision)
    expect(result).toBeGreaterThanOrEqual(7);
    expect(result).toBeLessThanOrEqual(8);
  });

  it('should calculate 30 days for a month ago', () => {
    // Arrange: Create a date 30 days ago
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoString = monthAgo.toISOString();

    // Act: Run the function
    const result = calculateWaitDays(monthAgoString);

    // Assert: Check if result is around 30 days
    expect(result).toBeGreaterThanOrEqual(30);
    expect(result).toBeLessThanOrEqual(31);
  });

  it('should handle string dates correctly', () => {
    // Arrange: Use a specific date string
    const specificDate = '2024-01-01T00:00:00.000Z';

    // Act: Run the function
    const result = calculateWaitDays(specificDate);

    // Assert: Should return a positive number
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

});

// ============================================
// PATIENT SORTING TESTS - CRITICAL FOR PATIENT SAFETY
// ============================================

describe('sortPatients', () => {

  it('should sort urgent patients before soon patients', () => {
    // Arrange: Create patients with different urgency levels
    const patients = [
      { patient_id: '1', name: 'Patient Soon', urgency: 'soon', added_date: '2024-01-01' },
      { patient_id: '2', name: 'Patient Urgent', urgency: 'urgent', added_date: '2024-01-01' }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Urgent patient should be first
    expect(sorted[0].urgency).toBe('urgent');
    expect(sorted[1].urgency).toBe('soon');
  });

  it('should sort soon patients before routine patients', () => {
    // Arrange: Create patients with different urgency levels
    const patients = [
      { patient_id: '1', name: 'Patient Routine', urgency: 'routine', added_date: '2024-01-01' },
      { patient_id: '2', name: 'Patient Soon', urgency: 'soon', added_date: '2024-01-01' }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Soon patient should be first
    expect(sorted[0].urgency).toBe('soon');
    expect(sorted[1].urgency).toBe('routine');
  });

  it('should sort all three urgency levels correctly: urgent > soon > routine', () => {
    // Arrange: Create patients in random order
    const patients = [
      { patient_id: '1', name: 'Patient Routine', urgency: 'routine', added_date: '2024-01-01' },
      { patient_id: '2', name: 'Patient Urgent', urgency: 'urgent', added_date: '2024-01-01' },
      { patient_id: '3', name: 'Patient Soon', urgency: 'soon', added_date: '2024-01-01' }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Correct order
    expect(sorted[0].urgency).toBe('urgent');
    expect(sorted[1].urgency).toBe('soon');
    expect(sorted[2].urgency).toBe('routine');
  });

  it('should sort by wait time within same urgency level (longer waits first)', () => {
    // Arrange: Create patients with same urgency but different wait times
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);

    const patients = [
      { patient_id: '1', name: 'Patient 1 week', urgency: 'urgent', added_date: oneWeekAgo.toISOString() },
      { patient_id: '2', name: 'Patient 2 weeks', urgency: 'urgent', added_date: twoWeeksAgo.toISOString() }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Patient who waited 2 weeks should be first
    expect(sorted[0].patient_id).toBe('2');
    expect(sorted[1].patient_id).toBe('1');
  });

  it('should handle complex mixed scenario correctly', () => {
    // Arrange: Create a realistic mix of patients
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(today.getDate() - 20);

    const patients = [
      { patient_id: '1', name: 'Routine 20 days', urgency: 'routine', added_date: twentyDaysAgo.toISOString() },
      { patient_id: '2', name: 'Soon 3 days', urgency: 'soon', added_date: threeDaysAgo.toISOString() },
      { patient_id: '3', name: 'Urgent 3 days', urgency: 'urgent', added_date: threeDaysAgo.toISOString() },
      { patient_id: '4', name: 'Urgent 10 days', urgency: 'urgent', added_date: tenDaysAgo.toISOString() },
      { patient_id: '5', name: 'Soon 10 days', urgency: 'soon', added_date: tenDaysAgo.toISOString() }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Correct order
    // 1. Urgent 10 days (urgent + longest wait)
    // 2. Urgent 3 days (urgent + shorter wait)
    // 3. Soon 10 days (soon + longest wait)
    // 4. Soon 3 days (soon + shorter wait)
    // 5. Routine 20 days
    expect(sorted[0].patient_id).toBe('4'); // Urgent 10 days
    expect(sorted[1].patient_id).toBe('3'); // Urgent 3 days
    expect(sorted[2].patient_id).toBe('5'); // Soon 10 days
    expect(sorted[3].patient_id).toBe('2'); // Soon 3 days
    expect(sorted[4].patient_id).toBe('1'); // Routine 20 days
  });

  it('should handle empty array', () => {
    // Arrange: Empty array
    const patients = [];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Should return empty array
    expect(sorted).toEqual([]);
    expect(sorted.length).toBe(0);
  });

  it('should handle single patient', () => {
    // Arrange: Single patient
    const patients = [
      { patient_id: '1', name: 'Only Patient', urgency: 'routine', added_date: '2024-01-01' }
    ];

    // Act: Sort the patients
    const sorted = sortPatients(patients);

    // Assert: Should return same patient
    expect(sorted.length).toBe(1);
    expect(sorted[0].patient_id).toBe('1');
  });

  it('should not modify the original array', () => {
    // Arrange: Create patients
    const patients = [
      { patient_id: '1', name: 'Patient Soon', urgency: 'soon', added_date: '2024-01-01' },
      { patient_id: '2', name: 'Patient Urgent', urgency: 'urgent', added_date: '2024-01-01' }
    ];
    const originalOrder = [...patients];

    // Act: Sort the patients
    sortPatients(patients);

    // Assert: Original array should be unchanged
    expect(patients[0].patient_id).toBe(originalOrder[0].patient_id);
    expect(patients[1].patient_id).toBe(originalOrder[1].patient_id);
  });

});
