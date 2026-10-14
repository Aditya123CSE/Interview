// State
let currentSessionId = null;
let currentRound = "greeting";
let isVoiceEnabled = true;
let voiceRate = 1.0;
let userApiKey = localStorage.getItem("coach_api_key") || "";
let skills = ["Python", "FastAPI", "React", "PostgreSQL", "Docker"];
let hobbies = ["Competitive Programming", "Chess", "Open Source"];
let radarChartInstance = null;
let progressChartInstance = null;
let recognition = null;
let isRecording = false;

// DOM Elements
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
const btnRetake = document.getElementById("btnRetake");

// Sample Resume for Instant 1-Click Judging & Demonstration
const SAMPLE_PCE_RESUME = `
ADITYA SHARMA
Email: aditya.sharma@example.com | Phone: +91 98765 43210
Jaipur, Rajasthan | LinkedIn: linkedin.com/in/adityasharma | GitHub: github.com/Aditya123CSE

EDUCATION
Poornima College of Engineering, Jaipur
Bachelor of Technology in Computer Science & Engineering (B.Tech CSE)
CGPA: 8.7 / 10.0 (2022 - 2026)
Relevant Coursework: Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Operating Systems, Computer Networks.

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, C++, SQL
Frameworks & Libraries: FastAPI, Node.js, Express, React, Tailwind CSS
Databases & Cache: PostgreSQL, MongoDB, Redis, SQLite
Tools & DevOps: Docker, Git, GitHub Actions, Linux, Nginx, Postman
Core Concepts: REST APIs, System Design, Concurrency, Microservices

PROJECTS
1. Smart Attendance & Automated Assessment System (FastAPI, React, OpenCV)
- Built high-performance microservices backend handling 500+ requests/min with sub-80ms response time.
- Integrated Redis caching for frequent queries, decreasing database load by 45%.
2. Cloud Resource Telemetry Monitor (Python, Docker, Prometheus)
- Designed real-time observability agent capturing CPU, memory, and network throughput.

HOBBIES & INTERESTS
Competitive Programming (LeetCode 300+ problems solved), Playing Chess, Contributing to Open Source repositories, Tech Blogging.
`;

// Initialize UI
document.addEventListener("DOMContentLoaded", () => {
  renderTags();
  initSpeechRecognition();
  inputApiKey.value = userApiKey;

  // Setup Event Listeners
  btnLoadSample.addEventListener("click", () => {
    rawResumeText.value = SAMPLE_PCE_RESUME.trim();
    rawResumeText.classList.remove("hidden");
    uploadLabel.innerHTML = `<span class="text-emerald-400 font-semibold">Loaded: Poornima CS Sample Student Resume</span>`;
    triggerScanFromText(SAMPLE_PCE_RESUME);
  });

  togglePasteText.addEventListener("click", () => {
    rawResumeText.classList.toggle("hidden");
  });

  dropZone.addEventListener("click", () => resumeFileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-indigo-500");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-indigo-500");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-indigo-500");
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

  btnFinishEarly.addEventListener("click", endInterviewEarly);
  btnRetake.addEventListener("click", resetToSetup);

  // Settings & Voice
  btnVoiceToggle.addEventListener("click", () => {
    isVoiceEnabled = !isVoiceEnabled;
    voiceStatusText.innerText = isVoiceEnabled ? "ON" : "OFF";
    btnVoiceToggle.classList.toggle("border-cyan-500/50", isVoiceEnabled);
  });

  btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
  btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
  btnSaveSettings.addEventListener("click", () => {
    userApiKey = inputApiKey.value.trim();
    voiceRate = parseFloat(selectVoiceRate.value);
    localStorage.setItem("coach_api_key", userApiKey);
    settingsModal.classList.add("hidden");
  });
});

// Resume Tag Rendering
function renderTags() {
  skillsContainer.innerHTML = skills.map((s, idx) => `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]">
      ${s} <button onclick="removeSkill(${idx})" class="hover:text-rose-400 font-bold ml-0.5">&times;</button>
    </span>
  `).join("");

  hobbiesContainer.innerHTML = hobbies.map((h, idx) => `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">
      ${h} <button onclick="removeHobby(${idx})" class="hover:text-rose-400 font-bold ml-0.5">&times;</button>
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

// Resume Upload & Parse Handlers
async function handleFileUpload(file) {
  uploadLabel.innerHTML = `Selected: <strong>${file.name}</strong>`;
  scanStatusBadge.innerText = "Scanning...";
  scanStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse";

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
    alert("Failed to connect to parser service.");
  }
}

async function triggerScanFromText(text) {
  scanStatusBadge.innerText = "Extracting...";
  scanStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse";

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
  profName.value = profile.candidate_name || "Candidate";
  profCollege.value = profile.college || "Poornima College of Engineering";
  profStudies.value = profile.studies || "B.Tech Computer Science";
  if (profile.skills && profile.skills.length) skills = profile.skills;
  if (profile.hobbies && profile.hobbies.length) hobbies = profile.hobbies;
  renderTags();

  scanStatusBadge.innerText = "Profile Ready";
  scanStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium";
}

// Start Interview Session
async function startInterviewSession() {
  const payload = {
    candidate_name: profName.value.trim() || "Candidate",
    college: profCollege.value.trim() || "Poornima College of Engineering",
    studies: profStudies.value.trim() || "B.Tech Computer Science",
    target_role: targetRole.value,
    target_domain: targetDomain.value,
    skills: skills,
    hobbies: hobbies,
    api_key: userApiKey || null
  };

  btnStartInterview.disabled = true;
  btnStartInterview.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Preparing Environment...`;
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
      updateRoundBadges(currentRound);

      // Render First Message (Realistic Greeting)
      appendInterviewerMessage(data.greeting, false, "greeting");
      speakText(data.greeting);
    }
  } catch (err) {
    console.error(err);
    alert("Could not start interview session.");
  } finally {
    btnStartInterview.disabled = false;
    btnStartInterview.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> Start Real Interview Simulation`;
    lucide.createIcons();
  }
}

// Submit Answer
async function submitAnswer() {
  const answer = candidateAnswerInput.value.trim();
  if (!answer) return;

  candidateAnswerInput.value = "";
  appendCandidateMessage(answer);

  // Show typing indicator
  const typingId = appendTypingIndicator();

  try {
    const res = await fetch("/api/interview/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSessionId,
        answer: answer,
        api_key: userApiKey || null
      })
    });
    const data = await res.json();
    removeTypingIndicator(typingId);

    if (data.status === "success") {
      currentRound = data.current_round;
      updateRoundBadges(currentRound);

      // Render live feedback badge under candidate message
      if (data.feedback) {
        attachFeedbackToLastCandidateMessage(data.feedback);
      }

      // Render interviewer question / follow-up
      appendInterviewerMessage(data.question, data.is_follow_up, currentRound);
      speakText(data.question);

      if (data.is_completed) {
        setTimeout(() => {
          showFinalReport(data.final_report);
        }, 2200);
      }
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    console.error(err);
    appendInterviewerMessage("I encountered an issue processing that answer. Let's continue: Could you summarize your core approach?");
  }
}

// Render Messages in Chat
function appendInterviewerMessage(text, isFollowUp = false, roundName = "") {
  const msgDiv = document.createElement("div");
  msgDiv.className = "flex items-start gap-3 max-w-3xl fade-in";
  
  const followUpBadge = isFollowUp ? `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
      <i data-lucide="corner-down-right" class="w-3 h-3"></i> Adaptive Follow-Up (Altered based on your previous response)
    </span>
  ` : "";

  msgDiv.innerHTML = `
    <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/30 mt-1">
      <i data-lucide="bot" class="w-5 h-5"></i>
    </div>
    <div class="flex-1">
      ${followUpBadge}
      <div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-100 shadow-md leading-relaxed whitespace-pre-line">
        ${text}
      </div>
      <div class="text-[10px] text-slate-500 mt-1 pl-1 flex items-center gap-2">
        <span>AI Interviewer</span>
        <span>•</span>
        <button onclick="speakText('${text.replace(/'/g, "\\'").replace(/\n/g, " ")}')" class="hover:text-indigo-400 flex items-center gap-1">
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
  msgDiv.className = "flex items-start justify-end gap-3 max-w-3xl self-end ml-auto fade-in candidate-msg-container";
  msgDiv.innerHTML = `
    <div class="flex-1 flex flex-col items-end">
      <div class="bg-indigo-600 border border-indigo-500 rounded-2xl rounded-tr-sm p-4 text-sm text-white shadow-md leading-relaxed whitespace-pre-line">
        ${text}
      </div>
      <div class="text-[10px] text-slate-400 mt-1 pr-1">Candidate Answer</div>
      <div class="feedback-anchor w-full"></div>
    </div>
    <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
      <i data-lucide="user" class="w-5 h-5"></i>
    </div>
  `;
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
}

function attachFeedbackToLastCandidateMessage(feedback) {
  const anchors = document.querySelectorAll(".feedback-anchor");
  if (!anchors.length) return;
  const lastAnchor = anchors[anchors.length - 1];

  const scoreColor = feedback.score >= 80 ? "text-emerald-400" : (feedback.score >= 65 ? "text-amber-400" : "text-rose-400");
  const suggestionText = feedback.suggestions && feedback.suggestions.length ? feedback.suggestions[0] : "Good structured delivery.";

  lastAnchor.innerHTML = `
    <div class="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs w-full">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
        <span class="font-semibold text-slate-300 flex items-center gap-1">
          <i data-lucide="award" class="w-3.5 h-3.5 text-indigo-400"></i> Turn Evaluation
        </span>
        <span class="font-bold ${scoreColor}">${feedback.score} / 100</span>
      </div>
      <div class="grid grid-cols-4 gap-1 text-[10px] text-center mb-1.5 text-slate-400">
        <div>Struct: <strong class="text-slate-200">${feedback.metrics.structure}</strong></div>
        <div>Relev: <strong class="text-slate-200">${feedback.metrics.relevance}</strong></div>
        <div>Depth: <strong class="text-slate-200">${feedback.metrics.depth}</strong></div>
        <div>Clarity: <strong class="text-slate-200">${feedback.metrics.clarity}</strong></div>
      </div>
      <div class="text-[11px] text-slate-300">
        <span class="text-indigo-400 font-medium">Evidence Cited:</span> "${feedback.evidence_cited}"
      </div>
      <div class="text-[11px] text-amber-300/90 mt-1">
        <span class="text-amber-400 font-medium">Suggestion:</span> ${suggestionText}
      </div>
    </div>
  `;
  chatStream.scrollTop = chatStream.scrollHeight;
  lucide.createIcons();
}

function appendTypingIndicator() {
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "flex items-center gap-3 text-slate-500 text-xs py-2 fade-in";
  div.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
      <i data-lucide="bot" class="w-4 h-4 animate-spin"></i>
    </div>
    <span>Interviewer is evaluating your response & formulating next question...</span>
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

// Update Round Badges
function updateRoundBadges(round) {
  const badges = {
    greeting: document.getElementById("stepBadgeGreeting"),
    hr: document.getElementById("stepBadgeHr"),
    technical: document.getElementById("stepBadgeTech"),
    situational: document.getElementById("stepBadgeSituational"),
    behavioural: document.getElementById("stepBadgeBehavioural")
  };

  const activeClass = "bg-indigo-600 text-white font-bold ring-2 ring-indigo-400/30";
  const completedClass = "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30";
  const inactiveClass = "bg-slate-800 text-slate-400";

  let foundActive = false;
  const order = ["greeting", "hr", "technical", "situational", "behavioural"];

  order.forEach(r => {
    const el = badges[r];
    if (!el) return;
    el.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ";
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

// Speech Recognition (Web Speech API)
function initSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if ("SpeechRecognition" in window) {
    recognition = new window.SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isRecording = true;
      btnMic.classList.add("mic-active");
      speechStatus.innerText = "Listening... Speak now";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      candidateAnswerInput.value += (candidateAnswerInput.value ? " " : "") + transcript;
      speechStatus.innerText = "Captured audio";
    };

    recognition.onerror = () => {
      isRecording = false;
      btnMic.classList.remove("mic-active");
      speechStatus.innerText = "Mic error or timeout";
    };

    recognition.onend = () => {
      isRecording = false;
      btnMic.classList.remove("mic-active");
      speechStatus.innerText = "Mic ready";
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
    speechStatus.innerText = "Speech API unsupported in this browser";
  }
}

// Speech Synthesis (Text-to-Speech)
function speakText(text) {
  if (!isVoiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = voiceRate || 1.0;
  window.speechSynthesis.speak(utterance);
}

// Finish Early Handler
async function endInterviewEarly() {
  if (!confirm("Are you sure you want to end the session early and view the evaluation report?")) return;
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

// Show Final Report & Visualizations
async function showFinalReport(report) {
  stepSetup.classList.add("hidden");
  stepArena.classList.add("hidden");
  stepReport.classList.remove("hidden");

  document.getElementById("repCandidateTitle").innerText = `${report.candidate_name}'s Readiness Report`;
  document.getElementById("repVerdict").innerText = report.readiness_verdict;
  document.getElementById("repOverallScore").innerText = report.overall_score;

  // Set Metric values
  document.getElementById("metricStructure").innerText = report.category_scores.structure + "%";
  document.getElementById("metricRelevance").innerText = report.category_scores.relevance + "%";
  document.getElementById("metricDepth").innerText = report.category_scores.depth + "%";
  document.getElementById("metricClarity").innerText = report.category_scores.clarity + "%";

  // Render Strengths
  const strengthsUl = document.getElementById("repStrengthsList");
  strengthsUl.innerHTML = (report.strengths || []).map(s => `
    <li class="flex items-start gap-2">
      <i data-lucide="check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
      <span>${s}</span>
    </li>
  `).join("");

  // Render Suggestions
  const suggestionsUl = document.getElementById("repSuggestionsList");
  suggestionsUl.innerHTML = (report.areas_for_improvement || []).map(s => `
    <li class="flex items-start gap-2">
      <i data-lucide="arrow-right" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
      <span>${s}</span>
    </li>
  `).join("");

  // Render Evidence Citations
  const evidenceList = document.getElementById("evidenceTrailList");
  evidenceList.innerHTML = (report.evidence_trail || []).map(e => `
    <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
      <div class="flex items-center justify-between text-slate-400 mb-1">
        <span class="font-semibold text-indigo-400 uppercase tracking-wider text-[10px]">Round: ${e.round}</span>
        <span class="font-bold text-slate-200">Score: ${e.score}/100</span>
      </div>
      <div class="text-slate-300 italic mb-1.5 pl-2 border-l-2 border-indigo-500/50">
        "${e.cited_snippet}"
      </div>
      <div class="text-slate-400 text-[11px]">
        <strong class="text-emerald-400">Actionable Feedback:</strong> ${e.suggestion}
      </div>
    </div>
  `).join("");

  // Render Radar Chart
  renderRadarChart(report.category_scores);

  // Fetch History for Progress Chart
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
        backgroundColor: "rgba(99, 102, 241, 0.25)",
        borderColor: "rgba(99, 102, 241, 1)",
        pointBackgroundColor: "rgba(129, 140, 248, 1)",
        pointBorderColor: "#fff",
        borderWidth: 2
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, color: "#94a3b8", backdropColor: "transparent" },
          grid: { color: "rgba(51, 65, 85, 0.5)" },
          angleLines: { color: "rgba(51, 65, 85, 0.5)" },
          pointLabels: { color: "#e2e8f0", font: { size: 11, weight: "bold" } }
        }
      },
      plugins: {
        legend: { display: false }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderProgressChart(history) {
  const ctx = document.getElementById("progressLineChart").getContext("2d");
  if (progressChartInstance) progressChartInstance.destroy();

  const labels = history.map((h, i) => `Session #${i + 1}`);
  const scores = history.map(h => h.overall_score || 0);

  progressChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Overall Readiness Score",
        data: scores,
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: "rgba(16, 185, 129, 1)"
      }]
    },
    options: {
      scales: {
        y: {
          min: 40,
          max: 100,
          grid: { color: "rgba(51, 65, 85, 0.3)" },
          ticks: { color: "#94a3b8" }
        },
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8" }
        }
      },
      plugins: {
        legend: { display: false }
      },
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
