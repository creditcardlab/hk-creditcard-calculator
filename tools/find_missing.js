const fs = require('fs');

function findMissing(file) {
    const text = fs.readFileSync(file, 'utf8');
    const regex = /id:\s*"([^"]+)"[\s\S]*?(?:source_url|tnc_url|promo_url|registration_url):\s*""/g;
    let match;
    const missing = new Set();
    while ((match = regex.exec(text)) !== null) {
        missing.add(match[1]);
    }
    return Array.from(missing);
}

const c = findMissing('js/data_cards.js');
const m = findMissing('js/data_modules.js');
const p = findMissing('js/data_campaigns.js');

console.log("Cards missing:", c.join(', '));
console.log("Modules missing:", m.join(', '));
console.log("Campaigns missing:", p.join(', '));
