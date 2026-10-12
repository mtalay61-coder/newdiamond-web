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
  const KOD_ANAHTARI = "nd-portal-kod";
  const depo = {
    al() { try { return localStorage.getItem(KOD_ANAHTARI) || ""; } catch (e) { return ""; } },
    yaz(v) { try { if (v) localStorage.setItem(KOD_ANAHTARI, v); else localStorage.removeItem(KOD_ANAHTARI); } catch (e) { /* gizli pencere */ } },
  };
  const HATA = {
    GECERSIZ_KOD: "Kod geçersiz ya da erişiminiz kapatılmış.",
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

  function girisCiz(hata) {
    const giris = el("input", { class: "kod-giris", placeholder: "Müşteri kodunuz", autocomplete: "off", autocapitalize: "characters", maxlength: "20", "aria-label": "Müşteri kodu" });
    const istek = S.whatsapp
      ? el("a", { href: "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent("Merhaba, koleksiyon için müşteri kodu rica ediyorum."), target: "_blank", rel: "noopener" }, "Bizden isteyin")
      : el("a", { href: "#iletisim" }, "Bizden isteyin");
    const form = el("form", { class: "portal-giris" },
      el("h3", {}, "Koleksiyon müşterilerimize özeldir"),
      el("p", {}, "Size verilen müşteri kodunuzla girin; modelleri ve size özel fiyatları görüp sipariş verebilirsiniz."),
      el("div", { class: "kod-satir" }, giris, el("button", { class: "btn dolu", type: "submit" }, "Giriş")),
      hata ? el("p", { class: "hata" }, hata) : null,
      el("p", { class: "kucuk" }, "Kodunuz yok mu? ", istek));
    form.onsubmit = (e) => { e.preventDefault(); const v = giris.value.trim().toUpperCase(); if (v) yukle(v); };
    alan.replaceChildren(form);
  }

  function yukle(yeniKod) {
    bilgi("Koleksiyon yükleniyor…");
    rpc("portal", { p_kod: yeniKod })
      .then((v) => { kod = yeniKod; depo.yaz(kod); veri = v || { modeller: [], asortiler: [] }; ciz(); })
      .catch((e) => { const m = hataMetni(e); if (m === HATA.GECERSIZ_KOD) { depo.yaz(""); kod = ""; } girisCiz(m); });
  }

  function cikis() { depo.yaz(""); kod = ""; veri = null; sepet = []; sepetGitYenile(); girisCiz(); }

  function ciz() {
    const modeller = veri.modeller || [];
    const tipler = Array.from(new Set(modeller.map((u) => u.tip).filter(Boolean)));
    const ust = el("div", { class: "portal-ust" },
      el("span", {}, "Hoş geldiniz, ", el("b", {}, veri.unvan || "")),
      el("button", { class: "bag", type: "button", onclick: cikis }, "Çıkış"));
    const suzgec = el("div", { class: "suzgec" });
    if (tipler.length > 1) ["Tümü", ...tipler].forEach((t) => suzgec.append(el("button", { type: "button", class: t === secili ? "etkin" : "", onclick: () => { secili = t; ciz(); } }, t)));
    const izgara = el("div", { class: "izgara" });
    const gorunen = modeller.filter((u) => secili === "Tümü" || u.tip === secili);
    if (!gorunen.length) izgara.append(el("div", { class: "bilgi", style: "grid-column:1/-1" }, "Size tanımlı model henüz yok. Bilgi için bize ulaşın."));
    gorunen.forEach((u) => izgara.append(urunKarti(u)));
    alan.replaceChildren(ust, suzgec, el("div", { class: "portal-govde" }, izgara, sepetCiz()));
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
      el("div", {}, el("b", {}, g.urunAd), " · ", g.renk,
        el("div", { class: "kucuk" }, bedenSirala(g.satirlar.map((s) => s.beden)).map((b) => b + "×" + g.satirlar.find((s) => s.beden === b).miktar).join("  "))),
      el("button", { type: "button", class: "bag", onclick: () => { sepet = sepet.filter((s) => !(s.urunId === g.urunId && s.renk === g.renk)); yenileSepet(); } }, "Kaldır"))));
    const not = el("textarea", { rows: "2", placeholder: "Not (teslim tarihi, kutu, etiket…)", maxlength: "1000" });
    const durum = el("p", { class: "kucuk" });
    const gonder = el("button", { type: "button", class: "btn dolu", onclick: () => {
      gonder.disabled = true; durum.className = "kucuk"; durum.textContent = "Gönderiliyor…";
      rpc("portal_siparis", { p_kod: kod, p_kalemler: sepet.map((s) => ({ urunId: s.urunId, renk: s.renk, beden: s.beden, miktar: s.miktar })), p_not: not.value })
        .then(() => { sepet = []; kutu.replaceWith(sepetCiz(true)); sepetGitYenile(); })
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
