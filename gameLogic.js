class OkeyGame {
    constructor(oyuncular) {
        this.oyuncular = oyuncular;
        this.deste = this.desteOlusturVeKaristir();
        this.eller = {};
        this.gosterge = null;
        this.okeyTasi = null;
        this.siraKimdeIndex = 0;
        this.ortaDeste = [];
    }

    desteOlusturVeKaristir() {
        const renkler = ['sari', 'mavi', 'siyah', 'kirmizi'];
        let deste = [];
        renkler.forEach(renk => {
            for (let i = 1; i <= 13; i++) {
                deste.push({ renk, sayi: i, id: `${renk}-${i}-1` });
                deste.push({ renk, sayi: i, id: `${renk}-${i}-2` });
            }
        });
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-1' });
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-2' });
        
        for (let i = deste.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deste[i], deste[j]] = [deste[j], deste[i]];
        }
        return deste;
    }

    okeyBelirle() {
        // Normal bir taş bulana kadar desteden çek
        let gostergeAdayi = null;
        let denemeIndex = 0;
        do {
            gostergeAdayi = this.deste[denemeIndex];
            denemeIndex++;
        } while (gostergeAdayi.renk === 'sahte');
        
        this.gosterge = gostergeAdayi;

        let okeySayi = this.gosterge.sayi + 1;
        let okeyRenk = this.gosterge.renk;

        if (okeySayi > 13) {
            okeySayi = 1;
        }
        
        this.okeyTasi = { renk: okeyRenk, sayi: okeySayi };
        console.log(`GÖSTERGE: ${this.gosterge.renk} ${this.gosterge.sayi} -> OKEY: ${this.okeyTasi.renk} ${this.okeyTasi.sayi}`);
    }

    taslariDagit() {
        this.okeyBelirle();

        this.siraKimdeIndex = Math.floor(Math.random() * 4);
        const baslangicOyuncusu = this.oyuncular[this.siraKimdeIndex];
        console.log(`İlk oyuncu (${this.siraKimdeIndex}): ${baslangicOyuncusu}`);

        this.oyuncular.forEach(oyuncu => {
            const tasSayisi = (oyuncu === baslangicOyuncusu) ? 15 : 14;
            this.eller[oyuncu] = this.deste.splice(0, tasSayisi);
        });

        // Kalan taşları orta desteye ata
        this.ortaDeste = this.deste;
        console.log('Taşlar dağıtıldı. Ortada kalan taş:', this.ortaDeste.length);
    }
}

module.exports = OkeyGame;