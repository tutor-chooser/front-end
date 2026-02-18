(function() {
    const CONFIG = {
        getMeetingsUrl: 'https://tc-production-meetings.tutorchooser.workers.dev/get-meetings?limit=4',
        confirmUrl: 'https://tc-production-stripe.tutorchooser.workers.dev/confirm-consultation',
        declineUrl: 'https://tc-production-stripe.tutorchooser.workers.dev/decline-consultation',
        mondayApiUrl: 'https://production.tutorchooser.workers.dev/'  
    };

    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const paginationLoader = document.getElementById('pagination-loader');
    
    let nextCursor = null;
    let isLoading = false;
    let hasActivePlan = false; 

    const responseModal = document.getElementById('response-modal');
    const declineModal = document.getElementById('decline-confirm-modal');
    const acceptModal = document.getElementById('accept-confirm-modal');
    const planModal = document.getElementById('plan-required-modal');
    
    // --- INITIALIZATION ---
    // --- UPDATED INITIALIZATION ---
    (async () => {
        try {
            await window.$memberstackDom.getCurrentMember();
            hasActivePlan = await checkPlanStatus();
            await fetchRequests(true);
            setupEventListeners();

            // 1. Get the plan string directly
            const planName = await getPlanStatusName(); 
            
            // 2. Check ONLY for "FREE"
            if (planName.toUpperCase().includes("FREE")) {
                const banner = document.getElementById('free-plan-banner');
                if (banner) banner.style.display = 'block';
            }
        } catch (err) {
            console.error('[TutorDash] Init error:', err);
            showState('error', 'Could not load data. Please ensure you are logged in.');
        }
    })();

    // --- REPLACED isProUser WITH THIS ---
    async function getPlanStatusName() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            const tutorId = member?.data?.customFields["tutor-id"];
            if (!tutorId) return "";

            const token = await getAuthToken();
            const query = `query($itemId: ID!) { items(ids: [$itemId]) { column_values(ids: ["text_mktk7zs4"]) { text } } }`;
            
            const response = await fetch(CONFIG.mondayApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ query, variables: { itemId: String(tutorId) } })
            });
            
            const json = await response.json();
            // Returns "FREE_PLAN", "PRO_PLAN", etc.
            return json?.data?.items?.[0]?.column_values?.[0]?.text || "";
        } catch (e) { 
            console.error("Error fetching plan name:", e);
            return ""; 
        }
    }

    // --- API & HELPER FUNCTIONS ---
    async function getAuthToken() {
        const token = await window.$memberstackDom.getMemberCookie();
        if (!token) throw new Error('Could not retrieve Memberstack token.');
        return token;
    }

    async function isProUser() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            const tutorId = member?.data?.customFields["tutor-id"];
            if (!tutorId) return false;

            const token = await getAuthToken();
            const query = `query($itemId: ID!) { items(ids: [$itemId]) { column_values(ids: ["text_mktk7zs4"]) { text } } }`;
            const response = await fetch(CONFIG.mondayApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ query, variables: { itemId: String(tutorId) } })
            });
            const json = await response.json();
            const planName = json?.data?.items?.[0]?.column_values?.[0]?.text || "";
            return planName.toUpperCase().includes("PRO");
        } catch (e) { return false; }
    }

    async function checkPlanStatus() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            const tutorId = member?.data?.customFields["tutor-id"];
            if (!tutorId) return false;

            const token = await getAuthToken();
            const query = `query($itemId: ID!) { items(ids: [$itemId]) { column_values(ids: ["text_mktk7zs4"]) { id, text } } }`;
            const variables = { itemId: String(tutorId) };

            const response = await fetch(CONFIG.mondayApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": token },
                body: JSON.stringify({ query, variables })
            });
            if (!response.ok) throw new Error("API call failed");

            const json = await response.json();
            const planColumn = json?.data?.items?.[0]?.column_values?.[0];
            return !!planColumn?.text;
        } catch (error) {
            console.error("Failed to check plan status:", error);
            return false;
        }
    }

    async function sendTutorResponse(requestId, action, reason = null) {
            const url = action === 'Accepted' ? CONFIG.confirmUrl : CONFIG.declineUrl;

            const payload = { meetingId: requestId };
            if (action === 'Declined' && reason) {
                payload.reason = reason;
            }

            try {
                const token = await getAuthToken();
                const response = await fetch(url, {
                    // Modified to use simple Bearer token as per engineer's check
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(await response.text());
                
                const data = await response.json();

                // 🚀 NEW LOGIC: Handle Stripe Redirect for Free Plan tutors
                if (action === 'Accepted' && data.url) {
                    window.location.href = data.url;
                    return; // Exit function as we are redirecting
                }

                // Handle Standard Success (Pro Tutors or Declined requests)
                let successMessage = action === 'Accepted' 
                    ? "Thanks for accepting! An email with contact details will be sent shortly."
                    : 'You have successfully declined the request.';

                const responseModalMessage = document.getElementById('response-modal-message');
                if(responseModalMessage) responseModalMessage.textContent = successMessage;
                
                responseModal.classList.add('visible');
                document.getElementById('response-modal-overlay').classList.add('visible');

            } catch (error) {
                console.error(`Failed to send response for meeting ${requestId}:`, error);
                alert("An error occurred while processing your response. Please try again.");
            } finally {
                // Only refresh if we didn't redirect to Stripe
                if (action !== 'Accepted' || !window.location.href.includes('stripe')) {
                    fetchRequests(true);
                }
            }
        }

    async function fetchRequests(isInitialLoad = false) {
        if (isLoading) return;
        isLoading = true;

        if (isInitialLoad) {
            showState('loading', '');
            nextCursor = null;
        } else {
            loadMoreBtn.style.display = 'none';
            paginationLoader.style.display = 'block';
        }

        try {
            const token = await getAuthToken();
            const url = nextCursor ? `${CONFIG.getMeetingsUrl}&cursor=${nextCursor}` : CONFIG.getMeetingsUrl;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
            
            const data = await response.json();
            renderTable(data.meetings || [], isInitialLoad);
            nextCursor = data.next || null;
            loadMoreBtn.style.display = nextCursor ? 'block' : 'none';
        } catch (error) {
            console.error('[TutorDash] Failed to fetch requests:', error);
            if (isInitialLoad) showState('error', 'Could not load your requests.');
        } finally {
            isLoading = false;
            paginationLoader.style.display = 'none';
        }
    }

    // --- UI & RENDERING FUNCTIONS ---
    function setupEventListeners() {
      const declineConfirmBtn = document.getElementById('decline-confirm-button');
      const acceptConfirmBtn = document.getElementById('accept-confirm-button');

      document.body.addEventListener('click', async (event) => {
          const button = event.target;
          const action = button.dataset.action;
          const requestId = button.dataset.requestId;

          if (action === 'Accepted' || action === 'Declined') {
              if (!hasActivePlan) {
                  planModal.classList.add('visible');
                  document.getElementById('plan-required-overlay').classList.add('visible');
                  return;
              }

              if (action === 'Accepted') {
                    const planName = await getPlanStatusName();
                    const planNameUpper = planName.toUpperCase();
                    
                    const isPro = planNameUpper.includes("PRO");
                    const isStarter = planNameUpper.includes("STARTER");
                    
                    const acceptModalPara = acceptModal.querySelector('p');
                    
                    // 🚀 Updated Dynamic Pricing Logic
                    if (isPro) {
                        acceptModalPara.innerHTML = "As a <b>Pro Member</b>, this consultation is free. By accepting, your contact details will be shared with the parent.";
                    } else if (isStarter) {
                        acceptModalPara.innerHTML = "By accepting, a one-time consultation fee of <b>100 AED</b> (Starter Discount) will be charged to you. Your contact details will then be shared with the parent.";
                    } else {
                        // Fallback for FREE plan or any other non-pro/non-starter plan
                        acceptModalPara.innerHTML = "By accepting, a one-time consultation fee of <b>150 AED</b> will be charged to you. Your contact details will then be shared with the parent.";
                    }
                    
                    acceptConfirmBtn.dataset.requestId = requestId;
                    acceptModal.classList.add('visible');
                    document.getElementById('accept-confirm-overlay').classList.add('visible');
                }
          }

          // Handle modal CONFIRMATION clicks
          if (button === acceptConfirmBtn || button === declineConfirmBtn) {
              const modalAction = button === acceptConfirmBtn ? 'Accepted' : 'Declined';
              const reqId = button.dataset.requestId;
              let reason = null; 

              if (modalAction === 'Declined') {
                  const reasonDropdown = document.getElementById('decline-reason-dropdown');
                  reason = reasonDropdown.value;
                  if (!reason) {
                      alert('Please select a reason for declining.');
                      return; 
                  }
              }

              button.disabled = true;
              button.textContent = 'Saving...';

              await sendTutorResponse(reqId, modalAction, reason);

              button.disabled = false;
              button.textContent = modalAction === 'Accepted' ? 'Confirm Accept' : 'Confirm Decline';
              button.closest('.glass-modal').classList.remove('visible');
              button.closest('.glass-modal').previousElementSibling.classList.remove('visible');

              if (modalAction === 'Declined') {
                  document.getElementById('decline-reason-dropdown').selectedIndex = 0;
              }
          }

          // Handle all modal CANCEL/DISMISS buttons
          if(button.id.includes('-cancel-') || button.id.includes('-dismiss') || button.id.includes('plan-required-dismiss')) {
               const visibleModal = document.querySelector('.glass-modal.visible');
               if(visibleModal) {
                    visibleModal.classList.remove('visible');
                    visibleModal.previousElementSibling.classList.remove('visible');
               }
          }
      });

      if (loadMoreBtn) {
          loadMoreBtn.addEventListener('click', () => fetchRequests(false));
      }
  }

    function renderTable(requests, isInitialLoad) {
        if (isInitialLoad) tableBody.innerHTML = '';
        if (isInitialLoad && (!requests || requests.length === 0)) {
            showState('empty', 'You have no active requests.');
            loadMoreBtn.style.display = 'none';
            return;
        }
        requests.forEach(req => {
            tableBody.appendChild(createRowElement(normalizeTutorRequest(req)));
        });
    }

    function normalizeTutorRequest(req) {
        return {
            meetingId: req.id,
            requestDate: req.request_date,
            parentName: req.parent_first_name || 'N/A',
            // 🚨 MAPPING THE NEW FIELDS HERE
            details: {
                age: req.child_age_range,
                curriculum: req.child_curriculum,
                goal: req.goal,
                type: req.lesson_type,
                availability: req.child_availability,
                fallbackMessage: req.message_for_tutor
            },
            tutorResponse: req.tutor_response,
            responseDate: req.response_date,
            requestOutcome: req.request_outcome || null
        };
    }
    
    function createRowElement(req) {
        const row = document.createElement('div');
        row.className = 'table-row';

        const formattedRequestDate = formatDate(req.requestDate);
        const formattedResponseDate = req.responseDate ? formatDate(req.responseDate) : '-';
        let responseHtml;

        // --- Status Logic ---
        const tutorResponse = req.tutorResponse ? req.tutorResponse.toLowerCase() : null;
        const requestOutcome = req.requestOutcome ? req.requestOutcome.toLowerCase() : null;

        if (tutorResponse === 'accepted') {
            responseHtml = `<span class="status-badge ${getStatusClass('accepted')}">Accepted</span>`;
        } else if (tutorResponse === 'declined') {
            responseHtml = `<span class="status-badge ${getStatusClass('declined')}">Declined</span>`;
        } else if (tutorResponse === null && requestOutcome === 'request timed out') {
            responseHtml = `<span class="status-badge ${getStatusClass('timed out')}">Timed Out</span>`;
        } else if (tutorResponse === null && requestOutcome === null) {
            responseHtml = `
                <div class="action-buttons">
                    <button class="btn btn-accept" data-request-id="${req.meetingId}" data-action="Accepted">Accept</button>
                    <button class="btn btn-decline" data-request-id="${req.meetingId}" data-action="Declined">Decline</button>
                </div>`;
        } else {
            const statusText = req.requestOutcome || req.tutorResponse || 'Waiting';
            responseHtml = `<span class="status-badge ${getStatusClass(statusText)}">${escapeHtml(statusText)}</span>`;
        }

        // 🚨 NEW DETAILS HTML GENERATION (Cleaner & Left Aligned)
        let detailsHtml = '';
        
        if (req.details.goal || req.details.age) {
            detailsHtml = `
                <div class="req-container">
                    <div class="req-goal-row">
                        <span class="req-label-primary">Main Goal</span>
                        <span class="req-value-primary">${escapeHtml(req.details.goal || 'No specific goal provided')}</span>
                    </div>
                    <div class="req-meta-grid">
                        <div class="req-meta-item">
                            <span class="req-label">Age</span>
                            <span class="req-value">${escapeHtml(req.details.age || '-')}</span>
                        </div>
                        <div class="req-meta-item">
                            <span class="req-label">Curriculum</span>
                            <span class="req-value">${escapeHtml(req.details.curriculum || '-')}</span>
                        </div>
                        <div class="req-meta-item">
                            <span class="req-label">Type</span>
                            <span class="req-value">${escapeHtml(req.details.type || '-')}</span>
                        </div>
                        <div class="req-meta-item">
                            <span class="req-label">Availability</span>
                            <span class="req-value">${escapeHtml(req.details.availability || '-')}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Fallback for old requests
            detailsHtml = `<span class="cell-value request-details-text">${escapeHtml(req.details.fallbackMessage || 'No details provided.')}</span>`;
        }

        // 🚨 INJECT INTO THE ROW
        row.innerHTML = `
            <div class="table-cell" data-label="Meeting ID">
                <span class="cell-value" style="font-family:monospace; color:#aaa;">${escapeHtml(req.meetingId)}</span>
            </div>
            <div class="table-cell" data-label="Request Date">
                <span class="cell-value">${formattedRequestDate}</span>
            </div>
            <div class="table-cell" data-label="Response Date">
                <span class="cell-value">${formattedResponseDate}</span>
            </div>
            <div class="table-cell" data-label="Parent Name">
                <span class="cell-value" style="font-weight:700; color:var(--brand-dark-blue); font-size:15px;">${escapeHtml(req.parentName)}</span>
            </div>
            <div class="table-cell" data-label="Details">
                ${detailsHtml}
            </div>
            <div class="table-cell" data-label="Status">
                <span class="cell-value">${responseHtml}</span>
            </div>
        `;
        return row;
    }

    function getStatusClass(response) {
        const status = (response || '').toLowerCase();
        if (status.includes('accepted')) return 'status-accepted';
        if (status.includes('declined') || status.includes('rejected') || status.includes('failed') || status.includes('timed out')) {
            return 'status-rejected';
        }
        return 'status-pending';
    }

    function showState(type, message) {
        const indicator = document.createElement('div');
        indicator.className = 'state-indicator';
        if(type === 'loading'){
            indicator.innerHTML = '<div class="loader"></div>';
            tableBody.innerHTML = '';
            tableBody.appendChild(indicator);
        } else {
            indicator.textContent = message;
            tableBody.innerHTML = '';
            tableBody.appendChild(indicator);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB');
        } catch (e) {
            return 'Invalid Date';
        }
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
})();