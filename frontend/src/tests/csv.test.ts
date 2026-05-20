import { describe, it, expect } from 'vitest';
import { toCSV } from '@/lib/csv';

type Row = { name: unknown; score: unknown };
const COLS: { key: keyof Row; header: string }[] = [
  { key: 'name', header: 'Name' },
  { key: 'score', header: 'Score' },
];

describe('toCSV', () => {
  it('produces a header row followed by data rows', () => {
    const csv = toCSV([{ name: 'Alice', score: 95 }], COLS);
    const [header, row] = csv.split('\n');
    expect(header).toBe('Name,Score');
    expect(row).toBe('Alice,95');
  });

  it('wraps fields that contain commas in double quotes', () => {
    const csv = toCSV([{ name: 'Smith, John', score: 80 }], COLS);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes double quotes inside fields', () => {
    const csv = toCSV([{ name: 'Say "hi"', score: 0 }], COLS);
    expect(csv).toContain('"Say ""hi"""');
  });

  it('converts null and undefined values to empty string', () => {
    const csv = toCSV([{ name: null, score: undefined }] as unknown as Row[], COLS);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toBe(',');
  });

  it('returns only the header line when rows array is empty', () => {
    const csv = toCSV([], COLS);
    expect(csv.trim()).toBe('Name,Score');
  });
});
