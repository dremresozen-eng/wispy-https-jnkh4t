import { describe, it, expect } from 'vitest';
import { calculateWaitDays } from '../calculations';

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
