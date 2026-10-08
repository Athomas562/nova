// =====================================================
// Upload via Cloudinary (aucun Firebase Storage requis)
// =====================================================

const CLOUD_NAME = "hqo42zhd"; // ex: dxxxxxxx
const UPLOAD_PRESET = "novatube_unsigned"; // preset non signé créé dans Cloudinary

/**
 * Upload un fichier vers Cloudinary.
 * @param {File} file
 * @param {"video"|"image"} type
 * @param {(p:number)=>void} onProgress 0-100
 * @returns {Promise<string>} URL publique du fichier
 */
export function uploadToCloudinary(file, type, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
        const endpoint =
            type === "video"
                ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
                : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", UPLOAD_PRESET);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.secure_url);
                } catch (e) {
                    reject(new Error("Réponse Cloudinary invalide"));
                }
            } else {
                reject(new Error(`Upload échoué (${xhr.status})`));
            }
        };

        xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload"));
        xhr.send(form);
    });
}

/**
 * Génère une miniature Cloudinary depuis une URL vidéo.
 * Cloudinary crée une image .jpg à partir d'une vidéo à une seconde donnée.
 */
export function videoThumbnailFromUrl(videoUrl, second = 1) {
    if (!videoUrl || !videoUrl.includes("/video/upload/")) return "";
    return videoUrl
        .replace(
            "/video/upload/",
            `/video/upload/so_${second}/w_640,h_360,c_fill/`,
        )
        .replace(/\.[a-z0-9]+$/i, ".jpg");
}
