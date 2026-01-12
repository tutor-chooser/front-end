document.addEventListener("DOMContentLoaded", function () {
    /**
     * =============================================================================
     * CONFIGURATION & CONSTANTS
     * =============================================================================
     */
    const CONFIG = {
        URLS: {
            STRIPE_WORKER: "https://tc-staging-stripe.tutorchooser.workers.dev/create-checkout-session",
            FILE_UPLOAD_WORKER: "https://tc-staging-file-upload.tutorchooser.workers.dev/",
            MONDAY_API: "https://tc-stage.tutorchooser.workers.dev",
            PROFILE_WORKER: "https://tc-staging-profile.tutorchooser.workers.dev",
            COMPLETION_WORKER: "https://tc-staging-profile.tutorchooser.workers.dev/completion"
        },
        // Complete mapping of your Monday.com column IDs
        COLS: {
            name: "name", email: "contact_email", prefix: "dropdown_mks2rnhn",
            firstName: "text_mks2v0wr", feedbackHear: "dropdown_mks2hc7t",
            availability: "color_mksm37cz", surname: "text_mks291ad",
            tutorUniID: "pulse_id_mks21aqk", gender: "dropdown_mks2g6a1",
            nationality: "dropdown_mks2h1v", dob: "date_mks2kfh",
            locationDropdown: "dropdown_mkt62mw9", uaeMobile: "contact_phone",
            intPhone: "phone_mks26x7r", languageSpoke: "dropdown_mks2ydb8", planName: "text_mktk7zs4", planEnd: "date_mktkbpva",
            emerRelation: "text_mks2kgqt", emerName: "text_mks29dra", licenseVerify: "color_mks7z7ed",
            examBoard: "dropdown_mks2f11x", yearsExp: "dropdown_mks2wvvv", feePaid: "color_mkt99f6e", referralCodeUsed: "boolean_mkvens61",
            curriculum: "dropdown_mks2wq55", subjectsPre: "dropdown_mks2avkc",
            subjects2: "dropdown_mks2mfr1", subjects: "dropdown_mks2c2f5",
            tutorMode: "dropdown_mks2pwrd", providerType: "dropdown_mks2n8jv", qualType: "color_mkt0prm8",
            language: "dropdown_mks2wbq3", emirDate: "date_mks6g1ap",
            rate: "dropdown_mks22dtd", bio: "long_text_mks2gqar",
            linkedin: "link_mks2ssp5", tutorTime: "dropdown_mks2t029",
            pregen: "dropdown_mks22xm0", firstaid: "dropdown_mks2tewn", tutorIdV1: "text_mks2h45f",
            specialexp: "dropdown_mks2wz1v", negorate: "dropdown_mks29mz5",
            submitVerify: "color_mks2e3xx", approvalConfirm: "color_mks2rk9b",
            webcam: "dropdown_mks2zxm3", stableInternet: "dropdown_mks24eqc", referralValidStatus: "color_mkvq4nd4",
            onlineTool: "dropdown_mks2j616", privacyConsent: "color_mks2tsn2",
            marketingConsent: "color_mks2vefc", verifiedStatus: "color_mks24exj",
            earlyAdopterStatus: "color_mks2t0bh", progressPercent: "numeric_mks2r1s7",
            teachingLicenseFile: "file_mks2ekqg", qualificationsFile: "file_mks2nzg0",
            uaePoliceFile: "file_mks2vacv", emiratesIdFrontFile: "file_mks2qb9m",
            emiratesIdBackFile: "file_mks2knah", 
            emirID: "text_mks25drf" // Ensure this line is present and correct!
        },
        MONTHS: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    };

    /**
     * =============================================================================
     * STATE MANAGEMENT
     * =============================================================================
     */
    const State = {
        id: null,
        mondayData: {},
        currentPercent: 0,
        isDirty: false,
        files: {
            qualFiles: [],
            uaePoliceFiles: [],
            teachingLicenseFiles: []
        }
    };
    window.profileState = State; // Maintain global access for debugging

    /**
     * =============================================================================
     * UTILITIES & HELPERS
     * =============================================================================
     */
    const Utils = {
        getElement: (id) => document.getElementById(id),
        
        showMessage: (message, type = 'error', duration = 5000) => {
            const container = document.createElement('div');
            container.textContent = message;
            const colors = { success: '#28a745', info: '#17a2b8', error: '#dc3545' };
            
            Object.assign(container.style, {
                position: 'fixed', bottom: '20px', right: '20px', padding: '15px 25px',
                borderRadius: '8px', color: 'white', backgroundColor: colors[type] || colors.error,
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: '10000',
                transition: 'opacity 0.5s ease, transform 0.5s ease', opacity: '0',
                transform: 'translateY(20px)'
            });
            document.body.appendChild(container);
            
            setTimeout(() => { container.style.opacity = '1'; container.style.transform = 'translateY(0)'; }, 10);
            setTimeout(() => {
                container.style.opacity = '0'; container.style.transform = 'translateY(20px)';
                setTimeout(() => container.remove(), 500);
            }, duration);
        },

        parseServerFiles: (groupKey, fileData) => {
            if (!State.files[groupKey]) State.files[groupKey] = [];
            try {
                const parsed = typeof fileData === 'string' ? JSON.parse(fileData) : fileData;
                if (parsed?.files && Array.isArray(parsed.files)) {
                    const serverFiles = parsed.files.map(f => ({ ...f, name: f.name, isFromServer: true }));
                    State.files[groupKey].push(...serverFiles);
                    window[groupKey] = State.files[groupKey]; // Legacy support
                }
            } catch (e) { console.warn(`Could not parse files for ${groupKey}`, e); }
        },

        formatDateForMonday: (dateStr) => {
            const match = dateStr.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
            if (!match) return null;
            const [, dd, monthStr, year] = match;
            const monthIndex = CONFIG.MONTHS.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
            if (monthIndex < 0) return null;
            const mm = String(monthIndex + 1).padStart(2, '0');
            return `${year}-${mm}-${String(dd).padStart(2, '0')}`;
        },

        formatDateFromMonday: (isoDate) => {
            if (!isoDate) return "";
            const [yyyy, mm, dd] = isoDate.split('-');
            return `${parseInt(dd)} ${CONFIG.MONTHS[parseInt(mm) - 1]} ${yyyy}`;
        },

        formatPlanName: (raw) => {
            if (!raw) return 'N/A';
            const map = {
                'TUTOR_VERIFICATION_FEE': 'Tutor Verification Fee',
                'STARTER_MONTHLY': 'Tutor Starter (Monthly)',
                'STARTER_YEARLY': 'Tutor Starter (Yearly)',
                'PRO_MONTHLY': 'Tutor Pro (Monthly)',
                'PRO_YEARLY': 'Tutor Pro (Yearly)',
                'FREE_PLAN': 'Free Plan' 
            };
            return map[raw] || raw;
        }
    };

    /**
     * =============================================================================
     * API LAYER
     * =============================================================================
     */
    /**
     * =============================================================================
     * API LAYER (Fixed File Uploads)
     * =============================================================================
     */
    const API = {
        async getToken() { return await window.$memberstackDom.getMemberCookie(); },

        async callMonday(query, variables = {}) {
            const token = await API.getToken();
            const res = await fetch(CONFIG.URLS.MONDAY_API, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ query, variables })
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message);
            return json;
        },

        async getProfileData(itemId) {
            try {
                const query = `query MyItemsQuery($itemId: ID!) { items(ids: [$itemId]) { column_values { id, text, value } } }`;
                const raw = await API.callMonday(query, { itemId: String(itemId) });
                const vals = {};
                (raw?.data?.items?.[0]?.column_values || []).forEach(c => {
                    try { vals[c.id] = { text: c.text, value: c.value ? JSON.parse(c.value) : null }; } 
                    catch { vals[c.id] = { text: c.text, value: c.value }; }
                });
                return vals;
            } catch (error) {
                Utils.showMessage("Could not load profile. Please refresh.", 'error');
                return {};
            }
        },

        async getCompletion(itemId) {
            try {
                const token = await API.getToken();
                const res = await fetch(`${CONFIG.URLS.COMPLETION_WORKER}/${itemId}`, {
                    method: 'GET', headers: { 'Authorization': token }
                });
                return res.ok ? await res.json() : { tutorCompletion: 0 };
            } catch (e) { return { tutorCompletion: 0 }; }
        },

        async updateProfile(itemId, columnUpdates) {
            const token = await API.getToken();
            const res = await fetch(CONFIG.URLS.COMPLETION_WORKER, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ itemId: String(itemId), columnUpdates })
            });
            if (!res.ok) throw new Error("Update failed on server.");
            const json = await res.json();
            if (!json.success) throw new Error(json.message || "Update failed.");
            return json;
        },

        async uploadFiles(itemId) {
            const formData = new FormData();
            formData.append("ID-Number-Make", itemId);
            let hasFiles = false;

            // 1. Handle Standard File Inputs (Emirates ID)
            const appendInput = (selector, key) => {
                const el = document.querySelector(`${selector} input[type="file"], ${selector}`);
                if (el?.files?.[0]) { 
                    formData.append(key, el.files[0]); 
                    hasFiles = true; 
                }
            };

            appendInput("#Emirates-ID-Front", "Emirates-ID-Front");
            appendInput("#Emirates-ID-Back-2", "Emirates-ID-Back-2");

            // 2. Handle Multi-File Lists (Fix: Look at WINDOW object, not State)
            const groups = {
                "Qualification": window.qualFiles || [], 
                "UAE-Police": window.uaePoliceFiles || [],
                "Teaching-License": window.teachingLicenseFiles || [],
            };

            for (const [key, files] of Object.entries(groups)) {
                // Filter out files that are already on the server
                const newFiles = (files || []).filter(f => !f.isFromServer);
                
                if (newFiles.length) {
                    newFiles.forEach(f => {
                        formData.append(key, f);
                    });
                    hasFiles = true;
                }
            }

            if (!hasFiles) {
                console.log("No new files found to upload.");
                return { success: false, message: "No files." };
            }

            try {
                const token = await API.getToken();
                const res = await fetch(CONFIG.URLS.FILE_UPLOAD_WORKER, {
                    method: "POST", headers: { 'Authorization': token }, body: formData
                });
                if (!res.ok) throw new Error("Upload failed");
                return { success: true };
            } catch (err) {
                console.error("Upload Error:", err);
                return { success: false, error: err };
            }
        },

        async waitForMemberStackId() {
            for (let i = 0; i < 20; i++) {
                try {
                    const member = await window.$memberstackDom.getCurrentMember();
                    const id = String(member?.data?.customFields["tutor-id"] || "");
                    if (id) return id;
                } catch (e) { /* wait */ }
                await new Promise(r => setTimeout(r, 500));
            }
            return null;
        }
    };

    /**
     * =============================================================================
     * UI LAYER
     * =============================================================================
     */
/**
     * =============================================================================
     * UI LAYER
     * =============================================================================
     */
/**
     * =============================================================================
     * UI LAYER (DEBUG VERSION)
     * =============================================================================
     */
    /**
     * =============================================================================
     * UI LAYER (Fixed: No red lines on load)
     * =============================================================================
     */
    const UI = {
        dom: {
            pageLoader: document.getElementById("page-loader"),
            availabilityCheckbox: document.getElementById("Checkbox-3")
        },

        toggleLoader: (show) => {
            if (UI.dom.pageLoader) UI.dom.pageLoader.style.display = show ? 'flex' : 'none';
            document.body.classList.toggle("loading", show);
        },

        setField: (id, value) => {
            const el = Utils.getElement(id);
            if (!el || value == null) return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) el.value = value;
            else el.textContent = value || '-';
        },

        populateMultiSelect: (id, textValue, delim = ",") => {
            const el = Utils.getElement(id);
            if (!el || !textValue) return;
            const values = (typeof delim === 'string' ? textValue.split(delim) : textValue.split(delim))
                           .map(s => s.trim());
            Array.from(el.options).forEach(o => { o.selected = values.includes(o.text.trim()); });
            if (window.$ && $(el).hasClass('select2-hidden-accessible')) $(el).trigger('change');
        },

        renderFileList: (mondayVal, containerId) => {
            const container = Utils.getElement(containerId);
            if (!container) return;
            container.innerHTML = '';
            try {
                const parsed = typeof mondayVal === "string" ? JSON.parse(mondayVal) : mondayVal;
                if (parsed?.files?.length) {
                    parsed.files.forEach(f => {
                        const li = document.createElement("li");
                        li.className = "file-item";
                        li.textContent = f.name;
                        container.appendChild(li);
                    });
                }
            } catch (e) {}
            
            // REMOVED: The line that auto-invalidated empty lists on load.
            // Validation is now handled solely by the 'Submit' button logic.
        },

        updateCompletionBar: (percent = 0) => {
            State.currentPercent = percent;
            const bar = Utils.getElement("progress-bar");
            const label = Utils.getElement("progress-label");
            if (bar) bar.style.width = `${percent}%`;
            if (label) label.innerHTML = percent === 100 ? `🎉 Your profile is complete.` : `Profile Completion: <strong>${percent}%</strong>`;
            
            const banner = document.getElementById("submit-reminder-banner");
            const submitted = State.mondayData?.[CONFIG.COLS.submitVerify]?.text?.trim().toUpperCase();
            if (banner) banner.style.display = (percent === 100 && submitted !== "YES") ? "block" : "none";
        },

        updateReferralUI: (status) => {
            const validText = Utils.getElement("ref-valid");
            const codeInput = Utils.getElement("ref-code");
            if (!validText || !codeInput) return;

            if (!codeInput.value.trim()) {
                validText.style.display = 'none';
                codeInput.style.borderColor = '';
                return;
            }

            validText.style.display = 'inline-block';
            codeInput.style.borderWidth = "2px";
            codeInput.style.borderRadius = "50px";
            
            const isVal = status === "VALID";
            codeInput.style.borderColor = isVal ? "#28a745" : "#dc3545";
            validText.style.color = isVal ? "#28a745" : "#dc3545";
            validText.textContent = status ? status.toUpperCase() : "INVALID";
        },

        updatePricing: (data) => {
            const isEarly = data?.[CONFIG.COLS.earlyAdopterStatus]?.text?.toUpperCase() === 'YES';
            const isValidRef = data?.[CONFIG.COLS.referralValidStatus]?.text?.toUpperCase() === 'VALID';
            const hasRefCode = !!data?.[CONFIG.COLS.tutorIdV1]?.text;

            let prices = null;
            let badgeText = "";

            if (isEarly) {
                prices = { 'starter-monthly': '25', 'starter-yearly': '250', 'pro-monthly': '45', 'pro-yearly': '450' };
                badgeText = "Early Adopter Offer";
            } else if (hasRefCode && isValidRef) {
                prices = { 'starter-monthly': '36.75', 'starter-yearly': '367.50', 'pro-monthly': '66.75', 'pro-yearly': '667.50' };
                badgeText = "Referral Offer";
            }

            // Reset
            document.querySelectorAll('#purchase-subscription .tc-card[data-price]').forEach(card => {
                const p = card.querySelector('.tc-price');
                if (p) p.innerHTML = `<span class="amount">AED ${card.dataset.price}</span> <span class="per"></span>`;
            });

            if (prices) {
                document.querySelectorAll('#purchase-subscription .tc-card[data-price]').forEach(card => {
                    const plan = card.closest('.tc-plan')?.dataset.plan;
                    const cycle = card.dataset.cycle;
                    const newPrice = prices[`${plan}-${cycle}`];
                    
                    if (newPrice) {
                        const p = card.querySelector('.tc-price');
                        p.innerHTML = `
                            <div class="amount" style="display:flex;align-items:baseline;justify-content:center;gap:0.6rem;font-family:'Trajanpro',serif;">
                                <del style="opacity:0.6;font-size:1.2rem;color:var(--muted);">AED ${card.dataset.price}</del>
                                <span style="font-size:1.8rem;font-weight:800;color:var(--ink);">AED ${newPrice}</span>
                                <div class="badge" style="background-color:#d1e7dd;color:#0f5132;border-radius:99px;padding:.25rem .55rem;font-size:0.75rem;">${badgeText}</div>
                            </div>`;
                        const per = card.querySelector('.per');
                        if (per) per.style.display = 'none';
                    }
                });
            }
        },

        updateLockAndBadges: () => {
            const data = State.mondayData;
            
            // --- 1. DETERMINE STATUS ---
            const isVerified = data?.[CONFIG.COLS.verifiedStatus]?.text?.toUpperCase() === "VERIFIED";
            const submitted = data?.[CONFIG.COLS.submitVerify]?.text?.toUpperCase() === "YES";
            const locked = isVerified || submitted;

            // --- 2. LOCK INPUTS ---
            [Utils.getElement("verif-info-section-new"), Utils.getElement("submit-section")].forEach(sec => {
                if (sec) {
                    sec.classList.toggle("locked", locked);
                    sec.style.pointerEvents = locked ? "none" : "auto";
                    sec.style.opacity = locked ? "0.6" : "1";
                    sec.querySelectorAll("input, select, textarea").forEach(el => {
                        if (!el.classList.contains("select2-hidden-accessible")) el.disabled = locked;
                    });
                }
            });

            // --- 3. BADGES ---
            const show = (id, cond) => { const el = Utils.getElement(id); if (el) el.style.display = cond ? 'inline-block' : 'none'; };
            const qual = data?.[CONFIG.COLS.qualType]?.text?.trim();
            
            show("phd_badge", qual === "PHD");
            show("master_badge", qual === "Masters");
            show("degree_badge", qual === "Degree");
            show("under_badge", qual === "Undergraduate");
            show("verified-badge", isVerified);
            show("under-review-badge", submitted && !isVerified);
            show("early-badge", data?.[CONFIG.COLS.earlyAdopterStatus]?.text?.toUpperCase() === 'YES');
            show("locked-logo", locked);
            
            const licenseVerify = data?.[CONFIG.COLS.licenseVerify]?.text?.trim();
            show("license-badge", licenseVerify === "Verified by Bodruz");

            // --- 4. PLAN VISIBILITY LOGIC (STRICT) ---
            const planPurchase = Utils.getElement("plan-purchase");
            
            if (planPurchase) {
                const planName = (data?.[CONFIG.COLS.planName]?.text || "").toUpperCase();

                if (!isVerified) {
                    // CASE A: User is NOT verified -> HIDE
                    planPurchase.style.display = "none";
                } else {
                    // CASE B: User IS verified -> CHECK CURRENT PLAN
                    if (planName.includes("PRO")) {
                        // Already PRO -> HIDE (No upgrade path)
                        planPurchase.style.display = "none";
                    } 
                    else if (planName.includes("START") || planName.includes("FREE")) {
                        // STARTER or FREE -> SHOW (Allow upgrade to Pro)
                        // But hide the "Free" card since they already have it (or better)
                        planPurchase.style.display = "block";
                        const freeBox = document.querySelector('.tc-plan[data-plan="free"]');
                        if (freeBox) freeBox.style.display = "none";
                    } 
                    else {
                        // NO PLAN (but Verified) -> SHOW ALL options
                        planPurchase.style.display = "block";
                        const freeBox = document.querySelector('.tc-plan[data-plan="free"]');
                        if (freeBox) freeBox.style.display = "block"; 
                    }
                }
            }
        }
    };

    /**
     * =============================================================================
     * FORMS
     * =============================================================================
     */
/**
     * =============================================================================
     * FORMS (Updated Validation Logic)
     * =============================================================================
     */
    const Forms = {
        Parsers: {
            text: (el) => el.value.trim(),
            consent: (el) => el.value.trim(),
            link: (el) => {
                const val = el.value.trim();
                return val ? { url: val, text: val } : undefined;
            },
            date: (el, original) => {
                const formatted = Utils.formatDateForMonday(el.value);
                return (formatted && formatted !== original?.value?.date) ? { date: formatted } : undefined;
            },
            multiselect: (el, original) => {
                const initial = (original?.text || '').split(/, |,/ ).map(s => s.trim()).filter(Boolean).sort();
                const current = Array.from(el.selectedOptions).map(o => o.text.trim()).sort();
                return JSON.stringify(initial) !== JSON.stringify(current) ? { labels: current } : undefined;
            },
            phone: (el, original) => {
                const input = el.tagName === 'INPUT' ? el : document.querySelector(el.getAttribute('data-phone-sel'));
                if (!input) return undefined;
                const iti = window.intlTelInputGlobals?.getInstance(input);
                if (input.value.trim() && iti) {
                    if (!iti.isValidNumber()) throw new Error("Invalid phone number.");
                    const cur = iti.getNumber(intlTelInputUtils.numberFormat.E164);
                    const init = (original?.text || "").match(/\+\d+/)?.[0] || "";
                    if (cur !== init) return `${cur} ${iti.getSelectedCountryData().iso2.toUpperCase()}`;
                }
                return undefined;
            }
        },

        async getChanges(mappings) {
            const updates = {};
            for (const map of mappings) {
                const el = Utils.getElement(map.domId);
                if (!el) continue;
                if (map.type === 'link') {
                    const parsed = Forms.Parsers.link(el);
                    const init = State.mondayData[map.mondayId]?.value?.url || "";
                    if (parsed && parsed.url !== init) updates[map.mondayId] = parsed;
                    continue;
                }
                try {
                    const parser = Forms.Parsers[map.type] || Forms.Parsers.text;
                    const val = parser(el, State.mondayData[map.mondayId]);
                    if (['text', 'consent'].includes(map.type)) {
                         if (val !== (State.mondayData[map.mondayId]?.text || "")) updates[map.mondayId] = val;
                    } else if (val !== undefined) {
                        updates[map.mondayId] = val;
                    }
                } catch (e) { return { error: e.message }; }
            }
            return { updates };
        },

        setupSave: (btnId, mappings, successMsg) => {
            const btn = Utils.getElement(btnId);
            if (!btn) return;
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                btn.disabled = true; btn.textContent = "Saving...";
                UI.toggleLoader(true);
                try {
                    const { updates, error } = await Forms.getChanges(mappings);
                    if (error) throw new Error(error);
                    
                    if (btnId === "save-profile-basic" && (updates[CONFIG.COLS.firstName] || updates[CONFIG.COLS.surname])) {
                        const f = Utils.getElement("First-name")?.value || "";
                        const l = Utils.getElement("Last-name")?.value || "";
                        updates[CONFIG.COLS.name] = `${f} ${l}`.trim();
                    }

                    if (Object.keys(updates).length > 0) {
                        const res = await API.updateProfile(State.id, updates);
                        State.mondayData = await API.getProfileData(State.id);
                        UI.updateCompletionBar(res.tutorCompletion);
                        UI.updateLockAndBadges();
                        Utils.showMessage(successMsg, 'success');

                        if (updates[CONFIG.COLS.tutorIdV1]) {
                            Utils.showMessage("Validating referral code...", 'info', 6000);
                            setTimeout(async () => {
                                State.mondayData = await API.getProfileData(State.id);
                                UI.updateReferralUI(State.mondayData[CONFIG.COLS.referralValidStatus]?.text);
                                UI.updatePricing(State.mondayData);
                            }, 6000);
                        }
                    } else {
                        Utils.showMessage("No changes detected.", 'info');
                    }
                } catch (err) { Utils.showMessage(err.message, 'error'); }
                finally { btn.disabled = false; btn.textContent = "Save Changes"; UI.toggleLoader(false); }
            });
        },
        
        validateVerify: () => {
            const required = [
                            // Existing Fields
                            '#First-name', '#Last-name', '#location-address-new', '#gender', '#prefix', 
                            '#how-hear', '#nationality', '#lang-spoke', '#dob', '#uae-phone-4', '#tutor-mode', 
                            '#bio', '#tutor-time-pre', '#first-aid', '#tutor-rate', '#consent-terms', '#emirID',
                            '#qual-files', '#uae-police-files',
                            
                            // NEW FIELDS
                            '#student-gen',      
                            '#provider-2',       
                            '#lang-teach',       
                            '#online-tools',     
                            '#internet-stable',  
                            '#webcam',           
                            '#special-exp',       // <--- Now explicitly checked
                            '#consent-mark'      
                        ];
                        
            let firstFail = null;
            let count = 0;
            required.forEach(sel => {
                const el = document.querySelector(sel);
                if (!el) return;
                let valid = false;
                if (el.tagName === 'SELECT') valid = !!el.value;
                else if (el.id.includes('files')) valid = el.children.length > 0;
                else valid = !!el.value.trim();

                if (el.classList.contains("select2-hidden-accessible")) {
                     const s2 = el.nextElementSibling?.querySelector('.select2-selection');
                     if(s2) s2.classList.toggle('tc-invalid', !valid);
                } else {
                    el.classList.toggle('tc-invalid', !valid);
                }
                if (!valid) { count++; if (!firstFail) firstFail = el; }
            });
            if (firstFail) {
                firstFail.scrollIntoView({behavior:'smooth',block:'center'});
                Utils.showMessage(`Please complete ${count} missing fields.`, 'error');
                return false;
            }
            return true;
        }
    };

    /**
     * =============================================================================
     * MAIN
     * =============================================================================
     */
/**
     * =============================================================================
     * MAIN INITIALIZATION
     * =============================================================================
     */
    async function init() {
        UI.toggleLoader(true);
        const id = await API.waitForMemberStackId();
        if (!id) { Utils.showMessage("User ID not found.", "error"); return; }
        State.id = id;

        const [data, completion] = await Promise.all([API.getProfileData(id), API.getCompletion(id)]);
        State.mondayData = data;

        // -- POPULATE FIELDS --
        const f = UI.setField;
        const d = data;
        const C = CONFIG.COLS;
        
        f("prefix", d[C.prefix]?.text); f("First-name", d[C.firstName]?.text); f("Last-name", d[C.surname]?.text);
        f("gender", d[C.gender]?.text); f("how-hear", d[C.feedbackHear]?.text); f("url-ln", d[C.linkedin]?.value?.url);
        f("location-address-new", d[C.locationDropdown]?.text); f("dob", Utils.formatDateFromMonday(d[C.dob]?.value?.date));
        f("uae-phone-4", d[C.uaeMobile]?.text); f("int-phone-4", d[C.intPhone]?.text);
        f("Emergency-Relation", d[C.emerRelation]?.text); f("Emergency-Name", d[C.emerName]?.text);
        f("emer-phone-3", d[C.emerPhone]?.text); f("tutor-mode", d[C.tutorMode]?.text); f("provider-2", d[C.providerType]?.text);
        f("first-aid", d[C.firstaid]?.text); f("bio", d[C.bio]?.text); f("student-gen", d[C.pregen]?.text);
        f("tutor-rate", d[C.rate]?.text); f("rate-nego", d[C.negorate]?.text); f("emirID", d[C.emirID]?.text);
        f("years-exp", d[C.yearsExp]?.text); f("webcam", d[C.webcam]?.text); f("internet-stable", d[C.stableInternet]?.text);
        f("consent-terms", d[C.privacyConsent]?.text); f("consent-mark", d[C.marketingConsent]?.text);
        f("emir-date", Utils.formatDateFromMonday(d[C.emirDate]?.value?.date));
        f("ref-code", d[C.tutorIdV1]?.text);
        
        const approvalCheck = Utils.getElement("approval-check");
        if (approvalCheck) approvalCheck.checked = (d[C.approvalConfirm]?.text?.trim().toUpperCase() === "YES");

        UI.populateMultiSelect("nationality", d[C.nationality]?.text, ", ");
        UI.populateMultiSelect("lang-spoke", d[C.languageSpoke]?.text, ", ");
        UI.populateMultiSelect("tutor-time-pre", d[C.tutorTime]?.text, /,\s(?=[A-Z])/);
        UI.populateMultiSelect("lang-teach", d[C.language]?.text, ", ");
        UI.populateMultiSelect("special-exp", d[C.specialexp]?.text, ", ");
        UI.populateMultiSelect("subject-col-1618", d[C.subjects]?.text, ", ");
        UI.populateMultiSelect("Multiple[]-2", d[C.subjectsPre]?.text, ", ");
        UI.populateMultiSelect("subject-sec-1115", d[C.subjects2]?.text, ", ");
        UI.populateMultiSelect("exam-board", d[C.examBoard]?.text, ", ");
        UI.populateMultiSelect("curriculum", d[C.curriculum]?.text, ", ");
        UI.populateMultiSelect("online-tools", d[C.onlineTool]?.text, ", ");

        UI.renderFileList(d[C.qualificationsFile]?.value, "qual-files");
        UI.renderFileList(d[C.uaePoliceFile]?.value, "uae-police-files");
        UI.renderFileList(d[C.teachingLicenseFile]?.value, "teaching-license-files");
        UI.renderFileList(d[C.emiratesIdFrontFile]?.value, "emirates-front-files");
        UI.renderFileList(d[C.emiratesIdBackFile]?.value, "emirates-back-files");
        
        Utils.parseServerFiles('qualFiles', d[C.qualificationsFile]?.value);
        Utils.parseServerFiles('uaePoliceFiles', d[C.uaePoliceFile]?.value);
        Utils.parseServerFiles('teachingLicenseFiles', d[C.teachingLicenseFile]?.value);

        // -- INIT UI STATES --
        UI.updateCompletionBar(completion.tutorCompletion);
        UI.updateLockAndBadges();
        UI.updatePricing(data);
        UI.updateReferralUI(d[C.referralValidStatus]?.text);

        if (UI.dom.availabilityCheckbox) {
            UI.dom.availabilityCheckbox.checked = d[C.availability]?.text?.trim() === "Unavailable";
            UI.dom.availabilityCheckbox.addEventListener("change", async () => {
                const status = UI.dom.availabilityCheckbox.checked ? "Unavailable" : "Available";
                try {
                    await API.updateProfile(State.id, { [C.availability]: status });
                    Utils.showMessage(`Status: ${status}`, 'success');
                } catch(e) { Utils.showMessage("Failed to update status", 'error'); }
            });
        }

        // -- MAPPINGS & SAVES --
        Forms.setupSave("save-profile-basic", [
            { domId: "First-name", mondayId: C.firstName, type: 'text' }, { domId: "Last-name", mondayId: C.surname, type: 'text' },
            { domId: "prefix", mondayId: C.prefix, type: 'text' }, { domId: "gender", mondayId: C.gender, type: 'text' },
            { domId: "how-hear", mondayId: C.feedbackHear, type: 'text' }, { domId: "url-ln", mondayId: C.linkedin, type: 'link' },
            { domId: "location-address-new", mondayId: C.locationDropdown, type: 'text' }, { domId: "dob", mondayId: C.dob, type: 'date' },
            { domId: "uae-phone-4", mondayId: C.uaeMobile, type: 'phone', phoneElementSelector: '#uae-phone-4' },
            { domId: "int-phone-4", mondayId: C.intPhone, type: 'phone', phoneElementSelector: '#int-phone-4' },
            { domId: "nationality", mondayId: C.nationality, type: 'multiselect' }, { domId: "lang-spoke", mondayId: C.languageSpoke, type: 'multiselect' },
            { domId: "ref-code", mondayId: C.tutorIdV1, type: 'text' }
        ], "Personal Info Saved!");

        Forms.setupSave("save-profile-teacher", [
            { domId: "tutor-mode", mondayId: C.tutorMode, type: 'text' }, { domId: "provider-2", mondayId: C.providerType, type: 'text' },
            { domId: "first-aid", mondayId: C.firstaid, type: 'text' }, { domId: "bio", mondayId: C.bio, type: 'text' },
            { domId: "student-gen", mondayId: C.pregen, type: 'text' }, { domId: "tutor-rate", mondayId: C.rate, type: 'text' },
            { domId: "rate-nego", mondayId: C.negorate, type: 'text' }, { domId: "tutor-time-pre", mondayId: C.tutorTime, type: 'multiselect' },
            { domId: "lang-teach", mondayId: C.language, type: 'multiselect' }, { domId: "special-exp", mondayId: C.specialexp, type: 'multiselect' }
        ], "Teaching Info Saved!");

        Forms.setupSave("save-profile-emer", [
            { domId: "Emergency-Relation", mondayId: C.emerRelation, type: 'text' },
            { domId: "Emergency-Name", mondayId: C.emerName, type: 'text' },
            { domId: "emer-phone-3", mondayId: C.emerPhone, type: 'phone', phoneElementSelector: '#emer-phone-3' }
        ], "Emergency Info Saved!");

        Forms.setupSave("save-profile-tech", [
             { domId: "internet-stable", mondayId: C.stableInternet, type: 'text' }, { domId: "webcam", mondayId: C.webcam, type: 'text' },
             { domId: "online-tools", mondayId: C.onlineTool, type: 'multiselect' }
        ], "Tech Info Saved!");

        Forms.setupSave("save-profile-consent", [
            { domId: "consent-terms", mondayId: C.privacyConsent, type: 'consent' }, { domId: "consent-mark", mondayId: C.marketingConsent, type: 'consent' }
        ], "Consent Saved!");

        // -- SAVE ID BUTTON (Special Logic) --
        const saveIdBtn = Utils.getElement("save-profile-id");
        if (saveIdBtn) {
            saveIdBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                const chk = Utils.getElement("approval-check");
                if (!chk?.checked) return Utils.showMessage("Please tick the confirmation box.", 'error');
                
                UI.toggleLoader(true);
                try {
                    const uploadRes = await API.uploadFiles(State.id);
                    const { updates } = await Forms.getChanges([
                        { domId: "emirID", mondayId: C.emirID, type: 'text' }, { domId: "emir-date", mondayId: C.emirDate, type: 'date' },
                        { domId: "years-exp", mondayId: C.yearsExp, type: 'text' }, { domId: "subject-col-1618", mondayId: C.subjects, type: 'multiselect'},
                        { domId: "Multiple[]-2", mondayId: C.subjectsPre, type: 'multiselect'}, { domId: "subject-sec-1115", mondayId: C.subjects2, type: 'multiselect'},
                        { domId: "exam-board", mondayId: C.examBoard, type: 'multiselect'}, { domId: "curriculum", mondayId: C.curriculum, type: 'multiselect'}
                    ]);
                    
                    updates[C.approvalConfirm] = "Yes";
                    if (Object.keys(updates).length > 0) await API.updateProfile(State.id, updates);

                    if (uploadRes.success) {
                        Utils.showMessage("Files uploaded. Reloading...", 'success');
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        Utils.showMessage("Identity Info Saved.", 'success');
                        UI.toggleLoader(false);
                        State.mondayData = await API.getProfileData(State.id); // refresh
                        UI.updateCompletionBar((await API.getCompletion(State.id)).tutorCompletion);
                        UI.updateLockAndBadges();
                    }
                } catch(err) {
                    Utils.showMessage("Error saving ID info.", 'error');
                    UI.toggleLoader(false);
                }
            });
        }

        // -- SUBMIT VERIFY BUTTON --
        const verifyBtn = Utils.getElement("submit-new");
        if (verifyBtn) {
            verifyBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                verifyBtn.textContent = "Checking...";
                const comp = await API.getCompletion(State.id);
                if (comp.tutorCompletion < 100) {
                    Forms.validateVerify();
                    verifyBtn.textContent = "Submit Profile";
                    return;
                }
                
                // Simplified Payment/Submit flow
                const paid = State.mondayData?.[C.feePaid]?.text?.toUpperCase() === "YES";
                const doSubmit = async () => {
                    verifyBtn.textContent = "Processing...";
                    try {
                        const token = await API.getToken();
                        const res = await fetch(CONFIG.URLS.STRIPE_WORKER, {
                            method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ tutorId: State.id })
                        });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                        else if (d.success) { Utils.showMessage("Submitted!", 'success'); setTimeout(() => location.reload(), 2000); }
                    } catch(e) { Utils.showMessage(e.message, 'error'); }
                };

                // Trigger Modal
                const modalId = paid ? 'resubmit-confirm' : 'payment-confirm';
                const banner = document.getElementById(`${modalId}-banner`);
                const overlay = document.getElementById(`${modalId}-overlay`);
                if (banner && overlay) {
                    overlay.style.display = 'block'; banner.style.display = 'flex';
                    banner.classList.add('visible'); overlay.classList.add('visible');
                    const confirm = banner.querySelector('button[id^="confirm-"]');
                    const cancel = banner.querySelector('button[id^="cancel-"]');
                    confirm.onclick = () => { overlay.style.display='none'; doSubmit(); };
                    cancel.onclick = () => { overlay.style.display='none'; verifyBtn.textContent = "Submit Profile"; };
                } else { doSubmit(); } 
            });
        }

        // -- STRIPE BUTTONS --
        const setupStripe = (id, type) => {
            const b = Utils.getElement(id);
            if(b) b.addEventListener("click", async () => {
                b.textContent = "Processing..."; b.disabled = true;
                try {
                    const token = await API.getToken();
                    const res = await fetch(CONFIG.URLS.STRIPE_WORKER, {
                        method: "POST", headers: {Authorization:`Bearer ${token}`, "Content-Type":"application/json"},
                        body: JSON.stringify({paymentType: type})
                    });
                    const d = await res.json();
                    if(d.url) window.location.href = d.url;
                    else if(d.success) location.reload();
                    else throw new Error("Failed");
                } catch(e) { Utils.showMessage(e.message,'error'); b.disabled=false; }
            });
        };
        setupStripe("btn-free-select", "FREE_PLAN");
        setupStripe("btn-pro-yearly", "PRO_YEARLY");
        setupStripe("btn-pro-monthly", "PRO_MONTHLY");

        // -- LIVE VALIDATION CLEARING (Fixes stuck red boxes) --
        const removeError = (e) => {
            const el = e.target;
            if (el.classList.contains('tc-invalid')) el.classList.remove('tc-invalid');
            if (el.classList.contains('select2-hidden-accessible')) {
                const s2 = el.nextElementSibling?.querySelector('.select2-selection');
                if(s2) s2.classList.remove('tc-invalid');
            }
        };
        document.body.addEventListener('input', removeError);
        document.body.addEventListener('change', removeError);
        // Special hook for Select2 via jQuery if available
        if (window.jQuery) {
            window.jQuery(document.body).on('select2:select', function(e) {
                removeError({ target: e.target });
            });
        }

        // -- FINAL CLEANUP --
        if (window.location.search.includes("status=success")) Utils.showMessage("Payment successful!", 'success');
        UI.toggleLoader(false);
    }

    init();
});