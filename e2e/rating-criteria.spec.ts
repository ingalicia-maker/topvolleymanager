import { test, expect } from 'bun:test';
import { toRatingColumns, type Criterion } from '../src/lib/ratingCriteria';

const criterion = (key: string, id: string | null = null): Criterion => ({
  key, id, builtinKey: key === 'effort_attitude' ? 'effort_attitude' : null,
  label: key, shortLabel: key, emoji: '', color: '', active: true, position: 0,
});
const active = [criterion('effort_attitude'), criterion('c_visible', 'visible')];
const existing = {
  effort_attitude: 4,
  communication_cooperation: 8,
  technical_execution: null,
  decision_making: 0,
  leadership_initiative: 9,
  extra_scores: { hidden: 7, visible: 3, unconfigured: 6 },
};

test('editing preserves hidden builtin scores including zero and null', () => {
  const saved = toRatingColumns({ effort_attitude: 10 }, active, existing);
  expect(saved.effort_attitude).toBe(10);
  expect(saved.communication_cooperation).toBe(8);
  expect(saved.technical_execution).toBeNull();
  expect(saved.decision_making).toBe(0);
  expect(saved.leadership_initiative).toBe(9);
});

test('editing preserves hidden custom scores and updates the active score', () => {
  const saved = toRatingColumns({ c_visible: 10 }, active, existing);
  expect(saved.extra_scores).toEqual({ hidden: 7, visible: 10, unconfigured: 6 });
  expect(existing.extra_scores.visible).toBe(3);
});

test('notes-only edits leave every stored score intact', () => {
  expect(toRatingColumns({}, active, existing)).toEqual(existing);
});

test('new ratings do not invent hidden scores or inherit custom scores', () => {
  expect(toRatingColumns({ effort_attitude: 5, c_visible: 6 }, active)).toEqual({
    effort_attitude: 5, communication_cooperation: null, technical_execution: null,
    decision_making: null, leadership_initiative: null, extra_scores: { visible: 6 },
  });
});