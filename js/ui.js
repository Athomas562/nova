import { onAuth } from "./auth.js";
import { db } from "./firebase.js";
import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

export function formatViews(n) {
    n = Number(n) || 0;
    if (n < 1000) return `${n} vue${n !== 1 ? "s" : ""}`;
    if (n < 1e6) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} k vues`;
    return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")} M vues`;
}

export function formatSubs(n) {
    n = Number(n) || 0;
    if (n < 1000) return `${n} abonné${n !== 1 ? "s" : ""}`;
    if (n < 1e6)
        return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} k abonnés`;
    return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")} M abonnés`;
}

export function timeAgo(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`;
    if (s < 31536000) return `il y a ${Math.floor(s / 2592000)} mois`;
    return `il y a ${Math.floor(s / 31536000)} an${Math.floor(s / 31536000) > 1 ? "s" : ""}`;
}

export function escapeHtml(s) {
    return String(s ?? "").replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[m],
    );
}

export function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

export function initHeader() {
    onAuth(async (user) => {
        const loginBtn = document.getElementById("loginBtn");
        const createBtn = document.getElementById("createBtn");
        const userBox = document.getElementById("userBox");
        const logoutBtn = document.getElementById("logoutBtn");

        if (user) {
            loginBtn && (loginBtn.style.display = "none");
            createBtn && (createBtn.style.display = "inline-flex");
            logoutBtn && (logoutBtn.style.display = "inline-flex");
            if (userBox) {
                userBox.style.display = "flex";
                const snap = await getDoc(doc(db, "users", user.uid));
                const u = snap.data() || {};
                userBox.innerHTML = `
          <a href="profile.html?id=${user.uid}" title="${escapeHtml(u.displayName || "")}">
            <img src="${u.avatar || "logo-icon.svg"}" class="avatar-sm" alt="">
          </a>`;
            }
        } else {
            loginBtn && (loginBtn.style.display = "inline-flex");
            createBtn && (createBtn.style.display = "none");
            logoutBtn && (logoutBtn.style.display = "none");
            userBox && (userBox.style.display = "none");
        }
    });

    const lb = document.getElementById("logoutBtn");
    if (lb)
        lb.addEventListener("click", async () => {
            const { logout } = await import("./auth.js");
            await logout();
            toast("Déconnexion réussie");
            setTimeout(() => location.reload(), 400);
        });
}

export function requireAuth(redirect = "login.html") {
    return new Promise((resolve) => {
        onAuth((u) => {
            if (!u) location.href = redirect;
            else resolve(u);
        });
    });
}

export function videoCard(v) {
    return `
    <a class="card" href="watch.html?id=${v.id}">
      <img class="thumb" src="${v.thumbnailUrl || "logo-icon.svg"}" alt="">
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(v.title || "Sans titre")}</h3>
        <div class="card-meta">${escapeHtml(v.authorName || "")}</div>
        <div class="card-meta">${formatViews(v.views)} • ${timeAgo(v.createdAt)}</div>
      </div>
    </a>`;
}

export function sideVideoItem(v) {
    return `
    <a class="side-item" href="watch.html?id=${v.id}">
      <img class="thumb-sm" src="${v.thumbnailUrl || "logo-icon.svg"}" alt="">
      <div class="info">
        <div class="t">${escapeHtml(v.title || "")}</div>
        <div class="m">${escapeHtml(v.authorName || "")}</div>
        <div class="m">${formatViews(v.views)} • ${timeAgo(v.createdAt)}</div>
      </div>
    </a>`;
}
