import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyATg9skGDHq-SgF05fX_-F_TVCm5k9d_Eo",
  authDomain: "anitamotors-2e65e.firebaseapp.com",
  projectId: "anitamotors-2e65e",
  storageBucket: "anitamotors-2e65e.firebasestorage.app",
  messagingSenderId: "510644075709",
  appId: "1:510644075709:web:325abd261ba7a9ac2b0bd4",
  measurementId: "G-69DZLQ3PCQ",
    databaseURL: "https://anitamotors-2e65e-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };