import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

export async function register(email, password, username) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        username,
        displayName: username,
        avatar: "",
        banner: "",
        description: "",
        subscribers: 0,
        createdAt: serverTimestamp(),
    });
    return cred.user;
}

export async function login(email, password) {
    return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function loginGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const ref = doc(db, "users", cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        const base = (cred.user.email || "user").split("@")[0];
        await setDoc(ref, {
            uid: cred.user.uid,
            email: cred.user.email,
            username: base,
            displayName: cred.user.displayName || base,
            avatar: cred.user.photoURL || "",
            banner: "",
            description: "",
            subscribers: 0,
            createdAt: serverTimestamp(),
        });
    }
    return cred.user;
}

export function logout() {
    return signOut(auth);
}
export function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
}
export function onAuth(cb) {
    return onAuthStateChanged(auth, cb);
}

export async function getUserProfile(uid) {
    const s = await getDoc(doc(db, "users", uid));
    return s.exists() ? s.data() : null;
}

export async function updateUserProfile(uid, data) {
    await updateDoc(doc(db, "users", uid), data);
}
