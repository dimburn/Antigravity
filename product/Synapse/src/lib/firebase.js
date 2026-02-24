// Firebase設定
// Synapse WBS Project Manager

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCcqztRukmhi6tuMYU2DuCo0sL4wECIgTI",
    authDomain: "synapse-3bded.firebaseapp.com",
    projectId: "synapse-3bded",
    storageBucket: "synapse-3bded.firebasestorage.app",
    messagingSenderId: "961219571980",
    appId: "1:961219571980:web:ff7c27865fc321ae86d929",
    measurementId: "G-C1SN4ZFNWK"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firestore データベース
export const db = getFirestore(app);

// Firebase Authentication
export const auth = getAuth(app);

// Google認証プロバイダー
export const googleProvider = new GoogleAuthProvider();

export default app;
