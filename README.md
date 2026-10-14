# 🛡️ Responsible AI Interview & Career Readiness Coach
> **CS Tech Day • Poornima College of Engineering, Jaipur**  
> **Challenge #7: Responsible AI Interview and Career Readiness Coach**

[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.143-009688.svg)](https://fastapi.tiangolo.com)
[![Responsible AI](https://img.shields.io/badge/Responsible%20AI-Bias%20Mitigated-emerald.svg)]()
[![Tests](https://img.shields.io/badge/Tests-Passing%20(6%2F6)-success.svg)]()

---

## 📌 Problem Statement
Generic interview preparation tools provide static, repetitive questions and shallow advice. They fail to adapt to a candidate's actual resume, target role, or response quality. Furthermore, opaque scoring algorithms can introduce unfair judgments based on demographic cues, accents, gender, or pedigree.

This platform provides a **personalized, evidence-based, and bias-mitigated AI Interview Coach** that replicates a real corporate interview pipeline from start to finish.

---

## ✨ Key Features & Capabilities

### 1. 📄 Smart Resume Intelligence
- **Deep Extraction**: Scans candidate resumes (PDF, DOCX, or direct text) and automatically identifies:
  - **Technical Skills**: Programming languages, frameworks, databases, and DevOps tools.
  - **Hobbies & Interests**: Hobbies (e.g., *Competitive Programming, Chess, Open Source*), personal passions, and extracurricular activities.
  - **College & Studies**: University (e.g., *Poornima College of Engineering*) and degree/branch (e.g., *B.Tech Computer Science & Engineering*).
  - **Key Projects**: Architecture and project summaries.
- **Editable Tag Interface**: Candidates can review and customize their profile before entering the interview.

### 2. 🤝 Realistic Multi-Round Interview Pipeline
- **Personalized First Message (Greeting)**: The interview opens with a warm, professional greeting acknowledging the candidate's name, college background, studies, and target role.
- **Progressive Rounds**:
  - **Round 1: HR & Culture Fit** — Explores academic journey, balancing studies with hobbies, and team collaboration.
  - **Round 2: Technical Deep Dive** — Dynamic technical drill-down into specific resume skills, databases, and system complexity.
  - **Round 3: Situational & Problem-Solving** — Real-world scenarios (e.g., high-latency incident triage, rollback vs. observability).
  - **Round 4: Behavioural Assessment (STAR)** — Measures Situation, Task, Action, and Result execution.

### 3. 🔄 Dynamic & Adaptive Follow-Up Questioning
- The coach actively listens to candidate answers.
- **Contextual Drill-Down**: If a candidate mentions a specific technology (e.g., *Redis, Docker, PostgreSQL*), the coach pivots and asks how they handled edge cases, caching policies, or concurrency.
- **STAR Prompts**: If a candidate omits the *Result* or *Action*, the coach asks for quantifiable outcomes and lessons learned.

### 4. ⚖️ Responsible AI & Evidence-Based Rubric
- **Bias Guardrail**: Candidate answers are sanitized to mask gender pronouns, regional accent cues, demographic markers, and appearance.
- **Evidence-Based Citations**: The AI cites exact sentences from the candidate's answer as verifiable proof for why scores and feedback were awarded.
- **Rubric Dimensions**:
  1. *Structure (STAR)* (0–100)
  2. *Relevance* (0–100)
  3. *Technical Depth & Completeness* (0–100)
  4. *Clarity & Conciseness* (0–100)

### 5. 📈 Measurable Longitudinal Progress Tracking
- Records session history in an SQLite database.
- Displays an interactive **Radar Chart** (Competency Breakdown) and **Progress Line Chart** (Session-over-Session trajectory).

### 6. 🎙️ Voice & Accessibility Support
- **Speech-to-Text**: Click-to-speak microphone input using the browser's Web Speech API.
- **Text-to-Speech**: Professional interviewer voice playback.

---

## 🏗️ Architecture & Project Structure

```
Interview/
├── .gitignore                     # Git configuration
├── requirements.txt               # Python dependencies
├── README.md                      # Documentation & demo guide
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI server & REST API endpoints
│   ├── resume_parser.py           # Resume text extraction (PDF/DOCX/Text)
│   ├── interview_engine.py        # Multi-round state machine & dynamic follow-ups
│   ├── responsible_ai.py          # Bias mitigation & evidence rubric evaluator
│   └── database.py                # SQLite session & progress storage
├── static/
│   ├── index.html                 # Responsive single-page interface (Tailwind + Lucide)
│   ├── app.js                     # Interview client, Web Speech API, Chart.js radar
│   └── style.css                  # UI styling & animations
└── tests/
    └── test_flow.py               # Unit & end-to-end test suite
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+ (or Python 3.14)
- Git

### 2. Setup & Installation
```bash
# Clone the repository
git clone https://github.com/Aditya123CSE/Interview.git
cd Interview

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
python -m unittest tests/test_flow.py
```

### 4. Launch the Coach Application
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser!

> **Note on API Keys:** The platform features an intelligent adaptive engine that runs completely offline with full dynamic follow-up questioning and rubric scoring. You can also optionally paste a Google Gemini API key in the top-right settings modal for cloud model generation.

---

## 🏆 Challenge Compliance Checklist

| Requirement | Implementation Details | Status |
|---|---|:---:|
| **Resume & Role Question Generation** | Extracts skills, hobbies, studies, college; generates role-tailored questions | ✅ Done |
| **Multi-Round Pipeline** | Greeting, HR/Culture, Technical, Situational, and Behavioural rounds | ✅ Done |
| **Realistic Greeting** | First message warmly introduces the interviewer and references candidate background | ✅ Done |
| **Dynamic Follow-Up Questions** | Questions dynamically adapt to candidate's previous response content | ✅ Done |
| **Evidence-Based Feedback** | Rubric evaluating Structure, Relevance, Depth, and Clarity with cited quotes | ✅ Done |
| **Progress Tracking** | Multi-session historical progress tracking with radar & trajectory charts | ✅ Done |
| **Responsible AI Controls** | Demographic and identity bias masking; accent/appearance-neutral scoring | ✅ Done |

---

## 👥 Author
- **Aditya Sharma**  
- **Poornima College of Engineering, Jaipur**  
- GitHub: [@Aditya123CSE](https://github.com/Aditya123CSE)
