/* ── SPA Router for Easy* Product Portal ── */
;(function () {
  var currentProduct = null

  function detectProduct() {
    var path = window.location.pathname
    if (path === '/easycode' || path === '/easycode/') return 'code'
    return 'claw'
  }

  function getT(key, fallbackKey) {
    var lang = getCurrentLang()
    var t = translations[lang] || translations.ko
    if (t[key] != null) return t[key]
    if (fallbackKey && t[fallbackKey] != null) return t[fallbackKey]
    return key
  }

  /* ── Feature icon SVGs ── */
  var FEATURE_ICONS = {
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    mic:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M16 12a4 4 0 01-8 0"/><path d="M12 16v4"/><path d="M8 22h8"/></svg>',
    chat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>'
  }

  /* ── Hero icon templates ── */
  function getHeroIcon(product) {
    var tpl = document.getElementById(PRODUCTS[product].iconTemplate)
    if (tpl) return tpl.innerHTML
    return ''
  }

  /* ── Update CSS custom properties for accent ── */
  function applyAccent(p) {
    var root = document.documentElement.style
    root.setProperty('--primary', p.accent)
    root.setProperty('--primary-hover', p.accentHover)
    root.setProperty('--primary-light', p.accentLight)
    root.setProperty('--primary-glow', p.accentGlow)
  }

  /* ── Nav tabs ── */
  function updateNavTabs(product) {
    var tabs = document.querySelectorAll('.nav-tab')
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-product') === product
      tab.classList.toggle('nav-tab--active', isActive)
    })
  }

  /* ── Nav logo ── */
  function updateNavLogo(product) {
    var p = PRODUCTS[product]
    var brandSpan = document.getElementById('nav-brand')
    if (brandSpan) brandSpan.textContent = p.slug === 'claw' ? 'Claw' : 'Code'
  }

  /* ── Hero section ── */
  function updateHero(product) {
    var p = PRODUCTS[product]
    var prefix = p.i18nPrefix

    // Icon
    var iconWrap = document.querySelector('.lobster-wrap')
    if (iconWrap) iconWrap.innerHTML = getHeroIcon(product)

    // Logo text
    var logoEl = document.getElementById('hero-logo')
    if (logoEl) {
      var brandPart = logoEl.querySelector('.brand-part')
      if (brandPart) brandPart.textContent = p.slug === 'claw' ? 'Claw' : 'Code'
    }

    // Tagline
    var tagline = document.querySelector('.tagline')
    if (tagline) {
      var val = getT(prefix + 'hero.tagline', 'hero.tagline')
      var tmp = document.createElement('div')
      tmp.innerHTML = val
      tmp.querySelectorAll('script,iframe,object,embed,form').forEach(function (n) {
        n.remove()
      })
      tagline.innerHTML = tmp.innerHTML
    }

    // Download links
    var base = 'https://github.com/' + p.github + '/releases/latest/download/'
    var macLinks = document.querySelectorAll('[data-link="mac"]')
    var winLinks = document.querySelectorAll('[data-link="win"]')
    macLinks.forEach(function (a) {
      a.href = base + p.dmg
    })
    winLinks.forEach(function (a) {
      a.href = base + p.exe
    })

    // GitHub link
    var ghLinks = document.querySelectorAll('[data-link="github"]')
    ghLinks.forEach(function (a) {
      a.href = 'https://github.com/' + p.github
    })

    // Open chat link
    var chatLinks = document.querySelectorAll('[data-link="chat"]')
    chatLinks.forEach(function (a) {
      a.href = p.openChat
    })

    // Download button labels
    var macLabels = document.querySelectorAll('[data-label="downloadMac"]')
    var winLabels = document.querySelectorAll('[data-label="downloadWin"]')
    macLabels.forEach(function (el) {
      el.textContent = getT(prefix + 'hero.downloadMac', 'hero.downloadMac')
    })
    winLabels.forEach(function (el) {
      el.textContent = getT(prefix + 'hero.downloadWin', 'hero.downloadWin')
    })

    // Star GitHub label
    var ghLabels = document.querySelectorAll('[data-label="starGithub"]')
    ghLabels.forEach(function (el) {
      el.textContent = getT(prefix + 'hero.starGithub', 'hero.starGithub')
    })

    // Open chat label
    var chatLabels = document.querySelectorAll('[data-label="openChat"]')
    chatLabels.forEach(function (el) {
      el.textContent = getT(prefix + 'hero.openChat', 'hero.openChat')
    })

    // Demo GIF
    var demoSection = document.getElementById('hero-demo')
    if (demoSection) {
      demoSection.style.display = p.demoGif ? '' : 'none'
      if (p.demoGif) {
        var img = demoSection.querySelector('img')
        if (img) img.src = p.demoGif
      }
    }

    // Product Hunt badge
    var phSection = document.getElementById('hero-producthunt')
    if (phSection) {
      phSection.style.display = p.productHunt ? '' : 'none'
      if (p.productHunt) {
        var a = phSection.querySelector('a')
        var img = phSection.querySelector('img')
        if (a) a.href = p.productHunt
        if (img) img.src = p.productHuntImg
      }
    }
  }

  /* ── Features section ── */
  function updateFeatures(product) {
    var p = PRODUCTS[product]
    var prefix = p.i18nPrefix
    var colors = ['orange', 'violet', 'cyan']

    // Title & subtitle
    var titleEl = document.getElementById('features-title')
    var subEl = document.getElementById('features-sub')
    if (titleEl) titleEl.textContent = getT(prefix + 'features.title', 'features.title')
    if (subEl) subEl.textContent = getT(prefix + 'features.sub', 'features.sub')

    // Feature cards
    var cards = document.querySelectorAll('.feature-card')
    p.features.forEach(function (feat, i) {
      if (!cards[i]) return
      var card = cards[i]

      // Icon
      var iconEl = card.querySelector('.feature-icon')
      if (iconEl && FEATURE_ICONS[feat.icon]) {
        iconEl.innerHTML = FEATURE_ICONS[feat.icon]
      }

      // Title & desc
      var h3 = card.querySelector('h3')
      var pEl = card.querySelector('p')
      if (h3) h3.textContent = getT(feat.i18n + '.title')
      if (pEl) pEl.textContent = getT(feat.i18n + '.desc')
    })
  }

  /* ── Steps section ── */
  function updateSteps(product) {
    var p = PRODUCTS[product]
    var prefix = p.i18nPrefix

    var titleEl = document.getElementById('steps-title')
    var subEl = document.getElementById('steps-sub')
    if (titleEl) titleEl.textContent = getT(prefix + 'steps.title', 'steps.title')
    if (subEl) subEl.textContent = getT(prefix + 'steps.sub', 'steps.sub')

    var cards = document.querySelectorAll('.step-card')
    p.steps.forEach(function (stepKey, i) {
      if (!cards[i]) return
      var h3 = cards[i].querySelector('h3')
      var pEl = cards[i].querySelector('p')
      if (h3) h3.textContent = getT(stepKey + '.title')
      if (pEl) {
        var val = getT(stepKey + '.desc')
        var tmp = document.createElement('div')
        tmp.innerHTML = val
        tmp.querySelectorAll('script,iframe,object,embed,form').forEach(function (n) {
          n.remove()
        })
        pEl.innerHTML = tmp.innerHTML
      }
    })
  }

  /* ── CTA section ── */
  function updateCTA(product) {
    var p = PRODUCTS[product]
    var prefix = p.i18nPrefix

    var titleEl = document.getElementById('cta-title')
    var descEl = document.getElementById('cta-desc')
    if (titleEl) titleEl.textContent = getT(prefix + 'cta.title', 'cta.title')
    if (descEl) descEl.textContent = getT(prefix + 'cta.desc', 'cta.desc')

    // CTA download links & labels
    var ctaMac = document.getElementById('cta-mac')
    var ctaWin = document.getElementById('cta-win')
    var base = 'https://github.com/' + p.github + '/releases/latest/download/'
    if (ctaMac) {
      ctaMac.href = base + p.dmg
      var span = ctaMac.querySelector('span')
      if (span) span.textContent = getT(prefix + 'cta.downloadMac', 'cta.downloadMac')
    }
    if (ctaWin) {
      ctaWin.href = base + p.exe
      var span = ctaWin.querySelector('span')
      if (span) span.textContent = getT(prefix + 'cta.downloadWin', 'cta.downloadWin')
    }
  }

  /* ── Cross banner ── */
  function updateCrossBanner(product) {
    var other = product === 'claw' ? 'code' : 'claw'
    var otherP = PRODUCTS[other]
    var bannerKey = 'crossBanner.' + other

    var bannerTitle = document.getElementById('cross-banner-title')
    var bannerDesc = document.getElementById('cross-banner-desc')
    var bannerBtn = document.getElementById('cross-banner-btn')

    if (bannerTitle) bannerTitle.textContent = getT(bannerKey + '.title')
    if (bannerDesc) bannerDesc.textContent = getT(bannerKey + '.desc')
    if (bannerBtn) {
      bannerBtn.textContent = getT(bannerKey + '.btn')
      bannerBtn.setAttribute('data-product', other)
    }

    // Update banner accent
    var card = document.querySelector('.cross-banner-card')
    if (card) {
      card.style.borderColor = otherP.accent.replace(')', ', 0.2)').replace('rgb', 'rgba')
      card.style.borderColor = 'rgba(' + hexToRgb(otherP.accent) + ', 0.15)'
    }
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16)
    var g = parseInt(hex.slice(3, 5), 16)
    var b = parseInt(hex.slice(5, 7), 16)
    return r + ', ' + g + ', ' + b
  }

  /* ── Meta tags ── */
  function updateMeta(product) {
    var p = PRODUCTS[product]
    var prefix = p.i18nPrefix

    document.title = getT(prefix + 'meta.title', 'meta.title')
    var metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', getT(prefix + 'meta.description', 'meta.description'))
  }

  /* ── Version badge ── */
  function fetchVersion(product) {
    var p = PRODUCTS[product]
    var badge = document.getElementById('version-badge')
    if (!badge) return

    badge.textContent = getT(p.i18nPrefix + 'hero.versionLoading', 'hero.versionLoading')

    fetch('https://api.github.com/repos/' + p.github + '/releases/latest')
      .then(function (r) {
        return r.json()
      })
      .then(function (d) {
        if (d.tag_name && currentProduct === product) {
          badge.textContent =
            d.tag_name + ' ' + getT(p.i18nPrefix + 'hero.versionRelease', 'hero.versionRelease')
        }
      })
      .catch(function () {
        if (currentProduct === product) {
          badge.textContent = getT(p.i18nPrefix + 'hero.versionFallback', 'hero.versionFallback')
        }
      })
  }

  /* ── Nav download button ── */
  function updateNavDownload(product) {
    var p = PRODUCTS[product]
    var navDl = document.querySelector('.nav-download')
    if (navDl) {
      navDl.href =
        'https://github.com/' + p.github + '/releases/latest/download/' + p.dmg
    }
  }

  /* ── Main switch ── */
  function switchProduct(product, pushState) {
    if (!PRODUCTS[product]) product = 'claw'
    currentProduct = product
    var p = PRODUCTS[product]

    applyAccent(p)
    updateNavTabs(product)
    updateNavLogo(product)
    updateNavDownload(product)
    updateHero(product)
    updateFeatures(product)
    updateSteps(product)
    updateCTA(product)
    updateCrossBanner(product)
    updateMeta(product)
    fetchVersion(product)

    if (pushState) {
      history.pushState({ product: product }, '', p.path)
    }
  }

  /* ── Refresh (called after language change) ── */
  window.refreshProduct = function () {
    if (currentProduct) switchProduct(currentProduct, false)
  }

  /* ── Navigation click handler ── */
  function handleNavClick(e) {
    var tab = e.target.closest('[data-product]')
    if (!tab) return
    e.preventDefault()
    var product = tab.getAttribute('data-product')
    if (product !== currentProduct) {
      switchProduct(product, true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* ── popstate ── */
  window.addEventListener('popstate', function (e) {
    var product = (e.state && e.state.product) || detectProduct()
    switchProduct(product, false)
  })

  /* ── Init ── */
  function init() {
    // Bind nav tab clicks
    var navTabs = document.querySelector('.nav-tabs')
    if (navTabs) navTabs.addEventListener('click', handleNavClick)

    // Bind cross-banner button
    var crossBannerBtn = document.getElementById('cross-banner-btn')
    if (crossBannerBtn) {
      crossBannerBtn.addEventListener('click', function (e) {
        e.preventDefault()
        var product = this.getAttribute('data-product')
        switchProduct(product, true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }

    // Detect & switch
    var product = detectProduct()
    history.replaceState({ product: product }, '', PRODUCTS[product].path)
    switchProduct(product, false)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
