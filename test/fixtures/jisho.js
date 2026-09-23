/**
 * Trimmed Jisho API items (GET /api/v1/search/words), in the shape the real
 * API returns: japanese[{word, reading}], senses[{english_definitions,
 * parts_of_speech, tags}], jlpt["jlpt-n5"], is_common. Used by the unit
 * tests and by the mock Jisho server in the browser checks.
 */
const item = (word, reading, pos, defs, extra = {}) => ({
  slug: word || reading,
  is_common: extra.common !== false,
  tags: [],
  jlpt: extra.jlpt ? [`jlpt-${extra.jlpt}`] : [],
  japanese: [word ? { word, reading } : { reading }],
  senses: [
    { english_definitions: defs, parts_of_speech: pos, tags: extra.tags || [], links: [], see_also: [], antonyms: [], source: [], info: [] },
    ...(extra.more || []),
  ],
  attribution: { jmdict: true, jmnedict: false, dbpedia: false },
});

module.exports = {
  miru: item('見る', 'みる', ['Ichidan verb', 'Transitive verb'], ['to see', 'to look', 'to watch'], { jlpt: 'n5' }),
  taberu: item('食べる', 'たべる', ['Ichidan verb', 'Transitive verb'], ['to eat'], { jlpt: 'n5' }),
  nomu: item('飲む', 'のむ', ["Godan verb with 'mu' ending", 'Transitive verb'], ['to drink'], { jlpt: 'n5' }),
  hanasu: item('話す', 'はなす', ["Godan verb with 'su' ending", 'Transitive verb'], ['to talk', 'to speak'], { jlpt: 'n5' }),
  kaku: item('書く', 'かく', ["Godan verb with 'ku' ending", 'Transitive verb'], ['to write'], { jlpt: 'n5' }),
  iku: item('行く', 'いく', ['Godan verb - Iku/Yuku special class', 'intransitive verb'], ['to go'], { jlpt: 'n5' }),
  matsu: item('待つ', 'まつ', ["Godan verb with 'tsu' ending", 'Transitive verb'], ['to wait'], { jlpt: 'n5' }),
  kau: item('買う', 'かう', ["Godan verb with 'u' ending", 'Transitive verb'], ['to buy'], { jlpt: 'n5' }),
  kiku: item('聞く', 'きく', ["Godan verb with 'ku' ending", 'Transitive verb'], ['to hear', 'to listen', 'to ask'], { jlpt: 'n5' }),
  oyogu: item('泳ぐ', 'およぐ', ["Godan verb with 'gu' ending", 'intransitive verb'], ['to swim'], { jlpt: 'n5' }),
  shinu: item('死ぬ', 'しぬ', ["Godan verb with 'nu' ending", 'intransitive verb'], ['to die'], { jlpt: 'n5' }),
  asobu: item('遊ぶ', 'あそぶ', ["Godan verb with 'bu' ending", 'intransitive verb'], ['to play'], { jlpt: 'n5' }),
  kaeru: item('帰る', 'かえる', ["Godan verb with 'ru' ending", 'intransitive verb'], ['to return', 'to go home'], { jlpt: 'n5' }),
  aru: item('有る', 'ある', ["Godan verb with 'ru' ending (irregular verb)", 'intransitive verb'], ['to be', 'to exist'], { jlpt: 'n5', tags: ['Usually written using kana alone'] }),
  kudasaru: item('下さる', 'くださる', ['Godan verb - aru special class', 'Transitive verb'], ['to give', 'to confer'], { jlpt: 'n4', tags: ['Usually written using kana alone'] }),
  suru: item('為る', 'する', ['Suru verb - included', 'Transitive verb'], ['to do'], { jlpt: 'n5', tags: ['Usually written using kana alone'] }),
  benkyou: item('勉強', 'べんきょう', ['Noun', 'Suru verb'], ['study'], { jlpt: 'n5' }),
  kuru: item('来る', 'くる', ['Kuru verb - special class', 'intransitive verb'], ['to come'], { jlpt: 'n5' }),
  torikesu: item('取り消す', 'とりけす', ["Godan verb with 'su' ending", 'Transitive verb'], ['to cancel', 'to take back'], { jlpt: 'n1' }),
  ookii: item('大きい', 'おおきい', ['I-adjective (keiyoushi)'], ['big', 'large'], { jlpt: 'n5' }),
  ii: item('良い', 'いい', ['I-adjective (keiyoushi) - yoi/ii class'], ['good', 'excellent'], { jlpt: 'n5', tags: ['Usually written using kana alone'] }),
  shizuka: item('静か', 'しずか', ['Na-adjective (keiyodoshi)'], ['quiet', 'silent'], { jlpt: 'n5' }),
  gakkou: item('学校', 'がっこう', ['Noun'], ['school'], { jlpt: 'n5' }),
  terebi: item(null, 'テレビ', ['Noun'], ['television', 'TV'], { jlpt: 'n5' }),
  wikiOnly: {
    slug: 'x', is_common: false, tags: [], jlpt: [], japanese: [{ word: 'X', reading: 'えっくす' }],
    senses: [{ english_definitions: ['X'], parts_of_speech: ['Wikipedia definition'], tags: [] }],
  },
};
