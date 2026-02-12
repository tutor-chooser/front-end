const selectedTutorMeta = JSON.parse(sessionStorage.getItem("selectedTutorMeta") || "{}");
    console.log("Stored Tutor Filter:", selectedTutorMeta);

    async function fetchTutorProfile(id) {
        try {
            const token = await window.$memberstackDom.getMemberCookie();
            const response = await fetch(`https://tc-staging-tutor-profile.tutorchooser.workers.dev/tutor/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"                },
            });

            if (!response.ok) {
                throw new Error(`Worker responded with status: ${response.status}`);
            }

            const json = await response.json();
            console.log("Worker Tutor response:", json);
            return json || null;

        } catch (err) {
            console.error("❌ Error fetching tutor:", err);
            return null;
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function formatList(data) {
        if (typeof data === 'string' && data) {
            return data.replace(/,/g, ', ');
        }
        if (Array.isArray(data) && data.length > 0) {
            return data.join(', ');
        }
        return '—';
    }

    function formatBoolean(value) {
        if (value === true) return 'Yes';
        if (value === false) return 'No';
        return '—';
    }

    function updateProfileBadges(tutor) {
      // Helper function to show an element by its ID
      const showBadge = (id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'inline-block';
      };

      // 1. Logic for "Verified Tutor" badge
      if (tutor.verifiedTutor === 'VERIFIED') {
          showBadge('tutor-verified');
      }

      // 2. Logic for "Teaching License" badge
      if (tutor.teachingLicense === true) {
          showBadge('tutor-teach-license');
      }

      // 3. Logic for "Police Clearance" badge
      if (tutor.uaePoliceClearanceCertificate === true) {
          showBadge('tutor-claear-pol');
      }

      // 🔽🔽 MODIFIED SECTION START 🔽🔽

      // 4. Logic for Education Badges
      const educationLevel = tutor.verifiedEducationLevel?.toLowerCase();
      if (educationLevel) {
          switch (educationLevel) {
              case 'phd': // Corrected to lowercase
                  showBadge('tutor-phd');
                  break;
              case 'masters': // Corrected to lowercase
                  showBadge('tutor-masters');
                  break;
              case 'degree': // Corrected to lowercase
                  showBadge('tutor-degree');
                  break;
              case 'undergraduate': // Corrected to lowercase
                  showBadge('tutor-undergrad');
                  break;
          }
      }

      // 🔼🔼 MODIFIED SECTION END 🔼🔼
  }

    async function renderTutorProfile() {
        const params = new URLSearchParams(window.location.search);
        const tutorId = params.get("id");
        if (!tutorId) return;

        const tutor = await fetchTutorProfile(tutorId);

        if (!tutor) {
            const spinner = document.getElementById("spinner-wrapper");
            if (spinner) spinner.innerHTML = "<p>❌ Failed to load profile.</p>";
            return;
        }

        // Call the function to update badge visibility
        updateProfileBadges(tutor);

        // Logic for setting the profile photo
        const fullName = tutor.firstName + " " + (tutor.surname || "");
        const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=300`;
        const finalPhotoUrl = tutor.photo ? tutor.photo : fallbackAvatarUrl;
        
        const profilePhoto = document.getElementById("teacher-profile-photo");
        profilePhoto.src = finalPhotoUrl;

        // Populate all other text fields
        document.getElementById("view-teacher-subject-pri").textContent = formatList(tutor.subjectsPrimary);
        document.getElementById("view-teacher-subject-sec").textContent = formatList(tutor.subjectsSecondary);
        document.getElementById("view-teacher-subject-col").textContent = formatList(tutor.subjectsSixthForm);
        document.getElementById("view-teacher-tutor-time").textContent = formatList(tutor.preferredTutoringTimes);
        document.getElementById("view-teacher-tutor-lang").textContent = formatList(tutor.languagesAbleToTeachIn);
        document.getElementById("view-teacher-name").textContent = tutor.firstName;
        document.getElementById("view-teacher-location").textContent = tutor.location || "—";
        document.getElementById("view-teacher-nationality").textContent = tutor.nationality || "—";
        document.getElementById("view-teacher-years-exp").textContent = tutor.yearsOfTeachingExperience || "—";
        document.getElementById("view-teacher-cur").textContent = formatList(tutor.curriculum);
        document.getElementById("view-teacher-exam-board").textContent = formatList(tutor.examBoard);
        document.getElementById("view-teacher-tutor-mode").textContent = formatList(tutor.preferredTutoringMode);
        document.getElementById("view-teacher-tutor-type").textContent = tutor.providerType || "—";
        document.getElementById("view-teacher-tutor-pre-gen").textContent = tutor.preferredStudentGender || "—";
        document.getElementById("view-teacher-first-aid").textContent = tutor.firstAidCertificationLevel || "—";
        document.getElementById("view-teacher-special").textContent = formatList(tutor.specialNeedsExperience);
        const rateText = tutor.hourlyRate ? `${tutor.hourlyRate}/hr` : "—";

        document.getElementById("view-teacher-rate").textContent = tutor.hourlyRate || "—";
        
        const priceValueEl = document.getElementById("tutor-price-value");
        const priceBadgeEl = document.getElementById("tutor-price-badge");

        if (tutor.hourlyRate) {
          if (priceValueEl) {
            priceValueEl.textContent = `${tutor.hourlyRate}/hr`;
          }
        } else {
          // If no price, hide the whole badge
          if (priceBadgeEl) {
            priceBadgeEl.style.display = 'none';
          }
        }
        
        document.getElementById("view-teacher-negot").textContent = formatBoolean(tutor.willingToNegotiate);
        document.getElementById("view-teacher-bio").textContent = tutor.tutorBio || "—";

        // Logic to hide spinner
        profilePhoto.onload = () => {
            const spinner = document.getElementById("spinner-wrapper");
            if (spinner) {
                spinner.remove();
            }
        };

        profilePhoto.onerror = () => {
            console.error("Failed to load profile photo.");
            const spinner = document.getElementById("spinner-wrapper");
            if (spinner) {
                spinner.innerHTML = "<p>❌ Failed to load profile image.</p>";
            }
        };
    }

    document.addEventListener("DOMContentLoaded", renderTutorProfile);