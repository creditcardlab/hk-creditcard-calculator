const fs = require('fs');

['js/data_cards.js', 'js/data_modules.js', 'js/data_campaigns.js'].forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    let sourceCount = 0;
    let tncCount = 0;
    let promoCount = 0;

    for (let line of lines) {
        if (line.includes('source_url:')) sourceCount++;
        if (line.includes('tnc_url:')) tncCount++;
        if (line.includes('promo_url:')) promoCount++;
    }

    console.log(`${f}: source_url (${sourceCount}), tnc_url (${tncCount}), promo_url (${promoCount})`);
});
