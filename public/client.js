const sunucuAdresi = "https://okey-1.onrender.com";
const socket = io(sunucuAdresi);

const kullaniciAdi = prompt("Lütfen kullanıcı adınızı girin:");
if (kullaniciAdi && kullaniciAdi.trim() !== "") {
    socket.emit('yeniKullaniciGeldi', kullaniciAdi);
} else {
    alert("Lobiye katılmak için bir kullanıcı adı girmelisiniz!");
    document.body.innerHTML = '<h1>Lütfen sayfayı yenileyip bir kullanıcı adı girin.</h1>';
}

// HTML Elementlerini Seçme
const lobiEkrani = document.getElementById('lobi-ekrani');
const oyunOdasiEkrani = document.getElementById('oyun-odasi-ekrani');
const kullaniciListesiElementi = document.getElementById('online-kullanicilar-listesi');
const odaListesiElementi = document.getElementById('oda-listesi');
const odaAdiInput = document.getElementById('oda-adi-input');
const odaKurBtn = document.getElementById('oda-kur-btn');
const odaAdiBaslik = document.getElementById('oda-adi-baslik');
const benimIstakamElementi = document.getElementById('mevcut-oyuncu-istakasi');

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

// Sunucudan Gelen Mesajları Dinleme
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

socket.on('katilimBasarili', (oda) => {
    lobiEkrani.classList.add('hidden');
    oyunOdasiEkrani.classList.remove('hidden');
});

socket.on('odaBilgisiGuncelle', (oda) => {
    odaAdiBaslik.textContent = oda.adi;
    const oyuncuAlanlari = [document.getElementById('oyuncu-1'), document.getElementById('oyuncu-2'), document.getElementById('oyuncu-3'), document.getElementById('oyuncu-4')];
    oyuncuAlanlari.forEach((alan, index) => {
        alan.textContent = oda.oyuncular[index] ? oda.oyuncular[index] : `Oyuncu ${index + 1} Bekleniyor...`;
    });
});

// OYUN BAŞLADIĞINDA ÇALIŞACAK YENİ OLAY DİNLEYİCİ
socket.on('oyunBasladi', (data) => {
    console.log("Oyun başladı! İşte eliniz:", data.el);
    document.getElementById('orta-desteler').textContent = 'Oyun Başladı!';
    istakayiCiz(data.el);
});

// Gelen taşları alıp ekrandaki ıstakaya çizen fonksiyon
function istakayiCiz(el) {
    benimIstakamElementi.innerHTML = ''; // Istakayı temizle
    el.forEach(tas => {
        const tasElementi = document.createElement('div');
        tasElementi.classList.add('tas', `tas-${tas.renk}`);
        tasElementi.textContent = tas.sayi;
        tasElementi.dataset.id = tas.id; // Taşa kimlik ver
        benimIstakamElementi.appendChild(tasElementi);
    });
}