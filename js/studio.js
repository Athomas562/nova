import { db, auth } from "./firebase.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    escapeHtml,
    formatViews,
    formatSubs,
    timeAgo,
    toast,
    requireAuth,
} from "./ui.js";
import { uploadToCloudinary } from "./storage.js";

export async function initStudio() {
    const user = await requireAuth();
    const main = document.getElementById("main");

    const uSnap = await getDoc(doc(db, "users", user.uid));
    const me = uSnap.data() || {};

    const snap = await getDocs(
        query(
            collection(db, "videos"),
            where("authorId", "==", user.uid),
            orderBy("createdAt", "desc"),
        ),
    );
    const videos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
    const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);

    document.getElementById("statViews").textContent = formatViews(totalViews)
        .replace(" vues", "")
        .replace(" vue", "");
    document.getElementById("statLikes").textContent = totalLikes;
    document.getElementById("statSubs").textContent = formatSubs(
        me.subscribers || 0,
    )
        .replace(" abonnés", "")
        .replace(" abonné", "");
    document.getElementById("statVideos").textContent = videos.length;

    const tbody = document.getElementById("videosTbody");
    if (!videos.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="muted center" style="padding:40px">Aucune vidéo. Publiez-en une !</td></tr>`;
        return;
    }

    tbody.innerHTML = videos
        .map(
            (v) => `
    <tr data-id="${v.id}">
      <td><img class="thumb-sm" src="${v.thumbnailUrl || "logo-icon.svg"}" alt=""></td>
      <td>${escapeHtml(v.title)}</td>
      <td>${v.visibility}</td>
      <td>${formatViews(v.views)}</td>
      <td>${v.likes || 0}</td>
      <td>${timeAgo(v.createdAt)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-sm" data-act="edit">Modifier</button>
          <button class="btn btn-sm btn-danger" data-act="delete">Supprimer</button>
        </div>
      </td>
    </tr>`,
        )
        .join("");

    tbody.querySelectorAll('[data-act="delete"]').forEach((btn) => {
        btn.onclick = async (e) => {
            const id = e.target.closest("tr").dataset.id;
            if (!confirm("Supprimer cette vidéo ?")) return;
            await deleteDoc(doc(db, "videos", id));
            toast("Vidéo supprimée", "success");
            initStudio();
        };
    });

    tbody.querySelectorAll('[data-act="edit"]').forEach((btn) => {
        btn.onclick = (e) => {
            const id = e.target.closest("tr").dataset.id;
            const v = videos.find((x) => x.id === id);
            openEditModal(v);
        };
    });
}

function openEditModal(v) {
    const modal = document.getElementById("editVideoModal");
    modal.classList.remove("hidden");
    document.getElementById("vTitle").value = v.title || "";
    document.getElementById("vDesc").value = v.description || "";
    document.getElementById("vCat").value = v.category || "Autre";
    document.getElementById("vTags").value = (v.tags || []).join(", ");
    document.getElementById("vVis").value = v.visibility || "public";

    modal.querySelector(".close").onclick = () => modal.classList.add("hidden");

    document.getElementById("vNewThumb").onchange = (e) => {
        const f = e.target.files[0];
        if (f)
            document.getElementById("vThumbPreview").src =
                URL.createObjectURL(f);
    };
    document.getElementById("vThumbPreview").src =
        v.thumbnailUrl || "logo-icon.svg";

    document.getElementById("vSave").onclick = async () => {
        const btn = document.getElementById("vSave");
        btn.disabled = true;
        try {
            const data = {
                title: document.getElementById("vTitle").value.trim(),
                description: document.getElementById("vDesc").value.trim(),
                category: document.getElementById("vCat").value,
                tags: document
                    .getElementById("vTags")
                    .value.split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                visibility: document.getElementById("vVis").value,
            };
            const thumbFile = document.getElementById("vNewThumb").files[0];
            if (thumbFile) {
                toast("Upload de la miniature...");
                data.thumbnailUrl = await uploadToCloudinary(
                    thumbFile,
                    "image",
                );
            }
            await updateDoc(doc(db, "videos", v.id), data);
            toast("Vidéo mise à jour", "success");
            modal.classList.add("hidden");
            initStudio();
        } catch (e) {
            console.error(e);
            toast("Erreur : " + e.message, "error");
        } finally {
            btn.disabled = false;
        }
    };
}
