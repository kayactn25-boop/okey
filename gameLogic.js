class OkeyGame {
    constructor(oyuncular) {
        this.oyuncular = [...oyuncular];
        this.deste = this._desteOlusturVeKaristir();
        this.eller = {};
        this.gosterge = null;
        this.okeyTasi = null;
        this.siraKimdeIndex = 0;
        this.atilanTaslar = {};
        this.sonAtilanTas = null;
        this.oyunBittiMi = false;
        this.hazirOyuncular = new Set();
        this.turnTimer = null; // Sıra zamanlayıcısı için eklendi
    }

    baslat() {
        this._okeyBelirle();
        this._taslariDagit();
        this.oyuncular.forEach(p => this.atilanTaslar[p] = []);
    }

    _desteOlusturVeKaristir() {
        const renkler = ['sari', 'mavi', 'siyah', 'kirmizi'];
        let deste = [];
        renkler.forEach(renk => {
            for (let i = 1; i <= 13; i++) {
                deste.push({ renk, sayi: i, id: `${renk}-${i}-1`, isOkey: false });
                deste.push({ renk, sayi: i, id: `${renk}-${i}-2`, isOkey: false });
            }
        });
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-1', isOkey: false });
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-2', isOkey: false });
        for (let i = deste.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deste[i], deste[j]] = [deste[j], deste[i]];
        }
        return deste;
    }

    _okeyBelirle() {
        let gostergeAdayi = null, denemeIndex = 0;
        do { gostergeAdayi = this.deste[denemeIndex++]; } while (gostergeAdayi.renk === 'sahte');
        this.gosterge = gostergeAdayi;
        let okeySayi = this.gosterge.sayi === 13 ? 1 : this.gosterge.sayi + 1;
        this.okeyTasi = { renk: this.gosterge.renk, sayi: okeySayi };
        this.deste.forEach(tas => {
            if (tas.renk === 'sahte') {
                tas.sayi = this.okeyTasi.sayi;
                tas.renk = this.okeyTasi.renk;
                tas.isOkey = true;
            }
        });
    }

    _taslariDagit() {
        this.siraKimdeIndex = Math.floor(Math.random() * 4);
        const baslangicOyuncusu = this.oyuncular[this.siraKimdeIndex];
        this.oyuncular.forEach(oyuncu => {
            const tasSayisi = (oyuncu === baslangicOyuncusu) ? 15 : 14;
            this.eller[oyuncu] = this.deste.splice(0, tasSayisi);
        });
        this.ortaDeste = this.deste;
    }

    ortadanCek(oyuncuAdi) {
        if (this.oyuncular[this.siraKimdeIndex] !== oyuncuAdi || this.ortaDeste.length === 0) return null;
        const cekilenTas = this.ortaDeste.pop();
        this.eller[oyuncuAdi].push(cekilenTas);
        return cekilenTas;
    }

    yandanCek(oyuncuAdi) {
        if (this.oyuncular[this.siraKimdeIndex] !== oyuncuAdi || !this.sonAtilanTas) return null;
        const cekilenTas = this.sonAtilanTas;
        this.sonAtilanTas = null;
        this.eller[oyuncuAdi].push(cekilenTas);
        return cekilenTas;
    }

    tasAt(oyuncuAdi, tasId) {
        if (this.oyuncular[this.siraKimdeIndex] !== oyuncuAdi) return false;
        const el = this.eller[oyuncuAdi];
        if (el.length % 3 === 0) return false; // Elinde 15, 12, 9... taş olmalı
        const atilanTasIndex = el.findIndex(t => t.id === tasId);
        if (atilanTasIndex === -1) return false;
        const atilanTas = el.splice(atilanTasIndex, 1)[0];
        this.atilanTaslar[oyuncuAdi].push(atilanTas);
        this.sonAtilanTas = atilanTas;
        this._sirayiIlerlet();
        return atilanTas;
    }

    _sirayiIlerlet() {
        this.siraKimdeIndex = (this.siraKimdeIndex + 1) % 4;
    }

    eliDogrula(el, ciftMi) {
        if (el.length !== 14) return false;
    
        const elKopya = JSON.parse(JSON.stringify(el));
        const okeyler = elKopya.filter(t => t.isOkey);
        const normalTaslar = elKopya.filter(t => !t.isOkey);
    
        if (ciftMi) {
            let ciftSayisi = 0;
            let kalanOkey = okeyler.length;
            const sayac = new Map();
            normalTaslar.forEach(t => {
                const anahtar = `${t.renk}-${t.sayi}`;
                sayac.set(anahtar, (sayac.get(anahtar) || 0) + 1);
            });
    
            for (const count of sayac.values()) {
                ciftSayisi += Math.floor(count / 2);
            }
            
            let tekler = 0;
            for (const count of sayac.values()) {
                if (count % 2 !== 0) tekler++;
            }
    
            ciftSayisi += Math.min(tekler, kalanOkey);
            kalanOkey -= Math.min(tekler, kalanOkey);
            ciftSayisi += Math.floor(kalanOkey / 2);
    
            return ciftSayisi === 7;
        }
    
        normalTaslar.sort((a, b) => a.renk.localeCompare(b.renk) || a.sayi - b.sayi);
    
        const perlereAyrilabilirMi = (taslar, okeyAdedi) => {
            if (taslar.length === 0) return true;
    
            const t1 = taslar[0];
            const kalanlar = taslar.slice(1);
    
            // 3'lü Sıralı Per denemesi
            const t2_sirali = kalanlar.find(t => t.renk === t1.renk && t.sayi === t1.sayi + 1);
            if (t2_sirali) {
                const t3_sirali = kalanlar.find(t => t.renk === t1.renk && t.sayi === t1.sayi + 2);
                if (t3_sirali) {
                    const yeniKalanlar = kalanlar.filter(t => t.id !== t2_sirali.id && t.id !== t3_sirali.id);
                    if (perlereAyrilabilirMi(yeniKalanlar, okeyAdedi)) return true;
                }
            }

            // 3'lü Aynı Sayılı Per denemesi
            const ayniSayililar = kalanlar.filter(t => t.sayi === t1.sayi);
            if (ayniSayililar.length >= 2) {
                const renkSeti = new Set([t1.renk, ayniSayililar[0].renk, ayniSayililar[1].renk]);
                if (renkSeti.size === 3) {
                    const yeniKalanlar = kalanlar.filter(t => t.id !== ayniSayililar[0].id && t.id !== ayniSayililar[1].id);
                    if (perlereAyrilabilirMi(yeniKalanlar, okeyAdedi)) return true;
                }
            }
    
            // Okey kullanarak per denemesi
            if (okeyAdedi > 0) {
                // 2 taş + 1 okey ile sıralı
                if (t2_sirali) {
                    const yeniKalanlar = kalanlar.filter(t => t.id !== t2_sirali.id);
                    if (perlereAyrilabilirMi(yeniKalanlar, okeyAdedi - 1)) return true;
                }
                const t3_alternatif = kalanlar.find(t => t.renk === t1.renk && t.sayi === t1.sayi + 2);
                if (t3_alternatif) {
                     const yeniKalanlar = kalanlar.filter(t => t.id !== t3_alternatif.id);
                     if(perlereAyrilabilirMi(yeniKalanlar, okeyAdedi - 1)) return true;
                }

                // 2 taş + 1 okey ile aynı sayılı
                if (ayniSayililar.length >= 1) {
                    const yeniKalanlar = kalanlar.filter(t => t.id !== ayniSayililar[0].id);
                    if (perlereAyrilabilirMi(yeniKalanlar, okeyAdedi - 1)) return true;
                }
            }
    
            return false;
        };
    
        return perlereAyrilabilirMi(normalTaslar, okeyler.length);
    }
    
    getGameState() {
        let oyuncuElSayilari = {};
        this.oyuncular.forEach(p => {
            oyuncuElSayilari[p] = this.eller[p] ? this.eller[p].length : 0;
        });
        return {
            oyuncular: this.oyuncular,
            siraKimde: this.oyuncular[this.siraKimdeIndex],
            atilanTaslar: this.atilanTaslar,
            gosterge: this.gosterge,
            okeyTasi: this.okeyTasi,
            ortaDesteSayisi: this.ortaDeste.length,
            sonAtilanTas: this.sonAtilanTas,
            hazirOyuncular: Array.from(this.hazirOyuncular),
            oyuncuElSayilari: oyuncuElSayilari
        };
    }
}
module.exports = OkeyGame;