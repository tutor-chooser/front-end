(function () {
    const CONFIG = {
        getRequestsUrl: 'https://api-staging-meetings.tutorchooser.ae/get-meetings?limit=4',
    };

    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const paginationLoader = document.getElementById('pagination-loader');

    let nextCursor = null;
    let isLoading = false;

    (async () => {
        try {
            await window.$memberstackDom.getCurrentMember();
            console.log('[ParentDash] Memberstack is ready.');
            await fetchRequests(true);
            setupEventListeners();
        } catch (err) {
            console.error('[ParentDash] Init error:', err);
            showState('error', 'Could not load your requests. Please ensure you are logged in and refresh.');
        }
    })();

    function setupEventListeners() {
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                fetchRequests(false);
            });
        }
    }

    async function getAuthToken() {
        const token = await window.$memberstackDom.getMemberCookie();
        if (!token) throw new Error('Could not retrieve Memberstack token.');
        return token;
    }

    async function fetchRequests(isInitialLoad = false) {
        if (isLoading) return;
        isLoading = true;

        if (isInitialLoad) {
            showState('loading', 'Loading your requests...');
            nextCursor = null;
        } else {
            loadMoreBtn.style.display = 'none';
            paginationLoader.style.display = 'block';
        }

        try {
            const token = await getAuthToken();
            const url = nextCursor ? `${CONFIG.getRequestsUrl}&cursor=${nextCursor}` : CONFIG.getRequestsUrl;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Worker responded with status ${response.status}: ${text}`);
            }
            const data = await response.json();
            
            renderTable(data.meetings || [], isInitialLoad);
            nextCursor = data.next || null;
            
            if (nextCursor) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('[ParentDash] fetchRequests error:', error);
            if (isInitialLoad) {
                showState('error', 'Could not load requests. Please try again later.');
            }
        } finally {
            isLoading = false;
            if (paginationLoader) paginationLoader.style.display = 'none';
        }
    }

    function renderTable(requests, isInitialLoad) {
        if (isInitialLoad) {
            tableBody.innerHTML = '';
        }
        if (isInitialLoad && (!requests || requests.length === 0)) {
            showState('empty', 'You have no active requests.');
            loadMoreBtn.style.display = 'none';
            return;
        }
        requests.sort((a, b) => new Date(b.request_date) - new Date(a.request_date));
        for (const req of requests) {
            tableBody.appendChild(createRowElement(normalizeParentRequest(req)));
        }
    }
    
function normalizeParentRequest(req) {
    return {
        meetingId: req.id,
        requestDate: req.request_date,
        tutorName: req.tutor_first_name || '-',
        tutorResponse: req.tutor_response || 'Waiting',
        responseDate: req.response_date,
        requestOutcome: req.request_outcome || null // ✨ ADD THIS LINE
    };
}

function createRowElement(req) {
    const row = document.createElement('div');
    row.className = 'table-row';

    const formattedRequestDate = formatDate(req.requestDate);
    const formattedResponseDate = req.responseDate ? formatDate(req.responseDate) : '-';
    let statusText = req.tutorResponse; // Default to the tutor's response

    // Prioritize the final request_outcome if it exists
    if (req.requestOutcome && req.requestOutcome.toLowerCase() === 'request timed out') {
        statusText = 'Timed Out';
    } else if (req.tutorResponse.toUpperCase() === 'ACCEPTED' && req.requestOutcome?.toUpperCase() === 'FAILED') {
        statusText = 'Failed';
    }
    
    const statusClass = getStatusClass(statusText);
    const responseHtml = `<span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span>`;

    // This is the corrected HTML structure with the right variables and column count
    row.innerHTML = `
        <div class="table-cell" data-label="Meeting ID">
            <span class="cell-value">${escapeHtml(req.meetingId)}</span>
        </div>
        <div class="table-cell" data-label="Request Date">
            <span class="cell-value">${formattedRequestDate}</span>
        </div>
        <div class="table-cell" data-label="Response Date">
            <span class="cell-value">${formattedResponseDate}</span>
        </div>
        <div class="table-cell" data-label="Tutor Name">
            <span class="cell-value">${escapeHtml(req.tutorName)}</span>
        </div>
        <div class="table-cell" data-label="Response">
             <span class="cell-value">${responseHtml}</span>
        </div>
    `;
    return row;
}

    function showState(type, message) {
        const spinner = type === 'loading' ? `<div class="loader"></div>` : '';
        tableBody.innerHTML = `<div class="state-indicator">${spinner}${message}</div>`;
    }

function getStatusClass(response) {
    const status = (response || '').toLowerCase();
    if (status === 'accepted') return 'status-accepted';
    
    // ✨ ADD 'timed out' TO THIS CONDITION
    if (status === 'rejected' || status === 'declined' || status === 'timed out') {
        return 'status-rejected';
    }
    
    return 'status-pending';
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
