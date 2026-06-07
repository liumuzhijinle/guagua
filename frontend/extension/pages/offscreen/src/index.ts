import 'webextension-polyfill';

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') {
    return;
  }

  if (message.type === 'start-capturing') {
    startCapturing(message.data);
  } else if (message.type === 'stop-capturing') {
    stopCapturing();
  }
});

let mediaRecorder: MediaRecorder | null = null;
let socket: WebSocket | null = null;
let currentStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;

async function startCapturing(streamId: string) {
  // Defensive: stop any existing capture first, and wait for cleanup
  await stopCapturing();

  console.log('Starting capture with streamId:', streamId);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    currentStream = stream;

    // Handle audio context for playback (optional, but good for testing)
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(audioContext.destination);

    // Prepare WebSocket
    socket = new WebSocket('ws://localhost:8001/ws/audio');
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      console.log('WebSocket connected to 8001');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received subtitle:', data);
        chrome.runtime.sendMessage({
          type: 'new-subtitle',
          data: data,
        });
      } catch (e) {
        console.error('Error parsing socket message:', e);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    };

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
        event.data.arrayBuffer().then(buffer => {
          socket?.send(buffer);
        });
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    mediaRecorder.start(500); // Send every 500ms
  } catch (error: any) {
    console.error('Error capturing audio detailed:', error.name, error.message);
  }
}

async function stopCapturing(): Promise<void> {
  console.log('Stopping capture...');

  // 1. Stop MediaRecorder
  if (mediaRecorder) {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      // Wait a tick for the stop to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    mediaRecorder = null;
  }

  // 2. Close WebSocket
  if (socket) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    socket = null;
  }

  // 3. Stop and release media stream tracks
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
      console.log('Track stopped:', track.label);
    });
    currentStream = null;
  }

  // 4. Close AudioContext
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
    console.log('AudioContext closed');
  }
}
