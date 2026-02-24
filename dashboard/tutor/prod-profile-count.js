document.addEventListener("DOMContentLoaded", () => {
    // --- Profile Views Counter Logic ---

    // 1. Get references to the HTML elements
    const loader = document.getElementById("profile-views-loader");
    const content = document.getElementById("profile-views-content");
    const numberElement = document.getElementById("profile-views-number");

    // Helper function to print exact error on screen
    function showErrorOnScreen(errorText) {
        if (numberElement) {
            numberElement.textContent = "⚠️"; // Change big number to a warning icon
            numberElement.style.fontSize = "3rem"; // Scale it down so it fits
        }
        
        // Find the label underneath and replace it with the diagnostic text
        const labelEl = content ? content.querySelector('.stats-card__label') : null;
        if (labelEl) {
            labelEl.innerHTML = `
                Could not load views.<br>
                <span style="display:inline-block; margin-top:8px; font-size:11px; color:#781212; font-family:monospace; word-wrap:break-word; text-transform:none; line-height:1.2;">
                    Diag: ${errorText}
                </span>
            `;
        }
    }

    // 2. Async function to fetch the live data
    async function fetchProfileViews() {
        if (!window.$memberstackDom) {
            console.error("Memberstack is not available.");
            showErrorOnScreen("Memberstack script blocked or not loaded.");
            if(loader) loader.style.display = 'none';
            if(content) content.style.display = 'block';
            return;
        }

        if(loader) loader.style.display = 'block';
        if(content) content.style.display = 'none';

        try {
            // A. Get the auth token and tutor ID from Memberstack
            const authToken = await window.$memberstackDom.getMemberCookie();
            const member = await window.$memberstackDom.getCurrentMember();
            const tutorId = member?.data?.customFields["tutor-id"];

            // Check if credentials are missing
            if (!authToken) throw new Error("Missing auth token (Cookie blocked?)");
            if (!tutorId) throw new Error("Missing tutor-id in Memberstack data");

            // B. Construct the final URL with the tutor's ID
            // const STATS_WORKER_URL = `https://tc-production-tutor-profile.tutorchooser.workers.dev/tutor/${tutorId}`;
            const STATS_WORKER_URL = `https://api-production-tutor-profile.tutorchooser.ae/tutor/${tutorId}`;
            
            // C. Make the real fetch call to your worker
            const response = await fetch(STATS_WORKER_URL, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server status: ${response.status}`);
            }
            
            const data = await response.json();

            // D. Update the UI with the `profileViews` value from the response
            if (numberElement) {
                // Use `data.profileViews` and default to 0 if it's not available
                numberElement.textContent = data.profileViews ?? 0;
            }

        } catch (error) {
            console.error("Error fetching profile views:", error);
            // Pass the raw technical browser error to our UI helper
            showErrorOnScreen(error.message || error.toString() || "Unknown Fetch Error");
        } finally {
            // E. Hide the loader and show the content
            if(loader) loader.style.display = 'none';
            if(content) content.style.display = 'block';
        }
    }

    // Run the function when the page loads
    fetchProfileViews();
});