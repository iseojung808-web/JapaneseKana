/**
 * Unit tests for the parts that are pure logic. Run with: node --test
 * The DOM layer is exercised by hand in a browser; these cover the rules a
 * silent regression could quietly break (wrong counts, broken scheduling).
 */
const test = require('node:test');
const assert = require('node:assert');

const { KANA, LESSONS, WORDS, romajiFor, cardId, glyph, MNEMONICS } = require('../js/kana-data.js');
const { INTERVALS, newCard, grade, dueCards, mastery, buildQueue, daysUntilDue } = require('../js/srs.js');

test('the syllabary is complete and correctly partitioned', () => {
  const count = (set) => KANA.filter((k) => k.set === set).length;
  assert.strictEqual(count('gojuon'), 46, '46 basic kana');
  assert.strictEqual(count('dakuten'), 25, '25 voiced kana');
  assert.strictEqual(count('yoon'), 33, '33 combination kana');
  assert.strictEqual(KANA.length, 104);
});

test('every kana has both scripts and a romanization', () => {
  for (const k of KANA) {
    assert.ok(k.h && k.k && k.r, `incomplete entry: ${JSON.stringify(k)}`);
    assert.match(k.r, /^[a-z]+$/, `odd romaji: ${k.r}`);
  }
});

test('hiragana and katakana characters are each unique', () => {
  assert.strictEqual(new Set(KANA.map((k) => k.h)).size, KANA.length);
  assert.strictEqual(new Set(KANA.map((k) => k.k)).size, KANA.length);
});

test('every kana belongs to exactly one lesson', () => {
  const seen = new Map();
  for (const lesson of LESSONS) {
    for (const k of KANA.filter((e) => e.set === lesson.set && lesson.rows.includes(e.row))) {
      assert.ok(!seen.has(k.h), `${k.h} appears in ${seen.get(k.h)} and ${lesson.id}`);
      seen.set(k.h, lesson.id);
    }
  }
  assert.strictEqual(seen.size, KANA.length, 'no kana is stranded outside the lessons');
});

test('alternate romanizations are accepted, and are distinct from the primary', () => {
  const shi = KANA.find((k) => k.h === 'し');
  assert.deepStrictEqual(romajiFor(shi), ['shi', 'si']);
  for (const k of KANA) {
    assert.ok(!k.alt.includes(k.r), `${k.r} lists itself as an alternate`);
  }
});

test('card identity and glyph depend on the script', () => {
  const ka = KANA.find((k) => k.h === 'か');
  assert.strictEqual(glyph(ka, 'hiragana'), 'か');
  assert.strictEqual(glyph(ka, 'katakana'), 'カ');
  assert.notStrictEqual(cardId(ka, 'hiragana'), cardId(ka, 'katakana'));
});

test('the basic 46 all have a mnemonic', () => {
  for (const k of KANA.filter((e) => e.set === 'gojuon')) {
    assert.ok(MNEMONICS[k.r], `no mnemonic for ${k.r}`);
  }
});

test('vocabulary is written only in kana this app teaches', () => {
  // Small ゃゅょっ and the long-vowel mark are legal inside words.
  const extra = new Set(['ゃ', 'ゅ', 'ょ', 'っ', 'ー']);
  const known = new Set(KANA.map((k) => k.h.split('')).flat());
  for (const w of WORDS) {
    for (const ch of w.h) {
      assert.ok(known.has(ch) || extra.has(ch), `${w.h} uses unknown character ${ch}`);
    }
  }
});

test('correct answers promote a card and push the due date out', () => {
  let card = newCard('x');
  assert.strictEqual(card.box, 0);
  card = grade(card, true, 0);
  assert.strictEqual(card.box, 1);
  assert.strictEqual(card.streak, 1);
  assert.strictEqual(daysUntilDue(card, 0), INTERVALS[1]);
});

test('a wrong answer drops two boxes but never below zero', () => {
  let card = newCard('x');
  for (let i = 0; i < 5; i++) card = grade(card, true, 0);
  assert.strictEqual(card.box, 5);

  card = grade(card, false, 0);
  assert.strictEqual(card.box, 3, 'demoted by two, not wiped out');
  assert.strictEqual(card.streak, 0);
  assert.strictEqual(card.lapses, 1);

  let fresh = grade(newCard('y'), false, 0);
  assert.strictEqual(fresh.box, 0, 'clamped at the bottom');
});

test('the box interval caps out instead of overflowing', () => {
  let card = newCard('x');
  for (let i = 0; i < 50; i++) card = grade(card, true, 0);
  assert.strictEqual(card.box, INTERVALS.length - 1);
  assert.ok(Number.isFinite(card.due));
});

test('mastery rises with success and is bounded to 0..1', () => {
  assert.strictEqual(mastery(newCard('x')), 0, 'an unseen card is not mastered');
  let card = newCard('x');
  let previous = 0;
  for (let i = 0; i < 7; i++) {
    card = grade(card, true, 0);
    const m = mastery(card);
    assert.ok(m > previous, 'mastery increases with each success');
    assert.ok(m >= 0 && m <= 1);
    previous = m;
  }
  assert.strictEqual(mastery(card), 1, 'a perfect card tops out at 1');
});

test('only cards whose due date has passed come up for review', () => {
  const now = 1_000_000_000;
  const ready = { ...newCard('a'), seen: 1, due: now - 1 };
  const later = { ...newCard('b'), seen: 1, due: now + 100_000 };
  assert.deepStrictEqual(dueCards([ready, later], now).map((c) => c.id), ['a']);
});

test('the queue leads with the weakest due cards, then tops up with new ones', () => {
  const now = 1_000_000_000;
  const strong = { ...newCard('strong'), seen: 10, correct: 10, box: 5, due: now - 1 };
  const weak = { ...newCard('weak'), seen: 10, correct: 2, box: 1, due: now - 1 };
  const unseen = newCard('unseen');

  const queue = buildQueue([strong, weak, unseen], 3, now);
  assert.deepStrictEqual(queue.map((c) => c.id), ['weak', 'strong', 'unseen']);
});

test('the queue respects the requested session length', () => {
  const cards = KANA.map((k) => newCard(cardId(k, 'hiragana')));
  assert.strictEqual(buildQueue(cards, 20).length, 20);
  assert.strictEqual(buildQueue(cards, 500).length, cards.length);
});
