# かなトレ — Kana Trainer

A spaced-repetition trainer for the two Japanese syllabaries, plus vocabulary
from Jisho with conjugations and furigana. Built for someone who has never seen
a Japanese character before. Run `npm start`. There's no build step, no
dependencies and no account.

![all 104 characters with a mastery heat map, a quiz, and progress stats](https://img.shields.io/badge/kana-104-c2413a) ![no dependencies](https://img.shields.io/badge/dependencies-0-2e7d5b)

## Why this exists

Japanese looks impenetrable until you learn that most of it is phonetic. There
are 46 basic sounds, each written one way in hiragana and another in katakana,
and they never change. Learn them and you can sound out a menu, a station sign,
or a video game. It takes most people one to two weeks — **if** they review on
the right days, which is exactly the part humans are bad at and software is
good at.

## What's in it

**Chart** — all 104 characters (46 basic, 25 voiced, 33 combinations) in the
traditional grid, in both scripts. Every square is shaded by how well you
actually know it, so your weak spots are visible at a glance. Click any
character for its twin script, a mnemonic, your hit rate, and audio.

**Study** — five question types:

| Mode | You see | You answer |
|---|---|---|
| Kana → romaji | あ | pick "a" |
| Romaji → kana | "a" | pick あ |
| Type the reading | あ | type `a` |
| Flashcard | あ | flip it, then say whether you knew it |
| Mix it up | any of the first three | — |

Wrong answers show a mnemonic and come back before the session ends.
Multiple-choice distractors are drawn from the same consonant row, because
mixing up し and す is a mistake worth training and mixing up し and ぽ is not.
Press `1`–`4` instead of clicking.

Flashcard is the odd one out — instead of being auto-graded, you tap the card
(or press space) to flip it and reveal both scripts, the romaji, and a
mnemonic, then judge yourself: "Didn't know" (←) or "Knew it" (→). It's the
classic Anki-style review, and it feeds the same spaced-repetition scheduler
as every other mode. It's kept out of "Mix it up" on purpose — self-graded and
auto-graded rounds in the same session make your accuracy stats mean two
different things.

**Spaced repetition** — each character is a card in a Leitner box. Get it right
and it moves up (1 → 2 → 4 → 8 → 16 → 32 → 64 days). Get it wrong and it drops
two boxes, not to zero — losing a month of progress to one typo is how people
quit. Sessions mix cards that are due with new ones, weakest first.

**Progress** — accuracy, day streak, the characters that keep tripping you up,
and a seven-day forecast of your review load.

**Words** — vocabulary from [Jisho.org](https://jisho.org), so the list never
runs out. **Find words** has two ways in: *Discover* pulls the next batch of
words for a JLPT level (N5 through N1) and remembers where you stopped, so each
click brings words you haven't seen; *Look up* searches Jisho for anything —
English, kana, kanji or romaji. Add what you want to **My words**.

Verbs and adjectives arrive with their conjugations worked out: 見る (miru),
見てる (miteru) and 見てね (mitene) are one verb, not three words. The forms are
generated from the word class Jisho reports ("Ichidan verb", "Godan verb with
'mu' ending", …), so it works for any verb you add. Verbs get seven forms:
dictionary, polite, te-form, the casual ~teru and ~tene, negative and past.
Irregulars are handled: 行く (itte), 来る (kuru / kimasu / konai), する, ある (nai),
and suru-nouns like 勉強 (勉強する). i-adjectives get ~kunai / ~katta / ~kute /
~ku (いい becomes よくない), and na-adjectives get ~na / ~da / ~janai / ~datta /
~ni. A word the app can't conjugate with confidence stays a single card rather
than getting a wrong guess. Every kanji carries furigana, lined up over the
right characters, as real `<ruby>` markup.

**Practice** turns your list into flashcards, with one card per form. Filter by
verbs, adjectives or other words, or stick to dictionary forms. They use the
same spaced-repetition scheduler as kana, but a separate progress record.

Word lookup needs the app served by `npm start`. Jisho doesn't allow browser
pages to call it directly, so the app's own server forwards the request. Words
you've already added work offline. Dictionary data is from JMdict by the
[EDRDG](https://www.edrdg.org/) (CC BY-SA 4.0), via Jisho.

**Backup** — progress lives only in the browser you're using (see below), which
is a problem in anything temporary: a Codespace, a shared machine, a browser
profile you're about to clear. **Export progress** downloads a `.txt` file —
a short human-readable header (when you exported, your accuracy, your streak)
followed by the actual data as JSON. **Import progress** reads one back and
replaces your current state with it, after confirming. Round-trips exactly:
export, wipe everything, import, and you're back to the same cards, same
boxes, same stats. Importing a file that isn't one of these exports, or one
whose JSON got mangled, fails with an actual explanation instead of silently
corrupting your save.

## Suggested route

Lessons are five characters at a time, in the order Japanese schoolchildren
learn them. Doing all 46 on day one is the fastest way to learn nothing.

1. Vowels あいうえお — everything else is a consonant plus one of these.
2. One row a day: か, さ, た, な, は, ま, then や/ら/わ/ん.
3. Switch the script toggle to katakana and do it again. It's faster the
   second time; the sounds are already in your head.
4. Voiced sounds (が, ざ, だ, ば, ぱ) — no new shapes, just two ticks or a circle.
5. Combinations (きゃ, しゃ, ちゃ…) — a small ゃゅょ squashes two sounds into one beat.

Then set the script to **Both**, the mode to **Mix it up**, and do a short
session daily until the forecast chart runs dry.

## Running it

```bash
npm start                # http://localhost:8080 — needed for Words lookup
open index.html          # kana practice also works straight from the file
npm test                 # 44 tests: kana data, scheduler, conjugation, server
```

Audio uses the browser's built-in speech synthesis. If your system has no
Japanese voice installed, the app stays silent and everything else works.

## Files

```
index.html               markup for all five views
server.js                static files + the /api/jisho proxy (no dependencies)
css/styles.css           one stylesheet, light and dark, mobile down to 320px
js/kana-data.js          the 104 kana, lessons, mnemonics, vocabulary
js/word-data.js          Jisho parsing, furigana alignment, conjugation engine
js/srs.js                the scheduler — pure functions, no DOM
js/app.js                views, quiz logic, persistence
test/kana.test.js        kana data and scheduler
test/word-data.test.js   conjugation and furigana, checked against hand-verified forms
test/server.test.js      proxy behaviour and path-traversal protection
test/fixtures/jisho.js   sample Jisho API responses
```

Progress and your word list are stored in `localStorage` under
`kana-trainer/v1`. Search terms go to Jisho through the proxy; nothing else
leaves your browser. Clearing site data resets you to zero, so export a backup
first.

がんばって！
