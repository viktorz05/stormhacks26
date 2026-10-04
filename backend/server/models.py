from enum import Enum

from pydantic import BaseModel


class State(str, Enum):
    IDLE = "idle"
    ARMED = "armed"
    RINGING = "ringing"
    NEGOTIATING = "negotiating"
    VERIFYING = "verifying"
    RESOLVED = "resolved"


# client -> server
class ClientMsg(BaseModel):
    type: str  # "arm" | "user_text" | "frame" | "dismiss_request"
    text: str | None = None
    image_b64: str | None = None
    alarm_time: str | None = None


# server -> client
class ServerMsg(BaseModel):
    type: str  # "state" | "ai_text_chunk" | "challenge" | "verdict"
    state: State | None = None
    text: str | None = None
    task: str | None = None
    deadline_sec: int | None = None
    passed: bool | None = None
