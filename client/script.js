import bot from "./assets/bot.svg";
import user from "./assets/user.svg";

// DOM ELEMENTS

const uploadBox = document.getElementById("upload-box");
const filePreview = document.getElementById("file-preview");
const fileNameSpan = document.getElementById("file-name");
const removeFileBtn = document.getElementById("remove-file");
const fileInput = document.getElementById("fileInput");
const textarea = document.querySelector("textarea[name='prompt']");
const chatForm = document.querySelector("#chat-form");
let selectedFile = null;
// Click opens file dialog
uploadBox.addEventListener("click", () => fileInput.click());
// Drag over box
uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.classList.add("dragover");
});
// Drag leave
uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragover");
});
// Drop file
uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});
// Normal file selection
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
});
// Remove file
removeFileBtn.addEventListener("click", clearFilePreviewUI);
// Show selected file in UI
function handleFileSelect(file) {
    if (!file) return;

    selectedFile = file;
    fileNameSpan.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

    filePreview.classList.remove("hidden");
    uploadBox.style.display = "none";
}
// Clear preview
function clearFilePreviewUI() {
    filePreview.classList.add("hidden");
    fileNameSpan.textContent = "";
    uploadBox.style.display = "flex";
}
// LOADER + TYPEWRITER
let loadInterval;
function loader(element) {
    element.textContent = "";

    loadInterval = setInterval(() => {
        element.textContent += ".";
        if (element.textContent === "....") {
            element.textContent = "";
        }
    }, 300);
}
function typeText(element, text) {
    let index = 0;

    let interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 20);
}
// CHUNK INFO (when file uploaded)
function showChunksInfo(count, fileName) {
    const chatContainer = document.querySelector("#chat_container");

    // Wrapper (same as bot chat bubble)
    const wrapper = document.createElement("div");
    wrapper.classList.add("chat", "ai");

    // Bot icon
    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="assets/bot.svg" />`;

    // Message bubble
    const bubble = document.createElement("div");
    bubble.classList.add("ai-message", "chat-bubble", "chunk-bubble");

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    bubble.innerHTML = `
    <div class="chunk-file-row">
        <img src="assets/file-icon.svg" class="chunk-file-icon" />
        <span class="chunk-file-name">${fileName}</span>
    </div>
    <div class="chunk-file-status">
        ${count > 0 ? `📄 ${count} chunks added.` : `ℹ️ No new chunks — already processed.`}
    </div>
    <div class="chunk-timestamp">${timestamp}</div>
  `;

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);

    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// CHAT MESSAGE RENDERING (Icons + Bubbles)
function addUserMessage(promptText) {
    const chatContainer = document.querySelector("#chat_container");

    const wrapper = document.createElement("div");
    wrapper.classList.add("chat");

    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="assets/user.svg" />`;

    const bubble = document.createElement("div");
    bubble.classList.add("user-message", "chat-bubble");
    bubble.textContent = promptText;

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
}
function addBotMessage() {
    const chatContainer = document.querySelector("#chat_container");

    const wrapper = document.createElement("div");
    wrapper.classList.add("chat", "ai");

    const profile = document.createElement("div");
    profile.classList.add("profile");
    profile.innerHTML = `<img src="assets/bot.svg" />`;

    const bubble = document.createElement("div");
    bubble.classList.add("ai-message", "chat-bubble");

    wrapper.appendChild(profile);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);

    return bubble;
}
// MAIN SUBMIT HANDLER
async function handleSubmit(e) {
    e.preventDefault();

    const chatContainer = document.querySelector("#chat_container");
    const prompt = textarea.value.trim();

    if (!prompt && !selectedFile) return;

    // Clear UI only (not selectedFile)
    textarea.value = "";
    clearFilePreviewUI();

    // USER MESSAGE
    addUserMessage(prompt || `[Uploaded file: ${selectedFile?.name}]`);

    // BOT LOADER
    const botDiv = addBotMessage();
    loader(botDiv);

    let response;

    try {
        // If a file exists, send multipart/form-data
        if (selectedFile !== null) {
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("file", selectedFile);

            response = await fetch("http://localhost:5000/", {
                method: "POST",
                body: formData,
            });
        } else {
            // Text-only mode
            response = await fetch("http://localhost:5000/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
        }

        clearInterval(loadInterval);

        const data = await response.json();
        botDiv.textContent = "";

        typeText(botDiv, data.bot);

        if (data.chunksAdded !== undefined && data.uploaded) {
            showChunksInfo(data.chunksAdded, data.uploaded);
        }

        // NOW clear selectedFile (AFTER sending to BE)
        selectedFile = null;
        fileInput.value = "";

        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (err) {
        clearInterval(loadInterval);
        botDiv.textContent = "⚠️ Error communicating with AI server";
        console.error("FE ERROR:", err);
    }
}

// EVENT LISTENERS
chatForm.addEventListener("submit", handleSubmit);
chatForm.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        if (!e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }
});
