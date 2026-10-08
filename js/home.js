import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { videoCard } from "./ui.js";

const CATEGORIES = [
    "Tout",
    "Gaming",
    "Musique",
    "Technologie",
    "Divertissement",
    "Tutoriels",
    "Sport",
    "Actualités",
    "Animation",
    "Autre",
];
let currentCat = "Tout";

export async function loadHome() {
    const catBox = document.getElementById("categories");
    if (catBox) {
        catBox.innerHTML = CATEGORIES.map(
            (c) =>
                `<div class="chip ${c === currentCat ? "active" : ""}" data-cat="${c}">${c}</div>`,
        ).join("");
        catBox.onclick = (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;
            currentCat = chip.dataset.cat;
            loadHome();
        };
    }
    await renderFeed();
}

async function renderFeed() {
    const feed = document.getElementById("feed");
    if (!feed) return;
    feed.innerHTML = `<div class="loading">Chargement...</div>`;

    try {
        const snap = await getDocs(
            query(
                collection(db, "videos"),
                where("visibility", "==", "public"),
                orderBy("createdAt", "desc"),
                limit(60),
            ),
        );
        let videos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (currentCat !== "Tout")
            videos = videos.filter((v) => v.category === currentCat);

        if (!videos.length) {
            feed.innerHTML = `
        <div class="empty">
          <h2>Bienvenue sur NovaTube</h2>
          <p>Commencez par publier votre première vidéo.</p>
        </div>`;
            return;
        }
        feed.innerHTML = `<div class="grid">${videos.map(videoCard).join("")}</div>`;
    } catch (e) {
        console.error(e);
        feed.innerHTML = `<div class="empty">Impossible de charger les vidéos.</div>`;
    }
}
