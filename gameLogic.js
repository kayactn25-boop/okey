// Okey oyununun durumunu ve kurallarını yöneten sınıf
class OkeyGame {
    constructor(oyuncular) {
        this.oyuncular = oyuncular; // ['Ali', 'Veli', 'Ayşe', 'Fatma']
        this.deste = this.desteOlustur();
        this.eller = {}; // { 'Ali': [...], 'Veli': [...] }
        this.gosterge = null;
        this.okeyTasi = null;
        this.siraKimde = 0; // Oyuncular dizisindeki index
    }

    // 106 adet okey taşını oluşturan ve karıştıran fonksiyon
    desteOlustur() {
        const renkler = ['sari', 'mavi', 'siyah', 'kirmizi'];
        let deste = [];
        // 1'den 13'e kadar renkli taşları oluştur (her birinden 2'şer adet)
        renkler.forEach(renk => {
            for (let i = 1; i <= 13; i++) {
                deste.push({ renk: renk, sayi: i, id: `${renk}-${i}-1` });
                deste.push({ renk: renk, sayi: i, id: `${renk}-${i}-2` });
            }
        });
        // 2 adet sahte okeyi ekle
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-1' });
        deste.push({ renk: 'sahte', sayi: 0, id: 'sahte-okey-2' });
        
        console.log('Deste oluşturuldu. Toplam taş sayısı:', deste.length);
        
        return this.desteKaristir(deste);
    }

    // Fisher-Yates (Knuth) Karıştırma Algoritması
    desteKaristir(deste) {
        letcurrentIndex = deste.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [deste[currentIndex], deste[randomIndex]] = [deste[randomIndex], deste[currentIndex]];
        }
        console.log('Deste karıştırıldı.');
        return deste;
    }

    // Oyunculara taşları dağıtan fonksiyon
    taslariDagit() {
        // Rastgele bir başlangıç oyuncusu seç
        this.siraKimde = Math.floor(Math.random() * 4);
        const baslangicOyuncusu = this.oyuncular[this.siraKimde];
        console.log(`Oyun başlıyor. İlk oyuncu: ${baslangicOyuncusu}`);

        this.oyuncular.forEach(oyuncu => {
            const tasSayisi = (oyuncu === baslangicOyuncusu) ? 15 : 14;
            this.eller[oyuncu] = []; // Oyuncunun elini boşalt
            for (let i = 0; i < tasSayisi; i++) {
                this.eller[oyuncu].push(this.deste.pop());
            }
        });
        console.log('Taşlar dağıtıldı.');
        return this.eller;
    }
}

// Bu sınıfı server.js'de kullanabilmek için export ediyoruz
module.exports = OkeyGame;