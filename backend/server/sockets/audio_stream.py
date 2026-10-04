import asyncio
import json
from dataclasses import dataclass
from fastapi import WebSocket, WebSocketDisconnect
from services.elevenlabs_client import ElevenLabsStreamer #[cite: 1, 3]

@dataclass
class SessionState:
    session_id: str
    persona: str = "Drill Sergeant"
    is_alarm_active: bool = True
    snooze_count: int = 0

# In-memory session state mapped by session_id
active_sessions: dict[str, SessionState] = {}

async def handle_audio_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Initialize session state tracking
    session = SessionState(session_id=session_id)
    active_sessions[session_id] = session
    
    print(f"[Orchestrator] Session {session_id} connected.")
    
    # Queues to manage duplex communication streams
    client_audio_queue = asyncio.Queue()
    llm_text_queue = asyncio.Queue() 
    
    streamer = ElevenLabsStreamer() #[cite: 1]

    # Task 1: Listen to the client asynchronously

    async def receive_from_client():
        try:
            while True:
                message = await websocket.receive()
                
                # Explicitly handle client disconnects
                if message.get("type") == "websocket.disconnect":
                    break
                    
                if "bytes" in message:
                    await client_audio_queue.put(message["bytes"])
                elif "text" in message:
                    data = json.loads(message["text"])
                    if data.get("event") == "stop_alarm":
                        session.is_alarm_active = False
        except WebSocketDisconnect:
            pass
        finally:
            print(f"[Orchestrator] Client {session_id} disconnected.")

    # Task 2: External API pipeline (LLM -> TTS)
    async def process_llm_and_tts():
        async def text_generator():
            while session.is_alarm_active:
                text = await llm_text_queue.get()
                if text is None:
                    break
                yield text
        
        try:
            # ElevenLabs Output: Streaming pcm_24000 back to client to avoid MP3 decoding overhead
            async for audio_chunk in streamer.stream_text_to_audio(text_generator()): #[cite: 1]
                await websocket.send_bytes(audio_chunk)
        except Exception as e:
            print(f"[TTS Pipeline Error] {e}")

    # Task 3: Dummy AI Response Feeder (Placeholder for Gemini)
    async def dummy_llm_feed():
        await asyncio.sleep(2)  # Wait for user to "speak"
        await llm_text_queue.put(f"[{session.persona}] I hear you trying to snooze! ")
        await asyncio.sleep(1)
        await llm_text_queue.put("Show me the item first before I let you sleep! ")
        await asyncio.sleep(5)
        await llm_text_queue.put(None) # Signal end of generation

    # Run concurrent asyncio tasks within the WebSocket connection context
    tasks = [
        asyncio.create_task(receive_from_client()),
        asyncio.create_task(process_llm_and_tts()),
        asyncio.create_task(dummy_llm_feed())
    ]
    
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass
    finally:
        active_sessions.pop(session_id, None)
        for t in tasks:
            t.cancel()
        print(f"[Orchestrator] Session {session_id} cleaned up.")