const IMGBB_KEY = "fd12c1b18489c44b39c822db26900a1f";

export function uploadImageToImgbb(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = String(reader.result).split(",")[1];
            const form = new FormData();
            form.append("key", IMGBB_KEY);
            form.append("image", base64);
            fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: form,
            })
                .then((r) => r.json())
                .then((j) =>
                    j.success
                        ? resolve(j.data.url)
                        : reject(new Error("Upload échoué")),
                )
                .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
