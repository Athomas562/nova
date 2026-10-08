import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, toast, requireAuth } from "./ui.js";

export async function initPlaylists() {
    const user = await requireAuth();
    const box = document.getElementById("list");
    box.innerHTML = `<div class="loading">Chargement...</div>`;

    const snap = await getDocs(
        query(collection(db, "playlists"), where("ownerId", "==", user.uid)),
    );
    const playlists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    box.innerHTML = `
    <button class="btn btn-primary" id="newPlaylist">+ Nouvelle playlist</button>
    <div id="playlistsBox" style="margin-top:20px"></div>`;

    const pb = document.getElementById("playlistsBox");
    if (!playlists.length) {
        pb.innerHTML = `<div class="empty"><p>Aucune playlist pour l'instant.</p></div>`;
    } else {
        pb.innerHTML = `<div class="grid">
      ${playlists
          .map(
              (p) => `
        <div class="card" style="cursor:default">
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(p.name)}</h3>
            <div class="card-meta">${p.visibility === "public" ? "Publique" : "Privée"}</div>
            <div class="row" style="margin-top:12px">
              <button class="btn btn-sm" data-edit="${p.id}">Modifier</button>
              <button class="btn btn-sm btn-danger" data-del="${p.id}">Supprimer</button>
            </div>
          </div>
        </div>`,
          )
          .join("")}
    </div>`;
    }

    document.getElementById("newPlaylist").onclick = () => openModal();

    pb.querySelectorAll("[data-edit]").forEach(
        (b) =>
            (b.onclick = () =>
                openModal(playlists.find((p) => p.id === b.dataset.edit))),
    );
    pb.querySelectorAll("[data-del]").forEach(
        (b) =>
            (b.onclick = async () => {
                if (!confirm("Supprimer cette playlist ?")) return;
                await deleteDoc(doc(db, "playlists", b.dataset.del));
                toast("Playlist supprimée");
                initPlaylists();
            }),
    );
}

function openModal(p = null) {
    const modal = document.getElementById("plModal");
    modal.classList.remove("hidden");
    document.getElementById("plName").value = p?.name || "";
    document.getElementById("plDesc").value = p?.description || "";
    document.getElementById("plVis").value = p?.visibility || "private";
    modal.querySelector(".close").onclick = () => modal.classList.add("hidden");

    document.getElementById("plSave").onclick = async () => {
        const user = (await import("./firebase.js")).auth.currentUser;
        const data = {
            name: document.getElementById("plName").value.trim(),
            description: document.getElementById("plDesc").value.trim(),
            visibility: document.getElementById("plVis").value,
        };
        if (!data.name) return toast("Nom requis", "error");
        if (p) {
            await updateDoc(doc(db, "playlists", p.id), data);
            toast("Playlist modifiée", "success");
        } else {
            await addDoc(collection(db, "playlists"), {
                ...data,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
            });
            toast("Playlist créée", "success");
        }
        modal.classList.add("hidden");
        initPlaylists();
    };
}
