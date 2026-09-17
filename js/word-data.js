/**
 * Word & conjugation database.
 *
 * Kana gets you reading; this gets you recognizing that 見る, 見てる, and
 * 見てね are all "the same word wearing different clothes" — exactly like
 * hiragana and katakana are the same sounds wearing different clothes.
 * That's the whole pedagogical point of grouping every verb with its
 * inflected forms instead of listing them as unrelated vocabulary.
 *
 * Furigana authoring uses a tiny inline template so every reading is
 * hand-checked once, here, instead of derived at runtime by some
 * kanji/kana alignment guesser (which is exactly the kind of thing that
 * silently produces a wrong reading nobody notices). Write kanji
 * immediately followed by {reading} for the part that needs a ruby
 * annotation; anything else is plain okurigana/kana and passes through
 * untouched.
 *
 *   parseFurigana('見{み}る')  ->  [['見', 'み'], ['る']]
 *   parseFurigana('学校{がっこう}') -> [['学校', 'がっこう']]
 *   parseFurigana('する')      ->  [['する']]   (no kanji, nothing to gloss)
 */

function parseFurigana(template) {
  const segs = [];
  let i = 0;
  while (i < template.length) {
    let j = i;
    while (j < template.length && template[j] !== '{') j++;
    const text = template.slice(i, j);
    if (j < template.length && template[j] === '{') {
      const end = template.indexOf('}', j);
      segs.push([text, template.slice(j + 1, end)]);
      i = end + 1;
    } else {
      if (text) segs.push([text]);
      i = j;
    }
  }
  return segs;
}

/** The full reading in kana, for speech synthesis and for typed-answer checks. */
function kanaOf(segs) {
  return segs.map(([text, ruby]) => ruby || text).join('');
}

/** <ruby>見<rt>み</rt></ruby>る — the actual HTML, built once per render. */
function furiganaHTML(segs) {
  return segs.map(([text, ruby]) => (ruby ? `<ruby>${text}<rt>${ruby}</rt></ruby>` : text)).join('');
}

/** Every verb below is built through this — parses each form's template once. */
function verb(id, group, meaning, forms, note) {
  const built = {};
  Object.keys(forms).forEach((key) => {
    const f = forms[key];
    const segs = parseFurigana(f.jp);
    built[key] = { segs, kana: kanaOf(segs), romaji: f.romaji, label: f.label, meaning: f.meaning };
  });
  return { id, type: 'verb', group, meaning, note: note || null, forms: built };
}

/**
 * Every verb carries the same seven forms, in the order a beginner should
 * meet them: the dictionary form first, then how to be polite, then the
 * te-form (the hinge everything else swings from), then the two casual
 * te-form contractions the user specifically asked for, then negative and
 * past. teiru and tene are always just the te-form plus る or ね — that's
 * not a coincidence, it's the actual grammar (miteru is short for miteiru,
 * dropping the i; mitene is the te-form plus the "okay?" particle ne).
 */
const VERB_FORM_ORDER = ['dictionary', 'masu', 'te', 'teiru', 'tene', 'nai', 'ta'];

const VERBS = [
  // ---- Ichidan (る-verbs): drop る, everything else is regular ----
  verb('miru', 'ichidan', 'to see / to watch / to look at', {
    dictionary: { jp: '見{み}る', romaji: 'miru', label: 'dictionary form', meaning: 'to see / to watch' },
    masu: { jp: '見{み}ます', romaji: 'mimasu', label: 'polite (~masu)', meaning: 'to see / to watch (polite)' },
    te: { jp: '見{み}て', romaji: 'mite', label: 'te-form', meaning: '"see/watch, and..." — also a request: "look!"' },
    teiru: { jp: '見{み}てる', romaji: 'miteru', label: 'casual, ongoing (~te+iru)', meaning: 'is watching / is looking' },
    tene: { jp: '見{み}てね', romaji: 'mitene', label: 'casual request (~te+ne)', meaning: 'watch it, okay?' },
    nai: { jp: '見{み}ない', romaji: 'minai', label: 'negative', meaning: "doesn't see / doesn't watch" },
    ta: { jp: '見{み}た', romaji: 'mita', label: 'past', meaning: 'saw / watched' },
  }),
  verb('taberu', 'ichidan', 'to eat', {
    dictionary: { jp: '食{た}べる', romaji: 'taberu', label: 'dictionary form', meaning: 'to eat' },
    masu: { jp: '食{た}べます', romaji: 'tabemasu', label: 'polite (~masu)', meaning: 'to eat (polite)' },
    te: { jp: '食{た}べて', romaji: 'tabete', label: 'te-form', meaning: '"eat, and..." — also a request: "eat up!"' },
    teiru: { jp: '食{た}べてる', romaji: 'tabeteru', label: 'casual, ongoing (~te+iru)', meaning: 'is eating' },
    tene: { jp: '食{た}べてね', romaji: 'tabetene', label: 'casual request (~te+ne)', meaning: 'eat it, okay?' },
    nai: { jp: '食{た}べない', romaji: 'tabenai', label: 'negative', meaning: "doesn't eat" },
    ta: { jp: '食{た}べた', romaji: 'tabeta', label: 'past', meaning: 'ate' },
  }),
  verb('neru', 'ichidan', 'to sleep / to go to bed', {
    dictionary: { jp: '寝{ね}る', romaji: 'neru', label: 'dictionary form', meaning: 'to sleep / to go to bed' },
    masu: { jp: '寝{ね}ます', romaji: 'nemasu', label: 'polite (~masu)', meaning: 'to sleep (polite)' },
    te: { jp: '寝{ね}て', romaji: 'nete', label: 'te-form', meaning: '"sleep, and..." — also a request: "go to sleep!"' },
    teiru: { jp: '寝{ね}てる', romaji: 'neteru', label: 'casual, ongoing (~te+iru)', meaning: 'is sleeping' },
    tene: { jp: '寝{ね}てね', romaji: 'netene', label: 'casual request (~te+ne)', meaning: 'go to sleep, okay?' },
    nai: { jp: '寝{ね}ない', romaji: 'nenai', label: 'negative', meaning: "doesn't sleep" },
    ta: { jp: '寝{ね}た', romaji: 'neta', label: 'past', meaning: 'slept' },
  }),
  verb('okiru', 'ichidan', 'to wake up / to get up', {
    dictionary: { jp: '起{お}きる', romaji: 'okiru', label: 'dictionary form', meaning: 'to wake up / to get up' },
    masu: { jp: '起{お}きます', romaji: 'okimasu', label: 'polite (~masu)', meaning: 'to wake up (polite)' },
    te: { jp: '起{お}きて', romaji: 'okite', label: 'te-form', meaning: '"wake up, and..." — also a request: "get up!"' },
    teiru: { jp: '起{お}きてる', romaji: 'okiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is awake / is up' },
    tene: { jp: '起{お}きてね', romaji: 'okitene', label: 'casual request (~te+ne)', meaning: 'get up, okay?' },
    nai: { jp: '起{お}きない', romaji: 'okinai', label: 'negative', meaning: "doesn't wake up" },
    ta: { jp: '起{お}きた', romaji: 'okita', label: 'past', meaning: 'woke up' },
  }),
  verb('deru', 'ichidan', 'to leave / to exit / to go out', {
    dictionary: { jp: '出{で}る', romaji: 'deru', label: 'dictionary form', meaning: 'to leave / to exit' },
    masu: { jp: '出{で}ます', romaji: 'demasu', label: 'polite (~masu)', meaning: 'to leave (polite)' },
    te: { jp: '出{で}て', romaji: 'dete', label: 'te-form', meaning: '"leave, and..." — also a request: "get out!"' },
    teiru: { jp: '出{で}てる', romaji: 'deteru', label: 'casual, ongoing (~te+iru)', meaning: 'is out / has left' },
    tene: { jp: '出{で}てね', romaji: 'detene', label: 'casual request (~te+ne)', meaning: 'head out, okay?' },
    nai: { jp: '出{で}ない', romaji: 'denai', label: 'negative', meaning: "doesn't leave" },
    ta: { jp: '出{で}た', romaji: 'deta', label: 'past', meaning: 'left / went out' },
  }),

  // ---- Godan (う-verbs): the stem vowel shifts with each form ----
  verb('nomu', 'godan', 'to drink', {
    dictionary: { jp: '飲{の}む', romaji: 'nomu', label: 'dictionary form', meaning: 'to drink' },
    masu: { jp: '飲{の}みます', romaji: 'nomimasu', label: 'polite (~masu)', meaning: 'to drink (polite)' },
    te: { jp: '飲{の}んで', romaji: 'nonde', label: 'te-form', meaning: '"drink, and..." — also a request: "drink up!"' },
    teiru: { jp: '飲{の}んでる', romaji: 'nonderu', label: 'casual, ongoing (~te+iru)', meaning: 'is drinking' },
    tene: { jp: '飲{の}んでね', romaji: 'nondene', label: 'casual request (~te+ne)', meaning: 'drink it, okay?' },
    nai: { jp: '飲{の}まない', romaji: 'nomanai', label: 'negative', meaning: "doesn't drink" },
    ta: { jp: '飲{の}んだ', romaji: 'nonda', label: 'past', meaning: 'drank' },
  }),
  verb('yomu', 'godan', 'to read', {
    dictionary: { jp: '読{よ}む', romaji: 'yomu', label: 'dictionary form', meaning: 'to read' },
    masu: { jp: '読{よ}みます', romaji: 'yomimasu', label: 'polite (~masu)', meaning: 'to read (polite)' },
    te: { jp: '読{よ}んで', romaji: 'yonde', label: 'te-form', meaning: '"read, and..." — also a request: "read it!"' },
    teiru: { jp: '読{よ}んでる', romaji: 'yonderu', label: 'casual, ongoing (~te+iru)', meaning: 'is reading' },
    tene: { jp: '読{よ}んでね', romaji: 'yondene', label: 'casual request (~te+ne)', meaning: 'read it, okay?' },
    nai: { jp: '読{よ}まない', romaji: 'yomanai', label: 'negative', meaning: "doesn't read" },
    ta: { jp: '読{よ}んだ', romaji: 'yonda', label: 'past', meaning: 'read' },
  }),
  verb('hanasu', 'godan', 'to speak / to talk', {
    dictionary: { jp: '話{はな}す', romaji: 'hanasu', label: 'dictionary form', meaning: 'to speak / to talk' },
    masu: { jp: '話{はな}します', romaji: 'hanashimasu', label: 'polite (~masu)', meaning: 'to speak (polite)' },
    te: { jp: '話{はな}して', romaji: 'hanashite', label: 'te-form', meaning: '"speak, and..." — also a request: "talk to me!"' },
    teiru: { jp: '話{はな}してる', romaji: 'hanashiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is talking' },
    tene: { jp: '話{はな}してね', romaji: 'hanashitene', label: 'casual request (~te+ne)', meaning: 'tell me, okay?' },
    nai: { jp: '話{はな}さない', romaji: 'hanasanai', label: 'negative', meaning: "doesn't speak" },
    ta: { jp: '話{はな}した', romaji: 'hanashita', label: 'past', meaning: 'spoke' },
  }),
  verb('kaku', 'godan', 'to write', {
    dictionary: { jp: '書{か}く', romaji: 'kaku', label: 'dictionary form', meaning: 'to write' },
    masu: { jp: '書{か}きます', romaji: 'kakimasu', label: 'polite (~masu)', meaning: 'to write (polite)' },
    te: { jp: '書{か}いて', romaji: 'kaite', label: 'te-form', meaning: '"write, and..." — also a request: "write it down!"' },
    teiru: { jp: '書{か}いてる', romaji: 'kaiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is writing' },
    tene: { jp: '書{か}いてね', romaji: 'kaitene', label: 'casual request (~te+ne)', meaning: 'write it, okay?' },
    nai: { jp: '書{か}かない', romaji: 'kakanai', label: 'negative', meaning: "doesn't write" },
    ta: { jp: '書{か}いた', romaji: 'kaita', label: 'past', meaning: 'wrote' },
  }),
  verb('iku', 'godan', 'to go', {
    dictionary: { jp: '行{い}く', romaji: 'iku', label: 'dictionary form', meaning: 'to go' },
    masu: { jp: '行{い}きます', romaji: 'ikimasu', label: 'polite (~masu)', meaning: 'to go (polite)' },
    te: { jp: '行{い}って', romaji: 'itte', label: 'te-form (irregular)', meaning: '"go, and..." — also a request: "go on!"' },
    teiru: { jp: '行{い}ってる', romaji: 'itteru', label: 'casual, ongoing (~te+iru)', meaning: 'is on the way / has gone' },
    tene: { jp: '行{い}ってね', romaji: 'ittene', label: 'casual request (~te+ne)', meaning: 'go ahead, okay?' },
    nai: { jp: '行{い}かない', romaji: 'ikanai', label: 'negative', meaning: "doesn't go" },
    ta: { jp: '行{い}った', romaji: 'itta', label: 'past (irregular)', meaning: 'went' },
  }, 'The one く-verb that breaks the pattern: every other く-verb takes いて/いた, but 行く takes って/った instead — memorize this one by itself.'),
  verb('matsu', 'godan', 'to wait', {
    dictionary: { jp: '待{ま}つ', romaji: 'matsu', label: 'dictionary form', meaning: 'to wait' },
    masu: { jp: '待{ま}ちます', romaji: 'machimasu', label: 'polite (~masu)', meaning: 'to wait (polite)' },
    te: { jp: '待{ま}って', romaji: 'matte', label: 'te-form', meaning: '"wait, and..." — also a request: "wait!"' },
    teiru: { jp: '待{ま}ってる', romaji: 'matteru', label: 'casual, ongoing (~te+iru)', meaning: 'is waiting' },
    tene: { jp: '待{ま}ってね', romaji: 'mattene', label: 'casual request (~te+ne)', meaning: 'wait for me, okay?' },
    nai: { jp: '待{ま}たない', romaji: 'matanai', label: 'negative', meaning: "doesn't wait" },
    ta: { jp: '待{ま}った', romaji: 'matta', label: 'past', meaning: 'waited' },
  }),
  verb('kau', 'godan', 'to buy', {
    dictionary: { jp: '買{か}う', romaji: 'kau', label: 'dictionary form', meaning: 'to buy' },
    masu: { jp: '買{か}います', romaji: 'kaimasu', label: 'polite (~masu)', meaning: 'to buy (polite)' },
    te: { jp: '買{か}って', romaji: 'katte', label: 'te-form', meaning: '"buy, and..." — also a request: "buy it!"' },
    teiru: { jp: '買{か}ってる', romaji: 'katteru', label: 'casual, ongoing (~te+iru)', meaning: 'is buying' },
    tene: { jp: '買{か}ってね', romaji: 'kattene', label: 'casual request (~te+ne)', meaning: 'buy it, okay?' },
    nai: { jp: '買{か}わない', romaji: 'kawanai', label: 'negative (う→わ)', meaning: "doesn't buy" },
    ta: { jp: '買{か}った', romaji: 'katta', label: 'past', meaning: 'bought' },
  }, 'う-verbs swap う for わ in the negative, not あ — this is the only place that exception shows up.'),
  verb('kiku', 'godan', 'to listen / to hear / to ask', {
    dictionary: { jp: '聞{き}く', romaji: 'kiku', label: 'dictionary form', meaning: 'to listen / to hear / to ask' },
    masu: { jp: '聞{き}きます', romaji: 'kikimasu', label: 'polite (~masu)', meaning: 'to listen (polite)' },
    te: { jp: '聞{き}いて', romaji: 'kiite', label: 'te-form', meaning: '"listen, and..." — also a request: "listen!"' },
    teiru: { jp: '聞{き}いてる', romaji: 'kiiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is listening' },
    tene: { jp: '聞{き}いてね', romaji: 'kiitene', label: 'casual request (~te+ne)', meaning: 'listen up, okay?' },
    nai: { jp: '聞{き}かない', romaji: 'kikanai', label: 'negative', meaning: "doesn't listen" },
    ta: { jp: '聞{き}いた', romaji: 'kiita', label: 'past', meaning: 'listened / heard / asked' },
  }),

  // ---- Irregular: only two verbs in the whole language do this ----
  verb('suru', 'irregular', 'to do', {
    dictionary: { jp: 'する', romaji: 'suru', label: 'dictionary form', meaning: 'to do' },
    masu: { jp: 'します', romaji: 'shimasu', label: 'polite (~masu)', meaning: 'to do (polite)' },
    te: { jp: 'して', romaji: 'shite', label: 'te-form', meaning: '"do, and..." — also a request: "do it!"' },
    teiru: { jp: 'してる', romaji: 'shiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is doing' },
    tene: { jp: 'してね', romaji: 'shitene', label: 'casual request (~te+ne)', meaning: 'do it, okay?' },
    nai: { jp: 'しない', romaji: 'shinai', label: 'negative', meaning: "doesn't do" },
    ta: { jp: 'した', romaji: 'shita', label: 'past', meaning: 'did' },
  }, 'Irregular — memorized as a whole, not built from a stem. Usually written in kana only.'),
  verb('kuru', 'irregular', 'to come', {
    dictionary: { jp: '来{く}る', romaji: 'kuru', label: 'dictionary form', meaning: 'to come' },
    masu: { jp: '来{き}ます', romaji: 'kimasu', label: 'polite (~masu)', meaning: 'to come (polite)' },
    te: { jp: '来{き}て', romaji: 'kite', label: 'te-form', meaning: '"come, and..." — also a request: "come here!"' },
    teiru: { jp: '来{き}てる', romaji: 'kiteru', label: 'casual, ongoing (~te+iru)', meaning: 'is coming / is here' },
    tene: { jp: '来{き}てね', romaji: 'kitene', label: 'casual request (~te+ne)', meaning: 'come by, okay?' },
    nai: { jp: '来{こ}ない', romaji: 'konai', label: 'negative (reading changes!)', meaning: "isn't coming" },
    ta: { jp: '来{き}た', romaji: 'kita', label: 'past', meaning: 'came' },
  }, 'The only verb whose kanji reading itself changes with the form: 来る is kuru, but 来ます is kimasu and 来ない is konai — same 来, three readings.'),
];

/** Nouns and adjectives: real vocabulary, no conjugation table, still furigana'd. */
const OTHER_WORDS = [
  { id: 'gakkou', type: 'noun', jp: '学校{がっこう}', romaji: 'gakkou', meaning: 'school' },
  { id: 'sensei', type: 'noun', jp: '先生{せんせい}', romaji: 'sensei', meaning: 'teacher' },
  { id: 'tomodachi', type: 'noun', jp: '友達{ともだち}', romaji: 'tomodachi', meaning: 'friend' },
  { id: 'mizu', type: 'noun', jp: '水{みず}', romaji: 'mizu', meaning: 'water' },
  { id: 'hi', type: 'noun', jp: '火{ひ}', romaji: 'hi', meaning: 'fire' },
  { id: 'yama', type: 'noun', jp: '山{やま}', romaji: 'yama', meaning: 'mountain' },
  { id: 'ki', type: 'noun', jp: '木{き}', romaji: 'ki', meaning: 'tree' },
  { id: 'hito', type: 'noun', jp: '人{ひと}', romaji: 'hito', meaning: 'person' },
  { id: 'nihon', type: 'noun', jp: '日本{にほん}', romaji: 'nihon', meaning: 'Japan' },
  { id: 'kyou', type: 'noun', jp: '今日{きょう}', romaji: 'kyou', meaning: 'today' },
  { id: 'neko', type: 'noun', jp: '猫{ねこ}', romaji: 'neko', meaning: 'cat' },
  { id: 'inu', type: 'noun', jp: '犬{いぬ}', romaji: 'inu', meaning: 'dog' },
  { id: 'kuruma', type: 'noun', jp: '車{くるま}', romaji: 'kuruma', meaning: 'car' },
  { id: 'ookii', type: 'adjective', jp: '大{おお}きい', romaji: 'ookii', meaning: 'big' },
  { id: 'chiisai', type: 'adjective', jp: '小{ちい}さい', romaji: 'chiisai', meaning: 'small' },
  { id: 'ii', type: 'adjective', jp: 'いい', romaji: 'ii', meaning: 'good' },
  { id: 'tanoshii', type: 'adjective', jp: '楽{たの}しい', romaji: 'tanoshii', meaning: 'fun' },
  { id: 'muzukashii', type: 'adjective', jp: '難{むずか}しい', romaji: 'muzukashii', meaning: 'difficult' },
].map((w) => {
  const segs = parseFurigana(w.jp);
  return { ...w, segs, kana: kanaOf(segs) };
});

/** A stable id for the SRS: word:<verbId>:<formKey>, or word:<id>:word for the rest. */
function wordCardId(wordId, formKey) {
  return `word:${wordId}:${formKey || 'word'}`;
}

/**
 * Every quizzable/flashcardable unit, flattened: one entry per verb form,
 * one entry per noun/adjective. Each carries everything a card needs to
 * render and to grade, independent of whether it came from a conjugation
 * table or a flat word list.
 */
const WORD_CARDS = [
  ...VERBS.flatMap((v) =>
    VERB_FORM_ORDER.map((formKey) => {
      const f = v.forms[formKey];
      return {
        id: wordCardId(v.id, formKey),
        wordId: v.id,
        formKey,
        type: 'verb',
        group: v.group,
        segs: f.segs,
        kana: f.kana,
        romaji: f.romaji,
        label: f.label,
        meaning: f.meaning,
        baseWord: v.id,
        baseMeaning: v.meaning,
        note: v.note,
      };
    })
  ),
  ...OTHER_WORDS.map((w) => ({
    id: wordCardId(w.id, null),
    wordId: w.id,
    formKey: null,
    type: w.type,
    group: null,
    segs: w.segs,
    kana: w.kana,
    romaji: w.romaji,
    label: w.type === 'noun' ? 'noun' : 'adjective',
    meaning: w.meaning,
    baseWord: w.id,
    baseMeaning: w.meaning,
    note: null,
  })),
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseFurigana,
    kanaOf,
    furiganaHTML,
    VERBS,
    OTHER_WORDS,
    VERB_FORM_ORDER,
    WORD_CARDS,
    wordCardId,
  };
}
