const sunucuAdresi = "https://okey-1.onrender.com";
let socket = null;

let currentUser = null;
let benimElim = [];
let mevcutOyunDurumu = null;
let sortableIstaka = null;
let sesAcik = true;
let siraZamanlayiciInterval = null;

const sesler = { cek: document.getElementById('ses-cek'), at: document.getElementById('ses-at'), kazan: document.getElementById('ses-kazan') };

// HTML Elementleri
const girisEkrani = document.getElementById('giris-ekrani');
const lobiEkrani = document.getElementById('lobi-ekrani');
const oyunOdasiEkrani = document.getElementById('oyun-odasi-ekrani');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const sekmeButonlari = document.querySelectorAll('.sekme-btn');

// GİRİŞ EKRANI MANTIĞI
sekmeButonlari.forEach(btn => {
    btn.addEventListener('click', () => {
        sekmeButonlari.forEach(b => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        document.querySelectorAll('.form-icerik form').forEach(form => form.classList.add('hidden'));
        document.getElementById(btn.dataset.form).classList.remove('hidden');
    });
});
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    const response = await apiIstegi('/login', 'POST', data);
    if (response && response.user) {
        currentUser = response.user;
        showToast({ tur: 'basari', mesaj: response.message });
        socketBaglantisiKur();
    }
});
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm).entries());
    const response = await apiIstegi('/register', 'POST', data);
    if (response) {
        showToast({ tur: 'basari', mesaj: response.message });
        document.querySelector('.sekme-btn[data-form="login-form"]').click();
        loginForm.querySelector('input[name="username"]').value = data.username;
    }
});
async function apiIstegi(endpoint, method, body) {
    try {
        const response = await fetch(sunucuAdresi + endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) {
            showToast({ tur: 'hata', mesaj: result.message });
            return null;
        }
        return result;
    } catch (error) {
        showToast({ tur: 'hata', mesaj: 'Sunucuya bağlanılamadı.' });
        return null;
    }
}
async function socketBaglantisiKur() {
    socket = io(sunucuAdresi);
    socket.on('connect', async () => {
        console.log('Sunucuya bağlandı!');
        socket.emit('yeniKullaniciGeldi', currentUser);
        girisEkrani.classList.add('hidden');
        lobiEkrani.classList.remove('hidden');
        const leaderboard = await apiIstegi('/leaderboard', 'GET');
        if (leaderboard) {
            const leaderboardBody = document.getElementById('leaderboard-body');
            leaderboardBody.innerHTML = '';
            leaderboard.forEach((user, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td>${user.kullanici_adi}</td><td>${user.skor}</td>`;
                leaderboardBody.appendChild(tr);
            });
        }
    });
    
    socket.on('odaListesiGuncelle', (guncelOdalar) => {
        const odaListesiElementi = document.getElementById('oda-listesi');
        odaListesiElementi.innerHTML = '';
        guncelOdalar.forEach(oda => {
            const li = document.createElement('li');
            li.className = 'oda-item';
            const katilButonuHTML = oda.oyuncular.length >= 4 ? '<button disabled>Dolu</button>' : `<button class="katil-btn" data-oda-adi="${oda.adi}">Katıl</button>`;
            li.innerHTML = `
                <div class="oda-bilgisi-lobi">
                    <span>${oda.adi} (${oda.oyuncular.length}/4)</span>
                    <small>Kurucu: ${oda.kurucu}</small>
                </div>
                ${katilButonuHTML}
            `;
            odaListesiElementi.appendChild(li);
        });
    });
    socket.on('onlineKullaniciListesiGuncelle', (kullanicilar) => {
        const onlineKullanicilarListesi = document.getElementById('online-kullanicilar-listesi');
        onlineKullanicilarListesi.innerHTML = '';
        kullanicilar.forEach(k => { const li = document.createElement('li'); li.textContent = k; onlineKullanicilarListesi.appendChild(li); });
    });
    socket.on('katilimBasarili', () => {
        lobiEkrani.classList.add('hidden');
        oyunOdasiEkrani.classList.remove('hidden');
        oyunArayuzuOlaylariniBaslat();
    });
    socket.on('odaBilgisiGuncelle', (data) => {
        const panel = document.getElementById('oyuncu-listesi-panel');
        panel.innerHTML = '';
        data.oyuncular.forEach(oyuncu => {
            const div = document.createElement('div');
            div.className = 'oyuncu-kutusu';
            div.id = `oyuncu-kutusu-${oyuncu}`;
            div.innerHTML = `<div class="oyuncu-avatar"></div><span class="oyuncu-ismi">${oyuncu}</span><div class="sira-zamanlayici"></div>`;
            if (data.hazirOyuncular.includes(oyuncu)) div.classList.add('hazir');
            panel.appendChild(div);
        });
        document.getElementById('oda-adi-baslik').textContent = data.odaAdi;
    });
    socket.on('hazirDurumuGuncelle', (hazirOyuncular) => {
        document.querySelectorAll('.oyuncu-kutusu').forEach(kutu => kutu.classList.remove('hazir'));
        hazirOyuncular.forEach(oyuncu => {
            const kutu = document.getElementById(`oyuncu-kutusu-${oyuncu}`);
            if(kutu) kutu.classList.add('hazir');
        });
    });
    socket.on('oyunBasladi', (data) => {
        benimElim = data.el;
        mevcutOyunDurumu = data.gameState;
        oyunDurumunuCiz(data.gameState);
        istakayiCiz(true);
        istakayiEtkilesimliYap();
        document.getElementById('hazir-btn').classList.add('hidden');
        document.getElementById('perleri-grupla-btn').classList.remove('hidden');
    });
    socket.on('tasCekildi', (data) => {
        const baslangicEl = document.getElementById(data.kaynak);
        const bitisEl = document.getElementById('mevcut-oyuncu-istakasi');
        tasAnimasyonu(data.tas, baslangicEl, bitisEl);
        setTimeout(() => {
            benimElim.push(data.tas);
            istakayiCiz(false);
        }, 300);
        if (sesAcik) sesler.cek.play();
    });
    socket.on('tasAtildiAnimasyonu', (data) => {
        if (!mevcutOyunDurumu) return;
        const benimIndexim = mevcutOyunDurumu.oyuncular.indexOf(currentUser.username);
        const oyuncuIndex = mevcutOyunDurumu.oyuncular.indexOf(data.oyuncu);
        const oyuncuPozisyonu = (oyuncuIndex - benimIndexim + 4) % 4;
        
        const baslangicEl = document.getElementById(['benim-istaka-alani', 'rakip-alani-sag', 'rakip-alani-ust', 'rakip-alani-sol'][oyuncuPozisyonu]);
        const bitisEl = document.getElementById(['benim', 'sag', 'ust', 'sol'].map(p => `deste-alani-${p}`)[oyuncuPozisyonu]);
        
        if (data.oyuncu !== currentUser.username) {
             tasAnimasyonu(data.tas, baslangicEl, bitisEl);
        }
    });
    socket.on('siraBasladi', (data) => {
        if (siraZamanlayiciInterval) clearInterval(siraZamanlayiciInterval);
        document.querySelectorAll('.sira-zamanlayici').forEach(el => el.style.width = '100%');
        const zamanlayiciEl = document.querySelector(`#oyuncu-kutusu-${data.oyuncu} .sira-zamanlayici`);
        if(zamanlayiciEl) {
            let kalanSure = data.sure;
            zamanlayiciEl.style.transition = `width ${kalanSure}s linear`;
            requestAnimationFrame(() => {
                zamanlayiciEl.style.width = '0%';
            });
        }
    });
    socket.on('oyunDurumuGuncelle', (gameState) => {
        const siraBendeMiydi = mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === currentUser.username;
        mevcutOyunDurumu = gameState;
        oyunDurumunuCiz(gameState);
        const siraSimdiBendeMi = gameState.siraKimde === currentUser.username;
        if (siraSimdiBendeMi && !siraBendeMiydi) {
            showToast({ tur: 'bilgi', mesaj: 'Sıra sizde!' });
        }
        if(!siraBendeMiydi && !siraSimdiBendeMi && sesAcik) {
            sesler.at.play();
        }
    });
    socket.on('logGuncelle', (mesaj) => {
        const logListesi = document.getElementById('log-listesi');
        const li = document.createElement('li');
        li.innerHTML = `&rarr; ${mesaj}`;
        logListesi.prepend(li);
    });
    socket.on('oyunBitti', (data) => {
        if (siraZamanlayiciInterval) clearInterval(siraZamanlayiciInterval);
        document.getElementById('kazanan-bilgisi').textContent = data.kazanan ? `${data.kazanan} Kazandı!` : "Oyun Bitti!";
        document.getElementById('bitis-mesaji').textContent = data.mesaj;
        const kazananElAlani = document.getElementById('kazanan-el');
        kazananElAlani.innerHTML = '';
        if (data.kazananEl) data.kazananEl.forEach(tas => kazananElAlani.appendChild(tasiElementeCevir(tas, false)));
        document.getElementById('oyun-bitti-modal').classList.remove('hidden');
        if (sesAcik) sesler.kazan.play();
        if (data.kazanan === currentUser.username) konfetiYagdir();
    });
    socket.on('yeniMesaj', (data) => {
        const mesajListesi = document.getElementById('sohbet-mesajlari');
        const li = document.createElement('li');
        li.innerHTML = `<span class="mesaj-gonderen" style="color: ${renkUret(data.gonderen)};">${data.gonderen}:</span> ${data.icerik}`;
        mesajListesi.appendChild(li);
        mesajListesi.scrollTop = mesajListesi.scrollHeight;
    });
    socket.on('toastBildirimi', showToast);
}

document.getElementById('oda-kur-btn').addEventListener('click', () => {
    const odaAdi = document.getElementById('oda-adi-input').value.trim();
    if (odaAdi) socket.emit('odaKur', odaAdi);
    document.getElementById('oda-adi-input').value = '';
});
document.getElementById('oda-listesi').addEventListener('click', (event) => {
    if (event.target.classList.contains('katil-btn')) {
        socket.emit('odayaKatil', event.target.dataset.odaAdi);
    }
});
function oyunArayuzuOlaylariniBaslat() {
    document.getElementById('orta-deste').addEventListener('click', (e) => {
        if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === currentUser.username && benimElim.length % 3 !== 0) {
            socket.emit('ortadanCek', { kaynak: 'orta-deste' });
        }
    });
    document.getElementById('ana-oyun-alani').addEventListener('click', (event) => {
        const hedef = event.target.closest('.yan-deste');
        if (hedef && hedef.classList.contains('aktif-hedef') && mevcutOyunDurumu.siraKimde === currentUser.username && benimElim.length % 3 !== 0) {
            socket.emit('yandanCek', { kaynak: hedef.id });
        }
    });
    document.getElementById('sohbet-gonder-btn').addEventListener('click', mesajGonder);
    document.getElementById('sohbet-input').addEventListener('keyup', (e) => { if (e.key === 'Enter') mesajGonder(); });
    document.getElementById('bit-btn').addEventListener('click', () => bitmeIstegiGonder(false));
    document.getElementById('cifte-bit-btn').addEventListener('click', () => bitmeIstegiGonder(true));
    document.getElementById('perleri-grupla-btn').addEventListener('click', () => istakayiCiz(true, true));
    document.getElementById('odadan-ayril-btn').addEventListener('click', () => socket.emit('odadanAyril'));
    document.getElementById('lobiye-don-btn').addEventListener('click', () => window.location.reload());
    document.getElementById('hazir-btn').addEventListener('click', () => {
        socket.emit('hazirim');
        document.getElementById('hazir-btn').disabled = true;
        document.getElementById('hazir-btn').textContent = 'Bekleniyor...';
    });
    document.getElementById('tema-btn').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.getElementById('tema-btn').innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
    document.getElementById('ses-btn').addEventListener('click', () => {
        sesAcik = !sesAcik;
        document.getElementById('ses-btn').innerHTML = sesAcik ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    });
}
function oyunDurumunuCiz(gameState) {
    document.querySelectorAll('.oyuncu-kutusu').forEach(kutu => kutu.classList.remove('aktif-sira'));
    const aktifKutu = document.getElementById(`oyuncu-kutusu-${gameState.siraKimde}`);
    if (aktifKutu) aktifKutu.classList.add('aktif-sira');
    document.getElementById('gosterge-alani').innerHTML = '';
    document.getElementById('gosterge-alani').appendChild(tasiElementeCevir(gameState.gosterge, false));
    document.getElementById('orta-deste-sayisi').textContent = gameState.ortaDesteSayisi;
    document.getElementById('gosterge-bilgisi').innerHTML = `Okey: <div class="tas-mini tas-${gameState.okeyTasi.renk}">${gameState.okeyTasi.sayi}</div>`;
    document.querySelectorAll('.yan-deste').forEach(d => { d.innerHTML = ''; d.classList.remove('aktif-hedef'); });

    const benimIndexim = gameState.oyuncular.indexOf(currentUser.username);
    const pozisyonMap = ['benim', 'sag', 'ust', 'sol'];
    gameState.oyuncular.forEach((oyuncu, index) => {
        const atilanlar = gameState.atilanTaslar[oyuncu];
        const oyuncuPozisyonu = (index - benimIndexim + 4) % 4;
        const desteAlani = document.getElementById(`deste-alani-${pozisyonMap[oyuncuPozisyonu]}`);
        if(desteAlani && atilanlar && atilanlar.length > 0){
            const sonTas = atilanlar.slice(-1)[0];
            desteAlani.appendChild(tasiElementeCevir(sonTas, false));
        }
    });
    const oncekiOyuncuIndex = (gameState.oyuncular.indexOf(gameState.siraKimde) + 3) % 4;
    if (gameState.sonAtilanTas) {
         const oncekiOyuncuPozisyonu = (oncekiOyuncuIndex - benimIndexim + 4) % 4;
         const desteAlani = document.getElementById(`deste-alani-${pozisyonMap[oncekiOyuncuPozisyonu]}`);
         if(desteAlani) desteAlani.classList.add('aktif-hedef');
    }
}
function istakayiCiz(sirala = false, grupla = false) {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    if (sirala) {
        const renkSiralama = { 'sari': 1, 'mavi': 2, 'siyah': 3, 'kirmizi': 4 };
        benimElim.sort((a, b) => {
            if (a.isOkey && !b.isOkey) return -1; if (!a.isOkey && b.isOkey) return 1;
            if (renkSiralama[a.renk] < renkSiralama[b.renk]) return -1;
            if (renkSiralama[a.renk] > renkSiralama[b.renk]) return 1;
            return a.sayi - b.sayi;
        });
    }
    istakaElementi.innerHTML = '';
    
    benimElim.forEach(tas => {
        const tasElementi = tasiElementeCevir(tas, true);
        istakaElementi.appendChild(tasElementi);
    });
    
    document.getElementById('bit-btn').classList.toggle('hidden', benimElim.length !== 15);
    document.getElementById('cifte-bit-btn').classList.toggle('hidden', benimElim.length !== 14);
}
function istakayiEtkilesimliYap() {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    if (sortableIstaka) sortableIstaka.destroy();
    sortableIstaka = new Sortable(istakaElementi, {
        animation: 150,
        onEnd: () => {
            const guncelSira = Array.from(istakaElementi.children).map(el => el.dataset.id);
            benimElim.sort((a, b) => guncelSira.indexOf(a.id) - guncelSira.indexOf(b.id));
        }
    });
}
function tasiElementeCevir(tas, tıklanabilir) {
    const el = document.createElement('div');
    el.className = `tas tas-${tas.renk}`;
    if (tas.isOkey) el.classList.add('okey-tasi');
    el.innerHTML = `<span>${tas.sayi === 0 ? (tas.isOkey ? 'OK' : 'S') : tas.sayi}</span>`;
    el.dataset.id = tas.id;
    if (tıklanabilir) {
        el.addEventListener('click', () => {
            if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === currentUser.username && benimElim.length % 3 !== 0) {
                 showToast({tur:'hata', mesaj:'Taş atmak için elinizde fazla taş olmalı!'});
                 return;
            }
            if (mevcutOyunDurumu && mevcutOyunDurumu.siraKimde === currentUser.username && benimElim.length % 3 === 0) {
                const benimIndexim = mevcutOyunDurumu.oyuncular.indexOf(currentUser.username);
                const hedefEl = document.getElementById(`deste-alani-${['benim', 'sag', 'ust', 'sol'][benimIndexim]}`);
                tasAnimasyonu(tas, el, hedefEl);
                setTimeout(() => {
                    benimElim = benimElim.filter(t => t.id !== tas.id);
                    istakayiCiz(false);
                    socket.emit('tasAt', { tasId: tas.id });
                }, 50);
            }
        });
    }
    return el;
}
function mesajGonder() {
    const input = document.getElementById('sohbet-input');
    if(input.value.trim() !== ''){ socket.emit('mesajGonder', input.value); input.value = ''; }
}
function bitmeIstegiGonder(ciftMi) {
    const istakaElementi = document.getElementById('mevcut-oyuncu-istakasi');
    const guncelSira = Array.from(istakaElementi.querySelectorAll('.tas')).map(el => el.dataset.id);
    const siraliEl = [...benimElim].sort((a, b) => guncelSira.indexOf(a.id) - guncelSira.indexOf(b.id));

    const bitisKosulu = (ciftMi && siraliEl.length === 14) || (!ciftMi && siraliEl.length === 15);
    if (!bitisKosulu) { showToast({tur: 'hata', mesaj: 'El sayısı bitiş için uygun değil!'}); return; }
    
    if (!ciftMi) {
        const atilacakTas = siraliEl.pop();
        socket.emit('bitmeIstegi', { el: siraliEl, ciftMi: ciftMi, atilacakTasId: atilacakTas.id, okeyMiAtti: atilacakTas.isOkey });
    } else {
        socket.emit('bitmeIstegi', { el: siraliEl, ciftMi: ciftMi, atilacakTasId: null, okeyMiAtti: false });
    }
}
function showToast(data) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${data.tur || 'bilgi'}`;
    const iconMap = { 'hata': 'fa-circle-xmark', 'basari': 'fa-circle-check', 'bilgi': 'fa-circle-info' };
    toast.innerHTML = `<i class="fa-solid ${iconMap[data.tur] || 'fa-circle-info'}"></i> ${data.mesaj}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}
function renkUret(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}
function tasAnimasyonu(tasData, baslangicEl, bitisEl) {
    if (!baslangicEl || !bitisEl) return;
    const tasElementi = tasiElementeCevir(tasData, false);
    tasElementi.classList.add('tas-ucusu');
    document.body.appendChild(tasElementi);
    const baslangicRect = baslangicEl.getBoundingClientRect();
    const bitisRect = bitisEl.getBoundingClientRect();
    tasElementi.style.left = `${baslangicRect.left + (baslangicRect.width / 2) - 20}px`;
    tasElementi.style.top = `${baslangicRect.top + (baslangicRect.height / 2) - 30}px`;
    requestAnimationFrame(() => {
        tasElementi.style.left = `${bitisRect.left + (bitisRect.width / 2) - 20}px`;
        tasElementi.style.top = `${bitisRect.top + (bitisRect.height / 2) - 30}px`;
        tasElementi.style.transform = 'scale(1)';
    });
    setTimeout(() => {
        if(document.body.contains(tasElementi)) document.body.removeChild(tasElementi);
    }, 500);
}
function konfetiYagdir() { /* Boş fonksiyon */ }