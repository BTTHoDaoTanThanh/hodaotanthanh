const API_URL = "https://script.google.com/macros/s/AKfycbwvB7oCSFtTgE1K9e51hU8l6vLzNGEYC4k_BOccYkwItExeDBU1bUtl094AYVZAf0e2/exec";

const postsListEl = document.getElementById("posts-list");
const loaderEl = document.getElementById("loader");
const searchInput = document.getElementById("search-input");
const searchModal = document.getElementById("search-modal");
const searchOpenBtn = document.getElementById("search-open-btn");
const searchModalClose = document.getElementById("search-modal-close");
const searchClearBtn = document.getElementById("search-clear-btn");
const searchModalHint = document.getElementById("search-modal-hint");
const breakingText = document.getElementById("breaking-text");
const categoryTitleEl = document.getElementById("current-category-title");
const postCountEl = document.getElementById("post-count");
const menuToggle = document.getElementById("menu-toggle");
const navList = document.getElementById("nav-list");

let allPosts = [];
let currentCategory = "ALL";
let currentSubList = [];

// Popup tìm kiếm (mở & thoát có animation)
let searchCloseTimer = null;

function openSearchModal() {
    if (searchCloseTimer) {
        clearTimeout(searchCloseTimer);
        searchCloseTimer = null;
    }
    searchModal.classList.remove("closing");
    searchModal.classList.add("active");
    searchModal.setAttribute("aria-hidden", "false");
    setTimeout(() => {
        searchInput.focus();
        searchInput.select();
    }, 50);
}

function closeSearchModal() {
    if (!searchModal.classList.contains("active")) return;
    searchModal.classList.add("closing");
    searchModal.classList.remove("active");
    searchModal.setAttribute("aria-hidden", "true");

    searchCloseTimer = setTimeout(() => {
        searchModal.classList.remove("closing");
        searchCloseTimer = null;
    }, 240);
}

searchOpenBtn.addEventListener("click", openSearchModal);
searchModalClose.addEventListener("click", closeSearchModal);

searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) {
        closeSearchModal();
    }
});

searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    applyFilters();
    searchInput.focus();
});

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        closeSearchModal();
    }
});

menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    navList.classList.toggle("open");
});

// Nút tiêu đề của mục nhiều lựa chọn (VD: GIÁO XỨ): chỉ mở/đóng danh sách con, không lọc bài
document.querySelectorAll(".nav-item.has-dropdown > .dropdown-toggle").forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const parentItem = toggleBtn.closest(".nav-item.has-dropdown");
        const willOpen = !parentItem.classList.contains("open");

        document.querySelectorAll(".nav-item.has-dropdown.open").forEach((item) => {
            item.classList.remove("open");
        });

        if (willOpen) {
            parentItem.classList.add("open");
        }
    });
});

// Bấm ra ngoài thì đóng các dropdown đang mở
document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item.has-dropdown")) {
        document.querySelectorAll(".nav-item.has-dropdown.open").forEach((item) => {
            item.classList.remove("open");
        });
    }
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

    searchClearBtn.style.display = kw ? "inline-flex" : "none";
    searchOpenBtn.classList.toggle("has-query", Boolean(kw));

    const filtered = allPosts.filter((post) => {
        const postCat = (post.chuyenMuc || "").toLowerCase();
        let matchCat = false;

        if (currentCategory === "ALL") {
            matchCat = true;
        } else if (currentCategory.startsWith("GROUP:")) {
            const groupName = currentCategory.replace("GROUP:", "").toLowerCase();
            matchCat = postCat === groupName || currentSubList.includes(postCat);
        } else {
            matchCat = postCat === currentCategory.toLowerCase();
        }

        const matchKw =
            !kw ||
            (post.tieuDe && post.tieuDe.toLowerCase().includes(kw)) ||
            (post.noiDung && post.noiDung.toLowerCase().includes(kw));

        return matchCat && matchKw;
    });

    if (searchModalHint) {
        searchModalHint.textContent = kw
            ? `Tìm thấy ${filtered.length} bài phù hợp với "${searchInput.value.trim()}". Nhấn Enter để xem.`
            : "Gõ từ khóa để lọc bài viết trực tiếp bên dưới, nhấn Enter hoặc Đóng để xem danh sách.";
    }

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
            const delayMs = Math.min(index * 45, 360);

            return `
                <article class="news-row card-enter" style="animation-delay: ${delayMs}ms;" onclick="openPostModal(${realIndex})">
                    <div class="thumb-wrap">
                        <img src="${imgSrc}" alt="${escapeHtml(post.tieuDe)}" class="news-thumb" loading="lazy">
                    </div>
                    <div class="news-info">
                        <h3 class="news-title">${escapeHtml(post.tieuDe)}</h3>
                        <div class="news-meta">
                            <span class="cat-pill">${escapeHtml(post.chuyenMuc || "Tin tức")}</span>
                            <span class="post-date">${escapeHtml(post.ngay || "")}</span>
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

        document.querySelectorAll(".nav-item.has-dropdown.open").forEach((item) => {
            item.classList.remove("open");
        });
        navList.classList.remove("open");
        applyFilters();
    });
});

searchInput.addEventListener("input", applyFilters);

// Modal đọc bài viết (mở & thoát có animation)
const modal = document.getElementById("post-modal");
let modalCloseTimer = null;

function closePostModal() {
    if (!modal.classList.contains("active")) return;
    modal.classList.add("closing");
    modal.classList.remove("active");
    document.body.style.overflow = "";

    modalCloseTimer = setTimeout(() => {
        modal.classList.remove("closing");
        modal.style.display = "none";
        modalCloseTimer = null;
    }, 260);
}

function openPostModal(index) {
    const post = allPosts[index];
    if (!post) return;

    if (modalCloseTimer) {
        clearTimeout(modalCloseTimer);
        modalCloseTimer = null;
    }

    const modalImg = document.getElementById("modal-img");
    const galleryEl = document.getElementById("modal-gallery");

    if (post.anh) {
        modalImg.src = post.anh;
        modalImg.style.display = "block";
    } else {
        modalImg.style.display = "none";
    }

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

    modal.classList.remove("closing");
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add("active");
        });
    });
}

document.getElementById("modal-close").addEventListener("click", closePostModal);
window.addEventListener("click", (e) => {
    if (e.target === modal) closePostModal();
});

loadPosts();

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

// Lightbox phóng to ảnh (mở & thoát có animation)
const lightboxEl = document.getElementById("lightbox-overlay");
const lightboxImgEl = document.getElementById("lightbox-img");
let lightboxCloseTimer = null;

function openLightbox(src) {
    if (!src) return;
    if (lightboxCloseTimer) {
        clearTimeout(lightboxCloseTimer);
        lightboxCloseTimer = null;
    }
    lightboxImgEl.src = src;
    lightboxEl.classList.remove("closing");
    lightboxEl.classList.add("active");
}

function closeLightbox(event) {
    if (
        !event ||
        event.target === lightboxEl ||
        event.target.classList.contains("lightbox-close")
    ) {
        if (!lightboxEl.classList.contains("active")) return;
        lightboxEl.classList.add("closing");
        lightboxEl.classList.remove("active");

        lightboxCloseTimer = setTimeout(() => {
            lightboxEl.classList.remove("closing");
            lightboxImgEl.src = "";
            lightboxCloseTimer = null;
        }, 250);
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (searchModal.classList.contains("active")) {
            closeSearchModal();
        } else if (lightboxEl.classList.contains("active")) {
            closeLightbox();
        } else if (modal.classList.contains("active")) {
            closePostModal();
        }
    }
});

document.getElementById("modal-img").addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox(e.target.src);
});

document.getElementById("modal-gallery").addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
        e.stopPropagation();
        openLightbox(e.target.src);
    }
});

const parishLogoEl = document.getElementById("parish-logo");
if (parishLogoEl) {
    parishLogoEl.addEventListener("click", () => {
        if (parishLogoEl.src) openLightbox(parishLogoEl.src);
    });
}
