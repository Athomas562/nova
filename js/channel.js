import { db, auth } from "./firebase.js";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    increment,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml, formatSubs, getParam, toast, videoCard } from "./ui.js";
import { uploadImageToImgbb } from "./avatar.js";

export async function initChannel() {
    const id = getParam("id");
    if (!id) {
        location.href = "index.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", id));
    if (!snap.exists()) {
        document.getElementById("main").innerHTML =
            `<div class="empty"><h2>Chaîne introuvable</h2></div>`;
        return;
    }
    const u = snap.data();

    document.title = `${u.displayName || u.username} — NovaTube`;
    document.getElementById("channelName").textContent =
        u.displayName || u.username;
    document.getElementById("channelUsername").textContent =
        "@" + (u.username || "");
    document.getElementById("channelDesc").textContent = u.description || "";
    document.getElementById("channelAvatar").src = u.avatar || "logo-icon.svg";
    document.getElementById("channelSubs").textContent = formatSubs(
        u.subscribers || 0,
    );

    if (u.banner) {
        const b = document.getElementById("channelBanner");
        b.innerHTML = `<img src="${u.banner}" alt="">`;
    }

    const me = auth.currentUser;
    const isMine = me && me.uid === id;

    const editBtn = document.getElementById("editChannelBtn");
    if (editBtn) editBtn.style.display = isMine ? "inline-flex" : "none";

    const subBtn = document.getElementById("subscribeBtn");
    if (subBtn) {
        if (isMine) {
            subBtn.style.display = "none";
        } else if (!me) {
            subBtn.onclick = () => (location.href = "login.html");
        } else {
            const ref = doc(db, "users", me.uid, "subscriptions", id);
            const s = await getDoc(ref);
            updateSubUI(subBtn, s.exists());
            subBtn.onclick = async () => {
                const exists = (await getDoc(ref)).exists();
                if (exists) {
                    await deleteDoc(ref);
                    await updateDoc(doc(db, "users", id), {
                        subscribers: increment(-1),
                    });
                    updateSubUI(subBtn, false);
                } else {
                    await setDoc(ref, { channelId: id, at: serverTimestamp() });
                    await updateDoc(doc(db, "users", id), {
                        subscribers: increment(1),
                    });
                    await setDoc(
                        doc(collection(db, "notifications", id, "items")),
                        {
                            type: "subscribe",
                            from: me.uid,
                            fromName: me.displayName || "",
                            at: serverTimestamp(),
                            read: false,
                        },
                    );
                    updateSubUI(subBtn, true);
                }
            };
        }
    }

    // Vidéos de la chaîne
    const vSnap = await getDocs(
        query(
            collection(db, "videos"),
            where("authorId", "==", id),
            orderBy("createdAt", "desc"),
            limit(60),
        ),
    );
    const videos = vSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => v.visibility === "public" || isMine);

    const grid = document.getElementById("channelVideos");
    if (!videos.length) {
        grid.innerHTML = `<div class="empty"><p>Aucune vidéo pour l'instant.</p></div>`;
    } else {
        grid.innerHTML = `<div class="grid">${videos.map(videoCard).join("")}</div>`;
    }

    // Édition (si c'est ma chaîne)
    if (isMine) setupEdit(u);
}

function updateSubUI(btn, subbed) {
    btn.textContent = subbed ? "Abonné" : "S'abonner";
    btn.classList.toggle("btn-primary", !subbed);
}

function setupEdit(u) {
    const modal = document.getElementById("editModal");
    const editBtn = document.getElementById("editChannelBtn");
    if (!modal || !editBtn) return;

    editBtn.onclick = () => {
        document.getElementById("editName").value = u.displayName || "";
        document.getElementById("editUsername").value = u.username || "";
        document.getElementById("editDesc").value = u.description || "";
        modal.classList.remove("hidden");
    };
    modal
        .querySelector(".close")
        ?.addEventListener("click", () => modal.classList.add("hidden"));

    document
        .getElementById("editAvatar")
        .addEventListener("change", async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            toast("Upload de l'avatar...");
            const url = await uploadImageToImgbb(f);
            await updateDoc(doc(db, "users", u.uid), { avatar: url });
            toast("Avatar mis à jour", "success");
            document.getElementById("channelAvatar").src = url;
        });

    document
        .getElementById("editBanner")
        .addEventListener("change", async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            toast("Upload de la bannière...");
            const url = await uploadImageToImgbb(f);
            await updateDoc(doc(db, "users", u.uid), { banner: url });
            toast("Bannière mise à jour", "success");
            document.getElementById("channelBanner").innerHTML =
                `<img src="${url}" alt="">`;
        });

    document.getElementById("editSave").onclick = async () => {
        const data = {
            displayName: document.getElementById("editName").value.trim(),
            username: document.getElementById("editUsername").value.trim(),
            description: document.getElementById("editDesc").value.trim(),
        };
        await updateDoc(doc(db, "users", u.uid), data);
        toast("Profil mis à jour", "success");
        setTimeout(() => location.reload(), 500);
    };
}
