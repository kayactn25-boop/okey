const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const OkeyGame = require('./gameLogic.js'); // Yeni oyun mantığı dosyamızı dahil ediyoruz

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr"];
app.use(cors({ origin: allowedOrigins }));

const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

app.use(express.static('public'));

let onlineKullanicilar = {};
let odalar = {};

// Sunucu tarafında oyuncuların socket.id'lerini bulmak için yardımcı bir nesne
let kullaniciSocketMap = {}; // { 'kullaniciAdi': socket.id }

io.on('connection', (socket) => {
    console.log(`✅ Bir kullanıcı bağlandı: ${socket.id}`);
    socket.emit('odaListesiGuncelle', Object.values(odalar));

    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        onlineKullanicilar[socket.id] = kullaniciAdi;
        kullaniciSocketMap[kullaniciAdi] = socket.id; // Kullanıcı adı ile socket.id'yi eşleştir
        console.log(`-> ${kullaniciAdi} lobiye katıldı.`);
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) return;
        odalar[odaAdi] = {
            adi: odaAdi,
            oyuncular: [],
            kurucu: kurucuAdi,
            oyunDurumu: null // Oyun başladığında buraya oyun nesnesi gelecek
        };
        console.log(`🏠 Yeni oda kuruldu: '${odaAdi}'`);
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('odayaKatil', (odaAdi) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = odalar[odaAdi];

        if (!oyuncuAdi || !oda || oda.oyuncular.length >= 4 || oda.oyuncular.includes(oyuncuAdi)) return;

        socket.join(odaAdi);
        oda.oyuncular.push(oyuncuAdi);
        console.log(`👍 ${oyuncuAdi}, '${odaAdi}' odasına katıldı. Oyuncu sayısı: ${oda.oyuncular.length}`);

        socket.emit('katilimBasarili', oda);
        io.to(odaAdi).emit('odaBilgisiGuncelle', oda);
        io.emit('odaListesiGuncelle', Object.values(odalar));

        // EĞER ODA DOLDUYSA, OYUNU BAŞLAT!
        if (oda.oyuncular.length === 4) {
            oyunuBaslat(odaAdi);
        }
    });

    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (ayrilanKullanici) {
            console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici}`);
            delete onlineKullanicilar[socket.id];
            delete kullaniciSocketMap[ayrilanKullanici];
            io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
        }
    });
});

function oyunuBaslat(odaAdi) {
    const oda = odalar[odaAdi];
    if (!oda || oda.oyuncular.length !== 4) return;

    console.log(`🚀 '${odaAdi}' odasında oyun başlıyor!`);
    
    // 1. Yeni bir oyun nesnesi oluştur
    const oyun = new OkeyGame(oda.oyuncular);
    oda.oyunDurumu = oyun;

    // 2. Taşları dağıt
    const dagitilanEller = oyun.taslariDagit();

    // 3. Her oyuncuya SADECE KENDİ elini özel olarak gönder
    oda.oyuncular.forEach(oyuncuAdi => {
        const oyuncuSocketId = kullaniciSocketMap[oyuncuAdi];
        if (oyuncuSocketId) {
            const oyuncununEli = dagitilanEller[oyuncuAdi];
            io.to(oyuncuSocketId).emit('oyunBasladi', { el: oyuncununEli });
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});