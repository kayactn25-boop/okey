// Sunucunun canlı adresi. Burası çok önemli!
const sunucuAdresi = "https://okey-1.onrender.com";
const socket = io(sunucuAdresi);

// Kullanıcıdan bir isim alıyoruz
const kullaniciAdi = prompt("Lütfen kullanıcı adınızı girin:");

if (kullaniciAdi && kullaniciAdi.trim() !== "") {
    socket.emit('yeniKullaniciGeldi', kullaniciAdi);
} else {
    alert("Lobiye katılmak için bir kullanıcı adı girmelisiniz!");
    document.body.innerHTML = '<h1>Lütfen sayfayı yenileyip bir kullanıcı adı girin.</h1>';
}

// Gerekli HTML elementlerini seçiyoruz
const kullaniciListesiElementi = document.getElementById('online-kullanicilar-listesi');
const odaListesiElementi = document.getElementById('oda-listesi');
const odaAdiInput = document.getElementById('oda-adi-input');
const odaKurBtn = document.getElementById('oda-kur-btn');

// "Oda Kur" butonuna tıklandığında
odaKurBtn.addEventListener('click', () => {
    const odaAdi = odaAdiInput.value.trim();
    if (odaAdi) {
        socket.emit('odaKur', odaAdi); // Sunucuya 'odaKur' olayını, oda adıyla birlikte gönder
        odaAdiInput.value = ''; // Input'u temizle
    }
});

// Sunucudan gelen online kullanıcı listesini ekrana yazdır
socket.on('onlineKullaniciListesiGuncelle', (kullanicilar) => {
    kullaniciListesiElementi.innerHTML = '';
    kullanicilar.forEach(kullanici => {
        const li = document.createElement('li');
        li.textContent = kullanici;
        kullaniciListesiElementi.appendChild(li);
    });
});

// Sunucudan gelen oda listesini ekrana yazdır
socket.on('odaListesiGuncelle', (guncelOdalar) => {
    odaListesiElementi.innerHTML = '';
    guncelOdalar.forEach(oda => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${oda.adi} (${oda.oyuncular.length}/4)</span>
            <button class="katil-btn" data-oda-adi="${oda.adi}">Katıl</button>
        `;
        odaListesiElementi.appendChild(li);
    });
});