// frontend/src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyB-DgljUqQ7DxJNIwjzaCJ9e2r3okVeDvc",
    authDomain: "careers-scan.firebaseapp.com",
    projectId: "careers-scan",
    storageBucket: "careers-scan.firebasestorage.app",
    messagingSenderId: "951288308374",
    appId: "1:951288308374:web:7a6a0b9642b913b60d58b7",
    measurementId: "G-CGR99M9W5W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const storage = getStorage(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;