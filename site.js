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
  // DİL (dil.js): sabit yazılar [data-t] ile; içerik yazıları ERP gelmeden de seçili dilin varsayılanıyla başlar.
  const DIL = window.DIL || "tr", T = window.T || ((k) => k), ICERIK = window.ICERIK || {};
  document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = T(e.dataset.t); });
  document.querySelectorAll("[data-t-title]").forEach((e) => { e.title = T(e.dataset.tTitle); });
  if (DIL !== "tr") {
    document.querySelectorAll("[data-yazi]").forEach((e) => { const v = (ICERIK[DIL] || {})[e.dataset.yazi]; if (v) e.textContent = v; });
    const kv = (ICERIK[DIL] || {}).uretimKartlari;
    if (kv) document.querySelectorAll("[data-uretim-kartlari] .kart").forEach((k, i) => { if (kv[i]) { k.querySelector("h3").textContent = kv[i][0]; k.querySelector("p").textContent = kv[i][1]; } });
  }
  // Dil seçici (üst menünün sağı).
  const secici = document.querySelector("[data-dil-secici]");
  if (secici) Object.entries(window.DILLER || { tr: "Türkçe" }).forEach(([k, ad]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = k.toUpperCase(); b.title = ad;
    if (k === DIL) b.className = "etkin"; b.onclick = () => { if (k !== DIL) window.dilDegistir(k); };
    secici.append(b);
  });

  // ERP İÇERİĞİ HANGİ DİLDE: ERP'de bu dil için yazılmış metin → (Türkçesi ilk metinden değiştirilmemişse) hazır çeviri →
  // Türkçesi. Türkçesi değiştirilmiş ve çevirisi yazılmamışsa eski hazır çeviri YANLIŞ olurdu; Türkçe gösterilir.
  function icerik(a, alan) {
    const tr = a[alan];
    if (DIL === "tr") return tr;
    const yazilan = a.diller && a.diller[DIL] && a.diller[DIL][alan];
    if (typeof yazilan === "string" && yazilan.trim()) return yazilan;
    if (!tr || !String(tr).trim() || tr === (ICERIK.tr || {})[alan]) return (ICERIK[DIL] || {})[alan] || tr;
    return tr;
  }
  function kartIcerik(a, k, i) {
    if (DIL === "tr") return [k.baslik, k.metin];
    const y = a.diller && a.diller[DIL] && Array.isArray(a.diller[DIL].uretimKartlari) && a.diller[DIL].uretimKartlari[i];
    if (y && (String(y.baslik || "").trim() || String(y.metin || "").trim())) return [y.baslik || k.baslik, y.metin || k.metin];
    const v = (ICERIK.tr || {}).uretimKartlari || [];
    if (v[i] && v[i][0] === k.baslik && v[i][1] === k.metin && ((ICERIK[DIL] || {}).uretimKartlari || [])[i]) return ICERIK[DIL].uretimKartlari[i];
    return [k.baslik, k.metin];
  }

  const zamanAsimi = new Promise((coz) => setTimeout(() => coz(null), 4000));
  Promise.race([rpc("site_ayarlari").catch(() => null), zamanAsimi]).then((a) => {
    if (a && typeof a === "object") uygula(a);
    iletisimDoldur();
    portal();
    vitrin(a || {});
  });

  // HERKESE AÇIK VİTRİN (ERP v1.656.0 — "herkesin göreceği resim de koyalım, müşteri girişi haricinde"): girişsiz
  // ziyaretçi galeri resimlerini (site_ayarlari().galeri) ve ERP'de "Herkese açık" işaretli modelleri görür — resim, ad,
  // renkler; FİYAT YOK (sunucu göndermiyor). İkisi de boşsa bölüm gizli kalır. Fonksiyon kurulmamışsa sessizce atlanır.
  function vitrin(a) {
    const bolum = document.getElementById("vitrin");
    if (!bolum) return;
    const yap = (etiket, sinif, metin) => { const d = document.createElement(etiket); if (sinif) d.className = sinif; if (metin != null) d.textContent = metin; return d; };
    const resim = (src, alt) => { const i = document.createElement("img"); i.src = src; i.alt = alt || ""; i.loading = "lazy"; return i; };
    const galeri = (Array.isArray(a.galeri) ? a.galeri : []).filter((u) => /^(data:image\/|https:)/.test(u || ""));
    const gKutu = bolum.querySelector("[data-galeri]");
    if (gKutu) gKutu.replaceChildren(...galeri.map((u) => { const d = yap("div", "urun-resim"); d.append(resim(u, a.marka || "")); return d; }));
    if (galeri.length) bolum.hidden = false;
    rpc("herkese_acik_vitrin").then((v) => {
      const modeller = (v && Array.isArray(v.modeller)) ? v.modeller : [];
      if (!modeller.length) return;
      const soz = (tur, ad) => { const c = v.ceviriler && v.ceviriler[tur] && v.ceviriler[tur][ad]; return (DIL !== "tr" && c && c[DIL]) || ad || ""; };
      const adi = (u) => { const c = v.urunCevirileri && v.urunCevirileri[u.id]; return (DIL !== "tr" && c && c[DIL] && c[DIL].ad) || u.ad || ""; };
      const kutu = bolum.querySelector("[data-vitrin]");
      kutu.replaceChildren(...modeller.map((u) => {
        const rr = u.renkResimleri || {};
        const renkler = (u.renkler || []).filter((r) => r && r !== "Standart");
        let renk = renkler[0] || "";
        const rk = yap("div", "urun-resim");
        const goster = (src) => rk.replaceChildren(src ? resim(src, adi(u)) : yap("span", "yok", T("gorselYakinda")));
        goster(rr[renk] || u.kapakResmi);
        const renkKutu = yap("div", "renkler");
        renkler.forEach((r) => { const b = yap("button", "renk" + (r === renk ? " etkin" : ""), soz("renk", r)); b.type = "button";
          b.onclick = () => { renk = r; renkKutu.querySelectorAll(".renk").forEach((x) => x.classList.toggle("etkin", x === b)); goster(rr[r] || u.kapakResmi); }; renkKutu.append(b); });
        const govde = yap("div", "urun-govde");
        govde.append(yap("div", "urun-ad", adi(u)));
        if (u.tip) govde.append(yap("div", "urun-alt", soz("tip", u.tip)));
        const giris = yap("a", "fiyat onayda", T("fiyatIcinGiris")); giris.href = "musteri.html";
        govde.append(giris, renkKutu);
        const art = yap("article", "urun"); art.append(rk, govde); return art;
      }));
      bolum.hidden = false;
    }).catch(() => { /* fonksiyon yoksa vitrin yalnız galeriyle */ });
  }

  function uygula(a) {
    Object.keys(a).forEach((k) => { if (a[k] !== "" && a[k] != null) S[k] = a[k]; });
    // Yazılar: boş gelen alan sayfadakini ezmez (altYazi hariç — o isteğe bağlı, boşsa boş).
    document.querySelectorAll("[data-yazi]").forEach((el) => {
      const v = icerik(a, el.dataset.yazi);
      if (typeof v === "string" && (v.trim() || el.dataset.yazi === "altYazi")) el.textContent = v;
    });
    if (a.marka) document.title = a.marka + (a.ustEtiket ? " — " + icerik(a, "ustEtiket") : "");
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
      kartlar.replaceChildren(...a.uretimKartlari.map((k, sira) => {
        const [baslik, metin] = kartIcerik(a, k, sira);
        const d = document.createElement("div"); d.className = "kart";
        const i = document.createElement("div"); i.className = "ikon"; i.textContent = k.ikon || "";
        const h = document.createElement("h3"); h.textContent = baslik || "";
        const p = document.createElement("p"); p.textContent = metin || "";
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
    GECERSIZ_KOD: T("hataOturum"),
    GUNLUK_SINIR: T("hataGunluk"),
    GECERSIZ_MODEL: T("hataModel"),
    GECERSIZ_RENK_BEDEN: T("hataRenkBeden"),
    GECERSIZ_MIKTAR: T("hataMiktar"),
    BOS_SIPARIS: T("hataBos"),
    COK_KALEM: T("hataCokKalem"),
    GECERSIZ_ODEME: T("hataOdeme"),
  };
  const hataMetni = (e) => { const m = String((e && e.message) || e); const k = Object.keys(HATA).find((x) => m.includes(x)); return k ? HATA[k] : T("hataBaglanti"); };
  const para = (n, pb) => { try { return new Intl.NumberFormat(window.DIL_BICIM || "tr-TR", { style: "currency", currency: pb || "TRY", maximumFractionDigits: 2 }).format(n); } catch (e) { return n + " " + (pb || ""); } };
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
  let secili = "__tumu";

  function bilgi(metin) { alan.replaceChildren(el("div", { class: "bilgi" }, metin)); }

  // KAYIT ADLARININ ÇEVİRİSİ (ERP v1.651.0 — "stok, renk, beden vs. de dil değişimi"): model adı (ürünün kendi
  // çevirisi), renk / mamul tipi / asorti (Tanımlar sözlüğü). Yalnız GÖSTERİM: sepet ve sipariş Türkçe adla gider
  // (ERP kaydı o). Çeviri yoksa Türkçe.
  const cAd = (urunId, ad) => { const c = veri && veri.urunCevirileri && veri.urunCevirileri[urunId]; return (DIL !== "tr" && c && c[DIL] && c[DIL].ad) || ad || ""; };
  const cSoz = (tur, ad) => { const c = veri && veri.ceviriler && veri.ceviriler[tur] && veri.ceviriler[tur][ad]; return (DIL !== "tr" && c && c[DIL]) || ad || ""; };
  const cRenk = (r) => cSoz("renk", r), cTip = (t) => cSoz("tip", t), cAsorti = (a) => cSoz("asorti", a);

  // KULLANICI ADI + ŞİFRE (v1.649.0 — kullanıcı: "müşteri giriş yaparken kullanıcı adı ve şifre ile girsin").
  // `portal_giris` doğruysa 30 günlük oturum anahtarı döner (yanlışsa boş); anahtar `kod` olarak saklanır ve bütün
  // çağrılara geçer. Şifre tarayıcıda saklanmaz.
  // KAYIT OL (ERP v1.657.0 — kullanıcı: "kaydı olmayan için kayıt ol butonu da olsun, cari bilgileri, adresi vs.
  // ekleyip kayıt olsun; sisteme düşsün, onaylayıp kayıt ekleyelim"). `site_kayit_ol` talebi yazar; giriş ERP'de
  // onaylanınca açılır (seçilen kullanıcı adı + şifre). Şifre burada saklanmaz, sunucuda yalnız özeti tutulur.
  function kayitCiz() {
    const kutu = (ad, etiket, ozellik) => el("label", { class: "kayit-alan" + (ad === "adres" || ad === "not" ? " genis" : "") }, el("span", {}, T(etiket)),
      el(ad === "adres" || ad === "not" ? "textarea" : "input", { class: "giris-kutu", name: "k-" + ad, maxlength: ad === "adres" || ad === "not" ? "600" : "300", rows: "2", ...(ozellik || {}) }));
    const alanlar = [["unvan", "kUnvan", { required: true }], ["yetkili", "kYetkili"], ["telefon", "kTelefon", { type: "tel", required: true }], ["eposta", "kEposta", { type: "email" }],
      ["vergiDairesi", "kVergiDairesi"], ["vergiNo", "kVergiNo"], ["ulke", "kUlke"], ["il", "kIl"], ["ilce", "kIlce"], ["adres", "kAdres"], ["not", "kNot"]];
    const kutular = alanlar.map(([ad, et, oz]) => [ad, kutu(ad, et, oz)]);
    const kAd = kutu("kullanici", "kKullanici", { autocomplete: "username", autocapitalize: "none", spellcheck: "false", maxlength: "40", required: true });
    const kSifre = kutu("sifre", "kSifre2", { type: "password", autocomplete: "new-password", maxlength: "100", required: true });
    const dugme = el("button", { class: "btn dolu", type: "submit" }, T("kGonder"));
    const hataP = el("p", { class: "hata" }); hataP.hidden = true;
    const geri = el("a", { href: "#koleksiyon", onclick: (e) => { e.preventDefault(); girisCiz(); } }, T("kGeri"));
    const form = el("form", { class: "portal-giris kayit-formu", "data-kayit-formu": "1" },
      el("h3", {}, T("kayitBaslik")), el("p", {}, T("kayitAciklama")),
      el("div", { class: "kayit-izgara" }, ...kutular.map((x) => x[1]), kAd, kSifre),
      hataP, el("div", { class: "kayit-alt" }, dugme, geri));
    const deger = (l) => l.querySelector("input,textarea").value.trim();
    form.onsubmit = (e) => {
      e.preventDefault();
      const bilgi = {}; kutular.forEach(([ad, l]) => { const v = deger(l); if (v) bilgi[ad] = v; });
      const ad = deger(kAd).toLowerCase(), sifre = kSifre.querySelector("input").value;
      const hata = (m) => { hataP.textContent = T(m); hataP.hidden = false; };
      if (!bilgi.unvan || !bilgi.telefon) return hata("hataKayitBilgi");
      if (!/^[a-z0-9._-]{3,40}$/.test(ad)) return hata("hataKayitKullanici");
      if (sifre.length < 6) return hata("hataKayitSifre");
      dugme.disabled = true; dugme.textContent = T("kGonderiliyor"); hataP.hidden = true;
      rpc("site_kayit_ol", { p_bilgi: bilgi, p_kullanici: ad, p_sifre: sifre })
        .then(() => alan.replaceChildren(el("div", { class: "portal-giris", "data-kayit-tamam": "1" }, el("h3", {}, T("kayitBaslik")), el("p", { class: "tamam" }, T("kTamam")), el("p", { class: "kucuk" }, el("b", {}, ad), " · ", el("a", { href: "#koleksiyon", onclick: (ev) => { ev.preventDefault(); girisCiz(); } }, T("kGeri"))))))
        .catch((er) => {
          const m = String((er && er.message) || er);
          dugme.disabled = false; dugme.textContent = T("kGonder");
          hata(/KULLANICI_ALINMIS/.test(m) ? "hataKayitAlinmis" : /GECERSIZ_KULLANICI/.test(m) ? "hataKayitKullanici" : /GECERSIZ_SIFRE/.test(m) ? "hataKayitSifre"
            : /GECERSIZ_BILGI/.test(m) ? "hataKayitBilgi" : /GUNLUK_SINIR/.test(m) ? "hataKayitSinir" : "hataBaglanti");
        });
    };
    alan.replaceChildren(form);
    form.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // MÜŞTERİ GİRİŞİ AYRI SAYFA (kullanıcı: "ana sayfada bu var, kaldıralım; müşteri girişini ayrı sayfa olarak açalım"):
  // portal yalnız musteri.html'de ([data-portal] orada); ana sayfada bu blok hiç çalışmaz (yukarıda `if (!alan) return`).
  const bolumGoster = () => {};
  function girisCiz(hata) {
    const kAd = el("input", { class: "giris-kutu", placeholder: T("kullaniciAdi"), autocomplete: "username", autocapitalize: "none", spellcheck: "false", maxlength: "40", "aria-label": T("kullaniciAdi"), name: "username" });
    const kSifre = el("input", { class: "giris-kutu", type: "password", placeholder: T("sifre"), autocomplete: "current-password", maxlength: "100", "aria-label": T("sifre"), name: "password" });
    const dugme = el("button", { class: "btn dolu", type: "submit" }, T("giris"));
    const istek = S.whatsapp
      ? el("a", { href: "https://wa.me/" + String(S.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(T("waGirisIstegi")), target: "_blank", rel: "noopener" }, T("bizdenIsteyin"))
      : el("a", { href: "./#iletisim" }, T("bizdenIsteyin"));
    const hataP = el("p", { class: "hata" }, hata || ""); if (!hata) hataP.hidden = true;
    const form = el("form", { class: "portal-giris" },
      el("h3", {}, T("girisBaslik")),
      el("p", {}, T("girisAciklama")),
      el("div", { class: "giris-alanlar" }, kAd, kSifre, dugme),
      hataP,
      el("p", { class: "kucuk" }, T("hesabinYokMu"), " ", el("a", { href: "#koleksiyon", "data-kayit-ol": "1", onclick: (e) => { e.preventDefault(); kayitCiz(); } }, T("kayitOl")), " · ", T("bilgiYok"), istek));
    form.onsubmit = (e) => {
      e.preventDefault();
      const ad = kAd.value.trim(), sifre = kSifre.value;
      if (!ad || !sifre) return;
      dugme.disabled = true; dugme.textContent = T("girisYapiliyor"); hataP.hidden = true;
      rpc("portal_giris", { p_kullanici: ad, p_sifre: sifre })
        .then((anahtar) => { if (!anahtar) throw new Error("GECERSIZ_GIRIS"); yukle(anahtar); })
        .catch((er) => {
          const m = String((er && er.message) || er);
          dugme.disabled = false; dugme.textContent = T("giris"); kSifre.value = "";
          hataP.textContent = /GECERSIZ_GIRIS/.test(m) ? T("hataGiris") : /HESAP_KILITLI/.test(m) ? T("hataKilit") : T("hataBaglanti");
          hataP.hidden = false; kSifre.focus();
        });
    };
    alan.replaceChildren(form);
    bolumGoster();
  }

  function yukle(yeniKod) {
    bilgi(T("koleksiyonYukleniyor"));
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
      el("span", {}, T("hosgeldiniz"), el("b", {}, veri.unvan || "")),
      el("button", { class: "bag", type: "button", onclick: cikis }, T("cikis")));
    const sekmeler = el("div", { class: "portal-sekmeler", role: "tablist" },
      ...[["koleksiyon", T("sekmeKoleksiyon")], ["hesap", T("sekmeHesap")], ["siparis", T("sekmeSiparis")]].map(([k, ad]) =>
        el("button", { type: "button", role: "tab", class: sekme === k ? "etkin" : "", "aria-selected": sekme === k ? "true" : "false", onclick: () => { sekme = k; ciz(); } }, ad)));
    let govde;
    if (sekme === "koleksiyon") govde = koleksiyonCiz();
    else if (!hesap) { govde = el("div", { class: "bilgi" }, T("yukleniyor")); hesapYukle(); }
    else govde = sekme === "hesap" ? hesapCiz() : siparislerCiz();
    alan.replaceChildren(ust, sekmeler, govde);
  }

  function hesapYukle() {
    rpc("portal_hesap", { p_kod: kod, p_baslangic: aralik.bas, p_bitis: aralik.bit })
      .then((h) => { hesap = h; ciz(); })
      .catch((e) => {
        const m = String((e && e.message) || e);
        alan.lastChild.replaceWith(el("div", { class: "bilgi" }, /GECERSIZ_KOD/.test(m) ? HATA.GECERSIZ_KOD : /GECERSIZ_TARIH/.test(m) ? T("hataTarih") : T("hataHesap")));
      });
  }

  // ARAMA (ERP v1.658.0 — öneri 4): model adı, renk, tip (çevirileriyle) içinde; yazdıkça yalnız ızgara yenilenir
  // (bütün portal yeniden çizilse kutu odağını kaybederdi). Tip düğmeleri aramayla birlikte çalışır.
  let arama = "";
  const kucuk = (s) => String(s || "").toLocaleLowerCase(window.DIL_BICIM || "tr-TR");
  function koleksiyonCiz() {
    const modeller = veri.modeller || [];
    const tipler = Array.from(new Set(modeller.map((u) => u.tip).filter(Boolean)));
    const suzgec = el("div", { class: "suzgec" });
    const aramaKutu = el("input", { class: "giris-kutu arama-kutu", type: "search", placeholder: T("araYer"), value: arama, "aria-label": T("araYer"), "data-arama": "1" });
    suzgec.append(aramaKutu);
    if (tipler.length > 1) ["__tumu", ...tipler].forEach((t) => suzgec.append(el("button", { type: "button", class: t === secili ? "etkin" : "", onclick: () => { secili = t; ciz(); } }, t === "__tumu" ? T("tumu") : cTip(t))));
    const izgara = el("div", { class: "izgara" });
    const doldur = () => {
      const q = kucuk(arama).trim();
      const gorunen = modeller.filter((u) => (secili === "__tumu" || u.tip === secili) && (!q || [u.ad, cAd(u.id, u.ad), u.tip, cTip(u.tip), ...(u.renkler || []), ...(u.renkler || []).map(cRenk)].some((x) => kucuk(x).includes(q))));
      izgara.replaceChildren(...(gorunen.length ? gorunen.map(urunKarti) : [el("div", { class: "bilgi", style: "grid-column:1/-1" }, q ? T("aramaSonucYok") : T("modelYok"))]));
    };
    aramaKutu.oninput = () => { arama = aramaKutu.value; doldur(); };
    doldur();
    return el("div", {}, suzgec, el("div", { class: "portal-govde" }, izgara, sepetCiz()));
  }

  const tarihTR = (t) => { if (!t) return ""; const [y, a, g] = String(t).slice(0, 10).split("-"); return g ? (window.DIL === "en" ? g + "/" + a + "/" + y : g + "." + a + "." + y) : t; };
  // Bakiye işareti ERP'deki gibi: artı = müşterinin borcu, eksi = müşterinin alacağı.
  const bakiyeYazi = (t, pb) => t > 0 ? para(t, pb) + " " + T("borc") : t < 0 ? para(-t, pb) + " " + T("alacak") : para(0, pb);

  function hesapCiz() {
    const bas = el("input", { type: "date", value: aralik.bas, "aria-label": T("baslangic") });
    const bit = el("input", { type: "date", value: aralik.bit, "aria-label": T("bitis") });
    const arac = el("div", { class: "hesap-arac" },
      el("label", {}, T("baslangic") + " ", bas), el("label", {}, T("bitis") + " ", bit),
      el("button", { type: "button", class: "btn dolu kucuk-btn", onclick: () => { if (bas.value && bit.value) { aralik = { bas: bas.value, bit: bit.value }; hesap = null; ciz(); } } }, T("goster")),
      el("button", { type: "button", class: "btn bos kucuk-btn", onclick: () => window.print() }, T("yazdir")));
    const bloklar = (hesap.hesap || []).map((d) => {
      const coklu = (hesap.hesap || []).length > 1;
      const bakiyeler = Object.entries(d.bakiye || {});
      const ozet = el("div", { class: "bakiye-satir" },
        ...(bakiyeler.length ? bakiyeler : [["TRY", 0]]).map(([pb, t]) => el("div", { class: "bakiye-kutu" + (t > 0 ? " borc" : t < 0 ? " alacak" : "") },
          el("span", {}, T("guncelBakiye") + (bakiyeler.length > 1 ? " (" + pb + ")" : "")), el("b", {}, bakiyeYazi(Number(t), pb)))));
      // Yürüyen bakiye para birimi başına, dönem başı devirden.
      const yuruyen = { ...Object.fromEntries(Object.entries(d.devir || {}).map(([k, v]) => [k, Number(v)])) };
      const satirlar = [];
      Object.entries(d.devir || {}).forEach(([pb, t]) => { if (Number(t)) satirlar.push(el("tr", { class: "devir" }, el("td", {}, tarihTR(hesap.baslangic)), el("td", {}, ""), el("td", {}, T("devir")), el("td", {}, ""), el("td", {}, ""), el("td", { class: "sayi" }, bakiyeYazi(Number(t), pb)))); });
      (d.hareketler || []).forEach((h) => {
        const pb = h.paraBirimi || "TRY"; const t = Number(h.tutar) || 0;
        yuruyen[pb] = (yuruyen[pb] || 0) + (h.yon === "Borç" ? t : -t);
        const aciklama = [h.aciklama, [h.urunAd, h.renk].filter(Boolean).join(" "), h.odemeSekli, h.vade ? T("vade") + " " + tarihTR(h.vade) : ""].filter(Boolean).join(" · ");
        satirlar.push(el("tr", {},
          el("td", {}, tarihTR(h.tarih)), el("td", { class: "mono" }, h.fisNo || h.siparisNo || ""), el("td", {}, aciklama),
          el("td", { class: "sayi" }, h.yon === "Borç" ? para(t, pb) : ""), el("td", { class: "sayi" }, h.yon !== "Borç" ? para(t, pb) : ""),
          el("td", { class: "sayi" }, bakiyeYazi(Math.round(yuruyen[pb] * 100) / 100, pb))));
      });
      const tablo = satirlar.length
        ? el("div", { class: "tablo-kap" }, el("table", { class: "ekstre" },
            el("thead", {}, el("tr", {}, ...[T("tarih"), T("belge"), T("aciklama"), T("borcB"), T("alacakB"), T("bakiye")].map((b) => el("th", {}, b)))),
            el("tbody", {}, ...satirlar)))
        : el("p", { class: "kucuk" }, T("hareketYok"));
      return el("section", { class: "hesap-blok" }, coklu ? el("h3", {}, d.defter === "Resmi" ? T("resmiHesap") : T("hesapB")) : null, ozet, tablo);
    });
    const cekler = hesap.cekler || [];
    const cekBlok = cekler.length ? el("section", { class: "hesap-blok" }, el("h3", {}, T("cekler")),
      el("div", { class: "tablo-kap" }, el("table", { class: "ekstre" },
        el("thead", {}, el("tr", {}, ...[T("vadeB"), T("no"), T("banka"), T("tutar"), T("durum")].map((b) => el("th", {}, b)))),
        el("tbody", {}, ...cekler.map((c) => el("tr", { class: c.durum === "Portföyde" && c.vade && c.vade < bugun() ? "gecti" : "" },
          el("td", {}, tarihTR(c.vade)), el("td", { class: "mono" }, c.cekNo || ""), el("td", {}, c.banka || ""),
          el("td", { class: "sayi" }, para(Number(c.tutar) || 0, c.paraBirimi)), el("td", {}, (T("cekDurum") || {})[c.durum] || c.durum || ""))))))) : null;
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
      kdvFarkli ? satir(T("kdvDahil"), Object.entries(kdvli).map(([pb, t]) => para(Number(t), pb)).join(" + ")) : null,
      odenen.length ? satir(T("odenen"), odenen.map(([pb, t]) => para(Number(t), pb)).join(" + "), "yesil") : null,
      odenen.length ? satir(T("kalan"), kalan.map(([pb, t]) => para(t, pb)).join(" + "), "kalin") : null);
  }

  // BEDEN DAĞILIMI + ASORTİ (kullanıcı: "sipariş asorti de görünsün"). Dağılım tanımlı bir asortinin tam katıysa
  // "2 koli 36-40" de yazılır (asortiler `portal()`ten, Tanımlar'dakiler).
  function asortiBul(bedenler) {
    const anahtarlar = Object.keys(bedenler || {}).filter((b) => Number(bedenler[b]) > 0);
    for (const a of (veri && veri.asortiler) || []) {
      const o = (a.oranlar || []).filter((x) => Number(x.oran) > 0);
      if (!o.length || o.length !== anahtarlar.length || !o.every((x) => anahtarlar.includes(String(x.beden)))) continue;
      const kat = Number(bedenler[String(o[0].beden)]) / Number(o[0].oran);
      if (kat >= 1 && Number.isInteger(kat) && o.every((x) => Number(bedenler[String(x.beden)]) === x.oran * kat)) return { ad: a.ad, kat };
    }
    return null;
  }
  function dagilim(k) {
    const b = k.bedenler || {};
    const sirali = bedenSirala(Object.keys(b)).filter((x) => Number(b[x]) > 0);
    if (!sirali.length || (sirali.length === 1 && sirali[0] === "")) return null;
    const as = asortiBul(b);
    return el("div", { class: "dagilim" },
      as ? el("span", { class: "asorti-rozet" }, T("koliAsorti")(as.kat, cAsorti(as.ad))) : null,
      // MATRİS DÜZENİ (kullanıcı: "beden adet sıralamasını kendi matris düzenimizde yapalım"): ERP sipariş kartı gibi
      // üstte bedenler, altta adetler — "36 2 · 37 6" çipleri okunmuyordu. Toplam
      // satırdaki "Sipariş" sütununda, burada tekrar edilmez.
      el("table", { class: "beden-matris" },
        el("thead", {}, el("tr", {}, ...sirali.map((x) => el("th", {}, x)))),
        el("tbody", {}, el("tr", {}, ...sirali.map((x) => el("td", {}, String(b[x])))))));
  }

  // SATIR DURUMU (ERP v1.660.0 — kullanıcı: "siparişe çevrilen stoklar sipariş durumuna göre güncellensin: üretimde,
  // bekliyor, sevk edildi"): teslim ≥ miktar → Sevk edildi; kısmen → Kısmen sevk; bağlı bitmemiş üretim → Üretimde; yoksa Bekliyor.
  const satirDurumu = (k) => {
    const m = Number(k.miktar || 0), t = Number(k.teslim || 0);
    const [a, r] = m && t >= m ? ["sevkEdildi", "yesil"] : t > 0 ? ["kismenSevk", "sari"] : k.uretimde ? ["uretimdeS", "mavi"] : ["bekliyorS", "gri"];
    return el("span", { class: "rozet kucuk-rozet " + r, "data-satir-durum": a }, T(a));
  };

  function siparislerCiz() {
    const talepler = hesap.talepler || [];
    const sip = hesap.siparisler || [];
    const talepBlok = talepler.length ? el("section", { class: "hesap-blok" }, el("h3", {}, T("siteden")),
      ...talepler.map((t) => el("div", { class: "sip-kart" },
        el("div", { class: "sip-bas" }, el("b", {}, tarihTR(String(t.tarih).slice(0, 10))), el("span", {}, t.toplamCift + " " + T("cift")),
          // DURUM (ERP v1.658.0 — öneri 2): siparişe çevrildiyse sipariş no; reddedildiyse ERP'de yazılan sebep.
          el("span", { class: "rozet " + (t.durum === "reddedildi" ? "kirmizi" : t.durum === "siparis" ? "yesil" : "sari") },
            t.durum === "reddedildi" ? T("kabulEdilmedi") : t.durum === "siparis" ? T("siparisOldu") + (t.siparisNo ? " · " + t.siparisNo : "") : T("onayBekliyor"))),
        t.durum === "reddedildi" && t.redSebebi ? el("p", { class: "red-sebebi" }, T("sebep") + ": " + t.redSebebi) : null,
        el("div", { class: "talep-kalemler" }, ...(t.kalemler || []).map((k) => {
          // Siparişe çevrilmiş talepte satır SİPARİŞTEN okunur (ERP'de belirlenen fiyat + güncel durum).
          const sp = t.durum === "siparis" ? sip.find((s) => s.siparisNo === t.siparisNo) : null;
          const sk = sp ? (sp.kalemler || []).find((x) => String(x.urunId) === String(k.urunId) && x.renk === k.renk) : null;
          const tutar = sk ? Number(sk.tutar) : Number(k.tutar);
          return el("div", { class: "talep-kalem" },
            minik(hesapResmi(k), k.urunAd), el("span", {}, el("b", {}, cAd(k.urunId, k.urunAd)), " · ", cRenk(k.renk)),
            el("span", { class: "kucuk" }, (sk ? sk.miktar : k.miktar) + " " + T("cift") + (tutar > 0 ? " · " + para(tutar, (sk || k).paraBirimi) : sk ? "" : " · " + T("fiyatOnayda")), sk ? " " : null, sk ? satirDurumu(sk) : null));
        })),
        t.odeme ? el("div", { class: "kucuk" }, T("odemeSekli") + ": " + ((T("odemeTip") || {})[t.odeme.tip] || t.odeme.tip) + (t.odeme.vadeGun ? " · " + t.odeme.vadeGun + " " + T("vadeGun").replace(/\s*\(.*\)/, "").toLowerCase() : "")) : null,
        (t.kalemler || []).some((k) => Number(k.tutar) > 0) ? el("div", { class: "kucuk", style: "text-align:right" }, T("toplam") + " " + tutarToplami(t.kalemler)) : null,
        t.not ? el("div", { class: "kucuk" }, t.not) : null))) : null;
    const kartlar = sip.map((s) => {
      const top = (s.kalemler || []).reduce((a, k) => ({ m: a.m + Number(k.miktar || 0), t: a.t + Number(k.teslim || 0) }), { m: 0, t: 0 });
      const durum = top.m && top.t >= top.m ? [T("teslimEdildi"), "yesil"] : top.t > 0 ? [T("kismen"), "sari"] : [T("hazirlaniyor"), "mavi"];
      return el("div", { class: "sip-kart" },
        el("div", { class: "sip-bas" }, el("b", { class: "mono" }, s.siparisNo || ""), el("span", {}, tarihTR(s.tarih)),
          s.belgeNo ? el("span", { class: "kucuk" }, T("belgeNo") + s.belgeNo) : null,
          s.teslimTarihi ? el("span", { class: "kucuk" }, T("termin") + tarihTR(s.teslimTarihi)) : null,
          el("span", { class: "rozet " + durum[1] }, durum[0])),
        // SABİT SÜTUNLAR (kullanıcı: "sütunlar kayıyor"): her sipariş ayrı tablo, genişlik içerikten hesaplanınca
        // siparişten siparişe kayıyordu → table-layout: fixed + aynı colgroup.
        el("div", { class: "tablo-kap" }, el("table", { class: "ekstre sip-tablo" },
          el("colgroup", {}, ...[30, 16, 9, 9, 9, 12, 15].map((w) => el("col", { style: "width:" + w + "%" }))),
          el("thead", {}, el("tr", {}, ...[T("model"), T("renk"), T("siparis"), T("teslim"), T("kalan"), T("fiyat"), T("tutar")].map((b, i) => el("th", { class: i >= 2 ? "sayi" : "" }, b)))),
          el("tbody", {}, ...(s.kalemler || []).map((k) => el("tr", {},
            el("td", {}, el("span", { class: "model-hucre" }, minik(hesapResmi(k), k.urunAd), el("span", {}, cAd(k.urunId, k.urunAd), dagilim(k)))), el("td", {}, cRenk(k.renk), el("div", {}, satirDurumu(k))), el("td", { class: "sayi" }, String(k.miktar)),
            el("td", { class: "sayi" }, String(k.teslim)), el("td", { class: "sayi" }, String(Math.max(0, k.miktar - k.teslim))),
            // Fiyat + tutar (kullanıcı: "sipariş fiyat ve tutar da görünsün"). Beden fiyatları farklıysa fiyat ortalamadır.
            el("td", { class: "sayi" }, k.fiyat != null ? para(Number(k.fiyat), k.paraBirimi) : ""),
            el("td", { class: "sayi" }, k.tutar != null ? para(Number(k.tutar), k.paraBirimi) : "")))),
          el("tfoot", {}, el("tr", {}, el("td", {}, T("toplam")), el("td", {}, ""), el("td", { class: "sayi" }, String(top.m)), el("td", { class: "sayi" }, String(top.t)), el("td", { class: "sayi" }, String(Math.max(0, top.m - top.t))),
            el("td", {}, ""), el("td", { class: "sayi" }, tutarToplami(s.kalemler)))))), odemeOzeti(s));
    });
    if (!talepBlok && !kartlar.length) return el("div", { class: "bilgi" }, T("siparisYok"));
    return el("div", { class: "hesap" }, talepBlok, kartlar.length ? el("section", { class: "hesap-blok" }, el("h3", {}, T("siparisleriniz")), ...kartlar) : null);
  }

  // Kart: renk düğmesi o rengin resmini açar ve siparişin rengini seçer; altta sipariş girişi.
  function urunKarti(u) {
    const resimler = u.renk_resimleri || {};
    const renkler = (u.renkler || []).filter((r) => r && r !== "Standart");
    const tumRenkler = renkler.length ? renkler : (u.renkler || []);
    let renk = tumRenkler[0] || "";
    const resimKutu = el("div", { class: "urun-resim" });
    const goster = (src) => resimKutu.replaceChildren(src ? el("img", { src, alt: cAd(u.id, u.ad), loading: "lazy" }) : el("span", { class: "yok" }, T("gorselYakinda")));
    goster(resimler[renk] || u.kapak_resmi);
    const rk = el("div", { class: "renkler" });
    // STOK DURUMU (ERP v1.658.0 — öneri 6): seçili rengin kaba durumu, rakamsız (Stokta / Üretimde / Sipariş üzerine).
    // Sunucu göndermiyorsa (eski SQL) hiç görünmez.
    const sd = u.stok_durumu || {};
    const durumEl = el("div", { class: "stok-durum" });
    const durumYaz = () => { const d = sd[renk]; durumEl.hidden = !d; if (d) { durumEl.className = "stok-durum " + d; durumEl.textContent = T("stok_" + d); } };
    tumRenkler.forEach((r) => rk.append(el("button", { type: "button", class: "renk" + (r === renk ? " etkin" : "") + (sd[r] ? " d-" + sd[r] : ""), onclick: (e) => {
      renk = r; rk.querySelectorAll(".renk").forEach((x) => x.classList.toggle("etkin", x === e.currentTarget)); goster(resimler[r] || u.kapak_resmi); durumYaz();
    } }, cRenk(r))));
    durumYaz();
    const alt = [cTip(u.tip), [u.sezon, u.sezon_yili].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    return el("article", { class: "urun" }, resimKutu,
      el("div", { class: "urun-govde" },
        el("div", { class: "urun-ad" }, cAd(u.id, u.ad)),
        alt ? el("div", { class: "urun-alt" }, alt) : null,
        // FİYATSIZ MODEL (v1.652 — "fiyatları olmayan ürünler de listelensin … fiyat yokken de sipariş girişi olsun").
        u.fiyat != null ? el("div", { class: "fiyat" }, para(u.fiyat, u.para_birimi), el("span", {}, T("ciftBasi"))) : el("div", { class: "fiyat onayda" }, T("fiyatOnayda")),
        rk, durumEl,
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
      const sekmeler = asortiler.length ? el("div", { class: "kip" }, sekme("asorti", T("asorti")), sekme("beden", T("bedenBeden"))) : null;
      let govde, topla;
      if (kip === "asorti") {
        const sec = el("select", { "aria-label": T("asorti") }, ...asortiler.map((a) => el("option", { value: a.id }, cAsorti(a.ad) + " (" + a.oranlar.map((o) => o.beden + "×" + o.oran).join(" ") + ")")));
        const koli = el("input", { type: "number", min: "1", step: "1", value: "1", class: "adet", inputmode: "numeric", "aria-label": T("koliAdedi") });
        govde = el("div", { class: "satir" }, sec, koli, el("span", { class: "kucuk" }, T("koli")));
        topla = () => {
          const a = asortiler.find((x) => x.id === sec.value); const n = parseInt(koli.value, 10);
          if (!a || !(n > 0)) return [];
          return a.oranlar.map((o) => ({ beden: String(o.beden), miktar: Math.round(o.oran * n) })).filter((x) => x.miktar > 0);
        };
      } else {
        const kutular = bedenler.map((b) => ({ b, g: el("input", { type: "number", min: "0", step: "1", placeholder: "0", class: "adet", inputmode: "numeric", "aria-label": T("beden") + " " + b }) }));
        govde = el("div", { class: "bedenler" }, ...kutular.map((x) => el("label", {}, el("span", {}, x.b), x.g)));
        topla = () => kutular.map((x) => ({ beden: x.b, miktar: parseInt(x.g.value, 10) || 0 })).filter((x) => x.miktar > 0);
      }
      const ekle = el("button", { type: "button", class: "btn dolu kucuk-btn", onclick: () => {
        const renk = renkAl(); const satirlar = topla();
        if (!renk) return;
        if (!satirlar.length) { ekle.textContent = T("adetGirin"); setTimeout(() => { ekle.textContent = T("sepeteEkle"); }, 1400); return; }
        satirlar.forEach((s) => {
          const varolan = sepet.find((x) => x.urunId === u.id && x.renk === renk && x.beden === s.beden);
          if (varolan) varolan.miktar += s.miktar;
          else sepet.push({ urunId: u.id, urunAd: u.ad, renk, beden: s.beden, miktar: s.miktar, birimFiyat: u.fiyat, paraBirimi: u.para_birimi });
        });
        yenileSepet();
        ekle.textContent = T("eklendi"); setTimeout(() => { ekle.textContent = T("sepeteEkle"); }, 1200);
      } }, T("sepeteEkle"));
      kutu.replaceChildren(...[sekmeler, govde, ekle].filter(Boolean));
    };
    yeniden();
    return kutu;
  }

  let sepetKutu = null;
  // Telefonda sepet modellerin altında kalıyor: dolu sepet için solda sabit "Sepet (n çift)" kısayolu.
  const sepetGit = el("a", { class: "sepet-git", href: "#sepet", hidden: true });
  document.body.append(sepetGit);
  function sepetGitYenile() { const n = sepet.reduce((s, x) => s + x.miktar, 0); sepetGit.hidden = !n; sepetGit.textContent = T("sepet") + " · " + n + " " + T("cift"); }
  function yenileSepet() { if (sepetKutu) sepetKutu.replaceWith(sepetCiz()); sepetGitYenile(); }

  function sepetCiz(tesekkur) {
    const kutu = el("aside", { class: "sepet", id: "sepet" });
    sepetKutu = kutu;
    if (tesekkur) kutu.append(el("p", { class: "tamam" }, T("siparisAlindi")));
    if (!sepet.length) { kutu.append(el("h3", {}, T("sepet")), el("p", { class: "kucuk" }, T("sepetBos"))); return kutu; }
    const toplamCift = sepet.reduce((s, x) => s + x.miktar, 0);
    const toplamlar = {};
    sepet.forEach((x) => { if (x.birimFiyat != null) toplamlar[x.paraBirimi] = (toplamlar[x.paraBirimi] || 0) + x.miktar * x.birimFiyat; });
    const fiyatsizVar = sepet.some((x) => x.birimFiyat == null);
    // Satırlar model + renk altında toplanır: "Bot A · Siyah — 36×2  37×4".
    const gruplar = [];
    sepet.forEach((x) => {
      let g = gruplar.find((y) => y.urunId === x.urunId && y.renk === x.renk);
      if (!g) { g = { urunId: x.urunId, urunAd: x.urunAd, renk: x.renk, satirlar: [] }; gruplar.push(g); }
      g.satirlar.push(x);
    });
    const liste = el("div", { class: "sepet-liste" }, ...gruplar.map((g) => el("div", { class: "sepet-satir" },
      (() => { const u = ((veri && veri.modeller) || []).find((m) => m.id === g.urunId); return minik(u ? ((u.renk_resimleri || {})[g.renk] || u.kapak_resmi) : "", g.urunAd); })(),
      el("div", { style: "flex:1;min-width:0" }, el("b", {}, cAd(g.urunId, g.urunAd)), " · ", cRenk(g.renk),
        el("div", { class: "kucuk" }, bedenSirala(g.satirlar.map((s) => s.beden)).map((b) => b + "×" + g.satirlar.find((s) => s.beden === b).miktar).join("  "))),
      el("button", { type: "button", class: "bag", onclick: () => { sepet = sepet.filter((s) => !(s.urunId === g.urunId && s.renk === g.renk)); yenileSepet(); } }, T("kaldir")))));
    // ÖDEME ŞEKLİ (v1.652 — "ödeme aşamasında nakit, çek… müşteri belirlesin"): ERP talepte görür, indirim/fiyatı ona göre verir.
    // Yalnız ERP'de işaretli müşteriden istenir (`odemeSor`, portal()).
    const odemeSor = !!(veri && veri.odemeSor);
    const ODEMELER = ["Nakit", "Havale/EFT", "Kredi kartı", "Çek", "Senet", "Açık hesap"];
    const odemeSec = el("select", { "aria-label": T("odemeSekli"), class: "odeme-sec" }, el("option", { value: "" }, T("odemeSec")), ...ODEMELER.map((o) => el("option", { value: o }, (T("odemeTip") || {})[o] || o)));
    const vade = el("input", { type: "number", min: "0", max: "365", step: "1", inputmode: "numeric", placeholder: T("vadeGun"), class: "adet vade", "aria-label": T("vadeGun") });
    const vadeKutu = el("label", { class: "kucuk vade-kutu", hidden: true }, T("vadeGun") + " ", vade);
    odemeSec.onchange = () => { vadeKutu.hidden = !["Çek", "Senet", "Açık hesap"].includes(odemeSec.value); if (durum.className === "hata") { durum.className = "kucuk"; durum.textContent = ""; } };
    const not = el("textarea", { rows: "2", placeholder: T("notYer"), maxlength: "1000" });
    const durum = el("p", { class: "kucuk" });
    const gonder = el("button", { type: "button", class: "btn dolu", onclick: () => {
      if (odemeSor && !odemeSec.value) { durum.className = "hata"; durum.textContent = T("hataOdeme"); odemeSec.focus(); return; }
      const vg = parseInt(vade.value, 10);
      const odeme = odemeSor ? { tip: odemeSec.value, ...(!vadeKutu.hidden && vg >= 0 ? { vadeGun: Math.min(365, vg) } : {}) } : null;
      gonder.disabled = true; durum.className = "kucuk"; durum.textContent = T("gonderiliyor");
      rpc("portal_siparis", { p_kod: kod, p_kalemler: sepet.map((s) => ({ urunId: s.urunId, renk: s.renk, beden: s.beden, miktar: s.miktar })), p_not: not.value, p_odeme: odeme })
        .then(() => { sepet = []; hesap = null; kutu.replaceWith(sepetCiz(true)); sepetGitYenile(); })
        .catch((e) => { gonder.disabled = false; durum.className = "hata"; durum.textContent = hataMetni(e); });
    } }, T("siparisiGonder"));
    kutu.append(
      el("h3", {}, T("sepet")), liste,
      el("div", { class: "sepet-toplam" }, el("span", {}, toplamCift + " " + T("cift")), el("b", {}, Object.entries(toplamlar).map(([pb, t]) => para(t, pb)).join(" + ") + (fiyatsizVar ? (Object.keys(toplamlar).length ? " + " : "") + T("fiyatOnayda") : ""))),
      fiyatsizVar ? el("p", { class: "kucuk uyari" }, T("fiyatOnaydaUzun")) : null,
      el("p", { class: "kucuk" }, T("kesinTutar")),
      odemeSor ? el("label", { class: "odeme-satiri" }, el("span", {}, T("odemeSekli")), odemeSec) : null, odemeSor ? vadeKutu : null,
      not, gonder, durum);
    return kutu;
  }

  if (kod) yukle(kod); else girisCiz();
  }
})();

// RESİM BÜYÜTME (kullanıcı: "sitede resme tıklayınca resim büyüsün"): koleksiyon kartı, sepet ve sipariş resimleri.
// Tek dinleyici (olay yetkisi): kartlar yeniden çizilse de çalışır. Kapatma: arka plana / × / Esc.
(function () {
  let kutu = null;
  function kapat() { if (kutu) { kutu.remove(); kutu = null; document.removeEventListener("keydown", tus); } }
  function tus(e) { if (e.key === "Escape") kapat(); }
  document.addEventListener("click", (e) => {
    const img = e.target.closest && e.target.closest(".urun-resim img, .minik img");
    if (!img || !img.src) return;
    e.preventDefault();
    kapat();
    kutu = document.createElement("div");
    kutu.className = "resim-buyuk";
    const b = document.createElement("img"); b.src = img.src; b.alt = img.alt || "";
    const x = document.createElement("button"); x.type = "button"; x.className = "resim-kapat"; x.setAttribute("aria-label", "×"); x.textContent = "×";
    const ad = document.createElement("div"); ad.className = "resim-ad"; ad.textContent = img.alt || "";
    kutu.append(b, x, ad);
    kutu.onclick = (ev) => { if (ev.target !== b) kapat(); };
    document.body.append(kutu);
    document.addEventListener("keydown", tus);
  });
})();
