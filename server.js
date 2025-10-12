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
// Sunucunuza SADECE bu adreslerden gelen isteklere izin verilir.
const allowedOrigins = ["https://okey-1.onrender.com", "https://kaplanvip.com.tr"];

const corsOptions = {
    origin: (origin, callback) => {
        // Mobil uygulamalar veya sunucu içi istekler için `!origin` kontrolü
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bu site tarafından CORS erişimine izin verilmiyor.'));
        }
    }
};

app.use(cors(corsOptions));

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
let onlineKullanicilar = {};
let odalar = {};

// ==================================================================
// 6. SOCKET.IO BAĞLANTI MANTIĞI
// ==================================================================
io.on('connection', (socket) => {
    console.log(`✅ Bir kullanıcı bağlandı: ${socket.id}`);

    // Yeni bağlanan kullanıcıya mevcut oda listesini gönder
    socket.emit('odaListesiGuncelle', Object.values(odalar));

    // Lobiye yeni bir kullanıcı katıldığında
    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        onlineKullanicilar[socket.id] = kullaniciAdi;
        console.log(`-> ${kullaniciAdi} ismiyle lobiye katıldı.`);
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    // Yeni bir oda kurulduğunda
    socket.on('odaKur', (odaAdi) => {
        const kurucuAdi = onlineKullanicilar[socket.id];
        if (!kurucuAdi) return; // İsimsiz kullanıcı oda kuramaz

        if (!odaAdi || odalar[odaAdi]) {
            console.log(`⚠️ ${kurucuAdi} tarafından geçersiz oda kurma denemesi: ${odaAdi}`);
            // İsteğe bağlı: Kullanıcıya hata mesajı gönderilebilir
            // socket.emit('hataMesaji', 'Bu oda adı zaten alınmış veya geçersiz.');
            return;
        }

        odalar[odaAdi] = {
            adi: odaAdi,
            oyuncular: [kurucuAdi],
            kurucu: kurucuAdi
        };
        console.log(`🏠 Yeni oda kuruldu: '${odaAdi}' - Kurucu: ${kurucuAdi}`);

        // Herkese güncel oda listesini gönder
        io.emit('odaListesiGuncelle', Object.values(odalar));
    });

    // Bir kullanıcı bağlantıyı kestiğinde
    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];
        if (ayrilanKullanici) {
            console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici} (${socket.id})`);
            delete onlineKullanicilar[socket.id];
            io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
            // İleride: Kullanıcıyı odadan çıkarma mantığı eklenecek.
        }
    });
});

// ==================================================================
// 7. SUNUCUYU BAŞLATMA
// ==================================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı ve dinlemede...`);
});