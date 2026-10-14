import re
import io
from typing import Dict, Any, List

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

KNOWN_COLLEGES = [
    "Poornima College of Engineering",
    "Poornima University",
    "Poornima Institute of Engineering and Technology",
    "Indian Institute of Technology",
    "National Institute of Technology",
    "Birla Institute of Technology and Science",
    "Delhi Technological University",
    "Rajasthan Technical University",
    "Vellore Institute of Technology",
    "Manipal Institute of Technology",
    "SRM Institute of Science and Technology",
    "College of Engineering",
    "University of Delhi",
    "Amity University"
]

SKILL_KEYWORDS = [
    # Languages
    "python", "javascript", "typescript", "c++", "c#", "java", "golang", "go", "rust", "sql", "html", "css", "php", "ruby", "swift", "kotlin",
    # Frameworks / Libraries
    "react", "react.js", "next.js", "vue", "angular", "node.js", "express", "fastapi", "django", "flask", "spring boot", "tailwind css", "bootstrap",
    # Databases & Caching
    "postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis", "cassandra", "dynamodb", "elasticsearch",
    # Tools & DevOps
    "git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "ci/cd", "jenkins", "terraform", "nginx",
    # AI / ML / Data
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "data science",
    # Core CS
    "data structures", "algorithms", "dsa", "object-oriented programming", "oops", "operating systems", "dbms", "computer networks", "system design"
]

HOBBY_KEYWORDS = [
    "chess", "competitive programming", "open source", "robotics", "photography", "blogging", 
    "gaming", "game development", "badminton", "cricket", "football", "reading", "tech writing", 
    "podcasting", "music production", "guitar", "piano", "hackathons", "cycling", "swimming", 
    "travelling", "hiking", "3d modeling", "ui/ux design", "sketching", "astronomy"
]

DEGREE_PATTERNS = [
    r"B\.?Tech(?:nology)?(?:\s+in\s+([A-Za-z\s]+))?",
    r"B\.?E\.?(?:\s+in\s+([A-Za-z\s]+))?",
    r"M\.?Tech(?:nology)?(?:\s+in\s+([A-Za-z\s]+))?",
    r"B\.?C\.?A\.?",
    r"M\.?C\.?A\.?",
    r"Bachelor\s+of\s+Technology(?:\s+in\s+([A-Za-z\s]+))?",
    r"Bachelor\s+of\s+Science(?:\s+in\s+([A-Za-z\s]+))?",
    r"Master\s+of\s+Science(?:\s+in\s+([A-Za-z\s]+))?",
    r"B\.?S\.?(?:\s+in\s+([A-Za-z\s]+))?",
]

def extract_text_from_pdf(file_bytes: bytes) -> str:
    if not PdfReader:
        raise RuntimeError("pypdf is not installed")
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)

def extract_text_from_docx(file_bytes: bytes) -> str:
    if not docx:
        raise RuntimeError("python-docx is not installed")
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

def parse_resume_text(text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_lower = text.lower()
    
    # 1. Candidate Name Detection
    candidate_name = "Candidate"
    for line in lines[:8]:
        # Filter out email, phone, links, common headers
        if any(w in line.lower() for w in ["resume", "curriculum", "email", "phone", "github", "linkedin", "page", "http", "@"]):
            continue
        cleaned = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = cleaned.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if len(w) > 1):
            candidate_name = cleaned
            break
    if candidate_name == "Candidate" and lines:
        cleaned = re.sub(r'[^a-zA-Z\s]', '', lines[0]).strip()
        if cleaned:
            candidate_name = cleaned

    # 2. College / University Detection
    college = "Engineering College / University"
    for known in KNOWN_COLLEGES:
        if known.lower() in full_lower:
            college = known
            break
    if college == "Engineering College / University":
        college_match = re.search(r"([A-Z][A-Za-z\s&]+(?:College|Institute|University|Faculty)\s*(?:of\s+[A-Za-z\s]+)?)", text)
        if college_match:
            cand = college_match.group(1).strip()
            if len(cand) < 60:
                college = cand

    # 3. Studies / Degree Detection
    studies = "B.Tech in Computer Science & Engineering"
    for deg in DEGREE_PATTERNS:
        match = re.search(deg, text, re.IGNORECASE)
        if match:
            studies = match.group(0).strip()
            # Clean up trailing spaces or punctuation
            studies = re.sub(r'\s+', ' ', studies)
            break
    if "computer science" in full_lower and "computer science" not in studies.lower():
        studies += " (Computer Science)"

    # 4. Skills Extraction
    found_skills = []
    for skill in SKILL_KEYWORDS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, full_lower):
            display_skill = skill.title()
            if skill.lower() in ["c++", "c#", "ci/cd", "ui/ux", "sql", "aws", "gcp", "nlp", "dsa", "oops", "dbms"]:
                display_skill = skill.upper()
            elif skill.lower() in ["react.js", "next.js", "vue.js", "node.js"]:
                display_skill = skill
            if display_skill not in found_skills:
                found_skills.append(display_skill)
    if not found_skills:
        found_skills = ["Python", "Data Structures", "Algorithms", "Git", "SQL"]

    # 5. Hobbies / Interests Extraction (As required by user!)
    found_hobbies = []
    # Check explicitly around "Hobbies", "Interests", "Extracurricular" sections
    hobby_section_match = re.search(r"(?:hobbies|interests|extracurriculars|activities|passions)[\s:]*([^\n\r]+(?:\n[^\n\r]+){1,4})", full_lower)
    if hobby_section_match:
        section_text = hobby_section_match.group(1)
        for h in HOBBY_KEYWORDS:
            if h in section_text and h.title() not in found_hobbies:
                found_hobbies.append(h.title())
    
    # Also check full text for known hobbies
    for h in HOBBY_KEYWORDS:
        pattern = r'\b' + re.escape(h) + r'\b'
        if re.search(pattern, full_lower):
            h_title = h.title()
            if h_title not in found_hobbies:
                found_hobbies.append(h_title)
    if not found_hobbies:
        found_hobbies = ["Competitive Programming", "Open Source", "Tech Blogging"]

    # 6. Projects Extraction (Detect project titles & tech stack)
    projects = []
    project_matches = re.findall(r'(?:Project|PROJECT)[\s:]*([^\n\r]+)', text)
    if project_matches:
        for p in project_matches[:3]:
            cleaned_p = p.strip()
            if len(cleaned_p) > 3 and len(cleaned_p) < 80:
                projects.append(cleaned_p)
    if not projects:
        projects = ["Full Stack Web Application", "AI-Powered Automation System"]

    return {
        "candidate_name": candidate_name,
        "college": college,
        "studies": studies,
        "skills": found_skills,
        "hobbies": found_hobbies,
        "projects": projects,
        "raw_text_length": len(text)
    }

def parse_uploaded_file(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    fn = filename.lower()
    if fn.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif fn.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        text = file_bytes.decode("utf-8", errors="ignore")
    return parse_resume_text(text)
