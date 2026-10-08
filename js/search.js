import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, formatViews, timeAgo, getParam, videoCard } from "./ui.js";

export async function initSearch() {
    const q = getParam("q") || "";
    const input = document.getElementById("searchInput");
    if (input) input.value = q;

    const result = document.getElementById("results");
    const title = document.getElementById("resultTitle");
    if (title) title.textContent = q ? `Résultats pour « ${q} »` : "Recherche";

    if (!q) {
        result.innerHTML = `<div class="empty"><p>Tapez quelque chose pour rechercher.</p></div>`;
        return;
    }

    const lower = q.toLowerCase();
    result.innerHTML = `<div class="loading">Recherche...</div>`;

    try {
        // Cherche vidéos publiques
        const vSnap = await getDocs(
            query(
                collection(db, "videos"),
                where("visibility", "==", "public"),
                orderBy("createdAt", "desc"),
                limit(200),
            ),
        );
        const videos = vSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
                (v) =>
                    (v.title || "").toLowerCase().includes(lower) ||
                    (v.description || "").toLowerCase().includes(lower) ||
                    (v.category || "").toLowerCase().includes(lower) ||
                    (v.tags || []).some((t) =>
                        t.toLowerCase().includes(lower),
                    ) ||
                    (v.authorName || "").toLowerCase().includes(lower),
            );

        // Cherche chaînes
        const uSnap = await getDocs(collection(db, "users"));
        const channels = uSnap.docs
            .map((d) => d.data())
            .filter(
                (u) =>
                    (u.username || "").toLowerCase().includes(lower) ||
                    (u.displayName || "").toLowerCase().includes(lower),
            );

        let html = "";

        if (channels.length) {
            html += `<h3 style="margin:20px 0 12px">Chaînes</h3>`;
            html += `<div class="row" style="gap:20px;margin-bottom:24px">`;
            html += channels
                .map(
                    (u) => `
        <a href="channel.html?id=${u.uid}" class="row" style="text-decoration:none;color:inherit">
          <img src="${u.avatar || "logo-icon.svg"}" class="avatar-lg" alt="">
          <div>
            <div style="font-weight:600">${escapeHtml(u.displayName || u.username)}</div>
            <div class="muted">@${escapeHtml(u.username || "")} · ${u.subscribers || 0} abonnés</div>
          </div>
        </a>`,
                )
                .join("");
            html += `</div>`;
        }

        if (videos.length) {
            html += `<h3 style="margin:20px 0 12px">Vidéos</h3>`;
            html += `<div class="grid">${videos.map(videoCard).join("")}</div>`;
        }

        if (!html) {
            html = `<div class="empty"><p>Aucun résultat pour « ${escapeHtml(q)} ».</p></div>`;
        }

        result.innerHTML = html;
    } catch (e) {
        console.error(e);
        result.innerHTML = `<div class="empty">Erreur pendant la recherche.</div>`;
    }
}
