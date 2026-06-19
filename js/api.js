import { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from './firebase-app.js';

// API functions to interact with Firestore

// 取得所有文章
export async function getPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
}

// 刪除文章
export async function deletePost(postId) {
    const postRef = doc(db, "posts", postId);
    await deleteDoc(postRef);
}

// 建立新文章
export async function createPost(postData) {
    try {
        const docRef = await addDoc(collection(db, "posts"), {
            ...postData,
            createdAt: serverTimestamp(),
            likes: 0
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
}

// 增加按讚數
export async function likePost(postId, currentLikes) {
    const postRef = doc(db, "posts", postId);
    await setDoc(postRef, { likes: currentLikes + 1 }, { merge: true });
    return currentLikes + 1;
}

// 取得留言
export async function getComments(postId) {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    const comments = [];
    querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() });
    });
    return comments;
}

// 新增留言
export async function addComment(postId, commentData) {
    await addDoc(collection(db, `posts/${postId}/comments`), {
        ...commentData,
        createdAt: serverTimestamp()
    });
}
