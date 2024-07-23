const container = document.querySelector('.recorder');
const text = document.querySelector('.text');
const loader = document.getElementById('loader');






let isKeyDown = false;
let isTaskRunning = false;
let stream, source, processor, analyser, dataArray, bufferLength;

let holdTimeout;
const audio1 = new Audio('./pip.mp3');
const audio2 = new Audio('./pop.mp3');

// Threshold level to ignore small disturbances
const THRESHOLD = 5;

async function startHoldAction() {
    if (!isKeyDown && !isTaskRunning) {
        isKeyDown = true;
        isTaskRunning = true;
        console.log("Action started");
        text.innerHTML = `
                <div class="music-waves">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>`;
        audio1.play();
        await startRecording();
        animateBars();

        container.innerHTML = `
                <div class="recorder-container">
                    <div class="outer"></div>
                    <div class="outer-2"></div>
                    <div class="icon-microphone" tabindex="0">•</div>
                </div>`;
        attachEventListeners();
        isTaskRunning = false;
    }
}

// Function to stop the hold action
async function stopHoldAction() {
    if (isKeyDown && !isTaskRunning) {
        isKeyDown = false;
        isTaskRunning = true;
        console.log("Action stopped");
        text.textContent = "Loading ....";
        audio2.play();

        container.innerHTML = `
                <div class="recorder-container">
                    <div class="loading"></div>
                    <div class="icon-microphone" tabindex="0">•</div>
                </div>`;
        attachEventListeners();
        await stopRecording();

        // await delay(2000);
        // text.textContent = "Speaking ....";
        // container.innerHTML = `
        //     <div class="music-waves">
        //         <span></span>
        //         <span></span>
        //         <span></span>
        //         <span></span>
        //         <span></span>
        //         <span></span>
        //         <span></span>
        //     </div>`;
        // animateBars();

        // await delay(2000);
        // container.innerHTML = `
        //     <div class="recorder-container">
        //         <div class="icon-microphone" tabindex="0">•</div>
        //     </div>`;
        // text.textContent = "Hold to speak";

        // attachEventListeners();
        // isTaskRunning = false;
        clearTimeout(holdTimeout);
    }
}

function attachEventListeners() {
    const rec = container.querySelector('.icon-microphone');
    if (rec) {
        rec.addEventListener("mousedown", () => {
            holdTimeout = setTimeout(startHoldAction, 300); // Adjust the delay time as needed
        });
        rec.addEventListener("touchstart", () => {
            holdTimeout = setTimeout(startHoldAction, 300); // Adjust the delay time as needed
        });

        rec.addEventListener("mouseup", () => {
            clearTimeout(holdTimeout);
            if (isKeyDown) {
                stopHoldAction();
            }
        });
        rec.addEventListener("touchend", () => {
            clearTimeout(holdTimeout);
            if (isKeyDown) {
                stopHoldAction();
            }
        });
    }
}

attachEventListeners();

document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        holdTimeout = setTimeout(startHoldAction, 300); // Adjust the delay time as needed
    }
});

document.addEventListener("keyup", (event) => {
    clearTimeout(holdTimeout);
    if (isKeyDown) {
        stopHoldAction();
    }
});

async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        source = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        source.connect(processor);
        processor.connect(audioContext.destination);
        source.connect(analyser);

        if (websocket && websocket.readyState === WebSocket.OPEN) {
            await sendJSON({ role: 'user', type: 'audio', format: 'bytes.wav', start: true });
        }

        processor.onaudioprocess = (event) => {
            if (isKeyDown) {
                let inputData = event.inputBuffer.getChannelData(0);
                let int16Array = convertFloat32ToInt16(inputData);
                websocket.send(int16Array.buffer);
            }
        };
    } catch (error) {
        console.error('Error accessing audio devices:', error);
    }
}

function convertFloat32ToInt16(buffer) {
    let l = buffer.length;
    let buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.max(-1, Math.min(1, buffer[l])) * 0x7FFF;
    }
    return buf;
}

async function sendJSON(data) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(data));
    }
}

async function stopRecording() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        await sendJSON({ role: 'user', type: 'audio', format: 'bytes.wav', end: true });
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
        await audioContext.close();
    }
}

function animateBars() {
    const bars = document.querySelectorAll('.music-waves span');
    if (bars.length > 0 && analyser) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < bars.length; i++) {
            let height = dataArray[i] / 2;
            if (height > THRESHOLD) {
                bars[i].style.height = `${height}%`;
            } else {
                bars[i].style.height = `0%`;
            }
        }
        if (isKeyDown) {
            requestAnimationFrame(animateBars);
        }
    }
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let websocket;
let audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });;
let playbackStream, playbackSource, playbackProcessor;
let audioChunks = [];

function connectWebSocket() {
    websocket = new WebSocket(socketURL);

    websocket.onopen = async () => {
        console.log('WebSocket connection established.');
        const loader = document.getElementById("loader");
        const ball = loader.querySelector("i");
        await delay(1000);
        loader.classList.add("move-to-center");

        await delay(200);
        loader.classList.add("scale-up");
        await delay(100);

        container.classList.remove('hidden');
        loader.classList.add('hidden');
        text.textContent = "Hold to speak"

    };




    websocket.onclose = (event) => {
        console.log('WebSocket connection closed. Reconnecting...', event);
        setTimeout(connectWebSocket, 2000); // Try to reconnect every 2 seconds

    };

    websocket.onerror = (event) => {
        console.error('WebSocket error observed:', event);
        // websocket.close(); // Close the WebSocket connection on error
    };

    websocket.onmessage = (event) => {
        // console.log('Message from server:', event.);
        handleMessage(event);
    };
}


// Function to handle the received WebSocket message
async function handleMessage(event) {
    // console.log(event.data);
    // await delay(2000);
    text.textContent = "Speaking ....";
    container.innerHTML = `
                <div class="music-waves">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>`;
    animateBars();
    let parsedData = JSON.parse(event.data);
    console.log(parsedData.content)

    if (parsedData.content === "complete") {
        // await delay(2000);
        container.innerHTML = `
                <div class="recorder-container">
                    <div class="icon-microphone" tabindex="0">•</div>
                </div>`;
        text.textContent = "Hold to speak";

        attachEventListeners();
        isTaskRunning = false;
    }

    // if (event.data instanceof Blob) {
    //     // Handle Blob data
    //     let reader = new FileReader();
    //     reader.onload = function() {
    //         let arrayBuffer = reader.result;

    //         // Handle binary audio data
    //         audioChunks.push(arrayBuffer); // Collect audio data chunks

    //         // Play the received audio
    //         let audioData = new Int16Array(arrayBuffer);
    //         let audioBuffer = audioContext.createBuffer(1, audioData.length, 16000);

    //         // Convert Int16Array to Float32Array
    //         let float32Array = new Float32Array(audioData.length);
    //         for (let i = 0; i < audioData.length; i++) {
    //             float32Array[i] = audioData[i] / 0x7FFF;
    //         }

    //         audioBuffer.copyToChannel(float32Array, 0, 0);

    //         let playbackSource = audioContext.createBufferSource();
    //         playbackSource.buffer = audioBuffer;
    //         playbackSource.connect(audioContext.destination);
    //         playbackSource.start();
    //     };

    //     reader.readAsArrayBuffer(event.data);
    // } else {
    //     console.log("Received unsupported data type");
    // }
}

// // Function to save the accumulated audio data as a file
// function saveAudio() {
//     if (audioChunks.length > 0) {
//         let blob = new Blob(audioChunks, { type: 'audio/wav' });
//         let url = URL.createObjectURL(blob);
//         let a = document.createElement('a');
//         a.style.display = 'none';
//         a.href = url;
//         a.download = 'received_audio.wav';
//         document.body.appendChild(a);
//         a.click();
//         URL.revokeObjectURL(url);
//     }
// }







// for the overla y
let socketURL;

document.addEventListener('DOMContentLoaded', () => {
    const showOverlayButton = document.getElementById('show-overlay');
    const closeOverlayButton = document.getElementById('close-overlay');
    const overlay = document.getElementById('overlay');
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    let editMode = false;
    let currentEditLi = null;

    // Load saved tasks from local storage
    loadTasks();

    showOverlayButton.addEventListener('click', () => {
        overlay.style.display = 'flex';
    });

    closeOverlayButton.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = input.value.trim();
        if (taskText !== '') {
            if (editMode) {
                updateTask(taskText);
            } else {
                addTask(taskText);
            }
            input.value = '';
            saveTasks();
        }
    });

    function addTask(taskText, selected = false) {
        const li = document.createElement('li');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'todo-item';
        radio.checked = selected;
        const span = document.createElement('span');
        span.textContent = taskText;

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';

        radio.addEventListener('change', saveTasks);
        editBtn.addEventListener('click', () => enableEditMode(li, span));
        deleteBtn.addEventListener('click', () => deleteTask(li));

        li.appendChild(radio);
        li.appendChild(span);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        todoList.appendChild(li);
    }

    function enableEditMode(li, span) {
        editMode = true;
        currentEditLi = li;
        input.value = span.textContent;
        input.focus();
    }

    function updateTask(newText) {
        const span = currentEditLi.querySelector('span');
        span.textContent = newText;
        editMode = false;
        currentEditLi = null;
        saveTasks();
    }

    function deleteTask(li) {
        li.remove();
        saveTasks();
    }

    function saveTasks() {
        const tasks = [];
        const items = todoList.getElementsByTagName('li');
        for (let item of items) {
            const task = {
                text: item.querySelector('span').textContent,
                selected: item.querySelector('input[type="radio"]').checked
            };
            tasks.push(task);
        }
        localStorage.setItem('todo-tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('todo-tasks') || '[]');
        for (let task of tasks) {
            addTask(task.text, task.selected);
            if (task.selected) {
                socketURL = task.text
                connectWebSocket();
            }
        }
    }
});









let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;
      // Update UI notify the user they can install the PWA
      document.getElementById('install-button').style.display = 'block';
    });

    document.getElementById('install-button').addEventListener('click', async () => {
      // Hide the app provided install promotion
      document.getElementById('install-button').style.display = 'none';
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
    });