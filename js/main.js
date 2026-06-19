import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db } from './firebase-app.js';
import { createPost, getPosts, likePost, getComments, addComment, deletePost } from './api.js';

let currentUser = null;

// UI Elements
const authBtn = document.getElementById('auth-btn');
const userInfo = document.getElementById('user-info');
const writeBtn = document.getElementById('write-btn');
const writeModal = document.getElementById('write-modal');
const myPageLink = document.getElementById('my-page-link');

// Auth Logic
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        userInfo.innerHTML = `👋 Hello, <strong>${user.displayName}</strong>`;
        userInfo.style.display = 'inline';
        writeBtn.style.display = 'inline-block';
        if(myPageLink) myPageLink.style.display = 'inline-block';
        authBtn.textContent = 'Logout';
        authBtn.style.background = 'rgba(150, 150, 150, 0.5)';
        authBtn.onclick = () => signOut(auth).catch(console.error);
        
        // Show comment input area in modal if open
        const commentInputArea = document.getElementById('comment-input-area');
        const loginToCommentMsg = document.getElementById('login-to-comment-msg');
        if (commentInputArea) commentInputArea.style.display = 'flex';
        if (loginToCommentMsg) loginToCommentMsg.style.display = 'none';
        
    } else {
        userInfo.style.display = 'none';
        writeBtn.style.display = 'none';
        if(myPageLink) myPageLink.style.display = 'none';
        authBtn.textContent = 'Login with Google';
        authBtn.style.background = 'var(--gold-primary)';
        authBtn.onclick = () => signInWithPopup(auth, provider).catch(console.error);
        
        // Hide comment input area in modal if open
        const commentInputArea = document.getElementById('comment-input-area');
        const loginToCommentMsg = document.getElementById('login-to-comment-msg');
        if (commentInputArea) commentInputArea.style.display = 'none';
        if (loginToCommentMsg) loginToCommentMsg.style.display = 'block';
    }
});

// Modal Logic
window.closeWriteModal = function() {
    writeModal.classList.remove('active');
}
writeBtn.onclick = () => {
    writeModal.classList.add('active');
};

// ImgBB Upload Logic
const imageUploadInput = document.getElementById('post-image-upload');
const imageUrlInput = document.getElementById('post-image-url');
const imageUploadStatus = document.getElementById('image-upload-status');

// ⚠️ TODO: Replace with actual imgBB API Key
const IMGBB_API_KEY = "a7e534168cb415133ab67bf4e005f7bb";

imageUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (IMGBB_API_KEY === "YOUR_IMGBB_API_KEY") {
        alert("請先至 js/main.js 填寫您的 imgBB API Key！");
        return;
    }

    imageUploadStatus.textContent = "上傳中...";
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            imageUrlInput.value = data.data.url;
            imageUploadStatus.textContent = "✅ 上傳成功！";
            imageUploadStatus.style.color = "#4CAF50";
        } else {
            imageUploadStatus.textContent = "❌ 上傳失敗：" + data.error.message;
            imageUploadStatus.style.color = "red";
        }
    } catch (err) {
        console.error(err);
        imageUploadStatus.textContent = "❌ 上傳發生錯誤";
        imageUploadStatus.style.color = "red";
    }
});

// Submit Post
const submitBtn = document.getElementById('submit-post-btn');
submitBtn.onclick = async () => {
    if (!currentUser) return alert("請先登入！");
    
    const title = document.getElementById('post-title').value;
    const category = document.getElementById('post-category').value;
    const content = document.getElementById('post-content').value;
    const imgUrl = document.getElementById('post-image-url').value;
    const mapIframe = document.getElementById('post-map-iframe').value;

    if (!title || !content) return alert("標題與內文為必填！");
    if (!imgUrl) return alert("請上傳一張封面圖片！");

    submitBtn.textContent = "發佈中...";
    submitBtn.disabled = true;

    try {
        await createPost({
            title,
            category,
            content, // Markdown
            img: imgUrl,
            mapIframe,
            authorId: currentUser.uid,
            authorName: currentUser.displayName,
            authorAvatar: currentUser.photoURL
        });
        
        alert("文章發佈成功！");
        closeWriteModal();
        // Reset form
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        document.getElementById('post-image-url').value = '';
        document.getElementById('post-map-iframe').value = '';
        imageUploadStatus.textContent = '';
        
        loadPosts(); // Reload cards
    } catch (e) {
        alert("發佈失敗，請查看 console 錯誤");
    } finally {
        submitBtn.textContent = "發佈文章";
        submitBtn.disabled = false;
    }
};

// Initial load hook
// Replace the static renderCards with dynamic data fetching later
const restaurantGrid = document.getElementById('restaurantGrid');

async function loadPosts() {
    try {
        window.allPosts = await getPosts();
        initTabs(window.allPosts); // Initialize tabs based on loaded posts
        renderDynamicCards(window.allPosts);
    } catch (e) {
        console.error("Failed to load posts:", e);
    }
}

// Global scope for HTML onclick
window.currentUser = null; 
onAuthStateChanged(auth, (user) => { window.currentUser = user; }); // Expose to window

function initTabs(posts) {
    const filterContainer = document.getElementById('filterContainer');
    const filterIndicator = document.getElementById('filterIndicator');
    if (!filterContainer || !filterIndicator) return;
    
    filterContainer.innerHTML = '';
    const categories = ['全部', ...new Set(posts.map(p => p.category).filter(c => c))];

    window.updateIndicator = function(activeBtn) {
        if(!activeBtn) return;
        filterIndicator.style.left = activeBtn.offsetLeft + 'px';
        filterIndicator.style.width = activeBtn.offsetWidth + 'px';
    };

    categories.forEach((cat) => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${cat === '全部' ? 'active' : ''}`;
        btn.textContent = cat;
        
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.updateIndicator(btn); // 觸發膠囊滑動
            renderDynamicCards(cat === '全部' ? posts : posts.filter(p => p.category === cat));
        };
        filterContainer.appendChild(btn);

        // 畫面剛載入時，將膠囊定位在「全部」按鈕上
        if (cat === '全部') {
            setTimeout(() => window.updateIndicator(btn), 50); 
        }
    });
}

window.filterMyPosts = function(authorId) {
    if (!window.allPosts) return;
    
    // Clear active tab when jumping to personal page
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const filterIndicator = document.getElementById('filterIndicator');
    if (filterIndicator) filterIndicator.style.width = '0px';

    if (authorId) {
        const myPosts = window.allPosts.filter(p => p.authorId === authorId);
        renderDynamicCards(myPosts);
    } else {
        // "關於我" 或 "影像藝廊"
        renderDynamicCards(window.allPosts);
        // Reset to All tab
        const firstBtn = document.querySelector('.filter-btn');
        if (firstBtn) {
            firstBtn.classList.add('active');
            if (window.updateIndicator) window.updateIndicator(firstBtn);
        }
    }
}

function renderDynamicCards(data) {
    restaurantGrid.innerHTML = ''; 
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card scroll-fade';
        // Click to open Article Detail Modal instead of lightbox
        card.onclick = () => openArticleModal(item);
        
        card.innerHTML = `
            <div class="img-container">
                <img src="${item.img || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="card-footer" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
                <span style="font-size: 0.75em; background: var(--gold-primary); color: white; padding: 2px 8px; border-radius: 12px;">${item.category}</span>
                <h3 class="card-title" style="font-size: 1.1em;">${item.title}</h3>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8em; color: var(--text-muted); width: 100%;">
                    <img src="${item.authorAvatar || 'https://via.placeholder.com/30'}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                    <span>${item.authorName}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('mousedown', () => card.style.transform = "scale(0.94)");
        card.addEventListener('mouseup', () => card.style.transform = "");
        card.addEventListener('mouseleave', () => card.style.transform = "");
        
        restaurantGrid.appendChild(card);
    });
    
    if(window.applyScrollAnimation) {
        setTimeout(window.applyScrollAnimation, 50);
    }
}

// Article Detail Modal Logic
const articleModal = document.getElementById('article-modal');
const articleCover = document.getElementById('article-cover');
const articleCategory = document.getElementById('article-category');
const articleTitle = document.getElementById('article-title');
const articleAuthorName = document.getElementById('article-author-name');
const articleAuthorAvatar = document.getElementById('article-author-avatar');
const articleContent = document.getElementById('article-content');
const articleMapContainer = document.getElementById('article-map-container');

// Social UI Elements
const likeBtn = document.getElementById('like-btn');
const likeCount = document.getElementById('like-count');
const commentsSection = document.getElementById('comments-section');
const commentInput = document.getElementById('comment-input');
const submitCommentBtn = document.getElementById('submit-comment-btn');

let currentActivePost = null;

window.openArticleModal = async function(post) {
    currentActivePost = post;
    articleCover.src = post.img || '';
    articleCategory.textContent = post.category || '';
    articleTitle.textContent = post.title || '';
    
    let actionButtonsHTML = '';
    
    // If user is author, show delete button. Otherwise show follow button
    if (currentUser && currentUser.uid === post.authorId) {
        actionButtonsHTML = `<button id="delete-post-btn" style="margin-left: 10px; background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; cursor: pointer; transition: 0.2s;"><i class="fas fa-trash"></i> 刪除</button>`;
    } else {
        actionButtonsHTML = `<button id="follow-btn" style="margin-left: 10px; background: transparent; border: 1px solid var(--gold-primary); color: var(--gold-primary); padding: 2px 8px; border-radius: 12px; font-size: 0.8em; cursor: pointer;">追蹤</button>`;
    }
    
    articleAuthorName.innerHTML = `${post.authorName || ''} ${actionButtonsHTML}`;
    articleAuthorAvatar.src = post.authorAvatar || 'https://via.placeholder.com/30';
    likeCount.textContent = post.likes || 0;
    
    // Delete Logic
    const deleteBtn = document.getElementById('delete-post-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (confirm("確定要刪除這篇文章嗎？刪除後無法恢復喔！")) {
                try {
                    deleteBtn.textContent = "刪除中...";
                    deleteBtn.disabled = true;
                    await deletePost(post.id);
                    alert("刪除成功！");
                    closeArticleModal();
                    loadPosts();
                } catch (e) {
                    alert("刪除失敗，權限不足或發生錯誤");
                    console.error(e);
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 刪除';
                    deleteBtn.disabled = false;
                }
            }
        };
    }
    
    // Follow logic placeholder
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        if (!currentUser || currentUser.uid === post.authorId) {
            followBtn.style.display = 'none';
        } else {
            followBtn.onclick = () => {
                alert(`已追蹤 ${post.authorName}！(僅為 UI 演示)`);
                followBtn.textContent = '已追蹤';
                followBtn.style.background = 'var(--gold-primary)';
                followBtn.style.color = 'white';
            };
        }
    }
    
    // Parse Markdown securely
    const rawHtml = marked.parse(post.content || '');
    articleContent.innerHTML = DOMPurify.sanitize(rawHtml);
    
    // Inject Google Maps if available
    if (post.mapIframe) {
        articleMapContainer.innerHTML = post.mapIframe;
        articleMapContainer.style.display = 'block';
        const iframe = articleMapContainer.querySelector('iframe');
        if(iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
        }
    } else {
        articleMapContainer.style.display = 'none';
        articleMapContainer.innerHTML = '';
    }
    
    articleModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Check auth state for comment UI
    const commentInputArea = document.getElementById('comment-input-area');
    const loginToCommentMsg = document.getElementById('login-to-comment-msg');
    if (currentUser) {
        commentInputArea.style.display = 'flex';
        loginToCommentMsg.style.display = 'none';
    } else {
        commentInputArea.style.display = 'none';
        loginToCommentMsg.style.display = 'block';
    }
    
    await loadComments(post.id);
}

window.closeArticleModal = function() {
    articleModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    articleMapContainer.innerHTML = ''; 
    currentActivePost = null;
}

// Load Comments
async function loadComments(postId) {
    commentsSection.innerHTML = '<div style="text-align: center; color: var(--text-muted);">載入中...</div>';
    try {
        const comments = await getComments(postId);
        commentsSection.innerHTML = '';
        if (comments.length === 0) {
            commentsSection.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.9em;">還沒有人留言，來當第一個吧！</div>';
            return;
        }
        
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '10px 15px';
            div.style.background = 'rgba(150, 150, 150, 0.1)';
            div.style.borderRadius = '12px';
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                    <img src="${c.authorAvatar}" style="width: 24px; height: 24px; border-radius: 50%;">
                    <strong style="font-size: 0.85em;">${c.authorName}</strong>
                </div>
                <div style="font-size: 0.95em; color: var(--text-main); margin-left: 32px;">${c.text}</div>
            `;
            commentsSection.appendChild(div);
        });
    } catch (e) {
        commentsSection.innerHTML = '<div style="color: red;">讀取留言失敗</div>';
        console.error(e);
    }
}

// Submit Comment
submitCommentBtn.onclick = async () => {
    if (!currentUser || !currentActivePost) return;
    const text = commentInput.value.trim();
    if (!text) return;
    
    submitCommentBtn.disabled = true;
    try {
        await addComment(currentActivePost.id, {
            text: text,
            authorId: currentUser.uid,
            authorName: currentUser.displayName,
            authorAvatar: currentUser.photoURL
        });
        commentInput.value = '';
        await loadComments(currentActivePost.id); // Reload
    } catch (e) {
        alert("留言失敗");
        console.error(e);
    } finally {
        submitCommentBtn.disabled = false;
    }
};

// Like logic
likeBtn.onclick = async () => {
    if (!currentActivePost) return;
    // Simple optimistic UI update
    const currentLikes = currentActivePost.likes || 0;
    likeCount.textContent = currentLikes + 1;
    likeBtn.style.color = 'red';
    likeBtn.style.transform = 'scale(1.2)';
    setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
    
    try {
        const newLikes = await likePost(currentActivePost.id, currentLikes);
        currentActivePost.likes = newLikes;
        likeCount.textContent = newLikes;
        loadPosts(); // update background cards silently
    } catch (e) {
        console.error("Like failed", e);
        likeCount.textContent = currentLikes; // revert
        likeBtn.style.color = 'var(--text-main)';
    }
};

// Load dynamic posts on init
window.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});
