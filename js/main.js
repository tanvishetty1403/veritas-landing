document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const signupCountEl = document.getElementById("signup-count");
  const formError = document.getElementById("form-error");

  // 1. Fetch live signup count with an elegant counter animation
  const basePrestigeVolume = 1240; // Makes your private beta feel highly anticipated
  
  async function updateSignupCounter() {
    try {
      const response = await fetch("/api/signups/count");
      if (response.ok) {
        const data = await response.json();
        const totalDisplayCount = basePrestigeVolume + data.count;
        
        // Animated odometer tick effect
        animateCounter(basePrestigeVolume, totalDisplayCount, 1500);
      }
    } catch (err) {
      console.error("Counter sync error:", err);
      signupCountEl.textContent = "1,248"; // Robust fallback
    }
  }

  function animateCounter(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentCount = Math.floor(progress * (end - start) + start);
      signupCountEl.textContent = currentCount.toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // Initial load execution
  updateSignupCounter();

  // 2. Premium Form submission handler with validation and smooth redirect
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      formError.textContent = ""; // Clear diagnostics

      const formData = new FormData(signupForm);
      const payload = {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        interviewOk: signupForm.querySelector('#interviewOk').checked
      };

      try {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Submission node error.");
        }

        // Seamless route straight to your premium custom thank-you matrix!
        const interviewQuery = payload.interviewOk ? "yes" : "no";
        window.location.href = `thank-you.html?name=${encodeURIComponent(payload.name)}&interview=${interviewQuery}`;

      } catch (err) {
        formError.textContent = err.message || "An unexpected network break occurred.";
      }
    });
  }

  // 3. Clean Custom Arrow Cursor Tracking Script
  const cursorDot = document.getElementById("js-cursor-dot");

  if (cursorDot) {
    window.addEventListener("mousemove", (e) => {
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
    });

    // Detect Hover Targets to trigger color shifts
    const interactiveSelectors = "a, button, select, input, textarea, .checkbox-group";
    
    const addHoverEffect = () => document.body.classList.add("cursor-hovering");
    const removeHoverEffect = () => document.body.classList.remove("cursor-hovering");

    document.querySelectorAll(interactiveSelectors).forEach((element) => {
      element.addEventListener("mouseenter", addHoverEffect);
      element.addEventListener("mouseleave", removeHoverEffect);
    });

    document.addEventListener("mouseleave", () => {
      cursorDot.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      cursorDot.style.opacity = "1";
    });
  }

  // 4. Forensic Scan Sync Engine (Delays entire heatmap block until scan completes)
  setTimeout(() => {
    const analysisBox = document.querySelector(".visual-viewport-box");
    if (analysisBox) {
      analysisBox.classList.add("analysis-ready");
    }
  }, 2200); // Waits 2.2 seconds for the scan bar to move before displaying results

  // 5. Intersection Observer Engine for Smooth Scroll Transitions
  const revealElements = document.querySelectorAll(".scroll-reveal");

  if (revealElements.length > 0) {
    const scrollObserverOptions = {
      root: null,
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    };

    const revealOnScrollCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); 
        }
      });
    };

    const observer = new IntersectionObserver(revealOnScrollCallback, scrollObserverOptions);
    
    revealElements.forEach((element) => {
      observer.observe(element);
    });
  }
});