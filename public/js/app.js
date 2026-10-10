// JFT-Basic CBT Interactive Practice Application
// Optimized for all devices (Mobile, Tablet, Desktop)

(function () {
  'use strict';

  // App State
  let currentScreen = 'home';
  let currentSetId = null;
  let currentSectionId = null;
  let currentQuestionIdx = 0;
  let userAnswers = [];
  let isPracticeMode = true; // true: practice mode with feedback, false: exam mode
  let isAnswered = false;
  let currentPlaybackRate = 1.0;

  // Web Audio Context for gentle SFX
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'wrong') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(196, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (_) {}
  }

  // Storage
  const STORAGE_KEY = 'jft_basic_progress_v2';
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveProgress(setId, sectionId, correct, total) {
    const p = loadProgress();
    const key = `${setId}_${sectionId}`;
    p[key] = {
      correct,
      total,
      percent: Math.round((correct / total) * 100),
      date: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }

  // DOM Elements
  const appContainer = document.getElementById('app');
  const btnBack = document.getElementById('btn-back');
  const btnPdf = document.getElementById('btn-pdf');
  const pdfModal = document.getElementById('pdf-modal');
  const pdfFrame = document.getElementById('pdf-frame');
  const pdfModalTitle = document.getElementById('pdf-modal-title');
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const paletteModal = document.getElementById('palette-modal');

  // Navigation
  function navigate(screen, params = {}) {
    currentScreen = screen;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Manage in-quiz body class for bottom bar spacing
    if (screen === 'quiz') {
      document.body.classList.add('in-quiz');
    } else {
      document.body.classList.remove('in-quiz');
    }

    if (screen === 'home') {
      btnBack.style.display = 'none';
      if (btnPdf) btnPdf.style.display = 'none';
      renderHome();
    } else if (screen === 'sections') {
      btnBack.style.display = 'inline-flex';
      currentSetId = params.setId;
      if (btnPdf) {
        btnPdf.style.display = 'inline-flex';
        btnPdf.onclick = () => openPdfModal(currentSetId);
      }
      renderSections();
    } else if (screen === 'quiz') {
      btnBack.style.display = 'inline-flex';
      if (btnPdf) {
        btnPdf.style.display = 'inline-flex';
        btnPdf.onclick = () => openPdfModal(currentSetId);
      }
      currentSectionId = params.sectionId;
      currentQuestionIdx = 0;
      userAnswers = [];
      isAnswered = false;
      renderQuiz();
    } else if (screen === 'results') {
      btnBack.style.display = 'inline-flex';
      if (btnPdf) btnPdf.style.display = 'none';
      renderResults();
    }
  }

  btnBack.addEventListener('click', () => {
    if (currentScreen === 'results' || currentScreen === 'quiz') {
      if (currentScreen === 'quiz' && !confirm('セクション一覧に戻りますか？\nReturn to section menu?')) return;
      navigate('sections', { setId: currentSetId });
    } else if (currentScreen === 'sections') {
      navigate('home');
    }
  });

  // PDF Modal
  function openPdfModal(setId) {
    const set = questionSets.find(s => s.id === setId);
    if (!set) return;
    pdfModalTitle.textContent = `${set.title} (PDF)`;
    pdfFrame.src = set.pdfUrl;
    pdfModal.classList.add('active');
  }

  window.closePdfModal = function () {
    pdfModal.classList.remove('active');
    pdfFrame.src = 'about:blank';
  };

  // Lightbox Modal
  function openLightbox(src) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxModal.classList.add('active');
  }

  window.closeLightbox = function () {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    if (lightboxImg) lightboxImg.src = '';
  };

  // Palette Modal
  function openPalette() {
    if (!paletteModal) return;
    const set = questionSets.find(s => s.id === currentSetId);
    if (!set) return;
    const section = set.sections.find(s => s.id === currentSectionId);
    if (!section) return;

    const grid = document.getElementById('palette-grid');
    if (!grid) return;

    grid.innerHTML = section.questions.map((q, idx) => {
      const isAns = userAnswers[idx] !== undefined;
      const isCur = idx === currentQuestionIdx;
      return `
        <button class="palette-btn ${isCur ? 'current' : ''} ${isAns ? 'answered' : ''}" onclick="window.__app.jumpToQuestion(${idx})">
          ${idx + 1}
        </button>
      `;
    }).join('');

    paletteModal.classList.add('active');
  }

  window.closePalette = function () {
    if (paletteModal) paletteModal.classList.remove('active');
  };

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    if (currentScreen !== 'quiz') return;
    const key = e.key.toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(key)) {
      handleAnswerSelect(key);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      handleNextQuestion();
    } else if (e.key === 'ArrowLeft') {
      handlePrevQuestion();
    } else if (e.code === 'Space') {
      const audio = document.getElementById('quiz-audio');
      if (audio) {
        e.preventDefault();
        if (audio.paused) audio.play();
        else audio.pause();
      }
    }
  });

  // ==========================================
  // SCREEN 1: HOME
  // ==========================================
  function renderHome() {
    const progress = loadProgress();
    const html = `
      <div class="home-view">
        <div class="hero-card">
          <div class="hero-title-box">
            <h2>⛩️ JFT-Basic 総合練習</h2>
            <p>Japan Foundation Test for Basic Japanese — Interactive CBT Practice</p>
            <div class="hero-badges-row">
              <span class="hero-pill">🎧 音声付き聴解 (Choukai)</span>
              <span class="hero-pill">📝 文字・語彙</span>
              <span class="hero-pill">💬 会話と表現</span>
              <span class="hero-pill">⚡ CBT 即時採点</span>
            </div>
          </div>
          <div>
            <div class="mode-switch-card">
              <button class="mode-btn ${isPracticeMode ? 'active' : ''}" onclick="window.__app.setMode(true)">
                📘 練習モード (解説付き)
              </button>
              <button class="mode-btn ${!isPracticeMode ? 'active' : ''}" onclick="window.__app.setMode(false)">
                ⏱️ 本番模試モード
              </button>
            </div>
          </div>
        </div>

        <div class="sets-grid">
          ${questionSets.map(set => {
            const vocabDone = progress[`${set.id}_vocab`];
            const convDone = progress[`${set.id}_conv`];
            const listenDone = progress[`${set.id}_listening`];
            let completedCount = 0;
            if (vocabDone) completedCount++;
            if (convDone) completedCount++;
            if (listenDone) completedCount++;
            const pct = Math.round((completedCount / 3) * 100);

            const totalQ = set.sections.reduce((acc, s) => acc + s.questions.length, 0);

            return `
              <div class="set-card" onclick="window.__app.openSet(${set.id})">
                <div class="set-card-top">
                  <span class="set-badge">第 ${set.id} 回</span>
                  <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">全 ${totalQ} 問</span>
                </div>
                <h3>${set.title}</h3>
                <div class="set-stats-list">
                  <div class="set-stat-row">
                    <span>📋</span>
                    <span>3 セクション · 文字語彙・会話・聴解</span>
                  </div>
                  <div class="set-stat-row">
                    <span>🎧</span>
                    <span>聴解問題：音声・絵画完全収録</span>
                  </div>
                  <div class="set-stat-row">
                    <span>📄</span>
                    <span>公式問題シート PDF 連動</span>
                  </div>
                  ${completedCount > 0 ? `
                    <div class="set-stat-row" style="color:var(--correct);font-weight:700;">
                      <span>✅</span>
                      <span>${completedCount} / 3 セクション練習済み</span>
                    </div>
                  ` : ''}
                </div>
                <div class="set-progress-track">
                  <div class="set-progress-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    appContainer.innerHTML = html;
  }

  // ==========================================
  // SCREEN 2: SECTIONS MENU
  // ==========================================
  function renderSections() {
    const set = questionSets.find(s => s.id === currentSetId);
    if (!set) return;
    const progress = loadProgress();

    const html = `
      <div class="sections-view">
        <div class="section-hero">
          <div>
            <h2>${set.title}</h2>
            <p style="color:var(--text-sub);font-size:0.85rem;margin-top:2px;">セクションを選んで練習を開始してください</p>
          </div>
          <button class="btn-header" style="background:var(--primary);color:white;border:none;" onclick="openPdfModal(${set.id})">
            📄 問題PDFを見る
          </button>
        </div>

        <div class="section-list">
          ${set.sections.map(sec => {
            const key = `${set.id}_${sec.id}`;
            const prog = progress[key];
            const badgeText = prog
              ? `正解率 ${prog.percent}% (${prog.correct}/${prog.total})`
              : `${sec.questions.length} 問`;

            return `
              <div class="section-row-card" onclick="window.__app.startQuiz('${sec.id}')">
                <div class="section-icon-box">${sec.icon}</div>
                <div class="section-row-info">
                  <h3>
                    <span>${sec.name}</span>
                    <span class="jp-sub">${sec.nameJp}</span>
                  </h3>
                  <p>${sec.description}</p>
                </div>
                <div class="section-row-badge">${badgeText}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    appContainer.innerHTML = html;
  }

  // ==========================================
  // SCREEN 3: QUIZ VIEW
  // ==========================================
  function renderQuiz() {
    const set = questionSets.find(s => s.id === currentSetId);
    if (!set) return;
    const section = set.sections.find(s => s.id === currentSectionId);
    if (!section) return;

    const question = section.questions[currentQuestionIdx];
    const totalQ = section.questions.length;
    const pct = ((currentQuestionIdx) / totalQ) * 100;
    const isAnsweredCurrent = userAnswers[currentQuestionIdx] !== undefined;

    // Audio Markup for Listening section
    let audioMarkup = '';
    if (section.audioFiles && question.audioIndex !== undefined) {
      const audioObj = section.audioFiles[question.audioIndex];
      audioMarkup = `
        <div class="audio-card">
          <div class="audio-header">
            <div class="audio-title-tag">
              <span>🔊</span>
              <span>${audioObj.label || '聴解 音声 (Audio)'}</span>
            </div>
            <div class="audio-speed-chips">
              <button class="speed-chip ${currentPlaybackRate === 0.8 ? 'active' : ''}" onclick="window.__app.setAudioSpeed(0.8)">0.8x</button>
              <button class="speed-chip ${currentPlaybackRate === 1.0 ? 'active' : ''}" onclick="window.__app.setAudioSpeed(1.0)">1.0x</button>
              <button class="speed-chip ${currentPlaybackRate === 1.2 ? 'active' : ''}" onclick="window.__app.setAudioSpeed(1.2)">1.2x</button>
            </div>
          </div>
          <audio id="quiz-audio" class="audio-player-element" controls preload="auto">
            <source src="${audioObj.mp3}" type="audio/mpeg">
            <source src="${audioObj.m4a}" type="audio/mp4">
            ブラウザが音声再生に対応していません。
          </audio>
        </div>
      `;
    }

    const hasImageOptions = question.options.some(opt => typeof opt === 'object' && opt.image);

    // Prompt Image with Zoom Hint
    let promptImageMarkup = '';
    if (question.promptImage) {
      promptImageMarkup = `
        <div class="prompt-image-box" onclick="window.__app.openLightbox('${question.promptImage}')">
          <img src="${question.promptImage}" alt="Question Prompt" class="prompt-image">
          <div class="zoom-hint">🔍 タップで拡大表示 (Tap to Zoom)</div>
        </div>
      `;
    }

    const letters = ['a', 'b', 'c', 'd'];

    // Next Button Label logic
    let nextBtnLabel = '次の問題 →';
    if (currentQuestionIdx === totalQ - 1) {
      nextBtnLabel = '採点結果へ 🏁';
    } else if (!isAnsweredCurrent && isPracticeMode) {
      nextBtnLabel = 'スキップ ↷';
    }

    const html = `
      <div class="quiz-view">
        ${!isPracticeMode ? `
          <div class="exam-banner">
            <span>⏱️ 本番模試モード中（テスト終了時にスコア採点）</span>
            <span>問 ${currentQuestionIdx + 1} / ${totalQ}</span>
          </div>
        ` : ''}

        <div class="quiz-topbar">
          <div class="quiz-badge-wrap">
            <span class="quiz-badge">${section.icon} ${section.nameJp}</span>
            <span class="quiz-counter">第 ${question.id} 問 (問 ${currentQuestionIdx + 1} / ${totalQ})</span>
          </div>
          <button class="btn-palette-toggle" onclick="window.__app.openPalette()">
            📑 問題一覧
          </button>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>

        ${audioMarkup}

        <div class="question-container">
          <div class="question-header">
            <span class="q-num-pill">${question.id}</span>
            <div class="q-instruction">
              ${question.promptText ? question.promptText : '正しい答えを選んでください。'}
            </div>
          </div>

          ${promptImageMarkup}

          <div class="options-container ${hasImageOptions ? 'image-options' : ''}">
            ${question.options.map((opt, i) => {
              const letter = letters[i];
              const isObj = typeof opt === 'object';
              const text = isObj ? (opt.text || '') : opt;
              const img = isObj ? opt.image : null;

              return `
                <button class="option-card ${img ? 'has-image' : ''}" data-letter="${letter}" onclick="window.__app.selectAnswer('${letter}')">
                  ${img ? `
                    <div class="option-img-wrap" onclick="event.stopPropagation();window.__app.openLightbox('${img}')">
                      <img src="${img}" alt="Option ${letter.toUpperCase()}" class="option-img">
                    </div>
                  ` : ''}
                  <div style="display:flex;align-items:center;gap:10px;width:100%;">
                    <div class="option-letter-badge">${letter.toUpperCase()}</div>
                    <div class="option-text-label">${text}</div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>

          <div id="feedback-box" class="feedback-box" style="display:none;"></div>
        </div>

        <!-- Sticky Bottom Bar for guaranteed accessible navigation on all mobile phones -->
        <div class="sticky-bottom-bar">
          <div class="sticky-bottom-inner">
            <button class="btn-nav-touch btn-prev" onclick="window.__app.prevQuestion()" ${currentQuestionIdx === 0 ? 'disabled' : ''}>
              ← 前へ
            </button>
            <div class="bottom-info-pill" onclick="window.__app.openPalette()">
              <span>📑</span>
              <span>問 ${currentQuestionIdx + 1} / ${totalQ}</span>
            </div>
            <button id="btn-next" class="btn-nav-touch btn-next" onclick="window.__app.nextQuestion()">
              ${nextBtnLabel}
            </button>
          </div>
        </div>
      </div>
    `;

    appContainer.innerHTML = html;

    // Apply speed if audio exists
    const audio = document.getElementById('quiz-audio');
    if (audio) {
      audio.playbackRate = currentPlaybackRate;
    }

    // Restore previous selection if answered
    if (isAnsweredCurrent) {
      restoreUserAnswer(question);
    }
  }

  function handleAnswerSelect(letter) {
    if (isAnswered && isPracticeMode) return;

    const set = questionSets.find(s => s.id === currentSetId);
    const section = set.sections.find(s => s.id === currentSectionId);
    const question = section.questions[currentQuestionIdx];
    const correctLetter = question.answer.toLowerCase();

    userAnswers[currentQuestionIdx] = letter;
    isAnswered = true;

    const cards = document.querySelectorAll('.option-card');
    const feedbackBox = document.getElementById('feedback-box');
    const btnNext = document.getElementById('btn-next');

    cards.forEach(card => {
      const l = card.dataset.letter;
      card.classList.remove('selected', 'is-correct', 'is-wrong');

      if (l === letter) card.classList.add('selected');

      if (isPracticeMode) {
        card.classList.add('disabled');
        if (l === correctLetter) card.classList.add('is-correct');
        if (l === letter && letter !== correctLetter) card.classList.add('is-wrong');
      }
    });

    if (btnNext) {
      btnNext.textContent = currentQuestionIdx === section.questions.length - 1 ? '採点結果へ 🏁' : '次の問題 →';
    }

    if (isPracticeMode) {
      if (letter === correctLetter) {
        playSound('correct');
        feedbackBox.className = 'feedback-box correct';
        feedbackBox.innerHTML = `<span>⭕</span> <div><strong>正解！ (Correct!)</strong></div>`;
      } else {
        playSound('wrong');
        feedbackBox.className = 'feedback-box wrong';
        feedbackBox.innerHTML = `<span>❌</span> <div><strong>不正解 (Incorrect)</strong> — 正解は [${correctLetter.toUpperCase()}] です。</div>`;
      }
      feedbackBox.style.display = 'flex';
    }
  }

  function restoreUserAnswer(question) {
    const selected = userAnswers[currentQuestionIdx];
    const correct = question.answer.toLowerCase();
    const cards = document.querySelectorAll('.option-card');
    const feedbackBox = document.getElementById('feedback-box');

    cards.forEach(card => {
      const l = card.dataset.letter;
      if (l === selected) card.classList.add('selected');

      if (isPracticeMode) {
        card.classList.add('disabled');
        if (l === correct) card.classList.add('is-correct');
        if (l === selected && selected !== correct) card.classList.add('is-wrong');
      }
    });

    if (isPracticeMode && feedbackBox) {
      if (selected === correct) {
        feedbackBox.className = 'feedback-box correct';
        feedbackBox.innerHTML = `<span>⭕</span> <div><strong>正解！ (Correct!)</strong></div>`;
      } else {
        feedbackBox.className = 'feedback-box wrong';
        feedbackBox.innerHTML = `<span>❌</span> <div><strong>不正解 (Incorrect)</strong> — 正解は [${correct.toUpperCase()}] です。</div>`;
      }
      feedbackBox.style.display = 'flex';
    }
  }

  function handleNextQuestion() {
    const set = questionSets.find(s => s.id === currentSetId);
    const section = set.sections.find(s => s.id === currentSectionId);

    if (currentQuestionIdx >= section.questions.length - 1) {
      // Calculate score & finish
      let correctCount = 0;
      section.questions.forEach((q, i) => {
        if (userAnswers[i] && userAnswers[i].toLowerCase() === q.answer.toLowerCase()) {
          correctCount++;
        }
      });
      saveProgress(currentSetId, currentSectionId, correctCount, section.questions.length);
      navigate('results');
    } else {
      currentQuestionIdx++;
      isAnswered = userAnswers[currentQuestionIdx] !== undefined;
      renderQuiz();
    }
  }

  function handlePrevQuestion() {
    if (currentQuestionIdx > 0) {
      currentQuestionIdx--;
      isAnswered = userAnswers[currentQuestionIdx] !== undefined;
      renderQuiz();
    }
  }

  function jumpToQuestion(idx) {
    currentQuestionIdx = idx;
    isAnswered = userAnswers[currentQuestionIdx] !== undefined;
    closePalette();
    renderQuiz();
  }

  // ==========================================
  // SCREEN 4: RESULTS
  // ==========================================
  function renderResults() {
    const set = questionSets.find(s => s.id === currentSetId);
    const section = set.sections.find(s => s.id === currentSectionId);
    const total = section.questions.length;

    let correctCount = 0;
    section.questions.forEach((q, i) => {
      if (userAnswers[i] && userAnswers[i].toLowerCase() === q.answer.toLowerCase()) {
        correctCount++;
      }
    });
    const wrongCount = total - correctCount;
    const pct = Math.round((correctCount / total) * 100);

    let icon = '🎉';
    let msg = '大変よくできました！ Excellent score!';
    if (pct < 60) {
      icon = '💪';
      msg = 'もう一度復習してスコアアップを目指しましょう！';
    } else if (pct < 80) {
      icon = '👍';
      msg = '合格ライン突破！ Good performance!';
    }

    const reviewItems = section.questions.map((q, i) => {
      const userLetter = userAnswers[i];
      const correctLetter = q.answer.toLowerCase();
      const isCorrect = userLetter && userLetter.toLowerCase() === correctLetter;

      const letters = ['a', 'b', 'c', 'd'];
      const correctIdx = letters.indexOf(correctLetter);
      const userIdx = userLetter ? letters.indexOf(userLetter) : -1;

      const getOptionText = (idx) => {
        if (idx < 0 || idx >= q.options.length) return '';
        const opt = q.options[idx];
        return typeof opt === 'object' ? (opt.text || `選択肢 ${letters[idx].toUpperCase()}`) : opt;
      };

      return `
        <div class="review-item-card ${isCorrect ? 'is-correct' : 'is-wrong'}">
          <div class="review-icon">${isCorrect ? '⭕' : '❌'}</div>
          <div class="review-details">
            <div class="review-q-title">第 ${q.id} 問</div>
            <div class="review-answer-line">
              ${isCorrect ? `
                <span class="ans-correct">正解: [${correctLetter.toUpperCase()}] ${getOptionText(correctIdx)}</span>
              ` : `
                <span>あなたの解答: <span class="ans-wrong">[${userLetter ? userLetter.toUpperCase() : '未回答'}] ${getOptionText(userIdx)}</span></span>
                <span style="margin: 0 6px;">→</span>
                <span class="ans-correct">正解: [${correctLetter.toUpperCase()}] ${getOptionText(correctIdx)}</span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <div class="results-view">
        <div class="score-summary-card">
          <div class="result-icon">${icon}</div>
          <h2>${section.nameJp} — 採点結果</h2>
          <p style="color:var(--text-sub);margin-top:4px;">${msg}</p>

          <div class="score-gauge-wrap">
            <div class="score-circle-badge">
              <div class="score-percent">${pct}%</div>
              <div class="score-sublabel">Score</div>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-num c-green">${correctCount}</div>
              <div class="stat-desc">正解 (Correct)</div>
            </div>
            <div class="stat-box">
              <div class="stat-num c-red">${wrongCount}</div>
              <div class="stat-desc">不正解 (Wrong)</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${total}</div>
              <div class="stat-desc">合計 (Total)</div>
            </div>
          </div>
        </div>

        <div class="results-action-bar">
          <button class="btn-nav-touch btn-prev" onclick="window.__app.startQuiz('${section.id}')">
            🔄 もう一度解く
          </button>
          <button class="btn-nav-touch btn-next" onclick="window.__app.goSections()">
            📋 セクション一覧
          </button>
          <button class="btn-nav-touch btn-prev" onclick="window.__app.goHome()">
            🏠 ホーム
          </button>
        </div>

        <div class="review-section-wrap">
          <div class="review-header">📝 各問題の確認・復習 (Review)</div>
          ${reviewItems}
        </div>
      </div>
    `;

    appContainer.innerHTML = html;
  }

  // App API
  window.__app = {
    openSet: (setId) => navigate('sections', { setId }),
    startQuiz: (sectionId) => navigate('quiz', { sectionId }),
    selectAnswer: handleAnswerSelect,
    nextQuestion: handleNextQuestion,
    prevQuestion: handlePrevQuestion,
    jumpToQuestion: jumpToQuestion,
    openPalette: openPalette,
    openLightbox: openLightbox,
    goHome: () => navigate('home'),
    goSections: () => navigate('sections', { setId: currentSetId }),
    setMode: (mode) => {
      isPracticeMode = mode;
      renderHome();
    },
    setAudioSpeed: (speed) => {
      currentPlaybackRate = speed;
      const audio = document.getElementById('quiz-audio');
      if (audio) audio.playbackRate = speed;
      document.querySelectorAll('.speed-chip').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.textContent) === speed);
      });
    }
  };

  // Initial render
  navigate('home');
})();
