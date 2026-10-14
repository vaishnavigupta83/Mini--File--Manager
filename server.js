const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, status, value) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(value));
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let tooLarge = false;
        req.on("data", (chunk) => {
            if (tooLarge) return;
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                tooLarge = true;
                reject(Object.assign(new Error("Request body is too large"), { status: 413 }));
            }
        });
        req.on("end", () => {
            if (tooLarge) return;
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(Object.assign(new Error("Invalid JSON data"), { status: 400 }));
            }
        });
        req.on("error", reject);
    });
}

function validFilename(name) {
    return typeof name === "string" && name.trim() !== "" &&
        name === path.basename(name) && name !== "." && name !== ".." &&
        !/[\\/\0]/.test(name);
}

function serveStatic(res, filename, contentType) {
    fs.readFile(path.join(PUBLIC_DIR, filename), (err, content) => {
        if (err) return sendJson(res, 500, { message: "Could not load page asset" });
        res.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
        res.end(content);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/") {
        return serveStatic(res, "index.html", "text/html");
    }
    if (req.method === "GET" && url.pathname === "/style.css") {
        return serveStatic(res, "style.css", "text/css");
    }
    if (req.method === "GET" && url.pathname === "/app1.js") {
        return serveStatic(res, "app1.js", "application/javascript");
    }

    if (url.pathname === "/api/files" && req.method === "GET") {
        return fs.readdir(DATA_DIR, { withFileTypes: true }, (err, entries) => {
            if (err && err.code !== "ENOENT") return sendJson(res, 500, { message: "Could not read files" });
            const files = (entries || []).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
            sendJson(res, 200, { files });
        });
    }

    if (url.pathname === "/api/system" && req.method === "GET") {
        return sendJson(res, 200, {
            platform: `${os.type()} ${os.release()}`,
            nodeVersion: process.version,
            architecture: os.arch(),
            cpuCount: os.cpus().length
        });
    }

    if (url.pathname === "/api/files" && req.method === "POST") {
        try {
            const body = await readJson(req);
            const filename = body.fileName;
            if (!validFilename(filename) || typeof body.filecontent !== "string") {
                return sendJson(res, 400, { message: "A valid fileName and string filecontent are required" });
            }
            fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFile(path.join(DATA_DIR, filename), body.filecontent, { flag: "wx" }, (err) => {
                if (err?.code === "EEXIST") return sendJson(res, 409, { message: "A file with that name already exists" });
                if (err) return sendJson(res, 500, { message: "Could not create file" });
                sendJson(res, 201, { message: "File created successfully", fileName: filename });
            });
        } catch (error) {
            sendJson(res, error.status || 400, { message: error.message || "Invalid request" });
        }
        return;
    }

    if (url.pathname.startsWith("/api/files/") && req.method === "GET") {
        let filename;
        try { filename = decodeURIComponent(url.pathname.slice("/api/files/".length)); }
        catch { return sendJson(res, 400, { message: "Invalid filename" }); }
        if (!validFilename(filename)) return sendJson(res, 400, { message: "Invalid filename" });
        return fs.readFile(path.join(DATA_DIR, filename), "utf8", (err, content) => {
            if (err?.code === "ENOENT") return sendJson(res, 404, { message: "File not found" });
            if (err) return sendJson(res, 500, { message: "Could not read file" });
            sendJson(res, 200, { fileName: filename, filecontent: content });
        });
    }

    if (url.pathname.startsWith("/api/files/") && req.method === "DELETE") {
        let filename;
        try { filename = decodeURIComponent(url.pathname.slice("/api/files/".length)); }
        catch { return sendJson(res, 400, { message: "Invalid filename" }); }
        if (!validFilename(filename)) return sendJson(res, 400, { message: "Invalid filename" });
        return fs.unlink(path.join(DATA_DIR, filename), (err) => {
            if (err?.code === "ENOENT") return sendJson(res, 404, { message: "File not found" });
            if (err) return sendJson(res, 500, { message: "Could not delete file" });
            sendJson(res, 200, { message: "File deleted successfully", fileName: filename });
        });
    }

    sendJson(res, 404, { message: "Route not found" });
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server, or start this one with another port (for example: set PORT=3001 && node server.js).`);
        process.exitCode = 1;
        return;
    }
    console.error("Could not start the server:", error.message);
    process.exitCode = 1;
});

server.listen(PORT, () => console.log(`Mini File Manager running at http://localhost:${PORT}`));
