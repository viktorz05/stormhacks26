from dataclasses import dataclass, field

from .models import State
from .state import can_move


@dataclass
class Session:
    id: str
    state: State = State.IDLE
    persona: str = "butler"
    task: str | None = None
    snoozes_used: int = 0
    history: list[dict] = field(default_factory=list)

    def move(self, new: State) -> bool:
        if can_move(self.state, new):
            self.state = new
            return True
        return False


sessions: dict[str, Session] = {}


def get_session(sid: str) -> Session:
    return sessions.setdefault(sid, Session(id=sid))
