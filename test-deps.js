const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    console.log("Testing PDF-Parse...");
    try {
        const dummyPdf = Buffer.from("%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj 4 0 obj<</Length 20>>stream\nBT /F1 12 Tf (Hello) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000185 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n268\n%%EOF");
        const data = await pdf(dummyPdf);
        console.log("PDF-Parse Success:", data.text);
    } catch (e) {
        console.error("PDF-Parse Failed:", e);
    }

    console.log("Testing Tesseract...");
    try {
        // We need an actual image file for Tesseract.recognize to work easily or a buffer
        // Since I don't have one, I'll just check if the module loads and has the function
        console.log("Tesseract Type:", typeof Tesseract.recognize);
    } catch (e) {
        console.error("Tesseract Failed:", e);
    }
}

test();
