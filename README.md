# かなトレ — Kana Trainer

A spaced-repetition trainer for the two Japanese syllabaries, built for someone
who has never seen a Japanese character before. Open `index.html` and start.
No build step, no dependencies, no account.

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

**Words** — kana gets you reading; this gets you recognizing actual vocabulary,
including the part that trips people up hardest: verbs conjugate. 見る (miru),
見てる (miteru), and 見てね (mitene) aren't three unrelated words — they're the
dictionary form, a casual "is watching," and a casual "watch it, okay?" of the
*same* verb. **Browse** lists 15 common verbs across all three groups
(ichidan, godan, and the two genuinely irregular verbs, する and 来る) with all
seven forms each — dictionary, polite, te-form, the two casual te-form
contractions, negative, and past — plus 18 everyday nouns and adjectives.
Every kanji is annotated with furigana, always, via real `<ruby>` markup, not
a rendered image or an inline romaji crutch. **Practice** is a flashcard
session over whichever verbs you pick, self-graded exactly like the kana
flashcard mode, and backed by the same spaced-repetition scheduler — 123 word
cards, tracked independently from your kana progress.

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
open index.html          # that's genuinely it
npm start                # or serve it at http://localhost:8080
npm test                 # 26 unit tests over the data and the scheduler
```

Audio uses the browser's built-in speech synthesis. If your system has no
Japanese voice installed, the app stays silent and everything else works.

## Files

```
index.html               markup for all five views
css/styles.css           one stylesheet, light and dark, mobile down to 320px
js/kana-data.js          the 104 kana, lessons, mnemonics, vocabulary
js/word-data.js          15 verbs (7 forms each) + 18 nouns/adjectives, furigana included
js/srs.js                the scheduler — pure functions, no DOM
js/app.js                views, quiz logic, persistence
test/kana.test.js        unit tests for the kana data and scheduler
test/word-data.test.js   unit tests for the word data and conjugation rules
```

Progress is stored in `localStorage` under `kana-trainer/v1`. It never leaves
your browser, which also means clearing site data resets you to zero.

がんばって！
