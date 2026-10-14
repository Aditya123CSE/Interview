import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_PATH = os.environ.get("INTERVIEW_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "interview.db"))

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        candidate_name TEXT,
        college TEXT,
        studies TEXT,
        target_role TEXT,
        target_domain TEXT,
        skills TEXT,
        hobbies TEXT,
        current_round TEXT DEFAULT 'greeting',
        overall_score REAL DEFAULT 0.0,
        report_json TEXT,
        bias_check_passed INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    )
    """)
    
    # Transcripts & Evaluations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        round_name TEXT,
        role TEXT,
        content TEXT,
        is_follow_up INTEGER DEFAULT 0,
        evaluation_json TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    )
    """)
    
    conn.commit()
    conn.close()

def create_session(session_id: str, candidate_name: str, college: str, studies: str, 
                   target_role: str, target_domain: str, skills: List[str], hobbies: List[str]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (id, candidate_name, college, studies, target_role, target_domain, skills, hobbies, current_round)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'greeting')
    """, (
        session_id,
        candidate_name,
        college,
        studies,
        target_role,
        target_domain,
        json.dumps(skills),
        json.dumps(hobbies)
    ))
    conn.commit()
    conn.close()
    return get_session(session_id)

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["skills"] = json.loads(data["skills"]) if data["skills"] else []
    data["hobbies"] = json.loads(data["hobbies"]) if data["hobbies"] else []
    if data["report_json"]:
        try:
            data["report_json"] = json.loads(data["report_json"])
        except Exception:
            pass
    return data

def update_session_round(session_id: str, round_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET current_round = ? WHERE id = ?", (round_name, session_id))
    conn.commit()
    conn.close()

def save_message(session_id: str, round_name: str, role: str, content: str, 
                 is_follow_up: bool = False, evaluation: Optional[Dict[str, Any]] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages (session_id, round_name, role, content, is_follow_up, evaluation_json)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        round_name,
        role,
        content,
        1 if is_follow_up else 0,
        json.dumps(evaluation) if evaluation else None
    ))
    conn.commit()
    conn.close()

def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d["evaluation_json"]:
            try:
                d["evaluation_json"] = json.loads(d["evaluation_json"])
            except Exception:
                pass
        result.append(d)
    return result

def complete_session(session_id: str, overall_score: float, report_json: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE sessions 
        SET current_round = 'completed',
            overall_score = ?,
            report_json = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (overall_score, json.dumps(report_json), session_id))
    conn.commit()
    conn.close()

def get_candidate_history(candidate_name: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, candidate_name, target_role, target_domain, overall_score, current_round, created_at, completed_at, report_json
        FROM sessions 
        WHERE LOWER(candidate_name) = LOWER(?)
        ORDER BY created_at ASC
    """, (candidate_name,))
    rows = cursor.fetchall()
    conn.close()
    history = []
    for r in rows:
        d = dict(r)
        if d.get("report_json"):
            try:
                d["report_json"] = json.loads(d["report_json"])
            except Exception:
                pass
        history.append(d)
    return history
