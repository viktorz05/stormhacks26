from .models import State

TRANSITIONS = {
    State.IDLE: {State.ARMED},
    State.ARMED: {State.RINGING, State.IDLE},
    State.RINGING: {State.NEGOTIATING, State.VERIFYING},
    State.NEGOTIATING: {State.VERIFYING, State.RINGING},
    State.VERIFYING: {State.RESOLVED, State.RINGING},
    State.RESOLVED: {State.IDLE},
}

def can_move(a: State, b: State) -> bool:
    return b in TRANSITIONS[a]
