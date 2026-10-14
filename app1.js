const form = document.getElementById("createForm");
const filenameInput = document.getElementById("filename");
const contentInput = document.getElementById("content");
const message = document.getElementById("message");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const systemInfo = document.getElementById("systemInfo");

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "The request failed");
    return data;
}

async function getFiles() {
    fileList.replaceChildren(Object.assign(document.createElement("li"), { className: "empty-state", textContent: "Loading files…" }));
    try {
        const { files } = await requestJson("/api/files");
        fileCount.textContent = String(files.length);
        fileList.replaceChildren();
        if (!files.length) {
            fileList.innerHTML = '<li class="empty-state">No files yet. Create your first one above.</li>';
            return;
        }
        files.forEach((name) => {
            const item = document.createElement("li");
            item.className = "file-item";
            const icon = document.createElement("span");
            icon.className = "file-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = "▤";
            const filename = document.createElement("span");
            filename.className = "file-name";
            filename.textContent = name;
            const openButton = document.createElement("button");
            openButton.className = "open-button";
            openButton.type = "button";
            openButton.textContent = "Open";
            openButton.addEventListener("click", () => openFile(name));
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-button";
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.setAttribute("aria-label", `Delete ${name}`);
            deleteButton.addEventListener("click", () => deleteFile(name));
            item.append(icon, filename, openButton, deleteButton);
            fileList.append(item);
        });
    } catch (error) {
        fileCount.textContent = "0";
        fileList.replaceChildren(Object.assign(document.createElement("li"), { className: "empty-state error", textContent: error.message }));
    }
}

async function deleteFile(name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        const result = await requestJson(`/api/files/${encodeURIComponent(name)}`, { method: "DELETE" });
        showMessage(result.message, "success");
        await getFiles();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

async function openFile(name) {
    try {
        const file = await requestJson(`/api/files/${encodeURIComponent(name)}`);
        document.getElementById("previewTitle").textContent = file.fileName;
        document.getElementById("previewContent").textContent = file.filecontent;
        document.getElementById("filePreview").showModal();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("", "");
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
        const result = await requestJson("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: filenameInput.value.trim(), filecontent: contentInput.value })
        });
        showMessage(result.message, "success");
        form.reset();
        await getFiles();
        filenameInput.focus();
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("refreshButton").addEventListener("click", getFiles);
document.getElementById("closePreview").addEventListener("click", () => document.getElementById("filePreview").close());
document.getElementById("filePreview").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
});
document.getElementById("systemButton").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!systemInfo.hidden) {
        systemInfo.hidden = true;
        button.textContent = "Show details";
        return;
    }
    button.disabled = true;
    try {
        const details = await requestJson("/api/system");
        systemInfo.replaceChildren();
        Object.entries({ "Operating system": details.platform, "Node.js": details.nodeVersion, "Architecture": details.architecture, "CPU cores": details.cpuCount }).forEach(([label, value]) => {
            const row = document.createElement("div");
            row.className = "system-row";
            const key = document.createElement("span");
            key.textContent = label;
            const detail = document.createElement("strong");
            detail.textContent = value;
            row.append(key, detail);
            systemInfo.append(row);
        });
        systemInfo.hidden = false;
        button.textContent = "Hide details";
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        button.disabled = false;
    }
});

getFiles();
