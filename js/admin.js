import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentUser = null;
let articlesCache = [];
let commentsCache = [];

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userNavArea = document.getElementById('user-nav-area');
    const userEmailSpan = document.getElementById('user-email');

    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userNavArea.classList.remove('hidden');
        userNavArea.classList.add('flex');
        userEmailSpan.innerText = user.email;

        loadAdminData();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        userNavArea.classList.add('hidden');
        userNavArea.classList.remove('flex');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerText = "登入中...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        showModal("登入失敗", "帳號或密碼錯誤，請重新確認（" + error.message + "）。");
    } finally {
        btn.disabled = false;
        btn.innerText = "登入後台";
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
});

async function loadAdminData() {
    await fetchAdminArticles();
    await fetchAdminComments();
}

async function fetchAdminArticles() {
    const tbody = document.getElementById('admin-articles-list');
    try {
        const querySnapshot = await getDocs(collection(db, 'articles'));
        articlesCache = [];
        querySnapshot.forEach(docSnap => {
            articlesCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        articlesCache.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        if (articlesCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">尚無任何文章。</td></tr>`;
            return;
        }

        let html = '';
        articlesCache.forEach(art => {
            const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
            const statusBadge = art.published 
                ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">已發佈</span>`
                : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50">草稿</span>`;

            const tagsStr = art.tags ? art.tags.join(', ') : '';

            html += `
                <tr class="hover:bg-darkBg/40 transition">
                    <td class="p-4 max-w-xs">
                        <div class="font-bold text-white truncate">${escapeHtml(art.title)}</div>
                        <div class="text-xs text-gray-400 truncate">${escapeHtml(art.summary)}</div>
                    </td>
                    <td class="p-4 text-xs text-gray-300">${escapeHtml(tagsStr)}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-xs text-gray-400">${dateStr}</td>
                    <td class="p-4 text-right space-x-2">
                        <button onclick="editArticle('${art.id}')" class="px-2.5 py-1 bg-darkBg hover:bg-darkBorder text-gray-300 rounded text-xs transition border border-darkBorder" title="編輯"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="togglePublish('${art.id}', ${!art.published})" class="px-2.5 py-1 ${art.published ? 'bg-amber-600/20 text-amber-400 border-amber-800/50' : 'bg-emerald-600/20 text-emerald-400 border-emerald-800/50'} hover:opacity-80 rounded text-xs transition border" title="${art.published ? '下架' : '發佈'}"><i class="fa-solid ${art.published ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                        <button onclick="deleteArticle('${art.id}')" class="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800/50 rounded text-xs transition" title="刪除"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error("Error loading articles:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400">載入文章失敗：${escapeHtml(error.message)}</td></tr>`;
    }
}

async function fetchAdminComments() {
    const tbody = document.getElementById('admin-comments-list');
    try {
        const querySnapshot = await getDocs(collection(db, 'comments'));
        commentsCache = [];
        querySnapshot.forEach(docSnap => {
            commentsCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        commentsCache.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        if (commentsCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">尚無任何留言。</td></tr>`;
            return;
        }

        let html = '';
        commentsCache.forEach(c => {
            const dateStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '剛剛';
            const statusBadge = c.approved 
                ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">已核准</span>`
                : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50">待審核</span>`;

            html += `
                <tr class="hover:bg-darkBg/40 transition">
                    <td class="p-4 font-medium text-gray-200">${escapeHtml(c.author)}</td>
                    <td class="p-4 max-w-md text-gray-300 text-xs whitespace-pre-line">${escapeHtml(c.message)}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-xs text-gray-400">${dateStr}</td>
                    <td class="p-4 text-right space-x-2">
                        ${!c.approved ? `<button onclick="approveComment('${c.id}', true)" class="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-800/50 rounded text-xs transition" title="核准"><i class="fa-solid fa-check"></i></button>` : `<button onclick="approveComment('${c.id}', false)" class="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-800/50 rounded text-xs transition" title="取消核准"><i class="fa-solid fa-xmark"></i></button>`}
                        <button onclick="deleteComment('${c.id}')" class="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800/50 rounded text-xs transition" title="刪除"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error("Error loading comments:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400">載入留言失敗：${escapeHtml(error.message)}</td></tr>`;
    }
}

window.openArticleModal = function(artId = null) {
    document.getElementById('art-edit-id').value = '';
    document.getElementById('form-title').value = '';
    document.getElementById('form-slug').value = '';
    document.getElementById('form-summary').value = '';
    document.getElementById('form-tags').value = '';
    document.getElementById('form-content').value = '';
    document.getElementById('form-published').checked = false;
    document.getElementById('article-modal-title').innerText = '新增文章';

    if (artId) {
        const art = articlesCache.find(a => a.id === artId);
        if (art) {
            document.getElementById('art-edit-id').value = art.id;
            document.getElementById('form-title').value = art.title || '';
            document.getElementById('form-slug').value = art.slug || '';
            document.getElementById('form-summary').value = art.summary || '';
            document.getElementById('form-tags').value = art.tags ? art.tags.join(', ') : '';
            document.getElementById('form-content').value = art.content || '';
            document.getElementById('form-published').checked = !!art.published;
            document.getElementById('article-modal-title').innerText = '編輯文章';
        }
    }

    document.getElementById('article-modal').classList.remove('hidden');
}

window.closeArticleModal = function() {
    document.getElementById('article-modal').classList.add('hidden');
}

window.editArticle = function(id) {
    openArticleModal(id);
}

document.getElementById('article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('art-edit-id').value;
    const title = document.getElementById('form-title').value.trim();
    const slug = document.getElementById('form-slug').value.trim();
    const summary = document.getElementById('form-summary').value.trim();
    const tagsRaw = document.getElementById('form-tags').value;
    const content = document.getElementById('form-content').value;
    const published = document.getElementById('form-published').checked;

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

    const articleData = {
        title,
        slug,
        summary,
        tags,
        content,
        published,
        updatedAt: serverTimestamp()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, 'articles', editId), articleData);
            showModal("成功", "文章更新成功！");
        } else {
            articleData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'articles'), articleData);
            showModal("成功", "文章新增成功！");
        }

        closeArticleModal();
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error saving article:", error);
        showModal("錯誤", "儲存文章失敗：" + error.message);
    }
});

window.togglePublish = async function(id, publishedState) {
    try {
        await updateDoc(doc(db, 'articles', id), {
            published: publishedState,
            updatedAt: serverTimestamp()
        });
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error toggling publish state:", error);
        showModal("錯誤", "更新發佈狀態失敗：" + error.message);
    }
}

window.deleteArticle = async function(id) {
    if (!confirm("確定要刪除這篇文章嗎？此動作無法復原。")) return;
    try {
        await deleteDoc(doc(db, 'articles', id));
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error deleting article:", error);
        showModal("錯誤", "刪除文章失敗：" + error.message);
    }
}

window.approveComment = async function(id, status) {
    try {
        await updateDoc(doc(db, 'comments', id), { approved: status });
        await fetchAdminComments();
    } catch (error) {
        console.error("Error updating comment status:", error);
        showModal("錯誤", "更新留言狀態失敗：" + error.message);
    }
}

window.deleteComment = async function(id) {
    if (!confirm("確定要刪除這則留言嗎？")) return;
    try {
        await deleteDoc(doc(db, 'comments', id));
        await fetchAdminComments();
    } catch (error) {
        console.error("Error deleting comment:", error);
        showModal("錯誤", "刪除留言失敗：" + error.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}