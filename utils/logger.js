const fs = require('fs');
const path = require('path');

function logError(context, err) {
    const logPath = path.join(__dirname, '../debug.log');
    const msg = `[${new Date().toISOString()}] ${context}: ${err.stack || err}\n`;
    try {
        fs.appendFileSync(logPath, msg);
    } catch (e) {
        // Fallback silently if fs cannot write
    }
    console.error(msg);
}

module.exports = { logError };
