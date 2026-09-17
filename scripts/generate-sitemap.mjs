import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

function normalizeServiceAccount(raw) {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }

    return parsed;
}

function normalizeBaseUrl(url) {
    return url.trim().replace(/\/+$/, '');
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
    const serviceAccount = normalizeServiceAccount(getRequiredEnv('FIREBASE_SERVICE_ACCOUNT'));
    const app = getApps()[0] || initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore(app);

    const snapshot = await db.collection('articles').where('published', '==', true).get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;

        return {
            slug,
            lastmod: (updatedAt || createdAt || new Date()).toISOString()
        };
    }).filter((article) => article.slug);
}

async function main() {
    const siteUrl = normalizeBaseUrl(getRequiredEnv('SITE_URL'));
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