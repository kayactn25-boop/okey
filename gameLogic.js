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
        this.puanlar = {};
    }

    baslat() {
        this._okeyBelirle();
        this._taslariDagit();
        this.oyuncular.forEach(p => {
            this.atilanTaslar[p] = [];
            this.puanlar[p] = 0;
        });
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
        const tasSayisiGecerli = (ciftMi && el.length === 14) || (!ciftMi && el.length === 14);
        if (!tasSayisiGecerli) return false;

        let elKopya = JSON.parse(JSON.stringify(el));
        const okeyler = elKopya.filter(t => t.isOkey);
        let normalTaslar = elKopya.filter(t => !t.isOkey);

        if (ciftMi) {
            let ciftSayisi = 0;
            let kalanOkey = okeyler.length;
            const sayac = {};
            normalTaslar.forEach(t => {
                const anahtar = `${t.renk}-${t.sayi}`;
                sayac[anahtar] = (sayac[anahtar] || 0) + 1;
            });
            for (const anahtar in sayac) {
                if (sayac[anahtar] % 2 !== 0) {
                    if (kalanOkey > 0) {
                        ciftSayisi += (sayac[anahtar] + 1) / 2;
                        kalanOkey--;
                    } else return false;
                } else {
                    ciftSayisi += sayac[anahtar] / 2;
                }
            }
            ciftSayisi += Math.floor(kalanOkey / 2);
            return ciftSayisi === 7;
        }
        
        // Normal bitiş doğrulaması şimdilik basitleştirilmiştir.
        // Gerçek bir backtracking algoritması çok daha karmaşıktır.
        console.log("UYARI: Normal el doğrulama mantığı basitleştirilmiştir.");
        return true;
    }

    getGameState() {
        return {
            oyuncular: this.oyuncular,
            siraKimde: this.oyuncular[this.siraKimdeIndex],
            atilanTaslar: this.atilanTaslar,
            gosterge: this.gosterge,
            okeyTasi: this.okeyTasi,
            ortaDesteSayisi: this.ortaDeste.length,
            sonAtilanTas: this.sonAtilanTas
        };
    }
}
module.exports = OkeyGame;