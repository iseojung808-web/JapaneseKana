/**
 * Kana Trainer — UI and session logic.
 *
 * No framework and no build step: open index.html and it runs. State lives in
 * localStorage so a learner's boxes survive closing the tab, which is the
 * whole premise of spaced repetition.
 */
(function () {
  'use strict';

  const STORE_KEY = 'kana-trainer/v1';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------------------------------------------------------------- state

  const defaults = () => ({
    cards: {},                   // cardId -> SRS card
    wordCards: {},                // word card id -> SRS card (same engine, separate bucket)
    settings: {
      script: 'hiragana',
      mode: 'recognize',
      length: 20,
      lessons: ['vowel'],        // start where a beginner should start
      heat: true,
      wordGroups: ['miru'],      // start with one verb, same "don't cram" philosophy
      wordLength: 20,
    },
    stats: {
      answers: 0, correct: 0, sessions: 0, bestStreak: 0, days: [],
      wordAnswers: 0, wordCorrect: 0,
    },
  });

  let state = load();

  /**
   * Layer saved data onto a fresh default state, field by field, so a save
   * from an older (or newer) version of the app doesn't break just because
   * it's missing something the current code expects. Shared by loading from
   * localStorage and by importing a backup file — the two are the same
   * operation with a different source.
   */
  function mergeState(saved) {
    const base = defaults();
    return {
      cards: (saved && saved.cards) || base.cards,
      wordCards: (saved && saved.wordCards) || base.wordCards,
      settings: Object.assign(base.settings, saved && saved.settings),
      stats: Object.assign(base.stats, saved && saved.stats),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaults();
      return mergeState(JSON.parse(raw));
    } catch (err) {
      console.warn('Could not read saved progress, starting fresh.', err);
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      // Private browsing, quota, whatever — the app must keep working.
      console.warn('Could not save progress.', err);
    }
  }

  function cardFor(entry, script) {
    const id = cardId(entry, script);
    return state.cards[id] || newCard(id);
  }

  // ---------------------------------------------------------------- pools

  function entriesForLesson(lesson) {
    return KANA.filter((e) => e.set === lesson.set && lesson.rows.includes(e.row));
  }

  function scriptsFor(setting) {
    return setting === 'both' ? ['hiragana', 'katakana'] : [setting];
  }

  /** Every (entry, script) pair covered by the selected lessons. */
  function selectedPool() {
    const lessons = LESSONS.filter((l) => state.settings.lessons.includes(l.id));
    const scripts = scriptsFor(state.settings.script);
    const pool = [];
    lessons.forEach((lesson) => {
      entriesForLesson(lesson).forEach((entry) => {
        scripts.forEach((script) => pool.push({ entry, script, lesson }));
      });
    });
    return pool;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------- routing

  function show(view) {
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + view));
    $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'home') renderHome();
    if (view === 'chart') renderChart();
    if (view === 'progress') renderProgress();
    if (view === 'words') {
      renderWordBrowse();
      renderWordSetup();
      renderWordSummary();
      // Land on the reference list unless a practice session is mid-flight.
      if (!wordSession) showWordsSubview('browse');
    }
  }

  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) show(tab.dataset.view);
  });

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) show(go.dataset.goto);
  });

  // ---------------------------------------------------------------- audio

  let jaVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    jaVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja')) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  /** Speak a kana. Silently does nothing if the device has no Japanese voice. */
  function speak(text) {
    if (!('speechSynthesis' in window) || !jaVoice) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = jaVoice;
    utter.lang = 'ja-JP';
    utter.rate = 0.8;
    speechSynthesis.speak(utter);
  }

  // ---------------------------------------------------------------- home

  function lessonProgress(lesson) {
    const scripts = scriptsFor(state.settings.script);
    const entries = entriesForLesson(lesson);
    let total = 0;
    let sum = 0;
    entries.forEach((entry) => scripts.forEach((script) => {
      total += 1;
      sum += mastery(cardFor(entry, script));
    }));
    return total ? sum / total : 0;
  }

  function renderHome() {
    const cards = Object.values(state.cards);
    const learned = cards.filter((c) => mastery(c) >= 0.5).length;
    const due = dueCards(cards.filter((c) => c.seen > 0)).length;
    const acc = state.stats.answers ? Math.round((state.stats.correct / state.stats.answers) * 100) : 0;

    $('#hero-stats').innerHTML = [
      ['Characters solid', learned],
      ['Due for review', due],
      ['Overall accuracy', acc + '%'],
      ['Day streak', dayStreak()],
    ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');

    $('#lesson-grid').innerHTML = LESSONS.map((lesson) => {
      const pct = Math.round(lessonProgress(lesson) * 100);
      return `<button class="lesson ${pct >= 85 ? 'done' : ''}" data-lesson="${lesson.id}">
        <strong>${lesson.name}</strong>
        <div class="kana-preview">${lesson.sub}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <span class="pct">${pct}% learned</span>
      </button>`;
    }).join('');
  }

  $('#lesson-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.lesson');
    if (!btn) return;
    // Jump straight into a session for just that lesson — one click to study.
    state.settings.lessons = [btn.dataset.lesson];
    save();
    show('study');
    renderSetup();
    startSession();
  });

  $('#btn-continue').addEventListener('click', () => {
    const seen = Object.values(state.cards).filter((c) => c.seen > 0);
    if (!seen.length) {
      // Nothing studied yet: the vowels are the only sensible starting point.
      state.settings.lessons = ['vowel'];
    } else {
      // Review everything the learner has ever touched.
      const touched = new Set(seen.map((c) => c.id.split(':')[1]));
      state.settings.lessons = LESSONS
        .filter((l) => entriesForLesson(l).some((e) => touched.has(e.r)))
        .map((l) => l.id);
    }
    save();
    show('study');
    renderSetup();
    startSession();
  });

  /** Consecutive days studied. Today being unstudied doesn't break it yet. */
  function dayStreak() {
    const days = new Set(state.stats.days || []);
    if (!days.size) return 0;
    const key = (d) => d.toISOString().slice(0, 10);
    const cursor = new Date();
    if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(key(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  // ---------------------------------------------------------------- chart

  let chartScript = 'hiragana';

  function heatClass(entry) {
    if (!state.settings.heat) return '';
    const m = mastery(cardFor(entry, chartScript));
    if (m === 0) return '';
    if (m < 0.4) return 'm1';
    if (m < 0.75) return 'm2';
    return 'm3';
  }

  function cellHTML(entry) {
    if (!entry) return '<div class="cell blank"></div>';
    return `<button class="cell ${heatClass(entry)}" data-r="${entry.r}" data-h="${entry.h}">
      <span class="k">${glyph(entry, chartScript)}</span>
      <span class="r">${entry.r}</span>
    </button>`;
  }

  function findEntry(romaji, set) {
    return KANA.find((e) => e.r === romaji && (!set || e.set === set));
  }

  function renderChart() {
    const gojuon = CHART_ROWS.gojuon
      .map((row) => row.map((r) => cellHTML(r ? findEntry(r, 'gojuon') : null)).join(''))
      .join('');

    const dakuten = ['g', 'z', 'd', 'b', 'p']
      .map((row) => KANA.filter((e) => e.set === 'dakuten' && e.row === row).map(cellHTML).join(''))
      .join('');

    const yoonRows = ['k', 's', 't', 'n', 'h', 'm', 'r', 'g', 'z', 'b', 'p'];
    const yoon = yoonRows
      .map((row) => KANA.filter((e) => e.set === 'yoon' && e.row === row).map(cellHTML).join(''))
      .join('');

    $('#chart-body').innerHTML = `
      <div class="chart-group">
        <h3>Gojūon — the 46 basics</h3>
        <p>Read top to bottom, right to left in traditional texts; we lay it out left to right. Every square is one syllable.</p>
        <div class="grid">${gojuon}</div>
      </div>
      <div class="chart-group">
        <h3>Dakuten &amp; handakuten — voiced sounds</h3>
        <p>Two ticks (&#12441;) or a circle (&#12442;) in the corner change k&#8594;g, s&#8594;z, t&#8594;d, h&#8594;b or p. No new shapes to learn.</p>
        <div class="grid">${dakuten}</div>
      </div>
      <div class="chart-group">
        <h3>Yōon — combinations</h3>
        <p>A small ゃ, ゅ or ょ glued to an -i kana squashes two sounds into one beat. きや is "ki-ya"; きゃ is "kya".</p>
        <div class="grid yoon">${yoon}</div>
      </div>`;
  }

  $('#chart-body').addEventListener('click', (e) => {
    const cell = e.target.closest('.cell:not(.blank)');
    if (cell) openDetail(KANA.find((k) => k.h === cell.dataset.h));
  });

  $('#chart-script').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    chartScript = btn.dataset.script;
    $$('#chart-script button').forEach((b) => b.classList.toggle('is-active', b === btn));
    renderChart();
  });

  $('#chart-heat').addEventListener('change', (e) => {
    state.settings.heat = e.target.checked;
    save();
    renderChart();
  });

  // ---------------------------------------------------------------- detail

  function openDetail(entry) {
    if (!entry) return;
    const h = cardFor(entry, 'hiragana');
    const k = cardFor(entry, 'katakana');
    const note = MNEMONICS[entry.r];
    const alts = entry.alt.length ? `Also written: ${entry.alt.join(', ')}.` : '';
    const seen = h.seen + k.seen;
    const hit = seen ? Math.round(((h.correct + k.correct) / seen) * 100) : null;

    $('#detail-body').innerHTML = `
      <div class="detail-romaji">${entry.r}</div>
      <div class="detail-pair">
        <div><span class="lbl">Hiragana</span><span class="big">${entry.h}</span></div>
        <div><span class="lbl">Katakana</span><span class="big">${entry.k}</span></div>
      </div>
      ${note ? `<p class="detail-note">${note}</p>` : ''}
      ${alts ? `<p class="detail-note">${alts}</p>` : ''}
      <p class="detail-note">${seen ? `Answered ${seen} time${seen === 1 ? '' : 's'}, ${hit}% right.` : 'Not studied yet.'}</p>
      <button class="btn" id="detail-speak">🔊 Hear it</button>`;
    $('#detail').hidden = false;
    $('#detail-speak').onclick = () => speak(entry.h);
    speak(entry.h);
  }

  $('#detail-close').addEventListener('click', () => { $('#detail').hidden = true; });
  $('#detail').addEventListener('click', (e) => {
    if (e.target.id === 'detail') $('#detail').hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#detail').hidden = true;
  });

  // ---------------------------------------------------------------- setup

  function renderSetup() {
    $('#opt-lessons').innerHTML = LESSONS.map((l) => {
      const on = state.settings.lessons.includes(l.id);
      return `<button class="chip ${on ? 'on' : ''}" data-lesson="${l.id}">${l.name}</button>`;
    }).join('');
    syncSeg('#opt-script', state.settings.script);
    syncSeg('#opt-mode', state.settings.mode);
    syncSeg('#opt-length', String(state.settings.length));
  }

  function syncSeg(sel, value) {
    $$(sel + ' button').forEach((b) => b.classList.toggle('is-active', b.dataset.v === value));
  }

  function bindSeg(sel, key, cast) {
    $(sel).addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      state.settings[key] = cast ? cast(btn.dataset.v) : btn.dataset.v;
      save();
      syncSeg(sel, btn.dataset.v);
    });
  }

  bindSeg('#opt-script', 'script');
  bindSeg('#opt-mode', 'mode');
  bindSeg('#opt-length', 'length', Number);

  $('#opt-lessons').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const id = chip.dataset.lesson;
    const picked = new Set(state.settings.lessons);
    picked.has(id) ? picked.delete(id) : picked.add(id);
    state.settings.lessons = Array.from(picked);
    save();
    renderSetup();
  });

  $('.chip-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-select]');
    if (!btn) return;
    if (btn.dataset.select === 'all') state.settings.lessons = LESSONS.map((l) => l.id);
    if (btn.dataset.select === 'none') state.settings.lessons = [];
    if (btn.dataset.select === 'weak') {
      // Lessons you've started but haven't nailed. Untouched lessons aren't
      // "weak", they're just unmet — no point drilling what you've never seen.
      state.settings.lessons = LESSONS.filter((l) => {
        const p = lessonProgress(l);
        return p > 0 && p < 0.8;
      }).map((l) => l.id);
    }
    save();
    renderSetup();
  });

  // ---------------------------------------------------------------- session

  let session = null;

  function startSession() {
    const pool = selectedPool();
    if (!pool.length) {
      $('#setup-warn').hidden = false;
      return;
    }
    $('#setup-warn').hidden = true;

    const byId = new Map(pool.map((p) => [cardId(p.entry, p.script), p]));
    const srsCards = pool.map((p) => cardFor(p.entry, p.script));
    const size = state.settings.length || pool.length;
    let queue = buildQueue(srsCards, size).map((c) => byId.get(c.id));
    // buildQueue is due-aware; if everything is scheduled far out, the learner
    // still asked to study, so fall back to a plain shuffle of the pool.
    if (!queue.length) queue = shuffle(pool).slice(0, size);
    else queue = shuffle(queue);

    session = {
      queue,
      index: 0,
      right: 0,
      wrong: 0,
      streak: 0,
      best: 0,
      missed: [],
      answered: false,
      startedAt: Date.now(),
    };

    $('#study-setup').hidden = true;
    $('#study-done').hidden = true;
    $('#study-quiz').hidden = false;
    nextQuestion();
  }

  $('#btn-start').addEventListener('click', startSession);
  $('#btn-again').addEventListener('click', () => {
    $('#study-done').hidden = true;
    $('#study-setup').hidden = false;
    renderSetup();
  });
  $('#btn-quit').addEventListener('click', finishSession);

  function currentMode() {
    if (state.settings.mode !== 'mixed') return state.settings.mode;
    return ['recognize', 'recall', 'type'][Math.floor(Math.random() * 3)];
  }

  function nextQuestion() {
    if (session.index >= session.queue.length) return finishSession();

    const item = session.queue[session.index];
    const mode = currentMode();
    session.current = { item, mode };
    session.answered = false;

    $('#feedback').hidden = true;
    $('#quiz-bar').style.width = ((session.index / session.queue.length) * 100) + '%';
    $('#quiz-count').textContent = `${session.index + 1} / ${session.queue.length}`;
    $('#quiz-streak').textContent = session.streak >= 3 ? `🔥 ${session.streak} in a row` : '';

    // Flashcards are self-graded and have their own layout entirely, so they
    // get their own branch rather than threading through the choice/type UI.
    if (mode === 'flashcard') {
      $('#quiz-card').hidden = true;
      $('#choices').hidden = true;
      $('#typebox').hidden = true;
      $('#flashcard').hidden = false;
      setupFlashcard(item);
      return;
    }
    $('#quiz-card').hidden = false;
    $('#flashcard').hidden = true;

    const char = glyph(item.entry, item.script);
    const promptEl = $('#prompt');

    if (mode === 'recall') {
      $('#prompt-label').textContent =
        `Which ${item.script === 'katakana' ? 'katakana' : 'hiragana'} is this?`;
      promptEl.textContent = item.entry.r;
      promptEl.classList.add('romaji');
      $('#btn-speak').hidden = false;
    } else {
      $('#prompt-label').textContent = mode === 'type' ? 'Type the reading' : 'What sound is this?';
      promptEl.textContent = char;
      promptEl.classList.remove('romaji');
      $('#btn-speak').hidden = false;
    }

    if (mode === 'type') {
      $('#choices').hidden = false;
      $('#choices').innerHTML = '';
      $('#typebox').hidden = false;
      $('#type-input').value = '';
      $('#type-input').disabled = false;
      $('#type-input').focus();
    } else {
      $('#typebox').hidden = true;
      $('#choices').hidden = false;
      renderChoices(item, mode);
    }
  }

  // ---- flashcard mode: tap to flip, then say whether you knew it ----

  function setupFlashcard(item) {
    const card = $('#flashcard-card');

    // Reset to the front face instantly, not via the normal flip animation.
    // The animated version rotates while the *new* card's answer is already
    // sitting on the back face (we're about to write it below), so for the
    // length of the spin you're staring at the upcoming answer — the bug
    // this whole no-transition dance exists to avoid.
    card.classList.add('no-transition');
    card.classList.remove('flipped');
    void card.offsetWidth; // flush the instant reset before re-enabling the transition
    card.classList.remove('no-transition');

    $('#flash-grade').hidden = true;
    $('#flash-hint').hidden = false;
    $('#btn-flash-no').disabled = false;
    $('#btn-flash-yes').disabled = false;

    $('#flash-front').textContent = glyph(item.entry, item.script);
    $('#flash-hira').textContent = item.entry.h;
    $('#flash-kata').textContent = item.entry.k;
    $('#flash-romaji').textContent = item.entry.r;
    const note = MNEMONICS[item.entry.r];
    $('#flash-mnemonic').textContent = note || '';
    $('#flash-mnemonic').hidden = !note;

    // Focus the card itself so Space/Enter flips it without reaching for a mouse.
    card.focus({ preventScroll: true });
  }

  function toggleFlashcard() {
    const flipped = $('#flashcard-card').classList.toggle('flipped');
    $('#flash-grade').hidden = !flipped;
    $('#flash-hint').hidden = flipped;
    if (flipped) speak(session.current.item.entry.h);
  }

  $('#flashcard-card').addEventListener('click', () => {
    if (!session || !session.current || session.current.mode !== 'flashcard' || session.answered) return;
    toggleFlashcard();
  });

  // The speak icons sit inside the flip card; stop the click from bubbling up
  // and flipping the card when someone just wants to hear it again.
  ['#flash-speak-front', '#flash-speak-back'].forEach((sel) => {
    $(sel).addEventListener('click', (e) => {
      e.stopPropagation();
      if (session && session.current) speak(session.current.item.entry.h);
    });
  });

  $('#btn-flash-no').addEventListener('click', () => gradeFlashcard(false));
  $('#btn-flash-yes').addEventListener('click', () => gradeFlashcard(true));

  function gradeFlashcard(correct) {
    if (!session || session.answered) return;
    session.answered = true;
    recordAnswer(session.current.item, correct);
    $('#btn-flash-no').disabled = true;
    $('#btn-flash-yes').disabled = true;
    setTimeout(nextQuestion, correct ? 300 : 650);
  }

  /**
   * Distractors are drawn from the same consonant row first — confusing し
   * with す is a real mistake worth training; confusing し with ぽ is not.
   */
  function distractors(item, count) {
    const sameRow = KANA.filter((e) => e.row === item.entry.row && e.r !== item.entry.r && e.set === item.entry.set);
    const sameSet = KANA.filter((e) => e.set === item.entry.set && e.r !== item.entry.r);
    const rest = KANA.filter((e) => e.r !== item.entry.r);
    const picks = [];
    const used = new Set([item.entry.r]);
    [shuffle(sameRow), shuffle(sameSet), shuffle(rest)].forEach((bucket) => {
      bucket.forEach((e) => {
        if (picks.length < count && !used.has(e.r)) {
          used.add(e.r);
          picks.push(e);
        }
      });
    });
    return picks;
  }

  function renderChoices(item, mode) {
    const options = shuffle([item.entry, ...distractors(item, 3)]);
    $('#choices').innerHTML = options.map((e, i) => {
      const label = mode === 'recall' ? glyph(e, item.script) : e.r;
      // The badge doubles as a hint that number keys work.
      return `<button class="choice ${mode === 'recall' ? 'kana' : ''}" data-r="${e.r}">
        <kbd>${i + 1}</kbd>${label}
      </button>`;
    }).join('');
  }

  $('#choices').addEventListener('click', (e) => {
    const btn = e.target.closest('.choice');
    if (!btn || session.answered) return;
    answer(btn.dataset.r === session.current.item.entry.r, btn);
  });

  $('#typebox').addEventListener('submit', (e) => {
    e.preventDefault();
    if (session.answered) return nextQuestion();
    const typed = $('#type-input').value.trim().toLowerCase();
    if (!typed) return;
    const accepted = romajiFor(session.current.item.entry);
    answer(accepted.includes(typed));
  });

  /**
   * The bookkeeping shared by every question type: grade the SRS card, tally
   * session and lifetime stats, and requeue a miss for one more pass before
   * the session ends. UI (choice buttons, feedback text, the flip card) is
   * each mode's own concern and lives in its own handler.
   */
  function recordAnswer(item, correct) {
    const id = cardId(item.entry, item.script);
    state.cards[id] = grade(cardFor(item.entry, item.script), correct);

    state.stats.answers += 1;
    if (correct) {
      state.stats.correct += 1;
      session.right += 1;
      session.streak += 1;
      session.best = Math.max(session.best, session.streak);
      state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, session.streak);
    } else {
      session.wrong += 1;
      session.streak = 0;
      session.missed.push(item);
      // A missed card gets one more chance before the session ends.
      session.queue.push(item);
    }
    save();
    session.index += 1;
  }

  function answer(correct, btn) {
    session.answered = true;
    const { item } = session.current;
    recordAnswer(item, correct);

    if (btn) {
      $$('.choice').forEach((b) => {
        b.disabled = true;
        if (b.dataset.r === item.entry.r) b.classList.add('right');
      });
      if (!correct) btn.classList.add('wrong');
    }
    $('#type-input').disabled = true;

    const fb = $('#feedback');
    const char = glyph(item.entry, item.script);
    fb.className = 'feedback ' + (correct ? 'ok' : 'no');
    fb.innerHTML = correct
      ? `<strong>Yes — ${char} is "${item.entry.r}".</strong>`
      : `<strong>${char} is "${item.entry.r}".</strong>` +
        (MNEMONICS[item.entry.r] ? `<span class="mnemonic">${MNEMONICS[item.entry.r]}</span>` : '') +
        `<span class="mnemonic">We'll ask again before the session ends.</span>`;
    fb.hidden = false;

    speak(item.entry.h);

    // Right answers move on briskly; wrong ones linger so the correction lands.
    setTimeout(nextQuestion, correct ? 650 : 2100);
  }

  $('#btn-speak').addEventListener('click', () => {
    if (session && session.current) speak(session.current.item.entry.h);
  });

  // Keyboard shortcuts during a session: 1-4 pick a multiple-choice answer;
  // in flashcard mode, space/enter flips the focused card and the arrow keys
  // grade it once flipped. Faster than aiming a mouse for every card.
  document.addEventListener('keydown', (e) => {
    if ($('#study-quiz').hidden || !session || !session.current || session.answered) return;

    if (session.current.mode === 'flashcard') {
      const flipped = $('#flashcard-card').classList.contains('flipped');
      const cardFocused = document.activeElement === $('#flashcard-card');
      if (cardFocused && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        toggleFlashcard();
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) {
        gradeFlashcard(false);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) {
        gradeFlashcard(true);
      }
      return;
    }

    const n = parseInt(e.key, 10);
    const choices = $$('.choice');
    if (n >= 1 && n <= choices.length) choices[n - 1].click();
  });

  function finishSession() {
    if (!session) return;
    const total = session.right + session.wrong;
    const pct = total ? Math.round((session.right / total) * 100) : 0;
    const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));

    state.stats.sessions += 1;
    const today = new Date().toISOString().slice(0, 10);
    state.stats.days = state.stats.days || [];
    if (!state.stats.days.includes(today)) state.stats.days.push(today);
    save();

    $('#scorecard').innerHTML = [
      ['Correct', session.right],
      ['Missed', session.wrong],
      ['Accuracy', pct + '%'],
      ['Best streak', session.best],
      ['Minutes', minutes],
    ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');

    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const missedList = Array.from(new Set(session.missed.map((m) => m.entry.r)));
    $('#reward').innerHTML = `
      <p class="section-note" style="margin:0 0 6px">Can you read this yet?</p>
      <div class="word">${word.h}</div>
      <div class="gloss">${word.r} — ${word.m}</div>
      ${missedList.length ? `<p class="section-note" style="margin:14px 0 0">Worth another look: <strong>${missedList.join(', ')}</strong></p>` : ''}`;

    session = null;
    $('#study-quiz').hidden = true;
    $('#study-done').hidden = false;
  }

  // ---------------------------------------------------------------- progress

  function renderProgress() {
    const cards = Object.values(state.cards);
    const studied = cards.filter((c) => c.seen > 0);
    const solid = cards.filter((c) => mastery(c) >= 0.75).length;
    const acc = state.stats.answers ? Math.round((state.stats.correct / state.stats.answers) * 100) : 0;

    $('#stat-grid').innerHTML = [
      ['Cards started', studied.length],
      ['Cards solid', solid],
      ['Questions answered', state.stats.answers],
      ['Overall accuracy', acc + '%'],
      ['Sessions', state.stats.sessions],
      ['Best streak', state.stats.bestStreak || 0],
      ['Day streak', dayStreak()],
      ['Due now', dueCards(studied).length],
    ].map(([label, value]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join('');

    // Worst offenders: seen a few times, still missed often.
    const trouble = studied
      .filter((c) => c.seen >= 2 && c.correct / c.seen < 0.8)
      .sort((a, b) => a.correct / a.seen - b.correct / b.seen)
      .slice(0, 12);

    $('#trouble').innerHTML = trouble.length
      ? trouble.map((c) => {
          const [script, romaji, char] = c.id.split(':');
          return `<div class="trouble-item">
            <span class="k">${char}</span>
            <span class="r">${romaji} · ${Math.round((c.correct / c.seen) * 100)}% · ${script.slice(0, 4)}</span>
          </div>`;
        }).join('')
      : '<p class="empty">Nothing problematic yet. Either you are doing great or you have not started.</p>';

    // Seven-day forecast of how many cards come due.
    const buckets = new Array(7).fill(0);
    studied.forEach((c) => {
      const d = daysUntilDue(c);
      if (d < 7) buckets[d] += 1;
    });
    const max = Math.max(1, ...buckets);
    const labels = ['today', '+1', '+2', '+3', '+4', '+5', '+6'];
    $('#forecast').innerHTML = buckets
      .map((n, i) => `<div class="day" title="${n} card${n === 1 ? '' : 's'} due">
        <em>${n || ''}</em>
        <i style="height:${(n / max) * 100}%"></i>
        <span>${labels[i]}</span>
      </div>`).join('');
  }

  /** Re-render every view's data after the underlying state is replaced wholesale. */
  function refreshAllViews() {
    renderHome();
    renderChart();
    renderProgress();
    renderSetup();
    renderWordBrowse();
    renderWordSetup();
    renderWordSummary();
  }

  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Erase every card, streak and statistic? This cannot be undone.')) return;
    state = defaults();
    save();
    refreshAllViews();
  });

  // ---------------------------------------------------------------- words

  function wordCardFor(card) {
    return state.wordCards[card.id] || newCard(card.id);
  }

  /** Every group a learner can pick in Practice: one per verb, plus "other" for the rest. */
  function wordGroupIds() {
    return [...VERBS.map((v) => v.id), 'other'];
  }

  function wordCardsForGroup(groupId) {
    return groupId === 'other'
      ? WORD_CARDS.filter((c) => c.type !== 'verb')
      : WORD_CARDS.filter((c) => c.type === 'verb' && c.baseWord === groupId);
  }

  function selectedWordPool() {
    return state.settings.wordGroups.flatMap(wordCardsForGroup);
  }

  function wordGroupMastery(groupId) {
    const cards = wordCardsForGroup(groupId).map(wordCardFor);
    if (!cards.length) return 0;
    return cards.reduce((sum, c) => sum + mastery(c), 0) / cards.length;
  }

  function renderWordSummary() {
    const cards = Object.values(state.wordCards);
    const started = cards.filter((c) => c.seen > 0).length;
    const acc = state.stats.wordAnswers
      ? Math.round((state.stats.wordCorrect / state.stats.wordAnswers) * 100)
      : 0;
    $('#word-summary').textContent = started
      ? `${started} of ${WORD_CARDS.length} word cards started · ${acc}% accuracy`
      : `${WORD_CARDS.length} word cards available — verbs with all their forms, plus common nouns and adjectives.`;
  }

  // ---- browsing: the reference list, always furigana'd ----

  function renderWordBrowse() {
    $('#verb-groups').innerHTML = VERBS.map((v) => {
      const head = v.forms.dictionary;
      const rows = VERB_FORM_ORDER.filter((k) => k !== 'dictionary').map((key) => {
        const f = v.forms[key];
        return `<button type="button" class="word-form-row" data-speak="${f.kana}">
          <span class="jp">${furiganaHTML(f.segs)}</span>
          <span class="romaji">${f.romaji}</span>
          <span class="label">${f.label}</span>
          <span class="meaning">${f.meaning}</span>
        </button>`;
      }).join('');
      return `<div class="word-group">
        <button type="button" class="word-group-head" data-speak="${head.kana}">
          <span class="jp">${furiganaHTML(head.segs)}</span>
          <span class="romaji">${head.romaji}</span>
          <span class="meaning">${v.meaning}</span>
          <span class="badge">${v.group}</span>
        </button>
        ${v.note ? `<p class="word-group-note">${v.note}</p>` : ''}
        <div class="word-forms">${rows}</div>
      </div>`;
    }).join('');

    $('#other-words').innerHTML = OTHER_WORDS.map((w) => `
      <button type="button" class="word-flat-item" data-speak="${w.kana}">
        <span class="jp">${furiganaHTML(w.segs)}</span>
        <span class="romaji">${w.romaji}</span>
        <span class="meaning">${w.meaning}</span>
        <span class="badge">${w.type}</span>
      </button>`).join('');
  }

  [$('#verb-groups'), $('#other-words')].forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.target.closest('[data-speak]');
      if (target) speak(target.dataset.speak);
    });
  });

  function showWordsSubview(sub) {
    $('#words-browse').hidden = sub !== 'browse';
    $('#words-practice').hidden = sub !== 'practice';
    $$('#words-tab button').forEach((b) => b.classList.toggle('is-active', b.dataset.wordsView === sub));
  }

  $('#words-tab').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) showWordsSubview(btn.dataset.wordsView);
  });

  // ---- practice setup ----

  function renderWordSetup() {
    const verbChips = VERBS.map((v) => {
      const on = state.settings.wordGroups.includes(v.id);
      return `<button class="chip ${on ? 'on' : ''}" data-word-group="${v.id}">${v.forms.dictionary.romaji}</button>`;
    }).join('');
    const otherOn = state.settings.wordGroups.includes('other');
    $('#word-opt-groups').innerHTML = verbChips +
      `<button class="chip ${otherOn ? 'on' : ''}" data-word-group="other">nouns &amp; adjectives</button>`;
    $$('#word-opt-length button').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.v === String(state.settings.wordLength)));
  }

  $('#word-opt-groups').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const id = chip.dataset.wordGroup;
    const picked = new Set(state.settings.wordGroups);
    picked.has(id) ? picked.delete(id) : picked.add(id);
    state.settings.wordGroups = Array.from(picked);
    save();
    renderWordSetup();
  });

  $('#word-opt-length').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.settings.wordLength = Number(btn.dataset.v);
    save();
    renderWordSetup();
  });

  $('#word-chip-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-word-select]');
    if (!btn) return;
    const all = wordGroupIds();
    if (btn.dataset.wordSelect === 'all') state.settings.wordGroups = all;
    if (btn.dataset.wordSelect === 'none') state.settings.wordGroups = [];
    if (btn.dataset.wordSelect === 'weak') {
      state.settings.wordGroups = all.filter((id) => {
        const m = wordGroupMastery(id);
        return m > 0 && m < 0.8;
      });
    }
    save();
    renderWordSetup();
  });

  // ---- practice: flashcard only, same flip mechanic and SRS engine as kana ----

  let wordSession = null;

  function startWordSession() {
    const pool = selectedWordPool();
    if (!pool.length) {
      $('#word-setup-warn').hidden = false;
      return;
    }
    $('#word-setup-warn').hidden = true;

    const byId = new Map(pool.map((c) => [c.id, c]));
    const srsCards = pool.map(wordCardFor);
    const size = state.settings.wordLength || pool.length;
    let queue = buildQueue(srsCards, size).map((c) => byId.get(c.id));
    if (!queue.length) queue = shuffle(pool).slice(0, size);
    else queue = shuffle(queue);

    wordSession = {
      queue, index: 0, right: 0, wrong: 0, streak: 0, best: 0, missed: [], answered: false, startedAt: Date.now(),
    };

    $('#word-setup').hidden = true;
    $('#word-done').hidden = true;
    $('#word-quiz').hidden = false;
    nextWordCard();
  }

  $('#word-btn-start').addEventListener('click', startWordSession);

  function nextWordCard() {
    if (wordSession.index >= wordSession.queue.length) return finishWordSession();

    const card = wordSession.queue[wordSession.index];
    wordSession.current = card;
    wordSession.answered = false;

    $('#word-quiz-bar').style.width = ((wordSession.index / wordSession.queue.length) * 100) + '%';
    $('#word-quiz-count').textContent = `${wordSession.index + 1} / ${wordSession.queue.length}`;
    $('#word-quiz-streak').textContent = wordSession.streak >= 3 ? `🔥 ${wordSession.streak} in a row` : '';

    setupWordFlashcard(card);
  }

  function setupWordFlashcard(card) {
    const el = $('#word-flashcard-card');
    // Same instant-reset trick as the kana flashcard: no animated un-flip,
    // or you glimpse the next card's answer spinning past.
    el.classList.add('no-transition');
    el.classList.remove('flipped');
    void el.offsetWidth;
    el.classList.remove('no-transition');

    $('#word-flash-grade').hidden = true;
    $('#word-flash-hint').hidden = false;
    $('#word-btn-flash-no').disabled = false;
    $('#word-btn-flash-yes').disabled = false;

    $('#word-flash-label').textContent =
      card.type === 'verb' ? card.label : card.type === 'noun' ? 'noun' : 'adjective';
    $('#word-flash-front').innerHTML = furiganaHTML(card.segs);

    if (card.type === 'verb') {
      const base = VERBS.find((v) => v.id === card.baseWord);
      $('#word-flash-base').textContent = `from ${base.forms.dictionary.romaji} — "${card.baseMeaning}"`;
      $('#word-flash-base').hidden = false;
    } else {
      $('#word-flash-base').hidden = true;
    }
    $('#word-flash-romaji').textContent = card.romaji;
    $('#word-flash-meaning').textContent = card.meaning;
    $('#word-flash-grammar-note').textContent = card.note || '';
    $('#word-flash-grammar-note').hidden = !card.note;

    el.focus({ preventScroll: true });
  }

  function toggleWordFlashcard() {
    const flipped = $('#word-flashcard-card').classList.toggle('flipped');
    $('#word-flash-grade').hidden = !flipped;
    $('#word-flash-hint').hidden = flipped;
    if (flipped) speak(wordSession.current.kana);
  }

  $('#word-flashcard-card').addEventListener('click', () => {
    if (!wordSession || !wordSession.current || wordSession.answered) return;
    toggleWordFlashcard();
  });

  ['#word-flash-speak-front', '#word-flash-speak-back'].forEach((sel) => {
    $(sel).addEventListener('click', (e) => {
      e.stopPropagation();
      if (wordSession && wordSession.current) speak(wordSession.current.kana);
    });
  });

  $('#word-btn-flash-no').addEventListener('click', () => gradeWordFlashcard(false));
  $('#word-btn-flash-yes').addEventListener('click', () => gradeWordFlashcard(true));

  function gradeWordFlashcard(correct) {
    if (!wordSession || wordSession.answered) return;
    wordSession.answered = true;
    const card = wordSession.current;
    state.wordCards[card.id] = grade(wordCardFor(card), correct);

    state.stats.wordAnswers += 1;
    if (correct) {
      state.stats.wordCorrect += 1;
      wordSession.right += 1;
      wordSession.streak += 1;
      wordSession.best = Math.max(wordSession.best, wordSession.streak);
    } else {
      wordSession.wrong += 1;
      wordSession.streak = 0;
      wordSession.missed.push(card);
      wordSession.queue.push(card);
    }
    save();
    wordSession.index += 1;

    $('#word-btn-flash-no').disabled = true;
    $('#word-btn-flash-yes').disabled = true;
    setTimeout(nextWordCard, correct ? 300 : 650);
  }

  $('#word-btn-quit').addEventListener('click', finishWordSession);

  function finishWordSession() {
    if (!wordSession) return;
    const total = wordSession.right + wordSession.wrong;
    const pct = total ? Math.round((wordSession.right / total) * 100) : 0;
    const minutes = Math.max(1, Math.round((Date.now() - wordSession.startedAt) / 60000));

    $('#word-scorecard').innerHTML = [
      ['Correct', wordSession.right],
      ['Missed', wordSession.wrong],
      ['Accuracy', pct + '%'],
      ['Best streak', wordSession.best],
      ['Minutes', minutes],
    ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');

    wordSession = null;
    $('#word-quiz').hidden = true;
    $('#word-done').hidden = false;
    renderWordSummary();
  }

  $('#word-btn-again').addEventListener('click', () => {
    $('#word-done').hidden = true;
    $('#word-setup').hidden = false;
    renderWordSetup();
  });
  $('#word-btn-browse').addEventListener('click', () => showWordsSubview('browse'));

  // Space/Enter flips the focused card; arrow keys (or 1/2) grade it once flipped.
  document.addEventListener('keydown', (e) => {
    if ($('#word-quiz').hidden || !wordSession || !wordSession.current || wordSession.answered) return;
    const flipped = $('#word-flashcard-card').classList.contains('flipped');
    const cardFocused = document.activeElement === $('#word-flashcard-card');
    if (cardFocused && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      toggleWordFlashcard();
    } else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) {
      gradeWordFlashcard(false);
    } else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) {
      gradeWordFlashcard(true);
    }
  });

  // ---------------------------------------------------------------- backup

  // A plain-text export: a human-readable header (so it's still recognizable
  // if someone opens it in Notepad years from now) followed by the actual
  // state as JSON, which is what actually gets read back in on import.
  const EXPORT_MARKER = '--- raw data below — do not edit ---';

  function exportProgress() {
    const cards = Object.values(state.cards);
    const started = cards.filter((c) => c.seen > 0).length;
    const acc = state.stats.answers ? Math.round((state.stats.correct / state.stats.answers) * 100) : 0;
    const now = new Date();

    const text = [
      'KANA-TRAINER-PROGRESS v1',
      'This is a backup of your Kana Trainer progress.',
      'To restore it: open the app, go to Progress, click "Import progress," and pick this file.',
      '',
      `exported: ${now.toISOString()}`,
      `cards started: ${started}`,
      `overall accuracy: ${acc}%`,
      `day streak: ${dayStreak()}`,
      '',
      EXPORT_MARKER,
      JSON.stringify(state, null, 2),
      '',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kana-trainer-progress-${now.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Pull the JSON payload back out of an export file, with actual error messages. */
  function parseExportFile(text) {
    const idx = text.indexOf(EXPORT_MARKER);
    if (!text.startsWith('KANA-TRAINER-PROGRESS') || idx === -1) {
      throw new Error('That doesn\'t look like a Kana Trainer export file.');
    }
    let data;
    try {
      data = JSON.parse(text.slice(idx + EXPORT_MARKER.length));
    } catch (err) {
      throw new Error('The file\'s data is corrupted, or it was edited and broke the JSON.');
    }
    if (!data || typeof data !== 'object' || !data.cards || !data.settings || !data.stats) {
      throw new Error('The file is missing progress data it should have.');
    }
    return data;
  }

  function showImportStatus(ok, message) {
    const el = $('#import-status');
    el.className = 'import-status ' + (ok ? 'ok' : 'bad');
    el.textContent = message;
    el.hidden = false;
  }

  function importProgress(file) {
    if (session) {
      showImportStatus(false, 'Finish or end your current study session before importing.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseExportFile(String(reader.result));
        const cardCount = Object.keys(parsed.cards).length;
        if (!confirm(`Import this file and replace your current progress (${cardCount} cards)? This cannot be undone.`)) return;
        state = mergeState(parsed);
        save();
        refreshAllViews();
        showImportStatus(true, `Imported ${cardCount} cards. You're all set.`);
      } catch (err) {
        showImportStatus(false, err.message);
      }
    };
    reader.onerror = () => showImportStatus(false, 'Could not read that file.');
    reader.readAsText(file);
  }

  $('#btn-export').addEventListener('click', exportProgress);
  $('#btn-import-trigger').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importProgress(file);
    e.target.value = ''; // clear it so re-importing the same file again still fires 'change'
  });

  // ---------------------------------------------------------------- boot

  $('#chart-heat').checked = state.settings.heat;
  renderSetup();
  renderHome();
  show('home');
})();
