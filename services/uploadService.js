const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function processReceipt(filePath, mimeType) {
    console.log(`[UploadService] Processing: ${filePath} (${mimeType})`);
    let text = "";
    try {
        if (mimeType === 'application/pdf') {
            console.log("[UploadService] Reading PDF...");
            const dataBuffer = fs.readFileSync(filePath);
            // Some versions of pdf-parse need this specific call
            const data = await pdfParse(dataBuffer);
            text = data.text;
        } else {
            console.log("[UploadService] Running Tesseract OCR...");
            const result = await Tesseract.recognize(filePath, 'eng');
            text = result.data.text;
        }

        if (!text || text.trim().length < 5) {
            console.warn("[UploadService] No selectable text found in PDF/Image.");
            return { merchant: "Scan Failed (No Text Found). Try a Photo instead?", amount: 0 };
        }

        console.log("[UploadService] Text extracted, parsing...");
        return parseReceiptText(text);
    } catch (err) {
        console.error("[UploadService] Error:", err);
        return { merchant: "Scan Error", amount: 0 };
    }
}

function parseReceiptText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let merchant = "Unknown Merchant";
    let amount = 0;
    
    // Merchant: First non-date/non-noise line
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        if (lines[i].length > 2 && !/\d{2}[\/\-]\d{2}/.test(lines[i]) && !/total|amount|receipt/i.test(lines[i])) {
            merchant = lines[i];
            break;
        }
    }

    // Amount: Find largest number with decimals
    const prices = text.match(/\d+\.\d{2}/g);
    if (prices) {
        const numericPrices = prices.map(p => parseFloat(p));
        amount = Math.max(...numericPrices);
    } else {
        // Fallback for whole numbers
        const wholeMatch = text.match(/(?:total|amount|₹|rs)\.?\s*[:\s]*(\d+)/i);
        if (wholeMatch) amount = parseFloat(wholeMatch[1]);
    }

    return { merchant, amount };
}

module.exports = { processReceipt };
