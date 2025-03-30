import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyALaIOhUCvD6SNsTdiAly1c_7WrQBcwDiU",
    authDomain: "anitamotors-5f061.firebaseapp.com",
    projectId: "anitamotors-5f061",
    storageBucket: "anitamotors-5f061.firebasestorage.app",
    messagingSenderId: "1039981654791",
    appId: "1:1039981654791:web:2d03e619aaedf51957cba2",
    databaseURL: "https://anitamotors-5f061-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };