import { auth, db } from "./firebase.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { uploadToCloudinary, videoThumbnailFromUrl } from "./storage.js";

export async function publishVideo({
    videoFile,
    thumbFile,
    title,
    description,
    category,
    tags,
    visibility,
    onProgress,
}) {
    const user = auth.currentUser;
    if (!user)
        throw new Error("Vous devez être connecté pour publier une vidéo.");

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const profile = userSnap.data() || {};

    onProgress?.(0);

    const videoUrl = await uploadToCloudinary(videoFile, "video", (p) =>
        onProgress?.(Math.round(p * 0.8)),
    );

    let thumbnailUrl = "";
    if (thumbFile) {
        thumbnailUrl = await uploadToCloudinary(thumbFile, "image", (p) =>
            onProgress?.(80 + Math.round(p * 0.15)),
        );
    } else {
        thumbnailUrl = videoThumbnailFromUrl(videoUrl, 1);
    }

    onProgress?.(98);

    const docRef = await addDoc(collection(db, "videos"), {
        title,
        description,
        category,
        tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        videoUrl,
        thumbnailUrl,
        authorId: user.uid,
        authorName: profile.displayName || profile.username || "Anonyme",
        authorAvatar: profile.avatar || "",
        views: 0,
        likes: 0,
        visibility,
        createdAt: serverTimestamp(),
    });

    onProgress?.(100);
    return docRef.id;
}
