import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, timeAgo, toast, requireAuth } from "./ui.js";

export async function initWatchLater() {
    const user = await requireAuth();
    const box = document.getElementById("list");
    box.innerHTML = `<div class="loading">Chargement...</div>`;

    const snap = await getDocs(
        query(
            collection(db, "watchLater", user.uid, "items"),
            orderBy("addedAt", "desc"),
        ),
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!items.length) {
        box.innerHTML = `<div class="empty">
      <h2>Rien à regarder plus tard</h2>
      <p>Cliquez sur « Enregistrer » sous une vidéo pour l'ajouter ici.</p>
    </div>`;
        return;
    }

    box.innerHTML = `<div class="grid">
    ${items
        .map(
            (v) => `
      <div class="card">
        <a href="watch.html?id=${v.videoId}">
          <img class="thumb" src="${v.thumbnailUrl || "logo-icon.svg"}" alt="">
        </a>
        <div class="card-body">
          <a href="watch.html?id=${v.videoId}">
            <h3 class="card-title">${escapeHtml(v.title || "")}</h3>
          </a>
          <div class="card-meta">${escapeHtml(v.authorName || "")}</div>
          <button class="btn btn-sm" data-del="${v.id}" style="margin-top:8px">Retirer</button>
        </div>
      </div>`,
        )
        .join("")}
  </div>`;

    box.querySelectorAll("[data-del]").forEach((btn) => {
        btn.onclick = async () => {
            await deleteDoc(
                doc(db, "watchLater", user.uid, "items", btn.dataset.del),
            );
            toast("Retiré");
            initWatchLater();
        };
    });
}
