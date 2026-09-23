/**
 * Tests for the word engine: Jisho parsing, furigana alignment, and
 * conjugation. The conjugation answers below were checked by hand against
 * standard grammar; the engine has to reproduce them from nothing but the
 * dictionary form and the verb class Jisho reports.
 */
const test = require('node:test');
const assert = require('node:assert');

const W = require('../js/word-data.js');
const J = require('./fixtures/jisho.js');

const entry = (name) => W.normalizeJishoItem(J[name]);
const forms = (name) => Object.fromEntries(W.buildForms(entry(name)).map((f) => [f.key, f]));
const kana = (name) => Object.fromEntries(W.buildForms(entry(name)).map((f) => [f.key, f.reading]));
const surface = (name) => Object.fromEntries(W.buildForms(entry(name)).map((f) => [f.key, f.word]));

// ------------------------------------------------------------------ jisho parsing

test('a Jisho item is boiled down to word, reading, meanings, class and JLPT level', () => {
  const e = entry('miru');
  assert.strictEqual(e.word, '見る');
  assert.strictEqual(e.reading, 'みる');
  assert.strictEqual(e.key, '見る|みる');
  assert.strictEqual(e.meanings[0], 'to see; to look; to watch');
  assert.deepStrictEqual(e.cls, { kind: 'verb', vclass: 'ichidan' });
  assert.strictEqual(e.jlpt, 'N5');
});

test('"usually written using kana alone" words are stored in kana', () => {
  assert.strictEqual(entry('aru').word, 'ある');
  assert.strictEqual(entry('ii').word, 'いい');
  assert.strictEqual(entry('suru').word, 'する');
});

test('kana-only entries (no kanji form at all) still parse', () => {
  const e = entry('terebi');
  assert.strictEqual(e.word, 'テレビ');
  assert.strictEqual(e.cls.kind, 'other');
});

test('Wikipedia-only results are dropped instead of becoming junk cards', () => {
  assert.strictEqual(W.normalizeJishoItem(J.wikiOnly), null);
  assert.strictEqual(W.normalizeJishoItem({}), null);
});

// ------------------------------------------------------------------ furigana

test('furigana sits over the kanji only, never the okurigana', () => {
  assert.deepStrictEqual(W.alignFurigana('見る', 'みる'), [['見', 'み'], ['る']]);
  assert.deepStrictEqual(W.alignFurigana('大きい', 'おおきい'), [['大', 'おお'], ['きい']]);
  assert.deepStrictEqual(W.alignFurigana('学校', 'がっこう'), [['学校', 'がっこう']]);
});

test('furigana splits correctly around kana in the middle of a word', () => {
  assert.deepStrictEqual(W.alignFurigana('取り消す', 'とりけす'), [['取', 'と'], ['り'], ['消', 'け'], ['す']]);
});

test('words with no kanji get no furigana', () => {
  assert.deepStrictEqual(W.alignFurigana('する', 'する'), [['する']]);
  assert.deepStrictEqual(W.alignFurigana('テレビ', 'テレビ'), [['テレビ']]);
});

test('a reading that does not fit the pattern falls back to whole-word furigana, not a guess', () => {
  assert.deepStrictEqual(W.alignFurigana('見る', 'ぜんぜんちがう'), [['見る', 'ぜんぜんちがう']]);
});

test('furiganaHTML emits real ruby markup and escapes anything odd', () => {
  assert.strictEqual(W.furiganaHTML([['見', 'み'], ['る']]), '<ruby>見<rt>み</rt></ruby>る');
  assert.strictEqual(W.furiganaHTML([['<b>']]), '&lt;b&gt;');
});

test('romaji: Hepburn with small tsu, long vowels, and n before vowels', () => {
  assert.strictEqual(W.toRomaji('みてる'), 'miteru');
  assert.strictEqual(W.toRomaji('がっこう'), 'gakkou');
  assert.strictEqual(W.toRomaji('まっちゃ'), 'matcha');
  assert.strictEqual(W.toRomaji('テレビ'), 'terebi');
  assert.strictEqual(W.toRomaji('コーヒー'), 'koohii');
  assert.strictEqual(W.toRomaji('きんようび'), "kin'youbi");
});

// ------------------------------------------------------------------ verbs

test('the example from the request: 見る → 見てる → 見てね (miru, miteru, mitene)', () => {
  const f = forms('miru');
  assert.strictEqual(f.dictionary.romaji, 'miru');
  assert.strictEqual(f.teiru.romaji, 'miteru');
  assert.strictEqual(f.tene.romaji, 'mitene');
  assert.strictEqual(f.teiru.word, '見てる');
  assert.deepStrictEqual(f.tene.segs, [['見', 'み'], ['てね']]);
});

test('ichidan verbs: drop る, add the ending', () => {
  assert.deepStrictEqual(kana('taberu'), {
    dictionary: 'たべる', masu: 'たべます', te: 'たべて', teiru: 'たべてる', tene: 'たべてね', nai: 'たべない', ta: 'たべた',
  });
});

test('godan verbs: every ending class produces the right te/ta/nai/masu', () => {
  assert.deepStrictEqual(kana('nomu'), {
    dictionary: 'のむ', masu: 'のみます', te: 'のんで', teiru: 'のんでる', tene: 'のんでね', nai: 'のまない', ta: 'のんだ',
  });
  assert.strictEqual(kana('hanasu').te, 'はなして');
  assert.strictEqual(kana('kaku').te, 'かいて');
  assert.strictEqual(kana('oyogu').te, 'およいで');
  assert.strictEqual(kana('oyogu').ta, 'およいだ');
  assert.strictEqual(kana('matsu').te, 'まって');
  assert.strictEqual(kana('matsu').masu, 'まちます');
  assert.strictEqual(kana('shinu').te, 'しんで');
  assert.strictEqual(kana('asobu').ta, 'あそんだ');
  assert.strictEqual(kana('kaeru').te, 'かえって');
  assert.strictEqual(kana('kaeru').nai, 'かえらない');
  assert.strictEqual(kana('kiku').ta, 'きいた');
});

test('う-verbs take わ in the negative, not あ', () => {
  assert.strictEqual(kana('kau').nai, 'かわない');
  assert.strictEqual(kana('kau').masu, 'かいます');
});

test('行く is the one く-verb with って/った', () => {
  assert.strictEqual(kana('iku').te, 'いって');
  assert.strictEqual(kana('iku').ta, 'いった');
  assert.strictEqual(kana('iku').teiru, 'いってる');
  assert.strictEqual(kana('iku').nai, 'いかない');
});

test('ある: negative is ない, not あらない', () => {
  assert.strictEqual(kana('aru').nai, 'ない');
  assert.strictEqual(kana('aru').te, 'あって');
});

test('aru-special verbs (くださる) take い before ます', () => {
  assert.strictEqual(kana('kudasaru').masu, 'くださいます');
});

test('する and suru-nouns conjugate as する', () => {
  assert.deepStrictEqual(kana('suru'), {
    dictionary: 'する', masu: 'します', te: 'して', teiru: 'してる', tene: 'してね', nai: 'しない', ta: 'した',
  });
  const b = forms('benkyou');
  assert.strictEqual(b.dictionary.word, '勉強する');
  assert.strictEqual(b.teiru.word, '勉強してる');
  assert.deepStrictEqual(b.masu.segs, [['勉強', 'べんきょう'], ['します']]);
});

test('来る changes its kanji reading per form: く / き / こ', () => {
  assert.deepStrictEqual(kana('kuru'), {
    dictionary: 'くる', masu: 'きます', te: 'きて', teiru: 'きてる', tene: 'きてね', nai: 'こない', ta: 'きた',
  });
  assert.strictEqual(surface('kuru').nai, '来ない');
  assert.deepStrictEqual(forms('kuru').nai.segs, [['来', 'こ'], ['ない']]);
});

test('kanji stay put and keep correct furigana through conjugation', () => {
  const f = forms('torikesu');
  assert.strictEqual(f.te.word, '取り消して');
  assert.deepStrictEqual(f.te.segs, [['取', 'と'], ['り'], ['消', 'け'], ['して']]);
});

test('teiru and tene are always the te-form plus る / ね, for every verb class', () => {
  for (const name of ['miru', 'nomu', 'iku', 'kau', 'suru', 'kuru', 'benkyou', 'oyogu']) {
    const k = kana(name);
    assert.strictEqual(k.teiru, k.te + 'る', `${name} teiru`);
    assert.strictEqual(k.tene, k.te + 'ね', `${name} tene`);
  }
});

// ------------------------------------------------------------------ adjectives & nouns

test('i-adjectives: くない / かった / くなかった / くて / く', () => {
  assert.deepStrictEqual(kana('ookii'), {
    dictionary: 'おおきい', nai: 'おおきくない', ta: 'おおきかった', nakatta: 'おおきくなかった', te: 'おおきくて', ku: 'おおきく',
  });
});

test('いい conjugates from よい: よくない, よかった', () => {
  assert.strictEqual(kana('ii').nai, 'よくない');
  assert.strictEqual(kana('ii').ta, 'よかった');
  assert.strictEqual(kana('ii').dictionary, 'いい');
});

test('na-adjectives: な / だ / じゃない / だった / に', () => {
  assert.deepStrictEqual(surface('shizuka'), {
    dictionary: '静か', na: '静かな', da: '静かだ', nai: '静かじゃない', ta: '静かだった', ni: '静かに',
  });
});

test('nouns become a single card, with furigana', () => {
  const f = W.buildForms(entry('gakkou'));
  assert.strictEqual(f.length, 1);
  assert.deepStrictEqual(f[0].segs, [['学校', 'がっこう']]);
});

test('every generated reading is pure kana, and every card id is unique', () => {
  const ids = new Set();
  for (const name of Object.keys(J).filter((n) => n !== 'wikiOnly')) {
    for (const card of W.cardsForEntry(entry(name))) {
      assert.match(card.kana, /^[ぁ-ゟ゠-ヿー]+$/, `${card.id}: ${card.kana}`);
      assert.ok(!ids.has(card.id), `duplicate ${card.id}`);
      ids.add(card.id);
    }
  }
});
