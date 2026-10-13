// ÇOKLU DİL (kullanıcı: "çoklu dil desteği olsun, yabancı müşteri kendi dilinde kullanabilsin" — Türkçe, İngilizce, Rusça).
//
// İki tür metin var:
//   1) ARAYÜZ yazıları (menü, düğme, tablo başlığı, hata…) — burada, `SOZLUK[dil][anahtar]`.
//   2) İÇERİK yazıları (karşılama, "Nasıl üretiyoruz" kartları…) — firmanın ERP'de yazdığı metinler. ERP › Tanımlar ›
//      Web Sitesi her dil için ayrı alan tutar (`siteAyarlari.diller.en/ru`); boşsa burada `ICERIK[dil]` (ilk kurulumun
//      çevirisi), o da yoksa Türkçesi gösterilir.
// Ürün adları, renkler, bedenler çevrilmez (ERP'deki kayıt adı; müşteri siparişte aynı adı görmeli).
//
// Seçim: adres ?dil=en > ziyaretçinin önceki seçimi > tarayıcı dili (ru/uk/kk/be/az… → Rusça, tr → Türkçe, diğer →
// İngilizce). Değiştirmek sayfayı yeniden yükler — bütün metinler tek kaynaktan, karışık dil kalmaz.
(function () {
  const DILLER = { tr: "Türkçe", en: "English", ru: "Русский" };
  const BICIM = { tr: "tr-TR", en: "en-GB", ru: "ru-RU" };
  function sec() {
    try { const q = new URLSearchParams(location.search).get("dil"); if (q && DILLER[q]) { localStorage.setItem("nd-dil", q); return q; } } catch (e) { /* */ }
    try { const k = localStorage.getItem("nd-dil"); if (k && DILLER[k]) return k; } catch (e) { /* */ }
    const n = String((navigator.languages && navigator.languages[0]) || navigator.language || "tr").toLowerCase().slice(0, 2);
    if (n === "tr") return "tr";
    if (["ru", "uk", "be", "kk", "ky", "uz", "tg", "az", "hy", "ka"].includes(n)) return "ru";
    return "en";
  }
  const dil = sec();

  const SOZLUK = {
    tr: {
      menuKoleksiyon: "Koleksiyon", menuUretim: "Üretim", menuIletisim: "İletişim", menuGiris: "Müşteri girişi", menuAnasayfa: "Ana sayfa",
      telefon: "Telefon", eposta: "E-posta", adres: "Adres", instagram: "Instagram", profilimiz: "Profilimiz", konum: "Konum",
      kayitOl: "Kayıt ol", hesabinYokMu: "Hesabınız yok mu?", kayitBaslik: "Müşteri kaydı", kayitAciklama: "Firma bilgilerinizi girin. Kaydınız onaylanınca seçtiğiniz kullanıcı adı ve şifreyle girebilirsiniz.", kUnvan: "Firma ünvanı *", kYetkili: "Yetkili kişi", kTelefon: "Telefon *", kEposta: "E-posta", kVergiDairesi: "Vergi dairesi", kVergiNo: "Vergi no / TCKN", kUlke: "Ülke", kIl: "İl / şehir", kIlce: "İlçe", kAdres: "Adres", kNot: "Not (isteğe bağlı)", kSifre2: "Şifre (en az 6 karakter) *", kKullanici: "Kullanıcı adı *", kGonder: "Kaydı gönder", kGonderiliyor: "Gönderiliyor…", kTamam: "Kaydınız alındı. Onaylandığında bu kullanıcı adı ve şifreyle giriş yapabilirsiniz.", kGeri: "Girişe dön", hataKayitBilgi: "Firma ünvanı ve telefon gerekli.", hataKayitKullanici: "Kullanıcı adı 3-40 karakter: harf, rakam, nokta, tire.", hataKayitSifre: "Şifre en az 6 karakter olmalı.", hataKayitAlinmis: "Bu kullanıcı adı alınmış, başka bir ad seçin.", hataKayitSinir: "Bugün çok sayıda kayıt geldi; lütfen bizi arayın.",
      girisBaslik: "Müşteri girişi", girisAciklama: "Kullanıcı adınız ve şifrenizle girin; modelleri, size özel fiyatları, siparişlerinizi ve hesabınızı görün.",
      kullaniciAdi: "Kullanıcı adı", sifre: "Şifre", giris: "Giriş", girisYapiliyor: "Giriş…",
      bilgiYok: "Giriş bilginiz yok ya da şifrenizi mi unuttunuz? ", bizdenIsteyin: "Bizden isteyin",
      waGirisIstegi: "Merhaba, müşteri girişi için kullanıcı adı ve şifre rica ediyorum.",
      hataGiris: "Kullanıcı adı ya da şifre hatalı.", hataKilit: "Çok sayıda hatalı deneme: 15 dakika sonra tekrar deneyin.",
      hataBaglanti: "Bağlantı kurulamadı. Biraz sonra tekrar deneyin.",
      hataOturum: "Oturumunuz sona erdi ya da erişiminiz kapatıldı. Lütfen yeniden giriş yapın.",
      hataGunluk: "Bugün için sipariş sınırına ulaştınız; lütfen bizi arayın.",
      hataModel: "Sepetteki bir model artık listenizde değil. Sayfayı yenileyip tekrar deneyin.",
      hataRenkBeden: "Sepetteki bir renk/beden artık yok. Sayfayı yenileyip tekrar deneyin.",
      hataMiktar: "Adetler 1 ile 5000 arasında tam sayı olmalı.", hataBos: "Sepet boş.", hataCokKalem: "Sepette çok fazla satır var; siparişi ikiye bölün.",
      hataTarih: "Tarih aralığı geçersiz.", hataHesap: "Hesap bilgisi alınamadı. Biraz sonra tekrar deneyin.",
      yukleniyor: "Yükleniyor…", koleksiyonYukleniyor: "Koleksiyon yükleniyor…",
      hosgeldiniz: "Hoş geldiniz, ", cikis: "Çıkış", sekmeKoleksiyon: "Koleksiyon", sekmeHesap: "Hesabım", sekmeSiparis: "Siparişlerim",
      tumu: "Tümü", modelYok: "Size tanımlı model henüz yok. Bilgi için bize ulaşın.", fiyatIcinGiris: "Fiyat ve sipariş için giriş yapın", gorselYakinda: "Görsel yakında", ciftBasi: " / çift",
      asorti: "Asorti", bedenBeden: "Beden beden", koli: "koli", koliAdedi: "Koli adedi", beden: "Beden",
      sepeteEkle: "Sepete ekle", adetGirin: "Adet girin", eklendi: "Eklendi ✓",
      sepet: "Sepet", sepetBos: "Modelde renk seçip adet girin, sepete ekleyin.", kaldir: "Kaldır", cift: "çift",
      notYer: "Not (teslim tarihi, kutu, etiket…)", gonderiliyor: "Gönderiliyor…", siparisiGonder: "Siparişi gönder",
      siparisAlindi: "Siparişiniz alındı, teşekkürler. Kontrol edip size dönüş yapacağız.", kesinTutar: "Kesin tutar ve teslim tarihi sipariş onayında bildirilir.",
      baslangic: "Başlangıç", bitis: "Bitiş", goster: "Göster", yazdir: "Yazdır", guncelBakiye: "Güncel bakiye", borc: "borç", alacak: "alacak",
      tarih: "Tarih", belge: "Belge", aciklama: "Açıklama", borcB: "Borç", alacakB: "Alacak", bakiye: "Bakiye", devir: "Önceki dönemden devir",
      vade: "vade", hareketYok: "Bu tarih aralığında hareket yok.", hesapB: "Hesap", resmiHesap: "Resmi hesap",
      cekler: "Çek ve senetler", vadeB: "Vade", no: "No", banka: "Banka", tutar: "Tutar", durum: "Durum",
      araYer: "Model, renk ya da tip ara", aramaSonucYok: "Aramanıza uyan model yok.", stok_stokta: "● Stokta", stok_uretimde: "● Üretimde", stok_siparis: "● Sipariş üzerine", siparisOldu: "Siparişe çevrildi", sebep: "Sebep", siteden: "Siteden gönderdikleriniz", kabulEdilmedi: "Kabul edilmedi", onayBekliyor: "Onay bekliyor", toplam: "Toplam",
      teslimEdildi: "Teslim edildi", kismen: "Kısmen teslim", hazirlaniyor: "Hazırlanıyor", belgeNo: "Belge ", termin: "Termin ",
      model: "Model", renk: "Renk", siparis: "Sipariş", teslim: "Teslim", kalan: "Kalan", fiyat: "Fiyat",
      kdvDahil: "KDV dahil toplam", odenen: "Ödenen (kapora)", siparisYok: "Henüz siparişiniz yok.", siparisleriniz: "Siparişleriniz",
      asortiDagilim: "Beden dağılımı", koliAsorti: (n, ad) => n + " koli " + ad,
      fiyatOnayda: "Fiyat onayda", fiyatOnaydaUzun: "Fiyatı olmayan modellerin fiyatı sipariş onayında bildirilir.",
      odemeSekli: "Ödeme şekli", odemeSec: "Ödeme şeklini seçin", vadeGun: "Vade (gün)", hataOdeme: "Ödeme şeklini seçin.",
      odemeTip: { "Nakit": "Nakit", "Havale/EFT": "Havale / EFT", "Kredi kartı": "Kredi kartı", "Çek": "Çek", "Senet": "Senet", "Açık hesap": "Açık hesap (vadeli)" },
      // Çek durumları ERP'de Türkçe kayıtlı; görünen ad çevrilir.
      cekDurum: { "Portföyde": "Portföyde", "Ciro Edildi": "Ciro edildi", "Tahsilde": "Tahsilde", "Tahsil Edildi": "Tahsil edildi", "Karşılıksız": "Karşılıksız" },
    },
    en: {
      menuKoleksiyon: "Collection", menuUretim: "Production", menuIletisim: "Contact", menuGiris: "Customer login", menuAnasayfa: "Home",
      telefon: "Phone", eposta: "E-mail", adres: "Address", instagram: "Instagram", profilimiz: "Our profile", konum: "Location",
      kayitOl: "Sign up", hesabinYokMu: "No account yet?", kayitBaslik: "Customer registration", kayitAciklama: "Enter your company details. Once approved, you can sign in with the username and password you choose.", kUnvan: "Company name *", kYetkili: "Contact person", kTelefon: "Phone *", kEposta: "E-mail", kVergiDairesi: "Tax office", kVergiNo: "Tax / ID number", kUlke: "Country", kIl: "City", kIlce: "District", kAdres: "Address", kNot: "Note (optional)", kSifre2: "Password (min. 6 characters) *", kKullanici: "Username *", kGonder: "Send registration", kGonderiliyor: "Sending…", kTamam: "Your registration was received. You can sign in with this username and password once it is approved.", kGeri: "Back to login", hataKayitBilgi: "Company name and phone are required.", hataKayitKullanici: "Username: 3-40 characters — letters, digits, dot, dash.", hataKayitSifre: "Password must be at least 6 characters.", hataKayitAlinmis: "This username is taken, please choose another.", hataKayitSinir: "Too many registrations today; please call us.",
      girisBaslik: "Customer login", girisAciklama: "Sign in with your username and password to see our models, your prices, your orders and your account.",
      kullaniciAdi: "Username", sifre: "Password", giris: "Sign in", girisYapiliyor: "Signing in…",
      bilgiYok: "No login details, or forgot your password? ", bizdenIsteyin: "Ask us",
      waGirisIstegi: "Hello, I would like a username and password for the customer login.",
      hataGiris: "Wrong username or password.", hataKilit: "Too many failed attempts: please try again in 15 minutes.",
      hataBaglanti: "Could not connect. Please try again shortly.",
      hataOturum: "Your session has ended or your access was closed. Please sign in again.",
      hataGunluk: "You have reached today's order limit; please call us.",
      hataModel: "A model in your cart is no longer in your list. Refresh the page and try again.",
      hataRenkBeden: "A colour/size in your cart is no longer available. Refresh the page and try again.",
      hataMiktar: "Quantities must be whole numbers between 1 and 5000.", hataBos: "Your cart is empty.", hataCokKalem: "Too many lines in the cart; please split the order.",
      hataTarih: "Invalid date range.", hataHesap: "Could not load account details. Please try again shortly.",
      yukleniyor: "Loading…", koleksiyonYukleniyor: "Loading collection…",
      hosgeldiniz: "Welcome, ", cikis: "Sign out", sekmeKoleksiyon: "Collection", sekmeHesap: "My account", sekmeSiparis: "My orders",
      tumu: "All", modelYok: "No models are assigned to you yet. Please contact us.", fiyatIcinGiris: "Sign in for price and ordering", gorselYakinda: "Image coming soon", ciftBasi: " / pair",
      asorti: "Assortment", bedenBeden: "By size", koli: "cartons", koliAdedi: "Number of cartons", beden: "Size",
      sepeteEkle: "Add to cart", adetGirin: "Enter quantity", eklendi: "Added ✓",
      sepet: "Cart", sepetBos: "Choose a colour, enter quantities and add to cart.", kaldir: "Remove", cift: "pairs",
      notYer: "Note (delivery date, box, label…)", gonderiliyor: "Sending…", siparisiGonder: "Send order",
      siparisAlindi: "Your order has been received, thank you. We will check it and get back to you.", kesinTutar: "Final amount and delivery date are confirmed with the order.",
      baslangic: "From", bitis: "To", goster: "Show", yazdir: "Print", guncelBakiye: "Current balance", borc: "due", alacak: "credit",
      tarih: "Date", belge: "Document", aciklama: "Description", borcB: "Debit", alacakB: "Credit", bakiye: "Balance", devir: "Brought forward",
      vade: "due", hareketYok: "No transactions in this date range.", hesapB: "Account", resmiHesap: "Official account",
      cekler: "Cheques and notes", vadeB: "Due date", no: "No", banka: "Bank", tutar: "Amount", durum: "Status",
      araYer: "Search model, colour or type", aramaSonucYok: "No models match your search.", stok_stokta: "● In stock", stok_uretimde: "● In production", stok_siparis: "● Made to order", siparisOldu: "Converted to order", sebep: "Reason", siteden: "Sent from the website", kabulEdilmedi: "Not accepted", onayBekliyor: "Awaiting approval", toplam: "Total",
      teslimEdildi: "Delivered", kismen: "Partly delivered", hazirlaniyor: "In preparation", belgeNo: "Doc ", termin: "Due ",
      model: "Model", renk: "Colour", siparis: "Ordered", teslim: "Delivered", kalan: "Remaining", fiyat: "Price",
      kdvDahil: "Total incl. VAT", odenen: "Paid (deposit)", siparisYok: "You have no orders yet.", siparisleriniz: "Your orders",
      asortiDagilim: "Size breakdown", koliAsorti: (n, ad) => n + " × " + ad,
      fiyatOnayda: "Price on approval", fiyatOnaydaUzun: "Prices for models without a price are confirmed when the order is approved.",
      odemeSekli: "Payment method", odemeSec: "Choose a payment method", vadeGun: "Term (days)", hataOdeme: "Please choose a payment method.",
      odemeTip: { "Nakit": "Cash", "Havale/EFT": "Bank transfer", "Kredi kartı": "Credit card", "Çek": "Cheque", "Senet": "Promissory note", "Açık hesap": "Open account (on terms)" },
      cekDurum: { "Portföyde": "Held", "Ciro Edildi": "Endorsed", "Tahsilde": "In collection", "Tahsil Edildi": "Collected", "Karşılıksız": "Bounced" },
    },
    ru: {
      menuKoleksiyon: "Коллекция", menuUretim: "Производство", menuIletisim: "Контакты", menuGiris: "Вход для клиентов", menuAnasayfa: "Главная",
      telefon: "Телефон", eposta: "E-mail", adres: "Адрес", instagram: "Instagram", profilimiz: "Наш профиль", konum: "Расположение",
      kayitOl: "Регистрация", hesabinYokMu: "Нет аккаунта?", kayitBaslik: "Регистрация клиента", kayitAciklama: "Укажите данные компании. После подтверждения вы сможете войти с выбранным логином и паролем.", kUnvan: "Название компании *", kYetkili: "Контактное лицо", kTelefon: "Телефон *", kEposta: "E-mail", kVergiDairesi: "Налоговая инспекция", kVergiNo: "ИНН / номер", kUlke: "Страна", kIl: "Город", kIlce: "Район", kAdres: "Адрес", kNot: "Примечание (необязательно)", kSifre2: "Пароль (не менее 6 символов) *", kKullanici: "Логин *", kGonder: "Отправить", kGonderiliyor: "Отправка…", kTamam: "Заявка получена. После подтверждения вы сможете войти с этим логином и паролем.", kGeri: "Назад ко входу", hataKayitBilgi: "Укажите название компании и телефон.", hataKayitKullanici: "Логин: 3-40 символов — буквы, цифры, точка, дефис.", hataKayitSifre: "Пароль должен быть не менее 6 символов.", hataKayitAlinmis: "Этот логин занят, выберите другой.", hataKayitSinir: "Сегодня слишком много заявок; позвоните нам.",
      girisBaslik: "Вход для клиентов", girisAciklama: "Войдите с логином и паролем, чтобы увидеть модели, ваши цены, заказы и счёт.",
      kullaniciAdi: "Логин", sifre: "Пароль", giris: "Войти", girisYapiliyor: "Вход…",
      bilgiYok: "Нет данных для входа или забыли пароль? ", bizdenIsteyin: "Запросите у нас",
      waGirisIstegi: "Здравствуйте, прошу логин и пароль для входа клиента.",
      hataGiris: "Неверный логин или пароль.", hataKilit: "Слишком много неудачных попыток: повторите через 15 минут.",
      hataBaglanti: "Нет соединения. Попробуйте чуть позже.",
      hataOturum: "Сеанс истёк или доступ закрыт. Войдите снова.",
      hataGunluk: "Достигнут дневной лимит заказов; пожалуйста, позвоните нам.",
      hataModel: "Модели из корзины больше нет в вашем списке. Обновите страницу и повторите.",
      hataRenkBeden: "Цвета/размера из корзины больше нет. Обновите страницу и повторите.",
      hataMiktar: "Количество — целое число от 1 до 5000.", hataBos: "Корзина пуста.", hataCokKalem: "Слишком много строк в корзине; разделите заказ.",
      hataTarih: "Неверный период.", hataHesap: "Не удалось загрузить данные счёта. Попробуйте позже.",
      yukleniyor: "Загрузка…", koleksiyonYukleniyor: "Загрузка коллекции…",
      hosgeldiniz: "Добро пожаловать, ", cikis: "Выйти", sekmeKoleksiyon: "Коллекция", sekmeHesap: "Мой счёт", sekmeSiparis: "Мои заказы",
      tumu: "Все", modelYok: "Для вас пока нет моделей. Свяжитесь с нами.", fiyatIcinGiris: "Войдите, чтобы увидеть цену и заказать", gorselYakinda: "Фото скоро", ciftBasi: " / пара",
      asorti: "Ассортимент", bedenBeden: "По размерам", koli: "кор.", koliAdedi: "Количество коробов", beden: "Размер",
      sepeteEkle: "В корзину", adetGirin: "Укажите количество", eklendi: "Добавлено ✓",
      sepet: "Корзина", sepetBos: "Выберите цвет, укажите количество и добавьте в корзину.", kaldir: "Удалить", cift: "пар",
      notYer: "Примечание (срок, коробка, этикетка…)", gonderiliyor: "Отправка…", siparisiGonder: "Отправить заказ",
      siparisAlindi: "Заказ получен, спасибо. Мы проверим его и свяжемся с вами.", kesinTutar: "Итоговая сумма и срок поставки подтверждаются при подтверждении заказа.",
      baslangic: "С", bitis: "По", goster: "Показать", yazdir: "Печать", guncelBakiye: "Текущий баланс", borc: "долг", alacak: "переплата",
      tarih: "Дата", belge: "Документ", aciklama: "Описание", borcB: "Дебет", alacakB: "Кредит", bakiye: "Баланс", devir: "Остаток на начало",
      vade: "срок", hareketYok: "Нет операций за этот период.", hesapB: "Счёт", resmiHesap: "Официальный счёт",
      cekler: "Чеки и векселя", vadeB: "Срок", no: "№", banka: "Банк", tutar: "Сумма", durum: "Статус",
      araYer: "Поиск: модель, цвет или тип", aramaSonucYok: "Нет моделей по вашему запросу.", stok_stokta: "● В наличии", stok_uretimde: "● В производстве", stok_siparis: "● Под заказ", siparisOldu: "Оформлен заказ", sebep: "Причина", siteden: "Отправлено с сайта", kabulEdilmedi: "Не принят", onayBekliyor: "Ожидает подтверждения", toplam: "Итого",
      teslimEdildi: "Доставлен", kismen: "Частично доставлен", hazirlaniyor: "Готовится", belgeNo: "Док. ", termin: "Срок ",
      model: "Модель", renk: "Цвет", siparis: "Заказано", teslim: "Доставлено", kalan: "Осталось", fiyat: "Цена",
      kdvDahil: "Итого с НДС", odenen: "Оплачено (аванс)", siparisYok: "У вас пока нет заказов.", siparisleriniz: "Ваши заказы",
      asortiDagilim: "Размерная сетка", koliAsorti: (n, ad) => n + " × " + ad,
      fiyatOnayda: "Цена при подтверждении", fiyatOnaydaUzun: "Цены моделей без цены сообщаются при подтверждении заказа.",
      odemeSekli: "Способ оплаты", odemeSec: "Выберите способ оплаты", vadeGun: "Отсрочка (дней)", hataOdeme: "Выберите способ оплаты.",
      odemeTip: { "Nakit": "Наличные", "Havale/EFT": "Банковский перевод", "Kredi kartı": "Кредитная карта", "Çek": "Чек", "Senet": "Вексель", "Açık hesap": "Отсрочка платежа" },
      cekDurum: { "Portföyde": "В портфеле", "Ciro Edildi": "Индоссирован", "Tahsilde": "На инкассо", "Tahsil Edildi": "Оплачен", "Karşılıksız": "Не оплачен" },
    },
  };

  // İÇERİK VARSAYILANLARI — ERP'deki ilk metinlerin (SITE_VARSAYILAN, 267) çevirisi. ERP'de o dil için metin yazılmamışsa
  // VE Türkçe metin değiştirilmemişse bunlar görünür (Türkçe değiştiyse eski çeviri yanlış olur → Türkçesi gösterilir).
  const ICERIK = {
    tr: {
      ustEtiket: "Ayakkabı üretimi", baslik: "Deriden sevkiyata, her adımda ustalık.",
      aciklama: "New Diamond; modelden kesime, sayadan montaja kadar bütün üretimi kendi atölyesinde yapar. Müşteri kodunuzla koleksiyonu inceleyin ve siparişinizi doğrudan verin.",
      dugme1: "Müşteri girişi", dugme2: "Teklif isteyin", vitrinBaslik: "Koleksiyondan", vitrinAlt: "Modellerimizden bir seçki. Fiyat ve sipariş için müşteri girişi yapın.", koleksiyonBaslik: "Koleksiyon", koleksiyonAlt: "Müşterilerimize özel: modeller, size özel fiyatlar ve sipariş.",
      uretimBaslik: "Nasıl üretiyoruz", uretimAlt: "Her çift aynı titizlikle, aşama aşama izlenerek.",
      iletisimBaslik: "İletişim", iletisimAlt: "Toptan sipariş ve iş birliği için bize ulaşın.",
      uretimKartlari: [["Kesim", "Seçilmiş deriler, modele özel kalıplarla kesilir; fire en aza indirilir."], ["Saya", "Usta ellerde dikilen saya, modelin karakterini belirler."], ["Montaj ve taban", "Taban ve saya sağlam, uzun ömürlü bir birleşimle buluşur."], ["Kalite ve sevkiyat", "Her çift kontrol edilir, asorti kolilere yerleştirilip zamanında sevk edilir."]],
    },
    en: {
      ustEtiket: "Shoe manufacturing", baslik: "From leather to shipment, craftsmanship at every step.",
      aciklama: "New Diamond carries out all production in its own workshop — from pattern and cutting to uppers and assembly. Sign in to browse the collection and place your order directly.",
      dugme1: "Customer login", dugme2: "Request a quote", vitrinBaslik: "From the collection", vitrinAlt: "A selection of our models. Sign in for prices and ordering.", koleksiyonBaslik: "Collection", koleksiyonAlt: "For our customers: models, your prices and ordering.",
      uretimBaslik: "How we make shoes", uretimAlt: "Every pair with the same care, tracked step by step.",
      iletisimBaslik: "Contact", iletisimAlt: "Get in touch for wholesale orders and partnerships.",
      uretimKartlari: [["Cutting", "Selected leathers are cut with model-specific patterns, keeping waste to a minimum."], ["Uppers", "Stitched by skilled hands, the upper gives each model its character."], ["Assembly & sole", "Sole and upper are joined into a strong, long-lasting bond."], ["Quality & shipping", "Every pair is checked, packed in assorted cartons and shipped on time."]],
    },
    ru: {
      ustEtiket: "Производство обуви", baslik: "От кожи до отгрузки — мастерство на каждом этапе.",
      aciklama: "New Diamond выполняет всё производство в собственном цеху — от модели и раскроя до заготовки и сборки. Войдите, чтобы посмотреть коллекцию и оформить заказ напрямую.",
      dugme1: "Вход для клиентов", dugme2: "Запросить предложение", vitrinBaslik: "Из коллекции", vitrinAlt: "Подборка наших моделей. Для цен и заказа войдите как клиент.", koleksiyonBaslik: "Коллекция", koleksiyonAlt: "Для наших клиентов: модели, ваши цены и заказ.",
      uretimBaslik: "Как мы производим", uretimAlt: "Каждая пара — с одинаковой тщательностью, этап за этапом.",
      iletisimBaslik: "Контакты", iletisimAlt: "Свяжитесь с нами по оптовым заказам и сотрудничеству.",
      uretimKartlari: [["Раскрой", "Отборная кожа кроится по лекалам модели, отходы сводятся к минимуму."], ["Заготовка", "Заготовка, сшитая мастерами, определяет характер модели."], ["Сборка и подошва", "Подошва и заготовка соединяются прочно и надолго."], ["Качество и отгрузка", "Каждая пара проверяется, упаковывается в ассортиментные коробки и отгружается вовремя."]],
    },
  };

  window.DIL = dil;
  window.DIL_BICIM = BICIM[dil];
  window.DILLER = DILLER;
  window.ICERIK = ICERIK;
  // T("anahtar") — bu dilde yoksa Türkçesi (eksik çeviri boş kalmasın).
  window.T = (k) => (SOZLUK[dil] && SOZLUK[dil][k] != null ? SOZLUK[dil][k] : SOZLUK.tr[k] != null ? SOZLUK.tr[k] : k);
  window.dilDegistir = (yeni) => { try { localStorage.setItem("nd-dil", yeni); } catch (e) { /* */ } const u = new URL(location.href); u.searchParams.delete("dil"); location.href = u.toString(); };
  document.documentElement.lang = dil;
})();
