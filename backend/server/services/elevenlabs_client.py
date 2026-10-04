import asyncio
import json
import base64
import websockets
from typing import AsyncGenerator
from app.config import settings

class ElevenLabsStreamer:
    def __init__(self, voice_id: str = settings.DEFAULT_VOICE_ID):
        self.voice_id = voice_id
        self.uri = (
            f"wss://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/stream-input"
            f"?model_id=eleven_turbo_v2_5&output_format=pcm_24000"
        )

    async def stream_text_to_audio(self, text_stream: AsyncGenerator[str, None]) -> AsyncGenerator[bytes, None]:
        headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}
        
        async with websockets.connect(self.uri, extra_headers=headers) as el_ws:
            # 1. Send Initial Handshake Frame
            bos_message = {
                "text": " ",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                "generation_config": {"chunk_length_schedule": [50, 100, 150]}
            }
            await el_ws.send(json.dumps(bos_message))

            # 2. Async Listener Task to receive audio from ElevenLabs
            audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

            async def listen_from_elevenlabs():
                try:
                    async for message in el_ws:
                        data = json.loads(message)
                        if data.get("audio"):
                            raw_audio = base64.b64decode(data["audio"])
                            await audio_queue.put(raw_audio)
                        if data.get("isFinal"):
                            break
                except Exception as e:
                    print(f"[ElevenLabs Error] {e}")
                finally:
                    await audio_queue.put(None)  # Sentinel to close reader loop

            listener_task = asyncio.create_task(listen_from_elevenlabs())

            # 3. Stream incoming text to ElevenLabs
            async for chunk in text_stream:
                if chunk:
                    payload = {"text": chunk, "try_trigger_generation": True}
                    await el_ws.send(json.dumps(payload))

            # Send empty text frame to signal End Of Sequence
            await el_ws.send(json.dumps({"text": ""}))

            # 4. Yield generated audio back to caller
            while True:
                audio_chunk = await audio_queue.get()
                if audio_chunk is None:
                    break
                yield audio_chunk

            await listener_task