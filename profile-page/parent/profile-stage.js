document.addEventListener("DOMContentLoaded", async function () {
    // --- 1. CONFIGURATION & STATE ---
    const MONDAY_BOARD_ID = "2029696190";

    const columnIds = {
        name: "name",
        email: "contact_email",
        prefix: "dropdown_mks2rnhn",
        firstName: "text_mks2v0wr",
        feedbackHear: "dropdown_mks2hc7t",
        surname: "text_mks291ad",
        tutorUniID: "pulse_id_mks21aqk",
        gender: "dropdown_mks2g6a1",
        location: "location_mks290k5",
        locationDropdown: "dropdown_mkt62mw9",
        uaeMobile: "contact_phone",
        approvalConfirm: "color_mks2rk9b",
        privacyConsent: "color_mks2tsn2",
        marketingConsent: "color_mks2vefc",
        earlyAdopterStatus: "color_mks2t0bh", 
        referralCode: "text_mks2h45f", 
        referralValidStatus: "color_mkvq4nd4",
        progressPercent: "numeric_mks2r1s7",
    };

    window.profileState = {
        mondayData: {},
        currentPercent: 0,
        isDirty: false
    };

    const dom = {
        body: document.body,
        pageLoader: document.getElementById("page-loader"),
        saveProfileBasicBtn: document.getElementById("save-profile-basic"),
        // REMOVED: saveConsentBtn
    };

    // --- 2. HELPER & API FUNCTIONS ---
    function updateReferralStatusUI(status) {
        const validText = document.getElementById("ref-valid");
        const codeInput = document.getElementById("ref-code");
        if (!validText || !codeInput) return;
        if (codeInput.value.trim() === '') {
            validText.style.display = 'none';
            codeInput.style.borderColor = '';
            codeInput.style.borderWidth = '';
            codeInput.style.borderRadius = '';
            return;
        }
        validText.style.display = '';
        const lighterGreen = "#28a745";
        const lighterRed = "#dc3545";
        codeInput.style.borderWidth = "2px";
        codeInput.style.borderStyle = "solid";
        codeInput.style.borderRadius = "50px";
        validText.style.backgroundColor = 'transparent';
        validText.style.padding = '0 0 0 8px';
        const currentStatus = status ? status.toUpperCase() : "INVALID";
        validText.textContent = currentStatus;
        if (currentStatus === "VALID") {
            codeInput.style.borderColor = lighterGreen;
            validText.style.color = lighterGreen;
        } else {
            codeInput.style.borderColor = lighterRed;
            validText.style.color = lighterRed;
        }
    }

    function showUIMessage(message, type = 'error', duration = 5000) {
        const messageContainer = document.createElement('div');
        messageContainer.textContent = message;
        let backgroundColor = '#dc3545';
        if (type === 'success') backgroundColor = '#28a745';
        if (type === 'info') backgroundColor = '#17a2b8';
        Object.assign(messageContainer.style, {
            position: 'fixed', bottom: '20px', right: '20px', padding: '15px 25px',
            borderRadius: '8px', color: 'white', backgroundColor, boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: '10000', transition: 'opacity 0.5s ease, transform 0.5s ease', opacity: '0',
            transform: 'translateY(20px)'
        });
        document.body.appendChild(messageContainer);
        setTimeout(() => {
            messageContainer.style.opacity = '1';
            messageContainer.style.transform = 'translateY(0)';
        }, 10);
        setTimeout(() => {
            messageContainer.style.opacity = '0';
            messageContainer.style.transform = 'translateY(20px)';
            setTimeout(() => messageContainer.remove(), 500);
        }, duration);
    }

    async function mondayApiCall(query, variables = {}) {
        const payload = { query, variables };
        try {
            const token = await window.$memberstackDom.getMemberCookie();
            const res = await fetch("https://tc-stage.tutorchooser.workers.dev", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message || "Unknown GraphQL error.");
            return json;
        } catch (error) {
            console.error("❌ Monday API call failed:", error);
            throw error;
        }
    }

    async function getCompletionPercentage(itemId) {
        try {
            const token = await window.$memberstackDom.getMemberCookie();
            const res = await fetch(`https://tc-staging-profile.tutorchooser.workers.dev/completion/${itemId}`, {
                method: 'GET',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error(`Server error on completion endpoint: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error("❌ Could not fetch completion percentage:", error);
            showUIMessage("Could not retrieve profile completion status.", "error");
            return { parentCompletion: 0 };
        }
    }

    async function updateColumnsAndGetCompletion(itemId, columnUpdates) {
        const payload = { itemId: String(itemId), columnUpdates };
        try {
            const token = await window.$memberstackDom.getMemberCookie();
            const res = await fetch("https://tc-staging-profile.tutorchooser.workers.dev/completion", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Server error on update/completion endpoint: ${res.status}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message || "The update failed on the server.");
            return json;
        } catch (error) {
            console.error("❌ Update and Get Completion call failed:", error);
            throw error;
        }
    }

    window.getAllValues = async function (itemId) {
        try {
            const query = `query MyItemsQuery($itemId: ID!) { items(ids: [$itemId]) { column_values { id, text, value } } }`;
            const raw = await mondayApiCall(query, { itemId: String(itemId) });
            const vals = {};
            (raw?.data?.items?.[0]?.column_values || []).forEach(c => {
                try {
                    vals[c.id] = { text: c.text, value: c.value ? JSON.parse(c.value) : null };
                } catch {
                    vals[c.id] = { text: c.text, value: c.value };
                }
            });
            return vals;
        } catch (error) {
            showUIMessage("Could not load profile. Please refresh.", 'error', 8000);
            if(dom.pageLoader) dom.pageLoader.innerText = "Error loading profile. Please refresh.";
            return {};
        }
    };
    
    function updateCompletionUI(percent) {
        if (isNaN(percent)) percent = 0;
        window.profileState.currentPercent = percent;
        const isComplete = percent === 100;
        const reminderBanner = document.getElementById("submit-reminder-banner");
        if (reminderBanner) reminderBanner.style.display = isComplete ? "block" : "none";
        document.querySelectorAll(".overview_show_prod").forEach(el => {
            el.style.display = isComplete ? "none" : "block";
        });
        ["message-uncomplete", "message-uncomplete-head"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = isComplete ? "none" : "block";
        });
        const progressBar = document.getElementById("progress-bar");
        const progressLabel = document.getElementById("progress-label");
        const progressTooltip = document.getElementById("progress-tooltip");
        if (progressBar) progressBar.style.width = percent + "%";
        if (progressLabel) progressLabel.innerHTML = (percent === 100) ? `🎉 Your profile is complete.` : `Profile Completion: <strong>${percent}%</strong>`;
        if (progressTooltip) progressTooltip.textContent = (percent === 100) ? "✅ All fields complete!" : "To improve your score, please ensure all sections of your profile are filled out.";
    }

    async function buildChangedDataPayload(fieldMappings) {
        const updates = {};
        let error = null;
        const initialData = window.profileState.mondayData;
        if (!initialData) return { updates: {}, error: "Initial data not loaded." };
        for (const field of fieldMappings) {
            const { domId, mondayId, type, phoneElementSelector } = field;
            const element = document.getElementById(domId);
            if (!element) continue;
            const initialValueText = initialData[mondayId]?.text || "";
            let payloadValue;
            switch (type) {
                case 'text': case 'consent':
                    if (element.value.trim() !== initialValueText) payloadValue = element.value.trim();
                    break;
                case 'email':
                    if (element.value.trim() && element.value.trim() !== initialData[mondayId]?.value?.email) {
                        payloadValue = { email: element.value.trim(), text: element.value.trim() };
                    }
                    break;
                case 'phone':
                    const phoneInput = document.querySelector(phoneElementSelector);
                    if (!phoneInput) break;
                    const iti = phoneInput._iti;
                    if (phoneInput.value.trim() !== "" && iti && !iti.isValidNumber()) {
                        error = "The UAE Mobile number you entered is not valid. Please check it and try again.";
                    } else if (iti && iti.isValidNumber()) {
                        const currentNumberE164 = iti.getNumber(intlTelInputUtils.numberFormat.E164);
                        const initialNumberMatch = initialValueText.match(/\+\d+/);
                        const initialNumberE164 = initialNumberMatch ? initialNumberMatch[0] : "";
                        const isDirty = element.classList.contains('is-dirty');
                        if (isDirty || currentNumberE164 !== initialNumberE164) {
                            payloadValue = `${currentNumberE164} ${iti.getSelectedCountryData().iso2.toUpperCase()}`;
                        }
                    }
                    break;
            }
            if (error) break;
            if (payloadValue !== undefined) updates[mondayId] = payloadValue;
        }
        return { updates, error };
    }

    function setFieldValue(id, value) {
        const el = document.getElementById(id);
        if (el && value != null) el.value = value;
    }

    async function waitForId(maxRetries = 20, delay = 500) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const member = await window.$memberstackDom.getCurrentMember();
                const id = String(member?.data?.customFields["tutor-id"] || "");
                if (id) return id;
            } catch {}
            await new Promise(r => setTimeout(r, delay));
        }
        showUIMessage("Could not identify your profile. Please refresh.", "error", 10000);
        return null;
    }

    // --- 4. EVENT HANDLERS & INITIALIZATION ---
    async function initializeProfile() {
        dom.body.classList.add("loading");
        if (dom.pageLoader) dom.pageLoader.style.display = 'flex';
        const id = await waitForId();
        if (!id) return;
        window.profileState.id = id;
        const [vals, completionData] = await Promise.all([
            window.getAllValues(id),
            getCompletionPercentage(id)
        ]);
        if (Object.keys(vals).length === 0) return;
        window.profileState.mondayData = vals;
        setFieldValue("prefix", vals[columnIds.prefix]?.text);
        setFieldValue("First-name", vals[columnIds.firstName]?.text);
        setFieldValue("Last-name", vals[columnIds.surname]?.text);
        setFieldValue("gender", vals[columnIds.gender]?.text);
        setFieldValue("how-hear", vals[columnIds.feedbackHear]?.text);
        setFieldValue("location-address-new", vals[columnIds.locationDropdown]?.text);
        setFieldValue("uae-phone-4", vals[columnIds.uaeMobile]?.text);
        setFieldValue("tutor-uni-id", vals[columnIds.tutorUniID]?.text);
        setFieldValue("consent-terms", vals[columnIds.privacyConsent]?.text);
        setFieldValue("consent-mark", vals[columnIds.marketingConsent]?.text);
        
        const referralCode = vals[columnIds.referralCode]?.text || "";
        const referralStatus = vals[columnIds.referralValidStatus]?.text;
        const codeInput = document.getElementById("ref-code");
        if (codeInput) {
            codeInput.value = referralCode;
        }
        updateReferralStatusUI(referralStatus);
        updateCompletionUI(completionData.parentCompletion);

        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('input', () => { window.profileState.isDirty = true; });
        });

        if (dom.pageLoader) dom.pageLoader.style.display = "none";
        dom.body.classList.remove("loading");
    }

    if (dom.saveProfileBasicBtn) {
        dom.saveProfileBasicBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const saveButton = e.target;
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            if (dom.pageLoader) dom.pageLoader.style.display = 'flex';
            try {
                const fieldMappings = [
                    { domId: "prefix", mondayId: columnIds.prefix, type: 'text' },
                    { domId: "First-name", mondayId: columnIds.firstName, type: 'text' },
                    { domId: "Last-name", mondayId: columnIds.surname, type: 'text' },
                    { domId: "gender", mondayId: columnIds.gender, type: 'text' },
                    { domId: "how-hear", mondayId: columnIds.feedbackHear, type: 'text' },
                    { domId: "location-address-new", mondayId: columnIds.locationDropdown, type: 'text' },
                    { domId: "uae-phone-4", mondayId: columnIds.uaeMobile, type: 'phone', phoneElementSelector: '#uae-phone-4' },
                    { domId: "ref-code", mondayId: columnIds.referralCode, type: 'text' },
                    // ADDED: Consent fields are now saved with this button
                    { domId: "consent-terms", mondayId: columnIds.privacyConsent, type: 'consent' },
                    { domId: "consent-mark", mondayId: columnIds.marketingConsent, type: 'consent' }
                ];
                const { updates, error } = await buildChangedDataPayload(fieldMappings);
                if (error) {
                    showUIMessage(error, 'error');
                    return;
                }
                if (updates.hasOwnProperty(columnIds.firstName) || updates.hasOwnProperty(columnIds.surname)) {
                    const firstName = document.getElementById("First-name")?.value || window.profileState.mondayData[columnIds.firstName]?.text || "";
                    const surname = document.getElementById("Last-name")?.value || window.profileState.mondayData[columnIds.surname]?.text || "";
                    updates[columnIds.name] = `${firstName} ${surname}`;
                }
                if (Object.keys(updates).length > 0) {
                    const result = await updateColumnsAndGetCompletion(window.profileState.id, updates);
                    showUIMessage("Profile saved successfully!", 'success'); // Updated message
                    window.profileState.isDirty = false;
                    await updateMemberstackFields(document.getElementById("First-name")?.value.trim(), document.getElementById("Last-name")?.value.trim());
                    updateCompletionUI(result.parentCompletion);
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Changes';
                    if (dom.pageLoader) dom.pageLoader.style.display = 'none';
                    if (updates.hasOwnProperty(columnIds.referralCode)) {
                        showUIMessage("Checking referral code status...", 'info', 6000);
                        setTimeout(async () => {
                            const latestData = await getAllValues(window.profileState.id);
                            window.profileState.mondayData = latestData;
                            const newReferralStatus = latestData[columnIds.referralValidStatus]?.text;
                            updateReferralStatusUI(newReferralStatus);
                        }, 6000);
                    }
                } else {
                    showUIMessage("No changes detected.", 'info');
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Changes';
                    if (dom.pageLoader) dom.pageLoader.style.display = 'none';
                }
            } catch (err) {
                showUIMessage(`Failed to save profile: ${err.message}`, 'error'); // Updated message
            } finally {
                if (!saveButton.disabled) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Changes';
                    if (dom.pageLoader) dom.pageLoader.style.display = 'none';
                }
            }
        });
    }

    // REMOVED: The entire event listener for saveConsentBtn is gone.

    // --- MODAL & NAVIGATION BLOCKING ---
    function showIncompleteBanner() {
        const banner = document.getElementById("incomplete-banner");
        const overlay = document.getElementById("modal-overlay");
        if (banner && overlay) {
            overlay.style.display = "block";
            banner.style.display = "flex";
            requestAnimationFrame(() => {
                banner.classList.add("visible");
                overlay.classList.add("visible");
            });
        }
    }

    function hideIncompleteBanner() {
        const banner = document.getElementById("incomplete-banner");
        const overlay = document.getElementById("modal-overlay");
        if (banner && overlay) {
            banner.classList.remove("visible");
            overlay.classList.remove("visible");
            setTimeout(() => {
                banner.style.display = "none";
                overlay.style.display = "none";
            }, 400);
        }
    }

    const dismissButton = document.getElementById("dismiss-incomplete");
    if (dismissButton) {
        dismissButton.addEventListener("click", hideIncompleteBanner);
    }

    document.addEventListener("click", function (e) {
        const target = e.target.closest("a");
        if (!target || target.href.includes("#") || target.hasAttribute("data-no-block")) { return; }
        if (window.profileState.currentPercent < 100 || window.profileState.isDirty) {
            e.preventDefault();
            showIncompleteBanner();
        }
    });

    async function updateMemberstackFields(firstName, lastName, email) {
        const member = await window.$memberstackDom.getCurrentMember();
        if (!member || !member.data) {
            console.warn("⚠️ No Memberstack member found.");
            return;
        }
        await window.$memberstackDom.updateMember({
            customFields: { "first-name": firstName || "", "last-name": lastName || "" },
            auth: email ? { email } : undefined
        });
        console.log("✅ Memberstack fields updated.");
    }

    // --- 5. START THE APPLICATION ---
    initializeProfile();
});