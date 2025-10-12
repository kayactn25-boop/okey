// ==================================================================
// 1. GEREKLİ MODÜLLERİN YÜKLENMESİ
// ==================================================================
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// ==================================================================
// 2. SUNUCU VE UYGULAMA KURULUMU
// ==================================================================
const app = express();
const server = http.createServer(app);

// ==================================================================
// 3. GÜVENLİK (CORS) AYARLARI
// ==================================================================
const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr"];
app.use(cors({ origin: allowedOrigins }));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// ==================================================================
// 4. STATİK DOSYA SERVİSİ (MIDDLEWARE)
// ==================================================================
app.use(express.static('public'));

// ==================================================================
// 5. UYGULAMA GENELİ DEĞİŞKENLER (STATE)
// ==================================================================
let onlineKullanicilar = {}; // { socketId: 'kullaniciAdi', ... }
let odalar = {};             // { odaAdi: { adi, oyuncular, kurucu }, ... }

// ==================================================================
// 6. SOCKET.IO BAĞLANTI MANTIĞI
// ==================================================================
io.on('connection', (socket) => {
    console.log(`✅ Bir kullanıcı bağlandı: ${socket.id}`);

    socket.emit('odaListesiGuncelle', Object.values(odalar));

    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        onlineKullanicilar[socket.id] = kullaniciAdi;
        console.log(`-> ${kullaniciAdi} lobiye katıldı.`);
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) {
            console.log(`⚠️ Geçersiz oda kurma denemesi. Kurucu: ${kurucuAdi}, Oda Adı: ${odaAdi}`);
            return;
        }

        odalar[odaAdi] = {
            adi: odaAdi,
            oyuncular: [kurucuAdi],
            kurucu: kurucuAdi
        };
        console.log(`🏠 Yeni oda kuruldu: '${odaAdi}' - Kurucu: ${kurucuAdi}`);
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('odayaKatil', (odaAdi) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = odalar[odaAdi];

        if (!oyuncuAdi || !oda) return;
        if (oda.oyuncular.length >= 4 || oda.oyuncular.includes(oyuncuAdi)) return;

        oda.oyuncular.push(oyuncuAdi);
        console.log(`👍 ${oyuncuAdi}, '${odaAdi}' odasına katıldı. Oyuncu sayısı: ${oda.oyuncular.length}`);
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (ayrilanKullanici) {
            console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici}`);
            delete onlineKullanicilar[socket.id];
            io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));

            // İLERİDE: Kullanıcıyı odadan çıkarma mantığı buraya eklenecek.
            // Örneğin: Hangi odada olduğunu bulup, odadan silip, listeyi güncellemek.
        }
    });
});

// ==================================================================
// 7. SUNUCUYU BAŞLATMA
// ==================================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});