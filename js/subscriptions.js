import { db, auth } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { videoCard, requireAuth } from "./ui.js";

export async function initSubscriptions() {
    const user = await requireAuth();
    const box = document.getElementById("feed");
    box.innerHTML = `<div class="loading">Chargement...</div>`;

    const subSnap = await getDocs(
        collection(db, "users", user.uid, "subscriptions"),
    );
    const channelIds = subSnap.docs.map((d) => d.id);

    if (!channelIds.length) {
        box.innerHTML = `<div class="empty">
      <h2>Aucun abonnement</h2>
      <p>Abonnez-vous à des chaînes pour voir leurs vidéos ici.</p>
    </div>`;
        return;
    }

    const all = [];
    for (const cid of channelIds) {
        const vSnap = await getDocs(
            query(
                collection(db, "videos"),
                where("authorId", "==", cid),
                where("visibility", "==", "public"),
                orderBy("createdAt", "desc"),
                limit(20),
            ),
        );
        vSnap.forEach((d) => all.push({ id: d.id, ...d.data() }));
    }
    all.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );

    if (!all.length) {
        box.innerHTML = `<div class="empty"><p>Aucune vidéo des chaînes auxquelles vous êtes abonné.</p></div>`;
        return;
    }
    box.innerHTML = `<div class="grid">${all.map(videoCard).join("")}</div>`;
}
