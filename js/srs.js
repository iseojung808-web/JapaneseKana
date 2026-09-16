/**
 * A small spaced-repetition scheduler, in the SM-2 family but simplified for
 * kana: there are only ~104 things to learn and they're atomic, so we don't
 * need half-life regression. Leitner-style boxes with growing intervals get a
 * beginner to recall in a couple of weeks.
 *
 * Intervals are in days. Box 0 means "seen, got it wrong, show me again this
 * session"; the last box is effectively retired.
 */

const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];
const DAY_MS = 24 * 60 * 60 * 1000;

/** A card the learner has never touched. */
function newCard(id) {
  return { id, box: 0, seen: 0, correct: 0, streak: 0, lapses: 0, due: 0, last: 0 };
}

/**
 * Fold one answer into a card's state.
 * Correct promotes one box; wrong drops two (not all the way to zero — losing
 * a month of progress over one typo is how people quit).
 */
function grade(card, wasCorrect, now = Date.now()) {
  const next = { ...card, seen: card.seen + 1, last: now };
  if (wasCorrect) {
    next.correct = card.correct + 1;
    next.streak = card.streak + 1;
    next.box = Math.min(card.box + 1, INTERVALS.length - 1);
  } else {
    next.streak = 0;
    next.lapses = card.lapses + 1;
    next.box = Math.max(card.box - 2, 0);
  }
  next.due = now + INTERVALS[next.box] * DAY_MS;
  return next;
}

/** Cards whose due date has arrived (box 0 cards are always due). */
function dueCards(cards, now = Date.now()) {
  return cards.filter((c) => c.due <= now);
}

/**
 * Accuracy expressed as a 0-1 "how well do you know this" score, blending
 * hit rate with how far up the boxes the card has climbed. Used for the
 * heat-map colouring on the chart.
 */
function mastery(card) {
  if (!card || !card.seen) return 0;
  const boxScore = card.box / (INTERVALS.length - 1);
  const hitRate = card.correct / card.seen;
  return Math.max(0, Math.min(1, boxScore * 0.6 + hitRate * 0.4));
}

/**
 * Build a study queue: cards that are due, hardest first, then brand-new
 * cards to top it up. Mixing old and new keeps a session from being either
 * pure review (boring) or pure novelty (overwhelming).
 */
function buildQueue(cards, size, now = Date.now()) {
  const seen = dueCards(cards.filter((c) => c.seen > 0), now)
    .sort((a, b) => mastery(a) - mastery(b) || a.due - b.due);
  const fresh = cards.filter((c) => c.seen === 0);
  return [...seen, ...fresh].slice(0, size);
}

/** Days until this card comes back around, for the UI's "next review" line. */
function daysUntilDue(card, now = Date.now()) {
  return Math.max(0, Math.ceil((card.due - now) / DAY_MS));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INTERVALS, newCard, grade, dueCards, mastery, buildQueue, daysUntilDue };
}
