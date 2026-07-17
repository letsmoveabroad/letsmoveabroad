document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    // Stagger the menu items so they cascade in rather than appearing at once.
    mobileNav.querySelectorAll("a").forEach(function (link, i) {
      link.style.setProperty("--stagger", 40 + i * 45 + "ms");
    });

    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });

    // Escape closes the menu
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
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

  // Enquiry / booking form -> compose a prefilled email (static site, no backend)
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
      var name = val("f-name") || "Website";

      var lines = [
        "Name: " + val("f-name"),
        "Email: " + val("f-email"),
        "Phone: " + val("f-phone"),
        "Destination: " + destination,
        "Package: " + pkg,
        "Travel dates: " + val("f-dates"),
        "Travellers: " + val("f-travellers"),
        "",
        "Message:",
        val("f-message")
      ];

      var subject = fixedPackage
        ? "Booking: " + fixedPackage + (destination ? " (" + destination + ")" : "") + " - " + name
        : destination + " E-Visa Enquiry - " + name;

      var mailto =
        "mailto:letsmoveabroad@hotmail.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mailto;

      var status = document.getElementById("formStatus");
      if (status) {
        status.textContent = "Opening your email app to send this to letsmoveabroad@hotmail.com. If nothing happens, email us directly at letsmoveabroad@hotmail.com.";
        status.style.display = "block";
      }
    });
  }

  // Home page "Get In Touch" contact form -> same mailto inbox
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };

      var name = val("c-name");
      var lines = [
        "Name: " + name,
        "Phone: " + val("c-phone"),
        "Email: " + val("c-email"),
        "",
        "Query:",
        val("c-query")
      ];

      var mailto =
        "mailto:letsmoveabroad@hotmail.com" +
        "?subject=" + encodeURIComponent("Website Enquiry - " + (name || "Website")) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mailto;

      var status = document.getElementById("contactStatus");
      if (status) {
        status.textContent = "Opening your email app to send this to letsmoveabroad@hotmail.com. If nothing happens, email us directly at letsmoveabroad@hotmail.com.";
        status.style.display = "block";
      }
    });
  }
});
