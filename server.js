const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Veritabanı bağlantı havuzu oluşturma (Render Environment Variables'dan alınacak)
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Sunucudaki tüm oyuncuları takip etmek için bir nesne
// { 'socketId': { username: 'oyuncu1', id: 123 }, ... }
let onlineUsers = {};

// Okey Oyun Mantığı (Bu kısım çok daha detaylı olacak)
const okeyGameLogic = require('./gameLogic.js'); // Oyun mantığını ayrı bir dosyada tutmak en iyisidir.

io.on('connection', (socket) => {
    console.log(`Bir kullanıcı bağlandı: ${socket.id}`);

    // Yeni kullanıcı bağlandığında online listesine ekle
    socket.on('login', (userData) => {
        onlineUsers[socket.id] = { id: userData.id, username: userData.username };
        // Tüm istemcilere güncel online listesini gönder
        io.emit('updateOnlineUsers', Object.values(onlineUsers));
    });

    // Oda kurma isteği
    socket.on('createRoom', (roomName) => {
        // Veritabanına odayı kaydet
        // Oyuncuyu odaya al ve diğer oyunculara yeni odayı bildir
        // ...
    });

    // Odaya katılma isteği
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId); // Socket.IO'nun oda özelliğini kullan
        // Diğer oyunculara yeni birinin katıldığını bildir
        io.to(roomId).emit('playerJoined', onlineUsers[socket.id].username);
    });
    
    // Oyun içi aksiyonlar
    socket.on('drawTile', (data) => {
        // okeyGameLogic üzerinden taşı çek
        // Oyun durumunu güncelle
        // Sadece o odadaki oyunculara yeni durumu gönder
        io.to(data.roomId).emit('updateGameState', newGameState);
    });

    socket.on('discardTile', (data) => {
       // okeyGameLogic üzerinden taşı at
       // Oyun durumunu güncelle
       // Sadece o odadaki oyunculara yeni durumu gönder
        io.to(data.roomId).emit('updateGameState', newGameState);
    });

    // Kullanıcı bağlantısı kesildiğinde
    socket.on('disconnect', () => {
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);
        delete onlineUsers[socket.id];
        // Tüm istemcilere güncel online listesini gönder
        io.emit('updateOnlineUsers', Object.values(onlineUsers));
    });
});


// Statik dosyaları (HTML, CSS, JS) sunmak için
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});