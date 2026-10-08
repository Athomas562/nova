import { db, auth } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    deleteDoc,
    writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, timeAgo, toast, requireAuth } from "./ui.js";

export async function initHistory() {
    const user = await requireAuth();
    const box = document.getElementById("list");
    box.innerHTML = `<div class="loading">Chargement...</div>`;

    const snap = await getDocs(
        query(
            collection(db, "history", user.uid, "items"),
            orderBy("watchedAt", "desc"),
        ),
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!items.length) {
        box.innerHTML = `<div class="empty"><h2>Historique vide</h2></div>`;
        return;
    }

    box.innerHTML = `
    <div class="row" style="margin-bottom:16px">
      <button class="btn btn-danger" id="clearHistory">Vider l'historique</button>
    </div>
    <div class="side-list">
      ${items
          .map(
              (v) => `
        <div class="side-item" data-id="${v.id}">
          <a href="watch.html?id=${v.id}">
            <img class="thumb-sm" src="${v.thumbnailUrl || "logo-icon.svg"}" alt="">
          </a>
          <div class="info" style="flex:1">
            <a href="watch.html?id=${v.id}">
              <div class="t">${escapeHtml(v.title || "")}</div>
              <div class="m">${escapeHtml(v.authorName || "")}</div>
              <div class="m">${timeAgo(v.watchedAt)}</div>
            </a>
            <button class="btn btn-sm" data-del="${v.id}" style="margin-top:6px">Retirer</button>
          </div>
        </div>`,
          )
          .join("")}
    </div>`;

    document.getElementById("clearHistory").onclick = async () => {
        if (!confirm("Vider tout l'historique ?")) return;
        const batch = writeBatch(db);
        items.forEach((v) =>
            batch.delete(doc(db, "history", user.uid, "items", v.id)),
        );
        await batch.commit();
        toast("Historique vidé", "success");
        initHistory();
    };

    box.querySelectorAll("[data-del]").forEach((btn) => {
        btn.onclick = async () => {
            await deleteDoc(
                doc(db, "history", user.uid, "items", btn.dataset.del),
            );
            toast("Retiré de l'historique");
            initHistory();
        };
    });
}
