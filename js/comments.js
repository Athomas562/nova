import { db, auth } from "./firebase.js";
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, timeAgo, toast } from "./ui.js";
import { getUserProfile } from "./auth.js";

let videoId = null;

export async function loadComments(id) {
    videoId = id;
    const box = document.getElementById("commentsList");
    if (!box) return;
    box.innerHTML = `<div class="muted">Chargement...</div>`;

    const snap = await getDocs(
        query(
            collection(db, "videos", id, "comments"),
            orderBy("createdAt", "desc"),
        ),
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderComments(items);
    setupCommentForm();
}

function renderComments(items) {
    const box = document.getElementById("commentsList");
    const countEl = document.getElementById("commentsCount");
    if (countEl) countEl.textContent = items.length;

    if (!items.length) {
        box.innerHTML = `<div class="muted">Aucun commentaire. Soyez le premier !</div>`;
        return;
    }
    box.innerHTML = items
        .map((c) => {
            const me = auth.currentUser && auth.currentUser.uid === c.authorId;
            return `
      <div class="comment" data-id="${c.id}">
        <img class="avatar-sm" src="${c.authorAvatar || "logo-icon.svg"}" alt="">
        <div class="body">
          <div class="head">
            <span class="name">${escapeHtml(c.authorName || "Anonyme")}</span>
            <span class="date">${timeAgo(c.createdAt)}</span>
          </div>
          <div class="text">${escapeHtml(c.text)}</div>
          ${
              me
                  ? `
            <div class="actions">
              <button data-act="edit">Modifier</button>
              <button data-act="delete">Supprimer</button>
            </div>`
                  : ""
          }
        </div>
      </div>`;
        })
        .join("");

    box.querySelectorAll(".comment").forEach((el) => {
        const id = el.dataset.id;
        const editBtn = el.querySelector('[data-act="edit"]');
        const delBtn = el.querySelector('[data-act="delete"]');

        editBtn &&
            editBtn.addEventListener("click", () => {
                const textEl = el.querySelector(".text");
                const current = textEl.textContent;
                const input = document.createElement("textarea");
                input.className = "comment-input";
                input.value = current;
                input.style.cssText =
                    "width:100%;background:#17171f;border:1px solid #2a2a36;color:#fff;padding:8px;border-radius:8px;font-family:inherit;";
                textEl.replaceWith(input);
                const save = document.createElement("button");
                save.className = "btn btn-sm btn-primary";
                save.textContent = "Enregistrer";
                save.style.marginTop = "6px";
                input.after(save);
                editBtn.remove();
                delBtn.remove();

                save.onclick = async () => {
                    const val = input.value.trim();
                    if (!val) return toast("Commentaire vide", "error");
                    await updateDoc(
                        doc(db, "videos", videoId, "comments", id),
                        { text: val },
                    );
                    toast("Commentaire modifié", "success");
                    loadComments(videoId);
                };
            });

        delBtn &&
            delBtn.addEventListener("click", async () => {
                if (!confirm("Supprimer ce commentaire ?")) return;
                await deleteDoc(doc(db, "videos", videoId, "comments", id));
                toast("Commentaire supprimé");
                loadComments(videoId);
            });
    });
}

function setupCommentForm() {
    const form = document.getElementById("commentForm");
    if (!form || form.dataset.ready) return;
    form.dataset.ready = "1";

    if (!auth.currentUser) {
        form.innerHTML = `<div class="muted">
      <a href="login.html" style="color:var(--accent-2)">Connectez-vous</a> pour commenter.
    </div>`;
        return;
    }

    form.innerHTML = `
    <img class="avatar-sm" id="myAvatar" src="logo-icon.svg" alt="">
    <textarea id="commentInput" placeholder="Ajouter un commentaire..."></textarea>
    <button class="btn btn-primary" id="commentSubmit">Publier</button>`;

    getUserProfile(auth.currentUser.uid).then((p) => {
        if (p?.avatar) document.getElementById("myAvatar").src = p.avatar;
    });

    document.getElementById("commentSubmit").onclick = async () => {
        const input = document.getElementById("commentInput");
        const text = input.value.trim();
        if (!text) return;
        const profile = (await getUserProfile(auth.currentUser.uid)) || {};
        await addDoc(collection(db, "videos", videoId, "comments"), {
            text,
            authorId: auth.currentUser.uid,
            authorName: profile.displayName || profile.username || "Anonyme",
            authorAvatar: profile.avatar || "",
            createdAt: serverTimestamp(),
            likes: 0,
        });
        input.value = "";
        toast("Commentaire publié", "success");
        loadComments(videoId);
    };
}
