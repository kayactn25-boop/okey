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
let kullaniciSocketMap = {};

io.on('connection', (socket) => {
    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        onlineKullanicilar[socket.id] = kullaniciAdi;
        kullaniciSocketMap[kullaniciAdi] = socket.id;
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });
    
    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) return;
        odalar[odaAdi] = { adi: odaAdi, oyuncular: [], kurucu: kurucuAdi, oyunDurumu: null };
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('odayaKatil', (odaAdi) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = odalar[odaAdi];
        if (!oyuncuAdi || !oda || oda.oyuncular.length >= 4 || oda.oyuncular.includes(oyuncuAdi)) return;
        socket.join(odaAdi);
        oda.oyuncular.push(oyuncuAdi);
        socket.emit('katilimBasarili', oda);
        io.to(odaAdi).emit('odaBilgisiGuncelle', { oyuncular: oda.oyuncular, odaAdi: oda.adi });
        io.emit('odaListesiGuncelle', Object.values(odalar));
        if (oda.oyuncular.length === 4) oyunuBaslat(odaAdi);
    });

    socket.on('ortadanCek', () => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyunDurumu) {
            const cekilenTas = oda.oyunDurumu.ortadanCek(oyuncuAdi);
            if (cekilenTas) {
                socket.emit('tasCekildi', cekilenTas);
                io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyunDurumu.getGameState());
                io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi} ortadan bir taş çekti.`);
            }
        }
    });

    socket.on('tasAt', (tasId) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyunDurumu) {
            const atilanTas = oda.oyunDurumu.tasAt(oyuncuAdi, tasId);
            if (atilanTas) {
                const sonrakiOyuncu = oda.oyunDurumu.oyuncular[oda.oyunDurumu.siraKimdeIndex];
                io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyunDurumu.getGameState());
                io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi}, ${atilanTas.renk} ${atilanTas.sayi} attı. Sıra ${sonrakiOyuncu}'da.`);
            }
        }
    });

    socket.on('disconnect', () => {
        // Disconnect mantığı aynı kaldı
    });
});

function oyunuBaslat(odaAdi) {
    const oda = odalar[odaAdi];
    if (!oda || oda.oyuncular.length !== 4) return;
    const oyun = new OkeyGame(oda.oyuncular);
    oyun.baslat();
    oda.oyunDurumu = oyun;
    const baslangicGameState = oyun.getGameState();
    oda.oyuncular.forEach(oyuncuAdi => {
        const oyuncuSocketId = kullaniciSocketMap[oyuncuAdi];
        if (oyuncuSocketId) {
            io.to(oyuncuSocketId).emit('oyunBasladi', {
                el: oyun.eller[oyuncuAdi],
                gameState: baslangicGameState
            });
        }
    });
    io.to(oda.adi).emit('logGuncelle', `Oyun başladı! Gösterge: ${oyun.gosterge.renk} ${oyun.gosterge.sayi}. Sıra ${baslangicGameState.siraKimde}'da.`);
}

function oyuncununOdasiniBul(oyuncuAdi) {
    for (const oda of Object.values(odalar)) {
        if (oda.oyuncular.includes(oyuncuAdi)) return oda;
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor.`));