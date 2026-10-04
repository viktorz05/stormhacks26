import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.services.elevenlabs_client import ElevenLabsStreamer

app = FastAPI(title="WakeUp Call Orchestrator")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "WakeUp Call Orchestrator"}

# ---------------------------------------------------------
# TASK 1: Raw Audio Echo Endpoint (Client Test)
# ---------------------------------------------------------
@app.websocket("/ws/echo")
async def websocket_audio_echo(websocket: WebSocket):
    """
    Receives raw audio (binary bytes or text frames) from client
    and echoes it straight back to verify stream connection.
    """
    await websocket.accept()
    print("[Echo WS] Client connected.")
    try:
        while True:
            # Accepts binary PCM audio chunks or string frames
            message = await websocket.receive()
            if "bytes" in message:
                await websocket.send_bytes(message["bytes"])
            elif "text" in message:
                await websocket.send_text(f"Echo: {message['text']}")
    except WebSocketDisconnect:
        print("[Echo WS] Client disconnected.")

# ---------------------------------------------------------
# TASK 2: ElevenLabs Dummy Stream Test
# ---------------------------------------------------------
@app.websocket("/ws/tts-test")
async def websocket_tts_test(websocket: WebSocket):
    """
    Pipes dummy persona dialogue to ElevenLabs API and streams
    the resulting PCM audio back to the frontend client over WS.
    """
    await websocket.accept()
    print("[TTS Test WS] Client connected.")
    
    try:
        # Dummy system prompt response from alarm persona
        dummy_dialogue = [
            "Wake up right now! ",
            "You have requested extra snooze time, ",
            "but you haven't shown me your water bottle yet! ",
            "Get out of bed immediately!"
        ]

        async def generate_dummy_text():
            for line in dummy_dialogue:
                yield line
                await asyncio.sleep(0.3)  # Simulate streaming text generation from LLM

        streamer = ElevenLabsStreamer()
        
        # Stream audio from ElevenLabs back to browser client as binary PCM frames
        async for pcm_chunk in streamer.stream_text_to_audio(generate_dummy_text()):
            await websocket.send_bytes(pcm_chunk)
            
        await websocket.send_text('{"event": "stream_end"}')

    except WebSocketDisconnect:
        print("[TTS Test WS] Client disconnected.")
    except Exception as e:
        print(f"[TTS Test Error] {e}")
        await websocket.close()