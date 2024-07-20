// Select the recorder container element
const container = document.querySelector('.recorder');
const text = document.querySelector('.text');

// Variable to keep track of whether the key is being held down
let isKeyDown = false;
let audioContext, stream, source, processor, websocket;
websocket = new WebSocket('ws://0.0.0.0:10001');
// Function to start the hold action
async function startHoldAction() {
    if (!isKeyDown) {
        isKeyDown = true;
        console.log("Action started");
        text.textContent = "Listening ...."
        
        // Start the hold action here, e.g., start recording or another action
        container.innerHTML = `
            <div class="recorder-container">
                <div class="outer"></div>
                <div class="outer-2"></div>
                <div class="icon-microphone" tabindex="0">•</div>
            </div>
        `;
        attachEventListeners(); // Reattach event listeners to new elements
        await startRecording();
    }
}

// Function to stop the hold action
async function stopHoldAction() {
    if (isKeyDown) {
        isKeyDown = false;
        console.log("Action stopped");
        text.textContent = "Loading ...."
       
        // Stop the hold action here, e.g., stop recording or another action
        container.innerHTML = `
            <div class="recorder-container">
                <div class="loading"></div>
                <div class="icon-microphone" tabindex="0">•</div>
            </div>
        `;
        attachEventListeners(); // Reattach event listeners to new elements
        await stopRecording();
        // Example usage with delay
        await delay(2000); // Wait for 2 seconds
        text.textContent = "Speaking ...."
        container.innerHTML = `
            <div class="music-waves">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        await delay(5000);
        container.innerHTML = `
            <div class="recorder-container">
                <div class="icon-microphone" tabindex="0">•</div>
            </div>
        `;
        text.textContent = "Hold to speak"

        attachEventListeners(); // Reattach event listeners to new elements
    }
}

// Function to attach event listeners to elements
function attachEventListeners() {
    const rec = container.querySelector('.icon-microphone');
    if (rec) {
        // Add event listener for mousedown event
        rec.addEventListener("mousedown", startHoldAction);
        rec.addEventListener("touchstart", startHoldAction);

        // Add event listener for mouseup event
        rec.addEventListener("mouseup", stopHoldAction);
        rec.addEventListener("touchend", stopHoldAction);
    }
}

// Initial attachment of event listeners
attachEventListeners();

// Add event listener for keydown event
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        startHoldAction();
    }
});

// Add event listener for keyup event
document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
        stopHoldAction();
    }
});
// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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




