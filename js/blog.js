import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let allArticles = [];
let filteredArticles = [];
let currentTag = '';
let currentPage = 1;
const pageSize = 5;

window.addEventListener('DOMContentLoaded', async () => {
    setSeoMeta();
    await fetchArticles();
});

function setSeoMeta() {
    const homeUrl = new URL('/', window.location.origin).toString();
    const canonicalLink = document.getElementById('canonical-link');
    const ogUrl = document.getElementById('og-url');
    const twitterUrl = document.getElementById('twitter-url');

    if (canonicalLink) canonicalLink.setAttribute('href', homeUrl);
    if (ogUrl) ogUrl.setAttribute('content', homeUrl);
    if (twitterUrl) twitterUrl.setAttribute('content', homeUrl);
}

function buildArticleUrl(slug) {
    const encodedSlug = encodeURIComponent(slug);
    return `article.html?slug=${encodedSlug}`;
}

async function fetchArticles() {
    const listEl = document.getElementById('article-list');
    try {
        const q = query(collection(db, 'articles'), where('published', '==', true));
        const querySnapshot = await getDocs(q);

        allArticles = [];
        querySnapshot.forEach((docSnap) => {
            allArticles.push({ id: docSnap.id, ...docSnap.data() });
        });

        allArticles.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        renderTags();
        filterByTag('');
    } catch (error) {
        console.error("Error fetching articles:", error);
        listEl.innerHTML = `<div class="p-6 rounded-xl bg-darkCard border border-darkBorder text-center text-red-400">無法載入文章，請確認您的網路連線與 Firebase 設定是否正確（` + error.message + `）。</div>`;
    }
}

function renderTags() {
    const tagSet = new Set();
    allArticles.forEach(art => {
        if (art.tags && Array.isArray(art.tags)) {
            art.tags.forEach(t => tagSet.add(t.trim()));
        }
    });

    const filtersEl = document.getElementById('tag-filters');
    let html = `<button onclick="filterByTag('')" class="tag-btn ${currentTag === '' ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition">全部文章</button>`;

    tagSet.forEach(tag => {
        const isActive = currentTag === tag;
        html += `<button onclick="filterByTag('${tag}')" class="tag-btn ${isActive ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition"># ${tag}</button>`;
    });

    filtersEl.innerHTML = html;
}

window.filterByTag = function (tag) {
    currentTag = tag;
    currentPage = 1;

    if (tag === '') {
        filteredArticles = [...allArticles];
    } else {
        filteredArticles = allArticles.filter(art => art.tags && art.tags.map(t => t.trim()).includes(tag));
    }

    renderTags();
    renderPage();
}

function renderPage() {
    const listEl = document.getElementById('article-list');
    const paginationEl = document.getElementById('pagination-container');

    if (filteredArticles.length === 0) {
        listEl.innerHTML = `<div class="p-8 rounded-xl bg-darkCard border border-darkBorder text-center text-gray-400">目前沒有找到相關文章。</div>`;
        paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filteredArticles.slice(start, end);

    let html = '';
    pageItems.forEach(art => {
        const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
        const tagsHtml = art.tags ? art.tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-md bg-darkBg border border-darkBorder text-emerald-400">#${t.trim()}</span>`).join('') : '';

        html += `
            <article class="p-6 rounded-2xl bg-darkCard border border-darkBorder hover:border-emerald-500/50 transition group shadow-lg">
                <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span class="flex items-center space-x-1">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${dateStr}</span>
                    </span>
                    <div class="flex flex-wrap gap-1">${tagsHtml}</div>
                </div>
                <h2 class="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition">
                    <a href="${buildArticleUrl(art.slug)}">${escapeHtml(art.title)}</a>
                </h2>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(art.summary)}</p>
                <a href="${buildArticleUrl(art.slug)}" class="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
                    <span>閱讀全文</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
            </article>
        `;
    });

    listEl.innerHTML = html;

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let pagHtml = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">上一頁</button>
        <span class="text-sm text-gray-400">第 ${currentPage} / ${totalPages} 頁</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">下一頁</button>
    `;
    paginationEl.innerHTML = pagHtml;
}

window.changePage = function (page) {
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}