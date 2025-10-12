class OkeyGame {
    constructor(oyuncular) {
        this.oyuncular = [...oyuncular];
        this.deste = this.desteOlusturVeKaristir();
        this.eller = {};
        this.gosterge = null;
        this.okeyTasi = null;
        this.siraKimdeIndex = 0;
        this.atilanTaslar = {};
        this.sonAtilanTas = null;
        this.oyunBittiMi = false;
    }

    baslat() {
        this.okeyBelirle();
        this.taslariDagit();
        this.oyuncular.forEach(p => this.atilanTaslar[p] = []);
    }

    desteOlusturVeKaristir() {
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

    okeyBelirle() {
        let gostergeAdayi = null, denemeIndex = 0;
        do { gostergeAdayi = this.deste[denemeIndex++]; } while (gostergeAdayi.renk === 'sahte');
        this.gosterge = gostergeAdayi;

        let okeySayi = this.gosterge.sayi === 13 ? 1 : this.gosterge.sayi + 1;
        this.okeyTasi = { renk: this.gosterge.renk, sayi: okeySayi };

        // Destede sahte okeyleri gerçek okeyin yerine geçecek şekilde ayarla
        this.deste.forEach(tas => {
            if (tas.renk === 'sahte') {
                tas.sayi = this.okeyTasi.sayi;
                tas.renk = this.okeyTasi.renk;
                tas.isOkey = true;
            }
        });
        console.log(`GÖSTERGE: ${this.gosterge.renk} ${this.gosterge.sayi} -> OKEY: ${this.okeyTasi.renk} ${this.okeyTasi.sayi}`);
    }

    taslariDagit() {
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

    tasAt(oyuncuAdi, tasId) {
        if (this.oyuncular[this.siraKimdeIndex] !== oyuncuAdi) return false;
        const el = this.eller[oyuncuAdi];
        if (el.length % 3 !== 0) return false; // Elinde 15, 12, 9... taş yoksa atamaz
        
        const atilanTasIndex = el.findIndex(t => t.id === tasId);
        if (atilanTasIndex === -1) return false;

        const atilanTas = el.splice(atilanTasIndex, 1)[0];
        this.atilanTaslar[oyuncuAdi].push(atilanTas);
        this.sonAtilanTas = atilanTas;
        this.sirayiIlerlet();
        return atilanTas; // Atılan taşı geri döndür
    }

    sirayiIlerlet() {
        this.siraKimdeIndex = (this.siraKimdeIndex + 1) % 4;
    }

    getGameState() {
        return {
            oyuncular: this.oyuncular,
            siraKimde: this.oyuncular[this.siraKimdeIndex],
            atilanTaslar: this.atilanTaslar,
            gosterge: this.gosterge,
            okeyTasi: this.okeyTasi,
            ortaDesteSayisi: this.ortaDeste.length
        };
    }
}
module.exports = OkeyGame;