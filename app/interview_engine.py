import re
import os
import json
import httpx
from typing import Dict, Any, List, Optional
from app.responsible_ai import evaluate_response

ROUNDS = [
    {"id": "greeting", "name": "Greeting & Introduction", "order": 1},
    {"id": "hr", "name": "Round 1: HR & Culture Fit", "order": 2},
    {"id": "technical", "name": "Round 2: Technical Deep Dive", "order": 3},
    {"id": "situational", "name": "Round 3: Situational & Problem-Solving", "order": 4},
    {"id": "behavioural", "name": "Round 4: Behavioural (STAR)", "order": 5},
    {"id": "completed", "name": "Interview Complete", "order": 6}
]

def generate_greeting_message(session_data: Dict[str, Any]) -> str:
    """Generates the realistic first interview message greeting the candidate."""
    name = session_data.get("candidate_name", "Candidate")
    college = session_data.get("college", "your university")
    studies = session_data.get("studies", "your technical studies")
    target_role = session_data.get("target_role", "Software Engineer")
    target_domain = session_data.get("target_domain", "Technology")
    skills = session_data.get("skills", [])
    hobbies = session_data.get("hobbies", [])
    
    skills_preview = ", ".join(skills[:3]) if skills else "modern technologies"
    hobby_mention = f" and your personal interests like {hobbies[0]}" if hobbies else ""
    
    greeting = (
        f"Hello {name}! A warm welcome to your interview for the {target_role} position "
        f"in our {target_domain} division. I've had the pleasure of reviewing your resume, noting your background in "
        f"{studies} from {college}, along with your work in {skills_preview}{hobby_mention}.\n\n"
        f"We have structured this interview into four progressive rounds: HR & Culture, Technical Deep Dive, "
        f"Situational Scenarios, and Behavioural reflection.\n\n"
        f"To kick things off: How are you feeling today, and could you walk me through a brief introduction "
        f"covering your journey, your core strengths, and what draws you to this role?"
    )
    return greeting

def generate_next_question(
    session_data: Dict[str, Any], 
    current_round: str, 
    last_candidate_answer: str,
    round_turn_count: int,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Decides the next question or follow-up based dynamically on the candidate's last answer.
    Returns:
    {
        "question": str,
        "is_follow_up": bool,
        "new_round": str,
        "feedback": dict (evidence-based evaluation of last answer)
    }
    """
    target_role = session_data.get("target_role", "Software Engineer")
    skills = session_data.get("skills", ["Python", "Algorithms"])
    hobbies = session_data.get("hobbies", ["Problem Solving"])
    college = session_data.get("college", "College")
    
    # 1. Evaluate the candidate's previous response with responsible AI rubric
    eval_result = evaluate_response(
        question="Interview question",
        candidate_answer=last_candidate_answer,
        round_name=current_round,
        target_role=target_role
    )
    
    answer_lower = last_candidate_answer.lower()
    word_count = len(last_candidate_answer.split())
    is_follow_up = False
    next_round = current_round
    
    # Attempt LLM call if API key is present
    if api_key:
        llm_resp = call_gemini_or_openai(
            api_key=api_key,
            session_data=session_data,
            current_round=current_round,
            last_answer=last_candidate_answer,
            round_turn_count=round_turn_count
        )
        if llm_resp:
            return {
                "question": llm_resp["question"],
                "is_follow_up": llm_resp.get("is_follow_up", False),
                "new_round": llm_resp.get("new_round", current_round),
                "feedback": eval_result
            }

    # Intelligent Adaptive Engine (Rule-heuristic fallback with dynamic alterations)
    if current_round == "greeting":
        next_round = "hr"
        hobby_str = hobbies[0] if hobbies else "your hobbies"
        question = (
            f"Thank you for that introduction, {session_data.get('candidate_name', 'there')}! "
            f"Transitioning to Round 1 (HR & Culture): During your studies at {college}, "
            f"how did balancing your academic workload alongside {hobby_str} shape your discipline "
            f"and collaboration skills when working on team initiatives?"
        )
        
    elif current_round == "hr":
        if round_turn_count == 0 and word_count < 35:
            # Dynamic follow-up for brief answer
            is_follow_up = True
            question = (
                f"That's a good start. Could you expand on a specific instance where your team hit an impasse "
                f"or disagreement on a college project, and how you personally helped reconcile differing viewpoints?"
            )
        else:
            # Advance to Technical Round
            next_round = "technical"
            primary_skill = skills[0] if skills else "Software Engineering"
            secondary_skill = skills[1] if len(skills) > 1 else "Data Structures"
            question = (
                f"Excellent. Let's move into Round 2: Technical Deep Dive for the {target_role} role. "
                f"Your resume highlights experience with {primary_skill} and {secondary_skill}. "
                f"Can you walk me through a complex technical challenge you solved using {primary_skill}? "
                f"Please discuss your architectural approach, why you chose that design, and any performance trade-offs."
            )
            
    elif current_round == "technical":
        # Dynamic alteration based on what candidate answered
        detected_tech = None
        for kw in ["database", "sql", "cache", "redis", "api", "docker", "react", "async", "index", "concurrency", "security", "mongodb", "fastapi"]:
            if kw in answer_lower:
                detected_tech = kw
                break
                
        if round_turn_count == 0:
            is_follow_up = True
            if detected_tech:
                question = (
                    f"You specifically highlighted working with {detected_tech.upper()}. "
                    f"In that implementation, how did you handle edge cases such as concurrency, failure recovery, "
                    f"or high-throughput bottlenecks? What metrics did you use to validate that the solution was robust?"
                )
            else:
                question = (
                    f"You described the high-level workflow. Let's drill into the fundamentals: "
                    f"What was the time and space complexity of your primary data operations, and how would you optimize "
                    f"it if the dataset or user base grew by an order of magnitude?"
                )
        else:
            # Advance to Situational
            next_round = "situational"
            question = (
                f"Great technical discussion. Now entering Round 3: Situational & Problem-Solving. "
                f"Scenario: Imagine you deployed a critical feature to production for our {session_data.get('target_domain', 'Core')} service. "
                f"Within 15 minutes, end-user error rates spike to 12% and API response latency jumps by 400%. "
                f"What is your step-by-step methodology to triage, communicate, mitigate, and conduct a post-mortem?"
            )
            
    elif current_round == "situational":
        if round_turn_count == 0 and ("rollback" not in answer_lower and "monitoring" not in answer_lower):
            # Dynamic follow-up if candidate missed observability or rollback
            is_follow_up = True
            question = (
                f"You laid out a mitigation strategy. How do you balance the trade-off between immediately rolling back "
                f"versus keeping the system live to inspect telemetry, logs, and capture crash dumps?"
            )
        else:
            # Advance to Behavioural (STAR)
            next_round = "behavioural"
            question = (
                f"Very methodical. Let's proceed to our final stage, Round 4: Behavioural Assessment. "
                f"Using the STAR format (Situation, Task, Action, Result), tell me about a time you committed to an ambitious "
                f"technical deadline, faced unexpected blockers, and how you managed stakeholder expectations to deliver impact."
            )
            
    elif current_round == "behavioural":
        if round_turn_count == 0 and not eval_result["star_analysis"]["result"]:
            # Follow-up: candidate didn't mention the Result
            is_follow_up = True
            question = (
                f"You clearly outlined the Situation, Task, and your Action. What was the measurable Result or quantitative outcome "
                f"of your initiative, and what is the key lesson you carry into your next engineering role?"
            )
        else:
            # Complete the interview
            next_round = "completed"
            question = (
                f"Thank you, {session_data.get('candidate_name', 'there')}! You have successfully completed all four rounds "
                f"of the interview. I am compiling your comprehensive, evidence-based feedback report, rubric scoring, "
                f"and Responsible AI audit summary right now."
            )
            
    return {
        "question": question,
        "is_follow_up": is_follow_up,
        "new_round": next_round,
        "feedback": eval_result
    }

def call_gemini_or_openai(
    api_key: str, 
    session_data: Dict[str, Any], 
    current_round: str, 
    last_answer: str, 
    round_turn_count: int
) -> Optional[Dict[str, Any]]:
    """Helper to query Gemini API if API key is provided."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = (
            f"You are an expert Responsible AI Interviewer conducting a mock interview for role: {session_data.get('target_role')}. "
            f"Candidate background: College: {session_data.get('college')}, Studies: {session_data.get('studies')}, "
            f"Skills: {session_data.get('skills')}, Hobbies: {session_data.get('hobbies')}. "
            f"Current Round: {current_round}. Turn count in this round: {round_turn_count}. "
            f"Candidate's previous response: \"{last_answer}\".\n"
            f"Instruction: Generate the next interview question. If the candidate's answer was interesting or missed details, "
            f"ask an adaptive follow-up. If it is time to move to the next round, transition professionally. "
            f"Output strictly valid JSON with keys: \"question\" (string), \"is_follow_up\" (bool), \"new_round\" (one of: 'hr', 'technical', 'situational', 'behavioural', 'completed')."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
    except Exception:
        pass
    return None
