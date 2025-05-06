import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9EqC4YlzV2FSvcwk0LOnhJgRBoSgo2aw",
  authDomain: "stok-urun.firebaseapp.com",
  databaseURL: "https://stok-urun-default-rtdb.firebaseio.com",
  projectId: "stok-urun",
  storageBucket: "stok-urun.firebasestorage.app",
  messagingSenderId: "616262886686",
  appId: "1:616262886686:web:4a129bf6e2cf9af6e7950f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };