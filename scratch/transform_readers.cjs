const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
    const lines = content.split('\n');
    const data = {};
    let inFm = false;
    for (let line of lines) {
        if (line.trim() === '---') {
            if (inFm) break;
            inFm = true;
            continue;
        }
        if (!inFm) continue;
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
                value = value.substring(1, value.length - 1);
            }
            data[key] = value;
        }
    }
    return data;
}

const readerDb = {};
const readerDirs = [
    'src/content/readers/keen',
    'src/content/readers/kasamba'
];

readerDirs.forEach(dir => {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) {
        console.log(`Directory not found: ${fullDir}`);
        return;
    }
    fs.readdirSync(fullDir).forEach(file => {
        if (!file.endsWith('.md')) return;
        const fullPath = path.join(fullDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const fm = parseFrontmatter(content);
        
        if (fm.platformName) {
            const parts = fm.platformName.split(':');
            const name = parts[parts.length - 1].trim();
            const platform = parts[0].trim().toLowerCase();
            const slug = file.replace('.md', '');
            
            const entry = {
                avatar: fm.avatarUrl,
                affUrl: fm.affiliateUrl,
                offer: fm.freeOffer,
                reviewUrl: `/reviews/${platform}/${slug}/`
            };
            readerDb[name] = entry;
            // Also store by slug just in case
            readerDb[slug] = entry;
        }
    });
});

const manualFixes = {
    "Kelly777": readerDb["readings-by-kelly777"],
    "Meg": readerDb["tarot-with-meg-on-keen-review-2026"],
    "Victoria Sands": readerDb["love-psychic-victoria-sands-keen-review-2026"],
    "LC": readerDb["intuitive-guidance-with-lc-on-keen-review-2026"],
    "Master Sher": readerDb["master-sher"],
    "David7": readerDb["david7"],
    "Arradaza": readerDb["arradaza"],
    "Stefan": readerDb["love-stefans-psychic-soul-kasamba-review"],
    "Stefans": readerDb["love-stefans-psychic-soul-kasamba-review"],
    "Love Stefans": readerDb["love-stefans-psychic-soul-kasamba-review"],
    "Psychic Safina": readerDb["psychic-safina-kasamba-review"],
    "Safina": readerDb["psychic-safina-kasamba-review"],
    "Chelle": readerDb["seek-chelle-kasamba-review"],
    "Seek Chelle": readerDb["seek-chelle-kasamba-review"],
    "Yazmin": readerDb["psychic-yazmin-kasamba-review"],
    "Psychic Yazmin": readerDb["psychic-yazmin-kasamba-review"],
    "Cristina": readerDb["ask-cristina-kasamba-review"],
    "Ask Cristina": readerDb["ask-cristina-kasamba-review"],
    "Golden Eye": readerDb["golden-eye-kasamba-review"],
    "Cosmic Fusion": readerDb["cosmic-fusion-kasamba-review"]
};
Object.assign(readerDb, manualFixes);

function getCtaText(offer) {
    if (!offer) return "Book Now";
    const low = offer.toLowerCase();
    if (low.includes('3 free minute') || low.includes('3 minutes free')) return "Get 3 Mins Free";
    if (low.includes('5 minute') || low.includes('$1')) return "Get 5 Mins for $1";
    if (low.includes('free trial') || low.includes('free minutes')) return "Start Free Trial";
    return "Visit Official Site";
}

function generateHtml(name, stats) {
    let data = readerDb[name];
    if (!data) {
        // Try fuzzy match
        for (let key in readerDb) {
            if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
                data = readerDb[key];
                break;
            }
        }
    }
    
    if (!data) {
        console.log(`Warning: No data found for reader ${name}`);
        data = { avatar: "/avatars/placeholder.jpg", affUrl: "#", offer: "", reviewUrl: "#" };
    }
    
    const ctaText = getCtaText(data.offer);
    
    let html = `<div class="reader-summary">\n`;
    html += `  <img src="${data.avatar}" alt="${name}" class="reader-summary__avatar" />\n`;
    html += `  <div class="reader-summary__details">\n`;
    html += `    <div class="reader-summary__grid">\n`;
    
    for (const [label, value] of Object.entries(stats)) {
        const isFull = label === "Best For" || label === "Highlights";
        html += `      <div class="reader-summary__item${isFull ? ' reader-summary__item--full' : ''}">\n`;
        html += `        <span class="reader-summary__label">${label}</span>\n`;
        html += `        <span class="reader-summary__value">${value}</span>\n`;
        html += `      </div>\n`;
    }
    
    html += `    </div>\n`;
    html += `  </div>\n`;
    html += `  <div class="reader-summary__actions">\n`;
    if (data.affUrl && data.affUrl !== "#") {
        html += `    <a href="${data.affUrl}" class="btn-aff-mini" rel="nofollow sponsored" target="_blank">${ctaText}</a>\n`;
    }
    if (data.reviewUrl && data.reviewUrl !== "#") {
        html += `    <a href="${data.reviewUrl}" class="btn-review-mini">Full Review →</a>\n`;
    }
    html += `  </div>\n`;
    html += `</div>`;
    return html;
}

function transformFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const headerRegex = /### #\d+\s+([^(—\n]+)/g;
    let match;
    const matches = [];
    while ((match = headerRegex.exec(content)) !== null) {
        matches.push({
            full: match[0],
            name: match[1].trim(),
            index: match.index
        });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        let blockStart = content.indexOf('<div class="reader-summary">', m.index);
        let nextHeader = content.indexOf('### #', m.index + m.full.length);
        
        if (blockStart !== -1 && (nextHeader === -1 || blockStart < nextHeader)) {
            let openDivs = 0;
            let pos = blockStart;
            let blockEnd = -1;
            while (pos < content.length) {
                const nextOpen = content.indexOf('<div', pos);
                const nextClose = content.indexOf('</div>', pos);
                if (nextClose === -1) break;
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    openDivs++;
                    pos = nextOpen + 4;
                } else {
                    openDivs--;
                    pos = nextClose + 6;
                    if (openDivs === 0) {
                        blockEnd = pos;
                        break;
                    }
                }
            }
            
            if (blockEnd !== -1) {
                const blockContent = content.substring(blockStart, blockEnd);
                const stats = {};
                const labelRegex = /<span class="reader-summary__label">([^<]+)<\/span>\s*<span class="reader-summary__value">([^<]+)<\/span>/g;
                let sMatch;
                while ((sMatch = labelRegex.exec(blockContent)) !== null) {
                    stats[sMatch[1]] = sMatch[2];
                }
                const newHtml = generateHtml(m.name, stats);
                content = content.substring(0, blockStart) + newHtml + content.substring(blockEnd);
            }
        }
    }
    fs.writeFileSync(filePath, content);
}

const dir = 'src/content/guides/';
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.md')) {
        transformFile(path.join(dir, file));
    }
});
