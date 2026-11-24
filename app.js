const API_URL = "https://script.google.com/macros/s/AKfycbx0l2fcpdzacgAznD2KxyX404E4S2GkU9bfAs0aqzl48mmbxOIkA5edAYAZXfY4cRS5/exec";

const postsListEl = document.getElementById("posts-list");
const loaderEl = document.getElementById("loader");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");
const breakingText = document.getElementById("breaking-text");
const categoryTitleEl = document.getElementById("current-category-title");
const postCountEl = document.getElementById("post-count");
const menuToggle = document.getElementById("menu-toggle");
const navList = document.getElementById("nav-list");

let allPosts = [];
let currentCategory = "ALL";
let currentSubList = []; // Dùng khi bấm trực tiếp vào mục cha như "GIÁO XỨ"

themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    html.setAttribute("data-theme", isDark ? "light" : "dark");
    themeToggle.textContent = isDark ? "🌙" : "☀️";
});

menuToggle.addEventListener("click", () => {
    navList.classList.toggle("open");
});

async function loadPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        loaderEl.style.display = "none";

        if (allPosts.length > 0) {
            breakingText.textContent = `${allPosts[0].tieuDe} (${allPosts[0].ngay})`;
        } else {
            breakingText.textContent = "Chưa có bài viết nào trong Google Sheets.";
        }

        applyFilters();
        openPostFromUrl();
    } catch (err) {
        loaderEl.innerHTML = "<p>Không tải được dữ liệu. Kiểm tra lại link API Google Apps Script nhé!</p>";
    }
}

function applyFilters() {
    const kw = searchInput.value.trim().toLowerCase();

    const filtered = allPosts.filter((post) => {
        const postCat = (post.chuyenMuc || "").toLowerCase();
        let matchCat = false;

        if (currentCategory === "ALL") {
            matchCat = true;
        } else if (currentCategory.startsWith("GROUP:")) {
            // Nếu bấm mục cha (VD: GIÁO XỨ), hiện toàn bộ bài thuộc các mục con bên trong
            const groupName = currentCategory.replace("GROUP:", "").toLowerCase();
            matchCat = postCat === groupName || currentSubList.includes(postCat);
        } else {
            // Nếu bấm vào 1 mục con cụ thể, chỉ hiện đúng nội dung mục con đó
            matchCat = postCat === currentCategory.toLowerCase();
        }

        const matchKw =
            !kw ||
            (post.tieuDe && post.tieuDe.toLowerCase().includes(kw)) ||
            (post.noiDung && post.noiDung.toLowerCase().includes(kw));

        return matchCat && matchKw;
    });

    categoryTitleEl.textContent =
        currentCategory === "ALL"
            ? "Tất cả bài viết"
            : currentCategory.replace("GROUP:", "");
    postCountEl.textContent = `${filtered.length} bài`;
    renderList(filtered);
}

function renderList(posts) {
    if (!posts.length) {
        postsListEl.innerHTML = "<p>Chưa có bài viết nào trong mục này.</p>";
        return;
    }

    postsListEl.innerHTML = posts
        .map((post, index) => {
            const realIndex = allPosts.indexOf(post);
            const imgSrc =
                post.anh ||
                "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=600&q=80";
            const albumCount = Array.isArray(post.album) ? post.album.length : 0;
            const delayMs = Math.min(index * 45, 360);

            return `
                <article class="news-row card-enter" style="animation-delay: ${delayMs}ms;" onclick="openPostModal(${realIndex})">
                    <div class="thumb-wrap">
                        <img src="${imgSrc}" alt="${escapeHtml(post.tieuDe)}" class="news-thumb" loading="lazy">
                        ${albumCount > 1 ? `<span class="album-badge">📷 ${albumCount} ảnh</span>` : ""}
                    </div>
                    <div class="news-info">
                        <h3 class="news-title">${escapeHtml(post.tieuDe)}</h3>
                        <div class="news-meta">
                            <span class="cat-pill">${escapeHtml(post.chuyenMuc || "Tin tức")}</span>
                            <span>${escapeHtml(post.ngay || "")}</span>
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

document.querySelectorAll(".nav-link[data-category]").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        currentCategory = link.getAttribute("data-category");

        const subsRaw = link.getAttribute("data-subs");
        currentSubList = subsRaw
            ? subsRaw.split(",").map((s) => s.trim().toLowerCase())
            : [];

        document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active"));
        link.classList.add("active");

        navList.classList.remove("open");
        applyFilters();
    });
});

searchInput.addEventListener("input", applyFilters);

const modal = document.getElementById("post-modal");

function closePostModal() {
    modal.classList.remove("active");
    modal.style.display = "none";
}

function openPostModal(index) {
    const post = allPosts[index];
    if (!post) return;

    const modalImg = document.getElementById("modal-img");
    const galleryEl = document.getElementById("modal-gallery");

    if (post.anh) {
        modalImg.src = post.anh;
        modalImg.style.display = "block";
    } else {
        modalImg.style.display = "none";
    }

    // Nếu thư mục Google Drive có nhiều ảnh, hiển thị toàn bộ thành Album bên dưới
    if (Array.isArray(post.album) && post.album.length > 1) {
        galleryEl.innerHTML = post.album
            .map((url) => `<img src="${url}" alt="Ảnh hoạt động" loading="lazy">`)
            .join("");
    } else {
        galleryEl.innerHTML = "";
    }

    document.getElementById("modal-cat").textContent = post.chuyenMuc || "Tin tức";
    document.getElementById("modal-date").textContent = post.ngay || "";
    document.getElementById("modal-title").textContent = post.tieuDe || "";
    document.getElementById("modal-content-text").textContent = post.noiDung || "";

    modal.style.display = "block";
    requestAnimationFrame(() => {
        modal.classList.add("active");
    });
}

document.getElementById("modal-close").addEventListener("click", closePostModal);
window.addEventListener("click", (e) => {
    if (e.target === modal) closePostModal();
});

loadPosts();

// Tự động mở bài viết nếu trên link có dạng ?bai=ID
function openPostFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("bai");
    if (!targetId || !allPosts.length) return;

    const foundIndex = allPosts.findIndex(
        (p) => String(p.id).trim() === String(targetId).trim()
    );
    if (foundIndex !== -1) {
        openPostModal(foundIndex);
    }
}

const lightboxEl = document.getElementById("lightbox-overlay");
const lightboxImgEl = document.getElementById("lightbox-img");

function openLightbox(src) {
    if (!src) return;
    lightboxImgEl.src = src;
    lightboxEl.classList.add("active");
}

function closeLightbox(event) {
    if (
        !event ||
        event.target === lightboxEl ||
        event.target.classList.contains("lightbox-close")
    ) {
        lightboxEl.classList.remove("active");
        lightboxImgEl.src = "";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (lightboxEl.classList.contains("active")) {
            lightboxEl.classList.remove("active");
            lightboxImgEl.src = "";
        } else if (modal.classList.contains("active")) {
            closePostModal();
        }
    }
});

// Bấm vào ảnh lớn trong modal bài viết để mở to màn hình
document.getElementById("modal-img").addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox(e.target.src);
});

// Bấm vào từng ảnh trong album thư mục Drive để mở to màn hình
document.getElementById("modal-gallery").addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
        e.stopPropagation();
        openLightbox(e.target.src);
    }
});

// Bấm vào logo giáo xứ để mở to màn hình
const parishLogoEl = document.getElementById("parish-logo");
if (parishLogoEl) {
    parishLogoEl.addEventListener("click", () => {
        if (parishLogoEl.src) openLightbox(parishLogoEl.src);
    });
}