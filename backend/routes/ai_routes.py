from groq import Groq
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from auth import get_current_user
from config import GROQ_API_KEY
import json

router = APIRouter()
client = Groq(api_key=GROQ_API_KEY)

# Groq available models
# llama-3.3-70b-versatile  → best quality
# llama-3.1-8b-instant     → fastest
# mixtral-8x7b-32768       → good for long context

MODEL = "llama-3.3-70b-versatile"
FAST_MODEL = "llama-3.1-8b-instant"


class MessageItem(BaseModel):
    sender: str
    text: str


class SmartReplyRequest(BaseModel):
    messages: List[MessageItem]


class SummarizeRequest(BaseModel):
    messages: List[MessageItem]


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class FixGrammarRequest(BaseModel):
    text: str


class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []


# ── 1. AI Chat ──
@router.post("/chat")
def ai_chat(
    data: AIChatRequest,
    current_user=Depends(get_current_user)
):
    messages = [
        {
            "role": "system",
            "content": """You are a helpful AI assistant inside a chat app called ChatApp.
Be friendly, concise, and helpful.
You can help with questions, writing, analysis, coding, translation, and more.
Keep responses short and clear unless detailed explanation is needed."""
        }
    ]

    for h in data.history[-20:]:
        role = h.get("role", "user")
        if role in ["user", "assistant"]:
            messages.append({
                "role": role,
                "content": h.get("content", "")
            })

    messages.append({
        "role": "user",
        "content": data.message
    })

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )

    return {"reply": response.choices[0].message.content.strip()}


# ── 2. Smart Reply ──
@router.post("/smart-reply")
def get_smart_replies(
    data: SmartReplyRequest,
    current_user=Depends(get_current_user)
):
    conversation = "\n".join([
        f"{m.sender}: {m.text}" for m in data.messages[-10:]
    ])

    response = client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You generate short chat reply suggestions. Return only valid JSON arrays."
            },
            {
                "role": "user",
                "content": f"""Based on this conversation suggest 3 short reply options.
Return ONLY a JSON array of 3 strings. No explanation. No markdown.
Example: ["Okay sure!", "Let me check", "Sounds good 👍"]

Conversation:
{conversation}"""
            }
        ],
        max_tokens=150,
        temperature=0.8
    )

    text = response.choices[0].message.content.strip()

    try:
        text = text.replace("```json", "").replace("```", "").strip()
        replies = json.loads(text)
        if not isinstance(replies, list):
            replies = ["👍 Okay!", "Sure!", "Let me check"]
    except Exception:
        replies = ["👍 Okay!", "Sure!", "Let me check"]

    return {"replies": replies}


# ── 3. Summarize Chat ──
@router.post("/summarize")
def summarize_chat(
    data: SummarizeRequest,
    current_user=Depends(get_current_user)
):
    if len(data.messages) < 3:
        raise HTTPException(
            status_code=400,
            detail="Need at least 3 messages to summarize"
        )

    conversation = "\n".join([
        f"{m.sender}: {m.text}"
        for m in data.messages
        if m.text
    ])

    response = client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You summarize chat conversations briefly."
            },
            {
                "role": "user",
                "content": f"""Summarize this chat in 2-3 bullet points.
Be very concise. Start each point with •

Conversation:
{conversation}"""
            }
        ],
        max_tokens=200,
        temperature=0.3
    )

    return {"summary": response.choices[0].message.content.strip()}


# ── 4. Translate ──
@router.post("/translate")
def translate_message(
    data: TranslateRequest,
    current_user=Depends(get_current_user)
):
    response = client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a translator. Return only the translated text, nothing else."
            },
            {
                "role": "user",
                "content": f"Translate to {data.target_language}:\n\n{data.text}"
            }
        ],
        max_tokens=500,
        temperature=0.1
    )

    return {"translated": response.choices[0].message.content.strip()}


# ── 5. Fix Grammar ──
@router.post("/fix-grammar")
def fix_grammar(
    data: FixGrammarRequest,
    current_user=Depends(get_current_user)
):
    response = client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You fix grammar and spelling. Return only the corrected text, nothing else."
            },
            {
                "role": "user",
                "content": f"Fix grammar and spelling:\n\n{data.text}"
            }
        ],
        max_tokens=300,
        temperature=0.1
    )

    return {"fixed": response.choices[0].message.content.strip()}


# ── 6. Tone Change ──
class ToneRequest(BaseModel):
    text: str
    tone: str


@router.post("/change-tone")
def change_tone(
    data: ToneRequest,
    current_user=Depends(get_current_user)
):
    response = client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You rewrite text in different tones. Return only the rewritten text."
            },
            {
                "role": "user",
                "content": f"Rewrite this text in a {data.tone} tone:\n\n{data.text}"
            }
        ],
        max_tokens=300,
        temperature=0.7
    )

    return {"result": response.choices[0].message.content.strip()}