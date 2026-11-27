const API_URL = "https://script.google.com/macros/s/AKfycby-fY1f74wwI9LDnw9Ow3VHbYRFCUlaltZy55uvUpZ0Bu0BSX7ItoUbk2V_Derg2rRy/exec";

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
let isHandlingPopState = false;

// Lưu trạng thái lịch sử để bấm nút Trở lại của trình duyệt thoát mục / đóng popup mượt
function pushNavState(payload) {
    if (isHandlingPopState) return;
    try {
        history.pushState(payload, "", window.location.href);
    } catch (e) {
        // Bỏ qua nếu trình duyệt chặn pushState
    }
}

function setCategoryState(category, subs = [], linkEl = null, fromPopState = false) {
    currentCategory = category || "ALL";
    currentSubList = Array.isArray(subs) ? subs : [];

    document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active"));
    if (linkEl) {
        linkEl.classList.add("active");
    } else {
        const matchedLink = document.querySelector(`.nav-link[data-category="${CSS.escape(currentCategory)}"]`);
        if (matchedLink) matchedLink.classList.add("active");
    }

    document.querySelectorAll(".nav-item.has-dropdown.open").forEach((item) => {
        item.classList.remove("open");
    });
    navList.classList.remove("open");

    applyFilters();

    if (!fromPopState) {
        pushNavState({
            type: "category",
            category: currentCategory,
            subs: currentSubList
        });
    }
}

// Khởi tạo state gốc cho trang đầu tiên
try {
    history.replaceState({ type: "category", category: "ALL", subs: [] }, "", window.location.href);
} catch (e) {}

// Popup tìm kiếm (mở & thoát có animation)
let searchCloseTimer = null;

function openSearchModal(fromPopState = false) {
    if (searchCloseTimer) {
        clearTimeout(searchCloseTimer);
        searchCloseTimer = null;
    }
    searchModal.classList.remove("closing");
    searchModal.classList.add("active");
    searchModal.setAttribute("aria-hidden", "false");

    if (!fromPopState) {
        pushNavState({ type: "overlay", overlay: "search" });
    }

    setTimeout(() => {
        searchInput.focus();
        searchInput.select();
    }, 50);
}

function closeSearchModal(fromPopState = false) {
    if (!searchModal.classList.contains("active")) return;
    searchModal.classList.add("closing");
    searchModal.classList.remove("active");
    searchModal.setAttribute("aria-hidden", "true");

    searchCloseTimer = setTimeout(() => {
        searchModal.classList.remove("closing");
        searchCloseTimer = null;
    }, 240);

    if (!fromPopState && history.state && history.state.overlay === "search") {
        history.back();
    }
}

searchOpenBtn.addEventListener("click", () => openSearchModal(false));
searchModalClose.addEventListener("click", () => closeSearchModal(false));

searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) {
        closeSearchModal(false);
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
        closeSearchModal(false);
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
            const safeIndex = realIndex !== -1 ? realIndex : index;
            const imgSrc =
                post.anh ||
                "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=600&q=80";
            const delayMs = Math.min(index * 45, 360);

            return `
                <article class="news-row card-enter" data-post-index="${safeIndex}" style="animation-delay: ${delayMs}ms;">
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

// Bắt sự kiện click trực tiếp trên danh sách bài viết
postsListEl.addEventListener("click", (e) => {
    const card = e.target.closest(".news-row[data-post-index]");
    if (!card) return;
    const idx = Number(card.getAttribute("data-post-index"));
    if (!Number.isNaN(idx)) {
        openPostModal(idx, false);
    }
});

document.querySelectorAll(".nav-link[data-category]").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = link.getAttribute("data-category");
        const subsRaw = link.getAttribute("data-subs");
        const subs = subsRaw
            ? subsRaw.split(",").map((s) => s.trim().toLowerCase())
            : [];

        setCategoryState(cat, subs, link, false);
    });
});

searchInput.addEventListener("input", applyFilters);

// Modal đọc bài viết (mở & thoát có animation + hỗ trợ nút Back)
const modal = document.getElementById("post-modal");
let modalCloseTimer = null;

function closePostModal(fromPopState = false) {
    if (!modal) return;
    if (modalCloseTimer) {
        clearTimeout(modalCloseTimer);
        modalCloseTimer = null;
    }

    modal.classList.add("closing");
    modal.classList.remove("active");
    document.body.style.overflow = "";

    modalCloseTimer = setTimeout(() => {
        const pdfFrame = document.getElementById("modal-pdf-frame");
        if (pdfFrame) pdfFrame.src = "";
        modal.classList.remove("closing");
        modal.style.display = "none";
        modalCloseTimer = null;
    }, 260);

    if (!fromPopState && window.history && window.history.state && window.history.state.overlay === "post") {
        try {
            window.history.back();
        } catch (err) {}
    }
}

function openPostModal(index, fromPopState = false) {
    const post = allPosts[index];
    if (!post || !modal) return;

    if (modalCloseTimer) {
        clearTimeout(modalCloseTimer);
        modalCloseTimer = null;
    }

    const modalImg = document.getElementById("modal-img");
    const galleryEl = document.getElementById("modal-gallery");
    const pdfBoxEl = document.getElementById("modal-pdf-box");
    const pdfFrameEl = document.getElementById("modal-pdf-frame");
    const pdfExtLinkEl = document.getElementById("modal-pdf-external");

    const albumList = Array.isArray(post.album) && post.album.length > 0
        ? post.album
        : (post.anh ? [post.anh] : []);

    if (modalImg) {
        if (albumList.length > 0) {
            modalImg.src = albumList[0];
            modalImg.style.display = "block";
        } else {
            modalImg.src = "";
            modalImg.style.display = "none";
        }
    }

    if (galleryEl) {
        if (albumList.length > 0) {
            galleryEl.innerHTML = albumList
                .map((url, idx) => `<img src="${url}" alt="Ảnh bài viết ${idx + 1}" loading="lazy">`)
                .join("");
            galleryEl.style.display = "grid";
        } else {
            galleryEl.innerHTML = "";
            galleryEl.style.display = "none";
        }
    }

    if (pdfBoxEl && pdfFrameEl) {
        if (post.pdfUrl) {
            pdfFrameEl.src = post.pdfUrl;
            if (pdfExtLinkEl) {
                pdfExtLinkEl.href = post.pdfUrl.replace("/preview", "/view");
            }
            pdfBoxEl.style.display = "block";
        } else {
            pdfFrameEl.src = "";
            pdfBoxEl.style.display = "none";
        }
    }

    document.getElementById("modal-cat").textContent = post.chuyenMuc || "Tin tức";
    document.getElementById("modal-date").textContent = post.ngay || "";
    document.getElementById("modal-title").textContent = post.tieuDe || "";
    document.getElementById("modal-content-text").textContent = post.noiDung || "";

    modal.classList.remove("closing");
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    if (!fromPopState) {
        pushNavState({ type: "overlay", overlay: "post", postIndex: index });
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add("active");
        });
    });
}

document.getElementById("modal-close").addEventListener("click", () => closePostModal(false));
window.addEventListener("click", (e) => {
    if (e.target === modal) closePostModal(false);
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
        openPostModal(foundIndex, true);
    }
}

// Lightbox phóng to ảnh (mở & thoát có animation + hỗ trợ nút Back)
const lightboxEl = document.getElementById("lightbox-overlay");
const lightboxImgEl = document.getElementById("lightbox-img");
let lightboxCloseTimer = null;

function openLightbox(src, fromPopState = false) {
    if (!src) return;
    if (lightboxCloseTimer) {
        clearTimeout(lightboxCloseTimer);
        lightboxCloseTimer = null;
    }
    lightboxImgEl.src = src;
    lightboxEl.classList.remove("closing");
    lightboxEl.classList.add("active");

    if (!fromPopState) {
        pushNavState({ type: "overlay", overlay: "lightbox", src });
    }
}

function closeLightbox(event, fromPopState = false) {
    if (
        fromPopState ||
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

        if (!fromPopState && history.state && history.state.overlay === "lightbox") {
            history.back();
        }
    }
}

// Lắng nghe nút Trở lại (Back / Forward) của trình duyệt
window.addEventListener("popstate", (e) => {
    isHandlingPopState = true;

    if (lightboxEl.classList.contains("active")) {
        closeLightbox(null, true);
    } else if (searchModal.classList.contains("active")) {
        closeSearchModal(true);
    } else if (modal && modal.classList.contains("active")) {
        closePostModal(true);
    }

    const state = e.state;
    if (state && state.type === "category") {
        setCategoryState(state.category || "ALL", state.subs || [], null, true);
    } else if (!state) {
        setCategoryState("ALL", [], null, true);
    }

    isHandlingPopState = false;
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (lightboxEl.classList.contains("active")) {
            closeLightbox(null, false);
        } else if (searchModal.classList.contains("active")) {
            closeSearchModal(false);
        } else if (modal && modal.classList.contains("active")) {
            closePostModal(false);
        }
    }
});

document.getElementById("modal-img").addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox(e.target.src, false);
});

document.getElementById("modal-gallery").addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
        e.stopPropagation();
        openLightbox(e.target.src, false);
    }
});

const parishLogoEl = document.getElementById("parish-logo");
if (parishLogoEl) {
    parishLogoEl.addEventListener("click", () => {
        if (parishLogoEl.src) openLightbox(parishLogoEl.src, false);
    });
}
