const sunucuAdresi = "https://okey-1.onrender.com";
const socket = io(sunucuAdresi);

const kullaniciAdi = prompt("Lütfen kullanıcı adınızı girin:");
if (kullaniciAdi && kullaniciAdi.trim() !== "") {
    socket.emit('yeniKullaniciGeldi', kullaniciAdi);
} else {
    alert("Kullanıcı adı girmelisiniz!");
    document.body.innerHTML = '<h1>Lütfen sayfayı yenileyip bir kullanıcı adı girin.</h1>';
}

// HTML Elementleri
const lobiEkrani = document.getElementById('lobi-ekrani');
const oyunOdasiEkrani = document.getElementById('oyun-odasi-ekrani');
const kullaniciListesiElementi = document.getElementById('online-kullanicilar-listesi');
const odaListesiElementi = document.getElementById('oda-listesi');
const odaAdiInput = document.getElementById('oda-adi-input');
const odaKurBtn = document.getElementById('oda-kur-btn');
const odaAdiBaslik = document.getElementById('oda-adi-baslik');
const benimIstakamElementi = document.getElementById('mevcut-oyuncu-istakasi');
const gostergeAlani = document.getElementById('gosterge-alani');

// Lobi Eventleri
odaKurBtn.addEventListener('click', () => {
    const odaAdi = odaAdiInput.value.trim();
    if (odaAdi) socket.emit('odaKur', odaAdi);
    odaAdiInput.value = '';
});

odaListesiElementi.addEventListener('click', (event) => {
    if (event.target.classList.contains('katil-btn')) {
        const odaAdi = event.target.dataset.odaAdi;
        socket.emit('odayaKatil', odaAdi);
    }
});

// Sunucu Mesajlarını Dinleme
socket.on('onlineKullaniciListesiGuncelle', (kullanicilar) => {
    kullaniciListesiElementi.innerHTML = '';
    kullanicilar.forEach(k => { const li = document.createElement('li'); li.textContent = k; kullaniciListesiElementi.appendChild(li); });
});

socket.on('odaListesiGuncelle', (guncelOdalar) => {
    odaListesiElementi.innerHTML = '';
    guncelOdalar.forEach(oda => {
        const li = document.createElement('li');
        const katilButonuHTML = oda.oyuncular.length >= 4 ? '<button disabled>Dolu</button>' : `<button class="katil-btn" data-oda-adi="${oda.adi}">Katıl</button>`;
        li.innerHTML = `<span>${oda.adi} (${oda.oyuncular.length}/4)</span>${katilButonuHTML}`;
        odaListesiElementi.appendChild(li);
    });
});

socket.on('katilimBasarili', () => {
    lobiEkrani.classList.add('hidden');
    oyunOdasiEkrani.classList.remove('hidden');
});

socket.on('odaBilgisiGuncelle', (oda) => {
    odaAdiBaslik.textContent = oda.adi;
    // Oyuncu alanlarını ID'lerine göre haritala
    const oyuncuAlanlari = {
        [oda.oyuncular[0]]: document.getElementById('oyuncu-1-alani'),
        [oda.oyuncular[1]]: document.getElementById('oyuncu-2-alani'),
        [oda.oyuncular[2]]: document.getElementById('oyuncu-3-alani'),
        [oda.oyuncular[3]]: document.getElementById('oyuncu-4-alani')
    };
    // Önce tüm alanları temizle
    document.querySelectorAll('.oyuncu-alani').forEach((alan, index) => {
        alan.textContent = `Oyuncu ${index + 1} Bekleniyor...`;
        alan.dataset.oyuncuAdi = "";
    });
    // Sonra dolu olanları yaz
    oda.oyuncular.forEach((oyuncu, index) => {
        const alan = document.getElementById(`oyuncu-${index + 1}-alani`);
        if (alan) {
            alan.textContent = oyuncu;
            alan.dataset.oyuncuAdi = oyuncu; // Sıra takibi için oyuncu adını elemente ekle
        }
    });
});

socket.on('oyunBasladi', (data) => {
    console.log("Oyun başladı!", data);
    istakayiCiz(data.el);
    gostergeyiCiz(data.gosterge);
    sirayiGuncelle(data.siraKimde);
});

socket.on('oyunBitti', (data) => {
    alert(data.mesaj);
    // Oyuncuyu lobiye geri döndür
    oyunOdasiEkrani.classList.add('hidden');
    lobiEkrani.classList.remove('hidden');
});

// Yardımcı Fonksiyonlar
function tasiElementeCevir(tas) {
    const tasElementi = document.createElement('div');
    tasElementi.classList.add('tas', `tas-${tas.renk}`);
    tasElementi.textContent = tas.sayi === 0 ? 'O' : tas.sayi; // Sahte okey için 'O' yaz
    tasElementi.dataset.id = tas.id;
    return tasElementi;
}

function istakayiCiz(el) {
    benimIstakamElementi.innerHTML = '';
    el.forEach(tas => {
        benimIstakamElementi.appendChild(tasiElementeCevir(tas));
    });
}

function gostergeyiCiz(gostergeTasi) {
    gostergeAlani.innerHTML = '';
    gostergeAlani.appendChild(tasiElementeCevir(gostergeTasi));
}

function sirayiGuncelle(oyuncuAdi) {
    // Önce tüm aktif sıra vurgularını kaldır
    document.querySelectorAll('.oyuncu-alani').forEach(alan => {
        alan.classList.remove('aktif-sira');
    });

    // Sırası gelen oyuncunun alanını bul ve vurgula
    const aktifOyuncuAlani = document.querySelector(`.oyuncu-alani[data-oyuncu-adi="${oyuncuAdi}"]`);
    if (aktifOyuncuAlani) {
        aktifOyuncuAlani.classList.add('aktif-sira');
    }
}