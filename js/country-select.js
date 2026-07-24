// Enhances every <input type="tel"> into a phone field with a searchable
// country picker showing the flag, country name and dial code. The chosen
// dial code is stored on the input as `dataset.dial` (e.g. "+44") so the
// form-submit code in script.js can prepend it to the typed number.
(function () {
  "use strict";

  // name + ISO2 + dial code. The flag emoji is derived from the ISO code
  // (regional-indicator letters) so we don't have to hard-code 200 emoji.
  var COUNTRIES = [
    ["United Kingdom", "GB", "44"],
    ["United States", "US", "1"],
    ["Afghanistan", "AF", "93"],
    ["Albania", "AL", "355"],
    ["Algeria", "DZ", "213"],
    ["Andorra", "AD", "376"],
    ["Angola", "AO", "244"],
    ["Argentina", "AR", "54"],
    ["Armenia", "AM", "374"],
    ["Australia", "AU", "61"],
    ["Austria", "AT", "43"],
    ["Azerbaijan", "AZ", "994"],
    ["Bahrain", "BH", "973"],
    ["Bangladesh", "BD", "880"],
    ["Belarus", "BY", "375"],
    ["Belgium", "BE", "32"],
    ["Bolivia", "BO", "591"],
    ["Bosnia and Herzegovina", "BA", "387"],
    ["Brazil", "BR", "55"],
    ["Bulgaria", "BG", "359"],
    ["Cambodia", "KH", "855"],
    ["Cameroon", "CM", "237"],
    ["Canada", "CA", "1"],
    ["Chile", "CL", "56"],
    ["China", "CN", "86"],
    ["Colombia", "CO", "57"],
    ["Costa Rica", "CR", "506"],
    ["Croatia", "HR", "385"],
    ["Cyprus", "CY", "357"],
    ["Czech Republic", "CZ", "420"],
    ["Denmark", "DK", "45"],
    ["Ecuador", "EC", "593"],
    ["Egypt", "EG", "20"],
    ["Estonia", "EE", "372"],
    ["Ethiopia", "ET", "251"],
    ["Finland", "FI", "358"],
    ["France", "FR", "33"],
    ["Georgia", "GE", "995"],
    ["Germany", "DE", "49"],
    ["Ghana", "GH", "233"],
    ["Greece", "GR", "30"],
    ["Hong Kong", "HK", "852"],
    ["Hungary", "HU", "36"],
    ["Iceland", "IS", "354"],
    ["India", "IN", "91"],
    ["Indonesia", "ID", "62"],
    ["Iran", "IR", "98"],
    ["Iraq", "IQ", "964"],
    ["Ireland", "IE", "353"],
    ["Israel", "IL", "972"],
    ["Italy", "IT", "39"],
    ["Japan", "JP", "81"],
    ["Jordan", "JO", "962"],
    ["Kazakhstan", "KZ", "7"],
    ["Kenya", "KE", "254"],
    ["Kuwait", "KW", "965"],
    ["Kyrgyzstan", "KG", "996"],
    ["Latvia", "LV", "371"],
    ["Lebanon", "LB", "961"],
    ["Libya", "LY", "218"],
    ["Liechtenstein", "LI", "423"],
    ["Lithuania", "LT", "370"],
    ["Luxembourg", "LU", "352"],
    ["Malaysia", "MY", "60"],
    ["Maldives", "MV", "960"],
    ["Malta", "MT", "356"],
    ["Mexico", "MX", "52"],
    ["Moldova", "MD", "373"],
    ["Monaco", "MC", "377"],
    ["Mongolia", "MN", "976"],
    ["Montenegro", "ME", "382"],
    ["Morocco", "MA", "212"],
    ["Nepal", "NP", "977"],
    ["Netherlands", "NL", "31"],
    ["New Zealand", "NZ", "64"],
    ["Nigeria", "NG", "234"],
    ["North Macedonia", "MK", "389"],
    ["Norway", "NO", "47"],
    ["Oman", "OM", "968"],
    ["Pakistan", "PK", "92"],
    ["Palestine", "PS", "970"],
    ["Panama", "PA", "507"],
    ["Peru", "PE", "51"],
    ["Philippines", "PH", "63"],
    ["Poland", "PL", "48"],
    ["Portugal", "PT", "351"],
    ["Qatar", "QA", "974"],
    ["Romania", "RO", "40"],
    ["Russia", "RU", "7"],
    ["Saudi Arabia", "SA", "966"],
    ["Serbia", "RS", "381"],
    ["Singapore", "SG", "65"],
    ["Slovakia", "SK", "421"],
    ["Slovenia", "SI", "386"],
    ["South Africa", "ZA", "27"],
    ["South Korea", "KR", "82"],
    ["Spain", "ES", "34"],
    ["Sri Lanka", "LK", "94"],
    ["Sweden", "SE", "46"],
    ["Switzerland", "CH", "41"],
    ["Syria", "SY", "963"],
    ["Taiwan", "TW", "886"],
    ["Tajikistan", "TJ", "992"],
    ["Tanzania", "TZ", "255"],
    ["Thailand", "TH", "66"],
    ["Tunisia", "TN", "216"],
    ["Turkey", "TR", "90"],
    ["Turkmenistan", "TM", "993"],
    ["Uganda", "UG", "256"],
    ["Ukraine", "UA", "380"],
    ["United Arab Emirates", "AE", "971"],
    ["Uruguay", "UY", "598"],
    ["Uzbekistan", "UZ", "998"],
    ["Venezuela", "VE", "58"],
    ["Vietnam", "VN", "84"],
    ["Yemen", "YE", "967"],
    ["Zimbabwe", "ZW", "263"]
  ];

  var DEFAULT_ISO = "GB";

  // Self-hosted flat flag SVGs (Windows browsers don't render flag emoji, so
  // we can't rely on regional-indicator characters). Files live in /flags.
  function flagSrc(iso) { return "flags/" + iso.toLowerCase() + ".svg"; }
  function flagTag(iso, name) {
    return '<img class="phone-flag" src="' + flagSrc(iso) +
      '" width="22" height="16" loading="lazy" alt="' + (name || "") + '" />';
  }

  var openField = null; // currently open picker, so we can close it on outside click

  function enhance(input) {
    if (input.dataset.phoneEnhanced) return;
    input.dataset.phoneEnhanced = "1";

    var field = document.createElement("div");
    field.className = "phone-field";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "phone-country";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Select country calling code");
    btn.innerHTML =
      flagTag("GB", "") + '<span class="phone-dial"></span>' +
      '<svg class="phone-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    var dropdown = document.createElement("div");
    dropdown.className = "phone-dropdown";
    dropdown.setAttribute("role", "listbox");

    var search = document.createElement("input");
    search.type = "text";
    search.className = "phone-search";
    search.placeholder = "Search country...";
    search.setAttribute("aria-label", "Search country");
    search.autocomplete = "off";

    var list = document.createElement("ul");
    list.className = "phone-list";

    dropdown.appendChild(search);
    dropdown.appendChild(list);

    // Assemble: put the tel input inside the field, alongside button + dropdown.
    input.parentNode.insertBefore(field, input);
    field.appendChild(btn);
    field.appendChild(input);
    field.appendChild(dropdown);

    var flagEl = btn.querySelector(".phone-flag");
    var dialEl = btn.querySelector(".phone-dial");

    function select(country) {
      var iso = country[1], dial = country[2];
      flagEl.src = flagSrc(iso);
      flagEl.alt = country[0];
      dialEl.textContent = "+" + dial;
      input.dataset.dial = "+" + dial;
      input.dataset.iso = iso;
    }

    // Build the option rows once.
    COUNTRIES.forEach(function (country) {
      var name = country[0], iso = country[1], dial = country[2];
      var li = document.createElement("li");
      li.className = "phone-option";
      li.setAttribute("role", "option");
      li.dataset.search = (name + " " + iso + " " + dial).toLowerCase();
      li.innerHTML =
        flagTag(iso, name) +
        '<span class="phone-name">' + name + "</span>" +
        '<span class="phone-code">+' + dial + "</span>";
      li.addEventListener("click", function () {
        select(country);
        close();
        input.focus();
      });
      list.appendChild(li);
    });

    function filter(q) {
      q = q.trim().toLowerCase();
      var items = list.children;
      for (var i = 0; i < items.length; i++) {
        items[i].style.display = !q || items[i].dataset.search.indexOf(q) !== -1 ? "" : "none";
      }
    }

    function open() {
      if (openField && openField !== close) openField();
      field.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      search.value = "";
      filter("");
      openField = close;
      // Focus search on the next frame so the click that opened us doesn't
      // immediately blur it.
      setTimeout(function () { search.focus(); }, 0);
    }

    function close() {
      field.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (openField === close) openField = null;
    }

    btn.addEventListener("click", function () {
      if (field.classList.contains("is-open")) { close(); } else { open(); }
    });
    search.addEventListener("input", function () { filter(search.value); });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); btn.focus(); }
    });

    // Default selection: match the page's country/destination when we can.
    var form = input.closest("form");
    var hint = (form && (form.getAttribute("data-country") || "")).toLowerCase();
    var initial = null;
    if (hint) {
      for (var j = 0; j < COUNTRIES.length; j++) {
        if (COUNTRIES[j][0].toLowerCase() === hint) { initial = COUNTRIES[j]; break; }
      }
    }
    if (!initial) {
      for (var k = 0; k < COUNTRIES.length; k++) {
        if (COUNTRIES[k][1] === DEFAULT_ISO) { initial = COUNTRIES[k]; break; }
      }
    }
    select(initial || COUNTRIES[0]);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('input[type="tel"]').forEach(enhance);
  });

  // Click anywhere outside the open picker closes it.
  document.addEventListener("click", function (e) {
    if (openField && !e.target.closest(".phone-field")) openField();
  });
})();
