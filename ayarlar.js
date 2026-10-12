// SİTE AYARLARI — yalnız bağlantı. Yazılar, iletişim bilgileri, renk, logo: ERP › Tanımlar › Firma › Web Sitesi
// (site açılışta `site_ayarlari()` ile okur). Buradaki alanlar yalnız ERP'ye ulaşılamazsa kullanılan yedektir.
window.SITE = {
  telefon: "", whatsapp: "", eposta: "", adres: "", haritaSorgusu: "", instagram: "",
  // ERP'nin Supabase projesi. YALNIZ publishable (herkese açık) anahtar; secret anahtar ASLA buraya girmez.
  // Site yalnız site-portal.sql'deki fonksiyonları çağırabilir (site_ayarlari, portal, portal_siparis).
  supabaseUrl: "https://mqdgucoomgqcvhvgixbl.supabase.co",
  supabaseAnahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2",
};
