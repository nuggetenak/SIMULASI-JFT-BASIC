// JFT Basic Interactive CBT Practice Application
// Robust, responsive, multimodal learning app

(function () {
  'use strict';

  // App State
  let currentScreen = 'home';
  let currentSetId = null;
  let currentSectionId = null;
  let currentQuestionIdx = 0;
  let userAnswers = [];
  let userFlagged = [];
  let isPracticeMode = true; // true: immediate feedback, false: exam mode
  let isAnswered = false;
  let examTimeRemaining = 0;
  let examTimerInterval = null;

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
        // High harmonic chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'wrong') {
        // Soft low tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.setValueAtTime(196, now + 0.12); // G3
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
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

  // Navigation
  function navigate(screen, params = {}) {
    currentScreen = screen;
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
      userFlagged = [];
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
      if (currentScreen === 'quiz' && !confirm('練習を中断してセクション一覧に戻りますか？\nReturn to section menu?')) return;
      navigate('sections', { setId: currentSetId });
    } else if (currentScreen === 'sections') {
      navigate('home');
    }
  });

  // PDF Modal
  function openPdfModal(setId) {
    const set = questionSets.find(s => s.id === setId);
    if (!set) return;
    pdfModalTitle.textContent = `${set.title} (Original PDF Sheet)`;
    pdfFrame.src = set.pdfUrl;
    pdfModal.classList.add('active');
  }

  window.closePdfModal = function () {
    pdfModal.classList.remove('active');
    pdfFrame.src = 'about:blank';
  };

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    if (currentScreen !== 'quiz') return;
    const key = e.key.toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(key)) {
      handleAnswerSelect(key);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      const btnNext = document.getElementById('btn-next');
      if (btnNext && !btnNext.disabled) handleNextQuestion();
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
          <div class="hero-text">
            <h2>🇯🇵 JFT-Basic 総合練習 (聴解・文字語彙・会話)</h2>
            <p>Japan Foundation Test for Basic Japanese — Interactive CBT Practice</p>
            <div class="hero-badges">
              <span class="hero-badge">🎧 音声付き聴解 (Choukai)</span>
              <span class="hero-badge">📝 文字・語彙 (Vocabulary)</span>
              <span class="hero-badge">💬 会話と表現 (Conversation)</span>
              <span class="hero-badge">⚡ 即時採点 / 解答確認</span>
            </div>
          </div>
          <div>
            <div class="mode-toggle-group">
              <button class="mode-btn ${isPracticeMode ? 'active' : ''}" onclick="window.__app.setMode(true)">
                📘 練習モード (解説付)
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
                <div class="set-card-header">
                  <span class="set-badge">第 ${set.id} 回</span>
                  <div class="set-num-watermark">0${set.id}</div>
                </div>
                <h3>${set.title}</h3>
                <div class="set-stats">
                  <div class="set-stat-item">
                    <span>📋</span>
                    <span>3 セクション · 全 ${totalQ} 問</span>
                  </div>
                  <div class="set-stat-item">
                    <span>🎧</span>
                    <span>聴解セクション：音声・問題画完全収録</span>
                  </div>
                  <div class="set-stat-item">
                    <span>📄</span>
                    <span>公式問題シート PDF 連動</span>
                  </div>
                  ${completedCount > 0 ? `
                    <div class="set-stat-item" style="color:var(--correct);font-weight:600;">
                      <span>✅</span>
                      <span>${completedCount} / 3 セクション完了</span>
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
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:4px;">練習するセクションを選択してください</p>
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
  // SCREEN 3: QUIZ / TEST
  // ==========================================
  function renderQuiz() {
    const set = questionSets.find(s => s.id === currentSetId);
    if (!set) return;
    const section = set.sections.find(s => s.id === currentSectionId);
    if (!section) return;

    const question = section.questions[currentQuestionIdx];
    const totalQ = section.questions.length;
    const pct = ((currentQuestionIdx) / totalQ) * 100;

    // Audio Player markup for Listening
    let audioMarkup = '';
    if (section.audioFiles && question.audioIndex !== undefined) {
      const audioObj = section.audioFiles[question.audioIndex];
      audioMarkup = `
        <div class="audio-box">
          <div class="audio-header">
            <div class="audio-title">
              <span>🔊</span>
              <span>${audioObj.label || '問題 音声 (Audio)'}</span>
            </div>
            <div>
              <button class="audio-speed-btn" onclick="window.__app.setAudioSpeed(0.8)">0.8x</button>
              <button class="audio-speed-btn" onclick="window.__app.setAudioSpeed(1.0)">1.0x</button>
              <button class="audio-speed-btn" onclick="window.__app.setAudioSpeed(1.2)">1.2x</button>
            </div>
          </div>
          <div class="audio-controls-row">
            <audio id="quiz-audio" class="audio-player-native" controls preload="auto">
              <source src="${audioObj.mp3}" type="audio/mpeg">
              <source src="${audioObj.m4a}" type="audio/mp4">
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      `;
    }

    // Determine if options have images
    const hasImageOptions = question.options.some(opt => typeof opt === 'object' && opt.image);

    // Prompt image markup
    let promptImageMarkup = '';
    if (question.promptImage) {
      promptImageMarkup = `
        <div class="prompt-image-box">
          <img src="${question.promptImage}" alt="Question Image" class="prompt-image" onclick="window.open('${question.promptImage}', '_blank')">
        </div>
      `;
    }

    const letters = ['a', 'b', 'c', 'd'];

    const html = `
      <div class="quiz-view">
        ${!isPracticeMode ? `
          <div class="exam-banner">
            <span>⏱️ 本番模試モード中（テスト終了時にスコアと解説を表示します）</span>
            <span>問題 ${currentQuestionIdx + 1} / ${totalQ}</span>
          </div>
        ` : ''}

        <div class="quiz-topbar">
          <div class="quiz-badge-wrap">
            <span class="quiz-badge">${section.icon} ${section.nameJp}</span>
            <span class="quiz-counter">第 ${question.id} 問 (問 ${currentQuestionIdx + 1} / ${totalQ})</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">
            <span>⌨️ キーボード [A][B][C] で選択</span>
          </div>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>

        ${audioMarkup}

        <div class="question-container">
          <div class="question-header">
            <span class="q-number-pill">${question.id}</span>
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
                    <div class="option-img-wrap">
                      <img src="${img}" alt="Option ${letter.toUpperCase()}" class="option-img">
                    </div>
                  ` : ''}
                  <div style="display:flex;align-items:center;gap:12px;width:100%;">
                    <div class="option-letter-badge">${letter.toUpperCase()}</div>
                    <div class="option-text-label">${text}</div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>

          <div id="feedback-box" class="feedback-box" style="display:none;"></div>
        </div>

        <div class="quiz-footer">
          <button class="btn-nav btn-nav-prev" onclick="window.__app.prevQuestion()" ${currentQuestionIdx === 0 ? 'disabled' : ''}>
            ← 前の問題
          </button>
          <button id="btn-next" class="btn-nav btn-nav-next" onclick="window.__app.nextQuestion()" style="${isPracticeMode ? 'display:none;' : ''}">
            ${currentQuestionIdx === totalQ - 1 ? '試験終了・結果確認 🏁' : '次の問題 →'}
          </button>
        </div>
      </div>
    `;

    appContainer.innerHTML = html;

    // Restore previous selection if answered
    if (userAnswers[currentQuestionIdx] !== undefined) {
      restoreUserAnswer(question);
    }
  }

  // Answer selection
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

    if (isPracticeMode) {
      if (letter === correctLetter) {
        playSound('correct');
        feedbackBox.className = 'feedback-box correct';
        feedbackBox.innerHTML = `<span>⭕</span> <div><strong>正解！ (Correct!)</strong></div>`;
      } else {
        playSound('wrong');
        feedbackBox.className = 'feedback-box wrong';
        feedbackBox.innerHTML = `<span>❌</span> <div><strong>不正解 (Incorrect)</strong> — 正しい答えは [${correctLetter.toUpperCase()}] です。</div>`;
      }
      feedbackBox.style.display = 'flex';
      if (btnNext) btnNext.style.display = 'inline-flex';
    } else {
      // In exam mode, immediately show Next
      if (btnNext) btnNext.style.display = 'inline-flex';
    }
  }

  function restoreUserAnswer(question) {
    const selected = userAnswers[currentQuestionIdx];
    const correct = question.answer.toLowerCase();
    const cards = document.querySelectorAll('.option-card');
    const feedbackBox = document.getElementById('feedback-box');
    const btnNext = document.getElementById('btn-next');

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
        feedbackBox.innerHTML = `<span>❌</span> <div><strong>不正解 (Incorrect)</strong> — 正しい答えは [${correct.toUpperCase()}] です。</div>`;
      }
      feedbackBox.style.display = 'flex';
    }

    if (btnNext) btnNext.style.display = 'inline-flex';
  }

  function handleNextQuestion() {
    const set = questionSets.find(s => s.id === currentSetId);
    const section = set.sections.find(s => s.id === currentSectionId);

    if (currentQuestionIdx >= section.questions.length - 1) {
      // Finish
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

  // ==========================================
  // SCREEN 4: RESULTS & REVIEW
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

      // Extract text of answer
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
                <span style="margin: 0 8px;">→</span>
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
          <p style="color:var(--text-secondary);margin-top:6px;">${msg}</p>

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
          <button class="btn-nav btn-nav-prev" onclick="window.__app.startQuiz('${section.id}')">
            🔄 もう一度解く (Retry)
          </button>
          <button class="btn-nav btn-nav-next" style="margin:0;" onclick="window.__app.goSections()">
            📋 セクション一覧 (Sections)
          </button>
          <button class="btn-nav btn-nav-prev" onclick="window.__app.goHome()">
            🏠 ホーム (Home)
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

  // App Exports
  window.__app = {
    openSet: (setId) => navigate('sections', { setId }),
    startQuiz: (sectionId) => navigate('quiz', { sectionId }),
    selectAnswer: handleAnswerSelect,
    nextQuestion: handleNextQuestion,
    prevQuestion: handlePrevQuestion,
    goHome: () => navigate('home'),
    goSections: () => navigate('sections', { setId: currentSetId }),
    setMode: (mode) => {
      isPracticeMode = mode;
      renderHome();
    },
    setAudioSpeed: (speed) => {
      const audio = document.getElementById('quiz-audio');
      if (audio) audio.playbackRate = speed;
    }
  };

  // Initial load
  navigate('home');
})();
