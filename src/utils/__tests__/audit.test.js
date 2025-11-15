import { describe, it, expect } from 'vitest';
import { getPatientSnapshot, calculateChanges } from '../audit';

// ============================================
// PATIENT SNAPSHOT TESTS - CRITICAL FOR AUDIT TRAIL
// ============================================

describe('getPatientSnapshot', () => {

  it('should extract all required patient fields', () => {
    // Arrange: Create a full patient object
    const patient = {
      id: 123,
      name: 'John Doe',
      patient_id: 'P12345',
      surgery_type: 'Phacoemulsification',
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: 'Dr. Smith',
      scheduled_date: '2024-12-01',
      // Extra fields that should NOT be in snapshot
      added_date: '2024-01-01',
      notes: 'Some notes',
      preop_checklist: { anesthesia: true }
    };

    // Act: Get snapshot
    const snapshot = getPatientSnapshot(patient);

    // Assert: Should have exactly the right fields
    expect(snapshot).toHaveProperty('name');
    expect(snapshot).toHaveProperty('patient_id');
    expect(snapshot).toHaveProperty('surgery_type');
    expect(snapshot).toHaveProperty('urgency');
    expect(snapshot).toHaveProperty('status');
    expect(snapshot).toHaveProperty('surgeon');
    expect(snapshot).toHaveProperty('scheduled_date');
  });

  it('should have correct values for all fields', () => {
    // Arrange: Create a patient
    const patient = {
      name: 'Jane Smith',
      patient_id: 'P67890',
      surgery_type: 'Pars Plana Vitrectomy',
      urgency: 'soon',
      status: 'Pre-op Prep',
      surgeon: 'Dr. Johnson',
      scheduled_date: '2024-12-15'
    };

    // Act: Get snapshot
    const snapshot = getPatientSnapshot(patient);

    // Assert: All values should match
    expect(snapshot.name).toBe('Jane Smith');
    expect(snapshot.patient_id).toBe('P67890');
    expect(snapshot.surgery_type).toBe('Pars Plana Vitrectomy');
    expect(snapshot.urgency).toBe('soon');
    expect(snapshot.status).toBe('Pre-op Prep');
    expect(snapshot.surgeon).toBe('Dr. Johnson');
    expect(snapshot.scheduled_date).toBe('2024-12-15');
  });

  it('should not include extra fields from patient object', () => {
    // Arrange: Create patient with many extra fields
    const patient = {
      id: 999,
      name: 'Test Patient',
      patient_id: 'P99999',
      surgery_type: 'Test Surgery',
      urgency: 'routine',
      status: 'Waiting',
      surgeon: 'Dr. Test',
      scheduled_date: '2024-12-20',
      // Extra fields
      added_date: '2024-01-01',
      notes: 'Notes',
      preop_checklist: {},
      documents: [],
      extra_field: 'should not be included'
    };

    // Act: Get snapshot
    const snapshot = getPatientSnapshot(patient);

    // Assert: Should have exactly 7 fields, no extras
    const keys = Object.keys(snapshot);
    expect(keys.length).toBe(7);
    expect(snapshot).not.toHaveProperty('id');
    expect(snapshot).not.toHaveProperty('added_date');
    expect(snapshot).not.toHaveProperty('notes');
    expect(snapshot).not.toHaveProperty('preop_checklist');
    expect(snapshot).not.toHaveProperty('extra_field');
  });

  it('should handle null/undefined values gracefully', () => {
    // Arrange: Create patient with null values
    const patient = {
      name: 'Test Patient',
      patient_id: 'P11111',
      surgery_type: null,
      urgency: 'urgent',
      status: 'Waiting',
      surgeon: undefined,
      scheduled_date: null
    };

    // Act: Get snapshot
    const snapshot = getPatientSnapshot(patient);

    // Assert: Should preserve null/undefined values
    expect(snapshot.surgery_type).toBeNull();
    expect(snapshot.surgeon).toBeUndefined();
    expect(snapshot.scheduled_date).toBeNull();
  });

});

// ============================================
// CHANGES CALCULATION TESTS - CRITICAL FOR COMPLIANCE
// ============================================

describe('calculateChanges', () => {

  it('should detect simple field changes', () => {
    // Arrange: Old and new data with one change
    const oldData = {
      name: 'John Doe',
      urgency: 'routine',
      status: 'Waiting'
    };
    const newData = {
      name: 'John Doe',
      urgency: 'urgent', // Changed
      status: 'Waiting'
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should detect the urgency change
    expect(changes).not.toBeNull();
    expect(changes.urgency).toEqual({
      from: 'routine',
      to: 'urgent'
    });
  });

  it('should detect multiple field changes', () => {
    // Arrange: Old and new data with multiple changes
    const oldData = {
      urgency: 'routine',
      status: 'Waiting',
      surgeon: 'Dr. Smith'
    };
    const newData = {
      urgency: 'urgent', // Changed
      status: 'Pre-op Prep', // Changed
      surgeon: 'Dr. Johnson' // Changed
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should detect all three changes
    expect(changes).not.toBeNull();
    expect(Object.keys(changes).length).toBe(3);
    expect(changes.urgency).toEqual({ from: 'routine', to: 'urgent' });
    expect(changes.status).toEqual({ from: 'Waiting', to: 'Pre-op Prep' });
    expect(changes.surgeon).toEqual({ from: 'Dr. Smith', to: 'Dr. Johnson' });
  });

  it('should return null when no changes exist', () => {
    // Arrange: Identical old and new data
    const oldData = {
      name: 'John Doe',
      urgency: 'urgent',
      status: 'Waiting'
    };
    const newData = {
      name: 'John Doe',
      urgency: 'urgent',
      status: 'Waiting'
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should return null (no changes)
    expect(changes).toBeNull();
  });

  it('should return null when oldData is null', () => {
    // Arrange: null oldData
    const oldData = null;
    const newData = { name: 'John Doe' };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should return null
    expect(changes).toBeNull();
  });

  it('should return null when newData is null', () => {
    // Arrange: null newData
    const oldData = { name: 'John Doe' };
    const newData = null;

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should return null
    expect(changes).toBeNull();
  });

  it('should return null when both are null', () => {
    // Arrange: Both null
    const oldData = null;
    const newData = null;

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should return null
    expect(changes).toBeNull();
  });

  it('should detect changes from null to a value', () => {
    // Arrange: Field changing from null to value
    const oldData = {
      scheduled_date: null
    };
    const newData = {
      scheduled_date: '2024-12-01'
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should detect the change
    expect(changes).not.toBeNull();
    expect(changes.scheduled_date).toEqual({
      from: null,
      to: '2024-12-01'
    });
  });

  it('should detect changes from a value to null', () => {
    // Arrange: Field changing from value to null
    const oldData = {
      scheduled_date: '2024-12-01'
    };
    const newData = {
      scheduled_date: null
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should detect the change
    expect(changes).not.toBeNull();
    expect(changes.scheduled_date).toEqual({
      from: '2024-12-01',
      to: null
    });
  });

  it('should handle nested objects correctly', () => {
    // Arrange: Data with nested objects
    const oldData = {
      preop_checklist: { anesthesia: false, iol: true }
    };
    const newData = {
      preop_checklist: { anesthesia: true, iol: true }
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should detect the nested object change
    expect(changes).not.toBeNull();
    expect(changes.preop_checklist).toEqual({
      from: { anesthesia: false, iol: true },
      to: { anesthesia: true, iol: true }
    });
  });

  it('should not flag identical nested objects as changed', () => {
    // Arrange: Data with identical nested objects
    const oldData = {
      preop_checklist: { anesthesia: true, iol: true }
    };
    const newData = {
      preop_checklist: { anesthesia: true, iol: true }
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should return null (no changes)
    expect(changes).toBeNull();
  });

  it('should only check fields present in newData', () => {
    // Arrange: oldData has extra fields not in newData
    const oldData = {
      name: 'John Doe',
      urgency: 'urgent',
      extra_field: 'This should be ignored'
    };
    const newData = {
      name: 'John Doe',
      urgency: 'soon'
    };

    // Act: Calculate changes
    const changes = calculateChanges(oldData, newData);

    // Assert: Should only detect urgency change, not the missing extra_field
    expect(changes).not.toBeNull();
    expect(Object.keys(changes).length).toBe(1);
    expect(changes.urgency).toEqual({ from: 'urgent', to: 'soon' });
    expect(changes).not.toHaveProperty('extra_field');
  });

});
