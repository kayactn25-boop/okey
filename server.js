const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const OkeyGame = require('./gameLogic.js');

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr"];
app.use(cors({ origin: allowedOrigins }));
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ["GET", "POST"] } });

app.use(express.static('public'));

let onlineKullanicilar = {};
let odalar = {};
let kullaniciSocketMap = {}; // { 'kullaniciAdi': socket.id }

io.on('connection', (socket) => {
    console.log(`✅ Bağlantı: ${socket.id}`);
    socket.emit('odaListesiGuncelle', Object.values(odalar));

    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        onlineKullanicilar[socket.id] = kullaniciAdi;
        kullaniciSocketMap[kullaniciAdi] = socket.id;
        console.log(`-> ${kullaniciAdi} lobiye katıldı.`);
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) return;
        odalar[odaAdi] = { adi: odaAdi, oyuncular: [], kurucu: kurucuAdi, oyunDurumu: null };
        console.log(`🏠 Yeni oda kuruldu: '${odaAdi}'`);
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('odayaKatil', (odaAdi) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = odalar[odaAdi];

        if (!oyuncuAdi || !oda || oda.oyuncular.length >= 4 || oda.oyuncular.includes(oyuncuAdi)) return;

        socket.join(odaAdi);
        oda.oyuncular.push(oyuncuAdi);
        console.log(`👍 ${oyuncuAdi}, '${odaAdi}' odasına katıldı. Oyuncu: ${oda.oyuncular.length}/4`);
        
        socket.emit('katilimBasarili', oda);
        io.to(odaAdi).emit('odaBilgisiGuncelle', oda);
        io.emit('odaListesiGuncelle', Object.values(odalar));

        if (oda.oyuncular.length === 4) {
            oyunuBaslat(odaAdi);
        }
    });

    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (!ayrilanKullanici) return;

        console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici}`);
        delete onlineKullanicilar[socket.id];
        delete kullaniciSocketMap[ayrilanKullanici];
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));

        // Oyuncunun bulunduğu odayı bul ve işlem yap
        for (const odaAdi in odalar) {
            const oda = odalar[odaAdi];
            const oyuncuIndex = oda.oyuncular.indexOf(ayrilanKullanici);
            if (oyuncuIndex > -1) {
                console.log(`-- ${ayrilanKullanici}, '${odaAdi}' odasından ayrılıyor.`);
                // Eğer oyun başlamışsa, herkese oyunun bittiğini söyle ve odayı sil
                if (oda.oyunDurumu) {
                    io.to(odaAdi).emit('oyunBitti', { mesaj: `${ayrilanKullanici} oyundan ayrıldığı için oyun bitti.` });
                    delete odalar[odaAdi];
                } else {
                    // Oyun başlamamışsa, sadece oyuncuyu listeden çıkar
                    oda.oyuncular.splice(oyuncuIndex, 1);
                    io.to(odaAdi).emit('odaBilgisiGuncelle', oda);
                }
                io.emit('odaListesiGuncelle', Object.values(odalar));
                break;
            }
        }
    });
});

function oyunuBaslat(odaAdi) {
    const oda = odalar[odaAdi];
    if (!oda || oda.oyuncular.length !== 4) return;

    console.log(`🚀 '${odaAdi}' odasında oyun başlıyor!`);
    const oyun = new OkeyGame(oda.oyuncular);
    oyun.taslariDagit();
    oda.oyunDurumu = oyun;

    const baslangicOyuncusu = oyun.oyuncular[oyun.siraKimdeIndex];

    oda.oyuncular.forEach(oyuncuAdi => {
        const oyuncuSocketId = kullaniciSocketMap[oyuncuAdi];
        if (oyuncuSocketId) {
            io.to(oyuncuSocketId).emit('oyunBasladi', {
                el: oyun.eller[oyuncuAdi],
                gosterge: oyun.gosterge,
                okeyTasi: oyun.okeyTasi,
                siraKimde: baslangicOyuncusu
            });
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});