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

    // Amount: First look for multiple negative values (e.g. from a monthly statement)
    const negativeMatches = text.match(/(?:-\s*?|−\s*?)(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    if (negativeMatches && negativeMatches.length > 0) {
        amount = negativeMatches.reduce((sum, match) => {
            const numStr = match.replace(/[-\s,−]/g, '');
            return sum + parseFloat(numStr);
        }, 0);
    } 
    
    // Amount: Fallback to look for "Total" or "Amount" or "₹" explicitly first
    if (!amount) {
        const explicitMatch = text.match(/(?:total|amount|grand total|net amount|₹|rs)\.?\s*[:\s]*((?:\d+,)*\d+(?:\.\d+)?)/i);
        if (explicitMatch) {
            amount = parseFloat(explicitMatch[1].replace(/,/g, ''));
        } 
    }
    
    // If not found, look for largest monetary value format
    if (!amount) {
        // Look for numbers that might be prices (with or without comma formatting)
        const allNumbers = text.match(/\b\d+(?:,\d{3})*(?:\.\d{2})?\b/g);
        if (allNumbers) {
            const numericValues = allNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n < 100000); // Sanity check to ignore phone numbers/zip codes
            if (numericValues.length > 0) {
                amount = Math.max(...numericValues);
            }
        }
    }

    return { merchant, amount };
}

module.exports = { processReceipt };
