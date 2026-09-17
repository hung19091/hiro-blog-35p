import { db } from './firebase-config.js';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentArticleId = null;

window.addEventListener('DOMContentLoaded', async () => {
    const slug = getArticleSlug();

    if (!slug) {
        showModal("錯誤", "找不到指定的文章參數。");
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    await fetchArticleBySlug(slug);
});

async function fetchArticleBySlug(slug) {
    try {
        const q = query(collection(db, 'articles'), where('slug', '==', slug), where('published', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            document.getElementById('article-loading').innerHTML = `<p class="text-center text-red-400 py-10">找不到該文章或文章尚未發佈。</p>`;
            return;
        }

        const docSnap = querySnapshot.docs[0];
        const art = docSnap.data();
        currentArticleId = docSnap.id;
        updateSeoMeta(art, slug);

        document.getElementById('page-title').innerText = `${art.title} | DevLog`;
        document.getElementById('og-title').setAttribute('content', art.title);
        document.getElementById('og-description').setAttribute('content', art.summary);

        document.getElementById('art-title').innerText = art.title;
        document.getElementById('art-created').innerText = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';

        if (art.updatedAt) {
            document.getElementById('art-updated').innerText = art.updatedAt.toDate().toLocaleDateString();
        } else {
            document.getElementById('updated-wrapper').classList.add('hidden');
        }

        const tagsEl = document.getElementById('art-tags');
        if (art.tags && Array.isArray(art.tags)) {
            tagsEl.innerHTML = art.tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-md bg-darkBg border border-darkBorder text-emerald-400">#${t.trim()}</span>`).join('');
        }

        const bodyEl = document.getElementById('art-body');
        bodyEl.innerHTML = marked.parse(art.content || '');

        document.getElementById('article-loading').classList.add('hidden');
        document.getElementById('article-content-wrapper').classList.remove('hidden');

        await fetchApprovedComments(currentArticleId);

    } catch (error) {
        console.error("Error fetching article:", error);
        document.getElementById('article-loading').innerHTML = `<p class="text-center text-red-400 py-10">載入文章發生錯誤：${escapeHtml(error.message)}</p>`;
    }
}

function getArticleSlug() {
    const urlParams = new URLSearchParams(window.location.search);
    const querySlug = urlParams.get('slug');
    if (querySlug) return querySlug;

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const articleIndex = pathSegments.indexOf('article');
    if (articleIndex >= 0 && pathSegments[articleIndex + 1]) {
        return decodeURIComponent(pathSegments[articleIndex + 1]);
    }

    return null;
}

function getArticleUrl(slug) {
    const encodedSlug = encodeURIComponent(slug);
    return new URL(`article.html?slug=${encodedSlug}`, window.location.origin + window.location.pathname.replace(/[^/]*$/, '')).toString();
}

function updateSeoMeta(article, slug) {
    const canonicalUrl = getArticleUrl(slug);
    const publishedAt = article.createdAt?.toDate ? article.createdAt.toDate().toISOString() : '';
    const updatedAt = article.updatedAt?.toDate ? article.updatedAt.toDate().toISOString() : publishedAt;
    const keywords = Array.isArray(article.tags) ? article.tags.map(tag => tag.trim()).filter(Boolean).join(', ') : '';

    const metaDescription = document.getElementById('meta-description');
    const canonicalLink = document.getElementById('canonical-link');
    const ogUrl = document.getElementById('og-url');
    const twitterUrl = document.getElementById('twitter-url');
    const publishedMeta = document.getElementById('article-published-time');
    const modifiedMeta = document.getElementById('article-modified-time');
    const keywordsMeta = document.getElementById('meta-keywords');
    const jsonLd = document.getElementById('article-jsonld');

    if (metaDescription) metaDescription.setAttribute('content', article.summary || '閱讀 DevLog 的深度技術文章。');
    if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
    if (twitterUrl) twitterUrl.setAttribute('content', canonicalUrl);
    if (publishedMeta && publishedAt) publishedMeta.setAttribute('content', publishedAt);
    if (modifiedMeta && updatedAt) modifiedMeta.setAttribute('content', updatedAt);
    if (keywordsMeta) keywordsMeta.setAttribute('content', keywords);

    if (jsonLd) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title || 'DevLog 文章',
            "description": article.summary || '閱讀 DevLog 的深度技術文章。',
            "author": {
                "@type": "Organization",
                "name": "DevLog"
            },
            "publisher": {
                "@type": "Organization",
                "name": "DevLog"
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonicalUrl
            }
        };

        if (publishedAt) schema.datePublished = publishedAt;
        if (updatedAt) schema.dateModified = updatedAt;
        if (Array.isArray(article.tags) && article.tags.length > 0) {
            schema.keywords = article.tags.map(tag => tag.trim()).filter(Boolean);
        }

        jsonLd.textContent = JSON.stringify(schema, null, 2);
    }
}

async function fetchApprovedComments(articleId) {
    const listEl = document.getElementById('comments-list');
    const countEl = document.getElementById('comment-count');
    try {
        const q = query(collection(db, 'comments'), where('articleId', '==', articleId), where('approved', '==', true));
        const querySnapshot = await getDocs(q);

        let comments = [];
        querySnapshot.forEach(docSnap => {
            comments.push({ id: docSnap.id, ...docSnap.data() });
        });

        comments.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeA - timeB;
        });

        countEl.innerText = comments.length;

        if (comments.length === 0) {
            listEl.innerHTML = `<p class="text-sm text-gray-500 italic">尚無留言，趕快搶頭香吧！</p>`;
            return;
        }

        let html = '';
        comments.forEach(c => {
            const dateStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '剛剛';
            html += `
                <div class="p-4 rounded-xl bg-darkBg border border-darkBorder space-y-2">
                    <div class="flex items-center justify-between text-xs text-gray-400">
                        <span class="font-semibold text-gray-200 flex items-center space-x-1.5">
                            <i class="fa-regular fa-user text-emerald-400"></i>
                            <span>${escapeHtml(c.author)}</span>
                        </span>
                        <span>${dateStr}</span>
                    </div>
                    <p class="text-sm text-gray-300 whitespace-pre-line">${escapeHtml(c.message)}</p>
                </div>
            `;
        });

        listEl.innerHTML = html;

    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

const commentForm = document.getElementById('comment-form');
commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentArticleId) return;

    const author = document.getElementById('comment-author').value.trim();
    const message = document.getElementById('comment-message').value.trim();
    const submitBtn = document.getElementById('submit-comment-btn');

    submitBtn.disabled = true;
    submitBtn.innerText = "提交中...";

    try {
        await addDoc(collection(db, 'comments'), {
            articleId: currentArticleId,
            author: author,
            message: message,
            approved: false,
            spam: false,
            createdAt: serverTimestamp()
        });

        showModal("留言成功", "您的留言已送出！將在管理員審核通過後顯示於網頁上。");
        commentForm.reset();
    } catch (error) {
        console.error("Error submitting comment:", error);
        showModal("錯誤", "送出留言失敗：" + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "送出留言";
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}