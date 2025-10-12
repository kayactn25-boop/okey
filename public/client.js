const sunucuAdresi = "https://okey-1.onrender.com";
const socket = io(sunucuAdresi);

let benimKullaniciAdim = "";
let benimElim = [];
let mevcutOyunDurumu = null;
let sortableIstaka = null;

const sesler = {
    cek: document.getElementById('ses-cek'),
    at: document.getElementById('ses-at'),
    kazan: document.getElementById('ses-kazan')
};

// HTML Elementleri
const girisEkrani = document.getElementById('giris-ekrani');
const lobiEkrani = document.getElementById('lobi-ekrani');
const oyunOdasiEkrani = document.getElementById('oyun-odasi-ekrani');
const odaListesiElementi = document.getElementById('oda-listesi');
const onlineKullanicilarListesi = document.getElementById('online-kullanicilar-listesi');
const odaKurBtn = document.getElementById('oda-kur-btn');
const odaAdiInput = document.getElementById('oda-adi-input');
const kullaniciAdiInput = document.getElementById('kullanici-adi-input');
const lobiyeKatilBtn = document.getElementById('lobiye-katil-btn');

// GİRİŞ EKRANI MANTIĞI
lobiyeKatilBtn.addEventListener('click', lobiyeKatil);
kullaniciAdiInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') lobiyeKatil(); });

function lobiyeKatil() {
    const kullaniciAdi = kullaniciAdiInput.value.trim();
    if (kullaniciAdi && kullaniciAdi.length > 2) {
        benimKullaniciAdim = kullaniciAdi;
        socket.emit('yeniKullaniciGeldi', benimKullaniciAdim);
        girisEkrani.classList.add('hidden');
        lobiEkrani.classList.remove('hidden');
    } else {
        showToast({ tur: 'hata', mesaj: 'Lütfen en az 3 karakterli bir isim girin.' });
    }
}

// Lobi Eventleri
odaKurBtn.addEventListener('click', () => {
    const odaAdi = odaAdiInput.value.trim();
    if (odaAdi) socket.emit('odaKur', odaAdi);
    odaAdiInput.value = '';
});

odaListesiElementi.addEventListener('click', (event) => {
    if (event.target.classList.contains('katil-btn')) {
        socket.emit('odayaKatil', event.target.dataset.odaAdi);
    }
});

// Sunucu Mesajları
socket.on('odaListesiGuncelle', (guncelOdalar) => {
    odaListesiElementi.innerHTML = '';
    guncelOdalar.forEach(oda => {
        const li = document.createElement('li');
        const katilButonuHTML = oda.oyuncular.length >= 4 ? '<button disabled>Dolu</button>' : `<button class="katil-btn" data-oda-adi="${oda.adi}">Katıl</button>`;
        li.innerHTML = `<span>${oda.adi} (${oda.oyuncular.length}/4)</span>${katilButonuHTML}`;
        odaListesiElementi.appendChild(li);
    });
});

socket.on('onlineKullaniciListesiGuncelle', (kullanicilar) => {
    onlineKullanicilarListesi.innerHTML = '';
    kullanicilar.forEach(k => { const li = document.createElement('li'); li.textContent = k; onlineKullanicilarListesi.appendChild(li); });
});

socket.on('katilimBasarili', () => {
    lobiEkrani.classList.add('hidden');
    oyunOdasiEkrani.classList.remove('hidden');
    oyunArayuzuOlaylariniBaslat();
});

socket.on('odaBilgisiGuncelle', (data) => {
    const panel = document.getElementById('oyuncu-listesi-panel');
    panel.innerHTML = '';
    data.oyuncular.forEach(oyuncu => {
        const div = document.createElement('div');
        div.className = 'oyuncu-kutusu';
        div.id = `oyuncu-kutusu-${oyuncu}`;
        div.innerHTML = `<div class="oyuncu-avatar"></div><span class="oyuncu-ismi">${oyuncu}</span>`;
        panel.appendChild(div);
    });
    document.getElementById('oda-adi-baslik').textContent = data.odaAdi;
});

socket.on('oyunBasladi', (data) => {
    benimElim = data.el;
    mevcutOyunDurumu = data.gameState;
    oyunDurumunuCiz(data.gameState);
    istakayiCiz(true);
    istakayiEtkilesimliYap();
});

socket.on('tasCekildi', (cekilenTas) => {
    benimElim.push(cekilenTas);
    istakayiCiz(false);
    sesler.cek.play();
});

socket.on('oyunDurumuGuncelle', (gameState) => {
    const siraBendeMiydi = mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === benimKullaniciAdim;
    mevcutOyunDurumu = gameState;
    oyunDurumunuCiz(gameState);
    const siraSimdiBendeMi = gameState.siraKimde === benimKullaniciAdim;
    if (siraSimdiBendeMi && !siraBendeMiydi) {
        showToast({ tur: 'bilgi', mesaj: 'Sıra sizde!' });
    }
    if(!siraBendeMiydi && !siraSimdiBendeMi){
         sesler.at.play();
    }
});

socket.on('logGuncelle', (mesaj) => {
    const logListesi = document.getElementById('log-listesi');
    const li = document.createElement('li');
li.innerHTML = `&rarr; ${mesaj}`;
    logListesi.prepend(li);
});

socket.on('oyunBitti', (data) => {
    document.getElementById('kazanan-bilgisi').textContent = data.kazanan ? `${data.kazanan} Kazandı!` : "Oyun Bitti!";
    document.getElementById('bitis-mesaji').textContent = data.mesaj;
    const kazananElAlani = document.getElementById('kazanan-el');
    kazananElAlani.innerHTML = '';
    data.kazananEl.forEach(tas => kazananElAlani.appendChild(tasiElementeCevir(tas, false)));
    document.getElementById('oyun-bitti-modal').classList.remove('hidden');
    sesler.kazan.play();
});

socket.on('yeniMesaj', (data) => {
    const mesajListesi = document.getElementById('sohbet-mesajlari');
    const li = document.createElement('li');
    li.innerHTML = `<span class="mesaj-gonderen" style="color: ${renkUret(data.gonderen)};">${data.gonderen}:</span> ${data.icerik}`;
    mesajListesi.appendChild(li);
    mesajListesi.scrollTop = mesajListesi.scrollHeight;
});

socket.on('toastBildirimi', showToast);

function oyunArayuzuOlaylariniBaslat() {
    document.getElementById('orta-deste').addEventListener('click', () => {
        if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === benimKullaniciAdim && benimElim.length % 3 !== 0) {
            socket.emit('ortadanCek');
        }
    });
    document.getElementById('ana-oyun-alani').addEventListener('click', (event) => {
        const hedef = event.target.closest('.yan-deste');
        if (hedef && hedef.classList.contains('aktif-hedef') && mevcutOyunDurumu.siraKimde === benimKullaniciAdim && benimElim.length % 3 !== 0) {
            socket.emit('yandanCek');
        }
    });
    document.getElementById('sohbet-gonder-btn').addEventListener('click', mesajGonder);
    document.getElementById('sohbet-input').addEventListener('keyup', (e) => { if (e.key === 'Enter') mesajGonder(); });
    document.getElementById('bit-btn').addEventListener('click', bitmeIstegiGonder);
    document.getElementById('lobiye-don-btn').addEventListener('click', () => window.location.reload());
}

function oyunDurumunuCiz(gameState) {
    document.querySelectorAll('.oyuncu-kutusu').forEach(kutu => kutu.classList.remove('aktif-sira'));
    const aktifKutu = document.getElementById(`oyuncu-kutusu-${gameState.siraKimde}`);
    if (aktifKutu) aktifKutu.classList.add('aktif-sira');

    document.getElementById('gosterge-alani').innerHTML = '';
    document.getElementById('gosterge-alani').appendChild(tasiElementeCevir(gameState.gosterge, false));
    document.getElementById('orta-deste-sayisi').textContent = gameState.ortaDesteSayisi;
    
    document.querySelectorAll('.yan-deste').forEach(d => {
        d.innerHTML = '';
        d.classList.remove('aktif-hedef');
    });

    const benimIndexim = gameState.oyuncular.indexOf(benimKullaniciAdim);
    const pozisyonMap = ['benim', 'sag', 'ust', 'sol'];

    gameState.oyuncular.forEach((oyuncu, index) => {
        const atilanlar = gameState.atilanTaslar[oyuncu];
        if (atilanlar && atilanlar.length > 0) {
            const oyuncuPozisyonu = (index - benimIndexim + 4) % 4;
            const desteAlani = document.getElementById(`deste-alani-${pozisyonMap[oyuncuPozisyonu]}`);
            if(desteAlani){
                const sonTas = atilanlar.slice(-1)[0];
                desteAlani.appendChild(tasiElementeCevir(sonTas, false));
            }
        }
    });

    const oncekiOyuncuIndex = (gameState.oyuncular.indexOf(gameState.siraKimde) + 3) % 4;
    if (gameState.sonAtilanTas) {
         const oncekiOyuncuPozisyonu = (oncekiOyuncuIndex - benimIndexim + 4) % 4;
         const desteAlani = document.getElementById(`deste-alani-${pozisyonMap[oncekiOyuncuPozisyonu]}`);
         if(desteAlani) desteAlani.classList.add('aktif-hedef');
    }
}

function istakayiCiz(sirala = false) {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    if (sirala) {
        const renkSiralama = { 'sari': 1, 'mavi': 2, 'siyah': 3, 'kirmizi': 4 };
        benimElim.sort((a, b) => {
            if (a.isOkey && !b.isOkey) return -1; if (!a.isOkey && b.isOkey) return 1;
            if (renkSiralama[a.renk] < renkSiralama[b.renk]) return -1;
            if (renkSiralama[a.renk] > renkSiralama[b.renk]) return 1;
            return a.sayi - b.sayi;
        });
    }
    istakaElementi.innerHTML = '';
    benimElim.forEach(tas => {
        const tasElementi = tasiElementeCevir(tas, true);
        tasElementi.dataset.id = tas.id;
        istakaElementi.appendChild(tasElementi);
    });
    document.getElementById('bit-btn').classList.toggle('hidden', benimElim.length !== 14);
}

function istakayiEtkilesimliYap() {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    if (sortableIstaka) sortableIstaka.destroy();
    sortableIstaka = new Sortable(istakaElementi, {
        animation: 150,
        onEnd: () => {
            const guncelSira = Array.from(istakaElementi.children).map(el => el.dataset.id);
            benimElim.sort((a, b) => guncelSira.indexOf(a.id) - guncelSira.indexOf(b.id));
        }
    });
}

function tasiElementeCevir(tas, tıklanabilir) {
    const el = document.createElement('div');
    el.className = `tas tas-${tas.renk}`;
    if (tas.isOkey) el.classList.add('okey-tasi');
    el.innerHTML = `<span>${tas.sayi === 0 ? (tas.isOkey ? 'OK' : 'S') : tas.sayi}</span>`;
    if (tıklanabilir) {
        el.addEventListener('click', () => {
            if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === benimKullaniciAdim && benimElim.length % 3 === 0) {
                sesler.at.play();
                socket.emit('tasAt', tas.id);
                benimElim = benimElim.filter(t => t.id !== tas.id);
                istakayiCiz(false);
            }
        });
    }
    return el;
}

function mesajGonder() {
    const input = document.getElementById('sohbet-input');
    if(input.value.trim() !== ''){
        socket.emit('mesajGonder', input.value);
        input.value = '';
    }
}

function bitmeIstegiGonder() {
    if (benimElim.length === 14) {
        socket.emit('bitmeIstegi', benimElim);
    }
}

function showToast(data) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${data.tur || 'bilgi'}`;
    toast.textContent = data.mesaj;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function renkUret(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}