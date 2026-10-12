// SİTE — ortak davranışlar: iletişim bilgilerini ayarlardan doldurma ve MÜŞTERİ PORTALI (koleksiyon + sipariş).
(function () {
  const S = window.SITE || {};
  const doldurulmus = (v) => v && !/^\[.*\]$/.test(v);
  const rpc = (ad, govde) => fetch(S.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/" + ad, {
    method: "POST",
    headers: { apikey: S.supabaseAnahtar, Authorization: "Bearer " + S.supabaseAnahtar, "Content-Type": "application/json" },
    body: JSON.stringify(govde || {}),
  }).then(async (r) => {
    const metin = await r.text();
    let veri = null; try { veri = metin ? JSON.parse(metin) : null; } catch (e) { /* düz metin */ }
    if (!r.ok) throw new Error((veri && veri.message) || metin || ("HTTP " + r.status));
    return veri;
  });

  // SİTE AYARLARI ERP'DEN (v1.647.0 — kullanıcı: "uygulama içerisinden yapalım, site tasarımı v.s tüm hepsini"):
  // ERP › Tanımlar › Firma › Web Sitesi → `site_ayarlari()`. Gelmezse (ağ / fonksiyon kurulmamış) sayfadaki yazılar
  // ve ayarlar.js kalır. En çok 4 sn beklenir; site boş beklemesin.
  const zamanAsimi = new Promise((coz) => setTimeout(() => coz(null), 4000));
  Promise.race([rpc("site_ayarlari").catch(() => null), zamanAsimi]).then((a) => {
    if (a && typeof a === "object") uygula(a);
    iletisimDoldur();
    portal();
  });

  function uygula(a) {
    Object.keys(a).forEach((k) => { if (a[k] !== "" && a[k] != null) S[k] = a[k]; });
    // Yazılar: boş gelen alan sayfadakini ezmez (altYazi hariç — o isteğe bağlı, boşsa boş).
    document.querySelectorAll("[data-yazi]").forEach((el) => {
      const v = a[el.dataset.yazi];
      if (typeof v === "string" && (v.trim() || el.dataset.yazi === "altYazi")) el.textContent = v;
    });
    if (a.marka) document.title = a.marka + (a.ustEtiket ? " — " + a.ustEtiket : "");
    if (/^#[0-9a-f]{6}$/i.test(a.vurguRengi || "")) {
      document.documentElement.style.setProperty("--vurgu", a.vurguRengi);
      document.documentElement.style.setProperty("--vurgu-koyu", "color-mix(in srgb, " + a.vurguRengi + " 72%, #000)");
    }
    if (a.tema === "acik" || a.tema === "koyu") document.documentElement.dataset.tema = a.tema;
    if (a.logo && /^(data:image\/|https:)/.test(a.logo)) {
      const yer = document.querySelector("[data-logo]");
      if (yer) { const img = document.createElement("img"); img.src = a.logo; img.alt = ""; yer.replaceChildren(img); yer.classList.add("resimli"); }
    }
    const kartlar = document.querySelector("[data-uretim-kartlari]");
    const bolum = document.getElementById("uretim");
    if (a.uretimGoster === false) {
      if (bolum) bolum.hidden = true;
      document.querySelectorAll("[data-uretim-menu]").forEach((m) => { m.hidden = true; });
    } else if (kartlar && Array.isArray(a.uretimKartlari) && a.uretimKartlari.length) {
      kartlar.replaceChildren(...a.uretimKartlari.map((k) => {
        const d = document.createElement("div"); d.className = "kart";
        const i = document.createElement("div"); i.className = "ikon"; i.textContent = k.ikon || "";
        const h = document.createElement("h3"); h.textContent = k.baslik || "";
        const p = document.createElement("p"); p.textContent = k.metin || "";
        d.append(...(k.ikon ? [i] : []), h, p);
        return d;
      }));
    }
  }

  // [data-site="alan"] öğelerine değer yazılır; doldurulmamış alanın kartı gizlenir.
  function iletisimDoldur() {
    document.querySelectorAll("[data-site]").forEach((el) => {
      const v = S[el.dataset.site]; const k = el.closest("[data-site-kart]");
      if (!doldurulmus(v)) { if (k) k.hidden = true; return; }
      if (k) k.hidden = false;
      el.textContent = v;
      if (el.dataset.site === "telefon") el.href = "tel:" + v.replace(/[^\d+]/g, "");
      if (el.dataset.site === "eposta") el.href = "mailto:" + v;
    });
    document.querySelectorAll("[data-site-href]").forEach((el) => {
      const v = S[el.dataset.siteHref]; const k = el.closest("[data-site-kart]");
      if (doldurulmus(v) && /^https:\/\//.test(v)) { el.href = v; el.hidden = false; if (k) k.hidden = false; }
      else { el.hidden = true; if (k) k.hidden = true; }
    });
    const wa = document.querySelector("[data-whatsapp]");
    if (wa) { const n = String(S.whatsapp || "").replace(/\D/g, ""); if (n) { wa.href = "https://wa.me/" + n; wa.hidden = false; } else wa.hidden = true; }
    const harita = document.querySelector("[data-harita]");
    if (harita) {
      const k = harita.closest("[data-site-kart]");
      if (S.haritaSorgusu) { harita.src = "https://www.google.com/maps?q=" + encodeURIComponent(S.haritaSorgusu) + "&output=embed"; if (k) k.hidden = false; }
      else if (k) k.hidden = true;
    }
    const yil = document.querySelector("[data-yil]");
    if (yil) yil.textContent = new Date().getFullYear();
  }

  function portal() {
  // ================= MÜŞTERİ PORTALI =================
  // Koleksiyon herkese açık DEĞİL: müşteri, firmanın ERP'de cari kartından verdiği kodla girer. Sunucu (`portal()`,
  // site-portal.sql) yalnız o müşteriye görünür modelleri ve ONA ÖZEL fiyatları döndürür; sipariş `portal_siparis()` ile
  // TALEP olarak ERP'ye düşer, firma onaylayınca siparişe çevrilir. Fiyatı sunucu yeniden bulur — buradaki gösterim içindir.
  const alan = document.querySelector("[data-portal]");
  if (!alan) return;
  const KOD_ANAHTARI = "nd-portal-oturum";   // v1.649: oturum anahtarı (eski "nd-portal-kod" artık geçersiz)
  const depo = {
    al() { try { return localStorage.getItem(KOD_ANAHTARI) || ""; } catch (e) { return ""; } },
    yaz(v) { try { if (v) localStorage.setItem(KOD_ANAHTARI, v); else localStorage.removeItem(KOD_ANAHTARI); } catch (e) { /* gizli pencere */ } },
  };
  const HATA = {
    GECERSIZ_KOD: "Oturumunuz sona erdi ya da erişiminiz kapatıldı. Lütfen yeniden giriş yapın.",
    GUNLUK_SINIR: "Bugün için sipariş sınırına ulaştınız; lütfen bizi arayın.",
    GECERSIZ_MODEL: "Sepetteki bir model artık listenizde değil. Sayfayı yenileyip tekrar deneyin.",
    GECERSIZ_RENK_BEDEN: "Sepetteki bir renk/beden artık yok. Sayfayı yenileyip tekrar deneyin.",
    GECERSIZ_MIKTAR: "Adetler 1 ile 5000 arasında tam sayı olmalı.",
    BOS_SIPARIS: "Sepet boş.",
    COK_KALEM: "Sepette çok fazla satır var; siparişi ikiye bölün.",
  };
  const hataMetni = (e) => { const m = String((e && e.message) || e); const k = Object.keys(HATA).find((x) => m.includes(x)); return k ? HATA[k] : "Bağlantı kurulamadı. Biraz sonra tekrar deneyin."; };
  const para = (n, pb) => { try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: pb || "TRY", maximumFractionDigits: 2 }).format(n); } catch (e) { return n + " " + (pb || ""); } };
  // Küçük DOM yardımcısı: metinler daima textContent ile girer (ERP'den gelen ad/renk HTML olarak yorumlanmaz).
  const el = (etiket, ozellik, ...cocuklar) => {
    const d = document.createElement(etiket);
    Object.entries(ozellik || {}).forEach(([k, v]) => {
      if (k === "class") d.className = v; else if (k.startsWith("on")) d[k] = v; else if (v != null && v !== false) d.setAttribute(k, v === true ? "" : v);
    });
    cocuklar.flat().forEach((c) => { if (c != null && c !== false) d.append(c.nodeType ? c : String(c)); });
    return d;
  };

  let kod = depo.al();
  let veri = null;          // { unvan, asortiler, modeller }
  let sepet = [];           // [{urunId, urunAd, renk, beden, miktar, birimFiyat, paraBirimi}]
  let secili = "Tümü";

  function bilgi(metin) { alan.replaceChildren(el("div", { class: "bilgi" }, metin)); }

  // KULLANICI ADI + ŞİFRE (v1.649.0 — kullanıcı: "müşteri giriş yaparken kullanıcı adı ve şifre ile girsin").
  // `portal_giris` doğruysa 30 günlük oturum anahtarı döner (yanlışsa boş); anahtar `kod` olarak saklanır ve bütün
  // çağrılara geçer. Şifre tarayıcıda saklanmaz.
  function girisCiz(hata) {
    const kAd = el("input", { class: "giris-kutu", placeholder: "Kullanıcı adı", autocomplete: "username", autocapitalize: "none", spellcheck: "false", maxlength: "40", "aria-label": "Kullanıcı adı", name: "username" });
    const kSifre = el("input", { class: "giris-kutu", type: "password", placeholder: "Şifre", autocomplete: "current-password", maxlength: "100", "aria-label": "Şifre", name: "password" });
    const dugme = el("button", { class: "btn dolu", type: "submit" }, "Giriş");
    const istek = S.whatsapp
      ? el("a", { href: "https://wa.me/" + String(S.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent("Merhaba, müşteri girişi için kullanıcı adı ve şifre rica ediyorum."), target: "_blank", rel: "noopener" }, "Bizden isteyin")
      : el("a", { href: "#iletisim" }, "Bizden isteyin");
    const hataP = el("p", { class: "hata" }, hata || ""); if (!hata) hataP.hidden = true;
    const form = el("form", { class: "portal-giris" },
      el("h3", {}, "Müşteri girişi"),
      el("p", {}, "Kullanıcı adınız ve şifrenizle girin; modelleri, size özel fiyatları, siparişlerinizi ve hesabınızı görün."),
      el("div", { class: "giris-alanlar" }, kAd, kSifre, dugme),
      hataP,
      el("p", { class: "kucuk" }, "Giriş bilginiz yok ya da şifrenizi mi unuttunuz? ", istek));
    form.onsubmit = (e) => {
      e.preventDefault();
      const ad = kAd.value.trim(), sifre = kSifre.value;
      if (!ad || !sifre) return;
      dugme.disabled = true; dugme.textContent = "Giriş…"; hataP.hidden = true;
      rpc("portal_giris", { p_kullanici: ad, p_sifre: sifre })
        .then((anahtar) => { if (!anahtar) throw new Error("GECERSIZ_GIRIS"); yukle(anahtar); })
        .catch((er) => {
          const m = String((er && er.message) || er);
          dugme.disabled = false; dugme.textContent = "Giriş"; kSifre.value = "";
          hataP.textContent = /GECERSIZ_GIRIS/.test(m) ? "Kullanıcı adı ya da şifre hatalı." : /HESAP_KILITLI/.test(m) ? "Çok sayıda hatalı deneme: 15 dakika sonra tekrar deneyin." : "Bağlantı kurulamadı. Biraz sonra tekrar deneyin.";
          hataP.hidden = false; kSifre.focus();
        });
    };
    alan.replaceChildren(form);
  }

  function yukle(yeniKod) {
    bilgi("Koleksiyon yükleniyor…");
    rpc("portal", { p_kod: yeniKod })
      .then((v) => { kod = yeniKod; depo.yaz(kod); veri = v || { modeller: [], asortiler: [] }; ciz(); })
      .catch((e) => { const m = hataMetni(e); if (m === HATA.GECERSIZ_KOD) { depo.yaz(""); kod = ""; } girisCiz(m); });
  }

  function cikis() { if (kod) rpc("portal_cikis", { p_kod: kod }).catch(() => {}); depo.yaz(""); kod = ""; veri = null; sepet = []; hesap = null; sekme = "koleksiyon"; sepetGitYenile(); girisCiz(); }

  // ÜÇ SEKME (v1.648.0 — kullanıcı: "carinin de ekranı olsun, hesaplarını ve siparişlerini de kontrol edebileceği"):
  // Koleksiyon (sipariş verme) · Hesabım (bakiye, ekstre, çekler) · Siparişlerim. Hesap/sipariş verisi `portal_hesap()`
  // ile, sekme açılınca okunur (koleksiyon açılışını yavaşlatmasın).
  let sekme = "koleksiyon";
  let hesap = null;          // portal_hesap cevabı
  const bugun = () => new Date().toISOString().slice(0, 10);
  let aralik = { bas: new Date(Date.now() - 92 * 864e5).toISOString().slice(0, 10), bit: bugun() };

  function ciz() {
    const ust = el("div", { class: "portal-ust" },
      el("span", {}, "Hoş geldiniz, ", el("b", {}, veri.unvan || "")),
      el("button", { class: "bag", type: "button", onclick: cikis }, "Çıkış"));
    const sekmeler = el("div", { class: "portal-sekmeler", role: "tablist" },
      ...[["koleksiyon", "Koleksiyon"], ["hesap", "Hesabım"], ["siparis", "Siparişlerim"]].map(([k, ad]) =>
        el("button", { type: "button", role: "tab", class: sekme === k ? "etkin" : "", "aria-selected": sekme === k ? "true" : "false", onclick: () => { sekme = k; ciz(); } }, ad)));
    let govde;
    if (sekme === "koleksiyon") govde = koleksiyonCiz();
    else if (!hesap) { govde = el("div", { class: "bilgi" }, "Yükleniyor…"); hesapYukle(); }
    else govde = sekme === "hesap" ? hesapCiz() : siparislerCiz();
    alan.replaceChildren(ust, sekmeler, govde);
  }

  function hesapYukle() {
    rpc("portal_hesap", { p_kod: kod, p_baslangic: aralik.bas, p_bitis: aralik.bit })
      .then((h) => { hesap = h; ciz(); })
      .catch((e) => {
        const m = String((e && e.message) || e);
        alan.lastChild.replaceWith(el("div", { class: "bilgi" }, /GECERSIZ_KOD/.test(m) ? HATA.GECERSIZ_KOD : /GECERSIZ_TARIH/.test(m) ? "Tarih aralığı geçersiz." : "Hesap bilgisi alınamadı. Biraz sonra tekrar deneyin."));
      });
  }

  function koleksiyonCiz() {
    const modeller = veri.modeller || [];
    const tipler = Array.from(new Set(modeller.map((u) => u.tip).filter(Boolean)));
    const suzgec = el("div", { class: "suzgec" });
    if (tipler.length > 1) ["Tümü", ...tipler].forEach((t) => suzgec.append(el("button", { type: "button", class: t === secili ? "etkin" : "", onclick: () => { secili = t; ciz(); } }, t)));
    const izgara = el("div", { class: "izgara" });
    const gorunen = modeller.filter((u) => secili === "Tümü" || u.tip === secili);
    if (!gorunen.length) izgara.append(el("div", { class: "bilgi", style: "grid-column:1/-1" }, "Size tanımlı model henüz yok. Bilgi için bize ulaşın."));
    gorunen.forEach((u) => izgara.append(urunKarti(u)));
    return el("div", {}, suzgec, el("div", { class: "portal-govde" }, izgara, sepetCiz()));
  }

  const tarihTR = (t) => { if (!t) return ""; const [y, a, g] = String(t).slice(0, 10).split("-"); return g ? g + "." + a + "." + y : t; };
  // Bakiye işareti ERP'deki gibi: artı = müşterinin borcu, eksi = müşterinin alacağı.
  const bakiyeYazi = (t, pb) => t > 0 ? para(t, pb) + " borç" : t < 0 ? para(-t, pb) + " alacak" : para(0, pb);

  function hesapCiz() {
    const bas = el("input", { type: "date", value: aralik.bas, "aria-label": "Başlangıç" });
    const bit = el("input", { type: "date", value: aralik.bit, "aria-label": "Bitiş" });
    const arac = el("div", { class: "hesap-arac" },
      el("label", {}, "Başlangıç ", bas), el("label", {}, "Bitiş ", bit),
      el("button", { type: "button", class: "btn dolu kucuk-btn", onclick: () => { if (bas.value && bit.value) { aralik = { bas: bas.value, bit: bit.value }; hesap = null; ciz(); } } }, "Göster"),
      el("button", { type: "button", class: "btn bos kucuk-btn", onclick: () => window.print() }, "Yazdır"));
    const bloklar = (hesap.hesap || []).map((d) => {
      const coklu = (hesap.hesap || []).length > 1;
      const bakiyeler = Object.entries(d.bakiye || {});
      const ozet = el("div", { class: "bakiye-satir" },
        ...(bakiyeler.length ? bakiyeler : [["TRY", 0]]).map(([pb, t]) => el("div", { class: "bakiye-kutu" + (t > 0 ? " borc" : t < 0 ? " alacak" : "") },
          el("span", {}, "Güncel bakiye" + (bakiyeler.length > 1 ? " (" + pb + ")" : "")), el("b", {}, bakiyeYazi(Number(t), pb)))));
      // Yürüyen bakiye para birimi başına, dönem başı devirden.
      const yuruyen = { ...Object.fromEntries(Object.entries(d.devir || {}).map(([k, v]) => [k, Number(v)])) };
      const satirlar = [];
      Object.entries(d.devir || {}).forEach(([pb, t]) => { if (Number(t)) satirlar.push(el("tr", { class: "devir" }, el("td", {}, tarihTR(hesap.baslangic)), el("td", {}, ""), el("td", {}, "Önceki dönemden devir"), el("td", {}, ""), el("td", {}, ""), el("td", { class: "sayi" }, bakiyeYazi(Number(t), pb)))); });
      (d.hareketler || []).forEach((h) => {
        const pb = h.paraBirimi || "TRY"; const t = Number(h.tutar) || 0;
        yuruyen[pb] = (yuruyen[pb] || 0) + (h.yon === "Borç" ? t : -t);
        const aciklama = [h.aciklama, [h.urunAd, h.renk].filter(Boolean).join(" "), h.odemeSekli, h.vade ? "vade " + tarihTR(h.vade) : ""].filter(Boolean).join(" · ");
        satirlar.push(el("tr", {},
          el("td", {}, tarihTR(h.tarih)), el("td", { class: "mono" }, h.fisNo || h.siparisNo || ""), el("td", {}, aciklama),
          el("td", { class: "sayi" }, h.yon === "Borç" ? para(t, pb) : ""), el("td", { class: "sayi" }, h.yon !== "Borç" ? para(t, pb) : ""),
          el("td", { class: "sayi" }, bakiyeYazi(Math.round(yuruyen[pb] * 100) / 100, pb))));
      });
      const tablo = satirlar.length
        ? el("div", { class: "tablo-kap" }, el("table", { class: "ekstre" },
            el("thead", {}, el("tr", {}, ...["Tarih", "Belge", "Açıklama", "Borç", "Alacak", "Bakiye"].map((b) => el("th", {}, b)))),
            el("tbody", {}, ...satirlar)))
        : el("p", { class: "kucuk" }, "Bu tarih aralığında hareket yok.");
      return el("section", { class: "hesap-blok" }, coklu ? el("h3", {}, d.defter === "Resmi" ? "Resmi hesap" : "Hesap") : null, ozet, tablo);
    });
    const cekler = hesap.cekler || [];
    const cekBlok = cekler.length ? el("section", { class: "hesap-blok" }, el("h3", {}, "Çek ve senetler"),
      el("div", { class: "tablo-kap" }, el("table", { class: "ekstre" },
        el("thead", {}, el("tr", {}, ...["Vade", "No", "Banka", "Tutar", "Durum"].map((b) => el("th", {}, b)))),
        el("tbody", {}, ...cekler.map((c) => el("tr", { class: c.durum === "Portföyde" && c.vade && c.vade < bugun() ? "gecti" : "" },
          el("td", {}, tarihTR(c.vade)), el("td", { class: "mono" }, c.cekNo || ""), el("td", {}, c.banka || ""),
          el("td", { class: "sayi" }, para(Number(c.tutar) || 0, c.paraBirimi)), el("td", {}, c.durum || ""))))))) : null;
    return el("div", { class: "hesap" }, arac, el("p", { class: "kucuk yazdir-baslik" }, (veri.unvan || "") + " · " + tarihTR(hesap.baslangic) + " – " + tarihTR(hesap.bitis)), ...bloklar, cekBlok);
  }

  // Küçük ürün resmi (v1.650.0 — "sitede ürün resimleri de olsun, sipariş verilen için"). Resimler `portal_hesap`
  // cevabında model+renk başına bir kez (`resimler["urunId|renk"]`); yoksa boş kutu.
  function minik(src, alt) {
    const k = el("span", { class: "minik" });
    if (src && /^(data:image\/|https:)/.test(src)) k.append(el("img", { src, alt: alt || "", loading: "lazy" }));
    return k;
  }
  const hesapResmi = (k) => (hesap && hesap.resimler && hesap.resimler[(k.urunId || "") + "|" + (k.renk || "")]) || "";

  // Para birimi başına toplam ("₺5.120,00 + $60,00"); para birimleri toplanmaz.
  function tutarToplami(kalemler) {
    const t = {};
    (kalemler || []).forEach((k) => { if (k.tutar != null) t[k.paraBirimi || "TRY"] = (t[k.paraBirimi || "TRY"] || 0) + Number(k.tutar); });
    return Object.entries(t).map(([pb, v]) => para(v, pb)).join(" + ");
  }

  // KAPORA / ÖDENEN (kullanıcı: "siparişe dayalı kapora var ise o da görünsün"). Sunucu ERP'nin kuralıyla siparişe bağlı
  // tahsilatları ve KDV dahil toplamı verir; kalan yalnız aynı para biriminde hesaplanır (kur çevirmesi yapılmaz).
  function odemeOzeti(s) {
    const odenen = Object.entries(s.odenen || {}).filter(([, t]) => Number(t));
    const kdvli = s.kdvDahil || {};
    const kdvFarkli = Object.entries(kdvli).some(([pb, t]) => Math.abs(Number(t) - (s.kalemler || []).filter((k) => (k.paraBirimi || "TRY") === pb).reduce((a, k) => a + Number(k.tutar || 0), 0)) > 0.005);
    if (!odenen.length && !kdvFarkli) return null;
    const satir = (ad, deger, sinif) => el("div", { class: "odeme-satir " + (sinif || "") }, el("span", {}, ad), el("b", {}, deger));
    const kalan = Object.entries(kdvli).map(([pb, t]) => [pb, Math.max(0, Math.round((Number(t) - Number((s.odenen || {})[pb] || 0)) * 100) / 100)]);
    return el("div", { class: "odeme-ozet" },
      kdvFarkli ? satir("KDV dahil toplam", Object.entries(kdvli).map(([pb, t]) => para(Number(t), pb)).join(" + ")) : null,
      odenen.length ? satir("Ödenen (kapora)", odenen.map(([pb, t]) => para(Number(t), pb)).join(" + "), "yesil") : null,
      odenen.length ? satir("Kalan", kalan.map(([pb, t]) => para(t, pb)).join(" + "), "kalin") : null);
  }

  function siparislerCiz() {
    const talepler = hesap.talepler || [];
    const sip = hesap.siparisler || [];
    const talepBlok = talepler.length ? el("section", { class: "hesap-blok" }, el("h3", {}, "Siteden gönderdikleriniz"),
      ...talepler.map((t) => el("div", { class: "sip-kart" },
        el("div", { class: "sip-bas" }, el("b", {}, tarihTR(String(t.tarih).slice(0, 10))), el("span", {}, t.toplamCift + " çift"),
          el("span", { class: "rozet " + (t.durum === "reddedildi" ? "kirmizi" : "sari") }, t.durum === "reddedildi" ? "Kabul edilmedi" : "Onay bekliyor")),
        el("div", { class: "talep-kalemler" }, ...(t.kalemler || []).map((k) => el("div", { class: "talep-kalem" },
          minik(hesapResmi(k), k.urunAd), el("span", {}, el("b", {}, k.urunAd || ""), " · ", k.renk || ""),
          el("span", { class: "kucuk" }, k.miktar + " çift" + (k.tutar != null ? " · " + para(Number(k.tutar), k.paraBirimi) : ""))))),
        (t.kalemler || []).some((k) => k.tutar != null) ? el("div", { class: "kucuk", style: "text-align:right" }, "Toplam " + tutarToplami(t.kalemler)) : null,
        t.not ? el("div", { class: "kucuk" }, t.not) : null))) : null;
    const kartlar = sip.map((s) => {
      const top = (s.kalemler || []).reduce((a, k) => ({ m: a.m + Number(k.miktar || 0), t: a.t + Number(k.teslim || 0) }), { m: 0, t: 0 });
      const durum = top.m && top.t >= top.m ? ["Teslim edildi", "yesil"] : top.t > 0 ? ["Kısmen teslim", "sari"] : ["Hazırlanıyor", "mavi"];
      return el("div", { class: "sip-kart" },
        el("div", { class: "sip-bas" }, el("b", { class: "mono" }, s.siparisNo || ""), el("span", {}, tarihTR(s.tarih)),
          s.belgeNo ? el("span", { class: "kucuk" }, "Belge " + s.belgeNo) : null,
          s.teslimTarihi ? el("span", { class: "kucuk" }, "Termin " + tarihTR(s.teslimTarihi)) : null,
          el("span", { class: "rozet " + durum[1] }, durum[0])),
        // SABİT SÜTUNLAR (kullanıcı: "sütunlar kayıyor"): her sipariş ayrı tablo, genişlik içerikten hesaplanınca
        // siparişten siparişe kayıyordu → table-layout: fixed + aynı colgroup.
        el("div", { class: "tablo-kap" }, el("table", { class: "ekstre sip-tablo" },
          el("colgroup", {}, ...[30, 16, 9, 9, 9, 12, 15].map((w) => el("col", { style: "width:" + w + "%" }))),
          el("thead", {}, el("tr", {}, ...["Model", "Renk", "Sipariş", "Teslim", "Kalan", "Fiyat", "Tutar"].map((b, i) => el("th", { class: i >= 2 ? "sayi" : "" }, b)))),
          el("tbody", {}, ...(s.kalemler || []).map((k) => el("tr", {},
            el("td", {}, el("span", { class: "model-hucre" }, minik(hesapResmi(k), k.urunAd), k.urunAd || "")), el("td", {}, k.renk || ""), el("td", { class: "sayi" }, String(k.miktar)),
            el("td", { class: "sayi" }, String(k.teslim)), el("td", { class: "sayi" }, String(Math.max(0, k.miktar - k.teslim))),
            // Fiyat + tutar (kullanıcı: "sipariş fiyat ve tutar da görünsün"). Beden fiyatları farklıysa fiyat ortalamadır.
            el("td", { class: "sayi" }, k.fiyat != null ? para(Number(k.fiyat), k.paraBirimi) : ""),
            el("td", { class: "sayi" }, k.tutar != null ? para(Number(k.tutar), k.paraBirimi) : "")))),
          el("tfoot", {}, el("tr", {}, el("td", {}, "Toplam"), el("td", {}, ""), el("td", { class: "sayi" }, String(top.m)), el("td", { class: "sayi" }, String(top.t)), el("td", { class: "sayi" }, String(Math.max(0, top.m - top.t))),
            el("td", {}, ""), el("td", { class: "sayi" }, tutarToplami(s.kalemler)))))), odemeOzeti(s));
    });
    if (!talepBlok && !kartlar.length) return el("div", { class: "bilgi" }, "Henüz siparişiniz yok.");
    return el("div", { class: "hesap" }, talepBlok, kartlar.length ? el("section", { class: "hesap-blok" }, el("h3", {}, "Siparişleriniz"), ...kartlar) : null);
  }

  // Kart: renk düğmesi o rengin resmini açar ve siparişin rengini seçer; altta sipariş girişi.
  function urunKarti(u) {
    const resimler = u.renk_resimleri || {};
    const renkler = (u.renkler || []).filter((r) => r && r !== "Standart");
    const tumRenkler = renkler.length ? renkler : (u.renkler || []);
    let renk = tumRenkler[0] || "";
    const resimKutu = el("div", { class: "urun-resim" });
    const goster = (src) => resimKutu.replaceChildren(src ? el("img", { src, alt: u.ad, loading: "lazy" }) : el("span", { class: "yok" }, "Görsel yakında"));
    goster(resimler[renk] || u.kapak_resmi);
    const rk = el("div", { class: "renkler" });
    tumRenkler.forEach((r) => rk.append(el("button", { type: "button", class: "renk" + (r === renk ? " etkin" : ""), onclick: (e) => {
      renk = r; rk.querySelectorAll(".renk").forEach((x) => x.classList.toggle("etkin", x === e.currentTarget)); goster(resimler[r] || u.kapak_resmi);
    } }, r)));
    const alt = [u.tip, [u.sezon, u.sezon_yili].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    return el("article", { class: "urun" }, resimKutu,
      el("div", { class: "urun-govde" },
        el("div", { class: "urun-ad" }, u.ad),
        alt ? el("div", { class: "urun-alt" }, alt) : null,
        el("div", { class: "fiyat" }, para(u.fiyat, u.para_birimi), el("span", {}, " / çift")),
        rk,
        siparisGirisi(u, () => renk)));
  }

  function bedenSirala(b) { return b.slice().sort((x, y) => (parseFloat(x) - parseFloat(y)) || String(x).localeCompare(String(y), "tr")); }

  // İki giriş yolu (kullanıcı kararı: "ikisi de"): asorti × koli adedi ya da beden beden çift.
  function siparisGirisi(u, renkAl) {
    const bedenler = bedenSirala((u.bedenler || []).map(String));
    // Yalnız bütün bedenleri bu modelde olan asortiler: olmayan beden sessizce düşse müşteri eksik koli sipariş ederdi.
    const asortiler = (veri.asortiler || []).filter((a) => (a.oranlar || []).length && a.oranlar.every((o) => bedenler.includes(String(o.beden))));
    let kip = asortiler.length ? "asorti" : "beden";
    const kutu = el("div", { class: "siparis-giris" });
    const yeniden = () => {
      const sekme = (k, ad) => el("button", { type: "button", class: kip === k ? "etkin" : "", onclick: () => { kip = k; yeniden(); } }, ad);
      const sekmeler = asortiler.length ? el("div", { class: "kip" }, sekme("asorti", "Asorti"), sekme("beden", "Beden beden")) : null;
      let govde, topla;
      if (kip === "asorti") {
        const sec = el("select", { "aria-label": "Asorti" }, ...asortiler.map((a) => el("option", { value: a.id }, a.ad + " (" + a.oranlar.map((o) => o.beden + "×" + o.oran).join(" ") + ")")));
        const koli = el("input", { type: "number", min: "1", step: "1", value: "1", class: "adet", inputmode: "numeric", "aria-label": "Koli adedi" });
        govde = el("div", { class: "satir" }, sec, koli, el("span", { class: "kucuk" }, "koli"));
        topla = () => {
          const a = asortiler.find((x) => x.id === sec.value); const n = parseInt(koli.value, 10);
          if (!a || !(n > 0)) return [];
          return a.oranlar.map((o) => ({ beden: String(o.beden), miktar: Math.round(o.oran * n) })).filter((x) => x.miktar > 0);
        };
      } else {
        const kutular = bedenler.map((b) => ({ b, g: el("input", { type: "number", min: "0", step: "1", placeholder: "0", class: "adet", inputmode: "numeric", "aria-label": "Beden " + b }) }));
        govde = el("div", { class: "bedenler" }, ...kutular.map((x) => el("label", {}, el("span", {}, x.b), x.g)));
        topla = () => kutular.map((x) => ({ beden: x.b, miktar: parseInt(x.g.value, 10) || 0 })).filter((x) => x.miktar > 0);
      }
      const ekle = el("button", { type: "button", class: "btn dolu kucuk-btn", onclick: () => {
        const renk = renkAl(); const satirlar = topla();
        if (!renk) return;
        if (!satirlar.length) { ekle.textContent = "Adet girin"; setTimeout(() => { ekle.textContent = "Sepete ekle"; }, 1400); return; }
        satirlar.forEach((s) => {
          const varolan = sepet.find((x) => x.urunId === u.id && x.renk === renk && x.beden === s.beden);
          if (varolan) varolan.miktar += s.miktar;
          else sepet.push({ urunId: u.id, urunAd: u.ad, renk, beden: s.beden, miktar: s.miktar, birimFiyat: u.fiyat, paraBirimi: u.para_birimi });
        });
        yenileSepet();
        ekle.textContent = "Eklendi ✓"; setTimeout(() => { ekle.textContent = "Sepete ekle"; }, 1200);
      } }, "Sepete ekle");
      kutu.replaceChildren(...[sekmeler, govde, ekle].filter(Boolean));
    };
    yeniden();
    return kutu;
  }

  let sepetKutu = null;
  // Telefonda sepet modellerin altında kalıyor: dolu sepet için solda sabit "Sepet (n çift)" kısayolu.
  const sepetGit = el("a", { class: "sepet-git", href: "#sepet", hidden: true });
  document.body.append(sepetGit);
  function sepetGitYenile() { const n = sepet.reduce((s, x) => s + x.miktar, 0); sepetGit.hidden = !n; sepetGit.textContent = "Sepet · " + n + " çift"; }
  function yenileSepet() { if (sepetKutu) sepetKutu.replaceWith(sepetCiz()); sepetGitYenile(); }

  function sepetCiz(tesekkur) {
    const kutu = el("aside", { class: "sepet", id: "sepet" });
    sepetKutu = kutu;
    if (tesekkur) kutu.append(el("p", { class: "tamam" }, "Siparişiniz alındı, teşekkürler. Kontrol edip size dönüş yapacağız."));
    if (!sepet.length) { kutu.append(el("h3", {}, "Sepet"), el("p", { class: "kucuk" }, "Modelde renk seçip adet girin, sepete ekleyin.")); return kutu; }
    const toplamCift = sepet.reduce((s, x) => s + x.miktar, 0);
    const toplamlar = {};
    sepet.forEach((x) => { toplamlar[x.paraBirimi] = (toplamlar[x.paraBirimi] || 0) + x.miktar * x.birimFiyat; });
    // Satırlar model + renk altında toplanır: "Bot A · Siyah — 36×2  37×4".
    const gruplar = [];
    sepet.forEach((x) => {
      let g = gruplar.find((y) => y.urunId === x.urunId && y.renk === x.renk);
      if (!g) { g = { urunId: x.urunId, urunAd: x.urunAd, renk: x.renk, satirlar: [] }; gruplar.push(g); }
      g.satirlar.push(x);
    });
    const liste = el("div", { class: "sepet-liste" }, ...gruplar.map((g) => el("div", { class: "sepet-satir" },
      (() => { const u = ((veri && veri.modeller) || []).find((m) => m.id === g.urunId); return minik(u ? ((u.renk_resimleri || {})[g.renk] || u.kapak_resmi) : "", g.urunAd); })(),
      el("div", { style: "flex:1;min-width:0" }, el("b", {}, g.urunAd), " · ", g.renk,
        el("div", { class: "kucuk" }, bedenSirala(g.satirlar.map((s) => s.beden)).map((b) => b + "×" + g.satirlar.find((s) => s.beden === b).miktar).join("  "))),
      el("button", { type: "button", class: "bag", onclick: () => { sepet = sepet.filter((s) => !(s.urunId === g.urunId && s.renk === g.renk)); yenileSepet(); } }, "Kaldır"))));
    const not = el("textarea", { rows: "2", placeholder: "Not (teslim tarihi, kutu, etiket…)", maxlength: "1000" });
    const durum = el("p", { class: "kucuk" });
    const gonder = el("button", { type: "button", class: "btn dolu", onclick: () => {
      gonder.disabled = true; durum.className = "kucuk"; durum.textContent = "Gönderiliyor…";
      rpc("portal_siparis", { p_kod: kod, p_kalemler: sepet.map((s) => ({ urunId: s.urunId, renk: s.renk, beden: s.beden, miktar: s.miktar })), p_not: not.value })
        .then(() => { sepet = []; hesap = null; kutu.replaceWith(sepetCiz(true)); sepetGitYenile(); })
        .catch((e) => { gonder.disabled = false; durum.className = "hata"; durum.textContent = hataMetni(e); });
    } }, "Siparişi gönder");
    kutu.append(
      el("h3", {}, "Sepet"), liste,
      el("div", { class: "sepet-toplam" }, el("span", {}, toplamCift + " çift"), el("b", {}, Object.entries(toplamlar).map(([pb, t]) => para(t, pb)).join(" + "))),
      el("p", { class: "kucuk" }, "Kesin tutar ve teslim tarihi sipariş onayında bildirilir."),
      not, gonder, durum);
    return kutu;
  }

  if (kod) yukle(kod); else girisCiz();
  }
})();
