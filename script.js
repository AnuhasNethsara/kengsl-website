// ===== Portfolio & Testimonials Data Cache =====
let portfolioCache = null;
let testimonialsCache = null;
let codingProjectsCache = null;

// ===== Mobile Menu Toggle =====
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// ===== XSS Sanitization =====
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Firestore Fetching Logic =====
async function fetchPortfolio() {
    if (portfolioCache) return portfolioCache;

    try {
        const snapshot = await db.collection('portfolio').orderBy('order', 'asc').get();
        const items = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.title && data.image) {
                items.push({ id: doc.id, ...data });
            }
        });
        portfolioCache = items;
        return items;
    } catch (error) {
        console.error('Error loading portfolio from Firestore:', error);
        return [];
    }
}

async function fetchTestimonials() {
    if (testimonialsCache) return testimonialsCache;

    try {
        const snapshot = await db.collection('testimonials').orderBy('order', 'asc').get();
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        testimonialsCache = items;
        return items;
    } catch (error) {
        console.error('Error loading testimonials from Firestore:', error);
        return [];
    }
}

async function fetchCodingProjects() {
    if (codingProjectsCache) return codingProjectsCache;

    try {
        const snapshot = await db.collection('codingProjects').orderBy('order', 'asc').get();
        const items = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.title) {
                items.push({ id: doc.id, ...data });
            }
        });
        codingProjectsCache = items;
        return items;
    } catch (error) {
        console.error('Error loading coding projects from Firestore:', error);
        return [];
    }
}

// ===== Loading Skeleton =====
function renderSkeletons(container, count = 3) {
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-text">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        </div>
    `).join('');
}

// ===== Render Featured Grid (Index Page) =====
async function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    renderSkeletons(grid, 3);

    const items = await fetchPortfolio();
    const featured = items.slice(0, 3);

    if (featured.length === 0) {
        grid.innerHTML = '<div class="loading">Connect your Google Sheet to display items.</div>';
        return;
    }

    grid.innerHTML = featured.map((item, i) => `
        <div class="portfolio-card animate-on-scroll delay-${i + 1}" data-img="${escapeHTML(item.image)}">
            <div class="portfolio-img-wrap">
                <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" class="portfolio-img" loading="lazy"
                     onerror="this.src='https://placehold.co/600x400/141419/71717a?text=Image+Not+Found'">
            </div>
            <div class="portfolio-overlay">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <span class="p-category">${escapeHTML(item.categoryDisplay || item.category)}</span>
                    <button class="like-btn ${isLiked(item.id) ? 'liked' : ''}" onclick="toggleLike('${item.id}', event)">
                        <i class="fas fa-heart"></i>
                        <span class="like-count" id="like-count-${item.id}">${item.likes || 0}</span>
                    </button>
                </div>
                <h3 class="p-title">${escapeHTML(item.title)}</h3>
                <p class="p-desc">${escapeHTML(item.description)}</p>
            </div>
        </div>
    `).join('');

    // Re-observe new elements for scroll animation
    grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// ===== Render Full Portfolio Grid (Portfolio Page) =====
async function renderPortfolio(filter = 'all') {
    const grid = document.getElementById('portfolioGrid');
    if (!grid) return;

    renderSkeletons(grid, 6);

    const allItems = await fetchPortfolio();
    const filtered = filter === 'all' ? allItems : allItems.filter(item => item.category === filter);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="loading">No portfolio items found.</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="portfolio-card animate-on-scroll" data-category="${escapeHTML(item.category)}" data-img="${escapeHTML(item.image)}">
            <div class="portfolio-img-wrap">
                <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" class="portfolio-img" loading="lazy"
                     onerror="this.src='https://placehold.co/600x400/141419/71717a?text=Image+Not+Found'">
            </div>
            <div class="portfolio-overlay">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <span class="p-category">${escapeHTML(item.categoryDisplay || item.category)}</span>
                    <button class="like-btn ${isLiked(item.id) ? 'liked' : ''}" onclick="toggleLike('${item.id}', event)">
                        <i class="fas fa-heart"></i>
                        <span class="like-count" id="like-count-${item.id}">${item.likes || 0}</span>
                    </button>
                </div>
                <h3 class="p-title">${escapeHTML(item.title)}</h3>
                <p class="p-desc">${escapeHTML(item.description)}</p>
            </div>
        </div>
    `).join('');

    // Re-observe new elements for scroll animation
    grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// ===== Render Testimonials from Firestore =====
async function renderTestimonials() {
    const grid = document.querySelector('.testimonials-grid');
    if (!grid) return;

    const items = await fetchTestimonials();
    if (items.length === 0) return; // Keep hardcoded fallback if no Firestore data

    grid.innerHTML = items.map((item, i) => `
        <div class="glass-panel testi-card animate-on-scroll delay-${(i % 3) + 1}">
            <div class="testi-stars">${'<i class="fas fa-star"></i>'.repeat(item.rating || 5)}</div>
            <p class="testi-quote">"${escapeHTML(item.quote)}"</p>
            <div class="testi-author">
                <div class="author-avatar">${escapeHTML((item.authorName || 'A')[0])}</div>
                <div class="author-info">
                    <h4>${escapeHTML(item.authorName)}</h4>
                    <p>${escapeHTML(item.authorRole || '')}</p>
                </div>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// ===== Filter Portfolio Buttons =====
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length === 0) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderPortfolio(btn.getAttribute('data-filter'));
        });
    });
}

// ===== Render Coding Projects (shared renderer) =====
function renderCodingCard(item, i) {
    const techHtml = (item.techStack || []).map(t => `<span class="tech-badge">${escapeHTML(t)}</span>`).join('');
    let actionsHtml = '';
    if (item.projectUrl || item.githubUrl) {
        actionsHtml = '<div class="coding-card-actions">';
        if (item.projectUrl) {
            actionsHtml += `<a href="${escapeHTML(item.projectUrl)}" target="_blank" rel="noopener noreferrer" class="coding-link live-link"><i class="fas fa-external-link-alt"></i> Live Demo</a>`;
        }
        if (item.githubUrl) {
            actionsHtml += `<a href="${escapeHTML(item.githubUrl)}" target="_blank" rel="noopener noreferrer" class="coding-link github-link"><i class="fab fa-github"></i> GitHub</a>`;
        }
        actionsHtml += '</div>';
    }
    return `
        <div class="coding-card animate-on-scroll delay-${(i % 3) + 1}">
            <div class="coding-card-img">
                <img src="${escapeHTML(item.image || 'https://placehold.co/600x400/141419/61dafb?text=Project')}" 
                     alt="${escapeHTML(item.title)}" loading="lazy"
                     onerror="this.src='https://placehold.co/600x400/141419/61dafb?text=Project'">
                <span class="coding-card-type">${escapeHTML(item.categoryDisplay || item.category || 'Project')}</span>
            </div>
            <div class="coding-card-body">
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.description || '')}</p>
                ${techHtml ? `<div class="tech-stack">${techHtml}</div>` : ''}
                ${actionsHtml}
            </div>
        </div>
    `;
}

async function renderCodingProjects(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    renderSkeletons(grid, 3);

    const items = await fetchCodingProjects();

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-code" style="font-size: 3rem; opacity: 0.3; margin-bottom: 20px; display: block;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 8px;">Coding Projects Coming Soon</h3>
                <p style="color: var(--text-muted);">Development projects will appear here once added via the admin panel.</p>
            </div>`;
        return;
    }

    grid.innerHTML = items.map((item, i) => renderCodingCard(item, i)).join('');
    grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// ===== Project Tab Switching (Index Page) =====
function switchProjectTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#projectsTabs .projects-tab').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`#projectsTabs [data-project-tab="${tab}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Switch content
    const graphicsContent = document.getElementById('graphicsTabContent');
    const codingContent = document.getElementById('codingTabContent');
    if (graphicsContent) graphicsContent.classList.toggle('active', tab === 'graphics');
    if (codingContent) codingContent.classList.toggle('active', tab === 'coding');
}

// ===== Gallery Tab Switching (Portfolio Page) =====
function switchGalleryTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#galleryProjectsTabs .projects-tab').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`#galleryProjectsTabs [data-project-tab="${tab}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Switch content
    const graphicsTab = document.getElementById('galleryGraphicsTab');
    const codingTab = document.getElementById('galleryCodingTab');
    if (graphicsTab) graphicsTab.classList.toggle('active', tab === 'graphics');
    if (codingTab) codingTab.classList.toggle('active', tab === 'coding');
}

// ===== Portfolio Likes Logic =====
function getLikedItems() {
    try {
        const likes = localStorage.getItem('kengsl_likes');
        return likes ? JSON.parse(likes) : [];
    } catch (e) {
        return [];
    }
}

function isLiked(itemId) {
    return getLikedItems().includes(itemId);
}

async function toggleLike(itemId, event) {
    // Prevent the lightbox from opening if clicking the like button
    event.stopPropagation();

    const btn = event.currentTarget;
    const countEl = document.getElementById(`like-count-${itemId}`);
    let currentCount = parseInt(countEl.textContent) || 0;
    
    let likedItems = getLikedItems();
    const alreadyLiked = likedItems.includes(itemId);

    // Optimistic UI update
    if (alreadyLiked) {
        btn.classList.remove('liked');
        currentCount = Math.max(0, currentCount - 1);
        likedItems = likedItems.filter(id => id !== itemId);
    } else {
        btn.classList.add('liked');
        currentCount += 1;
        likedItems.push(itemId);
    }
    
    countEl.textContent = currentCount;
    localStorage.setItem('kengsl_likes', JSON.stringify(likedItems));

    // Animate
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);

    // Update Firestore
    try {
        await db.collection('portfolio').doc(itemId).update({
            likes: firebase.firestore.FieldValue.increment(alreadyLiked ? -1 : 1)
        });
        
        // Update cache so switching filters doesn't reset it
        if (portfolioCache) {
            const cachedItem = portfolioCache.find(i => i.id === itemId);
            if (cachedItem) {
                cachedItem.likes = currentCount;
            }
        }
    } catch (err) {
        console.error('Error updating like:', err);
    }
}

// ===== Lightbox Modal (Event Delegation — no duplicate listeners) =====
function initLightbox() {
    const modal = document.getElementById('lightboxModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = modal ? modal.querySelector('.modal-close') : null;

    if (!modal || !modalImg) return;

    // Use event delegation on document for portfolio cards
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.portfolio-card');
        if (card) {
            const img = card.querySelector('.portfolio-img');
            if (img) {
                modalImg.src = img.src;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    });

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// ===== Scroll Animations (Intersection Observer) =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// ===== Animated Stat Counters =====
function animateCounters() {
    const statItems = document.querySelectorAll('.stat-item h3');
    statItems.forEach(el => {
        const text = el.textContent.trim();
        const match = text.match(/^(\d+)(.*)$/);
        if (!match) return;

        const target = parseInt(match[1]);
        const suffix = match[2]; // e.g. '%', '+'
        el.textContent = '0' + suffix;

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    let current = 0;
                    const duration = 1500;
                    const step = target / (duration / 16);

                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        el.textContent = Math.floor(current) + suffix;
                    }, 16);

                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counterObserver.observe(el);
    });
}

// ===== Scroll-to-Top Button =====
function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Navbar Scroll Effect =====
function initNavScroll() {
    const navInner = document.querySelector('.nav-inner');
    if (!navInner) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navInner.classList.add('scrolled');
        } else {
            navInner.classList.remove('scrolled');
        }
    }, { passive: true });
}

// ===== Close mobile menu on outside click =====
function initMobileMenuClose() {
    document.addEventListener('click', (e) => {
        const navLinks = document.getElementById('navLinks');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        if (!navLinks || !menuBtn) return;

        if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
            navLinks.classList.remove('active');
        }
    });
}

// ===== Button Ripple Effect =====
function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
}

// ===== Role Text Typing Animation =====
let roleTypingInterval = null;
function initRoleTyping(dynamicRoles = null) {
    const defaultRoles = ["Graphic Designer", "Netch Engineer", "Web Developer", "Content Creator"];
    const roles = (dynamicRoles && dynamicRoles.length > 0) ? dynamicRoles : defaultRoles;
    
    const roleTextEl = document.getElementById('role-text');
    if (!roleTextEl) return;
    
    let currentRoleIndex = 0;
    roleTextEl.textContent = roles[currentRoleIndex]; // set initial
    
    if (roleTypingInterval) clearInterval(roleTypingInterval);
    
    // Cycle the role every 3 seconds (sync with the CSS animation)
    roleTypingInterval = setInterval(() => {
        currentRoleIndex = (currentRoleIndex + 1) % roles.length;
        roleTextEl.textContent = roles[currentRoleIndex];
        
        // Re-trigger the CSS animation
        roleTextEl.style.animation = 'none';
        roleTextEl.offsetHeight; /* trigger reflow */
        roleTextEl.style.animation = null; 
    }, 3000);
}

// ===== Skill Icon Helper =====
function getSkillIcon(skillName) {
    const name = skillName.toLowerCase();
    if (name.includes('photoshop')) return '<img src="icons/photoshop.png" alt="Photoshop" class="skill-icon" onerror="this.style.display=\'none\';">';
    if (name.includes('illustrator')) return '<img src="icons/illustrator.png" alt="Illustrator" class="skill-icon" onerror="this.style.display=\'none\';">';
    if (name.includes('react') || name.includes('next')) return '<i class="fab fa-react" style="margin-right:8px; color:#61dafb"></i>';
    if (name.includes('vpn') || name.includes('v2ray') || name.includes('netch')) return '<i class="fas fa-network-wired" style="margin-right:8px; color:#ff6a00"></i>';
    if (name.includes('premiere') || name.includes('video') || name.includes('editor')) return '<i class="fas fa-video" style="margin-right:8px; color:#9999ff"></i>';
    if (name.includes('js') || name.includes('javascript')) return '<i class="fab fa-js" style="margin-right:8px; color:#f7df1e"></i>';
    if (name.includes('html')) return '<i class="fab fa-html5" style="margin-right:8px; color:#e34f26"></i>';
    if (name.includes('css')) return '<i class="fab fa-css3-alt" style="margin-right:8px; color:#1572b6"></i>';
    if (name.includes('git')) return '<i class="fab fa-git-alt" style="margin-right:8px; color:#f05032"></i>';
    if (name.includes('figma')) return '<i class="fab fa-figma" style="margin-right:8px; color:#f24e1e"></i>';
    return '<i class="fas fa-cog" style="margin-right:8px; color:var(--accent-1)"></i>';
}

// ===== Dynamic Site Config Fetching =====
function fetchSiteConfig() {
    if (!window.db) return; // Wait for firebase to load
    
    // Load Profile Settings
    db.collection('settings').doc('profile').get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            
            // Name & Alias
            if (data.name) {
                const nameHero = document.getElementById('profile-name-hero');
                const nameAbout = document.getElementById('profile-name-about');
                if (nameHero) nameHero.textContent = data.name;
                if (nameAbout) nameAbout.textContent = data.name;
            }
            if (data.alias) {
                const aliasAbout = document.getElementById('profile-alias-about');
                if (aliasAbout) aliasAbout.textContent = data.alias;
            }
            
            // Bio Paragraphs
            if (data.bio1) {
                const bio1 = document.getElementById('profile-bio-1');
                if (bio1) bio1.textContent = data.bio1;
            }
            if (data.bio2) {
                const bio2 = document.getElementById('profile-bio-2');
                if (bio2) bio2.textContent = data.bio2;
            }

            // Hero Description
            if (data.heroDesc) {
                const heroDesc = document.getElementById('profile-hero-desc');
                if (heroDesc) heroDesc.textContent = data.heroDesc;
            }

            // Location & Languages
            if (data.location) {
                const locationEl = document.getElementById('profile-location');
                if (locationEl) locationEl.textContent = data.location;
            }
            if (data.languages) {
                const languagesEl = document.getElementById('profile-languages');
                if (languagesEl) languagesEl.textContent = data.languages;
            }
            
            // Skills tags
            if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
                const skillsContainer = document.getElementById('profile-skills-container');
                if (skillsContainer) {
                    skillsContainer.innerHTML = data.skills.map(skill => `
                        <span class="skill-tag">${getSkillIcon(skill)} ${escapeHTML(skill)}</span>
                    `).join('');
                }
            }
            
            // Stats
            if (data.statClients) {
                const statClients = document.getElementById('stat-clients-value');
                if (statClients) statClients.textContent = data.statClients;
            }
            if (data.statVpn) {
                const statVpn = document.getElementById('stat-vpn-value');
                if (statVpn) statVpn.textContent = data.statVpn;
            }
            if (data.statYears) {
                const statYears = document.getElementById('stat-years-value');
                if (statYears) statYears.textContent = data.statYears;
            }
            if (data.statProjects) {
                const statProjects = document.getElementById('stat-projects-value');
                if (statProjects) statProjects.textContent = data.statProjects;
            }
            
            // Avatars
            if (data.avatarBase64) {
                const avatarHero = document.getElementById('profile-avatar-hero');
                const avatarAbout = document.getElementById('profile-avatar-about');
                if (avatarHero) avatarHero.src = data.avatarBase64;
                if (avatarAbout) avatarAbout.src = data.avatarBase64;
            }
            
            // Roles
            if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
                initRoleTyping(data.roles);
            }
        }
    }).catch(err => {
        console.error("Error fetching profile config:", err);
    });

    // Load General Settings (SEO & Socials)
    db.collection('settings').doc('general').get().then(doc => {
        if (doc.exists) {
            const data = doc.data();

            // SEO Metadata
            if (data.seoTitle) {
                document.title = data.seoTitle;
                const seoOgTitle = document.getElementById('seo-og-title');
                if (seoOgTitle) seoOgTitle.setAttribute('content', data.seoTitle);
            }
            if (data.seoDesc) {
                const seoDesc = document.getElementById('seo-desc');
                if (seoDesc) seoDesc.setAttribute('content', data.seoDesc);
                const seoOgDesc = document.getElementById('seo-og-desc');
                if (seoOgDesc) seoOgDesc.setAttribute('content', data.seoDesc);
            }
            if (data.seoKeywords) {
                const seoKeywords = document.getElementById('seo-keywords');
                if (seoKeywords) seoKeywords.setAttribute('content', data.seoKeywords);
            }
            if (data.seoCanonical) {
                const seoCanonical = document.getElementById('seo-canonical');
                if (seoCanonical) seoCanonical.setAttribute('href', data.seoCanonical);
                const seoOgUrl = document.getElementById('seo-og-url');
                if (seoOgUrl) seoOgUrl.setAttribute('content', data.seoCanonical);
            }
            if (data.seoOgImage) {
                const seoOgImage = document.getElementById('seo-og-image');
                if (seoOgImage) seoOgImage.setAttribute('content', data.seoOgImage);
            }

            // Social & Contact Links
            if (data.whatsapp) {
                const waUrl = data.whatsapp.startsWith('http') ? data.whatsapp : `https://wa.me/${data.whatsapp.replace(/\D/g, '')}`;
                document.querySelectorAll('.social-whatsapp').forEach(el => el.setAttribute('href', waUrl));
            }
            if (data.instagram) {
                document.querySelectorAll('.social-instagram').forEach(el => el.setAttribute('href', data.instagram));
            }
            if (data.youtube) {
                document.querySelectorAll('.social-youtube').forEach(el => el.setAttribute('href', data.youtube));
            }
            if (data.tiktok) {
                document.querySelectorAll('.social-tiktok').forEach(el => el.setAttribute('href', data.tiktok));
            }
            if (data.discord) {
                document.querySelectorAll('.social-discord').forEach(el => el.setAttribute('href', data.discord));
            }
        }
    }).catch(err => {
        console.error("Error fetching general config:", err);
    });
}

// ===== Dynamic Services Renderer =====
async function renderServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    try {
        const snapshot = await db.collection('services').orderBy('order', 'asc').get();
        if (snapshot.empty) return; // Keep fallback

        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

        grid.innerHTML = items.map((item, i) => {
            const iconColor = item.iconColor || 'var(--accent-1)';
            const iconBg = item.iconBg || 'rgba(139,92,246,0.1)';
            const linkColor = item.linkColor || 'var(--accent-1)';
            const iconClass = item.icon || 'fas fa-cog';

            let linkHtml = '';
            if (item.linkUrl) {
                const target = item.linkUrl.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '';
                linkHtml = `<a href="${escapeHTML(item.linkUrl)}" ${target} class="service-link" style="color: ${escapeHTML(linkColor)};">${escapeHTML(item.linkText || 'Learn More')} <i class="fas fa-arrow-right"></i></a>`;
            }

            return `
                <div class="service-card animate-on-scroll delay-${(i % 4) + 1}">
                    <div class="service-icon" style="color: ${escapeHTML(iconColor)}; background: ${escapeHTML(iconBg)};">
                        <i class="${escapeHTML(iconClass)}"></i>
                    </div>
                    <h3 class="service-title">${escapeHTML(item.title)}</h3>
                    <p class="service-desc">${escapeHTML(item.description)}</p>
                    ${linkHtml}
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    } catch (err) {
        console.error('Error loading dynamic services:', err);
    }
}

// ===== Testimonial Submission (Public) =====
let reviewUser = null;

function signInForReview() {
    if (reviewUser) {
        openReviewModal();
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
        reviewUser = result.user;
        openReviewModal();
    }).catch((err) => {
        console.error("Error signing in:", err);
        alert("Failed to sign in. Please try again.");
    });
}

function openReviewModal() {
    if (!reviewUser) return;
    
    document.getElementById('reviewUserName').textContent = reviewUser.displayName || 'Anonymous';
    document.getElementById('reviewUserAvatar').src = reviewUser.photoURL || 'https://placehold.co/45x45/141419/71717a?text=User';
    
    const modal = document.getElementById('reviewModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function submitTestimonial(e) {
    e.preventDefault();
    if (!reviewUser) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    const role = document.getElementById('reviewRole').value.trim();
    const quote = document.getElementById('reviewQuote').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value);

    const data = {
        uid: reviewUser.uid,
        authorName: reviewUser.displayName || 'Anonymous',
        authorRole: role,
        quote: quote,
        rating: rating,
        avatarInitials: (reviewUser.displayName || 'A')[0].toUpperCase(),
        photoURL: reviewUser.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('pendingTestimonials').add(data);
        alert('Thank you! Your review has been submitted and is pending approval.');
        e.target.reset();
        closeReviewModal();
    } catch (err) {
        console.error("Error submitting review:", err);
        alert("Failed to submit review. Please try again later.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== Single DOMContentLoaded — All Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    // Page entrance animation
    document.body.classList.add('page-loaded');

    // Observe all animate-on-scroll elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // Close mobile menu on nav link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            const navLinks = document.getElementById('navLinks');
            if (navLinks) navLinks.classList.remove('active');
        });
    });

    // Initialize all features
    renderFeatured();
    renderPortfolio();
    renderTestimonials();
    renderServices();
    setupFilters();
    initLightbox();
    animateCounters();
    initScrollTop();
    initNavScroll();
    initMobileMenuClose();
    initRippleEffect();
    initRoleTyping();

    // Render coding projects grids
    renderCodingProjects('codingGrid');
    renderCodingProjects('galleryCodingGrid');

    // Review Modal Event Listeners
    const revModal = document.getElementById('reviewModal');
    if (revModal) {
        revModal.querySelector('.modal-close').addEventListener('click', closeReviewModal);
        revModal.addEventListener('click', (e) => {
            if (e.target === revModal) closeReviewModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && revModal.classList.contains('active')) closeReviewModal();
        });
    }

    // Auto-listen to auth state changes to set reviewUser instantly
    if (window.auth) {
        auth.onAuthStateChanged((user) => {
            reviewUser = user;
        });
    }

    // Fetch dynamic site config
    setTimeout(() => {
        if (window.db) fetchSiteConfig();
    }, 100);
});
