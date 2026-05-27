import json
import google.generativeai as genai
from django.conf import settings


def evaluate_candidate(candidate, job=None) -> dict:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    candidate_info = f"""Name: {candidate.full_name}
Email: {candidate.email or 'Not provided'}
Phone: {candidate.phone or 'Not provided'}
LinkedIn: {candidate.linkedin_url or 'Not provided'}
CV/Resume URL: {candidate.cv_url or 'Not provided'}
Recruiter notes: {candidate.notes or 'None'}
Current pipeline stage: {candidate.stage}"""

    if job:
        job_info = f"""Role: {job.title}
Department: {job.department}
Location: {job.location}
Description:
{job.description}"""
    else:
        job_info = "No specific job posting attached. Evaluate general professional suitability."

    prompt = f"""You are a senior technical recruiter with 15 years of experience evaluating candidates.

Candidate profile:
{candidate_info}

Position details:
{job_info}

Evaluate this candidate objectively. Respond with a single JSON object and nothing else (no markdown fences, no preamble). Use exactly these keys:

{{
  "score": <integer 0-100>,
  "verdict": "<strong_yes | yes | maybe | no>",
  "summary": "<2-3 sentence professional evaluation>",
  "strengths": ["<strength>", "<strength>", "<strength>"],
  "gaps": ["<gap>", "<gap>"],
  "interview_questions": ["<question>", "<question>", "<question>"]
}}

Scoring rubric: 80-100 = strong_yes, 60-79 = yes, 40-59 = maybe, 0-39 = no.
Base your score on the information available. If CV/LinkedIn URLs are provided but not accessible, note that in the summary."""

    response = model.generate_content(
        prompt,
        generation_config={"temperature": 0.3, "max_output_tokens": 1024},
    )

    text = response.text.strip()

    # Strip markdown fences if the model adds them despite instructions
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    data = json.loads(text)

    # Validate required keys are present
    required = {"score", "verdict", "summary", "strengths", "gaps", "interview_questions"}
    missing = required - set(data.keys())
    if missing:
        raise ValueError(f"Gemini response missing keys: {missing}")

    # Clamp score to valid range
    data["score"] = max(0, min(100, int(data["score"])))

    return data
