// ==================================================================
// 1. GEREKLİ MODÜLLERİN YÜKLENMESİ
// ==================================================================
// Express: Web sunucusu oluşturmak için temel framework.
const express = require('express');

// http: Express uygulamasını çalıştıracak olan standart Node.js sunucusu.
const http = require('http');

// socket.io: Gerçek zamanlı iletişimi (WebSocket) yönetecek olan kütüphane.
const { Server } = require("socket.io");

// cors: Farklı domain'lerden (kökenlerden) gelen isteklere izin vermek için kullanılır.
// Tarayıcı güvenliği (Cross-Origin Resource Sharing) için zorunludur.
const cors = require('cors');


// ==================================================================
// 2. SUNUCU VE UYGULAMA KURULUMU
// ==================================================================
// Express uygulamasını oluşturuyoruz.
const app = express();

// Express uygulamasını kullanarak bir HTTP sunucusu oluşturuyoruz.
// Socket.IO'nun çalışması için bu gereklidir.
const server = http.createServer(app);


// ==================================================================
// 3. GÜVENLİK (CORS) AYARLARI
// ==================================================================
// Bu ayar, sunucunuza SADECE 'https://kaplanvip.com.tr' adresinden gelen
// bağlantı isteklerinin kabul edilmesini sağlar. Başka bir web sitesi
// sizin sunucunuza bağlanmaya çalışırsa, bu istek reddedilir.

// Express için CORS ayarı (API istekleri için gelecekte gerekebilir)
app.use(cors({
    origin: "https://kaplanvip.com.tr"
}));

// Socket.IO sunucusunu oluştururken CORS ayarlarını da belirtiyoruz. Bu en önemli kısım!
const io = new Server(server, {
    cors: {
        origin: "https://kaplanvip.com.tr", // Sadece bu adresten gelen bağlantılara izin ver
        methods: ["GET", "POST"]      // İzin verilen HTTP metotları
    }
});


// ==================================================================
// 4. STATİK DOSYA SERVİSİ (MIDDLEWARE)
// ==================================================================
// 'public' adındaki klasörümüzün içindeki HTML, CSS ve client.js gibi
// dosyalara dışarıdan erişilebilmesini sağlıyoruz.
app.use(express.static('public'));


// ==================================================================
// 5. UYGULAMA GENELİ DEĞİŞKENLER (STATE)
// ==================================================================
// Sunucuya bağlı olan tüm online kullanıcıları saklayacağımız nesne.
// Yapısı: { socket.id: 'kullanici_adi', ... } şeklinde olacak.
let onlineKullanicilar = {};


// ==================================================================
// 6. SOCKET.IO BAĞLANTI MANTIĞI
// ==================================================================
// 'connection' olayı, bir istemci (tarayıcı) sunucuya başarıyla bağlandığında tetiklenir.
io.on('connection', (socket) => {

    // Geliştirme için hangi kullanıcının bağlandığını konsola yazdıralım.
    console.log(`✅ Bir kullanıcı bağlandı: ${socket.id}`);

    // İstemciden 'yeniKullaniciGeldi' olayı geldiğinde...
    socket.on('yeniKullaniciGeldi', (kullaniciAdi) => {
        // Gelen kullanıcıyı online listemize ekliyoruz.
        onlineKullanicilar[socket.id] = kullaniciAdi;
        console.log(`   -> ${kullaniciAdi} ismiyle lobiye katıldı.`);

        // Online kullanıcı listesi değiştiği için, bu yeni listeyi
        // bağlı olan TÜM istemcilere 'onlineKullaniciListesiGuncelle' olayı ile gönderiyoruz.
        // Object.values() ile sadece kullanıcı isimlerini [ 'Ali', 'Ayşe' ] şeklinde bir diziye çeviriyoruz.
        io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
    });

    // 'disconnect' olayı, bir istemcinin bağlantısı koptuğunda (sayfayı kapattığında vs.) tetiklenir.
    socket.on('disconnect', () => {
        const ayrilanKullanici = onlineKullanicilar[socket.id];

        // Eğer kullanıcı isim girerek listeye dahil olmuşsa...
        if (ayrilanKullanici) {
            console.log(`❌ Kullanıcı ayrıldı: ${ayrilanKullanici} (${socket.id})`);

            // Kullanıcıyı online listesinden siliyoruz.
            delete onlineKullanicilar[socket.id];

            // Liste tekrar değiştiği için, güncel listeyi TÜM istemcilere tekrar gönderiyoruz.
            io.emit('onlineKullaniciListesiGuncelle', Object.values(onlineKullanicilar));
        } else {
            // Eğer kullanıcı isim girmeden sayfayı kapattıysa
            console.log(`❌ İsimsiz bir bağlantı kesildi: ${socket.id}`);
        }
    });
});


// ==================================================================
// 7. SUNUCUYU BAŞLATMA
// ==================================================================
// Render gibi platformlar için port numarasını ortam değişkeninden (environment variable)
// almasını sağlıyoruz. Eğer yerelde çalışıyorsak 3000 portunu kullanacak.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı ve dinlemede...`);
});