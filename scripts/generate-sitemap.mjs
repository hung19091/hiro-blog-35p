import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { readFile } from 'node:fs/promises';

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

function normalizeBaseUrl(url) {
    return url.trim().replace(/\/+$/, '');
}

async function readFirebaseWebConfig() {
    const configSource = await readFile(new URL('../js/firebase-config.js', import.meta.url), 'utf8');
    const projectIdMatch = configSource.match(/projectId:\s*"([^"]+)"/);
    const apiKeyMatch = configSource.match(/apiKey:\s*"([^"]+)"/);

    if (!projectIdMatch || !apiKeyMatch) {
        throw new Error('Unable to read projectId or apiKey from js/firebase-config.js');
    }

    return {
        projectId: projectIdMatch[1],
        apiKey: apiKeyMatch[1]
    };
}

function inferSiteUrlFromGithubRepository() {
    const repository = process.env.GITHUB_REPOSITORY?.trim();
    if (!repository || !repository.includes('/')) {
        return null;
    }

    const [owner, repoName] = repository.split('/');
    if (!owner || !repoName) {
        return null;
    }

    if (repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
        return `https://${owner}.github.io`;
    }

    return `https://${owner}.github.io/${repoName}`;
}

function resolveSiteUrl() {
    const explicitSiteUrl = process.env.SITE_URL?.trim();
    if (explicitSiteUrl) {
        return normalizeBaseUrl(explicitSiteUrl);
    }

    const inferredSiteUrl = inferSiteUrlFromGithubRepository();
    if (inferredSiteUrl) {
        return normalizeBaseUrl(inferredSiteUrl);
    }

    throw new Error('Missing SITE_URL and unable to infer it from GITHUB_REPOSITORY');
}

function getArticleUrl(siteUrl, slug) {
    const encodedSlug = encodeURIComponent(slug);
    const format = (process.env.ARTICLE_URL_FORMAT || 'query').trim().toLowerCase();

    if (format === 'path') {
        return `${siteUrl}/article/${encodedSlug}`;
    }

    return `${siteUrl}/article.html?slug=${encodedSlug}`;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildUrlEntry(loc, lastmod, changefreq, priority) {
    const tags = [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`
    ];

    if (lastmod) tags.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    if (changefreq) tags.push(`    <changefreq>${changefreq}</changefreq>`);
    if (priority) tags.push(`    <priority>${priority}</priority>`);

    tags.push('  </url>');
    return tags.join('\n');
}

async function loadPublishedArticles() {
    const { projectId, apiKey } = await readFirebaseWebConfig();
    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
    const requestBody = {
        structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'published' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                }
            }
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Firestore REST query failed: ${response.status} ${response.statusText} - ${bodyText}`);
    }

    const rows = await response.json();

    return rows.map((row) => {
        const fields = row.document?.fields || {};
        const slug = fields.slug?.stringValue?.trim() || '';
        const updatedAt = fields.updatedAt?.timestampValue || null;
        const createdAt = fields.createdAt?.timestampValue || null;

        return {
            slug,
            lastmod: updatedAt || createdAt || new Date().toISOString()
        };
    }).filter((article) => article.slug);
}

async function main() {
    const siteUrl = resolveSiteUrl();
    const outputDir = process.env.SITEMAP_OUTPUT_DIR?.trim() || '.';
    const articles = await loadPublishedArticles();

    const urls = [
        buildUrlEntry(`${siteUrl}/`, new Date().toISOString(), 'daily', '1.0'),
        ...articles.map((article) => buildUrlEntry(getArticleUrl(siteUrl, article.slug), article.lastmod, 'weekly', '0.8'))
    ];

    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        ''
    ].join('\n');

    await mkdir(outputDir, { recursive: true });
    await writeFile(`${outputDir}/sitemap.xml`, sitemap, 'utf8');

    console.log(`Generated sitemap with ${articles.length + 1} URLs at ${outputDir}/sitemap.xml`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});