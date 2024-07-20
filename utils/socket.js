let audioContext, stream, source, processor, websocket;
websocket = new WebSocket('ws://0.0.0.0:10001');
async function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
        .then(stream => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            source = audioContext.createMediaStreamSource(stream);
            processor = audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);



            websocket.onopen = async function () {
                await sendJSON({ role: 'user', type: 'audio', format: 'bytes.wav', start: true });
            };

            processor.onaudioprocess = function (event) {
                if (isKeyDown) {
                    let inputData = event.inputBuffer.getChannelData(0);
                    let int16Array = convertFloat32ToInt16(inputData);
                    websocket.send(int16Array.buffer);
                }
            };
        })
        .catch(error => console.error('Error accessing audio devices:', error));

    function convertFloat32ToInt16(buffer) {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.max(-1, Math.min(1, buffer[l])) * 0x7FFF;
        }
        return buf;
    }


}

async function sendJSON(data) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(data));
    }
}

async function stopRecording() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        await sendJSON({ role: 'user', type: 'audio', format: 'bytes.wav', end: true });
        // websocket.close();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (processor) {
        processor.disconnect();
    }
    if (source) {
        source.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }
}
