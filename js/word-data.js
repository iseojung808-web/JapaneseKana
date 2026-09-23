/**
 * Words: turning a Jisho dictionary entry into something you can study.
 *
 * Nothing in here is a word list. Words come from Jisho.org (via the app's
 * /api/jisho proxy) and this file does three jobs on each one:
 *
 *   1. normalizeJishoItem — boil Jisho's response down to what we keep
 *   2. alignFurigana      — work out which reading sits over which kanji
 *   3. buildForms         — generate the conjugations (見る → 見てる → 見てね)
 *
 * Conjugation is rule-based on the verb class Jisho reports, so it works
 * for any verb a learner adds, not just the ones someone typed in by hand.
 */

// In the browser KANA is a global from kana-data.js; under Node (tests) we require it.
const KANA_TABLE = typeof KANA !== 'undefined' ? KANA : require('./kana-data.js').KANA;

// ------------------------------------------------------------------ kana

const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;

function toHiragana(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// Longest-match romaji table built from the app's own kana data, plus the
// few small kana that turn up in loanwords.
const ROMAJI = (() => {
  const map = new Map();
  KANA_TABLE.forEach((k) => { if (!map.has(k.h)) map.set(k.h, k.r); });
  [['ぁ', 'a'], ['ぃ', 'i'], ['ぅ', 'u'], ['ぇ', 'e'], ['ぉ', 'o'], ['ゎ', 'wa'], ['ゔ', 'vu'],
    ['ふぁ', 'fa'], ['ふぃ', 'fi'], ['ふぇ', 'fe'], ['ふぉ', 'fo'], ['てぃ', 'ti'], ['でぃ', 'di'],
    ['うぃ', 'wi'], ['うぇ', 'we'], ['うぉ', 'wo'], ['しぇ', 'she'], ['ちぇ', 'che'], ['じぇ', 'je'],
  ].forEach(([k, r]) => map.set(k, r));
  return map;
})();

/** Hepburn-ish romaji: っ doubles the next consonant, ん gets an apostrophe before a vowel, ー repeats. */
function toRomaji(kana) {
  const s = toHiragana(kana);
  let out = '';
  let double = false;
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (ch === 'っ') { double = true; i += 1; continue; }
    if (ch === 'ー') { const v = out.match(/[aeiou]$/); out += v ? v[0] : ''; i += 1; continue; }
    const pair = s.slice(i, i + 2);
    let r;
    if (ROMAJI.has(pair)) { r = ROMAJI.get(pair); i += 2; } else { r = ROMAJI.get(ch) || ch; i += 1; }
    if (ch === 'ん' && /^[aeiouy]/.test(ROMAJI.get(s[i]) || '')) r = "n'";
    if (double) { r = (r.startsWith('ch') ? 't' : r[0]) + r; double = false; }
    out += r;
  }
  return out;
}

// ------------------------------------------------------------------ furigana

/**
 * Split a word into [text, reading] segments so only kanji get furigana.
 * The word's kana are used as anchors in a pattern matched against the
 * reading: 取り消す / とりけす → ^(.+?)り(.+?)す$ → 取[と] り 消[け] す.
 * If the reading doesn't fit the pattern (irregular words), the whole word
 * gets the whole reading rather than a guessed split.
 */
function alignFurigana(word, reading) {
  if (!word || !reading || word === reading) return [[word || reading]];
  const runs = [];
  for (const ch of word) {
    const kanji = KANJI_RE.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.kanji === kanji) last.text += ch;
    else runs.push({ kanji, text: ch });
  }
  if (!runs.some((r) => r.kanji)) return [[word]];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('^' + runs.map((r) => (r.kanji ? '(.+?)' : esc(toHiragana(r.text)))).join('') + '$');
  const m = toHiragana(reading).match(pattern);
  if (!m) return [[word, reading]];
  let g = 1;
  return runs.map((r) => (r.kanji ? [r.text, m[g++]] : [r.text]));
}

function kanaOf(segs) {
  return segs.map(([text, ruby]) => ruby || text).join('');
}

const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** <ruby>見<rt>み</rt></ruby>る — kanji always carry their reading. */
function furiganaHTML(segs) {
  return segs.map(([text, ruby]) => (ruby
    ? `<ruby>${escapeHTML(text)}<rt>${escapeHTML(ruby)}</rt></ruby>`
    : escapeHTML(text))).join('');
}

// ------------------------------------------------------------------ word classes

/**
 * Read Jisho's parts_of_speech strings for the first sense and decide how
 * the word inflects. Order matters: 勉強 is listed as both "Noun" and
 * "Suru verb", and we want the verb behaviour.
 */
function classify(posList) {
  const has = (re) => posList.some((p) => re.test(p));
  if (has(/^Kuru verb/)) return { kind: 'verb', vclass: 'kuru' };
  if (has(/^Suru verb - (included|special class)/)) return { kind: 'verb', vclass: 'suru' };
  if (has(/^Godan verb - Iku\/Yuku special class/)) return { kind: 'verb', vclass: 'godan', special: 'iku' };
  if (has(/^Godan verb - aru special class/)) return { kind: 'verb', vclass: 'godan', special: 'aru' };
  if (has(/^Godan verb with 'ru' ending \(irregular verb\)/)) return { kind: 'verb', vclass: 'godan', special: 'aru-irregular' };
  if (has(/^Godan verb/)) return { kind: 'verb', vclass: 'godan' };
  if (has(/^Ichidan verb/)) return { kind: 'verb', vclass: 'ichidan' };
  if (has(/^I-adjective/)) return { kind: 'i-adj', special: has(/yoi\/ii class/) ? 'ii' : null };
  if (has(/^Na-adjective/)) return { kind: 'na-adj' };
  if (has(/^Suru verb$/)) return { kind: 'verb', vclass: 'suru', addSuru: true };
  return { kind: 'other' };
}

const CLASS_LABEL = {
  ichidan: 'ichidan verb', godan: 'godan verb', suru: 'suru verb', kuru: 'irregular verb',
  'i-adj': 'i-adjective', 'na-adj': 'na-adjective', other: '',
};

// ------------------------------------------------------------------ conjugation

// Godan: dictionary ending → [i-stem, a-stem, te, ta]
const GODAN = {
  う: ['い', 'わ', 'って', 'った'], く: ['き', 'か', 'いて', 'いた'], ぐ: ['ぎ', 'が', 'いで', 'いだ'],
  す: ['し', 'さ', 'して', 'した'], つ: ['ち', 'た', 'って', 'った'], ぬ: ['に', 'な', 'んで', 'んだ'],
  ぶ: ['び', 'ば', 'んで', 'んだ'], む: ['み', 'ま', 'んで', 'んだ'], る: ['り', 'ら', 'って', 'った'],
};

const VERB_FORMS = [
  { key: 'dictionary', label: 'dictionary form', hint: 'plain present / future' },
  { key: 'masu', label: 'polite (~masu)', hint: 'same meaning, polite' },
  { key: 'te', label: 'te-form', hint: 'links actions ("…and"); alone, a casual request' },
  { key: 'teiru', label: 'casual ~te-iru (~teru)', hint: 'ongoing action or resulting state: "is …ing"' },
  { key: 'tene', label: '~te + ne', hint: 'friendly request: "please …, okay?"' },
  { key: 'nai', label: 'negative', hint: '"does not …"' },
  { key: 'ta', label: 'past', hint: '"did …"' },
];
const I_ADJ_FORMS = [
  { key: 'dictionary', label: 'dictionary form', hint: '"is …" / "… (noun)"' },
  { key: 'nai', label: 'negative (~kunai)', hint: '"is not …"' },
  { key: 'ta', label: 'past (~katta)', hint: '"was …"' },
  { key: 'nakatta', label: 'past negative', hint: '"was not …"' },
  { key: 'te', label: 'te-form (~kute)', hint: '"… and" — links to the next phrase' },
  { key: 'ku', label: 'adverb (~ku)', hint: '"…ly"' },
];
const NA_ADJ_FORMS = [
  { key: 'dictionary', label: 'base', hint: 'the adjective itself' },
  { key: 'na', label: 'before a noun (~na)', hint: '"a … (thing)"' },
  { key: 'da', label: 'casual "is" (~da)', hint: '"is …"' },
  { key: 'nai', label: 'negative (~janai)', hint: '"is not …"' },
  { key: 'ta', label: 'past (~datta)', hint: '"was …"' },
  { key: 'ni', label: 'adverb (~ni)', hint: '"…ly"' },
];

/**
 * Every form is built on the word and its reading in parallel: the ending
 * that changes is kana in both, so the same edit applies to each. The one
 * exception is 来る, whose kanji itself changes reading (く/き/こ).
 */
function verbForms(word, reading, cls) {
  const W = (w, r) => ({ word: w, reading: r });
  let pairs;

  if (cls.vclass === 'suru') {
    const base = cls.addSuru ? W(word + 'する', reading + 'する') : W(word, reading);
    const pw = base.word.replace(/(する|為る)$/, '');
    const pr = base.reading.replace(/する$/, '');
    pairs = {
      dictionary: W(pw + 'する', pr + 'する'), masu: W(pw + 'します', pr + 'します'),
      te: W(pw + 'して', pr + 'して'), teiru: W(pw + 'してる', pr + 'してる'),
      tene: W(pw + 'してね', pr + 'してね'), nai: W(pw + 'しない', pr + 'しない'), ta: W(pw + 'した', pr + 'した'),
    };
  } else if (cls.vclass === 'kuru') {
    const pw = word.replace(/(来る|くる|來る)$/, '');
    const pr = reading.replace(/くる$/, '');
    const kanji = /[来來]る$/.test(word) ? word.slice(-2, -1) : null;
    const f = (stemReading, ending) => W(pw + (kanji || stemReading) + ending, pr + stemReading + ending);
    pairs = {
      dictionary: f('く', 'る'), masu: f('き', 'ます'), te: f('き', 'て'), teiru: f('き', 'てる'),
      tene: f('き', 'てね'), nai: f('こ', 'ない'), ta: f('き', 'た'),
    };
  } else {
    const end = reading.slice(-1);
    if (word.slice(-1) !== end) return null; // ending isn't kana in both — don't guess
    const sw = word.slice(0, -1);
    const sr = reading.slice(0, -1);
    const f = (tail) => W(sw + tail, sr + tail);
    if (cls.vclass === 'ichidan') {
      if (end !== 'る') return null;
      pairs = {
        dictionary: f('る'), masu: f('ます'), te: f('て'), teiru: f('てる'), tene: f('てね'), nai: f('ない'), ta: f('た'),
      };
    } else {
      const g = GODAN[end];
      if (!g) return null;
      let [iStem, aStem, te, ta] = g;
      if (cls.special === 'iku') { te = 'って'; ta = 'った'; }
      if (cls.special === 'aru') iStem = 'い'; // くださる → ください-ます
      pairs = {
        dictionary: f(end), masu: f(iStem + 'ます'), te: f(te), teiru: f(te + 'る'),
        tene: f(te + 'ね'), nai: f(aStem + 'ない'), ta: f(ta),
      };
      if (cls.special === 'aru-irregular') pairs.nai = W('ない', 'ない'); // ある → ない, not あらない
    }
  }
  return VERB_FORMS.map((def) => ({ ...def, ...pairs[def.key] }));
}

function iAdjForms(word, reading, cls) {
  if (reading.slice(-1) !== 'い' || word.slice(-1) !== 'い') return null;
  let sw = word.slice(0, -1);
  let sr = reading.slice(0, -1);
  if (cls.special === 'ii') {
    // いい conjugates from its older form よい: よくない, よかった.
    if (/いい$/.test(word)) sw = word.slice(0, -2) + 'よ';
    sr = reading.slice(0, -2) + 'よ';
  }
  const f = (tail) => ({ word: sw + tail, reading: sr + tail });
  const pairs = {
    dictionary: { word, reading }, nai: f('くない'), ta: f('かった'), nakatta: f('くなかった'), te: f('くて'), ku: f('く'),
  };
  return I_ADJ_FORMS.map((def) => ({ ...def, ...pairs[def.key] }));
}

function naAdjForms(word, reading) {
  const f = (tail) => ({ word: word + tail, reading: reading + tail });
  const pairs = { dictionary: f(''), na: f('な'), da: f('だ'), nai: f('じゃない'), ta: f('だった'), ni: f('に') };
  return NA_ADJ_FORMS.map((def) => ({ ...def, ...pairs[def.key] }));
}

/**
 * All the forms a learner studies for one entry. Words that don't inflect
 * (nouns, particles, anything we can't conjugate with confidence) get a
 * single "word" form — a correct single card beats a wrong conjugation.
 */
function buildForms(entry) {
  const cls = entry.cls;
  let forms = null;
  if (cls.kind === 'verb') forms = verbForms(entry.word, entry.reading, cls);
  else if (cls.kind === 'i-adj') forms = iAdjForms(entry.word, entry.reading, cls);
  else if (cls.kind === 'na-adj') forms = naAdjForms(entry.word, entry.reading);
  if (!forms) forms = [{ key: 'word', label: CLASS_LABEL[cls.kind] || 'word', hint: '', word: entry.word, reading: entry.reading }];
  return forms.map((f) => {
    const segs = alignFurigana(f.word, f.reading);
    return { ...f, segs, kana: kanaOf(segs), romaji: toRomaji(f.reading) };
  });
}

// ------------------------------------------------------------------ jisho

/**
 * Keep only what we study from, so a saved list stays small and doesn't
 * depend on Jisho still being reachable later.
 */
function normalizeJishoItem(item) {
  if (!item || !Array.isArray(item.japanese) || !item.japanese.length) return null;
  const jp = item.japanese[0];
  const senses = (item.senses || []).filter((s) => !(s.parts_of_speech || []).includes('Wikipedia definition'));
  if (!jp.reading || !senses.length) return null;

  const kanaAlone = (senses[0].tags || []).includes('Usually written using kana alone');
  const word = kanaAlone || !jp.word ? jp.reading : jp.word;
  const pos = senses[0].parts_of_speech || [];
  const cls = classify(pos);
  const jlpt = (item.jlpt || []).map((j) => j.replace('jlpt-', '').toUpperCase()).sort().reverse()[0] || null;

  return {
    key: `${word}|${jp.reading}`,
    word,
    reading: jp.reading,
    meanings: senses.slice(0, 3).map((s) => s.english_definitions.join('; ')),
    pos,
    cls,
    classLabel: CLASS_LABEL[cls.kind === 'verb' ? cls.vclass : cls.kind] || (pos[0] || '').toLowerCase(),
    jlpt,
    common: !!item.is_common,
  };
}

/** Which Practice filter a word falls under. */
function wordType(entry) {
  if (entry.cls.kind === 'verb') return 'verb';
  if (entry.cls.kind === 'i-adj' || entry.cls.kind === 'na-adj') return 'adjective';
  return 'other';
}

function wordCardId(entryKey, formKey) {
  return `w:${entryKey}:${formKey}`;
}

/** Every flashcard one saved word produces: one per form. */
function cardsForEntry(entry) {
  const forms = buildForms(entry);
  const base = forms[0];
  return forms.map((f) => ({
    id: wordCardId(entry.key, f.key),
    entryKey: entry.key,
    formKey: f.key,
    type: wordType(entry),
    segs: f.segs,
    kana: f.kana,
    romaji: f.romaji,
    label: f.label,
    hint: f.hint,
    meaning: entry.meanings[0] || '',
    baseSegs: base.segs,
    baseRomaji: base.romaji,
    isBase: f === base,
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toHiragana, toRomaji, alignFurigana, kanaOf, furiganaHTML, escapeHTML,
    classify, buildForms, normalizeJishoItem, wordType, wordCardId, cardsForEntry,
  };
}
