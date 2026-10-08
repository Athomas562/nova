import { db, auth } from "./firebase.js";
import {
    doc,
    getDoc,
    updateDoc,
    increment,
    setDoc,
    deleteDoc,
    serverTimestamp,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    formatViews,
    formatSubs,
    timeAgo,
    escapeHtml,
    getParam,
    toast,
    sideVideoItem,
} from "./ui.js";
import { loadComments } from "./comments.js";

let currentVideoId = null;
let currentVideo = null;

export async function initWatch() {
    const id = getParam("id");
    if (!id) {
        location.href = "index.html";
        return;
    }
    currentVideoId = id;

    const snap = await getDoc(doc(db, "videos", id));
    if (!snap.exists()) {
        document.getElementById("main").innerHTML =
            `<div class="empty"><h2>Vidéo introuvable</h2></div>`;
        return;
    }
    currentVideo = snap.data();

    // ---- Rendu principal ----
    document.title = `${currentVideo.title} — NovaTube`;
    document.getElementById("videoEl").src = currentVideo.videoUrl;
    document.getElementById("videoEl").poster = currentVideo.thumbnailUrl || "";
    document.getElementById("titleEl").textContent = currentVideo.title;
    document.getElementById("metaEl").textContent =
        `${formatViews(currentVideo.views)} • ${timeAgo(currentVideo.createdAt)}`;

    document.getElementById("authorAvatar").src =
        currentVideo.authorAvatar || "logo-icon.svg";
    document.getElementById("authorName").textContent = currentVideo.authorName;
    document.getElementById("authorName").href =
        `channel.html?id=${currentVideo.authorId}`;
    document.getElementById("authorAvatarLink").href =
        `channel.html?id=${currentVideo.authorId}`;

    document.getElementById("descEl").textContent =
        currentVideo.description || "";

    // ---- Comptage de vue unique ----
    const key = `viewed_${id}`;
    if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        try {
            await updateDoc(doc(db, "videos", id), { views: increment(1) });
            document.getElementById("metaEl").textContent =
                `${formatViews((currentVideo.views || 0) + 1)} • ${timeAgo(currentVideo.createdAt)}`;

            if (auth.currentUser) {
                await setDoc(
                    doc(db, "history", auth.currentUser.uid, "items", id),
                    {
                        videoId: id,
                        title: currentVideo.title,
                        thumbnailUrl: currentVideo.thumbnailUrl || "",
                        authorName: currentVideo.authorName || "",
                        watchedAt: serverTimestamp(),
                    },
                );
            }
        } catch (e) {
            console.warn("Vue non comptée:", e);
        }
    }

    // ---- Boutons ----
    setupLikeButton();
    setupSaveButton();
    setupShareButton();
    setupSubscribeButton();

    // ---- Commentaires ----
    loadComments(id);

    // ---- Suggestions ----
    loadSuggestions(id);
}

async function loadSuggestions(excludeId) {
    const box = document.getElementById("suggestions");
    if (!box) return;
    try {
        const snap = await getDocs(
            query(
                collection(db, "videos"),
                where("visibility", "==", "public"),
                orderBy("createdAt", "desc"),
                limit(15),
            ),
        );
        const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((v) => v.id !== excludeId);
        box.innerHTML = list.length
            ? list.map(sideVideoItem).join("")
            : `<div class="muted" style="padding:12px">Aucune autre vidéo pour l'instant.</div>`;
    } catch (e) {
        console.error(e);
        box.innerHTML = `<div class="muted" style="padding:12px">Suggestions indisponibles.</div>`;
    }
}

async function setupLikeButton() {
    const btn = document.getElementById("likeBtn");
    if (!btn) return;
    const count = document.getElementById("likeCount");
    count.textContent = currentVideo.likes || 0;

    // État initial
    let liked = false;
    if (auth.currentUser) {
        const s = await getDoc(
            doc(db, "videos", currentVideoId, "likes", auth.currentUser.uid),
        );
        liked = s.exists() && s.data().liked;
    }
    updateLikeUI(btn, liked);

    btn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return toast("Connectez-vous pour liker", "error");
        const ref = doc(db, "videos", currentVideoId, "likes", user.uid);
        const s = await getDoc(ref);
        if (s.exists() && s.data().liked) {
            await updateDoc(ref, { liked: false });
            await updateDoc(doc(db, "videos", currentVideoId), {
                likes: increment(-1),
            });
            count.textContent = Math.max(
                0,
                (parseInt(count.textContent) || 0) - 1,
            );
            updateLikeUI(btn, false);
        } else {
            await setDoc(ref, { liked: true, at: serverTimestamp() });
            await updateDoc(doc(db, "videos", currentVideoId), {
                likes: increment(1),
            });
            count.textContent = (parseInt(count.textContent) || 0) + 1;
            updateLikeUI(btn, true);
        }
    };
}

function updateLikeUI(btn, liked) {
    btn.classList.toggle("liked", liked);
    btn.querySelector(".label").textContent = liked ? "Aimé" : "J'aime";
}

async function setupSaveButton() {
    const btn = document.getElementById("saveBtn");
    if (!btn) return;
    btn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return toast("Connectez-vous pour enregistrer", "error");
        const ref = doc(db, "watchLater", user.uid, "items", currentVideoId);
        const s = await getDoc(ref);
        if (s.exists()) {
            await deleteDoc(ref);
            toast("Retiré de À regarder plus tard");
        } else {
            await setDoc(ref, {
                videoId: currentVideoId,
                title: currentVideo.title,
                thumbnailUrl: currentVideo.thumbnailUrl || "",
                authorName: currentVideo.authorName || "",
                addedAt: serverTimestamp(),
            });
            toast("Ajouté à À regarder plus tard", "success");
        }
    };
}

function setupShareButton() {
    const btn = document.getElementById("shareBtn");
    if (!btn) return;
    btn.onclick = async () => {
        const url = location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: currentVideo.title, url });
                return;
            } catch {}
        }
        try {
            await navigator.clipboard.writeText(url);
            toast("Lien copié", "success");
        } catch {
            toast("Impossible de copier le lien", "error");
        }
    };
}

async function setupSubscribeButton() {
    const btn = document.getElementById("subscribeBtn");
    const subsEl = document.getElementById("authorSubs");
    if (!btn) return;

    // Charge le nombre d'abonnés
    try {
        const s = await getDoc(doc(db, "users", currentVideo.authorId));
        if (s.exists())
            subsEl.textContent = formatSubs(s.data().subscribers || 0);
    } catch {}

    const user = auth.currentUser;
    if (!user || user.uid === currentVideo.authorId) {
        btn.style.display =
            user && user.uid === currentVideo.authorId ? "none" : "";
        if (!user) btn.onclick = () => (location.href = "login.html");
        return;
    }

    const ref = doc(
        db,
        "users",
        user.uid,
        "subscriptions",
        currentVideo.authorId,
    );
    const s = await getDoc(ref);
    updateSubUI(btn, s.exists());

    btn.onclick = async () => {
        const exists = (await getDoc(ref)).exists();
        if (exists) {
            await deleteDoc(ref);
            await updateDoc(doc(db, "users", currentVideo.authorId), {
                subscribers: increment(-1),
            });
            updateSubUI(btn, false);
            toast("Désabonné");
        } else {
            await setDoc(ref, {
                channelId: currentVideo.authorId,
                at: serverTimestamp(),
            });
            await updateDoc(doc(db, "users", currentVideo.authorId), {
                subscribers: increment(1),
            });
            await setDoc(
                doc(
                    collection(
                        db,
                        "notifications",
                        currentVideo.authorId,
                        "items",
                    ),
                ),
                {
                    type: "subscribe",
                    from: user.uid,
                    fromName: user.displayName || "",
                    at: serverTimestamp(),
                    read: false,
                },
            );
            updateSubUI(btn, true);
            toast("Abonné", "success");
        }
    };
}

function updateSubUI(btn, subbed) {
    btn.textContent = subbed ? "Abonné" : "S'abonner";
    btn.classList.toggle("btn-primary", !subbed);
}
