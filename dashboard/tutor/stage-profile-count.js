document.addEventListener("DOMContentLoaded", () => {
    // --- Profile Views Counter Logic ---

    // 1. Get references to the HTML elements
    const loader = document.getElementById("profile-views-loader");
    const content = document.getElementById("profile-views-content");
    const numberElement = document.getElementById("profile-views-number");

    // 2. Async function to fetch the live data
    async function fetchProfileViews() {
        if (!window.$memberstackDom) {
            console.error("Memberstack is not available.");
            if (numberElement) numberElement.textContent = "Error";
            return;
        }

        if(loader) loader.style.display = 'block';
        if(content) content.style.display = 'none';

        try {
            // --- THIS BLOCK IS NOW LIVE ---

            // A. Get the auth token and tutor ID from Memberstack
            const authToken = await window.$memberstackDom.getMemberCookie();
            const member = await window.$memberstackDom.getCurrentMember();
            const tutorId = member?.data?.customFields["tutor-id"];

            if (!authToken || !tutorId) {
                throw new Error("Could not retrieve tutor credentials. Please ensure you are logged in.");
            }

            // B. Construct the final URL with the tutor's ID
            const STATS_WORKER_URL = `https://tc-staging-tutor-profile.tutorchooser.workers.dev/tutor/${tutorId}`;
            
            // C. Make the real fetch call to your worker
            const response = await fetch(STATS_WORKER_URL, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch stats. Server responded with ${response.status}`);
            }
            
            const data = await response.json();

            // D. Update the UI with the `profileViews` value from the response
            if (numberElement) {
                // Use `data.profileViews` and default to 0 if it's not available
                numberElement.textContent = data.profileViews ?? 0;
            }

        } catch (error) {
            console.error("Error fetching profile views:", error);
            if (numberElement) {
                numberElement.textContent = "Error"; // Show an error state
            }
        } finally {
            // E. Hide the loader and show the content
            if(loader) loader.style.display = 'none';
            if(content) content.style.display = 'block';
        }
    }

    // Run the function when the page loads
    fetchProfileViews();
});