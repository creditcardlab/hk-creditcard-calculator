const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Very naive parser to extract URLs out of JS strings
// We read the raw files because data_index.js expects browser globals
function extractUrlsFromFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const extracted = [];

    // Find lines like: source_url: "https://...",
    const attrRegex = /(?:source_url|tnc_url|tncUrl|sourceUrl)\s*:\s*(['"])(https?:\/\/[^\1]+?)\1/g;
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
        let url = match[2];
        // Some urls are comma-separated strings "url1, url2"
        url.split(',').forEach(u => {
            const trimmed = u.trim();
            if (trimmed.startsWith("http")) extracted.push(trimmed);
        });
    }
    return extracted;
}

function checkUrlStatus(urlStr) {
    return new Promise((resolve) => {
        let url;
        try {
            url = new URL(urlStr);
        } catch (e) {
            return resolve({ url: urlStr, status: "Invalid URL", ok: false });
        }

        const lib = url.protocol === "https:" ? https : http;
        const req = lib.request(url, { method: "HEAD", timeout: 8000 }, (res) => {
            // 2xx or 3xx are considered 'found' for a loose definition, 
            // although 301/302 might redirect to a 404 page eventually.
            const ok = res.statusCode >= 200 && res.statusCode < 400;
            resolve({ url: urlStr, status: res.statusCode, ok });
        });

        req.on("timeout", () => {
            req.destroy();
            resolve({ url: urlStr, status: "Timeout", ok: false });
        });

        req.on("error", (err) => {
            resolve({ url: urlStr, status: err.code || "Error", ok: false });
        });

        req.end();
    });
}

async function main() {
    console.log("Extracting URLs from js/data_cards.js and js/data_modules.js...");
    const cardsUrls = extractUrlsFromFile(path.join(ROOT, "js/data_cards.js"));
    const modulesUrls = extractUrlsFromFile(path.join(ROOT, "js/data_modules.js"));

    const allUrls = Array.from(new Set([...cardsUrls, ...modulesUrls]));
    console.log(`Found ${allUrls.length} unique URLs.`);

    const results = [];
    const broken = [];

    console.log("Checking HTTP status for each URL (this may take a minute depending on network)...");

    // Batch processing
    const BATCH_SIZE = 10;
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
        const batch = allUrls.slice(i, i + BATCH_SIZE);
        const promises = batch.map(u => checkUrlStatus(u));
        const batchResults = await Promise.all(promises);

        batchResults.forEach(r => {
            results.push(r);
            if (!r.ok) broken.push(r);
            process.stdout.write(r.ok ? "." : "X");
        });
    }

    console.log("\n\nDone checking.");
    console.log(`Working: ${results.length - broken.length}`);
    console.log(`Broken: ${broken.length}`);

    const reportPath = path.resolve(ROOT, "reports", "url_audit.json");
    fs.writeFileSync(reportPath, JSON.stringify({
        total: results.length,
        working: results.length - broken.length,
        brokenCount: broken.length,
        broken
    }, null, 2));

    console.log(`Wrote details of broken URLs to ${reportPath}`);
}

main().catch(console.error);
