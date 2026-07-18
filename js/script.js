document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    // Stagger the menu items so they cascade in rather than appearing at once.
    mobileNav.querySelectorAll("a").forEach(function (link, i) {
      link.style.setProperty("--stagger", 40 + i * 45 + "ms");
    });

    // `overflow: hidden` on body does NOT reliably stop background touch
    // scroll on iOS Safari - the page keeps scrolling underneath a fixed
    // overlay anyway. Pinning body in place with position:fixed (and
    // restoring the exact scroll position on close) is the technique that
    // actually holds on mobile.
    var lockedScrollY = 0;
    var lockScroll = function () {
      lockedScrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = -lockedScrollY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };
    var unlockScroll = function () {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, lockedScrollY);
    };
    var closeMobileNav = function () {
      mobileNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      unlockScroll();
    };

    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) { lockScroll(); } else { unlockScroll(); }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });

    // Escape closes the menu
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        closeMobileNav();
      }
    });
  }

  // Header condenses + goes glass once you leave the top of the page
  var siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    // Hysteresis: separate enter/exit thresholds so hovering near one value
    // (very common with inertial trackpad scrolling) can't flip the class
    // back and forth every frame and cause a flicker.
    var lastScrolled = null;
    var scrollTicking = false;
    var onScrollHeader = function () {
      var y = window.scrollY;
      var scrolled = lastScrolled
        ? y > 16   // already condensed: only expand back once well clear of top
        : y > 40;  // still expanded: only condense once clearly scrolled
      if (scrolled !== lastScrolled) {
        lastScrolled = scrolled;
        siteHeader.classList.toggle("is-scrolled", scrolled);
      }
      scrollTicking = false;
    };
    window.addEventListener("scroll", function () {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(onScrollHeader);
      }
    }, { passive: true });
    onScrollHeader();
  }

  var destRow = document.getElementById("destRow");
  var destPrev = document.getElementById("destPrev");
  var destNext = document.getElementById("destNext");

  if (destRow && destPrev && destNext) {
    var scrollByCard = function (direction) {
      var card = destRow.querySelector(".destination-card");
      var amount = card ? card.getBoundingClientRect().width + 24 : 300;
      destRow.scrollBy({ left: direction * amount, behavior: "smooth" });
    };
    destPrev.addEventListener("click", function () { scrollByCard(-1); });
    destNext.addEventListener("click", function () { scrollByCard(1); });
  }

  var testiTrack = document.getElementById("testimonialsTrack");
  var testiPrev = document.getElementById("testiPrev");
  var testiNext = document.getElementById("testiNext");
  var testiDots = document.getElementById("testiDots");

  if (testiTrack && testiPrev && testiNext && testiDots) {
    var testiPages = testiTrack.querySelectorAll(".testimonials-page");
    var testiDotEls = testiDots.querySelectorAll(".testi-dot");
    var testiCurrent = 0;

    var goToTestiPage = function (index) {
      testiCurrent = Math.max(0, Math.min(testiPages.length - 1, index));
      testiTrack.style.transform = "translateX(-" + testiCurrent * 100 + "%)";
      testiDotEls.forEach(function (dot, i) {
        var isActive = i === testiCurrent;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      testiPrev.disabled = testiCurrent === 0;
      testiNext.disabled = testiCurrent === testiPages.length - 1;
    };

    testiPrev.addEventListener("click", function () { goToTestiPage(testiCurrent - 1); });
    testiNext.addEventListener("click", function () { goToTestiPage(testiCurrent + 1); });
    testiDotEls.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goToTestiPage(i); });
    });

    goToTestiPage(0);
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Page-exit transition on internal navigation
  if (!reduceMotion) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (href.charAt(0) === "#" || href.indexOf("tel:") === 0 || href.indexOf("mailto:") === 0) return;
      if (/^https?:\/\//i.test(href)) return; // external
      // internal page navigation -> fade out, then go
      e.preventDefault();
      document.body.classList.add("page-leaving");
      setTimeout(function () { window.location.href = href; }, 300);
    });
  }

  // Browsers can restore a page from the back-forward cache exactly as it
  // was when the user left - including the "page-leaving" class we just
  // added above (opacity:0). Without this, hitting Back/Forward brings
  // back a page that's frozen invisible instead of re-running the fade-in.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      document.body.classList.remove("page-leaving");
    }
  });

  // Plane crosses the How It Works points as the section scrolls through view
  var howSteps = document.getElementById("howItWorksSteps");
  var howPlane = document.getElementById("howPlane");
  if (howSteps && howPlane && !reduceMotion) {
    var updatePlane = function () {
      var rect = howSteps.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress 0 -> section top enters bottom of viewport, 1 -> section bottom leaves top
      var total = rect.height + vh;
      var traveled = vh - rect.top;
      var progress = traveled / total;
      progress = Math.max(0, Math.min(1, progress));
      var trackWidth = howSteps.clientWidth * 0.88; // matches .plane-track left/right 6%
      howPlane.style.transform =
        "translate(calc(" + (progress * trackWidth) + "px - 50%), -50%) rotate(90deg)";
    };
    window.addEventListener("scroll", updatePlane, { passive: true });
    window.addEventListener("resize", updatePlane);
    updatePlane();
  }

  // Globe slides up into place, destination pins pop in with a stagger
  var globePhoto = document.querySelector(".globe-bg");
  var globePins = document.querySelectorAll(".globe-pin");
  var globeHeading = document.querySelector(".globe-heading");
  var destinationsSection = document.getElementById("destinations");
  if (globePhoto && destinationsSection) {
    if (!reduceMotion) {
      globePins.forEach(function (pin, i) {
        pin.style.transitionDelay = 300 + i * 160 + "ms";
      });
    }
    var globeRevealed = false;
    var checkGlobeReveal = function () {
      if (globeRevealed) return;
      var rect = destinationsSection.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.82) {
        globeRevealed = true;
        globePhoto.classList.add("is-visible");
        if (globeHeading) globeHeading.classList.add("is-visible");
        globePins.forEach(function (pin) { pin.classList.add("is-visible"); });
        window.removeEventListener("scroll", checkGlobeReveal);
      }
    };
    window.addEventListener("scroll", checkGlobeReveal, { passive: true });
    window.addEventListener("resize", checkGlobeReveal);
    checkGlobeReveal();
  }

  // Reveal cards on scroll.
  // Once an element has finished revealing we strip the reveal classes entirely:
  // `.reveal.is-visible { transform: none }` would otherwise sit at the end of the
  // cascade and beat every `:hover { transform: ... }` rule at equal specificity,
  // silently killing card lifts. Removing the classes also drops `will-change`.
  var revealEls = document.querySelectorAll(
    ".package-card, .destination-card, .step, .why-row, .pkg-includes, .enquiry-card, .enquiry-side, .testimonial-card"
  );
  var revealables = [].slice.call(revealEls).concat(
    [].slice.call(document.querySelectorAll("[data-reveal]"))
  );

  if (revealables.length && !reduceMotion && "IntersectionObserver" in window) {
    var settle = function (el) {
      el.classList.remove("reveal", "is-visible");
      el.removeAttribute("data-reveal");
      el.style.transitionDelay = "";
      el.style.removeProperty("--reveal-delay");
      el.style.willChange = "";
    };

    revealEls.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 4) * 80 + "ms";
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        io.unobserve(el);

        var done = false;
        var finish = function () {
          if (done) return;
          done = true;
          el.removeEventListener("transitionend", onEnd);
          settle(el);
        };
        var onEnd = function (e) {
          if (e.target === el && (e.propertyName === "transform" || e.propertyName === "opacity")) finish();
        };
        el.addEventListener("transitionend", onEnd);
        // Fallback in case transitionend never fires (element hidden, interrupted, etc.)
        setTimeout(finish, 1400);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    revealables.forEach(function (el) { io.observe(el); });
  } else {
    // Reduced motion / no IO support: show everything immediately.
    revealables.forEach(function (el) {
      el.classList.remove("reveal");
      el.removeAttribute("data-reveal");
    });
  }

  // Submits an enquiry payload to the server, which emails the team
  // directly - the visitor just sees "Submitted", no email app involved.
  var submitEnquiry = function (form, payload, statusEl) {
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.style.color = "";
      statusEl.textContent = "Sending your enquiry...";
    }

    fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok && data.ok, error: data.error };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.error || "Something went wrong.");
        if (statusEl) {
          statusEl.textContent = "Thanks — your enquiry has been submitted. We'll be in touch soon.";
        }
        form.reset();
      })
      .catch(function () {
        if (statusEl) {
          statusEl.style.color = "var(--orange-dark)";
          statusEl.textContent = "Sorry, we couldn't send that. Please email us directly at letsmoveabroad@hotmail.com.";
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  };

  // Enquiry / booking form
  var enquiryForm = document.getElementById("enquiryForm");
  if (enquiryForm) {
    enquiryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };

      // Country pages carry data-country; package pages carry data-package.
      var fixedCountry = enquiryForm.getAttribute("data-country") || "";
      var fixedPackage = enquiryForm.getAttribute("data-package") || "";
      var destination = fixedCountry || val("f-destination");
      var pkg = fixedPackage || val("f-package");
      var name = val("f-name") || "Website visitor";

      var subject = fixedPackage
        ? "Booking: " + fixedPackage + (destination ? " (" + destination + ")" : "") + " - " + name
        : destination + " E-Visa Enquiry - " + name;

      submitEnquiry(enquiryForm, {
        subject: subject,
        name: val("f-name"),
        email: val("f-email"),
        phone: val("f-phone"),
        destination: destination,
        package: pkg,
        dates: val("f-dates"),
        travellers: val("f-travellers"),
        message: val("f-message")
      }, document.getElementById("formStatus"));
    });
  }

  // Home page "Get In Touch" contact form
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };

      var name = val("c-name");
      submitEnquiry(contactForm, {
        subject: "Website Enquiry - " + (name || "Website visitor"),
        name: name,
        phone: val("c-phone"),
        email: val("c-email"),
        message: val("c-query")
      }, document.getElementById("contactStatus"));
    });
  }
});
