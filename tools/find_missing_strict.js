const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname.replace(/\\tools$/, '');

const cardsCode = fs.readFileSync(path.join(ROOT, 'js/data_cards.js'), 'utf8');
const modulesCode = fs.readFileSync(path.join(ROOT, 'js/data_modules.js'), 'utf8');
const campaignsCode = fs.readFileSync(path.join(ROOT, 'js/data_campaigns.js'), 'utf8');

const context = { DATA: { cards: [], modules: {}, offers: [] } };
vm.createContext(context);

// we have to evaluate the vars into context
const runner = `
${cardsCode}
DATA.cards = cardsDB;
${modulesCode}
DATA.modules = modulesDB;
${campaignsCode}
DATA.offers = [];
DATA.offers.push(...campaignsDB);
`;
vm.runInContext(runner, context);

const hasUrl = (obj) => {
    if (!obj) return true;
    return !!obj.source_url && !!obj.tnc_url && !!obj.promo_url;
};

const emptyItems = [];
const checkObj = (obj, type) => {
    if (!obj) return;
    let missingFn = [];
    if (!obj.source_url) missingFn.push('source_url');
    if (!obj.tnc_url) missingFn.push('tnc_url');
    if (!obj.promo_url) missingFn.push('promo_url');

    // For this exercise, we only care if source_url OR tnc_url is missing
    if (!obj.source_url || !obj.tnc_url) {
        emptyItems.push(`${type} => ${obj.id || obj.name} (Missing: ${missingFn.join(', ')})`);
    }
}

context.DATA.cards.forEach(c => checkObj(c, 'Card'));
Object.keys(context.DATA.modules).forEach(k => checkObj(context.DATA.modules[k], 'Module'));
context.DATA.offers.forEach(c => checkObj(c, 'Campaign'));

console.log('Top 10 items missing critical URLs:');
console.log(emptyItems.slice(0, 10).join('\n'));
console.log('Total items missing URLs:', emptyItems.length);
