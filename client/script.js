const bot = "/bot.svg";
const user = "/user.svg";

// DOM ELEMENTS
const uploadBox = document.getElementById("upload-box");
const filePreview = document.getElementById("file-preview");
const fileNameSpan = document.getElementById("file-name");
const removeFileBtn = document.getElementById("remove-file");
const fileInput = document.getElementById("fileInput");
const textarea = document.querySelector("textarea[name='prompt']");
const chatForm = document.querySelector("#chat-form");
const chatContainer = document.querySelector("#chat_container");
const stopBtn = document.getElementById("stop-btn");

let selectedFile = null;
let isBotResponding = false;
let loadInterval;
let shouldStop = false;

// ----------------------------
// FILE UPLOAD HANDLING
// ----------------------------

// Click opens file dialog
uploadBox.addEventListener("click", () => fileInput.click());

// Drag events
uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.classList.add("dragover");
});
uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragover");
});
uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});

// File select
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
});

// Remove file preview
removeFileBtn.addEventListener("click", clearFilePreviewUI);

// Show file preview
function handleFileSelect(file) {
    if (!file) return;

    selectedFile = file;
    fileNameSpan.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

    filePreview.classList.remove("hidden");
    uploadBox.style.display = "none";
}

// Clear preview UI
function clearFilePreviewUI() {
    filePreview.classList.add("hidden");
    fileNameSpan.textContent = "";
    uploadBox.style.display = "flex";
}

// ----------------------------
// LOADER + TYPEWRITER
// ----------------------------
function loader(element) {
    element.textContent = "";
    loadInterval = setInterval(() => {
        if (shouldStop) {
            clearInterval(loadInterval);
            return;
        }
        element.textContent += ".";
        if (element.textContent === "....") {
            element.textContent = "";
        }
    }, 300);
}

// 🔥 UPDATED typewriter with STOP support
function typeText(element, text) {
    let index = 0;
    shouldStop = false; // reset each time

    const interval = setInterval(() => {
        if (shouldStop) {
            clearInterval(interval);
            element.innerHTML += " <span style='opacity:0.5'>⏹️ Stopped</span>";
            stopBtn.classList.add("hidden");
            isBotResponding = false;
            return;
        }

        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
            stopBtn.classList.add("hidden");
            isBotResponding = false;
        }
    }, 20);
}

// ----------------------------
// SYSTEM MESSAGE (file uploaded)
// ----------------------------
function showChunksInfo(count, fileName) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("chat", "system");

    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="/file-icon.svg" />`;

    const bubble = document.createElement("div");
    bubble.classList.add("system-message", "chat-bubble");

    const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    bubble.innerHTML = `
        <div class="chunk-file-row">
            <img src="/file-icon.svg" class="chunk-file-icon" />
            <span class="chunk-file-name">${fileName}</span>
        </div>
        <div class="chunk-file-status">
            ${
                count > 0
                    ? `📄 ${count} chunks added.`
                    : `ℹ️ No new chunks — already processed.`
            }
        </div>
        <div class="chunk-timestamp">${timestamp}</div>
    `;

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ----------------------------
// CHAT BUBBLES
// ----------------------------
function addUserMessage(promptText) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("chat");

    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="/user.svg" />`;

    const bubble = document.createElement("div");
    bubble.classList.add("user-message", "chat-bubble");
    bubble.textContent = promptText;

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
}

function addBotMessage() {
    const wrapper = document.createElement("div");
    wrapper.classList.add("chat", "ai");

    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="/bot.svg" />`;

    const bubble = document.createElement("div");
    bubble.classList.add("ai-message", "chat-bubble");

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);

    return bubble;
}

// ----------------------------
// MAIN SUBMIT HANDLER
// ----------------------------
async function handleSubmit(e) {
    e.preventDefault();

    if (isBotResponding) return;
    isBotResponding = true;

    const prompt = textarea.value.trim();
    if (!prompt && !selectedFile) {
        isBotResponding = false;
        return;
    }

    textarea.value = "";
    clearFilePreviewUI();

    addUserMessage(prompt || `[Uploaded: ${selectedFile?.name}]`);

    const botDiv = addBotMessage();
    loader(botDiv);

    stopBtn.classList.remove("hidden");

    let response;
    try {
        if (selectedFile !== null) {
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("file", selectedFile);

            response = await fetch("http://localhost:5000/", {
                method: "POST",
                body: formData,
            });
        } else {
            response = await fetch("http://localhost:5000/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
        }

        clearInterval(loadInterval);
        const data = await response.json();
        botDiv.textContent = "";

        // Show uploaded file card BEFORE bot response
        if (data.chunksAdded !== undefined && data.uploaded) {
            showChunksInfo(data.chunksAdded, data.uploaded);
        }

        // Now type bot answer
        typeText(botDiv, data.bot);

        selectedFile = null;
        fileInput.value = "";
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (err) {
        clearInterval(loadInterval);
        botDiv.textContent = "⚠️ Error communicating with AI server";
        stopBtn.classList.add("hidden");
        isBotResponding = false;

        console.error("FE ERROR:", err);
    }
}

// ----------------------------
// STOP BUTTON — FULL STOP
// ----------------------------
stopBtn.addEventListener("click", () => {
    shouldStop = true;       // 🔥 stops typewriter
    clearInterval(loadInterval);  
    stopBtn.classList.add("hidden");
    isBotResponding = false;
});

// ----------------------------
// EVENT LISTENERS
// ----------------------------
chatForm.addEventListener("submit", handleSubmit);

chatForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
});
