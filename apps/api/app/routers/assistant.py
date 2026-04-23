from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.assistant_prompts import ask_gemini

router = APIRouter(prefix="/assistant", tags=["Assistant"])


class AssistantAskRequest(BaseModel):
    message: str = Field(..., min_length=2)
    module: str = "general"
    prompt_key: str = "general"
    context: dict[str, Any] | None = None


@router.post("/ask")
def ask_assistant(payload: AssistantAskRequest):
    return ask_gemini(
        message=payload.message.strip(),
        module=payload.module,
        prompt_key=payload.prompt_key,
        context=payload.context,
    )
