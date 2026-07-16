document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
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

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
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

  // Reveal cards on scroll
  var revealEls = document.querySelectorAll(
    ".package-card, .destination-card, .step, .why-row, .pkg-includes, .enquiry-card, .enquiry-side, .testimonial-card"
  );
  if (revealEls.length && !reduceMotion && "IntersectionObserver" in window) {
    revealEls.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 4) * 80 + "ms";
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
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
});
