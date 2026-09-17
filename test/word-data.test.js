/**
 * Tests for the word/conjugation database. This data is the whole point of
 * the feature — a wrong reading or a wrong conjugation here teaches someone
 * incorrect Japanese with total confidence, so these checks are stricter
 * than "did it not crash."
 */
const test = require('node:test');
const assert = require('node:assert');

const {
  parseFurigana,
  kanaOf,
  furiganaHTML,
  VERBS,
  OTHER_WORDS,
  VERB_FORM_ORDER,
  WORD_CARDS,
} = require('../js/word-data.js');

const isHiraganaOnly = (s) => /^[ぁ-ゟー]+$/.test(s);

test('furigana template parser handles kanji+okurigana, compounds, and plain kana', () => {
  assert.deepStrictEqual(parseFurigana('見{み}る'), [['見', 'み'], ['る']]);
  assert.deepStrictEqual(parseFurigana('学校{がっこう}'), [['学校', 'がっこう']]);
  assert.deepStrictEqual(parseFurigana('する'), [['する']]);
  assert.deepStrictEqual(parseFurigana('大{おお}きい'), [['大', 'おお'], ['きい']]);
});

test('kanaOf reconstructs the full reading from segments', () => {
  assert.strictEqual(kanaOf(parseFurigana('見{み}る')), 'みる');
  assert.strictEqual(kanaOf(parseFurigana('学校{がっこう}')), 'がっこう');
  assert.strictEqual(kanaOf(parseFurigana('する')), 'する');
});

test('furiganaHTML wraps only the kanji portion in <ruby>, leaves okurigana bare', () => {
  assert.strictEqual(furiganaHTML(parseFurigana('見{み}る')), '<ruby>見<rt>み</rt></ruby>る');
  assert.strictEqual(furiganaHTML(parseFurigana('する')), 'する');
});

test('every verb has all seven forms, each fully populated', () => {
  for (const v of VERBS) {
    for (const key of VERB_FORM_ORDER) {
      const f = v.forms[key];
      assert.ok(f, `${v.id} is missing its ${key} form`);
      assert.ok(f.kana && isHiraganaOnly(f.kana), `${v.id}/${key} reading "${f.kana}" isn't pure hiragana`);
      assert.match(f.romaji, /^[a-z]+$/, `${v.id}/${key} has a suspicious romaji: ${f.romaji}`);
      assert.ok(f.meaning && f.meaning.length > 0, `${v.id}/${key} has no meaning`);
      assert.ok(f.label && f.label.length > 0, `${v.id}/${key} has no label`);
    }
  }
});

test('teiru and tene are always the te-form plus る or ね — that IS the grammar', () => {
  for (const v of VERBS) {
    const te = v.forms.te.kana;
    assert.strictEqual(v.forms.teiru.kana, te + 'る', `${v.id}: teiru should be te-form + る`);
    assert.strictEqual(v.forms.tene.kana, te + 'ね', `${v.id}: tene should be te-form + ね`);
  }
});

test('the example from the request: 見る -> 見てる -> 見てね reads miru/miteru/mitene', () => {
  const miru = VERBS.find((v) => v.id === 'miru');
  assert.strictEqual(miru.forms.dictionary.romaji, 'miru');
  assert.strictEqual(miru.forms.teiru.romaji, 'miteru');
  assert.strictEqual(miru.forms.tene.romaji, 'mitene');
  assert.strictEqual(miru.forms.dictionary.kana, 'みる');
  assert.strictEqual(miru.forms.teiru.kana, 'みてる');
  assert.strictEqual(miru.forms.tene.kana, 'みてね');
});

test('spot-check known-tricky conjugations so a typo regresses loudly', () => {
  const by = (id) => VERBS.find((v) => v.id === id);

  // 行く is the one く-verb whose te/ta form is irregular (って/った, not いて/いた).
  assert.strictEqual(by('iku').forms.te.kana, 'いって');
  assert.strictEqual(by('iku').forms.ta.kana, 'いった');

  // 買う: う-verbs swap う for わ in the negative, not あ.
  assert.strictEqual(by('kau').forms.nai.kana, 'かわない');

  // 来る: the only verb where the kanji's reading itself changes across forms.
  assert.strictEqual(by('kuru').forms.dictionary.kana, 'くる');
  assert.strictEqual(by('kuru').forms.masu.kana, 'きます');
  assert.strictEqual(by('kuru').forms.nai.kana, 'こない');

  // Godan te-form consonant groups: む/ぶ/ぬ -> んで, く/ぐ -> いて/いで, う/つ/る -> って, す -> して.
  assert.strictEqual(by('nomu').forms.te.kana, 'のんで');   // む -> んで
  assert.strictEqual(by('kaku').forms.te.kana, 'かいて');   // く -> いて
  assert.strictEqual(by('matsu').forms.te.kana, 'まって');  // つ -> って
  assert.strictEqual(by('hanasu').forms.te.kana, 'はなして'); // す -> して

  // Godan masu-stem: the u-row consonant shifts to the i-row.
  assert.strictEqual(by('nomu').forms.masu.kana, 'のみます');
  assert.strictEqual(by('kau').forms.masu.kana, 'かいます');

  // する is irregular and conventionally written in kana only — no kanji to gloss.
  assert.deepStrictEqual(by('suru').forms.dictionary.segs, [['する']]);
});

test('no two verbs or verb forms collide on id', () => {
  const ids = WORD_CARDS.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate word card id found');
});

test('every verb card correctly points back to its base word and meaning', () => {
  const verbIds = new Set(VERBS.map((v) => v.id));
  for (const card of WORD_CARDS.filter((c) => c.type === 'verb')) {
    assert.ok(verbIds.has(card.baseWord), `${card.id} points at an unknown base verb`);
  }
});

test('nouns and adjectives are fully populated and correctly read', () => {
  for (const w of OTHER_WORDS) {
    assert.ok(isHiraganaOnly(w.kana), `${w.id} reading "${w.kana}" isn't pure hiragana`);
    assert.match(w.romaji, /^[a-z]+$/, `${w.id} has a suspicious romaji: ${w.romaji}`);
    assert.ok(w.meaning && w.meaning.length > 0, `${w.id} has no meaning`);
  }
  // Spot checks.
  const by = (id) => OTHER_WORDS.find((w) => w.id === id);
  assert.strictEqual(by('gakkou').kana, 'がっこう');
  assert.strictEqual(by('kuruma').kana, 'くるま');
  assert.strictEqual(by('ii').segs.length, 1, 'いい has no kanji, so it should be one plain segment');
});

test('WORD_CARDS has exactly 7 forms per verb plus one card per noun/adjective', () => {
  const expected = VERBS.length * VERB_FORM_ORDER.length + OTHER_WORDS.length;
  assert.strictEqual(WORD_CARDS.length, expected);
});
