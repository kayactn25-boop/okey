const sunucuAdresi = "https://okey-1.onrender.com";
const socket = io(sunucuAdresi);

let benimKullaniciAdim = "";
let benimElim = [];
let mevcutOyunDurumu = null;

// HTML Elementleri
const lobiEkrani = document.getElementById('lobi-ekrani');
const oyunOdasiEkrani = document.getElementById('oyun-odasi-ekrani');
// ... Diğer lobi elementleri

// Başlangıç
benimKullaniciAdim = prompt("Lütfen kullanıcı adınızı girin:");
if (benimKullaniciAdim && benimKullaniciAdim.trim() !== "") {
    socket.emit('yeniKullaniciGeldi', benimKullaniciAdim);
} else {
    window.location.reload();
}

// Sunucu Mesajları
socket.on('katilimBasarili', () => {
    lobiEkrani.classList.add('hidden');
    oyunOdasiEkrani.classList.remove('hidden');
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
});

socket.on('tasCekildi', (cekilenTas) => {
    benimElim.push(cekilenTas);
    istakayiCiz(false);
});

socket.on('oyunDurumuGuncelle', (gameState) => {
    mevcutOyunDurumu = gameState;
    oyunDurumunuCiz(gameState);
});

socket.on('logGuncelle', (mesaj) => {
    const logListesi = document.getElementById('log-listesi');
    const li = document.createElement('li');
    li.textContent = `> ${mesaj}`;
    logListesi.prepend(li);
});

// Olay Dinleyicileri
document.getElementById('orta-deste').addEventListener('click', () => {
    if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === benimKullaniciAdim && benimElim.length % 3 !== 0) {
        socket.emit('ortadanCek');
    }
});

// Yardımcı Fonksiyonlar
function oyunDurumunuCiz(gameState) {
    document.querySelectorAll('.oyuncu-kutusu').forEach(kutu => kutu.classList.remove('aktif-sira'));
    const aktifKutu = document.getElementById(`oyuncu-kutusu-${gameState.siraKimde}`);
    if (aktifKutu) aktifKutu.classList.add('aktif-sira');

    document.getElementById('gosterge-alani').innerHTML = '';
    document.getElementById('gosterge-alani').appendChild(tasiElementeCevir(gameState.gosterge));
    document.getElementById('orta-deste-sayisi').textContent = gameState.ortaDesteSayisi;

    // Atılan taşları çiz (Basit haliyle)
    document.querySelectorAll('.yan-deste').forEach(d => d.innerHTML = '');
    gameState.oyuncular.forEach((oyuncu, index) => {
        const desteAlani = document.getElementById(`deste-alani-${index + 1}`);
        if (desteAlani && gameState.atilanTaslar[oyuncu] && gameState.atilanTaslar[oyuncu].length > 0) {
            const sonTas = gameState.atilanTaslar[oyuncu].slice(-1)[0];
            desteAlani.appendChild(tasiElementeCevir(sonTas));
        }
    });
}

function istakayiCiz(sirala = false) {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    if (sirala) {
        const renkSiralama = { 'sari': 1, 'mavi': 2, 'siyah': 3, 'kirmizi': 4 };
        benimElim.sort((a, b) => {
            if (a.isOkey) return -1; if (b.isOkey) return 1;
            if (renkSiralama[a.renk] < renkSiralama[b.renk]) return -1;
            if (renkSiralama[a.renk] > renkSiralama[b.renk]) return 1;
            return a.sayi - b.sayi;
        });
    }

    istakaElementi.innerHTML = '';
    benimElim.forEach(tas => {
        const tasElementi = tasiElementeCevir(tas);
        tasElementi.addEventListener('click', () => {
            if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === benimKullaniciAdim && benimElim.length % 3 === 0) {
                socket.emit('tasAt', tas.id);
                benimElim = benimElim.filter(t => t.id !== tas.id);
                istakayiCiz(false);
            }
        });
        istakaElementi.appendChild(tasElementi);
    });
}

function tasiElementeCevir(tas) {
    const tasElementi = document.createElement('div');
    tasElementi.className = `tas tas-${tas.renk}`;
    tasElementi.textContent = tas.isOkey ? 'OK' : tas.sayi;
    if (tas.isOkey) tasElementi.classList.add('okey-tasi');
    return tasElementi;
}
// Lobi fonksiyonları (odaListesiGuncelle vb.) buraya eklenecek