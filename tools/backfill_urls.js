const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/\\tools$/, '');
const filesToProcess = ['js/data_cards.js', 'js/data_modules.js', 'js/data_campaigns.js'];

let totalInjected = 0;

filesToProcess.forEach(file => {
    const fullPath = path.join(ROOT, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Split by line to inject cleanly
    const lines = content.split('\n');
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        newLines.push(line);

        // Find lines with `source_url: `
        // It might be `source_url: "url1, url2"`
        const match = line.match(/^(\s*)source_url:\s*(['"])(.+?)\2/);
        if (match && line.includes('source_url:')) {
            const spaces = match[1];
            const quote = match[2];
            const urlStr = match[3];

            // Check ahead to see if tnc_url or promo_url exists before the object closes
            let hasTnc = false;
            let hasPromo = false;
            for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                if (lines[j].includes('tnc_url:')) hasTnc = true;
                if (lines[j].includes('promo_url:')) hasPromo = true;
                if (lines[j].match(/^\s*\}/) || lines[j].match(/^\s*\]/)) break; // end of object
            }

            const urls = urlStr.split(',').map(u => u.trim());
            let tncUrl = urls.find(u => u.toLowerCase().includes('.pdf') || u.toLowerCase().includes('terms-and-conditions') || u.toLowerCase().includes('tnc'));
            let promoUrl = urls.find(u => !u.toLowerCase().includes('.pdf'));

            if (!tncUrl) tncUrl = promoUrl || urls[0];
            if (!promoUrl) promoUrl = tncUrl || urls[0];

            if (!hasTnc || !hasPromo) {
                // ensure the current line ends with a comma if it doesn't already
                if (!newLines[newLines.length - 1].trim().endsWith(',')) {
                    newLines[newLines.length - 1] += ',';
                }

                if (!hasTnc) {
                    newLines.push(`${spaces}tnc_url: ${quote}${tncUrl}${quote},`);
                    totalInjected++;
                }
                if (!hasPromo) {
                    newLines.push(`${spaces}promo_url: ${quote}${promoUrl}${quote},`);
                    totalInjected++;
                }
            }
        }
    }

    fs.writeFileSync(fullPath, newLines.join('\n'));
});

console.log(`Successfully injected ${totalInjected} missing URL properties across all files.`);
