const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.md') || file.endsWith('.mdx') || file.endsWith('.astro')) {
                results.push(file);
            }
        }
    });
    return results;
};

const files = walk('src');

files.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace href="/go/xxx" with href="/go/xxx/"
    const hrefRegex = /(href=["']\/go\/[^"'>]+?)(["'])/g;
    content = content.replace(hrefRegex, (match, p1, p2) => {
        if (!p1.endsWith('/')) {
            changed = true;
            return p1 + '/' + p2;
        }
        return match;
    });

    // Replace frontmatter affiliateUrl: "/go/xxx" or affiliateUrl: /go/xxx
    const fmRegex = /(affiliateUrl:\s*["']?\/go\/[^"'\s\r\n]+?)(["']?)(?=\s|\r|\n|$)/g;
    content = content.replace(fmRegex, (match, p1, p2) => {
        if (!p1.endsWith('/')) {
            changed = true;
            return p1 + '/' + p2;
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
