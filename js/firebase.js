import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCXqF25O_fY95trDrmv91Ml2081Cz5n3Ig",
    authDomain: "nova-dd955.firebaseapp.com",
    projectId: "nova-dd955",
    storageBucket: "nova-dd955.firebasestorage.app",
    messagingSenderId: "755658603627",
    appId: "1:755658603627:web:92b6cf81cc3cd6a598852e",
    measurementId: "G-PNXXC2ZR85",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// plus de `export const storage`
