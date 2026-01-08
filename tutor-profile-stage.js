<script>
document.addEventListener("DOMContentLoaded", function () {
  const STRIPE_WORKER_URL = "https://tc-staging-stripe.tutorchooser.workers.dev/create-checkout-session";
  const FILE_UPLOAD_WORKER_URL = "https://tc-staging-file-upload.tutorchooser.workers.dev/";

  window.profileState = {
    id: null,
    mondayData: {},
    currentPercent: 0,
    isDirty: false
  };

  const columnIds = {
    name: "name", email: "contact_email", prefix: "dropdown_mks2rnhn",
    firstName: "text_mks2v0wr", feedbackHear: "dropdown_mks2hc7t",
    availability: "color_mksm37cz", surname: "text_mks291ad",
    tutorUniID: "pulse_id_mks21aqk", gender: "dropdown_mks2g6a1",
    nationality: "dropdown_mks2h1v", dob: "date_mks2kfh",
    locationDropdown: "dropdown_mkt62mw9", uaeMobile: "contact_phone",
    intPhone: "phone_mks26x7r", languageSpoke: "dropdown_mks2ydb8", planName: "text_mktk7zs4", planEnd:  "date_mktkbpva",
    emerRelation: "text_mks2kgqt", emerName: "text_mks29dra", licenseVerify: "color_mks7z7ed",
    examBoard: "dropdown_mks2f11x", yearsExp: "dropdown_mks2wvvv",feePaid: "color_mkt99f6e",referralCodeUsed: "boolean_mkvens61",
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
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const dom = {
    body: document.body, pageLoader: document.getElementById("page-loader"),
    verifiedBadge: document.getElementById("verified-badge"), lockedLogo: document.getElementById("locked-logo"),
    lockedLogoSubmit: document.getElementById("locked-logo-submit"), earlyBadge: document.getElementById("early-badge"),
    underReviewBadge: document.getElementById("under-review-badge"),  proBadge: document.getElementById("pro-badge"), phdBadge: document.getElementById("phd_badge"),
    masterBadge: document.getElementById("master_badge"),
    degreeBadge: document.getElementById("degree_badge"),
    underBadge: document.getElementById("under_badge"),
    starterBadge: document.getElementById("starter-badge"),  freeBadge: document.getElementById("free-badge"), 
    policeBadge: document.getElementById("police-badge"), licenseBadge: document.getElementById("license-badge"),
    editLockBtn: document.getElementById("edit-lock"), saveProfileBasicBtn: document.getElementById("save-profile-basic"),
    saveProfileTeacherBtn: document.getElementById("save-profile-teacher"), saveProfileIdBtn: document.getElementById("save-profile-id"),
    saveProfileEmerBtn: document.getElementById("save-profile-emer"), saveProfileTechBtn: document.getElementById("save-profile-tech"),
    saveVerifyBtn: document.getElementById("submit-new"), saveConsentBtn: document.getElementById("save-profile-consent"),
    availabilityCheckbox: document.getElementById("Checkbox-3"), verificationInfoSection: document.getElementById("verif-info-section-new"),
    submitSection: document.getElementById("submit-section"), lockedMessage: document.getElementById("locked-message"),
    approvalCheck: document.getElementById("approval-check"), qualFilesList: document.getElementById("qual-files"),
    uaePoliceFilesList: document.getElementById("uae-police-files"), teachingLicenseFilesList: document.getElementById("teaching-license-files"),
    emiratesFrontFilesList: document.getElementById("emirates-front-files"), emiratesBackFilesList: document.getElementById("emirates-back-files"),
  };

  function populateClientFileArray(groupKey, fileData) {
      if (!window[groupKey]) window[groupKey] = []; 
      try {
          const parsed = typeof fileData === 'string' ? JSON.parse(fileData) : fileData;
          if (parsed?.files && Array.isArray(parsed.files)) {
              const serverFiles = parsed.files.map(f => ({ ...f, name: f.name, isFromServer: true }));
              window[groupKey].push(...serverFiles);
          }
      } catch (e) { 
          console.warn(`Could not parse initial files for ${groupKey}`, e); 
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
    setTimeout(() => { messageContainer.style.opacity = '1'; messageContainer.style.transform = 'translateY(0)'; }, 10);
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
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": token },
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
  
  window.getAllValues = async function (itemId) {
    try {
      const query = `query MyItemsQuery($itemId: ID!) { items(ids: [$itemId]) { column_values { id, text, value } } }`;
      const raw = await mondayApiCall(query, { itemId: String(itemId) });
      const vals = {};
      (raw?.data?.items?.[0]?.column_values || []).forEach(c => {
        try { vals[c.id] = { text: c.text, value: c.value ? JSON.parse(c.value) : null };
        } catch (e) { vals[c.id] = { text: c.text, value: c.value }; }
      });
      return vals;
    } catch (error) {
      showUIMessage("Could not load profile. Please refresh.", 'error', 8000);
      if(dom.pageLoader) dom.pageLoader.innerText = "Error loading profile. Please refresh.";
      return {};
    }
  }

  async function getCompletionPercentage(itemId) {
    try {
      const token = await window.$memberstackDom.getMemberCookie();
      const res = await fetch(`https://tc-staging-profile.tutorchooser.workers.dev/completion/${itemId}`, {
        method: 'GET', headers: { 'Authorization': token, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`Server error on completion endpoint: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error("❌ Could not fetch completion percentage:", error);
      showUIMessage("Could not retrieve profile completion status.", "error");
      return { tutorCompletion: 0 };
    }
  }

  async function updateColumnsAndGetCompletion(itemId, columnUpdates) {
    const payload = { itemId: String(itemId), columnUpdates };
      console.log("🚀 Sending to CF Worker:", JSON.stringify(payload, null, 2));

    try {
      const token = await window.$memberstackDom.getMemberCookie();
      const res = await fetch("https://tc-staging-profile.tutorchooser.workers.dev/completion", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": token },
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

async function uploadFiles(itemId) {
    const formData = new FormData();
    formData.append("ID-Number-Make", itemId);
    let newFilesAdded = false;

    const appendFile = (inputSelector, formKey) => {
        const fileInput = document.querySelector(
          `${inputSelector} input[type="file"], ${inputSelector}`
        );        
        const file = fileInput?.files?.[0];
        if (file) {
            formData.append(formKey, file);
            newFilesAdded = true;
            console.log(`Appended file from ${inputSelector} to form data.`);
        }
    };

    appendFile("#Emirates-ID-Front", "Emirates-ID-Front");
    appendFile("#Emirates-ID-Back-2", "Emirates-ID-Back-2");

    const uploadGroups = {
        "Qualification": window.qualFiles || [],
        "UAE-Police": window.uaePoliceFiles || [],
        "Teaching-License": window.teachingLicenseFiles || [],
    };

    for (const [label, fileArray] of Object.entries(uploadGroups)) {
        const filesToUpload = fileArray.filter(file => !file.isFromServer);
        if (filesToUpload.length > 0) {
            filesToUpload.forEach(file => formData.append(label, file));
            newFilesAdded = true;
        }
    }

    if (!newFilesAdded) {
        console.log("No new files to upload.");
        return { success: false, message: "No new files were selected for upload." };
    }

    try {
        const token = await window.$memberstackDom.getMemberCookie();
        const res = await fetch(FILE_UPLOAD_WORKER_URL, {
            method: "POST", headers: { 'Authorization': token }, body: formData
        });
        if (!res.ok) throw new Error(`File upload failed with status: ${res.status}`);
        showUIMessage("Files uploaded successfully!", 'success');
        return { success: true };
    } catch (err) {
        console.error("❌ Error sending files to worker", err);
        showUIMessage("A problem occurred uploading your files. Please try again.", 'error');
        return { success: false, error: err };
    }
}

  function updateCompletionUI(percent) {
    if (isNaN(percent)) { percent = 0; }
    window.profileState.currentPercent = percent;
    const isComplete = percent === 100;
    const progressBar = document.getElementById("progress-bar");
    const progressLabel = document.getElementById("progress-label");
    const progressTooltip = document.getElementById("progress-tooltip");
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressLabel) {
      progressLabel.innerHTML = isComplete ? `🎉 Your profile is complete.` : `Profile Completion: <strong>${percent}%</strong>`;
    }
    if (progressTooltip) {
      progressTooltip.textContent = isComplete ? "✅ All fields complete!" : "To improve your score, please ensure all sections of your profile are filled out, including your profile photo.";
    }
    const banner = document.getElementById("submit-reminder-banner");
    const submitted = window.profileState.mondayData?.[columnIds.submitVerify]?.text?.trim().toUpperCase();
    if (banner) {
        banner.style.display = (isComplete && submitted !== "YES") ? "block" : "none";
    }
  }

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

  async function buildChangedDataPayload(fieldMappings) {
    const updates = {};
    let error = null; 
    const initialData = window.profileState.mondayData;
    if (!initialData) {
        return { updates: {}, error: "Initial data not loaded." };
    }

    for (const field of fieldMappings) {
        const { domId, mondayId, type, phoneElementSelector } = field;
        const element = document.getElementById(domId);
                
        if (!element) {
            console.log(`   ... Element with ID "${domId}" not found, skipping.`);
            continue;
        }

        const initialValueText = initialData[mondayId]?.text || "";
        let payloadValue;

        switch (type) {
            case 'text':
            case 'consent':
                const currentValueText = element.value.trim();

                if (currentValueText !== initialValueText) {
                    payloadValue = currentValueText;
                    console.log(`   ✅ Change Detected! Payload: "${payloadValue}"`);
                }
                break;
            case 'link':
                const currentUrl = element.value.trim();
                const initialUrl = initialData[mondayId]?.value?.url || "";

                if (currentUrl && currentUrl !== initialUrl) {
                    payloadValue = { url: currentUrl, text: currentUrl };
                }
                break;
            case 'phone':
                const phoneInput = document.querySelector(phoneElementSelector);
                if (!phoneInput) {
                    console.log(`   ... Phone input with selector "${phoneElementSelector}" not found.`);
                    break;
                }
                const iti = window.intlTelInputGlobals.getInstance(phoneInput);


                if (phoneInput.value.trim() !== "" && iti && !iti.isValidNumber()) {
                    error = `The phone number entered is not valid. Please check it and try again.`;
                } else if (iti && iti.isValidNumber()) {
                    const currentNumberE164 = iti.getNumber(intlTelInputUtils.numberFormat.E164);
                    const initialNumberMatch = initialValueText.match(/\+\d+/);
                    const initialNumberE164 = initialNumberMatch ? initialNumberMatch[0] : "";

                    if (currentNumberE164 !== initialNumberE164) {
                        payloadValue = `${currentNumberE164} ${iti.getSelectedCountryData().iso2.toUpperCase()}`;
                    }
                } else if (iti) {
                     console.log(`   ... Phone number is valid but unchanged, or field is empty.`);
                }
                break;
            case 'date':
                const initialDate = initialData[mondayId]?.value?.date || "";
                if (element.value.trim()) {
                    const match = element.value.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
                    if (match) {
                        const [, dd, monthStr, year] = match;
                        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
                        if (monthIndex >= 0) {
                            const mm = String(monthIndex + 1).padStart(2, '0');
                            const formattedDate = `${year}-${mm}-${String(dd).padStart(2, '0')}`;
                            if (formattedDate !== initialDate) {
                                payloadValue = { date: formattedDate };
                            }
                        }
                    }
                }
                break;
            case 'multiselect':
                const initialArray = (initialValueText || '').split(/, |,/ ).map(s => s.trim()).filter(Boolean).sort();
                const currentOptions = Array.from(element.selectedOptions).map(o => o.text.trim()).sort();
                if (JSON.stringify(initialArray) !== JSON.stringify(currentOptions)) {
                    payloadValue = { labels: currentOptions };
                }
                break;
        }

        if (error) break;

        if (payloadValue !== undefined) {
            updates[mondayId] = payloadValue;
        }
    }
    
    return { updates, error };
}

  function renderMondayFileList(rawValue, targetListElement) {
    if (!rawValue || !targetListElement) return;
    targetListElement.innerHTML = '';
    try {
      const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
      if (parsed?.files && Array.isArray(parsed.files)) {
        parsed.files.forEach(file => {
          if (file?.name) {
            const li = document.createElement("li");
            li.className = "file-item";
            li.textContent = file.name;
            targetListElement.appendChild(li);
          }
        });
      }
    } catch (e) { console.warn("Unable to parse file column:", rawValue); }
      const ok = targetListElement.children && targetListElement.children.length > 0;
      targetListElement.classList.toggle('tc-invalid', !ok);
      targetListElement.setAttribute('aria-invalid', ok ? 'false' : 'true');
  }

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
      el.value = value;
    } else {
      el.textContent = value || '-';
    }
  }
}

function formatPlanName(rawPlanName) {
  if (!rawPlanName) {
    return 'N/A';
  }

  const friendlyNames = {
    'TUTOR_VERIFICATION_FEE': 'Tutor Verification Fee',
    'STARTER_MONTHLY': 'Tutor Starter (Monthly)',
    'STARTER_YEARLY': 'Tutor Starter (Yearly)',
    'PRO_MONTHLY': 'Tutor Pro (Monthly)',
    'PRO_YEARLY': 'Tutor Pro (Yearly)'
  };

  return friendlyNames[rawPlanName] || rawPlanName;
}

  function populateMultiSelect(elementId, textValue, delimiter = ",") {
    const el = document.getElementById(elementId);
    if (el && textValue) {
      const selectedValues = textValue.split(delimiter).map(s => s.trim());
      Array.from(el.options).forEach(o => { o.selected = selectedValues.includes(o.text); });
      $(el).trigger('change');
    }
  }

  async function waitForId(maxRetries = 20, delay = 500) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const member = await window.$memberstackDom.getCurrentMember();
        const id = String(member?.data?.customFields["tutor-id"] || "");
        if (id) return id;
      } catch (e) { /* Memberstack not ready */ }
      await new Promise(r => setTimeout(r, delay));
    }
    showUIMessage("Could not identify your profile. Please refresh.", "error", 10000);
    return null;
  }

function clearSelect2Invalid(selectEl) {
  const vis = getSelect2Selection(selectEl);
  vis?.classList.remove('tc-invalid');
  selectEl.setAttribute('aria-invalid', 'false');
}

$(document).on(
  'select2:select select2:unselect select2:clear change',
  'select.select2-hidden-accessible',
  function () { clearSelect2Invalid(this); }
);

$(document).on('keyup', '.select2-search__field', function () {
  const selectEl = $(this).closest('.select2-container').prev('select')[0];
  if (selectEl) clearSelect2Invalid(selectEl);
});


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

  async function updateMemberstackFields(firstName, lastName) {
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      if (!member?.data) return;
      await window.$memberstackDom.updateMember({
        customFields: { "first-name": firstName || "", "last-name": lastName || "" }
      });
    } catch (err) {
      console.warn("⚠️ Could not update Memberstack fields.", err);
    }
  }
  
  function setVerificationSectionLock(lock) {
      const { mondayData } = window.profileState;
      const verifiedStatus = mondayData?.[columnIds.verifiedStatus]?.text?.trim()?.toUpperCase();
      
      const sections = [dom.verificationInfoSection, dom.submitSection];
      sections.forEach(section => {
          if (section) {
              section.classList.toggle("locked", lock);
              section.style.pointerEvents = lock ? "none" : "auto";
              section.style.opacity = lock ? "0.6" : "1";
              section.querySelectorAll("input, select, textarea").forEach(el => {
                  if (el.classList.contains("select2-hidden-accessible")) return;
                  el.disabled = lock;
                  el.style.borderColor = lock ? "#ddd" : "";
              });
          }
      });

      if (dom.lockedLogo) dom.lockedLogo.style.display = lock ? "inline-block" : "none";
      if (dom.lockedLogoSubmit) dom.lockedLogoSubmit.style.display = lock ? "inline-block" : "none";

      const profileImage = document.getElementById("profile-image");
      if (profileImage) {
          profileImage.style.filter = lock ? "grayscale(100%)" : "none";
          profileImage.style.opacity = lock ? "0.6" : "1";
          profileImage.style.pointerEvents = lock ? "none" : "auto";
      }

      const profileUploadLink = document.querySelector(".ms-profile-upload");
      if (profileUploadLink) {
          profileUploadLink.style.pointerEvents = lock ? "none" : "auto";
          profileUploadLink.style.opacity = lock ? "0.6" : "1";
          profileUploadLink.title = lock ? "Profile updates are locked after submission." : "";
      }

      const fieldsToLock = [
          document.getElementById("prefix"),
          document.getElementById("First-name"),
          document.getElementById("Last-name")
      ];
      fieldsToLock.forEach(field => {
          if (field) {
              field.disabled = lock;
              field.style.backgroundColor = lock ? "#f5f5f5" : "";
              field.style.borderColor = lock ? "#ddd" : "";
          }
      });


      if (lock && dom.editLockBtn) {
          dom.editLockBtn.addEventListener("click", e => {
              e.preventDefault();
              e.stopPropagation();
          }, true);
      }
  }
  
  function showConfirmationModal(modalId, onConfirm) {
    const overlay = document.getElementById(`${modalId}-overlay`);
    const banner = document.getElementById(`${modalId}-banner`);
    if (!overlay || !banner) return;

    const confirmBtn = banner.querySelector('button[id^="confirm-"]');
    const cancelBtn = banner.querySelector('button[id^="cancel-"]');

    const hideModal = () => {
      banner.classList.remove("visible");
      overlay.classList.remove("visible");
      setTimeout(() => {
        overlay.style.display = "none";
        banner.style.display = "none";
      }, 400);
    };

    confirmBtn.onclick = () => {
      hideModal();
      if (onConfirm) setTimeout(onConfirm, 400);
    };
    cancelBtn.onclick = hideModal;

    overlay.style.display = "block";
    banner.style.display = "flex";
    requestAnimationFrame(() => {
      banner.classList.add("visible");
      overlay.classList.add("visible");
    });
  }
  async function initializeProfile() {
    if (dom.pageLoader) dom.pageLoader.style.display = 'flex';
    dom.body.classList.add("loading");
    const id = await waitForId();
    if (!id) return;
    window.profileState.id = id;
    const [mondayData, completionData] = await Promise.all([
      getAllValues(id),
      getCompletionPercentage(id)
    ]);
    if (Object.keys(mondayData).length === 0) return;
    window.profileState.mondayData = mondayData;

    if (dom.availabilityCheckbox) {
        dom.availabilityCheckbox.checked = mondayData[columnIds.availability]?.text?.trim() === "Unavailable";
    }
    setFieldValue("prefix", mondayData[columnIds.prefix]?.text);
    setFieldValue("First-name", mondayData[columnIds.firstName]?.text);
    setFieldValue("Last-name", mondayData[columnIds.surname]?.text);
    setFieldValue("gender", mondayData[columnIds.gender]?.text);
    setFieldValue("how-hear", mondayData[columnIds.feedbackHear]?.text);
    if (mondayData[columnIds.dob]?.text) {
        const [yyyy, mm, dd] = mondayData[columnIds.dob].text.split('-');
        setFieldValue("dob", `${parseInt(dd)} ${monthNames[parseInt(mm) - 1]} ${yyyy}`);
    }
    if (mondayData[columnIds.emirDate]?.text) {
        const [yyyy, mm, dd] = mondayData[columnIds.emirDate].text.split('-');
        setFieldValue("emir-date", `${parseInt(dd)} ${monthNames[parseInt(mm) - 1]} ${yyyy}`);
    }
    setFieldValue("location-address-new", mondayData[columnIds.locationDropdown]?.text);
    setFieldValue("uae-phone-4", mondayData[columnIds.uaeMobile]?.text);
    setFieldValue("tutor-uni-id", mondayData[columnIds.tutorUniID]?.text);
    setFieldValue("int-phone-4", mondayData[columnIds.intPhone]?.text);
    setFieldValue("url-ln", mondayData[columnIds.linkedin]?.value?.url);
    setFieldValue("Emergency-Relation", mondayData[columnIds.emerRelation]?.text);
    setFieldValue("Emergency-Name", mondayData[columnIds.emerName]?.text);
    setFieldValue("emer-phone-3", mondayData[columnIds.emerPhone]?.text);
    setFieldValue("tutor-mode", mondayData[columnIds.tutorMode]?.text);
    setFieldValue("provider-2", mondayData[columnIds.providerType]?.text);
    setFieldValue("first-aid", mondayData[columnIds.firstaid]?.text);
    setFieldValue("bio", mondayData[columnIds.bio]?.text);
    setFieldValue("student-gen", mondayData[columnIds.pregen]?.text);
    setFieldValue("tutor-rate", mondayData[columnIds.rate]?.text);
    setFieldValue("rate-nego", mondayData[columnIds.negorate]?.text);
    setFieldValue("emirID", mondayData[columnIds.emirID]?.text);
    setFieldValue("years-exp", mondayData[columnIds.yearsExp]?.text);
    setFieldValue("webcam", mondayData[columnIds.webcam]?.text);
    setFieldValue("internet-stable", mondayData[columnIds.stableInternet]?.text);
    setFieldValue("consent-terms", mondayData[columnIds.privacyConsent]?.text);
    setFieldValue("consent-mark", mondayData[columnIds.marketingConsent]?.text);
    if (dom.approvalCheck) {
        const approvalStatus = mondayData[columnIds.approvalConfirm]?.text?.trim().toUpperCase();
        console.log(`[Debug] Approval Check Status from Monday: "${approvalStatus}"`);
        dom.approvalCheck.checked = (approvalStatus === "YES");
    } else {
        console.warn("Could not find the approval checkbox element with ID 'approval-check'.");
    }
    populateMultiSelect("nationality", mondayData[columnIds.nationality]?.text, ", ");
    populateMultiSelect("lang-spoke", mondayData[columnIds.languageSpoke]?.text, ", ");
    populateMultiSelect("tutor-time-pre", mondayData[columnIds.tutorTime]?.text, /,\s(?=[A-Z])/);
    populateMultiSelect("lang-teach", mondayData[columnIds.language]?.text, ", ");
    populateMultiSelect("special-exp", mondayData[columnIds.specialexp]?.text, ", ");
    populateMultiSelect("subject-col-1618", mondayData[columnIds.subjects]?.text, ", ");
    populateMultiSelect("Multiple[]-2", mondayData[columnIds.subjectsPre]?.text, ", ");
    populateMultiSelect("subject-sec-1115", mondayData[columnIds.subjects2]?.text, ", ");
    populateMultiSelect("exam-board", mondayData[columnIds.examBoard]?.text, ", ");
    populateMultiSelect("curriculum", mondayData[columnIds.curriculum]?.text, ", ");
    populateMultiSelect("online-tools", mondayData[columnIds.onlineTool]?.text, ", ");
    renderMondayFileList(mondayData[columnIds.qualificationsFile]?.value, dom.qualFilesList);
    renderMondayFileList(mondayData[columnIds.uaePoliceFile]?.value, dom.uaePoliceFilesList);
    renderMondayFileList(mondayData[columnIds.teachingLicenseFile]?.value, dom.teachingLicenseFilesList);
    renderMondayFileList(mondayData[columnIds.emiratesIdFrontFile]?.value, dom.emiratesFrontFilesList);
    renderMondayFileList(mondayData[columnIds.emiratesIdBackFile]?.value, dom.emiratesBackFilesList);

    const referralCode = mondayData[columnIds.tutorIdV1]?.text || "";
    const referralStatus = mondayData[columnIds.referralValidStatus]?.text;
    const codeInput = document.getElementById("ref-code");
    if (codeInput) {
        codeInput.value = referralCode;
    }
    updateReferralStatusUI(referralStatus);

    const rawPlanName = (mondayData[columnIds.planName]?.text || "").trim();

    const isVerificationFee =
      rawPlanName.toUpperCase() === "TUTOR_VERIFICATION_FEE" ||
      rawPlanName.toUpperCase() === "VERIFICATION_FEE" ||
      /verification\s*fee/i.test(rawPlanName);

    if (!isVerificationFee && rawPlanName) {
      setFieldValue("plan_name", formatPlanName(rawPlanName));

      const planEndText = mondayData[columnIds.planEnd]?.text;
      if (planEndText) {
        const [yyyy, mm, dd] = planEndText.split("-");
        const formatted = `${parseInt(dd)} ${monthNames[parseInt(mm) - 1]} ${yyyy}`;
        setFieldValue("plan_expir", formatted);
      }

      const planStatusElement = document.getElementById("plan_status");
      if (planStatusElement) planStatusElement.textContent = "ACTIVE";
    } else {
      console.log("[plan] Skipping plan UI update because entry is a Verification Fee:", rawPlanName);
    }

    const hasPlan = !!rawPlanName && !isVerificationFee;
    const planPurchaseSection = document.getElementById("plan-purchase");
    const textPlanSection = document.getElementById("text-plan");
    if (planPurchaseSection) planPurchaseSection.style.display = hasPlan ? "none" : "block";
    if (textPlanSection) textPlanSection.style.display = hasPlan ? "block" : "none";

    populateClientFileArray('qualFiles', mondayData[columnIds.qualificationsFile]?.value);
    populateClientFileArray('uaePoliceFiles', mondayData[columnIds.uaePoliceFile]?.value);
    populateClientFileArray('teachingLicenseFiles', mondayData[columnIds.teachingLicenseFile]?.value);

    updateCompletionUI(completionData.tutorCompletion);
    updateBadgeAndLockState();
    updatePricingUI(mondayData);

    document.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => { window.profileState.isDirty = true; });
    });

    if(dom.pageLoader) dom.pageLoader.style.display = "none";
    dom.body.classList.remove("loading");
  }

function applyPriceDiscount(priceMap, badgeText) {
    const priceCards = document.querySelectorAll('#purchase-subscription .tc-card[data-price]');

    priceCards.forEach(card => {
        const priceContainer = card.querySelector('.tc-price');
        const originalPrice = parseFloat(card.dataset.price);

        if (!priceContainer || isNaN(originalPrice)) { return; }

        const plan = card.closest('.tc-plan').dataset.plan;
        const cycle = card.dataset.cycle;
        const priceKey = `${plan}-${cycle}`;
        
        const newPrice = priceMap[priceKey];
        if (!newPrice) { return; }

        priceContainer.style.display = 'flex';
        priceContainer.style.justifyContent = 'center';

        priceContainer.innerHTML = `
            <div class="amount" style="display: flex; align-items: baseline; flex-wrap: wrap; justify-content: center; gap: 0.6rem; font-family: 'Trajanpro', serif;">
                <del style="opacity: 0.6; font-size: 1.2rem; font-weight: 400; color: var(--muted);">AED ${originalPrice}</del>
                <span style="font-size: 1.8rem; font-weight: 800; color: var(--ink);">AED ${newPrice}</span>
                <div class="badge" style="background-color: #d1e7dd; color: #0f5132; border-radius: 99px; padding: .25rem .55rem; font-size: 0.75rem; font-family: 'Cambria Web', serif;">${badgeText}</div>
            </div>
        `;
        
        const perElement = card.querySelector('.tc-price .per');
        if (perElement) { perElement.style.display = 'none'; }
    });
}

function resetPriceUI() {
    const priceCards = document.querySelectorAll('#purchase-subscription .tc-card[data-price]');
    priceCards.forEach(card => {
        const priceContainer = card.querySelector('.tc-price');
        const originalPrice = card.dataset.price;
        if (priceContainer && originalPrice) {
            priceContainer.style.display = 'flex'; 
            priceContainer.style.justifyContent = 'center';
            priceContainer.innerHTML = `<span class="amount">AED ${originalPrice}</span> <span class="per"></span>`;
        }
    });
}

function updatePricingUI(mondayData) {
    resetPriceUI();

    const referralPrices = {
        'starter-monthly': '36.75', 'starter-yearly': '367.50',
        'pro-monthly': '66.75', 'pro-yearly': '667.50'
    };
    const earlyAdopterPrices = {
        'starter-monthly': '25', 'starter-yearly': '250',
        'pro-monthly': '45', 'pro-yearly': '450'
    };

    const isEarlyAdopter = mondayData?.[columnIds.earlyAdopterStatus]?.text?.toUpperCase() === 'YES';
    const referralCodeExists = mondayData?.[columnIds.tutorIdV1]?.text;
    
    const isReferralValid = mondayData?.[columnIds.referralValidStatus]?.text?.toUpperCase() === 'VALID';

    if (isEarlyAdopter) {
        console.log("✅ Applying Early Adopter Offer prices.");
        applyPriceDiscount(earlyAdopterPrices, "Early Adopter Offer");
    }

    else if (referralCodeExists && isReferralValid) {
        console.log("✅ Applying Referral Offer prices (code exists and is VALID).");
        applyPriceDiscount(referralPrices, "Referral Offer");
    } else {
        console.log("No applicable discounts found. Displaying standard prices.");
    }
}

function updateBadgeAndLockState() {
    const { mondayData } = window.profileState;

    const isVerified = mondayData?.[columnIds.verifiedStatus]?.text?.toUpperCase() === "VERIFIED";
    const submittedForReview = mondayData?.[columnIds.submitVerify]?.text?.toUpperCase() === "YES";
    const isEarlyAdopter = mondayData?.[columnIds.earlyAdopterStatus]?.text?.toUpperCase() === "YES";
    const qualStatus = mondayData?.[columnIds.qualType]?.text?.trim();
    const howToCompSection = document.getElementById("how-to-comp-section");

    if (dom.phdBadge) dom.phdBadge.style.display = "none";
    if (dom.masterBadge) dom.masterBadge.style.display = "none";
    if (dom.degreeBadge) dom.degreeBadge.style.display = "none";
    if (dom.underBadge) dom.underBadge.style.display = "none";

    if (howToCompSection) {
        if (isVerified || submittedForReview) {
            howToCompSection.style.display = "none";
        } else {
            howToCompSection.style.display = "block";
        }
    }

    if (qualStatus === "PHD" && dom.phdBadge) {
        dom.phdBadge.style.display = "inline-block";
    } else if (qualStatus === "Masters" && dom.masterBadge) {
        dom.masterBadge.style.display = "inline-block";
    } else if (qualStatus === "Degree" && dom.degreeBadge) {
        dom.degreeBadge.style.display = "inline-block";
    } else if (qualStatus === "Undergraduate" && dom.underBadge) {
        dom.underBadge.style.display = "inline-block";
    }

    const licenseStatus = mondayData?.[columnIds.licenseVerify]?.text?.trim();
    if (dom.licenseBadge) {
        if (licenseStatus === "Verified by Bodruz") {
            dom.licenseBadge.style.display = "inline-block";
        } else {
            dom.licenseBadge.style.display = "none";
        }
    }
    
    const rawPlanName = (mondayData?.[columnIds.planName]?.text || "").trim();

    const isVerificationFee = /verification\s*fee/i.test(rawPlanName);
    const hasPlan = !!rawPlanName && !isVerificationFee;

    const policeFileValue = mondayData?.[columnIds.uaePoliceFile]?.value;
    let hasPoliceFile = false;
    
    if (policeFileValue && Array.isArray(policeFileValue.files) && policeFileValue.files.length > 0) {
        hasPoliceFile = true;
    }

    if (dom.policeBadge) dom.policeBadge.style.display = hasPoliceFile ? "inline-block" : "none";

    const planName = (mondayData?.[columnIds.planName]?.text || "").toUpperCase();
    if (dom.proBadge) {
        dom.proBadge.style.display = planName.includes("PRO") ? "block" : "none";
    }
    if (dom.starterBadge) {
        dom.starterBadge.style.display = planName.includes("START") ? "block" : "none";    }
    if (dom.freeBadge) {
        dom.freeBadge.style.display = planName.includes("FREE") ? "block" : "none";
    }

    if (dom.verifiedBadge) dom.verifiedBadge.style.display = isVerified ? "inline-block" : "none";
    if (dom.earlyBadge) dom.earlyBadge.style.display = isEarlyAdopter ? "inline-block" : "none";
    if (dom.underReviewBadge) dom.underReviewBadge.style.display = (submittedForReview && !isVerified) ? "inline-block" : "none";

    const progressMessage = document.getElementById("verify-message-progress");
    const verifiedMessage = document.getElementById("verify-message");
    const verifiedMessageSection = document.getElementById("locked-message");
    const verifiedWaitingMessageSection = document.getElementById("locked-message-waiting");

    if (progressMessage) progressMessage.style.display = (submittedForReview && !isVerified) ? "block" : "none";
    if (verifiedMessage) verifiedMessage.style.display = (isVerified && !hasPlan) ? "block" : "none";
    if (verifiedMessageSection) verifiedMessageSection.style.display = isVerified ? "block" : "none";
    if (verifiedWaitingMessageSection) verifiedWaitingMessageSection.style.display = (submittedForReview && !isVerified) ? "block" : "none";

    const progressWrapper = document.getElementById("progress-wrapper");
    if (progressWrapper) {
        progressWrapper.style.display = (isVerified || submittedForReview) ? "none" : "block";
    }
    
    const shouldBeLocked = isVerified || submittedForReview;
    setVerificationSectionLock(shouldBeLocked);

    if (dom.saveVerifyBtn) {
        dom.saveVerifyBtn.disabled = shouldBeLocked;
        dom.saveVerifyBtn.style.opacity = shouldBeLocked ? "0.6" : "1";
        dom.saveVerifyBtn.style.cursor = shouldBeLocked ? "not-allowed" : "pointer";
    }
    
    const planPurchaseSection = document.getElementById("plan-purchase");
    const freePlanBox = document.querySelector('.tc-plan[data-plan="free"]');
    const proPlanBox = document.querySelector('.tc-plan[data-plan="pro"]');

    const textPlanSection = document.getElementById("text-plan");

    const planNameUpper = (mondayData?.[columnIds.planName]?.text || "").toUpperCase();
    const isPro = planNameUpper.includes("PRO");
    const isStarter = planNameUpper.includes("STARTER") || planNameUpper.includes("START");
    const isFreePlan = planNameUpper.includes("FREE");
    const isVerifFee = /VERIFICATION/i.test(planNameUpper);
    const hasActivePlan = (isPro || isStarter || isFreePlan) && !isVerifFee;

       if (planPurchaseSection) {
        if (isPro) {
            planPurchaseSection.style.display = "none";
        } 
        else if (isStarter || isFreePlan) {
            planPurchaseSection.style.display = "block";
            if (freePlanBox) freePlanBox.style.display = "none";
            if (proPlanBox) proPlanBox.style.display = "block";
        } 
        else {
            const showOptions = isVerified && !hasActivePlan;
            planPurchaseSection.style.display = showOptions ? "block" : "none";
            if (freePlanBox) freePlanBox.style.display = "block";
            if (proPlanBox) proPlanBox.style.display = "block";
        }
    }

    if (textPlanSection) {
        textPlanSection.style.display = hasPlan ? "block" : "none";
    }

    const manageProfileButton = document.getElementById("manage_profile");
    if (manageProfileButton) {
        manageProfileButton.style.display = hasPlan ? "block" : "none";
    }
}

const REQUIRED_FOR_VERIFY = [
  { sel: '#First-name',           label: 'First Name',              type: 'text' },
  { sel: '#Last-name',            label: 'Last Name',               type: 'text' },
  { sel: '#location-address-new', label: 'Location',                type: 'select' },
  { sel: '#gender',         label: 'Gender',                  type: 'select' },
  { sel: '#prefix',         label: 'Prefix',                  type: 'select' },
  { sel: '#how-hear',         label: 'How did you hear about us?',  type: 'select' },
  { sel: '#nationality',        label: 'Nationality',                type: 'multiselect' },
  { sel: '#lang-spoke',           label: 'Lanuages Spoken',                type: 'multiselect' },
  { sel: '#dob',                  label: 'Date of Birth',           type: 'text' },
  { sel: '#uae-phone-4',          label: 'UAE Mobile',              type: 'phone' },

  { sel: '#tutor-mode',           label: 'Mode of Tutoring',        type: 'select' },
  { sel: '#bio',                  label: 'Bio',                     type: 'text' },
  { sel: '#tutor-time-pre',     label: 'Tutor Times',                type: 'multiselect' },
  { sel: '#provider-2',     label: 'Provider Type',                type: 'select' },
  { sel: '#lang-teach',     label: 'Languages to Teach In',                type: 'multiselect' },
  { sel: '#student-gen',     label: 'Student Gender',                type: 'select' },
  { sel: '#first-aid',     label: 'First Aid Level',                type: 'select' },
  { sel: '#tutor-rate',     label: 'Hour Rate',                type: 'select' },
  { sel: '#special-exp',     label: 'Special Needs Exp',                type: 'multiselect' },
  { sel: '#rate-nego',           label: 'Rate Negotiate',        type: 'select' },
  { sel: '#consent-terms',      label: 'T&P Consent',         type: 'select' },
  { sel: '#consent-mark',               label: 'Marketing Consent',     type: 'select' },
  { sel: '#internet-stable',      label: 'Stable Internet',         type: 'select' },
  { sel: '#webcam',               label: 'Webcam Availability',     type: 'select' },
  { sel: '#online-tools',               label: 'Online Tools',     type: 'multiselect' },
  { sel: '#emirID',               label: 'Emirates ID Number',      type: 'text' },
  { sel: '#emir-date',            label: 'Emirates ID Expiry',      type: 'text' },
  { sel: '#years-exp',           label: 'Year Exp',        type: 'select' },
  { sel: '#exam-board',     label: 'Exam Board',                type: 'multiselect' },
  { sel: '#Multiple\\[\\]-2', label: 'Subjects Primary', type: 'multiselect' },
  { sel: '#subject-sec-1115',     label: 'Subjects Secondary',                type: 'multiselect' },
  { sel: '#subject-col-1618',     label: 'Subjects College',                type: 'multiselect' },
  { sel: '#curriculum',     label: 'Exam Board',                type: 'multiselect' },
  { sel: '#emirates-front-files', label: 'Emirates ID (Front)',     type: 'filelist' },
  { sel: '#emirates-back-files',  label: 'Emirates ID (Back)',      type: 'filelist' },
  { sel: '#qual-files',        label: 'Qualifications',          type: 'filelist' },
  { sel: '#uae-police-files',  label: 'UAE Police Certificate',  type: 'filelist' }

];

function isValidField(el, type) {
  if (!el) return false;

  const tag = (el.tagName || '').toLowerCase();
  const inType = (el.getAttribute('type') || '').toLowerCase();

  switch (type) {
    case 'checkbox':
      return !!el.checked;

    case 'file':
      return !!(el.files && el.files.length > 0);

    case 'filelist':
      return el.children && el.children.length > 0;

    case 'select':
      return !!(el.value && String(el.value).trim());

    case 'multiselect': {
      if (tag === 'select') {
        const selected = Array.from(el.selectedOptions || []);
        const hasRealValue = selected.some(o => (o.value || '').trim() !== '');
        return hasRealValue;
      }
      const val = (el.value || '').trim();
      return !!val;
    }

    case 'phone': {
      const iti = window.intlTelInputGlobals?.getInstance?.(el);
      if (!el.value || !el.value.trim()) return false;
      return iti ? iti.isValidNumber() : /^\+?\d{7,15}$/.test(el.value.replace(/\s|-/g, ''));
    }

    case 'text':
    default: {
      const val = (el.value || '').trim();
      return !!val;
    }
  }
}

function isSelect2(el) {
  return el && el.classList && el.classList.contains('select2-hidden-accessible');
}
function getSelect2Selection(el) {
  return el?.nextElementSibling?.querySelector('.select2-selection') || null;
}
function markInvalid(el, on) {
  if (!el) return;
  el.setAttribute('aria-invalid', on ? 'true' : 'false');
  const visual = isSelect2(el) ? getSelect2Selection(el) : el;
  if (visual) visual.classList.toggle('tc-invalid', !!on);
}


function validateForVerify({ focusFirst = true, toast = true } = {}) {
  const missing = [];

  document.querySelectorAll('.tc-invalid[aria-invalid="true"]').forEach(el => markInvalid(el, false));

  REQUIRED_FOR_VERIFY.forEach(item => {
    const el = document.querySelector(item.sel);
    if (!el) { return; }
    const ok = isValidField(el, item.type);
    markInvalid(el, !ok);
    if (!ok) missing.push(item.label);
  });

   if (missing.length) {
    if (focusFirst) {
      const firstField = document.querySelector('.tc-invalid');

      if (firstField) {
        const select2UI = firstField.classList.contains('select2-selection')
          ? firstField
          : firstField.closest('.select2-container')?.querySelector('.select2-selection');

        const target = select2UI || firstField;

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { target.focus({ preventScroll: true }); } catch (_) {}
        const hiddenSelect = target.closest('.select2-container')?.previousElementSibling;
        if (hiddenSelect && $(hiddenSelect).hasClass('select2-hidden-accessible')) {
          $(hiddenSelect).select2('open');
        }
      }
    }

    if (toast && typeof showUIMessage === 'function') {
      showUIMessage(`Please complete: ${missing.join(', ')}`, 'error', 8000);
    }
    return { ok: false, missing };
  }


  return { ok: true, missing: [] };
}

  function clearIfInvalid(el) {
    if (!el) return;
    if (el.classList && el.classList.contains('tc-invalid')) {
      markInvalid(el, false);
    } else {
      el.setAttribute?.('aria-invalid', 'false');
    }
  }

  document.addEventListener('input', (e) => clearIfInvalid(e.target), true);
  document.addEventListener('keyup', (e) => clearIfInvalid(e.target), true);

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches && el.matches('select.select2-hidden-accessible')) {
      const vis = getSelect2Selection(el);
      vis?.classList.remove('tc-invalid');
      el.setAttribute('aria-invalid', 'false');
    } else {
      clearIfInvalid(el);
    }
  }, true);

function setupSaveButtonListener(button, fieldMappings, successMessage) {
    if (!button) return;
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        const saveButton = e.target;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        if (dom.pageLoader) dom.pageLoader.style.display = 'flex';
        
        try {
            const { updates, error } = await buildChangedDataPayload(fieldMappings);
            if (error) {
                showUIMessage(error, 'error');
                return; 
            }

            if (button === dom.saveProfileBasicBtn && (updates.hasOwnProperty(columnIds.firstName) || updates.hasOwnProperty(columnIds.surname))) {
                const firstName = document.getElementById("First-name")?.value || window.profileState.mondayData[columnIds.firstName]?.text || "";
                const surname = document.getElementById("Last-name")?.value || window.profileState.mondayData[columnIds.surname]?.text || "";
                updates[columnIds.name] = `${firstName} ${surname}`;
            }

            if (Object.keys(updates).length > 0) {
                const result = await updateColumnsAndGetCompletion(window.profileState.id, updates);
                
                window.profileState.mondayData = await getAllValues(window.profileState.id);
                
                updateCompletionUI(result.tutorCompletion);
                updateBadgeAndLockState();
                showUIMessage(successMessage, 'success');
                window.profileState.isDirty = false;

                if (button === dom.saveProfileBasicBtn && updates.hasOwnProperty(columnIds.tutorIdV1)) {
                    showUIMessage("Checking referral code status...", 'info', 6000);
                    
                    setTimeout(async () => {
                        console.log("⏰ 6 seconds passed, fetching final referral status...");
                        const latestData = await getAllValues(window.profileState.id);
                        window.profileState.mondayData = latestData; 
                        const newReferralStatus = latestData[columnIds.referralValidStatus]?.text;
                        updateReferralStatusUI(newReferralStatus);
                        updatePricingUI(latestData); 

                    }, 6000);
                }
                
            } else {
                showUIMessage("No changes detected.", 'info');
            }
        } catch (err) {
            showUIMessage(`Failed to save: ${err.message}`, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
            if (dom.pageLoader) dom.pageLoader.style.display = 'none';
        }
    });
}

  const basicInfoMappings = [
    { domId: "First-name", mondayId: columnIds.firstName, type: 'text' }, { domId: "Last-name", mondayId: columnIds.surname, type: 'text' },
    { domId: "prefix", mondayId: columnIds.prefix, type: 'text' }, { domId: "gender", mondayId: columnIds.gender, type: 'text' },
    { domId: "how-hear", mondayId: columnIds.feedbackHear, type: 'text' }, { domId: "url-ln", mondayId: columnIds.linkedin, type: 'link' },
    { domId: "location-address-new", mondayId: columnIds.locationDropdown, type: 'text' }, { domId: "dob", mondayId: columnIds.dob, type: 'date' },
    { domId: "uae-phone-4", mondayId: columnIds.uaeMobile, type: 'phone', phoneElementSelector: '#uae-phone-4' },
    { domId: "int-phone-4", mondayId: columnIds.intPhone, type: 'phone', phoneElementSelector: '#int-phone-4' },
    { domId: "nationality", mondayId: columnIds.nationality, type: 'multiselect' }, { domId: "lang-spoke", mondayId: columnIds.languageSpoke, type: 'multiselect' },
        { domId: "ref-code", mondayId: columnIds.tutorIdV1, type: 'text' }
  ];
  const teacherInfoMappings = [
    { domId: "tutor-mode", mondayId: columnIds.tutorMode, type: 'text' }, { domId: "provider-2", mondayId: columnIds.providerType, type: 'text' },
    { domId: "first-aid", mondayId: columnIds.firstaid, type: 'text' }, { domId: "bio", mondayId: columnIds.bio, type: 'text' },
    { domId: "student-gen", mondayId: columnIds.pregen, type: 'text' }, { domId: "tutor-rate", mondayId: columnIds.rate, type: 'text' },
    { domId: "rate-nego", mondayId: columnIds.negorate, type: 'text' }, { domId: "tutor-time-pre", mondayId: columnIds.tutorTime, type: 'multiselect' },
    { domId: "lang-teach", mondayId: columnIds.language, type: 'multiselect' }, { domId: "special-exp", mondayId: columnIds.specialexp, type: 'multiselect' }
  ];
  const emerInfoMappings = [
      { domId: "Emergency-Relation", mondayId: columnIds.emerRelation, type: 'text' },
      { domId: "Emergency-Name", mondayId: columnIds.emerName, type: 'text' },
      { domId: "emer-phone-3", mondayId: columnIds.emerPhone, type: 'phone', phoneElementSelector: '#emer-phone-3' }
  ];
  const techInfoMappings = [
      { domId: "internet-stable", mondayId: columnIds.stableInternet, type: 'text' }, { domId: "webcam", mondayId: columnIds.webcam, type: 'text' },
      { domId: "online-tools", mondayId: columnIds.onlineTool, type: 'multiselect' }
  ];
  const consentInfoMappings = [
      { domId: "consent-terms", mondayId: columnIds.privacyConsent, type: 'consent' }, { domId: "consent-mark", mondayId: columnIds.marketingConsent, type: 'consent' }
  ];
  const idInfoMappings = [
      { domId: "emirID", mondayId: columnIds.emirID, type: 'text' }, { domId: "emir-date", mondayId: columnIds.emirDate, type: 'date' },
      { domId: "years-exp", mondayId: columnIds.yearsExp, type: 'text' }, { domId: "subject-col-1618", mondayId: columnIds.subjects, type: 'multiselect'},
      { domId: "Multiple[]-2", mondayId: columnIds.subjectsPre, type: 'multiselect'}, { domId: "subject-sec-1115", mondayId: columnIds.subjects2, type: 'multiselect'},
      { domId: "exam-board", mondayId: columnIds.examBoard, type: 'multiselect'}, { domId: "curriculum", mondayId: columnIds.curriculum, type: 'multiselect'}
  ];

  setupSaveButtonListener(dom.saveProfileBasicBtn, basicInfoMappings, "Personal Information saved!");
  setupSaveButtonListener(dom.saveProfileTeacherBtn, teacherInfoMappings, "Teaching Information saved!");
  setupSaveButtonListener(dom.saveProfileEmerBtn, emerInfoMappings, "Emergency Contact saved!");
  setupSaveButtonListener(dom.saveProfileTechBtn, techInfoMappings, "Technology & Setup saved!");
  setupSaveButtonListener(dom.saveConsentBtn, consentInfoMappings, "Declaration saved!");

  if (dom.saveProfileIdBtn) {
    dom.saveProfileIdBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.target.disabled = true; e.target.textContent = 'Saving & Uploading...';
      if (dom.pageLoader) dom.pageLoader.style.display = 'flex';
      try {
        if (!dom.approvalCheck.checked) {
          showUIMessage("Please tick the confirmation checkbox before saving.", 'error');
          return; 
        }
        const { updates, error } = await buildChangedDataPayload(idInfoMappings);
        if (error) {
            showUIMessage(error, 'error');
            return;
        }
        
        updates[columnIds.approvalConfirm] = "Yes"; 
        
        let textFieldsResult = null;
        if (Object.keys(updates).length > 1) { 
             textFieldsResult = await updateColumnsAndGetCompletion(window.profileState.id, updates);
        }

        const frontInput = document.querySelector('#Emirates-ID-Front input[type="file"], #Emirates-ID-Front');
        const backInput  = document.querySelector('#Emirates-ID-Back-2 input[type="file"], #Emirates-ID-Back-2');
        const hasDirectEmirates = ((frontInput?.files?.length || 0) + (backInput?.files?.length || 0)) > 0;

        const hasNewFiles = hasDirectEmirates ||
          (window.qualFiles || []).some(f => !f.isFromServer) ||
          (window.uaePoliceFiles || []).some(f => !f.isFromServer) ||
          (window.teachingLicenseFiles || []).some(f => !f.isFromServer);

        const fileUploadResult = hasNewFiles ? await uploadFiles(window.profileState.id) : { success:false };
        
        window.profileState.mondayData = await getAllValues(window.profileState.id);
        
        let finalPercentage = textFieldsResult ? textFieldsResult.tutorCompletion : null;
        if (!finalPercentage) {
            const completionData = await getCompletionPercentage(window.profileState.id);
            finalPercentage = completionData.tutorCompletion;
        }
        
        updateCompletionUI(finalPercentage);
        updateBadgeAndLockState();

            if (fileUploadResult.success) {
                showUIMessage("Files uploaded! Refreshing page...", 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2500); 
                return; 
            }
        
        if ((Object.keys(updates).length > 1) || fileUploadResult.success) {
            showUIMessage("Identity & Credentials saved.", 'success');
        } else {
            showUIMessage("No new information or files to save.", 'info');
        }

      } catch (err) {
        showUIMessage(`Failed to save: ${err.message}`, 'error');
      } finally {
        e.target.disabled = false; e.target.textContent = 'Save Changes & Upload Files';
        if (dom.pageLoader) dom.pageLoader.style.display = 'none';
      }
    });
  }

 if (dom.saveVerifyBtn) {
    dom.saveVerifyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const button = e.target;
      button.disabled = true;
      button.textContent = "Checking...";

      try {
        const completionData = await getCompletionPercentage(window.profileState.id);
        if (completionData.tutorCompletion < 100) {
          validateForVerify({ focusFirst: true, toast: true });
          showIncompleteBanner();
          return;
        }
        const feePaidStatus = window.profileState.mondayData?.[columnIds.feePaid]?.text?.toUpperCase() === "YES";
        const proceedToVerification = async () => {
          try {
            button.textContent = "Processing...";
            const token = await window.$memberstackDom.getMemberCookie();
            const response = await fetch(STRIPE_WORKER_URL, {
              method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ tutorId: window.profileState.id })
            });

            const data = await response.json();

            if (data.url) {
              window.location.href = data.url;
            } else if (data.success) {
              showUIMessage("Profile re-submitted successfully! Refreshing...", 'success');
              setTimeout(() => window.location.reload(), 2000);
            } else {
              throw new Error("An unexpected response was received from the server.");
            }
          } catch (err) {
            showUIMessage(`Submission failed: ${err.message}`, 'error');
          }
        };

        if (feePaidStatus) {
          showConfirmationModal('resubmit-confirm', proceedToVerification);
        } else {
          showConfirmationModal('payment-confirm', proceedToVerification);
        }

      } catch (err) {
        showUIMessage(`An error occurred: ${err.message}`, 'error');
      } finally {
        if (!window.location.href.includes('stripe')) {
            button.disabled = false;
            button.textContent = 'Submit Profile for Review';
        }
      }
    });
  }
  
  if (dom.availabilityCheckbox) {
      dom.availabilityCheckbox.addEventListener("change", async () => {
          const isChecked = dom.availabilityCheckbox.checked;
          const availabilityStatus = isChecked ? "Unavailable" : "Available";
          try {
              const updates = { [columnIds.availability]: availabilityStatus };
              
              const result = await updateColumnsAndGetCompletion(window.profileState.id, updates);
              
              window.profileState.mondayData = await getAllValues(window.profileState.id);
              updateCompletionUI(result.tutorCompletion);
              showUIMessage(`Availability set to ${availabilityStatus}`, 'success');
          } catch (error) {
              showUIMessage("Failed to update availability status.", 'error');
          }
      });
  }
  
  const profileImage = document.querySelector(".ms-profile-image-preview");
  if (profileImage) {
      const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
              if (mutation.type === "attributes" && mutation.attributeName === "src") {
                  setTimeout(async () => {
                      const completionData = await getCompletionPercentage(window.profileState.id);
                      updateCompletionUI(completionData.tutorCompletion);
                  }, 10000);
              }
          }
      });
      observer.observe(profileImage, { attributes: true, attributeFilter: ["src"] });
  }

    (async function handleStripeReturn() {
    const searchParams = window.location.search;
    const statusMatch = searchParams.match(/status=success/);
    const tutorIdMatch = searchParams.match(/tutorId=(\d+)/);

    const isAlreadyPaid = searchParams.includes('status=already_paid');

    const status = statusMatch ? "success" : null;
    const tutorIdFromURL = tutorIdMatch ? tutorIdMatch[1] : null;

    if (status !== "success" || !tutorIdFromURL) { 
      return; 
    }

    if (!isAlreadyPaid) {
      showUIMessage("Payment successful! Finalizing submission...", 'info', 5000);
    }

  })();
  initializeProfile();

  const paymentTypeMap = {
      "btn-free-select": "FREE_PLAN", 
      "btn-pro-yearly": "PRO_YEARLY",
      "btn-pro-monthly": "PRO_MONTHLY"
    };

async function createCheckoutSession(paymentType, button) {
    button.disabled = true;
    button.textContent = "Processing...";

    if (paymentType === "FREE_PLAN") {
      showUIMessage("Applying Free plan to account...", "info");
    } else {
      showUIMessage("Redirecting to checkout...", "info");
    }

    try {
      const token = await window.$memberstackDom.getMemberCookie();
      if (!token) throw new Error("Could not get user authentication token.");
      
      const res = await fetch("https://tc-staging-stripe.tutorchooser.workers.dev/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ paymentType })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "An error occurred.");

      if (data.url) {

        window.location.href = data.url;
      } else if (paymentType === "FREE_PLAN" && data.success) {
        showUIMessage("Free plan successfully applied! Refreshing profile...", "success");
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error("No redirect URL received from server.");
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      showUIMessage(`Error: ${err.message}`, "error");
      button.disabled = false;
      
      if (paymentType === "FREE_PLAN") {
          button.textContent = "Select Free Plan";
      } else {
          button.textContent = `Choose ${paymentType.replace("_", " – ")}`;
      }
    }
  }
  Object.keys(paymentTypeMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        const type = paymentTypeMap[id];
        createCheckoutSession(type, btn);
      });
    }
  });
});
</script>