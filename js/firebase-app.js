import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBoahh-jhvflVqP0V098iYVnSZD8-R-NpA",
    authDomain: "food-blog-e5c93.firebaseapp.com",
    projectId: "food-blog-e5c93",
    storageBucket: "food-blog-e5c93.firebasestorage.app",
    messagingSenderId: "436961293762",
    appId: "1:436961293762:web:e974760e8c6a4148d6925b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp };
