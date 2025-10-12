const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr"];
app.use(cors({ origin: allowedOrigins }));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

let onlineKullanicilar = {};
let odalar = {};

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
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) return;

        odalar[odaAdi] = {
            adi: odaAdi,
            oyuncular: [], // Odayı kuran kişi de katılmak için butona basmalı
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

        socket.join(odaAdi);
        
        oda.oyuncular.push(oyuncuAdi);
        console.log(`👍 ${oyuncuAdi}, '${odaAdi}' odasına katıldı.`);
        
        socket.emit('katilimBasarili', oda);
        io.to(odaAdi).emit('odaBilgisiGuncelle', oda);
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (ayrilanKullanici) {
            console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici}`);
            delete onlineKullanicilar[socket.id];
            io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));

            // Not: Kullanıcıyı odadan çıkarma mantığı eklenecek.
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});