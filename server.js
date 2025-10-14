require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const OkeyGame = require('./gameLogic.js');

const app = express();
const server = http.createServer(app);
app.use(express.json());
const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr", "http://localhost:3000"];
app.use(cors({ origin: allowedOrigins }));
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ["GET", "POST"] } });

const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.static('public'));

let onlineKullanicilar = {};
let odalar = {};
let kullaniciSocketMap = {};

// API ENDPOINTS
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Tüm alanlar zorunludur.' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbPool.query('INSERT INTO kullanicilar (kullanici_adi, email, sifre) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
        res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
    } catch (error) {
        res.status(409).json({ message: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
    }
});
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Tüm alanlar zorunludur.' });
    try {
        const result = await dbPool.query('SELECT * FROM kullanicilar WHERE kullanici_adi = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
        const user = result.rows[0];
        if (!await bcrypt.compare(password, user.sifre)) return res.status(401).json({ message: 'Hatalı şifre.' });
        res.status(200).json({ message: 'Giriş başarılı!', user: { id: user.id, username: user.kullanici_adi, skor: user.skor } });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});
app.get('/leaderboard', async (req, res) => {
    try {
        const result = await dbPool.query('SELECT kullanici_adi, skor FROM kullanicilar ORDER BY skor DESC LIMIT 10');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Liderlik tablosu alınamadı.' });
    }
});

io.on('connection', (socket) => {
    socket.on('yeniKullaniciGeldi', (userData) => {
        onlineKullanicilar[socket.id] = userData.username;
        kullaniciSocketMap[userData.username] = { id: socket.id, timeout: null };
        socket.emit('odaListesiGuncelle', Object.values(odalar));
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi || !odaAdi || odalar[odaAdi]) return;
        odalar[odaAdi] = { adi: odaAdi, oyuncular: [], kurucu: kurucuAdi, oyun: null };
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    socket.on('odayaKatil', (odaAdi) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = odalar[odaAdi];
        if (!oyuncuAdi || !oda || oda.oyuncular.length >= 4 || oda.oyuncular.includes(oyuncuAdi)) return;
        socket.join(odaAdi);
        oda.oyuncular.push(oyuncuAdi);
        socket.emit('katilimBasarili');
        const hazirOyuncular = oda.oyun ? Array.from(oda.oyun.hazirOyuncular) : [];
        io.to(odaAdi).emit('odaBilgisiGuncelle', { oyuncular: oda.oyuncular, odaAdi: oda.adi, hazirOyuncular });
        io.emit('odaListesiGuncelle', Object.values(odalar));
        if (oda.oyuncular.length === 4 && !oda.oyun) {
            oda.oyun = new OkeyGame(oda.oyuncular);
            io.to(odaAdi).emit('logGuncelle', `Oda doldu! Herkesin 'Hazır' olması bekleniyor.`);
        }
    });
    
    socket.on('hazirim', () => {
        const oyuncuAdi = onlineKullanicilar[socket.id]; const oda = oyuncununOdasiniBul(oyuncuAdi);
        if(oda && oda.oyun && !oda.oyun.oyunBittiMi) {
            oda.oyun.hazirOyuncular.add(oyuncuAdi);
            io.to(oda.adi).emit('hazirDurumuGuncelle', Array.from(oda.oyun.hazirOyuncular));
            io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi} hazır. (${oda.oyun.hazirOyuncular.size}/4)`);
            if(oda.oyuncular.length === 4 && oda.oyun.hazirOyuncular.size === 4) {
                oyunuBaslat(oda.adi);
            }
        }
    });

    socket.on('ortadanCek', (data) => {
        const oyuncuAdi = onlineKullanicilar[socket.id]; const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyun) {
            const cekilenTas = oda.oyun.ortadanCek(oyuncuAdi);
            if (cekilenTas) {
                socket.emit('tasCekildi', { tas: cekilenTas, kaynak: data.kaynak });
                io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyun.getGameState());
                io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi} ortadan bir taş çekti.`);
                siraZamanlayicisiniYenidenBaslat(oda);
            }
        }
    });

    socket.on('yandanCek', (data) => {
        const oyuncuAdi = onlineKullanicilar[socket.id]; const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyun) {
            const cekilenTas = oda.oyun.yandanCek(oyuncuAdi);
            if (cekilenTas) {
                socket.emit('tasCekildi', { tas: cekilenTas, kaynak: data.kaynak });
                io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyun.getGameState());
                io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi} yandan taş çekti.`);
                siraZamanlayicisiniYenidenBaslat(oda);
            }
        }
    });

    socket.on('tasAt', (data) => {
        const oyuncuAdi = onlineKullanicilar[socket.id]; const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyun) {
            const atilanTas = oda.oyun.tasAt(oyuncuAdi, data.tasId);
            if (atilanTas) {
                const sonrakiOyuncu = oda.oyun.oyuncular[oda.oyun.siraKimdeIndex];
                io.to(oda.adi).emit('tasAtildiAnimasyonu', { oyuncu: oyuncuAdi, hedef: data.hedef, tas: atilanTas });
                io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyun.getGameState());
                io.to(oda.adi).emit('logGuncelle', `${oyuncuAdi}, ${atilanTas.renk} ${atilanTas.sayi} attı. Sıra ${sonrakiOyuncu}'da.`);
                siraZamanlayicisiniYenidenBaslat(oda);
            }
        }
    });

    socket.on('bitmeIstegi', async (data) => {
        const oyuncuAdi = onlineKullanicilar[socket.id];
        const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && oda.oyun && !oda.oyun.oyunBittiMi) {
            const elGecerliMi = oda.oyun.eliDogrula(data.el, data.ciftMi);
            if (elGecerliMi) {
                if(oda.oyun.turnTimer) clearTimeout(oda.oyun.turnTimer);
                oda.oyun.oyunBittiMi = true;
                let puan = data.ciftMi ? 4 : 2;
                if (data.okeyMiAtti) puan *= 2;
                try {
                    await dbPool.query('UPDATE kullanicilar SET skor = skor + $1 WHERE kullanici_adi = $2', [puan, oyuncuAdi]);
                } catch (error) { console.error('Puan kaydedilemedi:', error); }
                io.to(oda.adi).emit('oyunBitti', { kazanan: oyuncuAdi, kazananEl: data.el, mesaj: `Oyunu ${data.ciftMi ? 'çifte biterek' : (data.okeyMiAtti ? 'okey atarak' : 'normal')} bitirdi! (+${puan} Puan)` });
                delete odalar[oda.adi];
                io.emit('odaListesiGuncelle', Object.values(odalar));
            } else {
                socket.emit('toastBildirimi', { tur: 'hata', mesaj: 'Geçersiz El!' });
            }
        }
    });
    
    socket.on('odadanAyril', () => socket.disconnect());

    socket.on('mesajGonder', (mesaj) => {
        const oyuncuAdi = onlineKullanicilar[socket.id]; const oda = oyuncununOdasiniBul(oyuncuAdi);
        if (oda && mesaj.trim() !== '') {
            io.to(oda.adi).emit('yeniMesaj', { gonderen: oyuncuAdi, icerik: mesaj });
        }
    });

    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (!ayrilanKullanici) return;
        const oda = oyuncununOdasiniBul(ayrilanKullanici);
        console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici}`);
        
        delete onlineKullanicilar[socket.id];
        delete kullaniciSocketMap[ayrilanKullanici];
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));

        if (oda) {
            if (oda.oyun && !oda.oyun.oyunBittiMi) {
                if(oda.oyun.turnTimer) clearTimeout(oda.oyun.turnTimer);
                oda.oyun.oyunBittiMi = true;
                io.to(oda.adi).emit('oyunBitti', { kazanan: null, kazananEl: [], mesaj: `${ayrilanKullanici} oyundan ayrıldığı için oyun dağıldı.` });
                delete odalar[oda.adi];
            } else {
                if(oda.oyun) {
                    oda.oyun.hazirOyuncular.delete(ayrilanKullanici);
                }
                oda.oyuncular = oda.oyuncular.filter(p => p !== ayrilanKullanici);
                const hazirOyuncular = oda.oyun ? Array.from(oda.oyun.hazirOyuncular) : [];
                io.to(oda.adi).emit('odaBilgisiGuncelle', { oyuncular: oda.oyuncular, odaAdi: oda.adi, hazirOyuncular });
            }
            io.emit('odaListesiGuncelle', Object.values(odalar));
        }
    });
});

function oyunuBaslat(odaAdi) {
    const oda = odalar[odaAdi]; if (!oda || !oda.oyun) return;
    oda.oyun.baslat();
    const baslangicGameState = oda.oyun.getGameState();
    oda.oyuncular.forEach(oyuncuAdi => {
        const oyuncuSocketId = kullaniciSocketMap[oyuncuAdi].id;
        if (oyuncuSocketId) {
            io.to(oyuncuSocketId).emit('oyunBasladi', {
                el: oda.oyun.eller[oyuncuAdi],
                gameState: baslangicGameState
            });
        }
    });
    io.to(oda.adi).emit('logGuncelle', `Oyun başladı! Gösterge: ${oda.oyun.gosterge.renk} ${oda.oyun.gosterge.sayi}. Sıra ${baslangicGameState.siraKimde}'da.`);
    siraZamanlayicisiniYenidenBaslat(oda);
}

function siraZamanlayicisiniYenidenBaslat(oda) {
    if (oda.oyun.turnTimer) clearTimeout(oda.oyun.turnTimer);

    io.to(oda.adi).emit('siraBasladi', { oyuncu: oda.oyun.oyuncular[oda.oyun.siraKimdeIndex], sure: 30 });

    oda.oyun.turnTimer = setTimeout(() => {
        if (!oda.oyun || oda.oyun.oyunBittiMi) return;
        
        const siradakiOyuncu = oda.oyun.oyuncular[oda.oyun.siraKimdeIndex];
        const oyuncuEli = oda.oyun.eller[siradakiOyuncu];
        const oyuncuSocketId = kullaniciSocketMap[siradakiOyuncu].id;

        if (oyuncuEli.length % 3 !== 0) { // Taş çekmemiş
            const cekilenTas = oda.oyun.ortadanCek(siradakiOyuncu);
            if(cekilenTas && oyuncuSocketId) {
                io.to(oyuncuSocketId).emit('tasCekildi', { tas: cekilenTas, kaynak: 'orta-deste' });
            }
        }
        
        setTimeout(() => { // Çekme animasyonuna zaman tanı
            const guncelEli = oda.oyun.eller[siradakiOyuncu];
            const atilacakTas = guncelEli[guncelEli.length - 1]; // Basitçe en sondakini at
            oda.oyun.tasAt(siradakiOyuncu, atilacakTas.id);

            io.to(oda.adi).emit('oyunDurumuGuncelle', oda.oyun.getGameState());
            io.to(oda.adi).emit('logGuncelle', `${siradakiOyuncu} süresi dolduğu için otomatik taş attı.`);
            siraZamanlayicisiniYenidenBaslat(oda);
        }, 500);

    }, 30000); // 30 saniye
}

function oyuncununOdasiniBul(oyuncuAdi) {
    for (const oda of Object.values(odalar)) {
        if (oda.oyuncular.includes(oyuncuAdi)) return oda;
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor.`));