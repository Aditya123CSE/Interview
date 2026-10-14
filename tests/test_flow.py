import os
import unittest
from fastapi.testclient import TestClient

# Point test db to temporary path
os.environ["INTERVIEW_DB_PATH"] = "/tmp/test_interview.db"

from app.database import init_db, create_session, get_session, save_message, get_session_messages, complete_session, get_candidate_history
from app.resume_parser import parse_resume_text
from app.responsible_ai import sanitize_for_bias_blind_evaluation, evaluate_response, generate_final_report
from app.interview_engine import generate_greeting_message, generate_next_question
from app.main import app

class TestResponsibleAICoach(unittest.TestCase):

    def setUp(self):
        init_db()
        self.client = TestClient(app)

    def test_resume_parser_extraction(self):
        sample = """
        ADITYA SHARMA
        Poornima College of Engineering, Jaipur
        Bachelor of Technology in Computer Science & Engineering (B.Tech CSE)
        Skills: Python, FastAPI, React, PostgreSQL, Docker, Redis, SQL
        Hobbies: Competitive Programming, Chess, Open Source
        Project: Smart Attendance System using FastAPI and React
        """
        parsed = parse_resume_text(sample)
        self.assertEqual(parsed["candidate_name"], "ADITYA SHARMA")
        self.assertIn("Poornima College of Engineering", parsed["college"])
        self.assertTrue("B.Tech" in parsed["studies"])
        self.assertTrue(any(s in parsed["skills"] for s in ["Python", "FastAPI", "React", "Docker"]))
        self.assertTrue(any(h in parsed["hobbies"] for h in ["Competitive Programming", "Chess", "Open Source"]))

    def test_responsible_ai_bias_sanitization(self):
        text_with_bias = "She is a young woman who showed good leadership and he agreed."
        sanitized = sanitize_for_bias_blind_evaluation(text_with_bias)
        self.assertNotIn("she", sanitized.lower())
        self.assertNotIn("woman", sanitized.lower())
        self.assertNotIn("he", sanitized.lower())

    def test_evidence_based_evaluation(self):
        question = "Can you explain how you designed your API caching architecture?"
        good_answer = (
            "In my project, when faced with high database latency (Situation), our objective was sub-100ms response times (Task). "
            "I implemented a distributed Redis cache layer with an allkeys-lru eviction policy and async database queries (Action). "
            "As a result, we reduced query latency by 45% and handled 500 requests per minute stably (Result)."
        )
        eval_result = evaluate_response(question, good_answer, "technical", "Software Engineer")
        self.assertGreaterEqual(eval_result["score"], 70)
        self.assertIn("metrics", eval_result)
        self.assertTrue(len(eval_result["evidence_cited"]) > 5)
        self.assertTrue(eval_result["responsible_ai_audit"]["bias_checked"])

    def test_greeting_generation(self):
        session_data = {
            "candidate_name": "Aditya Sharma",
            "college": "Poornima College of Engineering",
            "studies": "B.Tech Computer Science",
            "target_role": "Software Development Engineer (SDE 1)",
            "target_domain": "Fintech",
            "skills": ["Python", "FastAPI"],
            "hobbies": ["Chess"]
        }
        greeting = generate_greeting_message(session_data)
        self.assertIn("Hello Aditya Sharma", greeting)
        self.assertIn("Poornima College of Engineering", greeting)
        self.assertIn("Python", greeting)
        self.assertIn("Chess", greeting)

    def test_adaptive_dynamic_follow_up(self):
        session_data = {
            "candidate_name": "Aditya",
            "college": "Poornima College of Engineering",
            "target_role": "Backend Engineer",
            "skills": ["Python", "PostgreSQL"],
            "hobbies": ["Open Source"]
        }
        # In technical round, mentioning 'redis' triggers specialized caching follow-up
        tech_answer = "I built an API service and used Redis for caching."
        step = generate_next_question(session_data, "technical", tech_answer, round_turn_count=0)
        self.assertTrue(step["is_follow_up"])
        self.assertIn("REDIS", step["question"])

    def test_end_to_end_api_endpoints(self):
        # 1. Health check
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)

        # 2. Start Interview
        start_payload = {
            "candidate_name": "Test User",
            "college": "Poornima College of Engineering",
            "studies": "B.Tech CSE",
            "target_role": "SDE 1",
            "target_domain": "Cloud",
            "skills": ["Python", "FastAPI"],
            "hobbies": ["Chess"]
        }
        start_res = self.client.post("/api/interview/start", json=start_payload)
        self.assertEqual(start_res.status_code, 200)
        session_id = start_res.json()["session_id"]
        self.assertTrue(len(session_id) > 0)

        # 3. Respond
        resp_payload = {
            "session_id": session_id,
            "answer": "I am feeling confident. I have spent 4 years studying Computer Science at Poornima College and building scalable Python APIs."
        }
        resp_res = self.client.post("/api/interview/respond", json=resp_payload)
        self.assertEqual(resp_res.status_code, 200)
        self.assertIn("question", resp_res.json())
        self.assertIn("feedback", resp_res.json())

        # 4. History
        hist_res = self.client.get("/api/candidate/Test User/history")
        self.assertEqual(hist_res.status_code, 200)
        self.assertGreaterEqual(len(hist_res.json()["history"]), 1)

if __name__ == "__main__":
    unittest.main()
