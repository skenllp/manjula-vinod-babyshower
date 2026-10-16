(function () {
  "use strict";
  document.documentElement.classList.add("js");

  // ===== EDIT EVENT SETTINGS HERE =====
  var EVENT = { date: "2026-11-01", time: "09:00", durationHours: 8 }; // interpreted as IST (+05:30)
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  // ===== Loader (brief, never blocks) =====
  function hideLoader() { $("loader").classList.add("done"); }
  window.addEventListener("load", function () { setTimeout(hideLoader, reduced ? 0 : 1200); });
  setTimeout(hideLoader, 3000); // safety net

  // ===== Scroll reveal =====
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) { if (el.closest(".hero-text")) el.style.transitionDelay = (i * 0.12) + "s"; io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add("in"); }); }

  // ===== Petals (few, light) =====
  if (!reduced) {
    var box = document.querySelector(".petals");
    for (var p = 0; p < 8; p++) {
      var s = document.createElement("span");
      s.className = "petal";
      s.style.left = (Math.random() * 100) + "%";
      s.style.setProperty("--dx", (Math.random() * 80 - 40) + "px");
      s.style.animationDuration = (9 + Math.random() * 8) + "s";
      s.style.animationDelay = (Math.random() * 8) + "s";
      box.appendChild(s);
    }
  }



  // ===== Gallery fallback + lightbox =====
  var lb = $("lightbox"), lbImg = $("lb-img"), lastFocus = null;
  document.querySelectorAll(".tile").forEach(function (tile) {
    var img = tile.querySelector("img");
    function empty() {
      tile.classList.add("empty"); tile.disabled = true; tile.removeAttribute("aria-label");
      tile.innerHTML = "<span>Photo placeholder<br/>" + tile.dataset.src + "</span>";
    }
    img.addEventListener("error", empty);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("loading") !== "lazy") empty();
    tile.addEventListener("click", function () {
      lastFocus = tile; lbImg.src = tile.dataset.src; lbImg.alt = tile.dataset.alt; lb.hidden = false; $("lb-close").focus();
    });
  });
  function closeLb() { lb.hidden = true; lbImg.src = ""; if (lastFocus) lastFocus.focus(); }
  $("lb-close").addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) closeLb(); });

  // ===== Countdown (IST) =====
  var target = new Date(EVENT.date + "T" + EVENT.time + ":00+05:30").getTime();
  var end = target + EVENT.durationHours * 3600000;
  var timer = $("timer"), msg = $("cd-msg");
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var now = Date.now();
    if (now >= target) {
      timer.hidden = true; msg.hidden = false;
      msg.textContent = now < end ? "Today is the special day! Let the celebration begin." : "Thank you for being part of this beautiful celebration.";
      if (now >= end) clearInterval(iv);
      return;
    }
    var t = Math.floor((target - now) / 1000);
    $("cd-d").textContent = pad(Math.floor(t / 86400));
    $("cd-h").textContent = pad(Math.floor((t % 86400) / 3600));
    $("cd-m").textContent = pad(Math.floor((t % 3600) / 60));
    $("cd-s").textContent = pad(t % 60);
  }
  var iv = setInterval(tick, 1000); tick();

  // ===== RSVP (frontend only — not stored) =====
  // To store submissions later, replace the body of submitRsvp() with a fetch/Supabase call.
  function submitRsvp(data) {
    return new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true }); }, 500); });
  }
  var form = $("rsvp-form");
  function setErr(id, text, input) {
    $(id).textContent = text;
    if (input) { input.classList.toggle("invalid", !!text); input.setAttribute("aria-invalid", text ? "true" : "false"); }
    return !text;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.name, guests = form.guests;
    var att = form.querySelector('input[name="attendance"]:checked');
    var g = parseInt(guests.value, 10);
    var ok = true;
    ok = setErr("name-err", name.value.trim().length < 2 ? "Please enter your name." : "", name) && ok;
    ok = setErr("guests-err", (isNaN(g) || g < 1 || g > 20) ? "Enter a number of guests between 1 and 20." : "", guests) && ok;
    ok = setErr("att-err", att ? "" : "Please choose whether you can attend.") && ok;
    if (!ok) { var first = form.querySelector(".invalid") || form.querySelector('input[name="attendance"]'); first.focus(); return; }
    var btn = $("rsvp-btn"); btn.disabled = true; btn.textContent = "Sending…";
    submitRsvp({ name: name.value.trim(), guests: g, attendance: att.value, message: form.message.value.trim() }).then(function () {
      form.reset(); guests.value = 1; btn.disabled = false; btn.textContent = "Send RSVP";
      var okEl = $("rsvp-ok"); okEl.hidden = false;
      okEl.textContent = att.value === "Joyfully Accept"
        ? "Thank you! We're delighted you can join us. (Demo form: your reply is not saved anywhere yet.)"
        : "Thank you for letting us know — you will be in our thoughts. (Demo form: your reply is not saved anywhere yet.)";
    });
  });

  // ===== Music (audio/music.mp3; autoplays, falls back to muted if browser blocks it) =====
  var audio = $("audio"), mbtn = $("music"), note = $("music-note"), missing = false;
  function setMusic(on) {
    mbtn.classList.toggle("on", on); mbtn.setAttribute("aria-pressed", on);
    mbtn.setAttribute("aria-label", on ? "Turn background music off" : "Turn background music on");
    $("music-label").textContent = on ? "Music on" : "Music off";
    $("icon-on").hidden = !on; $("icon-off").hidden = on;
  }
  function showNote(msg) {
    note.textContent = msg; note.hidden = false;
    clearTimeout(showNote.t); showNote.t = setTimeout(function () { note.hidden = true; }, 2500);
  }
  audio.addEventListener("error", function () { missing = true; setMusic(false); showNote("Music file not added yet"); });
  mbtn.addEventListener("click", function () {
    if (missing) { showNote("Music file not added yet"); return; }
    if (!audio.paused && !audio.muted) { audio.pause(); setMusic(false); return; }
    audio.muted = false;
    audio.play().then(function () { setMusic(true); }).catch(function () { setMusic(false); });
  });
  // Autoplay attempt: audible first, muted fallback (browsers often block sound without interaction)
  function tryAutoplay() {
    if (missing || !audio.paused) return;
    audio.muted = false;
    audio.play().then(function () { setMusic(true); }).catch(function () {
      audio.muted = true;
      audio.play().then(function () {
        setMusic(false); showNote("Tap the speaker for music");
        var once = function () { window.removeEventListener("pointerdown", once); };
        window.addEventListener("pointerdown", once);
      }).catch(function () {});
    });
  }
  tryAutoplay();
  window.addEventListener("load", tryAutoplay);
})();
