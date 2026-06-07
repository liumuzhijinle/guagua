import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
import io
import openai

app = FastAPI()

# --- 配置区 ---
# 从环境变量读取 API Key，使用前请设置: export DEEPSEEK_API_KEY="your-key"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")

print("Loading ASR model (tiny)...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("Model loaded.")

client = openai.OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

# 线程池，避免 ASR 阻塞 WebSocket 消息接收
executor = ThreadPoolExecutor(max_workers=1)


def transcribe_sync(audio_data: bytes):
    """同步转写，在线程池中运行"""
    segments, info = model.transcribe(
        io.BytesIO(audio_data),
        beam_size=5,
        language=None,
        vad_filter=True,
        condition_on_previous_text=False,  # 关键：不重复处理历史，大幅提速
    )
    text = ""
    for segment in segments:
        text += segment.text
    return text.strip(), info.language


async def translate_text_stream(text: str):
    if not text.strip():
        return
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是同声传译助手。将英文翻译成简洁地道的中文，只返回中文译文。"},
                {"role": "user", "content": text},
            ],
            stream=True,
            timeout=8.0,
        )
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        print(f"Translation Error: {e}")
        yield f"[错误]"


def _normalize(text: str) -> str:
    """标准化文本：转小写、去标点、合并空格"""
    import re
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)  # 去标点
    text = re.sub(r'\s+', ' ', text)     # 合并空格
    return text


def _get_incremental(old_text: str, new_text: str) -> str:
    """
    词级别模糊对比：找到 old 的末尾词在 new 中的位置，
    返回 new 中位于该位置之后的新增部分。
    容忍大小写、标点差异。
    """
    if not old_text:
        return new_text

    old_norm = _normalize(old_text)
    new_norm = _normalize(new_text)

    # 如果标准化后完全匹配，无增量
    if old_norm == new_norm:
        return ""

    old_words = old_norm.split()
    new_words = new_norm.split()

    # 从 old 末尾取 5 个词作为"锚点"，在 new 中搜索
    anchor_len = min(5, len(old_words))
    anchor = old_words[-anchor_len:]

    # 在 new_words 中找 anchor 的首次出现位置
    best_idx = -1
    for i in range(len(new_words) - anchor_len + 1):
        if new_words[i:i + anchor_len] == anchor:
            best_idx = i + anchor_len
            break

    if best_idx > 0 and best_idx < len(new_words):
        # 找到了锚点，取后面的词
        incremental_words = new_words[best_idx:]
        # 在原始 new_text 中定位
        # 简单策略：用标准化后的增量词数定位
        return " ".join(incremental_words)

    # 锚点匹配失败，退化为直接字符串对比
    if new_norm.startswith(old_norm):
        return new_text[len(old_text):].strip()

    # 完全不匹配，返回全部 new_text
    return new_text


@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")

    full_audio_data = bytearray()
    last_processed_len = 0
    last_text = ""
    processing = False

    try:
        while True:
            data = await websocket.receive_bytes()
            full_audio_data.extend(data)

            new_bytes = len(full_audio_data) - last_processed_len

            if new_bytes > 24000 and not processing:
                processing = True
                audio_snapshot = bytes(full_audio_data)  # 快照，避免并发修改

                try:
                    # ASR 在线程池中运行，不阻塞 WebSocket 接收
                    full_text, lang = await asyncio.get_event_loop().run_in_executor(
                        executor, transcribe_sync, audio_snapshot
                    )

                    # 词级别模糊对比，计算增量文本
                    incremental_text = _get_incremental(last_text, full_text)

                    if incremental_text:
                        print(f"ASR ({lang}): {full_text}")
                        print(f"  → New: {incremental_text}")

                        # 发送增量原文
                        await websocket.send_json({
                            "status": "original",
                            "text": incremental_text,
                        })

                        # 流式翻译
                        translated_parts = []
                        async for token in translate_text_stream(incremental_text):
                            translated_parts.append(token)
                            await websocket.send_json({
                                "status": "streaming",
                                "text": "".join(translated_parts),
                            })

                        await websocket.send_json({
                            "status": "final",
                            "original_text": incremental_text,
                            "translated_text": "".join(translated_parts),
                        })

                        last_text = full_text

                    last_processed_len = len(full_audio_data)

                    # 内存保护
                    if len(full_audio_data) > 32000 * 60 * 3:
                        full_audio_data = full_audio_data[-2000:]
                        last_processed_len = 0
                        last_text = ""

                except Exception as e:
                    if "Invalid data" not in str(e):
                        print(f"Transcribe Error: {e}")
                finally:
                    processing = False

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Global Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
