/* ==========================================================================
   KenGSL Live Page Builder Engine (editor.js)
   Vanilla JS visual editor with Firestore synchronization
   ========================================================================== */

(async function () {
    // Prevent double booting
    if (window.liveEditorInitialized) return;
    window.liveEditorInitialized = true;

    // --- State Cache ---
    let editedProfile = {};
    let editedGeneral = {};
    let editedServices = [];
    let initialServicesCount = 0;
    
    let isEditModeOn = false;
    let currentUploadTarget = null; // 'avatar'
    let currentUploadedImageBase64 = null;
    let activeServiceEditId = null; // null for add new

    // Curated FontAwesome Icons list for Picker
    const iconLibrary = [
        'fas fa-paint-brush', 'fas fa-code', 'fas fa-video', 'fas fa-palette', 
        'fas fa-bullhorn', 'fas fa-cog', 'fas fa-terminal', 'fas fa-network-wired', 
        'fas fa-server', 'fas fa-shield-alt', 'fas fa-chart-line', 'fas fa-heart',
        'fas fa-laptop-code', 'fas fa-gamepad', 'fas fa-broadcast-tower', 'fas fa-cloud',
        'fab fa-youtube', 'fab fa-tiktok', 'fab fa-instagram', 'fab fa-discord'
    ];

    // --- Fetch initial Firestore configurations ---
    async function loadEditorData() {
        try {
            const [profileDoc, generalDoc, servicesSnap] = await Promise.all([
                db.collection('settings').doc('profile').get(),
                db.collection('settings').doc('general').get(),
                db.collection('services').orderBy('order', 'asc').get()
            ]);

            if (profileDoc.exists) editedProfile = profileDoc.data();
            if (generalDoc.exists) editedGeneral = generalDoc.data();
            
            editedServices = [];
            servicesSnap.forEach(doc => editedServices.push({ id: doc.id, ...doc.data() }));
            initialServicesCount = editedServices.length;

            console.log("Visual Editor loaded active data:", { editedProfile, editedGeneral, servicesCount: editedServices.length });
        } catch (err) {
            console.error("Error loading editor data from Firestore:", err);
            alert("Error loading editor data. Please check your credentials.");
        }
    }

    // --- Dynamic UI DOM Injection ---
    function injectEditorUI() {
        // 1. Inect top toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.innerHTML = `
            <div class="editor-toolbar-logo">
                <i class="fas fa-wand-magic-sparkles"></i> KenGSL Visual Page Builder
            </div>
            <div class="editor-toolbar-actions">
                <button class="editor-btn" id="btn-sidebar-toggle"><i class="fas fa-search"></i> SEO & Socials</button>
                <button class="editor-btn" id="btn-roles-modal"><i class="fas fa-terminal"></i> Edit Typing Roles</button>
                <button class="editor-btn" id="btn-skills-modal"><i class="fas fa-tags"></i> Edit Skills</button>
                <button class="editor-btn editor-btn-primary" id="btn-toggle-design" style="background:#10b981"><i class="fas fa-play"></i> Start Designing</button>
                <button class="editor-btn editor-btn-primary" id="btn-publish-all"><i class="fas fa-cloud-upload-alt"></i> Publish Changes</button>
                <button class="editor-btn editor-btn-danger" id="btn-exit-editor"><i class="fas fa-times"></i> Exit</button>
            </div>
        `;
        document.body.appendChild(toolbar);

        // 2. Inject Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'editor-sidebar';
        sidebar.id = 'editorSidebar';
        sidebar.innerHTML = `
            <div class="editor-sidebar-header">
                <h3>SEO & Social Handles</h3>
                <button class="editor-sidebar-close" id="btn-sidebar-close"><i class="fas fa-times"></i></button>
            </div>
            
            <div class="editor-seo-preview">
                <div class="editor-label">Live Google Snippet Preview</div>
                <h4 class="editor-seo-title" id="seo-preview-title">Google Search Result Title</h4>
                <p class="editor-seo-url" id="seo-preview-url">https://kengsl.indevs.in</p>
                <p class="editor-seo-desc" id="seo-preview-desc">This is your site meta description that will display dynamically on search engines.</p>
            </div>

            <div class="editor-group">
                <label class="editor-label">SEO Page Title</label>
                <input type="text" class="editor-input" id="inp-seo-title" placeholder="Meta title...">
            </div>
            <div class="editor-group">
                <label class="editor-label">SEO Meta Description</label>
                <textarea class="editor-input" id="inp-seo-desc" rows="3" placeholder="Meta description..."></textarea>
            </div>
            <div class="editor-group">
                <label class="editor-label">SEO Keywords (comma separated)</label>
                <input type="text" class="editor-input" id="inp-seo-keywords" placeholder="graphic design, netch engineer...">
            </div>
            <div class="editor-group">
                <label class="editor-label">Canonical URL</label>
                <input type="text" class="editor-input" id="inp-seo-canonical" placeholder="https://kengsl.indevs.in">
            </div>
            <div class="editor-group" style="border-bottom:1px solid var(--editor-border); padding-bottom:20px; margin-bottom:20px">
                <label class="editor-label">OG Share Image (optional link)</label>
                <input type="text" class="editor-input" id="inp-seo-og-image" placeholder="Image URL link...">
            </div>

            <h4 style="margin: 0 0 16px 0; font-size: 1rem; font-weight:700">Social Connections</h4>
            <div class="editor-group">
                <label class="editor-label"><i class="fab fa-whatsapp"></i> WhatsApp Number/Link</label>
                <input type="text" class="editor-input" id="inp-soc-whatsapp" placeholder="e.g. 947XXXXXXXX">
            </div>
            <div class="editor-group">
                <label class="editor-label"><i class="fab fa-instagram"></i> Instagram Profile Link</label>
                <input type="text" class="editor-input" id="inp-soc-instagram" placeholder="Profile link...">
            </div>
            <div class="editor-group">
                <label class="editor-label"><i class="fab fa-youtube"></i> YouTube Channel Link</label>
                <input type="text" class="editor-input" id="inp-soc-youtube" placeholder="Channel link...">
            </div>
            <div class="editor-group">
                <label class="editor-label"><i class="fab fa-tiktok"></i> TikTok Profile Link</label>
                <input type="text" class="editor-input" id="inp-soc-tiktok" placeholder="Profile link...">
            </div>
            <div class="editor-group">
                <label class="editor-label"><i class="fab fa-discord"></i> Discord Server/Invite</label>
                <input type="text" class="editor-input" id="inp-soc-discord" placeholder="Invite link...">
            </div>
        `;
        document.body.appendChild(sidebar);

        // 3. Inject Avatar Upload Modal
        const avatarModal = document.createElement('div');
        avatarModal.className = 'editor-modal-overlay';
        avatarModal.id = 'modal-avatar';
        avatarModal.innerHTML = `
            <div class="editor-modal">
                <div class="editor-modal-header">
                    <h3 id="avatar-modal-title">Upload & Compress Portrait</h3>
                    <button class="editor-sidebar-close" onclick="closeEditorModal('modal-avatar')"><i class="fas fa-times"></i></button>
                </div>
                <div class="editor-modal-body">
                    <div class="editor-dropzone" id="avatar-dropzone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <h4>Drag and drop profile image here</h4>
                        <p style="font-size:0.8rem;color:var(--editor-text-muted)">or click to select file from computer</p>
                        <input type="file" id="avatar-file-input" style="display:none" accept="image/*">
                    </div>

                    <div class="editor-slider-container" id="avatar-quality-container" style="display:none">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem">
                            <span class="editor-label" style="margin:0">WebP Quality</span>
                            <span id="avatar-quality-val" style="font-weight:700; color:var(--editor-primary)">75%</span>
                        </div>
                        <input type="range" class="editor-slider" id="avatar-quality-slider" min="0.1" max="1" step="0.05" value="0.75">
                        
                        <div style="display:flex; justify-content:space-around; align-items:center; margin-top:16px; font-size:0.8rem; border-top:1px solid var(--editor-border); padding-top:12px">
                            <div style="text-align:center">
                                <div class="editor-label" style="margin:0">Original</div>
                                <span id="avatar-orig-size" style="font-weight:700">0 KB</span>
                            </div>
                            <div style="font-size:1.2rem; color:var(--editor-text-muted)"><i class="fas fa-arrow-right"></i></div>
                            <div style="text-align:center">
                                <div class="editor-label" style="margin:0">Compressed (WebP)</div>
                                <span id="avatar-comp-size" style="font-weight:700; color:#10b981">0 KB</span>
                            </div>
                        </div>
                        <div style="text-align:center; font-size:0.8rem; color:#10b981; font-weight:700; margin-top:8px" id="avatar-savings-info">
                            90% smaller space size!
                        </div>
                    </div>
                </div>
                <div class="editor-modal-footer">
                    <button class="editor-btn" onclick="closeEditorModal('modal-avatar')">Cancel</button>
                    <button class="editor-btn editor-btn-primary" id="btn-save-avatar" disabled>Apply Portrait</button>
                </div>
            </div>
        `;
        document.body.appendChild(avatarModal);

        // 4. Inject Typing Roles Modal
        const rolesModal = document.createElement('div');
        rolesModal.className = 'editor-modal-overlay';
        rolesModal.id = 'modal-roles';
        rolesModal.innerHTML = `
            <div class="editor-modal">
                <div class="editor-modal-header">
                    <h3>Configure Typing Roles</h3>
                    <button class="editor-sidebar-close" onclick="closeEditorModal('modal-roles')"><i class="fas fa-times"></i></button>
                </div>
                <div class="editor-modal-body">
                    <div class="editor-label">Cycling Roles (Shown in typing loop on Hero)</div>
                    <div class="editor-pill-container" id="roles-pill-container"></div>
                    
                    <div class="editor-group" style="display:flex; gap:10px; margin-top:12px">
                        <input type="text" class="editor-input" id="inp-new-role" placeholder="e.g. Video Editor" style="flex:1">
                        <button class="editor-btn editor-btn-primary" id="btn-add-role-chip"><i class="fas fa-plus"></i> Add</button>
                    </div>
                </div>
                <div class="editor-modal-footer">
                    <button class="editor-btn" onclick="closeEditorModal('modal-roles')">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(rolesModal);

        // 5. Inject Skills Modal
        const skillsModal = document.createElement('div');
        skillsModal.className = 'editor-modal-overlay';
        skillsModal.id = 'modal-skills';
        skillsModal.innerHTML = `
            <div class="editor-modal">
                <div class="editor-modal-header">
                    <h3>Configure Skills List</h3>
                    <button class="editor-sidebar-close" onclick="closeEditorModal('modal-skills')"><i class="fas fa-times"></i></button>
                </div>
                <div class="editor-modal-body">
                    <div class="editor-label">Skills Showcase Tags</div>
                    <div class="editor-pill-container" id="skills-pill-container"></div>
                    
                    <div class="editor-group" style="display:flex; gap:10px; margin-top:12px">
                        <input type="text" class="editor-input" id="inp-new-skill" placeholder="e.g. Photoshop" style="flex:1">
                        <button class="editor-btn editor-btn-primary" id="btn-add-skill-chip"><i class="fas fa-plus"></i> Add</button>
                    </div>
                </div>
                <div class="editor-modal-footer">
                    <button class="editor-btn" onclick="closeEditorModal('modal-skills')">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(skillsModal);

        // 6. Inject Service Builder Modal
        const serviceModal = document.createElement('div');
        serviceModal.className = 'editor-modal-overlay';
        serviceModal.id = 'modal-service';
        serviceModal.innerHTML = `
            <div class="editor-modal">
                <div class="editor-modal-header">
                    <h3 id="service-modal-title">Edit Service Card</h3>
                    <button class="editor-sidebar-close" onclick="closeEditorModal('modal-service')"><i class="fas fa-times"></i></button>
                </div>
                <div class="editor-modal-body">
                    <div class="editor-group">
                        <label class="editor-label">Service Title *</label>
                        <input type="text" class="editor-input" id="service-title-inp" placeholder="e.g. Creative Layout Design" required>
                    </div>
                    <div class="editor-group">
                        <label class="editor-label">Description *</label>
                        <textarea class="editor-input" id="service-desc-inp" rows="3" placeholder="Describe the service details..." required></textarea>
                    </div>

                    <div class="editor-group">
                        <label class="editor-label">FontAwesome Service Icon *</label>
                        <input type="text" class="editor-input" id="service-icon-inp" placeholder="e.g. fas fa-paint-brush" required style="margin-bottom:8px">
                        <div class="editor-icon-picker" id="service-icon-picker-grid"></div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div class="editor-group">
                            <label class="editor-label">Icon Color (HEX)</label>
                            <input type="color" class="editor-input" id="service-icon-color-inp" style="height:40px; padding:2px">
                        </div>
                        <div class="editor-group">
                            <label class="editor-label">Icon Background (RGBA)</label>
                            <input type="text" class="editor-input" id="service-icon-bg-inp" placeholder="e.g. rgba(139,92,246,0.1)">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border-top:1px solid var(--editor-border); padding-top:12px">
                        <div class="editor-group">
                            <label class="editor-label">Link Text (optional)</label>
                            <input type="text" class="editor-input" id="service-link-text-inp" placeholder="e.g. View Gallery">
                        </div>
                        <div class="editor-group">
                            <label class="editor-label">Link URL (optional)</label>
                            <input type="text" class="editor-input" id="service-link-url-inp" placeholder="e.g. #contact">
                        </div>
                    </div>
                    <div class="editor-group">
                        <label class="editor-label">Link/Arrow Color (HEX)</label>
                        <input type="color" class="editor-input" id="service-link-color-inp" style="height:40px; padding:2px">
                    </div>
                </div>
                <div class="editor-modal-footer">
                    <button class="editor-btn" onclick="closeEditorModal('modal-service')">Cancel</button>
                    <button class="editor-btn editor-btn-primary" onclick="applyServiceModalEdits()">Apply Card</button>
                </div>
            </div>
        `;
        document.body.appendChild(serviceModal);
    }

    // --- Modal Managers ---
    window.openEditorModal = function(id) {
        document.getElementById(id).classList.add('active');
    };
    window.closeEditorModal = function(id) {
        document.getElementById(id).classList.remove('active');
        if (id === 'modal-avatar') {
            currentUploadedImageBase64 = null;
            document.getElementById('avatar-quality-container').style.display = 'none';
            document.getElementById('btn-save-avatar').disabled = true;
            document.getElementById('avatar-file-input').value = '';
        }
    };

    function openSeoSidebar() {
        document.getElementById('editorSidebar').classList.add('active');
        populateSidebarFields();
    }
    function closeSeoSidebar() {
        document.getElementById('editorSidebar').classList.remove('active');
    }

    // --- Populate Settings Form Inputs ---
    function populateSidebarFields() {
        document.getElementById('inp-seo-title').value = editedGeneral.seoTitle || '';
        document.getElementById('inp-seo-desc').value = editedGeneral.seoDesc || '';
        document.getElementById('inp-seo-keywords').value = editedGeneral.seoKeywords || '';
        document.getElementById('inp-seo-canonical').value = editedGeneral.seoCanonical || '';
        document.getElementById('inp-seo-og-image').value = editedGeneral.seoOgImage || '';

        document.getElementById('inp-soc-whatsapp').value = editedGeneral.whatsapp || '';
        document.getElementById('inp-soc-instagram').value = editedGeneral.instagram || '';
        document.getElementById('inp-soc-youtube').value = editedGeneral.youtube || '';
        document.getElementById('inp-soc-tiktok').value = editedGeneral.tiktok || '';
        document.getElementById('inp-soc-discord').value = editedGeneral.discord || '';

        updateSeoGooglePreview();
    }

    function updateSeoGooglePreview() {
        const title = document.getElementById('inp-seo-title').value.trim() || 'KenGSL | Creative Graphic & Development Portfolio';
        const desc = document.getElementById('inp-seo-desc').value.trim() || 'Anuhas Nethsara portfolio featuring custom graphic UI layouts, Discord bot developments, and high impact social assets.';
        const canonical = document.getElementById('inp-seo-canonical').value.trim() || 'https://kengsl.indevs.in';

        document.getElementById('seo-preview-title').textContent = title;
        document.getElementById('seo-preview-url').textContent = canonical;
        document.getElementById('seo-preview-desc').textContent = desc;

        // Keep local memory synced reactive
        editedGeneral.seoTitle = title;
        editedGeneral.seoDesc = desc;
        editedGeneral.seoKeywords = document.getElementById('inp-seo-keywords').value.trim();
        editedGeneral.seoCanonical = canonical;
        editedGeneral.seoOgImage = document.getElementById('inp-seo-og-image').value.trim();
    }

    // --- Sync text edit blocks with local state ---
    function makeSectionsEditable() {
        // Tag DOM nodes with special attributes so hover outline styling triggers
        
        // Name & Hero titles
        tagEditableElement('profile-name-hero', 'name', 'Hero Name Title');
        tagEditableElement('profile-hero-desc', 'heroDesc', 'Hero Bio Tagline');
        
        // Stats
        tagEditableElement('stat-clients-value', 'statClients', 'Clients Count');
        tagEditableElement('stat-vpn-value', 'statVpn', 'VPN Server Count');
        tagEditableElement('stat-years-value', 'statYears', 'Experience Years');
        tagEditableElement('stat-projects-value', 'statProjects', 'Projects Counter');

        // About Bios
        tagEditableElement('profile-bio-1', 'bio1', 'About Biography 1');
        tagEditableElement('profile-bio-2', 'bio2', 'About Biography 2');

        // About Details
        tagEditableElement('profile-name-about', 'name', 'About Name Detail');
        tagEditableElement('profile-alias-about', 'alias', 'Alias/Nickname');
        tagEditableElement('profile-location', 'location', 'Home Location');
        tagEditableElement('profile-languages', 'languages', 'Spoken Languages');

        // Profile Avatars Clickable triggers
        const heroAvatar = document.getElementById('profile-avatar-hero');
        const aboutAvatar = document.getElementById('profile-avatar-about');
        
        if (heroAvatar) {
            heroAvatar.style.cursor = 'pointer';
            heroAvatar.setAttribute('data-edit-field', 'avatarBase64');
            heroAvatar.setAttribute('data-edit-label', 'Change Profile Image');
        }
        if (aboutAvatar) {
            aboutAvatar.style.cursor = 'pointer';
            aboutAvatar.setAttribute('data-edit-field', 'avatarBase64');
            aboutAvatar.setAttribute('data-edit-label', 'Change Profile Image');
        }
    }

    function tagEditableElement(id, fieldKey, label) {
        const el = document.getElementById(id);
        if (!el) return;

        el.setAttribute('data-edit-field', fieldKey);
        el.setAttribute('data-edit-label', label);
        
        // Double click inline editors
        el.addEventListener('dblclick', () => {
            if (!isEditModeOn) return;
            enterInlineEdit(el, fieldKey);
        });
    }

    function enterInlineEdit(el, fieldKey) {
        el.contentEditable = 'true';
        el.focus();

        const handleBlur = () => {
            el.contentEditable = 'false';
            const value = el.textContent.trim();
            
            // Sync to local data cache
            editedProfile[fieldKey] = value;
            
            // Mirror duplicates instantly (like name fields)
            if (fieldKey === 'name') {
                const nameHero = document.getElementById('profile-name-hero');
                const nameAbout = document.getElementById('profile-name-about');
                if (nameHero) nameHero.textContent = value;
                if (nameAbout) nameAbout.textContent = value;
            }
            
            el.removeEventListener('blur', handleBlur);
        };
        el.addEventListener('blur', handleBlur);
    }

    // --- Typing Roles Management ---
    function renderRolesPills() {
        const container = document.getElementById('roles-pill-container');
        if (!container) return;

        const roles = editedProfile.roles || [];
        container.innerHTML = roles.map((role, idx) => `
            <span class="editor-pill">
                ${escapeHTML(role)}
                <button onclick="removeRoleChip(${idx})"><i class="fas fa-times-circle"></i></button>
            </span>
        `).join('');
    }

    window.removeRoleChip = function(idx) {
        if (!editedProfile.roles) return;
        editedProfile.roles.splice(idx, 1);
        renderRolesPills();
    };

    function addRoleChip() {
        const input = document.getElementById('inp-new-role');
        const val = input.value.trim();
        if (!val) return;

        if (!editedProfile.roles) editedProfile.roles = [];
        editedProfile.roles.push(val);
        input.value = '';
        renderRolesPills();
    }

    // --- Skills Management ---
    function renderSkillsPills() {
        const container = document.getElementById('skills-pill-container');
        if (!container) return;

        const skills = editedProfile.skills || [];
        container.innerHTML = skills.map((skill, idx) => `
            <span class="editor-pill">
                ${escapeHTML(skill)}
                <button onclick="removeSkillChip(${idx})"><i class="fas fa-times-circle"></i></button>
            </span>
        `).join('');
    }

    window.removeSkillChip = function(idx) {
        if (!editedProfile.skills) return;
        editedProfile.skills.splice(idx, 1);
        renderSkillsPills();
        updateSkillsDisplayInDom();
    };

    function addSkillChip() {
        const input = document.getElementById('inp-new-skill');
        const val = input.value.trim();
        if (!val) return;

        if (!editedProfile.skills) editedProfile.skills = [];
        if (!editedProfile.skills.includes(val)) {
            editedProfile.skills.push(val);
        }
        input.value = '';
        renderSkillsPills();
        updateSkillsDisplayInDom();
    }

    function updateSkillsDisplayInDom() {
        const container = document.getElementById('profile-skills-container');
        if (!container || !editedProfile.skills) return;
        
        // Mirror changes on the live page in real time
        container.innerHTML = editedProfile.skills.map(skill => `
            <span class="skill-tag">${getSkillIcon(skill)} ${escapeHTML(skill)}</span>
        `).join('');
    }

    // Helper for icons mapping in skills
    function getSkillIcon(skill) {
        const s = skill.toLowerCase();
        if (s.includes('photoshop')) return '<i class="fab fa-adobe" style="color:#00c8ff"></i>';
        if (s.includes('illustrator')) return '<i class="fab fa-adobe" style="color:#ff9a00"></i>';
        if (s.includes('premiere')) return '<i class="fab fa-adobe" style="color:#ea00ff"></i>';
        if (s.includes('js') || s.includes('javascript')) return '<i class="fab fa-js" style="color:#f7df1e"></i>';
        if (s.includes('react') || s.includes('next')) return '<i class="fab fa-react" style="color:#61dafb"></i>';
        if (s.includes('node')) return '<i class="fab fa-node-js" style="color:#339933"></i>';
        if (s.includes('python')) return '<i class="fab fa-python" style="color:#3776ab"></i>';
        if (s.includes('discord') || s.includes('bot')) return '<i class="fab fa-discord" style="color:#5865f2"></i>';
        if (s.includes('network') || s.includes('routing')) return '<i class="fas fa-network-wired" style="color:#10b981"></i>';
        return '<i class="fas fa-check-circle" style="color:var(--accent-1)"></i>';
    }

    // --- Image Compression Canvas Helper ---
    async function compressToWebP(file, quality = 0.75, maxWidth = 800) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;

                if (w > maxWidth) {
                    h = Math.round((maxWidth / w) * h);
                    w = maxWidth;
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                const format = 'image/webp';
                canvas.toBlob((blob) => {
                    if (!blob) { reject(new Error('Compression failed')); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            base64: reader.result,
                            originalSize: file.size,
                            compressedSize: blob.size,
                            format: 'WebP',
                            width: w,
                            height: h
                        });
                    };
                    reader.readAsDataURL(blob);
                }, format, quality);

                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    async function handleAvatarCompression(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        const slider = document.getElementById('avatar-quality-slider');
        const quality = parseFloat(slider.value);
        const origSizeEl = document.getElementById('avatar-orig-size');
        const compSizeEl = document.getElementById('avatar-comp-size');
        const savingsEl = document.getElementById('avatar-savings-info');
        const qualityVal = document.getElementById('avatar-quality-val');
        
        qualityVal.textContent = Math.round(quality * 100) + '%';
        document.getElementById('avatar-quality-container').style.display = 'block';

        try {
            const result = await compressToWebP(file, quality, 800);
            
            // Limit check to under 900KB
            if (result.compressedSize > 900000) {
                // re-compress with very low parameters
                const lowResult = await compressToWebP(file, 0.4, 600);
                if (lowResult.compressedSize > 900000) {
                    alert("The uploaded image is too large! Please choose a smaller file.");
                    return;
                }
                Object.assign(result, lowResult);
            }

            currentUploadedImageBase64 = result.base64;
            origSizeEl.textContent = formatBytes(result.originalSize);
            compSizeEl.textContent = formatBytes(result.compressedSize);
            const savings = Math.round((1 - result.compressedSize / result.originalSize) * 100);
            savingsEl.textContent = `${savings}% smaller space footprint!`;
            
            // Enable save button
            document.getElementById('btn-save-avatar').disabled = false;
        } catch (err) {
            console.error("Compression error:", err);
            alert("Error compressing image.");
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // --- Services Interactive Section ---
    function renderServicesLiveGrid() {
        const grid = document.getElementById('services-grid');
        if (!grid) return;

        if (editedServices.length === 0) {
            grid.innerHTML = `
                <div class="service-card editor-virtual-add-card" onclick="openAddServiceModal()">
                    <i class="fas fa-plus-circle"></i>
                    <h3 class="service-title">No services showcase</h3>
                    <p class="service-desc">Click here to design your first custom card</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = editedServices.map((item, i) => {
            const iconColor = item.iconColor || 'var(--accent-1)';
            const iconBg = item.iconBg || 'rgba(139,92,246,0.1)';
            const linkColor = item.linkColor || 'var(--accent-1)';
            const iconClass = item.icon || 'fas fa-cog';

            let linkHtml = '';
            if (item.linkUrl) {
                linkHtml = `<a href="javascript:void(0)" class="service-link" style="color: ${escapeHTML(linkColor)};">${escapeHTML(item.linkText || 'Learn More')} <i class="fas fa-arrow-right"></i></a>`;
            }

            // Controls HTML overlays (Move left/right, Edit, Delete)
            const controls = isEditModeOn ? `
                <div class="editor-card-controls">
                    <button class="editor-card-btn" onclick="moveServiceLeft(${i})" title="Move Left"><i class="fas fa-arrow-left"></i></button>
                    <button class="editor-card-btn" onclick="moveServiceRight(${i})" title="Move Right"><i class="fas fa-arrow-right"></i></button>
                    <button class="editor-card-btn" onclick="openEditServiceModal(${i})" title="Edit Details"><i class="fas fa-pen"></i></button>
                    <button class="editor-card-btn btn-delete" onclick="deleteServiceItem(${i})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            ` : '';

            return `
                <div class="service-card animate-on-scroll" style="position:relative">
                    ${controls}
                    <div class="service-icon" style="color: ${escapeHTML(iconColor)}; background: ${escapeHTML(iconBg)};">
                        <i class="${escapeHTML(iconClass)}"></i>
                    </div>
                    <h3 class="service-title">${escapeHTML(item.title)}</h3>
                    <p class="service-desc">${escapeHTML(item.description)}</p>
                    ${linkHtml}
                </div>
            `;
        }).join('') + (isEditModeOn ? `
            <div class="service-card editor-virtual-add-card" onclick="openAddServiceModal()">
                <i class="fas fa-plus-circle"></i>
                <h3 class="service-title">Add Service</h3>
                <p class="service-desc">Insert a new customized offering</p>
            </div>
        ` : '');
    }

    // Services card sorting and deleting
    window.moveServiceLeft = function(i) {
        if (i === 0) return;
        const temp = editedServices[i];
        editedServices[i] = editedServices[i - 1];
        editedServices[i - 1] = temp;
        // update orders
        editedServices.forEach((s, idx) => s.order = idx + 1);
        renderServicesLiveGrid();
    };

    window.moveServiceRight = function(i) {
        if (i === editedServices.length - 1) return;
        const temp = editedServices[i];
        editedServices[i] = editedServices[i + 1];
        editedServices[i + 1] = temp;
        // update orders
        editedServices.forEach((s, idx) => s.order = idx + 1);
        renderServicesLiveGrid();
    };

    window.deleteServiceItem = function(i) {
        if (!confirm(`Delete service card "${editedServices[i].title}"?`)) return;
        
        // Track the deleted ID if it existed in firestore initially to delete it later
        const s = editedServices[i];
        if (s.id) {
            if (!window.deletedServicesTracker) window.deletedServicesTracker = [];
            window.deletedServicesTracker.push(s.id);
        }
        
        editedServices.splice(i, 1);
        // update orders
        editedServices.forEach((card, idx) => card.order = idx + 1);
        renderServicesLiveGrid();
    };

    // Services Modal Actions
    window.openAddServiceModal = function() {
        activeServiceEditId = null;
        document.getElementById('service-modal-title').textContent = 'Add New Service Card';
        
        // Reset inputs
        document.getElementById('service-title-inp').value = '';
        document.getElementById('service-desc-inp').value = '';
        document.getElementById('service-icon-inp').value = 'fas fa-cog';
        document.getElementById('service-icon-color-inp').value = '#8b5cf6';
        document.getElementById('service-icon-bg-inp').value = 'rgba(139,92,246,0.1)';
        document.getElementById('service-link-text-inp').value = 'Learn More';
        document.getElementById('service-link-url-inp').value = '#contact';
        document.getElementById('service-link-color-inp').value = '#8b5cf6';

        // Select first active icon in picker
        renderIconLibraryPicker('fas fa-cog');
        openEditorModal('modal-service');
    };

    window.openEditServiceModal = function(idx) {
        const item = editedServices[idx];
        if (!item) return;

        activeServiceEditId = idx;
        document.getElementById('service-modal-title').textContent = 'Edit Service Details';
        
        document.getElementById('service-title-inp').value = item.title || '';
        document.getElementById('service-desc-inp').value = item.description || '';
        document.getElementById('service-icon-inp').value = item.icon || 'fas fa-cog';
        document.getElementById('service-icon-color-inp').value = item.iconColor || '#8b5cf6';
        document.getElementById('service-icon-bg-inp').value = item.iconBg || 'rgba(139,92,246,0.1)';
        document.getElementById('service-link-text-inp').value = item.linkText || 'Learn More';
        document.getElementById('service-link-url-inp').value = item.linkUrl || '';
        document.getElementById('service-link-color-inp').value = item.linkColor || '#8b5cf6';

        renderIconLibraryPicker(item.icon || 'fas fa-cog');
        openEditorModal('modal-service');
    };

    function renderIconLibraryPicker(activeIcon) {
        const grid = document.getElementById('service-icon-picker-grid');
        if (!grid) return;

        grid.innerHTML = iconLibrary.map(icon => `
            <div class="editor-icon-option ${icon === activeIcon ? 'active' : ''}" onclick="selectServicePickerIcon('${icon}')" data-icon="${icon}">
                <i class="${icon}"></i>
            </div>
        `).join('');
    }

    window.selectServicePickerIcon = function(icon) {
        document.getElementById('service-icon-inp').value = icon;
        
        // Remove active class
        document.querySelectorAll('.editor-icon-option').forEach(el => el.classList.remove('active'));
        // Add to active
        const opt = document.querySelector(`.editor-icon-option[data-icon="${icon}"]`);
        if (opt) opt.classList.add('active');

        // Color maps automatically based on icon context to suggest styling
        if (icon.includes('youtube')) {
            document.getElementById('service-icon-color-inp').value = '#ef4444';
            document.getElementById('service-icon-bg-inp').value = 'rgba(239,68,68,0.1)';
            document.getElementById('service-link-color-inp').value = '#ef4444';
        } else if (icon.includes('discord')) {
            document.getElementById('service-icon-color-inp').value = '#5865f2';
            document.getElementById('service-icon-bg-inp').value = 'rgba(88,101,242,0.1)';
            document.getElementById('service-link-color-inp').value = '#5865f2';
        } else if (icon.includes('tiktok')) {
            document.getElementById('service-icon-color-inp').value = '#00f2fe';
            document.getElementById('service-icon-bg-inp').value = 'rgba(0,242,254,0.1)';
            document.getElementById('service-link-color-inp').value = '#00f2fe';
        } else if (icon.includes('instagram')) {
            document.getElementById('service-icon-color-inp').value = '#ec4899';
            document.getElementById('service-icon-bg-inp').value = 'rgba(236,72,153,0.1)';
            document.getElementById('service-link-color-inp').value = '#ec4899';
        }
    };

    window.applyServiceModalEdits = function() {
        const title = document.getElementById('service-title-inp').value.trim();
        const desc = document.getElementById('service-desc-inp').value.trim();
        const icon = document.getElementById('service-icon-inp').value.trim() || 'fas fa-cog';
        const iconColor = document.getElementById('service-icon-color-inp').value;
        const iconBg = document.getElementById('service-icon-bg-inp').value.trim() || 'rgba(139,92,246,0.1)';
        const linkText = document.getElementById('service-link-text-inp').value.trim();
        const linkUrl = document.getElementById('service-link-url-inp').value.trim();
        const linkColor = document.getElementById('service-link-color-inp').value;

        if (!title || !desc) {
            alert("Title and Description are required!");
            return;
        }

        const data = {
            title,
            description: desc,
            icon,
            iconColor,
            iconBg,
            linkText,
            linkUrl,
            linkColor
        };

        if (activeServiceEditId !== null) {
            // Edit existing in cache
            editedServices[activeServiceEditId] = { 
                ...editedServices[activeServiceEditId], 
                ...data 
            };
        } else {
            // Add new
            data.order = editedServices.length + 1;
            editedServices.push(data);
        }

        closeEditorModal('modal-service');
        renderServicesLiveGrid();
    };

    // --- Toggle Design Canvas Mode ---
    function toggleDesignMode() {
        isEditModeOn = !isEditModeOn;
        const btn = document.getElementById('btn-toggle-design');
        
        if (isEditModeOn) {
            document.body.classList.add('edit-mode-on');
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause Designing';
            btn.style.background = '#eab308'; // Amber yellow
            
            // Make contenteditable
            document.querySelectorAll('[data-edit-field]').forEach(el => {
                if (el.tagName !== 'IMG') {
                    el.title = "Double-click to inline edit text!";
                }
            });
        } else {
            document.body.classList.remove('edit-mode-on');
            btn.innerHTML = '<i class="fas fa-play"></i> Start Designing';
            btn.style.background = '#10b981'; // Emerald
            
            document.querySelectorAll('[data-edit-field]').forEach(el => {
                el.contentEditable = 'false';
                el.removeAttribute('title');
            });
        }

        // Re-render services grid with/without overlays
        renderServicesLiveGrid();
    }

    // --- Publish Transaction Sync to Firestore ---
    async function publishAllEdits() {
        const btn = document.getElementById('btn-publish-all');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
        btn.disabled = true;

        // Overlay block UI
        const pubOverlay = document.createElement('div');
        pubOverlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(12,12,15,0.9); z-index: 1000000;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            color:#fff; font-family:'Outfit',sans-serif; opacity:0; transition: opacity 0.3s ease;
        `;
        pubOverlay.innerHTML = `
            <div style="text-align:center">
                <i class="fas fa-cloud-upload-alt fa-fade" style="font-size:4rem; color:#8b5cf6; margin-bottom:20px"></i>
                <h2 style="font-weight:700; margin:0">Syncing Canvas with Firestore</h2>
                <p style="color:var(--editor-text-muted); font-size:0.95rem; margin-top:8px">Optimizing and publishing live blocks...</p>
            </div>
        `;
        document.body.appendChild(pubOverlay);
        setTimeout(() => pubOverlay.style.opacity = '1', 10);

        try {
            // 1. Save settings/profile
            await db.collection('settings').doc('profile').set(editedProfile, { merge: true });

            // 2. Save settings/general
            await db.collection('settings').doc('general').set(editedGeneral, { merge: true });

            // 3. Process services deletes
            if (window.deletedServicesTracker && window.deletedServicesTracker.length > 0) {
                const delPromises = window.deletedServicesTracker.map(id => db.collection('services').doc(id).delete());
                await Promise.all(delPromises);
                window.deletedServicesTracker = [];
            }

            // 4. Save/update active services
            const sPromises = editedServices.map(async (service) => {
                const sData = {
                    title: service.title,
                    description: service.description,
                    icon: service.icon,
                    iconColor: service.iconColor,
                    iconBg: service.iconBg,
                    linkColor: service.linkColor,
                    linkText: service.linkText,
                    linkUrl: service.linkUrl,
                    order: service.order,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (service.id) {
                    return db.collection('services').doc(service.id).update(sData);
                } else {
                    sData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    return db.collection('services').add(sData);
                }
            });
            await Promise.all(sPromises);

            // Refetch active services to populate fresh Firebase IDs
            const freshServicesSnap = await db.collection('services').orderBy('order', 'asc').get();
            editedServices = [];
            freshServicesSnap.forEach(doc => editedServices.push({ id: doc.id, ...doc.data() }));

            // SUCCESS SCREEN TRANSITION
            pubOverlay.innerHTML = `
                <div style="text-align:center; animation: scaleUp 0.5s ease forwards">
                    <i class="fas fa-check-circle" style="font-size:5rem; color:#10b981; margin-bottom:20px; filter: drop-shadow(0 0 15px rgba(16,185,129,0.3))"></i>
                    <h2 style="font-weight:800; margin:0">Publishing Complete!</h2>
                    <p style="color:#10b981; font-weight:700; margin-top:8px">Your portfolio homepage is 100% dynamic and live!</p>
                    <button class="editor-btn editor-btn-primary" onclick="window.location.reload()" style="margin:24px auto 0 auto; display:block; padding:10px 28px; background:#10b981">Wow, Awesome!</button>
                </div>
            `;
            
            // Celebrate!
            triggerConfetti();
        } catch (err) {
            console.error("Publishing error:", err);
            pubOverlay.innerHTML = `
                <div style="text-align:center">
                    <i class="fas fa-exclamation-triangle" style="font-size:5rem; color:#ef4444; margin-bottom:20px"></i>
                    <h2 style="font-weight:700; margin:0">Sync Failed</h2>
                    <p style="color:#ef4444; margin-top:8px">${escapeHTML(err.message)}</p>
                    <button class="editor-btn" onclick="this.closest('.pub-overlay').remove()" style="margin:24px auto 0 auto; display:block">Back to Canvas</button>
                </div>
            `;
            pubOverlay.className = 'pub-overlay';
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    }

    // --- Confetti particle engine ---
    function triggerConfetti() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10000001;';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });
        
        const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
        const particles = [];
        
        for (let i = 0; i < 160; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height - height,
                r: Math.random() * 5 + 3,
                d: Math.random() * width,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.08 + 0.03,
                tiltAngle: 0
            });
        }
        
        let animationId;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            let active = false;
            
            particles.forEach((p) => {
                p.tiltAngle += p.tiltAngleIncremental;
                p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2.2;
                p.x += Math.sin(p.tiltAngle) * 0.8;
                p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 4;
                
                if (p.y < height) active = true;
                
                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();
            });
            
            if (active) {
                animationId = requestAnimationFrame(draw);
            } else {
                canvas.remove();
            }
        }
        draw();
        setTimeout(() => {
            cancelAnimationFrame(animationId);
            canvas.remove();
        }, 5000);
    }

    // --- Exit and Reload Clean up ---
    function exitEditor() {
        if (confirm("Discard unsaved designs and exit editor?")) {
            window.location.href = 'admin.html';
        }
    }

    // --- HTML Escaper ---
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Attach all Listeners ---
    function initEditorListeners() {
        document.body.classList.add('live-editor-active');
        
        // Toolbar actions
        document.getElementById('btn-sidebar-toggle').addEventListener('click', openSeoSidebar);
        document.getElementById('btn-sidebar-close').addEventListener('click', closeSeoSidebar);
        document.getElementById('btn-toggle-design').addEventListener('click', toggleDesignMode);
        document.getElementById('btn-publish-all').addEventListener('click', publishAllEdits);
        document.getElementById('btn-exit-editor').addEventListener('click', exitEditor);

        // Sidebar input listeners
        ['inp-seo-title', 'inp-seo-desc', 'inp-seo-keywords', 'inp-seo-canonical', 'inp-seo-og-image'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateSeoGooglePreview);
        });

        ['inp-soc-whatsapp', 'inp-soc-instagram', 'inp-soc-youtube', 'inp-soc-tiktok', 'inp-soc-discord'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                editedGeneral[id.split('-').pop()] = document.getElementById(id).value.trim();
            });
        });

        // Typing roles modal launchers
        document.getElementById('btn-roles-modal').addEventListener('click', () => {
            renderRolesPills();
            openEditorModal('modal-roles');
        });
        document.getElementById('btn-add-role-chip').addEventListener('click', addRoleChip);
        document.getElementById('inp-new-role').addEventListener('keydown', e => {
            if (e.key === 'Enter') addRoleChip();
        });

        // Skills modal launchers
        document.getElementById('btn-skills-modal').addEventListener('click', () => {
            renderSkillsPills();
            openEditorModal('modal-skills');
        });
        document.getElementById('btn-add-skill-chip').addEventListener('click', addSkillChip);
        document.getElementById('inp-new-skill').addEventListener('keydown', e => {
            if (e.key === 'Enter') addSkillChip();
        });

        // Avatar Image Dialog triggering
        const triggerAvatarModal = (target) => {
            currentUploadTarget = target;
            document.getElementById('avatar-modal-title').textContent = `Upload & Compress Hero Avatar`;
            openEditorModal('modal-avatar');
        };

        const heroAvatar = document.getElementById('profile-avatar-hero');
        const aboutAvatar = document.getElementById('profile-avatar-about');

        if (heroAvatar) heroAvatar.addEventListener('click', () => triggerAvatarModal('avatar'));
        if (aboutAvatar) aboutAvatar.addEventListener('click', () => triggerAvatarModal('avatar'));

        // Avatar Dropzone binding
        const dropZone = document.getElementById('avatar-dropzone');
        const fileInput = document.getElementById('avatar-file-input');

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) handleAvatarCompression(e.target.files[0]);
        });

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
        });
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleAvatarCompression(e.dataTransfer.files[0]);
            }
        });

        // Avatar Quality Slider
        const slider = document.getElementById('avatar-quality-slider');
        slider.addEventListener('input', () => {
            document.getElementById('avatar-quality-val').textContent = Math.round(slider.value * 100) + '%';
        });
        slider.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                handleAvatarCompression(fileInput.files[0]);
            }
        });

        // Save avatar
        document.getElementById('btn-save-avatar').addEventListener('click', () => {
            if (!currentUploadedImageBase64) return;
            
            editedProfile.avatarBase64 = currentUploadedImageBase64;
            
            // Mirror inside document visually
            const heroAv = document.getElementById('profile-avatar-hero');
            const aboutAv = document.getElementById('profile-avatar-about');
            if (heroAv) heroAv.src = currentUploadedImageBase64;
            if (aboutAv) aboutAv.src = currentUploadedImageBase64;

            closeEditorModal('modal-avatar');
        });
    }

    // --- Bootstrapper Initialize Execution ---
    await loadEditorData();
    injectEditorUI();
    makeSectionsEditable();
    initEditorListeners();
    
    // Automatically start in design mode
    toggleDesignMode();
    console.log("Visual Editor initialized successfully!");
})();
