import os
import uuid
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import (
    init_db, create_session, get_session, update_session_round,
    save_message, get_session_messages, complete_session, get_candidate_history
)
from app.resume_parser import parse_uploaded_file, parse_resume_text
from app.interview_engine import generate_greeting_message, generate_next_question, ROUNDS
from app.responsible_ai import generate_final_report

# Initialize database schema
init_db()

app = FastAPI(
    title="Responsible AI Interview & Career Readiness Coach",
    description="Adaptive, evidence-based mock interview platform with responsible AI bias mitigation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ResumeTextScanRequest(BaseModel):
    text: str

class StartInterviewRequest(BaseModel):
    candidate_name: str
    college: str
    studies: str
    target_role: str
    target_domain: str
    skills: List[str]
    hobbies: List[str]
    api_key: Optional[str] = None

class CandidateResponseRequest(BaseModel):
    session_id: str
    answer: str
    api_key: Optional[str] = None

# API Endpoints
@app.post("/api/resume/scan")
async def scan_resume(file: Optional[UploadFile] = File(None), resume_text: Optional[str] = Form(None)):
    """Extracts candidate profile (skills, hobbies, college, studies) from uploaded resume or text."""
    try:
        if file:
            contents = await file.read()
            profile = parse_uploaded_file(file.filename, contents)
        elif resume_text:
            profile = parse_resume_text(resume_text)
        else:
            raise HTTPException(status_code=400, detail="Please upload a resume file or paste text.")
        return JSONResponse(content={"status": "success", "profile": profile})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.post("/api/resume/scan-text")
async def scan_resume_text(req: ResumeTextScanRequest):
    """Scans resume from raw text string."""
    try:
        profile = parse_resume_text(req.text)
        return JSONResponse(content={"status": "success", "profile": profile})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview/start")
async def start_interview(req: StartInterviewRequest):
    """Initializes session and generates the realistic first greeting message."""
    session_id = str(uuid.uuid4())[:8]
    session = create_session(
        session_id=session_id,
        candidate_name=req.candidate_name,
        college=req.college,
        studies=req.studies,
        target_role=req.target_role,
        target_domain=req.target_domain,
        skills=req.skills,
        hobbies=req.hobbies
    )
    
    greeting = generate_greeting_message(session)
    save_message(session_id=session_id, round_name="greeting", role="interviewer", content=greeting)
    
    return JSONResponse(content={
        "status": "success",
        "session_id": session_id,
        "greeting": greeting,
        "current_round": "greeting",
        "rounds": ROUNDS
    })

@app.post("/api/interview/respond")
async def respond_to_interviewer(req: CandidateResponseRequest):
    """Evaluates candidate response and adaptively generates the next question or follow-up."""
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    
    current_round = session["current_round"]
    if current_round == "completed":
        return JSONResponse(content={"status": "completed", "message": "Interview has already concluded."})
        
    messages = get_session_messages(req.session_id)
    # Count how many candidate turns in the current round
    round_turn_count = sum(1 for m in messages if m["round_name"] == current_round and m["role"] == "candidate")
    
    # Process next question & evaluation
    next_step = generate_next_question(
        session_data=session,
        current_round=current_round,
        last_candidate_answer=req.answer,
        round_turn_count=round_turn_count,
        api_key=req.api_key
    )
    
    # Save candidate's message with evaluation
    save_message(
        session_id=req.session_id,
        round_name=current_round,
        role="candidate",
        content=req.answer,
        is_follow_up=False,
        evaluation=next_step["feedback"]
    )
    
    # Update round
    new_round = next_step["new_round"]
    update_session_round(req.session_id, new_round)
    
    # Save interviewer's response
    save_message(
        session_id=req.session_id,
        round_name=new_round,
        role="interviewer",
        content=next_step["question"],
        is_follow_up=next_step["is_follow_up"]
    )
    
    is_completed = (new_round == "completed")
    report = None
    if is_completed:
        all_msgs = get_session_messages(req.session_id)
        report = generate_final_report(session, all_msgs)
        complete_session(req.session_id, report["overall_score"], report)
        
    return JSONResponse(content={
        "status": "success",
        "question": next_step["question"],
        "is_follow_up": next_step["is_follow_up"],
        "current_round": new_round,
        "feedback": next_step["feedback"],
        "is_completed": is_completed,
        "final_report": report
    })

@app.get("/api/interview/{session_id}/report")
async def get_session_report(session_id: str):
    """Retrieves the full evidence-based feedback report for a completed session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    messages = get_session_messages(session_id)
    report = generate_final_report(session, messages)
    return JSONResponse(content={"status": "success", "report": report, "messages": messages})

@app.get("/api/candidate/{candidate_name}/history")
async def get_history(candidate_name: str):
    """Fetches candidate's past practice sessions to demonstrate measurable improvement."""
    history = get_candidate_history(candidate_name)
    return JSONResponse(content={"status": "success", "history": history})

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Responsible AI Interview Coach", "version": "1.0.0"}

# Static Files & Dashboard UI
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
