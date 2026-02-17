document.addEventListener("DOMContentLoaded", async () => {
    // ===================================================================
    // 1. SELECTORS & STATE VARIABLES
    // ===================================================================
    
    // UI Elements
    const container = document.getElementById("tutor-cards-container");
    const template = document.querySelector(".tutor-card-template");
    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filterContainer = document.querySelector('.filter-container');
    const mobileApplyButton = document.getElementById('apply-filters-mobile');
    const clearFiltersBtnMobile = document.getElementById('clear-filters-btn');
    const clearFiltersBtnDesktop = document.getElementById('clear-filters-desktop-btn');
    const filterHeaders = document.querySelectorAll('.filter-header');
    const searchInputs = document.querySelectorAll('.filter-search');
    const infiniteScrollTrigger = document.getElementById('infinite-scroll-trigger');
    const spinner = document.getElementById("loading-spinner");
    const returnToTopButton = document.getElementById("return-to-top");
    
    // Search UI Elements
    const aiSearchInput = document.getElementById("ai-search-input");
    const aiSearchBtn = document.getElementById("ai-search-btn");
    const searchContainer = document.querySelector('.search-input-container');
    const searchWrapper = document.querySelector('.smart-search-wrapper');
    const aiResetLink = document.getElementById('ai-reset-link');

    // Sliders
    const experienceSlider = document.getElementById('experience-slider');
    const experienceValue = document.getElementById('experience-value');
    const rateSlider = document.getElementById('rate-slider');
    const rateValue = document.getElementById('rate-value');

    // Data & Config
    const desktopMediaQuery = window.matchMedia("(min-width: 992px)");
    const experienceLevels = ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "10+ years"];
    const experienceDisplayLabels = ["Any Experience", "1+ Years", "3+ Years", "6+ Years", "10+ Years"];
    
    // Application State
    let nextCursor = null;
    let activeFilters = {};
    let isLoading = false;
    let hasMoreResults = true;
    let abortController = new AbortController();
    let experienceSliderTouched = false;
    let rateSliderTouched = false;
    let allLoadedTutors = [];
    
    // Track if the current active search is from AI (to control strictMode)
    let currentSearchIsAi = false;

    // ===================================================================
    // 2. TYPEWRITER EFFECT
    // ===================================================================
    if (aiSearchInput) {
        const phrases = [
            "Try \"Math tutor in Dubai for Year 8\"",
            "Try \"Female English tutor online\"",
            "Try \"Urdu speaking Physics teacher\"",
            "Try \"IB Biology tutor for 17 year old\"",
            "Try \"Primary school teacher in Abu Dhabi\""
        ];

        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;

        function type() {
            const currentPhrase = phrases[phraseIndex];
            
            if (isDeleting) {
                aiSearchInput.setAttribute("placeholder", currentPhrase.substring(0, charIndex - 1));
                charIndex--;
                typeSpeed = 50; 
            } else {
                aiSearchInput.setAttribute("placeholder", currentPhrase.substring(0, charIndex + 1));
                charIndex++;
                typeSpeed = 100; 
            }

            if (!isDeleting && charIndex === currentPhrase.length) {
                isDeleting = true;
                typeSpeed = 2000; 
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        }

        if (document.activeElement !== aiSearchInput) {
            type();
        }
        
        aiSearchInput.addEventListener('focus', () => {
            aiSearchInput.setAttribute("placeholder", "Type your request here...");
        });
    }

    // ===================================================================
    // 3. HELPER FUNCTIONS
    // ===================================================================

    function updateAllFilterCounts() {
        const filterGroups = document.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            if (group.querySelector('.filter-range-slider')) return; 

            const header = group.querySelector('.filter-header');
            if (!header) return;

            const arrow = header.querySelector('.arrow');
            if (!header.dataset.originalText && header.childNodes[0].nodeValue) {
                header.dataset.originalText = header.childNodes[0].nodeValue.trim();
            }
            
            const originalHeaderText = header.dataset.originalText || '';
            const selectedCount = group.querySelectorAll('input:checked').length;

            header.innerHTML = selectedCount > 0 
                ? `${originalHeaderText} <span class="filter-count"> (${selectedCount})</span> ` 
                : `${originalHeaderText} `;
            
            if (arrow) header.appendChild(arrow);
        });
    }

    function expandFilteredGroups() {
        const filterGroups = document.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            const header = group.querySelector('.filter-header');
            const options = group.querySelector('.filter-options');
            if (!header || !options) return;

            const hasSelection = group.querySelector('input:checked');
            let sliderHasBeenUsed = false;
            
            const filterKey = group.dataset.filterKey;
            if (filterKey === 'yearsOfTeachingExperience' && experienceSliderTouched) sliderHasBeenUsed = true;
            if (filterKey === 'hourlyRate' && rateSliderTouched) sliderHasBeenUsed = true;

            if (hasSelection || sliderHasBeenUsed) {
                header.classList.add('open');
                options.classList.add('open');
            }
        });
    }

    function getTwoLetterInitials(name = "") {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (Array.from(parts[0])[0] + Array.from(parts[1])[0]).toUpperCase();
        }
        const chars = Array.from(parts[0] || "");
        return ((chars[0] || "?") + (chars[1] || "")).toUpperCase();
    }

    function svgInitialAvatar(initials, { w = 250, h = 250, bg = "#E5CB96", color = "#031F33", fontSize = 96, fontWeight = 700, fontFamily = "Cambria, serif" } = {}) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${initials}</text></svg>`;
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    // ===================================================================
    // 4. FILTER LOGIC
    // ===================================================================

    function collectFilters() {
        const filters = {};
        const getCheckedValues = (key) => Array.from(document.querySelectorAll(`.filter-group[data-filter-key="${key}"] input:checked`)).map((cb) => cb.value);
        const addFilter = (key, value) => {
            if ((Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value)) {
                filters[key] = value;
            }
        };

        addFilter('gender', getCheckedValues('gender'));
        addFilter('verifiedEducationLevel', getCheckedValues('verifiedEducationLevel'));
        addFilter('curriculum', getCheckedValues('curriculum'));
        addFilter('examBoard', getCheckedValues('examBoard'));
        addFilter('preferredTutoringMode', getCheckedValues('preferredTutoringMode'));
        addFilter('preferredTutoringTimes', getCheckedValues('preferredTutoringTimes'));
        addFilter('providerType', getCheckedValues('providerType'));
        addFilter('specialNeedsExperience', getCheckedValues('specialNeedsExperience'));
        addFilter('languagesAbleToTeachIn', getCheckedValues('languagesAbleToTeachIn'));
        addFilter('subjectsPrimary', getCheckedValues('subjectsPrimary'));
        addFilter('subjectsSecondary', getCheckedValues('subjectsSecondary'));
        addFilter('subjectsSixthForm', getCheckedValues('subjectsSixthForm'));
        addFilter('nationality', getCheckedValues('nationality')); // Ensure nationality is collected
        
        const location = getCheckedValues('location');
        if (location.length > 0) addFilter('location', location[0]);

        if (experienceSlider && experienceSliderTouched) {
            const selectedIndex = parseInt(experienceSlider.value, 10);
            
            // .slice(i) creates a new array starting from index 'i' to the end.
            // Example: If index is 3 (6–10 years), it grabs 3 and 4 (10+ years).
            const applicableBuckets = experienceLevels.slice(selectedIndex);
            
            addFilter('yearsOfTeachingExperience', applicableBuckets);
        }
        if (rateSlider && rateSliderTouched) {
            const maxRate = parseInt(rateSlider.value);
            const allRateOptions = ["AED 100", "AED 150", "AED 200", "AED 250", "AED 300", "AED 350", "AED 400", "AED 450", "AED 500"];
            const applicableRates = allRateOptions.filter(rateString => {
                const rateValue = parseInt(rateString.replace('AED ', ''));
                return rateValue <= maxRate;
            });
            addFilter('hourlyRate', applicableRates);
        }

        return filters;
    }

    // 🚨 UPDATED: Accepts 'fromAi' to control strictMode
    function applyFilters(fromAi = false) {
        abortController.abort();
        abortController = new AbortController();
        container.innerHTML = '';
        nextCursor = null;
        hasMoreResults = true;
        allLoadedTutors = [];
        activeFilters = collectFilters();
        
        // Update global AI state based on source
        currentSearchIsAi = fromAi;
        
        fetchTutors(activeFilters, null, currentSearchIsAi);
    }

    function clearAndApplyFilters(event, isMobileClear = false) {
        if (event) event.preventDefault();

        // ============================================================
        // 1. 🚨 FIX: WIPE MEMORY IMMEDIATELY
        // ============================================================
        sessionStorage.removeItem('selectedTutorMeta');
        sessionStorage.removeItem('savedTutorList');
        sessionStorage.removeItem('savedNextCursor');
        sessionStorage.removeItem('savedScrollY');
        
        // Reset internal state
        activeFilters = {}; 
        // ============================================================

        // 2. Clear Manual Filters (Checkboxes)
        const allCheckedInputs = document.querySelectorAll('.filter-container input:checked');
        allCheckedInputs.forEach(input => input.checked = false);

        // 3. Reset Sliders
        if (experienceSlider) {
            experienceSlider.value = 2;
            experienceValue.textContent = '';
            experienceSliderTouched = false;
        }
        if (rateSlider) {
            rateSlider.value = 300;
            rateValue.textContent = '';
            rateSliderTouched = false;
        }
        
        // 4. Clear Internal Filter Search Bars
        searchInputs.forEach(input => input.value = '');

        // 5. Close Accordions
        document.querySelectorAll('.filter-options.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.filter-header.open').forEach(el => el.classList.remove('open'));
        
        // --- CLEAR AI SEARCH BAR & UI ---
        const aiInput = document.getElementById('ai-search-input');
        const nudgeText = document.getElementById('nudge-text');
        const chipsContainer = document.getElementById('ai-chips-area');
        const quickFilters = document.querySelector('.quick-filters-scroll');
        const aiResetLink = document.getElementById('ai-reset-link');

        if (aiInput) aiInput.value = ''; // Wipe text
        if (nudgeText) nudgeText.innerHTML = ''; // Wipe nudge
        if (chipsContainer) chipsContainer.innerHTML = ''; // Wipe chips
        if (aiResetLink) aiResetLink.style.display = 'none'; // Hide "Start Again"
        if (quickFilters) quickFilters.style.display = 'flex'; // Show Quick Chips again
        
        // Remove AI Error message if it exists
        const existingError = document.getElementById('ai-search-error');
        if (existingError) existingError.remove();
        // -------------------------------------------

        updateAllFilterCounts();
        
        // 6. Trigger Search (resets to strictMode=true / default)
        applyFilters(false);
        
        // 7. Mobile specific UI handling
        if (isMobileClear && !desktopMediaQuery.matches && filterContainer.classList.contains('is-visible')) {
            filterContainer.classList.remove('is-visible');
            filterToggleButton.textContent = '☰ Filter';
            const wrapper = document.querySelector('.filter-actions-wrapper');
            if (wrapper) {
                const y = wrapper.getBoundingClientRect().top + window.pageYOffset - 8;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    }

    function resetFilterUIToActive() {
        document.querySelectorAll('.filter-container input:checked').forEach(input => input.checked = false);
        if (experienceSlider) { experienceSlider.value = 2; experienceValue.textContent = ''; experienceSliderTouched = false; }
        if (rateSlider) { rateSlider.value = 300; rateValue.textContent = ''; rateSliderTouched = false; }
        restoreFiltersFromSession(); 
        updateAllFilterCounts();
        expandFilteredGroups();
    }

    // ===================================================================
    // 5. SESSION & STATE MANAGEMENT
    // ===================================================================
    function restoreFiltersFromSession() {
        if (Object.keys(activeFilters).length === 0) return;
        for (const filterKey in activeFilters) {
            const filterValues = activeFilters[filterKey];
            const valuesToCheck = Array.isArray(filterValues) ? filterValues : [filterValues];

            if (filterKey === 'yearsOfTeachingExperience' && experienceSlider) {
                const savedValue = valuesToCheck[0];
                const index = experienceLevels.indexOf(savedValue);
                if (index > -1) { experienceSlider.value = index; experienceValue.textContent = experienceDisplayLabels[index]; experienceSliderTouched = true; }
            } else if (filterKey === 'hourlyRate' && rateSlider) {
                const maxRateValue = valuesToCheck.reduce((max, rateStr) => {
                    const val = parseInt(rateStr.replace('AED ', ''));
                    return val > max ? val : max;
                }, 0);
                if (maxRateValue > 0) { rateSlider.value = maxRateValue; rateValue.textContent = `Up to AED ${maxRateValue}`; rateSliderTouched = true; }
            } else {
                valuesToCheck.forEach(value => {
                    const checkbox = document.querySelector(`.filter-group[data-filter-key="${filterKey}"] input[value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    }

    function restoreSessionState() {
        const savedTutorsJSON = sessionStorage.getItem("savedTutorList");
        const savedScrollY = sessionStorage.getItem("savedScrollY");
        const savedFiltersJSON = sessionStorage.getItem("selectedTutorMeta");

        if (savedTutorsJSON && savedScrollY) {
            allLoadedTutors = JSON.parse(savedTutorsJSON);
            nextCursor = sessionStorage.getItem("savedNextCursor");
            hasMoreResults = !!nextCursor;
            activeFilters = JSON.parse(savedFiltersJSON); 
            renderTutors(allLoadedTutors);
            setTimeout(() => { window.scrollTo(0, parseInt(savedScrollY, 10)); }, 0);
            return true;
        }
        return false;
    }

    // ===================================================================
    // 6. DATA FETCHING (API) - 🚨 UPDATED for strictMode
    // ===================================================================

    async function fetchTutors(filters, cursor, isAiContext = false) {
        if (isLoading && cursor !== null) return;
        isLoading = true;
        if (filterContainer) filterContainer.style.pointerEvents = 'none';
        if (spinner) spinner.style.display = "block";
        
        // 🚨 ADD PARAM IF AI CONTEXT
        const queryParams = isAiContext ? '&strictMode=false' : '';
        const url = 'https://tc-staging-vector-search.tutorchooser.workers.dev/filter?limit=9' + queryParams;
        
        const body = { ...filters };
        if (cursor) body.cursor = cursor;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: abortController.signal,
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Worker responded with status: ${response.status}`);
            const data = await response.json();
            
            allLoadedTutors.push(...(data.results || [])); 
            renderTutors(data.results || []);
            nextCursor = data.next || null;
            hasMoreResults = !!nextCursor;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted.');
            } else {
                console.error("❌ Error fetching tutors:", err);
                if (container.innerHTML === '') {
                    container.innerHTML = '<p>Could not load tutors. Please try again later.</p>';
                }
                hasMoreResults = false;
            }
        } finally {
            isLoading = false;
            if (filterContainer) filterContainer.style.pointerEvents = 'auto';
            if (spinner) spinner.style.display = "none";
        }
    }

    // ===================================================================
    // 7. RENDERING (No Changes needed here usually)
    // ===================================================================
    function renderTutors(tutors) {
        if (!template) return;
        if (tutors.length === 0 && container.innerHTML === '') {
            container.innerHTML = '<p style="text-align: center; font-family: Cambria, serif; padding: 2rem;">No tutors found matching your criteria.</p>';
        }

        tutors.forEach((tutor) => {
            const card = template.cloneNode(true);
            card.className = "tutor-card";
            card.style.display = "flex";

            const subscriptionPlan = tutor.tutorSubscriptionPlan || "";
            const tutorName = tutor.name || "Tutor";
            
            const imgEl = card.querySelector(".tutor-photo");
            const initials = getTwoLetterInitials(tutorName);
            const placeholder = svgInitialAvatar(initials);
            imgEl.src = placeholder;
            imgEl.classList.remove("loaded");

            const realUrl = tutor.photoUrl || "";
            if (realUrl) {
                const hiResImage = new Image();
                hiResImage.onload = () => { imgEl.src = hiResImage.src; imgEl.classList.add("loaded"); };
                hiResImage.src = realUrl;
            } else { imgEl.classList.add("loaded"); }

            const oldBadge = card.querySelector('.pro-badge');
            if(oldBadge) oldBadge.style.display = 'none';

            const content = document.createElement('div');
            content.className = 'card-content';

            const headerRow = document.createElement('div');
            headerRow.className = 'header-row';
            const nameH3 = document.createElement('h3');
            nameH3.className = 'tutor-name';
            nameH3.textContent = tutorName;
            headerRow.appendChild(nameH3);
            content.appendChild(headerRow);

            const infoGrid = document.createElement('div');
            infoGrid.className = 'tutor-info-grid';
            const createRow = (label, value, isHighlight = false) => {
                const row = document.createElement('div');
                row.className = isHighlight ? 'info-row highlight-row' : 'info-row';
                row.innerHTML = `<span class="info-label">${label}:</span> <span class="info-value">${value}</span>`;
                return row;
            };

            infoGrid.appendChild(createRow('Loc', tutor.location || "N/A"));
            infoGrid.appendChild(createRow('Exp', tutor.yearsOfTeachingExperience || "N/A"));
            infoGrid.appendChild(createRow('Mode', tutor.preferredTutoringMode || "N/A"));
            if (tutor.languagesAbleToTeachIn && tutor.languagesAbleToTeachIn.length > 0) {
                infoGrid.appendChild(createRow('Lang', tutor.languagesAbleToTeachIn.join(', ')));
            }
            infoGrid.appendChild(createRow('Rate', tutor.hourlyRate || "N/A", true));
            content.appendChild(infoGrid);
            card.appendChild(content);

            if (subscriptionPlan.startsWith("PRO_")) {
                const proStar = document.createElement('div');
                proStar.className = 'pro-star-badge';
                proStar.innerHTML = `<svg class="pro-star-svg" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.869 1.4-8.168L.132 9.21l8.2-1.192z"/><span class="pro-star-text">PRO</span>`;
                card.appendChild(proStar);
            }

            const viewLink = document.createElement('div');
            viewLink.className = 'view-profile-link';
            viewLink.innerHTML = `VIEW PROFILE <svg viewBox="0 0 24 24"><path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/></svg>`;
            card.appendChild(viewLink);

            const saveState = () => {
                sessionStorage.setItem("selectedTutorMeta", JSON.stringify(activeFilters));
                sessionStorage.setItem("savedTutorList", JSON.stringify(allLoadedTutors));
                sessionStorage.setItem("savedNextCursor", nextCursor);
                sessionStorage.setItem("savedScrollY", window.scrollY);
            };

            if (tutor.id) {
                card.href = `/view-teacher?id=${tutor.id}`;
                
                // Add a wrapper function to handle both state saving and tracking
                card.addEventListener('click', (e) => {
                    // 1. Run your existing state saving logic
                    saveState();

                    // 2. 📊 Send Event to Microsoft Clarity
                    if (window.clarity) {
                        // Track that a card was clicked (for counts)
                        window.clarity("event", "Tutor_Card_Click");

                        // OPTIONAL: Store details about WHICH tutor was clicked
                        // (This lets you filter recordings by specific tutors)
                        window.clarity("set", "clicked_tutor_name", tutorName);
                        window.clarity("set", "clicked_tutor_id", tutor.id);
                    }
                });
            } else { 
                card.removeAttribute('href'); 
            }

            const oldContent = card.querySelector('.card-content');
            if (oldContent) oldContent.remove(); 
            card.appendChild(content);
            card.appendChild(viewLink);
            const star = card.querySelector('.pro-star-badge');
            if(star) card.appendChild(star);

            container.appendChild(card);
        });
    }

    // ===================================================================
    // 8. EVENT LISTENERS
    // ===================================================================

    if (experienceSlider && experienceValue) {
        experienceSlider.addEventListener('input', () => {
            if (!experienceSliderTouched) experienceSliderTouched = true;
            
            // 🚨 CHANGE THIS LINE to use experienceDisplayLabels
            experienceValue.textContent = experienceDisplayLabels[experienceSlider.value]; 
        });
    }
    if (rateSlider && rateValue) {
        rateSlider.addEventListener('input', () => {
            if (!rateSliderTouched) rateSliderTouched = true;
            rateValue.textContent = `Up to AED ${rateSlider.value}`;
        });
    }
    if (clearFiltersBtnDesktop) clearFiltersBtnDesktop.addEventListener('click', clearAndApplyFilters);
    if (clearFiltersBtnMobile) clearFiltersBtnMobile.addEventListener('click', (e) => clearAndApplyFilters(e, true));

    if (filterToggleButton) {
        const wrapper = document.querySelector('.filter-actions-wrapper');
        filterToggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = filterContainer.classList.contains('is-visible');
            if (isOpen) {
                if (!desktopMediaQuery.matches) resetFilterUIToActive(); 
                filterContainer.classList.remove('is-visible');
                filterToggleButton.textContent = '☰ Filter';
            } else {
                filterContainer.classList.add('is-visible');
                filterToggleButton.textContent = '✕ Close Filters';
                const y = wrapper.getBoundingClientRect().top + window.pageYOffset - 8;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    }

    filterHeaders.forEach(header => {
        header.addEventListener('click', function() {
            this.classList.toggle('open');
            this.nextElementSibling.classList.toggle('open');
        });
    });

    if (filterContainer) {
        filterContainer.addEventListener('change', (event) => {
            if (event.target.type === 'checkbox' || event.target.type === 'range') {
                if (event.target.type === 'checkbox') updateAllFilterCounts();
                // Manual changes mean strictMode = true (default)
                if (desktopMediaQuery.matches) applyFilters(false);
            }
        });
    }

    if (mobileApplyButton) {
        mobileApplyButton.addEventListener('click', function(e) {
            e.preventDefault();
            applyFilters(false);
            
            filterContainer.classList.remove('is-visible');
            mobileApplyButton.classList.remove('is-visible');
            filterToggleButton.textContent = '☰ Filter';
            const wrapper = document.querySelector('.filter-actions-wrapper');
            if (wrapper) {
                const y = wrapper.getBoundingClientRect().top + window.pageYOffset - 8;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    }

    if (returnToTopButton) {
        window.addEventListener("scroll", function() { returnToTopButton.style.display = (window.scrollY > 300) ? "flex" : "none"; });
        returnToTopButton.addEventListener("click", function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const filterValue = this.value.toLowerCase();
            const labels = this.parentElement.querySelectorAll('label');
            labels.forEach(label => {
                const labelText = label.textContent.toLowerCase();
                label.style.display = labelText.includes(filterValue) ? '' : 'none';
            });
        });
    });

    window.addEventListener('pageshow', function(event) {
        if (event.persisted) { updateAllFilterCounts(); expandFilteredGroups(); }
    });

    function makeSingleSelect(filterKey) {
        const checkboxes = document.querySelectorAll(`.filter-group[data-filter-key="${filterKey}"] input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('click', function() {
                checkboxes.forEach(otherCheckbox => { if (otherCheckbox !== this) otherCheckbox.checked = false; });
            });
        });
    }
    
    ['location', 'gender', 'curriculum', 'examBoard', 'preferredTutoringMode', 'providerType', 'languagesAbleToTeachIn', 'nationality'].forEach(key => makeSingleSelect(key));

    if (aiResetLink) {
        aiResetLink.addEventListener('click', (e) => {
            e.preventDefault();
            const aiInput = document.getElementById('ai-search-input');
            const nudgeText = document.getElementById('nudge-text');
            if (aiInput) aiInput.value = '';
            if (nudgeText) nudgeText.innerHTML = '';
            const chipsContainer = document.getElementById('ai-chips-area');
            if (chipsContainer) chipsContainer.innerHTML = '';
            aiResetLink.style.display = 'none';
            const quickFilters = document.querySelector('.quick-filters-scroll');
            if (quickFilters) quickFilters.style.display = 'flex'; 
            clearAndApplyFilters(e, false);
        });
    }

// ===================================================================
    // 9. AI SEARCH INTEGRATION - WITH FRONTEND "GCSE" FALLBACK
    // ===================================================================

    window.addEventListener('ai-search-complete', (e) => {
        const aiData = e.detail;
        
        // 🚨 FRONTEND FALLBACK: Manually fix "GCSE" if the AI missed it
        // We look at the actual text the user typed in the search box
        const searchInput = document.getElementById("ai-search-input");
        const rawUserQuery = searchInput ? searchInput.value.toLowerCase() : "";

        if (!aiData.education_level) {
            if (rawUserQuery.includes('gcse') || rawUserQuery.includes('igcse') || rawUserQuery.includes('year 10') || rawUserQuery.includes('year 11')) {
                console.log("⚡️ Frontend Override: Detected GCSE, forcing Secondary Level.");
                aiData.education_level = "Secondary";
            }
            else if (rawUserQuery.includes('a level') || rawUserQuery.includes('as level') || rawUserQuery.includes('sixth form')) {
                console.log("⚡️ Frontend Override: Detected A-Level, forcing Sixth Form.");
                aiData.education_level = "Sixth Form";
            }
        }
        
        // =========================================================
        // REST OF THE LOGIC (Now uses the corrected education_level)
        // =========================================================

        // 1. UI Reset
        const quickFilters = document.querySelector('.quick-filters-scroll');
        if (quickFilters) quickFilters.style.display = 'none';

        const chipsContainer = document.getElementById('ai-chips-area');
        if (chipsContainer) {
            chipsContainer.innerHTML = ''; 
            if (aiResetLink) aiResetLink.style.display = 'inline-block';
            
            const returnedChips = aiData.user_chips || [];
            returnedChips.forEach(text => {
                const chip = document.createElement('div');
                chip.className = 'ai-chip';
                chip.innerHTML = `<span class="emoji">✨</span> ${text}`;
                chipsContainer.appendChild(chip);
            });

            // This will now appear because we forced aiData.education_level above!
            if (aiData.education_level) {
                 const levelChip = document.createElement('div');
                 levelChip.className = 'ai-chip';
                 levelChip.innerHTML = `<span class="emoji">🎓</span> Level: ${aiData.education_level}`;
                 chipsContainer.appendChild(levelChip);
            }
        }

        const existingError = document.getElementById('ai-search-error');
        if (existingError) existingError.remove();
        
        // 2. Reset Filters
        document.querySelectorAll('.filter-container input:checked').forEach(input => input.checked = false);
        searchInputs.forEach(input => input.value = '');
        if (experienceSlider) { experienceSlider.value = 2; experienceValue.textContent = ''; experienceSliderTouched = false; }
        if (rateSlider) { rateSlider.value = 300; rateValue.textContent = ''; rateSliderTouched = false; }

        const applyFuzzyFilter = (groupKey, searchText) => {
            if (!searchText) return false;
            const checkboxes = document.querySelectorAll(`.filter-group[data-filter-key="${groupKey}"] input[type="checkbox"]`);
            for (let box of checkboxes) {
                if (box.value.toLowerCase().includes(searchText.toLowerCase()) || searchText.toLowerCase().includes(box.value.toLowerCase())) {
                    box.checked = true;
                    return true;
                }
            }
            return false;
        };

        // 3. Map Basic Fields
        if (aiData.tutoring_mode) {
            const targetMode = aiData.tutoring_mode.toLowerCase();
            const modeCheckboxes = document.querySelectorAll('.filter-group[data-filter-key="preferredTutoringMode"] input[type="checkbox"]');
            modeCheckboxes.forEach(box => {
                const boxValue = box.value.toLowerCase();
                if (boxValue === targetMode) box.checked = true;
                if (targetMode === 'in person' && boxValue.includes('online') && boxValue.includes('in person')) box.checked = true;
                if (targetMode === 'online' && boxValue.includes('online') && boxValue.includes('in person')) box.checked = true;
            });
        }

        applyFuzzyFilter('location', aiData.location);
        applyFuzzyFilter('curriculum', aiData.curriculum);
        applyFuzzyFilter('examBoard', aiData.exam_board);
        applyFuzzyFilter('specialNeedsExperience', aiData.special_needs);
        applyFuzzyFilter('preferredTutoringTimes', aiData.tutoring_time);
        if (aiData.language && aiData.language.toLowerCase() !== 'english') {
            applyFuzzyFilter('languagesAbleToTeachIn', aiData.language);
        }
        applyFuzzyFilter('verifiedEducationLevel', aiData.verified_education_level);
        applyFuzzyFilter('nationality', aiData.nationality);

        if (aiData.gender) {
            const genderBox = document.querySelector(`.filter-group[data-filter-key="gender"] input[value="${aiData.gender}"]`);
            if (genderBox) genderBox.checked = true;
        }

        // 4. Map Sliders
        if (aiData.max_hourly_rate && rateSlider) {
            let targetVal = parseInt(aiData.max_hourly_rate);
            if (targetVal < 100) targetVal = 100;
            if (targetVal > 500) targetVal = 500;
            targetVal = Math.ceil(targetVal / 50) * 50;
            rateSlider.value = targetVal;
            rateValue.textContent = `Up to AED ${targetVal}`;
            rateSliderTouched = true;
        }

        if (experienceSlider) {
            let targetSliderIndex = -1;
            if (aiData.experience_buckets && Array.isArray(aiData.experience_buckets) && aiData.experience_buckets.length > 0) {
                const indices = aiData.experience_buckets
                    .map(bucket => experienceLevels.indexOf(bucket))
                    .filter(i => i !== -1);
                
                if (indices.length > 0) targetSliderIndex = Math.min(...indices);
            } 
            else if (aiData.min_experience_years) {
                const years = parseInt(aiData.min_experience_years);
                if (years >= 10) targetSliderIndex = 4;
                else if (years >= 6) targetSliderIndex = 3;
                else if (years >= 3) targetSliderIndex = 2;
                else if (years >= 1) targetSliderIndex = 1;
                else targetSliderIndex = 0;
            }

            if (targetSliderIndex !== -1) {
                experienceSlider.value = targetSliderIndex;
                experienceValue.textContent = experienceDisplayLabels[targetSliderIndex];
                experienceSliderTouched = true;
            }
        }

        // ---------------------------------------------------------
        // 5. SMART SUBJECT MAPPING
        // ---------------------------------------------------------
        
        const subjectsList = aiData.subjects || (aiData.subject ? [aiData.subject] : []);

        subjectsList.forEach(rawSubjectName => {
            let subjectTerm = rawSubjectName.toLowerCase();
            let subjectApplied = false;
            
            if (subjectTerm === 'english') subjectTerm = 'english - language';
            
            let targetGroups = [];
            
            // This now uses the CORRECTED education_level from the top of this function
            if (aiData.education_level === 'Secondary') targetGroups = ['subjectsSecondary'];
            else if (aiData.education_level === 'Primary') targetGroups = ['subjectsPrimary'];
            else if (aiData.education_level === 'Sixth Form') targetGroups = ['subjectsSixthForm'];
            else targetGroups = ['subjectsPrimary', 'subjectsSecondary', 'subjectsSixthForm'];

            for (const groupKey of targetGroups) {
                const checkboxes = document.querySelectorAll(`.filter-group[data-filter-key="${groupKey}"] input[type="checkbox"]`);
                for (let box of checkboxes) {
                    if (box.value.toLowerCase() === subjectTerm) {
                        box.checked = true;
                        subjectApplied = true;
                    }
                }
            }

            if (!subjectApplied) {
                for (const groupKey of targetGroups) {
                    if (applyFuzzyFilter(groupKey, rawSubjectName)) {
                        subjectApplied = true;
                        break; 
                    }
                }
            }

            if (!subjectApplied) {
                const chip = document.createElement('div');
                chip.className = 'ai-chip';
                chip.innerHTML = `<span class="emoji">⚠️</span> No category for "${rawSubjectName}"`;
                if(chipsContainer) chipsContainer.appendChild(chip);

                if (!document.getElementById('ai-search-error')) {
                    const noResultsMsg = document.createElement('div');
                    noResultsMsg.id = 'ai-search-error';
                    noResultsMsg.innerHTML = `<p style="color:#781212; padding:15px; text-align:center; background:#fff5f5; border:1px solid #fed7d7; border-radius:8px; margin-bottom:20px;">
                        ⚠️ We currently don't have a specific category for <strong>${rawSubjectName}</strong>. <br>Showing all tutors instead.
                    </p>`;
                    container.parentNode.insertBefore(noResultsMsg, container);
                }
            }
        });

        updateAllFilterCounts();
        expandFilteredGroups();
        applyFilters(true); 
    });

    // ===================================================================
    // 10. STICKY UI LOGIC
    // ===================================================================
    
    if (searchContainer && searchWrapper) {
        const sentinel = document.createElement('div');
        sentinel.style.position = 'absolute';
        sentinel.style.top = '0';
        sentinel.style.height = '1px';
        sentinel.style.width = '100%';
        searchWrapper.parentNode.insertBefore(sentinel, searchWrapper);

        const stickyObserver = new IntersectionObserver((entries) => {
            const wrapperRect = searchWrapper.getBoundingClientRect();
            if (wrapperRect.bottom < -100) { 
                searchContainer.classList.add('is-floating');
                if (filterToggleButton) filterToggleButton.classList.add('is-floating');
            } else {
                searchContainer.classList.remove('is-floating');
                if (filterToggleButton) filterToggleButton.classList.remove('is-floating');
            }
        }, { root: null, threshold: 0, rootMargin: "-100px 0px 0px 0px" });

        stickyObserver.observe(searchWrapper);
        
        window.addEventListener('scroll', () => {
            const rect = searchWrapper.getBoundingClientRect();
            if (rect.bottom < -100) {
                if (!searchContainer.classList.contains('is-floating')) {
                    searchContainer.classList.add('is-floating');
                    if (filterToggleButton) filterToggleButton.classList.add('is-floating');
                }
            } else {
                if (searchContainer.classList.contains('is-floating')) {
                    searchContainer.classList.remove('is-floating');
                    if (filterToggleButton) filterToggleButton.classList.remove('is-floating');
                }
            }
        });
    }

    const scrollToTopIfFloating = () => {
      if (searchContainer && searchContainer.classList.contains("is-floating")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    if (aiSearchBtn) aiSearchBtn.addEventListener("click", scrollToTopIfFloating);
    if (aiSearchInput) {
      aiSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") scrollToTopIfFloating();
      });
    }
    
    // ===================================================================
    // 11. INITIAL LOAD EXECUTION
    // ===================================================================
    
    const isRestored = restoreSessionState();
    restoreFiltersFromSession();
    updateAllFilterCounts();
    expandFilteredGroups();

    if (!isRestored) {
        applyFilters(false);
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreResults && !isLoading) {
            // Keep AI context on scroll if that's what we are viewing
            fetchTutors(activeFilters, nextCursor, currentSearchIsAi);
        }
    }, { rootMargin: '400px' });

    if (infiniteScrollTrigger) {
        observer.observe(infiniteScrollTrigger);
    }
});