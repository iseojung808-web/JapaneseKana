/**
 * Kana database.
 *
 * Every entry pairs a hiragana character with its katakana twin, because the
 * two syllabaries are the same sound wearing different clothes. Teaching them
 * side by side is the whole point of this app.
 *
 * `r`   - primary romanization (modified Hepburn, what we show the learner)
 * `alt` - other spellings we accept when the learner types an answer
 *         (Kunrei-shiki, Nihon-shiki, and common keyboard habits)
 * `set` - "gojuon" (base), "dakuten" (voiced/plosive), or "yoon" (combos)
 * `row` - the consonant family, used for grouping and for the chart layout
 */

const K = (h, k, r, row, set, alt) => ({ h, k, r, row, set, alt: alt || [] });

const KANA = [
  // ---- Gojūon: the 46 basics ----
  K('あ', 'ア', 'a', 'vowel', 'gojuon'),
  K('い', 'イ', 'i', 'vowel', 'gojuon'),
  K('う', 'ウ', 'u', 'vowel', 'gojuon'),
  K('え', 'エ', 'e', 'vowel', 'gojuon'),
  K('お', 'オ', 'o', 'vowel', 'gojuon'),

  K('か', 'カ', 'ka', 'k', 'gojuon'),
  K('き', 'キ', 'ki', 'k', 'gojuon'),
  K('く', 'ク', 'ku', 'k', 'gojuon'),
  K('け', 'ケ', 'ke', 'k', 'gojuon'),
  K('こ', 'コ', 'ko', 'k', 'gojuon'),

  K('さ', 'サ', 'sa', 's', 'gojuon'),
  K('し', 'シ', 'shi', 's', 'gojuon', ['si']),
  K('す', 'ス', 'su', 's', 'gojuon'),
  K('せ', 'セ', 'se', 's', 'gojuon'),
  K('そ', 'ソ', 'so', 's', 'gojuon'),

  K('た', 'タ', 'ta', 't', 'gojuon'),
  K('ち', 'チ', 'chi', 't', 'gojuon', ['ti']),
  K('つ', 'ツ', 'tsu', 't', 'gojuon', ['tu']),
  K('て', 'テ', 'te', 't', 'gojuon'),
  K('と', 'ト', 'to', 't', 'gojuon'),

  K('な', 'ナ', 'na', 'n', 'gojuon'),
  K('に', 'ニ', 'ni', 'n', 'gojuon'),
  K('ぬ', 'ヌ', 'nu', 'n', 'gojuon'),
  K('ね', 'ネ', 'ne', 'n', 'gojuon'),
  K('の', 'ノ', 'no', 'n', 'gojuon'),

  K('は', 'ハ', 'ha', 'h', 'gojuon'),
  K('ひ', 'ヒ', 'hi', 'h', 'gojuon'),
  K('ふ', 'フ', 'fu', 'h', 'gojuon', ['hu']),
  K('へ', 'ヘ', 'he', 'h', 'gojuon'),
  K('ほ', 'ホ', 'ho', 'h', 'gojuon'),

  K('ま', 'マ', 'ma', 'm', 'gojuon'),
  K('み', 'ミ', 'mi', 'm', 'gojuon'),
  K('む', 'ム', 'mu', 'm', 'gojuon'),
  K('め', 'メ', 'me', 'm', 'gojuon'),
  K('も', 'モ', 'mo', 'm', 'gojuon'),

  K('や', 'ヤ', 'ya', 'y', 'gojuon'),
  K('ゆ', 'ユ', 'yu', 'y', 'gojuon'),
  K('よ', 'ヨ', 'yo', 'y', 'gojuon'),

  K('ら', 'ラ', 'ra', 'r', 'gojuon'),
  K('り', 'リ', 'ri', 'r', 'gojuon'),
  K('る', 'ル', 'ru', 'r', 'gojuon'),
  K('れ', 'レ', 're', 'r', 'gojuon'),
  K('ろ', 'ロ', 'ro', 'r', 'gojuon'),

  K('わ', 'ワ', 'wa', 'w', 'gojuon'),
  K('を', 'ヲ', 'wo', 'w', 'gojuon', ['o']),
  K('ん', 'ン', 'n', 'special', 'gojuon', ['nn']),

  // ---- Dakuten & handakuten: the ones with sound effects ----
  K('が', 'ガ', 'ga', 'g', 'dakuten'),
  K('ぎ', 'ギ', 'gi', 'g', 'dakuten'),
  K('ぐ', 'グ', 'gu', 'g', 'dakuten'),
  K('げ', 'ゲ', 'ge', 'g', 'dakuten'),
  K('ご', 'ゴ', 'go', 'g', 'dakuten'),

  K('ざ', 'ザ', 'za', 'z', 'dakuten'),
  K('じ', 'ジ', 'ji', 'z', 'dakuten', ['zi']),
  K('ず', 'ズ', 'zu', 'z', 'dakuten'),
  K('ぜ', 'ゼ', 'ze', 'z', 'dakuten'),
  K('ぞ', 'ゾ', 'zo', 'z', 'dakuten'),

  K('だ', 'ダ', 'da', 'd', 'dakuten'),
  K('ぢ', 'ヂ', 'ji', 'd', 'dakuten', ['di', 'dji']),
  K('づ', 'ヅ', 'zu', 'd', 'dakuten', ['du', 'dzu']),
  K('で', 'デ', 'de', 'd', 'dakuten'),
  K('ど', 'ド', 'do', 'd', 'dakuten'),

  K('ば', 'バ', 'ba', 'b', 'dakuten'),
  K('び', 'ビ', 'bi', 'b', 'dakuten'),
  K('ぶ', 'ブ', 'bu', 'b', 'dakuten'),
  K('べ', 'ベ', 'be', 'b', 'dakuten'),
  K('ぼ', 'ボ', 'bo', 'b', 'dakuten'),

  K('ぱ', 'パ', 'pa', 'p', 'dakuten'),
  K('ぴ', 'ピ', 'pi', 'p', 'dakuten'),
  K('ぷ', 'プ', 'pu', 'p', 'dakuten'),
  K('ぺ', 'ペ', 'pe', 'p', 'dakuten'),
  K('ぽ', 'ポ', 'po', 'p', 'dakuten'),

  // ---- Yōon: small ya/yu/yo squished onto an -i kana ----
  K('きゃ', 'キャ', 'kya', 'k', 'yoon'),
  K('きゅ', 'キュ', 'kyu', 'k', 'yoon'),
  K('きょ', 'キョ', 'kyo', 'k', 'yoon'),

  K('しゃ', 'シャ', 'sha', 's', 'yoon', ['sya']),
  K('しゅ', 'シュ', 'shu', 's', 'yoon', ['syu']),
  K('しょ', 'ショ', 'sho', 's', 'yoon', ['syo']),

  K('ちゃ', 'チャ', 'cha', 't', 'yoon', ['tya']),
  K('ちゅ', 'チュ', 'chu', 't', 'yoon', ['tyu']),
  K('ちょ', 'チョ', 'cho', 't', 'yoon', ['tyo']),

  K('にゃ', 'ニャ', 'nya', 'n', 'yoon'),
  K('にゅ', 'ニュ', 'nyu', 'n', 'yoon'),
  K('にょ', 'ニョ', 'nyo', 'n', 'yoon'),

  K('ひゃ', 'ヒャ', 'hya', 'h', 'yoon'),
  K('ひゅ', 'ヒュ', 'hyu', 'h', 'yoon'),
  K('ひょ', 'ヒョ', 'hyo', 'h', 'yoon'),

  K('みゃ', 'ミャ', 'mya', 'm', 'yoon'),
  K('みゅ', 'ミュ', 'myu', 'm', 'yoon'),
  K('みょ', 'ミョ', 'myo', 'm', 'yoon'),

  K('りゃ', 'リャ', 'rya', 'r', 'yoon'),
  K('りゅ', 'リュ', 'ryu', 'r', 'yoon'),
  K('りょ', 'リョ', 'ryo', 'r', 'yoon'),

  K('ぎゃ', 'ギャ', 'gya', 'g', 'yoon'),
  K('ぎゅ', 'ギュ', 'gyu', 'g', 'yoon'),
  K('ぎょ', 'ギョ', 'gyo', 'g', 'yoon'),

  K('じゃ', 'ジャ', 'ja', 'z', 'yoon', ['jya', 'zya']),
  K('じゅ', 'ジュ', 'ju', 'z', 'yoon', ['jyu', 'zyu']),
  K('じょ', 'ジョ', 'jo', 'z', 'yoon', ['jyo', 'zyo']),

  K('びゃ', 'ビャ', 'bya', 'b', 'yoon'),
  K('びゅ', 'ビュ', 'byu', 'b', 'yoon'),
  K('びょ', 'ビョ', 'byo', 'b', 'yoon'),

  K('ぴゃ', 'ピャ', 'pya', 'p', 'yoon'),
  K('ぴゅ', 'ピュ', 'pyu', 'p', 'yoon'),
  K('ぴょ', 'ピョ', 'pyo', 'p', 'yoon'),
];

/**
 * Lessons are bite-sized: five characters at a time, grouped by consonant row,
 * which is how Japanese schoolchildren learn them and how the chart is laid
 * out. Cramming all 46 at once is the fastest way to learn nothing.
 */
const LESSONS = [
  { id: 'vowel', name: 'Vowels', sub: 'あいうえお', rows: ['vowel'], set: 'gojuon' },
  { id: 'k', name: 'K-row', sub: 'かきくけこ', rows: ['k'], set: 'gojuon' },
  { id: 's', name: 'S-row', sub: 'さしすせそ', rows: ['s'], set: 'gojuon' },
  { id: 't', name: 'T-row', sub: 'たちつてと', rows: ['t'], set: 'gojuon' },
  { id: 'n', name: 'N-row', sub: 'なにぬねの', rows: ['n'], set: 'gojuon' },
  { id: 'h', name: 'H-row', sub: 'はひふへほ', rows: ['h'], set: 'gojuon' },
  { id: 'm', name: 'M-row', sub: 'まみむめも', rows: ['m'], set: 'gojuon' },
  { id: 'yrw', name: 'Y, R, W + ん', sub: 'やらわん', rows: ['y', 'r', 'w', 'special'], set: 'gojuon' },
  { id: 'dakuten1', name: 'G & Z rows', sub: 'がざだ', rows: ['g', 'z', 'd'], set: 'dakuten' },
  { id: 'dakuten2', name: 'B & P rows', sub: 'ばぱ', rows: ['b', 'p'], set: 'dakuten' },
  { id: 'yoon1', name: 'Combos I', sub: 'きゃしゃちゃ', rows: ['k', 's', 't', 'n'], set: 'yoon' },
  { id: 'yoon2', name: 'Combos II', sub: 'ひゃみゃりゃ', rows: ['h', 'm', 'r'], set: 'yoon' },
  { id: 'yoon3', name: 'Combos III', sub: 'ぎゃじゃびゃぴゃ', rows: ['g', 'z', 'b', 'p'], set: 'yoon' },
];

/** The 5x N grid the chart view draws. null means "this square is empty". */
const CHART_ROWS = {
  gojuon: [
    ['a', 'i', 'u', 'e', 'o'],
    ['ka', 'ki', 'ku', 'ke', 'ko'],
    ['sa', 'shi', 'su', 'se', 'so'],
    ['ta', 'chi', 'tsu', 'te', 'to'],
    ['na', 'ni', 'nu', 'ne', 'no'],
    ['ha', 'hi', 'fu', 'he', 'ho'],
    ['ma', 'mi', 'mu', 'me', 'mo'],
    ['ya', null, 'yu', null, 'yo'],
    ['ra', 'ri', 'ru', 're', 'ro'],
    ['wa', null, null, null, 'wo'],
    ['n', null, null, null, null],
  ],
};

/** Vocabulary written purely in kana, used as the reward at the end of a quiz. */
const WORDS = [
  { h: 'すし', r: 'sushi', m: 'sushi' },
  { h: 'ねこ', r: 'neko', m: 'cat' },
  { h: 'いぬ', r: 'inu', m: 'dog' },
  { h: 'やま', r: 'yama', m: 'mountain' },
  { h: 'うみ', r: 'umi', m: 'sea' },
  { h: 'そら', r: 'sora', m: 'sky' },
  { h: 'ほし', r: 'hoshi', m: 'star' },
  { h: 'はな', r: 'hana', m: 'flower' },
  { h: 'みず', r: 'mizu', m: 'water' },
  { h: 'ともだち', r: 'tomodachi', m: 'friend' },
  { h: 'せんせい', r: 'sensei', m: 'teacher' },
  { h: 'がっこう', r: 'gakkou', m: 'school' },
  { h: 'でんしゃ', r: 'densha', m: 'train' },
  { h: 'きっぷ', r: 'kippu', m: 'ticket' },
  { h: 'ちゃいろ', r: 'chairo', m: 'brown' },
  { h: 'しゃしん', r: 'shashin', m: 'photograph' },
  { h: 'べんきょう', r: 'benkyou', m: 'study' },
  { h: 'じてんしゃ', r: 'jitensha', m: 'bicycle' },
  { h: 'ありがとう', r: 'arigatou', m: 'thank you' },
  { h: 'おはよう', r: 'ohayou', m: 'good morning' },
];

/** Every acceptable spelling of one card's reading, lowercased. */
function romajiFor(card) {
  return [card.r, ...card.alt];
}

/** Stable identity for a card: the script matters, so ID includes it. */
function cardId(entry, script) {
  return `${script}:${entry.r}:${entry[script === 'katakana' ? 'k' : 'h']}`;
}

/** The character a card actually shows, given the script being drilled. */
function glyph(entry, script) {
  return script === 'katakana' ? entry.k : entry.h;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KANA, LESSONS, CHART_ROWS, WORDS, romajiFor, cardId, glyph };
}

/**
 * Mnemonics. Shape-based hooks, because "just memorize it" is not a teaching
 * method. Shown after a wrong answer, when the learner is actually motivated
 * to read them.
 */
const MNEMONICS = {
  a: 'A capital A with an extra stroke — "Ahh, an antenna."',
  i: 'Two strokes leaning like the two dots of a lowercase i… twice.',
  u: 'A face in profile going "ooh".',
  e: 'An exotic bird with a long neck — "eh?"',
  o: 'Like あ but with a tail — think of someone shouting "Oh!"',
  ka: 'A cut of meat on a knife — ka-ka-katana.',
  ki: 'A key with two teeth.',
  ku: 'A bird\'s beak going "coo".',
  ke: 'A keg tipped on its side.',
  ko: 'Two curved lines — two koi swimming.',
  sa: 'Looks like a sign post. "Sa-sa-say, which way?"',
  shi: 'A fishing hook — she caught a fish.',
  su: 'A loop on a stick — a swing, or a screw.',
  se: 'A mouth with a tooth sticking out saying "say".',
  so: 'A zigzag stitch on a sock.',
  ta: 'A lowercase t plus an a — literally ta.',
  chi: 'A chair, seen from the side.',
  tsu: 'A wave curling — tsunami.',
  te: 'Looks like a te(n) written sideways, or a hand.',
  to: 'A nail with a drop of blood — "toe!"',
  na: 'A cross with a knot — a nun kneeling.',
  ni: 'Two lines, like the two of a knee bending.',
  nu: 'Noodles twirled on chopsticks.',
  ne: 'A cat\'s tail curling — neko.',
  no: 'A no-entry sign\'s diagonal slash.',
  ha: 'A person laughing "ha ha" with arms out.',
  hi: 'A big smile — "hee hee".',
  fu: 'Mount Fuji with a puff of smoke.',
  he: 'A small hill — a gentle "heh".',
  ho: 'Like へ with a pole — a house with an antenna.',
  ma: 'A hook with a cross — mama\'s apron.',
  mi: 'Looks like the number 21 — "mi" is me, and I\'m 21.',
  mu: 'A cow\'s face — cows say "muu" in Japanese.',
  me: 'An eye with an eyelash — "me" means eye.',
  mo: 'A fishing hook with two worms — more bait.',
  ya: 'A yak with horns.',
  yu: 'A fish on a hook — a "u"-nique shape.',
  yo: 'A yo-yo on a string.',
  ra: 'A rabbit sitting up.',
  ri: 'Two strokes like a river running down.',
  ru: 'A loop at the bottom — a route that loops back.',
  re: 'Like る but the loop escaped — it ran away.',
  ro: 'A square road, no loop.',
  wa: 'A hook with a straight line — a wagging tail.',
  wo: 'A person throwing a boomerang — "whoa".',
  n: 'A single squiggle, like a lowercase n in cursive.',
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.MNEMONICS = MNEMONICS;
}
