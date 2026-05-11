import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBhwW31ARDKBmUZssh_-UDBnwaIQDdMC70",
  authDomain: "xay-dung-hdcons.firebaseapp.com",
  projectId: "xay-dung-hdcons",
  storageBucket: "xay-dung-hdcons.firebasestorage.app",
  messagingSenderId: "481990730856",
  appId: "1:481990730856:web:7d4aa97de7bdc2497147dd",
  measurementId: "G-MMV7B0MFXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
