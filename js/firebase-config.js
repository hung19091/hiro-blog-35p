import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCd412nT8AvOo7sQv1Mx6_IThrk-usiavU",
    authDomain: "hiro-blog-35p.firebaseapp.com",
    projectId: "hiro-blog-35p",
    storageBucket: "hiro-blog-35p.firebasestorage.app",
    messagingSenderId: "29104153580",
    appId: "1:29104153580:web:9ab775cab567d8517016c9",
    measurementId: "G-S0TR22SR32"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);