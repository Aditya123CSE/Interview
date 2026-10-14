import re
import os
import json
import httpx
from typing import Dict, Any, List, Optional
from app.responsible_ai import evaluate_response, detect_star_elements

ROUNDS = [
    {"id": "greeting", "name": "Greeting & Executive Intro", "order": 1, "description": "Personalized welcome, background & motivation check"},
    {"id": "hr", "name": "Round 1: Culture & Academic Journey", "order": 2, "description": "College achievements, balancing passions, and leadership"},
    {"id": "technical", "name": "Round 2: Technical & Architectural Drill-down", "order": 3, "description": "Deep-dive into resume tech stack, algorithms, and trade-offs"},
    {"id": "situational", "name": "Round 3: High-Stakes Situational Scenarios", "order": 4, "description": "Production outages, conflict resolution, crisis management"},
    {"id": "behavioural", "name": "Round 4: Behavioural (STAR Rigor)", "order": 5, "description": "Ownership, ambiguity handling, stakeholder alignment"},
    {"id": "completed", "name": "Executive Evaluation Dossier", "order": 6, "description": "Bias-audited rubric feedback, radar metrics, and rewrite recommendations"}
]

# Intelligent Domain Contexts for Dynamic Adaptation
DOMAIN_CHALLENGES = {
    "Fintech & High-Scale Systems": {
        "technical": "handling distributed transactions across microservices, ensuring idempotency, preventing double-spend anomalies, and p99 latency optimization under 15ms",
        "situational": "a payment gateway reconciliation failure during peak flash sale where 3% of webhooks are dropped and database locks spike"
    },
    "Cloud SaaS & Platform": {
        "technical": "multi-tenant data isolation, rate-limiting algorithms (leaky bucket vs token bucket), connection pooling, and zero-downtime rolling migrations",
        "situational": "a tenant executing an unindexed recursive query that starves shared database CPU cores and triggers cascading timeouts"
    },
    "AI Platforms & Intelligent Apps": {
        "technical": "low-latency LLM inference streaming, semantic cache invalidation, vector embeddings quantization, and guarding against prompt injection",
        "situational": "an AI agent entering an infinite tool-calling loop that incurs 10x compute billing in 20 minutes and crashes the upstream queuing worker"
    },
    "E-Commerce & Logistics": {
        "technical": "inventory decrement race conditions, distributed caching strategies using Redis cluster, and eventual consistency in checkout pipelines",
        "situational": "stock overselling for a high-demand item due to database read-replica lag during an international product drop"
    },
    "Healthtech Systems": {
        "technical": "end-to-end encryption for HIPAA/GDPR health records, audit logging immutability, and fault-tolerant ingestion of real-time telemetry",
        "situational": "critical diagnostic pipeline failing to process medical sensor telemetry within the mandated 3-second alert window"
    }
}

def generate_greeting_message(session_data: Dict[str, Any]) -> str:
    """Generates the authentic, highly professional first interview greeting."""
    name = session_data.get("candidate_name", "Candidate")
    college = session_data.get("college", "your university")
    studies = session_data.get("studies", "your engineering studies")
    target_role = session_data.get("target_role", "Software Development Engineer")
    target_domain = session_data.get("target_domain", "Fintech & High-Scale Systems")
    skills = session_data.get("skills", ["Python", "Algorithms"])
    hobbies = session_data.get("hobbies", ["Competitive Programming"])

    skills_highlight = ", ".join(skills[:3]) if skills else "modern software engineering"
    hobby_ref = f", as well as your dedication to {hobbies[0]}" if hobbies else ""

    return (
        f"Hello {name}, welcome! I'm your AI Interview Coach. It's a pleasure to connect with you today "
        f"for the {target_role} position within our {target_domain} engineering division.\n\n"
        f"I've carefully inspected your background in {studies} from {college}. Your portfolio shows notable experience "
        f"in {skills_highlight}{hobby_ref}.\n\n"
        f"Our evaluation today will mirror an executive engineering loop across 4 distinct stages: Culture & Academic Journey, "
        f"Technical Deep Dive, High-Stakes Situational Triage, and Behavioural STAR Rigor. Every response is assessed transparently "
        f"under our Responsible AI Bias-Mitigated Rubric.\n\n"
        f"To begin: How has your day been so far, and could you introduce yourself by walking me through the pivotal projects "
        f"and personal motivations that make you a strong fit for this role?"
    )

def extract_key_concepts(text: str) -> List[str]:
    """Extracts nouns, technologies, and technical concepts mentioned in candidate response."""
    words = re.findall(r'\b[A-Za-z0-9_-]{3,}\b', text)
    tech_set = {
        "python", "fastapi", "react", "docker", "redis", "postgres", "postgresql", "sql", "mongodb",
        "kubernetes", "aws", "gcp", "kafka", "rest", "graphql", "microservices", "caching", "index",
        "latency", "throughput", "concurrency", "lock", "async", "celery", "django", "node", "express",
        "git", "ci/cd", "encryption", "auth", "jwt", "testing", "unit test", "mock", "algorithm", "dsa"
    }
    extracted = [w for w in words if w.lower() in tech_set]
    return list(dict.fromkeys(extracted))

def generate_next_question(
    session_data: Dict[str, Any],
    current_round: str,
    last_candidate_answer: str,
    round_turn_count: int,
    api_key: Optional[str] = None,
    provider: str = "gemini"
) -> Dict[str, Any]:
    """
    Evaluates the candidate's last answer and dynamically generates the next probing question.
    Connects to external LLM if configured; otherwise runs a multi-layered cognitive heuristic engine.
    """
    target_role = session_data.get("target_role", "Software Engineer")
    target_domain = session_data.get("target_domain", "Fintech & High-Scale Systems")
    skills = session_data.get("skills", ["Python", "FastAPI"])
    hobbies = session_data.get("hobbies", ["Competitive Programming"])
    college = session_data.get("college", "Poornima College of Engineering")
    candidate_name = session_data.get("candidate_name", "Candidate")

    # 1. Rigorous Evidence-Based Evaluation
    eval_result = evaluate_response(
        question="Interview Inquiry",
        candidate_answer=last_candidate_answer,
        round_name=current_round,
        target_role=target_role
    )

    # 2. Check if external LLM should be called
    if api_key and api_key.strip():
        llm_result = query_external_llm(
            api_key=api_key.strip(),
            provider=provider,
            session_data=session_data,
            current_round=current_round,
            last_answer=last_candidate_answer,
            round_turn_count=round_turn_count
        )
        if llm_result:
            return {
                "question": llm_result["question"],
                "is_follow_up": llm_result.get("is_follow_up", False),
                "new_round": llm_result.get("new_round", current_round),
                "feedback": eval_result,
                "exemplar_rewrite": llm_result.get("exemplar_rewrite", generate_exemplar_rewrite(last_candidate_answer, current_round, target_role))
            }

    # 3. High-Craft Adaptive Cognitive Engine (Offline / Local)
    answer_clean = last_candidate_answer.strip()
    words = answer_clean.split()
    word_count = len(words)
    extracted_concepts = extract_key_concepts(answer_clean)
    star_data = detect_star_elements(answer_clean)

    is_follow_up = False
    next_round = current_round
    question = ""

    # GREETING -> HR
    if current_round == "greeting":
        next_round = "hr"
        primary_hobby = hobbies[0] if hobbies else "your personal projects"
        question = (
            f"Thank you for that background, {candidate_name}. Let's transition into Round 1: Culture & Academic Journey.\n\n"
            f"During your tenure at {college}, how did you balance rigorous academic coursework with your dedication to {primary_hobby}? "
            f"Can you recount a specific situation where you had to lead a collegiate team or hackathon initiative under significant time pressure, "
            f"and how you ensured everyone stayed aligned on the deliverable?"
        )

    # HR ROUND
    elif current_round == "hr":
        if round_turn_count == 0 and word_count < 40:
            is_follow_up = True
            question = (
                f"That gives a broad overview, but let's dive into specifics. When conflicts or disagreements on engineering approach "
                f"emerged among your peers, what concrete framework did you use to evaluate options objectively rather than letting it become personal?"
            )
        else:
            next_round = "technical"
            s1 = skills[0] if skills else "Python"
            s2 = skills[1] if len(skills) > 1 else "Database Design"
            domain_ctx = DOMAIN_CHALLENGES.get(target_domain, {}).get("technical", "architectural scaling and low latency")
            question = (
                f"Very insightful perspective on collaboration. Now moving into Round 2: Technical & Architectural Drill-down.\n\n"
                f"Your resume highlights proficiency in {s1} and {s2}. In our {target_domain} systems, we place high emphasis on {domain_ctx}.\n\n"
                f"Walk me through the most technically demanding service or feature you engineered with {s1}. "
                f"Specifically explain: What was the architectural design, how did you handle state or data persistence, "
                f"and what critical performance trade-offs did you make?"
            )

    # TECHNICAL ROUND
    elif current_round == "technical":
        if round_turn_count == 0:
            is_follow_up = True
            if extracted_concepts:
                highlighted = ", ".join(c.upper() for c in extracted_concepts[:2])
                question = (
                    f"You specifically highlighted working with {highlighted}. That's directly relevant.\n\n"
                    f"Let's stress-test that design: Suppose traffic spikes by 20x during a market event, leading to queue saturation "
                    f"and connection timeouts on {highlighted}. How would your system behave? Would it degrade gracefully, shed load, "
                    f"or fail over? What telemetry metrics (e.g. p95/p99 latency, error budgets) would you monitor?"
                )
            else:
                question = (
                    f"You explained the high-level workflow. Let's delve into the computational complexity: "
                    f"What is the Big-O time and space complexity of your primary data operations? If you had to optimize this for memory-constrained "
                    f"environments or millions of concurrent active sessions, what specific data structures or caching patterns would you swap in?"
                )
        else:
            next_round = "situational"
            domain_scenario = DOMAIN_CHALLENGES.get(target_domain, {}).get(
                "situational", 
                "a production outage where latency spikes by 400% after an unscheduled hotfix deployment"
            )
            question = (
                f"Excellent technical depth. Now let's test your problem-solving instincts under pressure in Round 3: High-Stakes Situational Scenarios.\n\n"
                f"Here is your incident scenario: In our {target_domain} infrastructure, {domain_scenario}.\n\n"
                f"Executive stakeholders are demanding updates, users are tweeting complaints, and the on-call engineer suggests rolling back "
                f"while another insists on patching forward in production.\n\n"
                f"What is your minute-by-minute protocol to triage the incident, stabilize the system, communicate with stakeholders, and prevent recurrence?"
            )

    # SITUATIONAL ROUND
    elif current_round == "situational":
        if round_turn_count == 0 and ("rollback" not in answer_clean.lower() and "telemetry" not in answer_clean.lower()):
            is_follow_up = True
            question = (
                f"You outlined a remediation plan. However, how do you handle the immediate operational dilemma: "
                f"Do you enforce an immediate automated rollback to restore customer uptime, or do you keep the faulty instance quarantined "
                f"in a sandbox to capture heap dumps and telemetry for root cause analysis?"
            )
        else:
            next_round = "behavioural"
            question = (
                f"Structured incident triage. Let's advance to our final stage, Round 4: Behavioural Rigor (STAR Method).\n\n"
                f"I'd like you to share a story about a project where you committed to an aggressive technical milestone, encountered unforeseen "
                f"technical roadblocks or team capacity loss, and had to renegotiate scope while ensuring the core value was preserved.\n\n"
                f"Structure your response rigorously using the STAR framework: Situation, Task, Action, and measurable Result."
            )

    # BEHAVIOURAL ROUND (STAR)
    elif current_round == "behavioural":
        if round_turn_count == 0 and not star_data["result"]:
            is_follow_up = True
            question = (
                f"You've clearly articulated the Situation, Task, and the Action you took. However, I want to hear about the Result.\n\n"
                f"What were the quantifiable business or technical outcomes (e.g. latency reduced by X%, uptime restored, features shipped on time)? "
                f"And reflecting back, what is the single biggest lesson you took away from that experience?"
            )
        else:
            next_round = "completed"
            question = (
                f"Thank you, {candidate_name}. That concludes our 4-round interview simulation loop!\n\n"
                f"I have recorded all transcripts, conducted our Responsible AI Bias-Mitigation audit, and compiled your "
                f"comprehensive Executive Readiness Dossier, complete with competency radar analysis, verbatim citations, "
                f"and staff-level answer rewrites."
            )

    return {
        "question": question,
        "is_follow_up": is_follow_up,
        "new_round": next_round,
        "feedback": eval_result,
        "exemplar_rewrite": generate_exemplar_rewrite(last_candidate_answer, current_round, target_role)
    }

def generate_exemplar_rewrite(candidate_answer: str, round_name: str, target_role: str) -> str:
    """Provides a Staff-Engineer level rewrite demonstrating how an elite candidate would articulate the same point."""
    words = candidate_answer.split()
    if len(words) < 15:
        return (
            "Staff-Level Benchmark: 'In our architecture, we identified high latency as the primary bottleneck. "
            "I spearheaded the migration to an asynchronous event-driven pipeline with Redis caching and connection pooling, "
            "which reduced p99 latency from 450ms to 78ms and supported 4x higher throughput without increasing cloud spend.'"
        )
    return (
        f"Staff-Level Benchmark ({round_name.upper()}): 'When addressing this challenge, my objective was both immediate reliability "
        f"and long-term maintainability. I decomposed the problem into telemetry gathering, hypothesis testing, and controlled remediation. "
        f"By establishing quantifiable SLAs and automated circuit breakers, we mitigated operational risk while maintaining 99.98% service uptime.'"
    )

def query_external_llm(
    api_key: str,
    provider: str,
    session_data: Dict[str, Any],
    current_round: str,
    last_answer: str,
    round_turn_count: int
) -> Optional[Dict[str, Any]]:
    """Dispatches request to Gemini, Groq, or OpenAI compatible endpoints."""
    system_prompt = (
        f"You are a Senior Principal Engineer and Responsible AI Interview Coach evaluating a candidate for: {session_data.get('target_role')}. "
        f"Candidate Background: College: {session_data.get('college')}, Studies: {session_data.get('studies')}, "
        f"Skills: {session_data.get('skills')}, Hobbies: {session_data.get('hobbies')}. "
        f"Current Round: {current_round}. Turns in current round: {round_turn_count}.\n"
        f"Responsible AI Mandate: Completely ignore gender, accent, nationality, college pedigree, or identity markers. "
        f"Evaluate purely on response structure (STAR), technical depth, and actionable clarity.\n"
        f"Task: Generate the next dynamic interview response. If the candidate's answer requires probing, ask an adaptive follow-up. "
        f"If the round is satisfied, transition professionally to the next round.\n"
        f"Respond in valid JSON format with keys:\n"
        f"- \"question\" (string): the exact spoken question to the candidate\n"
        f"- \"is_follow_up\" (bool): true if adapting/drilling down on their previous response\n"
        f"- \"new_round\" (string): one of ['hr', 'technical', 'situational', 'behavioural', 'completed']\n"
        f"- \"exemplar_rewrite\" (string): a Staff-level model response demonstrating how an elite engineer would answer."
    )

    try:
        # Provider 1: Groq (OpenAI format, blazing fast)
        if provider == "groq" or (api_key.startswith("gsk_")):
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Candidate's previous response: \"{last_answer}\""}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)

        # Provider 2: Google Gemini
        elif provider == "gemini" or (not api_key.startswith("sk-") and not api_key.startswith("gsk_")):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\nCandidate answer: \"{last_answer}\""}]}
                ],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.4}
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(content)

        # Provider 3: OpenAI
        elif provider == "openai" or api_key.startswith("sk-"):
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Candidate's previous response: \"{last_answer}\""}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4
            }
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)

    except Exception as err:
        print(f"[LLM Query Error] {err}")
    return None
