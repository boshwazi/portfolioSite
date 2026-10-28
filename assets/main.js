(function () {
  'use strict';

  var root = document.documentElement;

  /* Theme toggle: light by default, the visitor's choice once set */
  var toggle = document.querySelector('[data-theme-toggle]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }
  function syncToggleLabel() {
    toggle.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncToggleLabel();
  });
  syncToggleLabel();

  /* Nav hairline appears once the hero starts scrolling away */
  var nav = document.querySelector('[data-nav]');
  var hero = document.querySelector('.hero');
  new IntersectionObserver(function (entries) {
    nav.classList.toggle('is-scrolled', entries[0].intersectionRatio < 0.98);
  }, { threshold: [0.98] }).observe(hero);

  /* Hero intro plays once on load */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });

  /* Hero: type, hold, delete, next phrase. This changes text rather than moving
     anything, so it runs for everyone. Pauses while the hero is off screen or the
     tab is hidden. */
  var typed = document.querySelector('[data-typed]');
  if (typed) {
    var phrases = JSON.parse(typed.getAttribute('data-typed'));
    var caret = typed.nextElementSibling;
    var phrase = 0, chars = 0, deleting = false;
    var heroVisible = true, tick = null;
    typed.textContent = '';

    var step = function () {
      tick = null;
      if (!heroVisible || document.hidden) return;
      var delay;
      if (deleting) {
        chars--;
        delay = 22;
        if (chars === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 320; }
      } else {
        chars++;
        delay = 38 + Math.random() * 34;
        if (chars === phrases[phrase].length) { deleting = true; delay = 2600; }
      }
      typed.textContent = phrases[phrase].slice(0, chars);
      caret.classList.toggle('is-blinking', delay > 300);
      tick = setTimeout(step, delay);
    };
    var resume = function () { if (!tick && heroVisible && !document.hidden) tick = setTimeout(step, 400); };

    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      resume();
    }).observe(hero);
    document.addEventListener('visibilitychange', resume);

    caret.classList.add('is-blinking');
    clearTimeout(tick);
    tick = setTimeout(step, 900);
  }

  /* Dot field: a grid of points with a slow scan line passing through it and a
     glow that follows the cursor. Only brightness changes (the dots near the cursor
     shift a few pixels), so it runs for everyone. Fixed behind the page, so it shows
     in the hero and again behind the contact section, and only animates while one
     of those is on screen. */
  var field = document.querySelector('[data-field]');
  if (field && field.getContext) {
    var ctx = field.getContext('2d');
    var W = 0, H = 0, GAP = 28, RADIUS = 170;
    var pointer = { x: -1e4, y: -1e4 };
    var colors = { dot: '#888', accent: '#5fd3a3', a: 0.18 };
    var showing = 0, raf = null;

    var readColors = function () {
      var cs = getComputedStyle(root);
      colors.dot = cs.getPropertyValue('--dot').trim();
      colors.accent = cs.getPropertyValue('--accent').trim();
      colors.a = parseFloat(cs.getPropertyValue('--dot-a')) || 0.18;
    };
    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      field.width = Math.round(W * dpr); field.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      var ox = (W % GAP) / 2 + GAP / 2, oy = (H % GAP) / 2 + GAP / 2;
      var lit = [];
      ctx.fillStyle = colors.dot;
      for (var y = oy; y < H; y += GAP) {
        for (var x = ox; x < W; x += GAP) {
          var glow = 0;
          var wv = Math.sin(x * 0.0085 + y * 0.0055 - t * 0.0011);
          if (wv > 0) glow = Math.pow(wv, 14) * 0.85;
          var dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
          var px = x, py = y, size = 2;
          if (d2 < RADIUS * RADIUS) {
            var d = Math.sqrt(d2) || 1, inf = 1 - d / RADIUS;
            inf *= inf;
            px += (dx / d) * inf * 10; py += (dy / d) * inf * 10;
            size += inf * 1.5;
            glow = Math.max(glow, inf);
          }
          ctx.globalAlpha = colors.a * (1 - glow * 0.6);
          ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
          if (glow > 0.04) lit.push(px, py, size, glow);
        }
      }
      ctx.fillStyle = colors.accent;
      for (var i = 0; i < lit.length; i += 4) {
        ctx.globalAlpha = Math.min(1, lit[i + 3] * 0.95);
        ctx.fillRect(Math.round(lit[i] - lit[i + 2] / 2), Math.round(lit[i + 1] - lit[i + 2] / 2), lit[i + 2], lit[i + 2]);
      }
      ctx.globalAlpha = 1;
    };
    var loop = function (t) {
      raf = null;
      draw(t);
      if (showing > 0 && !document.hidden) raf = requestAnimationFrame(loop);
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(loop); };

    readColors(); resize(); kick();
    window.addEventListener('resize', function () { resize(); kick(); });
    document.addEventListener('visibilitychange', kick);
    new MutationObserver(function () { readColors(); kick(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    systemDark.addEventListener('change', function () { readColors(); kick(); });

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      pointer.x = e.clientX; pointer.y = e.clientY;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () {
      pointer.x = pointer.y = -1e4; kick();
    });

    var fieldObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var was = entry.target._fieldShowing || false;
        if (entry.isIntersecting !== was) {
          entry.target._fieldShowing = entry.isIntersecting;
          showing += entry.isIntersecting ? 1 : -1;
        }
      });
      kick();
    });
    fieldObserver.observe(hero);
    var contactSection = document.querySelector('#contact');
    if (contactSection) fieldObserver.observe(contactSection);
  }

  /* Nav: mark the link for the section currently in view */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'what', 'work', 'case', 'stack', 'contact'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* Spotlight cards: track the cursor position inside each card */
  document.querySelectorAll('.spot').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  });

  /* Reveal sections as they enter, once */
  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { revealer.observe(el); });

  /* What I do: the steps play through on their own (the line fills toward the
     next step while one is shown). Hovering the rail pauses it; clicking, tapping
     or tabbing to a step hands control to the visitor for good. Autoplay only runs
     on the wide layout, while the rail is on screen. */
  var rail = document.querySelector('[data-rail]');
  if (rail) {
    var caps = Array.prototype.slice.call(rail.querySelectorAll('.cap'));
    var track = rail.querySelector('.rail-track');
    var fill = rail.querySelector('.rail-fill');
    var active = -1;
    var DWELL = 5000; // time on each step
    var wideRail = window.matchMedia('(min-width: 720px)');
    var auto = { stopped: false, paused: false, inView: false, timer: null, progress: null };

    function layoutTrack() {
      var dots = caps.map(function (c) { return c.querySelector('.cap-dot'); });
      var box = rail.getBoundingClientRect();
      // The section may be mid-rise (scaled) when this runs, so undo that scale.
      var scale = box.width / rail.offsetWidth || 1;
      var first = dots[0].getBoundingClientRect();
      var last = dots[dots.length - 1].getBoundingClientRect();
      track.style.left = (first.left + first.width / 2 - box.left) / scale + 'px';
      track.style.width = (last.left - first.left) / scale + 'px';
    }

    function setActive(i) {
      if (i === active) return;
      active = i;
      caps.forEach(function (cap, j) {
        cap.classList.toggle('is-active', j === i);
        cap.classList.toggle('is-done', j < i);
        cap.querySelector('.cap-btn').setAttribute('aria-expanded', String(j === i));
      });
      fill.style.transition = '';
      fill.style.transform = 'scaleX(' + (i / (caps.length - 1)) + ')';
    }

    function clearAuto() {
      clearTimeout(auto.timer); clearTimeout(auto.progress);
      auto.timer = auto.progress = null;
    }
    function halt() {
      clearAuto();
      fill.style.transition = '';
      fill.style.transform = 'scaleX(' + (active / (caps.length - 1)) + ')';
    }
    function schedule() {
      clearAuto();
      if (auto.stopped || auto.paused || !auto.inView || document.hidden || !wideRail.matches) return;
      var next = (active + 1) % caps.length;
      if (next !== 0) {
        // After the step settles, run the line toward the next step for the rest of the dwell
        auto.progress = setTimeout(function () {
          fill.style.transition = 'transform ' + (DWELL - 700) + 'ms linear';
          fill.style.transform = 'scaleX(' + (next / (caps.length - 1)) + ')';
        }, 700);
      }
      auto.timer = setTimeout(function () { setActive(next); schedule(); }, DWELL);
    }
    function takeOver() { auto.stopped = true; halt(); }

    var canHover = window.matchMedia('(hover: hover)');
    caps.forEach(function (cap, i) {
      var btn = cap.querySelector('.cap-btn');
      btn.addEventListener('click', function () { takeOver(); setActive(i); });
      btn.addEventListener('focus', function () { takeOver(); setActive(i); });
      btn.addEventListener('mouseenter', function () { if (canHover.matches) setActive(i); });
    });
    rail.addEventListener('mouseenter', function () {
      if (!canHover.matches) return;
      auto.paused = true; halt();
    });
    rail.addEventListener('mouseleave', function () {
      if (!canHover.matches) return;
      auto.paused = false; schedule();
    });
    new IntersectionObserver(function (entries) {
      auto.inView = entries[0].isIntersecting;
      if (auto.inView) schedule(); else halt();
    }, { threshold: 0.5 }).observe(rail);
    document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else schedule(); });
    wideRail.addEventListener('change', function () { if (wideRail.matches) schedule(); else halt(); });

    setActive(0);
    layoutTrack();
    window.addEventListener('resize', layoutTrack);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTrack);
  }

  /* Selected work: on desktop a sticky stage follows the project in view */
  var work = document.querySelector('[data-work]');
  if (work) {
    var projects = Array.prototype.slice.call(work.querySelectorAll('[data-proj]'));
    var stage = work.querySelector('[data-stage]');
    var stageFigs = projects.map(function (p) {
      var clone = p.querySelector('.proj-fig').cloneNode(true);
      stage.appendChild(clone);
      return clone;
    });

    function showProject(i) {
      projects.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
      stageFigs.forEach(function (f, j) { f.classList.toggle('on', j === i); });
    }

    showProject(0);
    var projectObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) showProject(projects.indexOf(entry.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    projects.forEach(function (p) { projectObserver.observe(p); });

    /* On smaller screens each diagram draws itself when it scrolls into view */
    var figObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('on');
        figObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    projects.forEach(function (p) { figObserver.observe(p.querySelector('.proj-fig')); });
  }

  /* Case study: a closed summary that opens in place. Once open, a sticky bar
     follows the chapter in view, each chapter's loop plays while it is on screen
     (in the page's theme), and the before/after slider gives one hint sweep. */
  var caseSection = document.getElementById('case');
  if (caseSection) {
    var caseBody = caseSection.querySelector('.case-body');
    var caseToggle = caseSection.querySelector('[data-case-toggle]');
    var chapters = Array.prototype.slice.call(caseBody.querySelectorAll('[data-chapter]'));
    var barSteps = Array.prototype.slice.call(caseBody.querySelectorAll('.case-bar-steps button'));
    var barTitle = caseBody.querySelector('[data-case-current]');
    var caseReady = false;
    var smooth = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; };

    caseBody.hidden = true;

    var setChapter = function (i) {
      barTitle.textContent = chapters[i].getAttribute('data-chapter');
      barSteps.forEach(function (b, j) {
        b.classList.toggle('is-current', j === i);
        b.classList.toggle('is-done', j < i);
      });
    };

    // Chapter loops: a dark and a light render of each, loaded only once the
    // case study is open and swapped when the theme changes
    var media = Array.prototype.slice.call(caseBody.querySelectorAll('[data-video]'));
    var videoSrc = function (fig, ext) { return 'assets/case/' + fig.getAttribute('data-video') + '-' + currentTheme() + ext; };
    var loadVideo = function (fig) {
      var v = fig.querySelector('video');
      var src = videoSrc(fig, '.mp4');
      if (v.getAttribute('src') === src) return;
      var t = v.currentTime || 0;
      v.poster = videoSrc(fig, '.jpg');
      v.src = src;
      if (t) v.addEventListener('loadedmetadata', function () { v.currentTime = t; }, { once: true });
    };
    var playVideo = function (fig) {
      if (fig.classList.contains('is-paused') || !fig.classList.contains('in-view')) return;
      var p = fig.querySelector('video').play();
      if (p && p.catch) p.catch(function () {});
    };
    media.forEach(function (fig) {
      var v = fig.querySelector('video');
      var btn = fig.querySelector('[data-video-toggle]');
      btn.addEventListener('click', function () {
        var paused = fig.classList.toggle('is-paused');
        btn.textContent = paused ? 'Play' : 'Pause';
        btn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
        if (paused) v.pause(); else playVideo(fig);
      });
    });
    var mediaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var fig = entry.target;
        fig.classList.toggle('in-view', entry.isIntersecting);
        if (entry.isIntersecting) { loadVideo(fig); playVideo(fig); }
        else fig.querySelector('video').pause();
      });
    }, { threshold: 0.25 });
    var refreshTheme = function () {
      media.forEach(function (fig) {
        if (!fig.querySelector('video').getAttribute('src')) return;
        loadVideo(fig);
        playVideo(fig);
      });
    };
    new MutationObserver(refreshTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    systemDark.addEventListener('change', refreshTheme);

    var compare = caseBody.querySelector('[data-compare]');
    var range = compare.querySelector('.compare-range');
    var hinted = false;
    range.addEventListener('input', function () {
      compare.classList.remove('is-hinting');
      compare.style.setProperty('--pos', range.value + '%');
    });
    var hintCompare = function () {
      if (hinted) return;
      hinted = true;
      compare.classList.add('is-hinting');
      compare.style.setProperty('--pos', '22%');
      setTimeout(function () { compare.style.setProperty('--pos', '50%'); }, 1000);
      setTimeout(function () { compare.classList.remove('is-hinting'); }, 2000);
    };

    var setupCase = function () {
      if (caseReady) return;
      caseReady = true;
      var chapterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setChapter(chapters.indexOf(entry.target));
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      chapters.forEach(function (c) { chapterObserver.observe(c); });

      var drawObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          drawObserver.unobserve(el);
          if (el === compare) hintCompare();
          else el.classList.add('on');
        });
      }, { threshold: 0.35 });
      caseBody.querySelectorAll('[data-draw]').forEach(function (f) { drawObserver.observe(f); });
      drawObserver.observe(compare);
      media.forEach(function (fig) { mediaObserver.observe(fig); });
      setChapter(0);
    };

    var openCase = function (targetId) {
      if (caseBody.hidden) {
        caseBody.hidden = false;
        caseToggle.setAttribute('aria-expanded', 'true');
        setupCase();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { caseSection.classList.add('is-open'); });
        });
      }
      var target = targetId ? document.getElementById(targetId) : caseBody;
      requestAnimationFrame(function () { target.scrollIntoView({ behavior: smooth(), block: 'start' }); });
    };
    var closeCase = function () {
      caseSection.scrollIntoView({ behavior: 'auto', block: 'start' });
      caseSection.classList.remove('is-open');
      caseToggle.setAttribute('aria-expanded', 'false');
      caseBody.hidden = true;
      caseToggle.focus({ preventScroll: true });
    };

    caseToggle.addEventListener('click', function () {
      if (caseBody.hidden) openCase(null); else closeCase();
    });
    caseSection.querySelectorAll('[data-case-close]').forEach(function (b) { b.addEventListener('click', closeCase); });
    caseSection.querySelectorAll('[data-case-jump]').forEach(function (b) {
      b.addEventListener('click', function () { openCase(b.getAttribute('data-case-jump')); });
    });
  }

  /* Copy email with a short confirmation */
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    var status = copyBtn.parentNode.querySelector('.copy-status');
    var timer;
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () {
        copyBtn.classList.add('is-copied');
        status.textContent = 'Copied to clipboard';
        status.classList.add('is-shown');
        clearTimeout(timer);
        timer = setTimeout(function () {
          copyBtn.classList.remove('is-copied');
          status.classList.remove('is-shown');
        }, 1800);
      };
      var fallback = function () {
        var input = document.createElement('textarea');
        input.value = text;
        input.setAttribute('readonly', '');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        try { if (document.execCommand('copy')) done(); } catch (e) {}
        document.body.removeChild(input);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  }
})();
