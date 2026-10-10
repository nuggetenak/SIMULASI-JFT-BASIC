# ⛩️ JFT-Basic 総合練習 (Choukai & CBT Simulation)

A modern, interactive Computer-Based Testing (CBT) practice web application for the **Japan Foundation Test for Basic Japanese (JFT-Basic)**.

Designed to mirror the official JFT-Basic test environment with audio playback, illustrated question prompts, picture-based options, and instant scoring.

---

## ✨ Features

- 🎧 **Audio Listening Comprehension (聴解 - Choukai)**:
  - Full audio recordings converted to high-compatibility MP3 format.
  - Interactive player with custom playback speeds (`0.8x`, `1.0x`, `1.2x`).
  - Illustrated option cards for image-based questions.
- 📝 **Script & Vocabulary (文字と語彙)**:
  - 30 questions per mock test covering Kanji readings, vocabulary meanings, and contextual grammar.
  - High-resolution extracted illustrations and text prompts.
- 💬 **Conversation & Expression (会話と表現)**:
  - Situational manga/comic dialogue questions with fill-in-the-blank options.
- ⚡ **Two Study Modes**:
  - **📘 Practice Mode (練習モード)**: Instant feedback upon answer selection with gentle sound effects and explanations.
  - **⏱️ Exam Simulation Mode (本番模試モード)**: CBT exam flow with complete score tally, performance percentage, and detailed review at the end.
- 📄 **Integrated PDF Sheet Viewer**:
  - Open and review the original official test sheet PDFs directly within the app modal.
- ⌨️ **Keyboard Accessibility**:
  - Keys `A`, `B`, `C`, `D` to select options.
  - `Space` to toggle audio play/pause.
  - `Arrow Right` / `Enter` for next question, `Arrow Left` for previous question.
- 📱 **Fully Responsive**:
  - Works seamlessly across mobile phones, tablets, and desktop browsers.
- 🚀 **Zero Dependencies Runtime**:
  - Runs with pure Node.js built-in modules (`http`, `fs`, `path`).

---

## 📂 Test Sets Included

| Set | Mock Test | Sections | Questions | Audio Track |
|---|---|---|---|---|
| **Set 1** | 模擬試験 1 | 文字・語彙 (30) / 会話・表現 (5) / 聴解 (5) | 40 問 | 3 Audio Files (SOAL 1 - 3) |
| **Set 2** | 模擬試験 2 | 文字・語彙 (30) / 会話・表現 (8) / 聴解 (5) | 43 問 | 1 Master Audio Track |
| **Set 3** | 模擬試験 3 | 文字・語彙 (30) / 会話・表現 (5) / 聴解 (5) | 40 問 | 3 Audio Files (SOAL 1 - 3) |
| **Set 4** | 模擬試験 4 | 文字・語彙 (30) / 会話・表現 (5) / 聴解 (5) | 40 問 | 3 Audio Files (SOAL 1 - 3) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation & Run

1. Clone this repository:
   ```bash
   git clone https://github.com/nuggetenak/SIMULASI-JFT-BASIC.git
   cd SIMULASI-JFT-BASIC
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🛠️ Project Structure

```
├── public/
│   ├── index.html         # Main application page
│   ├── css/
│   │   └── style.css      # Japanese traditional aesthetic styling
│   ├── js/
│   │   ├── app.js         # Interactive application logic & audio engine
│   │   └── questions.js   # Extracted questions, answer keys & media links
│   ├── audio/             # High quality MP3 & M4A audio files
│   ├── images/            # Extracted illustrations & question prompts
│   └── pdf/               # Original test sheet PDFs
├── server.js              # Lightweight zero-dependency HTTP server
├── package.json           # Project manifest
└── README.md              # Documentation
```

---

## 📜 License

MIT License. Educational practice material for JFT-Basic Japanese learners.
