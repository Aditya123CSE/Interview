// State Management
let currentSessionId = null;
let currentRound = "greeting";
let isVoiceEnabled = true;
let voiceRate = 1.0;
let userApiKey = localStorage.getItem("coach_api_key") || "";
let activeProvider = localStorage.getItem("coach_provider") || "gemini";
let skills = ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "Redis"];
let hobbies = ["Competitive Programming", "Chess", "Open Source"];

let radarChartInstance = null;
let progressChartInstance = null;
let recognition = null;
let isRecording = false;
let audioAnimFrame = null;
let isSynthesizing = false;

// DOM Cache
const stepSetup = document.getElementById("stepSetup");
const stepArena = document.getElementById("stepArena");
const stepReport = document.getElementById("stepReport");

const dropZone = document.getElementById("dropZone");
const resumeFileInput = document.getElementById("resumeFileInput");
const uploadLabel = document.getElementById("uploadLabel");
const togglePasteText = document.getElementById("togglePasteText");
const rawResumeText = document.getElementById("rawResumeText");
const btnScanResume = document.getElementById("btnScanResume");
const btnLoadSample = document.getElementById("btnLoadSample");

const profName = document.getElementById("profName");
const profCollege = document.getElementById("profCollege");
const profStudies = document.getElementById("profStudies");
const skillsContainer = document.getElementById("skillsContainer");
const hobbiesContainer = document.getElementById("hobbiesContainer");
const targetRole = document.getElementById("targetRole");
const targetDomain = document.getElementById("targetDomain");
const scanStatusBadge = document.getElementById("scanStatusBadge");

const btnStartInterview = document.getElementById("btnStartInterview");
const chatStream = document.getElementById("chatStream");
const candidateAnswerInput = document.getElementById("candidateAnswerInput");
const btnSendAnswer = document.getElementById("btnSendAnswer");
const btnMic = document.getElementById("btnMic");
const speechStatus = document.getElementById("speechStatus");
const btnFinishEarly = document.getElementById("btnFinishEarly");

const btnVoiceToggle = document.getElementById("btnVoiceToggle");
const voiceStatusText = document.getElementById("voiceStatusText");
const btnSettings = document.getElementById("btnSettings");
const settingsModal = document.getElementById("settingsModal");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const btnSaveSettings = document.getElementById("btnSaveSettings");
const inputApiKey = document.getElementById("inputApiKey");
const selectVoiceRate = document.getElementById("selectVoiceRate");
const engineProviderSelect = document.getElementById("engineProviderSelect");
const modalProviderSelect = document.getElementById("modalProviderSelect");
const btnRetake = document.getElementById("btnRetake");

// STAR Live Nodes
const starNodes = {
  situation: document.getElementById("starSituation"),
  task: document.getElementById("starTask"),
  action: document.getElementById("starAction"),
  result: document.getElementById("starResult")
};

// Poornima College CS Sample Resume
const SAMPLE_PCE_RESUME = `
ADITYA SHARMA
Email: aditya.sharma@example.com | Phone: +91 98765 43210
Jaipur, Rajasthan | LinkedIn: linkedin.com/in/adityasharma | GitHub: github.com/Aditya123CSE

EDUCATION
Poornima College of Engineering, Jaipur
Bachelor of Technology in Computer Science & Engineering (B.Tech CSE)
CGPA: 8.8 / 10.0 (2022 - 2026)
Relevant Coursework: Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Operating Systems, Computer Networks, Distributed Computing.

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, C++, SQL, Go
Frameworks & Libraries: FastAPI, Node.js, Express, React, Tailwind CSS
Databases & Cache: PostgreSQL, MongoDB, Redis, SQLite
Tools & DevOps: Docker, Git, GitHub Actions, Linux, Nginx, Postman
Core Competencies: REST APIs, System Design, Concurrency, Microservices, Caching Architectures

PROJECTS
1. Smart Attendance & High-Concurrency Assessment Engine (FastAPI, React, OpenCV)
- Engineered microservices backend handling 800+ requests/min with sub-70ms p95 latency.
- Implemented Redis distributed caching with LRU eviction, decreasing database query load by 48%.
2. Cloud Telemetry Observability Suite (Python, Docker, Prometheus)
- Designed real-time monitoring agent capturing CPU, memory, and packet throughput.

HOBBIES & EXTRACURRICULAR INTERESTS
Competitive Programming (Codeforces & LeetCode 350+ solved), Playing Competitive Chess, Open Source contributions, Technical Writing.
`;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  renderTags();
  initSpeechRecognition();
  initAudioSpectrum();

  inputApiKey.value = userApiKey;
  engineProviderSelect.value = activeProvider;
  modalProviderSelect.value = activeProvider;

  // Listeners
  btnLoadSample.addEventListener("click", () => {
    rawResumeText.value = SAMPLE_PCE_RESUME.trim();
    rawResumeText.classList.remove("hidden");
    uploadLabel.innerHTML = `<span class="text-amber-400 font-semibold font-mono">LOADED: Poornima CS Sample Student Resume</span>`;
    triggerScanFromText(SAMPLE_PCE_RESUME);
  });

  togglePasteText.addEventListener("click", () => {
    rawResumeText.classList.toggle("hidden");
  });

  dropZone.addEventListener("click", () => resumeFileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-amber-500");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-amber-500");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-amber-500");
    if (e.dataTransfer.files.length) {
      resumeFileInput.files = e.dataTransfer.files;
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  resumeFileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleFileUpload(e.target.files[0]);
    }
  });

  btnScanResume.addEventListener("click", () => {
    if (resumeFileInput.files.length) {
      handleFileUpload(resumeFileInput.files[0]);
    } else if (rawResumeText.value.trim()) {
      triggerScanFromText(rawResumeText.value.trim());
    } else {
      alert("Please upload a resume file or paste text first.");
    }
  });

  btnStartInterview.addEventListener("click", startInterviewSession);
  btnSendAnswer.addEventListener("click", submitAnswer);
  candidateAnswerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  });

  // Live STAR Analysis on Input Typing
  candidateAnswerInput.addEventListener("input", (e) => {
    updateLiveStarReactor(e.target.value);
  });

  btnFinishEarly.addEventListener("click", endInterviewEarly);
  btnRetake.addEventListener("click", resetToSetup);

  // Voice & Provider
  btnVoiceToggle.addEventListener("click", () => {
    isVoiceEnabled = !isVoiceEnabled;
    voiceStatusText.innerText = isVoiceEnabled ? "ON" : "OFF";
    voiceStatusText.className = isVoiceEnabled ? "text-amber-400" : "text-slate-500";
  });

  engineProviderSelect.addEventListener("change", (e) => {
    activeProvider = e.target.value;
    modalProviderSelect.value = activeProvider;
    localStorage.setItem("coach_provider", activeProvider);
  });

  modalProviderSelect.addEventListener("change", (e) => {
    activeProvider = e.target.value;
    engineProviderSelect.value = activeProvider;
    localStorage.setItem("coach_provider", activeProvider);
  });

  btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
  btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
  btnSaveSettings.addEventListener("click", () => {
    userApiKey = inputApiKey.value.trim();
    voiceRate = parseFloat(selectVoiceRate.value);
    activeProvider = modalProviderSelect.value;
    engineProviderSelect.value = activeProvider;

    localStorage.setItem("coach_api_key", userApiKey);
    localStorage.setItem("coach_provider", activeProvider);
    settingsModal.classList.add("hidden");
  });
});

// Render Skills & Hobbies Tags
function renderTags() {
  skillsContainer.innerHTML = skills.map((s, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono">
      ${s} <button onclick="removeSkill(${idx})" class="hover:text-rose-400 font-bold text-xs">&times;</button>
    </span>
  `).join("");

  hobbiesContainer.innerHTML = hobbies.map((h, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono">
      ${h} <button onclick="removeHobby(${idx})" class="hover:text-rose-400 font-bold text-xs">&times;</button>
    </span>
  `).join("");
}

window.removeSkill = (idx) => {
  skills.splice(idx, 1);
  renderTags();
};

window.removeHobby = (idx) => {
  hobbies.splice(idx, 1);
  renderTags();
};

// Ingestion Handlers
async function handleFileUpload(file) {
  uploadLabel.innerHTML = `Selected: <strong class="text-amber-400 font-mono">${file.name}</strong>`;
  scanStatusBadge.innerText = "PARSING FILE...";
  scanStatusBadge.className = "font-mono text-[10px] px-2 py-0.5 rounded badge-amber animate-pulse";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/resume/scan", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.status === "success") {
      populateProfile(data.profile);
    } else {
      alert("Error parsing resume: " + data.detail);
    }
  } catch (err) {
    console.error(err);
    alert("Connection error scanning resume.");
  }
}

async function triggerScanFromText(text) {
  scanStatusBadge.innerText = "EXTRACTING TOKENS...";
  scanStatusBadge.className = "font-mono text-[10px] px-2 py-0.5 rounded badge-amber animate-pulse";

  try {
    const res = await fetch("/api/resume/scan-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.status === "success") {
      populateProfile(data.profile);
    }
  } catch (err) {
    console.error(err);
  }
}

function populateProfile(profile) {
  profName.value = profile.candidate_name || "Aditya Sharma";
  profCollege.value = profile.college || "Poornima College of Engineering";
  profStudies.value = profile.studies || "B.Tech Computer Science & Engineering";
  if (profile.skills && profile.skills.length) skills = profile.skills;
  if (profile.hobbies && profile.hobbies.length) hobbies = profile.hobbies;
  renderTags();

  scanStatusBadge.innerText = "DOSSIER READY";
  scanStatusBadge.className = "font-mono text-[10px] px-2 py-0.5 rounded badge-emerald font-bold";
}

// Live STAR Reactor Detection
function updateLiveStarReactor(text) {
  const t = text.toLowerCase();
  const hasSituation = /when|during|at my|project|scenario|problem|faced|situation|context/.test(t);
  const hasTask = /task|needed to|goal|responsible for|objective|requirement|target/.test(t);
  const hasAction = /i implemented|i built|i decided|i used|i wrote|i analyzed|i resolved|i debugged|i led/.test(t);
  const hasResult = /result|improved|reduced|increased|achieved|learned|delivered|outcome|successfully|impact/.test(t);

  setStarActive(starNodes.situation, hasSituation, "border-cyan-500/50 text-cyan-300", "bg-cyan-400");
  setStarActive(starNodes.task, hasTask, "border-amber-500/50 text-amber-300", "bg-amber-400");
  setStarActive(starNodes.action, hasAction, "border-indigo-500/50 text-indigo-300", "bg-indigo-400");
  setStarActive(starNodes.result, hasResult, "border-emerald-500/50 text-emerald-300", "bg-emerald-400");
}

function setStarActive(el, active, activeClasses, dotColor) {
  if (!el) return;
  const dot = el.querySelector(".indicator-dot");
  if (active) {
    el.className = `p-2.5 rounded-xl bg-slate-900 border ${activeClasses} shadow-sm transition-all flex items-center justify-between font-bold`;
    if (dot) dot.className = `indicator-dot w-2 h-2 rounded-full ${dotColor} animate-pulse`;
  } else {
    el.className = "p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 transition-all flex items-center justify-between";
    if (dot) dot.className = "indicator-dot w-2 h-2 rounded-full bg-slate-800";
  }
}

// Start Session
async function startInterviewSession() {
  const payload = {
    candidate_name: profName.value.trim() || "Aditya Sharma",
    college: profCollege.value.trim() || "Poornima College of Engineering",
    studies: profStudies.value.trim() || "B.Tech Computer Science & Engineering",
    target_role: targetRole.value,
    target_domain: targetDomain.value,
    skills: skills,
    hobbies: hobbies,
    api_key: userApiKey || null,
    provider: activeProvider
  };

  btnStartInterview.disabled = true;
  btnStartInterview.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Initializing Environment...`;
  lucide.createIcons();

  try {
    const res = await fetch("/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.status === "success") {
      currentSessionId = data.session_id;
      currentRound = data.current_round;

      stepSetup.classList.add("hidden");
      stepArena.classList.remove("hidden");
      stepReport.classList.add("hidden");

      chatStream.innerHTML = "";
      updateStageBadges(currentRound);

      // Render First Message (Authentic Greeting)
      appendInterviewerMessage(data.greeting, false, "greeting");
      speakText(data.greeting);
    }
  } catch (err) {
    console.error(err);
    alert("Could not initialize interview session.");
  } finally {
    btnStartInterview.disabled = false;
    btnStartInterview.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> Launch Executive Interview Loop`;
    lucide.createIcons();
  }
}

// Submit Answer
async function submitAnswer() {
  const answer = candidateAnswerInput.value.trim();
  if (!answer) return;

  candidateAnswerInput.value = "";
  updateLiveStarReactor(""); // reset reactor
  appendCandidateMessage(answer);

  const typingId = appendTypingIndicator();

  try {
    const res = await fetch("/api/interview/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSessionId,
        answer: answer,
        api_key: userApiKey || null,
        provider: activeProvider
      })
    });
    const data = await res.json();
    removeTypingIndicator(typingId);

    if (data.status === "success") {
      currentRound = data.current_round;
      updateStageBadges(currentRound);

      // Attach evidence-based audit feedback drawer to candidate message
      if (data.feedback) {
        attachAuditDrawerToCandidateMessage(data.feedback, data.exemplar_rewrite);
      }

      // Render next question / follow-up
      appendInterviewerMessage(data.question, data.is_follow_up, currentRound);
      speakText(data.question);

      if (data.is_completed) {
        setTimeout(() => {
          showFinalReport(data.final_report);
        }, 2400);
      }
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    console.error(err);
    appendInterviewerMessage("I encountered an issue processing that answer. Could you elaborate on your main technical choice?");
  }
}

// Render Dialogue
function appendInterviewerMessage(text, isFollowUp = false, roundName = "") {
  const msgDiv = document.createElement("div");
  msgDiv.className = "flex items-start gap-3.5 max-w-3xl animate-slide-up";

  const followUpTag = isFollowUp ? `
    <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 rounded badge-amber font-mono text-[10px] font-bold">
      <i data-lucide="git-branch" class="w-3 h-3"></i> ADAPTIVE PROBE // ALTERED BASED ON YOUR RESPONSE
    </div>
  ` : "";

  msgDiv.innerHTML = `
    <div class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center shrink-0 shadow-lg mt-1 font-mono font-bold text-xs">
      AI
    </div>
    <div class="flex-1">
      ${followUpTag}
      <div class="telemetry-card rounded-2xl rounded-tl-sm p-4 text-xs md:text-sm text-slate-100 shadow-xl leading-relaxed whitespace-pre-line border border-slate-800/80">
        ${text}
      </div>
      <div class="flex items-center gap-2 mt-1.5 pl-1 text-[10px] font-mono text-slate-500">
        <span>VERITAS EVALUATOR</span>
        <span>•</span>
        <button onclick="speakText('${text.replace(/'/g, "\\'").replace(/\n/g, " ")}')" class="hover:text-amber-400 flex items-center gap-1 transition">
          <i data-lucide="volume-2" class="w-3 h-3"></i> Play Voice
        </button>
      </div>
    </div>
  `;
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
}

function appendCandidateMessage(text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "flex items-start justify-end gap-3.5 max-w-3xl self-end ml-auto animate-slide-up w-full";
  msgDiv.innerHTML = `
    <div class="flex-1 flex flex-col items-end">
      <div class="bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 font-medium rounded-2xl rounded-tr-sm p-4 text-xs md:text-sm shadow-xl leading-relaxed whitespace-pre-line border border-amber-400/30">
        ${text}
      </div>
      <div class="text-[10px] font-mono text-slate-500 mt-1 pr-1">CANDIDATE TELEMETRY STREAM</div>
      <div class="feedback-anchor w-full"></div>
    </div>
    <div class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 mt-1 font-mono font-bold text-xs">
      YOU
    </div>
  `;
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
}

function attachAuditDrawerToCandidateMessage(feedback, exemplarRewrite) {
  const anchors = document.querySelectorAll(".feedback-anchor");
  if (!anchors.length) return;
  const lastAnchor = anchors[anchors.length - 1];

  const scoreColor = feedback.score >= 80 ? "text-emerald-400" : (feedback.score >= 65 ? "text-amber-400" : "text-rose-400");
  const suggestion = feedback.suggestions && feedback.suggestions.length ? feedback.suggestions[0] : "Good structural delivery.";
  const drawerId = "drawer-" + Date.now();

  lastAnchor.innerHTML = `
    <div class="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs w-full shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-mono">
        <span class="text-slate-400 font-semibold flex items-center gap-1.5">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i> Evidence-Based Evaluation
        </span>
        <span class="font-bold ${scoreColor}">${feedback.score} / 100</span>
      </div>

      <!-- Metrics -->
      <div class="grid grid-cols-4 gap-1 text-[10px] font-mono text-center mb-2 text-slate-400">
        <div class="p-1 rounded bg-slate-900 border border-slate-800/60">Struct: <strong class="text-slate-200">${feedback.metrics.structure}</strong></div>
        <div class="p-1 rounded bg-slate-900 border border-slate-800/60">Relev: <strong class="text-slate-200">${feedback.metrics.relevance}</strong></div>
        <div class="p-1 rounded bg-slate-900 border border-slate-800/60">Depth: <strong class="text-slate-200">${feedback.metrics.depth}</strong></div>
        <div class="p-1 rounded bg-slate-900 border border-slate-800/60">Clarity: <strong class="text-slate-200">${feedback.metrics.clarity}</strong></div>
      </div>

      <div class="text-[11px] text-slate-300">
        <span class="text-amber-400 font-mono font-bold">Quoted Evidence:</span> "${feedback.evidence_cited}"
      </div>
      <div class="text-[11px] text-amber-300/90 mt-1">
        <span class="text-amber-400 font-mono font-bold">Feedback Directive:</span> ${suggestion}
      </div>

      <!-- Staff Rewrite Toggle -->
      ${exemplarRewrite ? `
        <div class="mt-2 pt-2 border-t border-slate-800/80">
          <button onclick="document.getElementById('${drawerId}').classList.toggle('hidden')" class="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition">
            <i data-lucide="sparkles" class="w-3 h-3"></i> View Staff-Level Engineer Rewrite Benchmark
          </button>
          <div id="${drawerId}" class="hidden mt-2 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-200 leading-relaxed font-sans">
            ${exemplarRewrite}
          </div>
        </div>
      ` : ""}
    </div>
  `;
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
}

function appendTypingIndicator() {
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "flex items-center gap-3 text-slate-500 text-xs py-2 font-mono animate-slide-up";
  div.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
      <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
    </div>
    <span>Interviewer analyzing response semantics & formulating probe...</span>
  `;
  chatStream.appendChild(div);
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Stage Badges
function updateStageBadges(round) {
  const badges = {
    greeting: document.getElementById("stepBadgeGreeting"),
    hr: document.getElementById("stepBadgeHr"),
    technical: document.getElementById("stepBadgeTech"),
    situational: document.getElementById("stepBadgeSituational"),
    behavioural: document.getElementById("stepBadgeBehavioural")
  };

  const activeClass = "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20";
  const completedClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
  const inactiveClass = "bg-slate-900 text-slate-500 border border-slate-800";

  let foundActive = false;
  const order = ["greeting", "hr", "technical", "situational", "behavioural"];

  order.forEach(r => {
    const el = badges[r];
    if (!el) return;
    el.className = "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono ";
    if (r === round) {
      el.className += activeClass;
      foundActive = true;
    } else if (!foundActive) {
      el.className += completedClass;
    } else {
      el.className += inactiveClass;
    }
  });
}

// Web Speech Recognition
function initSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if ("SpeechRecognition" in window) {
    recognition = new window.SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isRecording = true;
      btnMic.classList.add("mic-recording");
      speechStatus.innerHTML = `<span class="flex items-center gap-1.5 text-rose-400 font-semibold"><i data-lucide="activity" class="w-3.5 h-3.5 animate-pulse"></i> Capturing speech telemetry...</span>`;
      lucide.createIcons();
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          candidateAnswerInput.value += (candidateAnswerInput.value ? " " : "") + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      updateLiveStarReactor(candidateAnswerInput.value + " " + interim);
    };

    recognition.onerror = () => {
      isRecording = false;
      btnMic.classList.remove("mic-recording");
      speechStatus.innerHTML = `<span class="text-amber-400 font-mono">Microphone paused</span>`;
    };

    recognition.onend = () => {
      isRecording = false;
      btnMic.classList.remove("mic-recording");
      speechStatus.innerHTML = `<span class="text-cyan-400 font-mono"><i data-lucide="radio" class="w-3.5 h-3.5 inline"></i> Mic ready</span>`;
      lucide.createIcons();
    };

    btnMic.addEventListener("click", () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    btnMic.disabled = true;
    speechStatus.innerText = "Browser Speech API unsupported";
  }
}

// Text-to-Speech
function speakText(text) {
  if (!isVoiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  isSynthesizing = true;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = voiceRate || 1.0;
  utterance.onend = () => { isSynthesizing = false; };
  utterance.onerror = () => { isSynthesizing = false; };
  window.speechSynthesis.speak(utterance);
}

// Audio Spectrum Equalizer Animation
function initAudioSpectrum() {
  const canvas = document.getElementById("audioSpectrum");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const numBars = 28;
  const bars = new Array(numBars).fill(4);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / numBars) - 3;

    const isActive = isRecording || isSynthesizing;

    for (let i = 0; i < numBars; i++) {
      if (isActive) {
        bars[i] = Math.random() * (canvas.height * 0.75) + 6;
      } else {
        bars[i] += (4 - bars[i]) * 0.15;
      }

      const x = i * (barWidth + 3);
      const y = canvas.height - bars[i];

      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      if (isRecording) {
        gradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        gradient.addColorStop(1, "rgba(239, 68, 68, 1)");
      } else if (isSynthesizing) {
        gradient.addColorStop(0, "rgba(255, 158, 59, 0.3)");
        gradient.addColorStop(1, "rgba(255, 158, 59, 1)");
      } else {
        gradient.addColorStop(0, "rgba(51, 65, 85, 0.3)");
        gradient.addColorStop(1, "rgba(51, 65, 85, 0.6)");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, bars[i]);
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Finish Early
async function endInterviewEarly() {
  if (!confirm("Conclude interview session now and generate the full Executive Dossier?")) return;
  try {
    const res = await fetch(`/api/interview/${currentSessionId}/report`);
    const data = await res.json();
    if (data.status === "success") {
      showFinalReport(data.report);
    }
  } catch (err) {
    console.error(err);
  }
}

// Show Final Report
async function showFinalReport(report) {
  stepSetup.classList.add("hidden");
  stepArena.classList.add("hidden");
  stepReport.classList.remove("hidden");

  document.getElementById("repCandidateTitle").innerText = `${report.candidate_name}'s Executive Readiness Dossier`;
  document.getElementById("repVerdict").innerText = report.readiness_verdict;
  document.getElementById("repOverallScore").innerText = report.overall_score;

  document.getElementById("metricStructure").innerText = report.category_scores.structure + "%";
  document.getElementById("metricRelevance").innerText = report.category_scores.relevance + "%";
  document.getElementById("metricDepth").innerText = report.category_scores.depth + "%";
  document.getElementById("metricClarity").innerText = report.category_scores.clarity + "%";

  // Strengths
  const strengthsUl = document.getElementById("repStrengthsList");
  strengthsUl.innerHTML = (report.strengths || []).map(s => `
    <li class="flex items-start gap-2">
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
      <span>${s}</span>
    </li>
  `).join("");

  // Suggestions
  const suggestionsUl = document.getElementById("repSuggestionsList");
  suggestionsUl.innerHTML = (report.areas_for_improvement || []).map(s => `
    <li class="flex items-start gap-2">
      <i data-lucide="arrow-right-circle" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
      <span>${s}</span>
    </li>
  `).join("");

  // Evidence Trail
  const evidenceList = document.getElementById("evidenceTrailList");
  evidenceList.innerHTML = (report.evidence_trail || []).map(e => `
    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
      <div class="flex items-center justify-between text-slate-400 mb-1.5">
        <span class="font-bold text-amber-400 uppercase tracking-wider text-[10px]">STAGE: ${e.round}</span>
        <span class="font-bold text-slate-200">SCORE: ${e.score}/100</span>
      </div>
      <div class="text-slate-300 italic mb-2 pl-3 border-l-2 border-amber-500/60 font-sans">
        "${e.cited_snippet}"
      </div>
      <div class="text-slate-400 text-[11px] font-sans">
        <strong class="text-emerald-400 font-mono">DIRECTIVE:</strong> ${e.suggestion}
      </div>
    </div>
  `).join("");

  renderRadarChart(report.category_scores);

  // Fetch History for Longitudinal Chart
  try {
    const histRes = await fetch(`/api/candidate/${encodeURIComponent(report.candidate_name)}/history`);
    const histData = await histRes.json();
    if (histData.status === "success" && histData.history) {
      renderProgressChart(histData.history);
    }
  } catch (err) {
    console.error(err);
  }

  lucide.createIcons();
}

function renderRadarChart(categories) {
  const ctx = document.getElementById("rubricRadarChart").getContext("2d");
  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Structure (STAR)", "Relevance", "Technical Depth", "Clarity & Conciseness"],
      datasets: [{
        label: "Candidate Score",
        data: [categories.structure, categories.relevance, categories.depth, categories.clarity],
        backgroundColor: "rgba(255, 158, 59, 0.2)",
        borderColor: "rgba(255, 158, 59, 1)",
        pointBackgroundColor: "rgba(255, 158, 59, 1)",
        pointBorderColor: "#fff",
        borderWidth: 2
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, color: "#64748b", backdropColor: "transparent" },
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          angleLines: { color: "rgba(255, 255, 255, 0.08)" },
          pointLabels: { color: "#cbd5e1", font: { size: 11, family: "Plus Jakarta Sans", weight: "bold" } }
        }
      },
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderProgressChart(history) {
  const ctx = document.getElementById("progressLineChart").getContext("2d");
  if (progressChartInstance) progressChartInstance.destroy();

  const labels = history.map((h, i) => `Loop #${i + 1}`);
  const scores = history.map(h => h.overall_score || 0);

  progressChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Composite Readiness Score",
        data: scores,
        borderColor: "rgba(0, 229, 153, 1)",
        backgroundColor: "rgba(0, 229, 153, 0.12)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: "rgba(0, 229, 153, 1)"
      }]
    },
    options: {
      scales: {
        y: {
          min: 40,
          max: 100,
          grid: { color: "rgba(255, 255, 255, 0.06)" },
          ticks: { color: "#64748b" }
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" }
        }
      },
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function resetToSetup() {
  stepSetup.classList.remove("hidden");
  stepArena.classList.add("hidden");
  stepReport.classList.add("hidden");
}
