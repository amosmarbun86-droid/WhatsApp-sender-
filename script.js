const CLOUD_NAME = "dkisbfx29";
const UPLOAD_PRESET = "ml_default";
const API_KEY_FONNTE = "hMYEWfgYSGSw6KK81TN6";

// ================= KUNCI FIREBASE CONFIG RESMI ANDA =================
const firebaseConfig = {
  apiKey: "AIzaSyDejqBNDkHJQKkOBxWzlgOZzoYdz4XMvsI",
  authDomain: "wa-sender-v4-pro.firebaseapp.com",
  databaseURL: "https://wa-sender-v4-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wa-sender-v4-pro",
  storageBucket: "wa-sender-v4-pro.firebasestorage.app",
  messagingSenderId: "397741200880",
  appId: "1:397741200880:web:a2eb60b15378c614383935"
};

// Inisialisasi Aplikasi Firebase & Database Reference
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const kontakRef = db.ref("kontak");
const logRef = db.ref("logs"); // Reference untuk menyimpan data riwayat pesan

// Variabel lokal penyimpan data kontak yang sinkron dengan Firebase
let kontak = [];

// Mendengarkan perubahan data secara langsung dari Firebase Realtime Server
kontakRef.on("value", (snapshot) => {
    const data = snapshot.val();
    kontak = [];
    
    if (data) {
        Object.keys(data).forEach((key) => {
            kontak.push({
                id: key, // Menyimpan id firebase unik agar pemetaan indeks tidak tertukar
                nama: data[key].nama,
                nomor: data[key].nomor
            });
        });
    }
    
    // Sinkronisasi otomatis dengan kolom pencarian jika sedang diisi
    const searchInput = document.getElementById("searchKontak");
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    if (keyword !== "") {
        filterKontak();
    } else {
        renderKontak();
    }
});

// Mendengarkan data log history pengiriman secara live dari Firebase
logRef.on("value", (snapshot) => {
    const data = snapshot.val();
    const tbody = document.getElementById("logTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!data) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">Belum ada riwayat pengiriman.</td></tr>`;
        return;
    }

    const logList = [];
    Object.keys(data).forEach(key => {
        logList.push({ id: key, ...data[key] });
    });
    logList.reverse(); // Data pengiriman terbaru akan selalu muncul paling atas

    logList.forEach(log => {
        let tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors";
        
        let statusBadge = log.status.includes("✅") 
            ? `<span class="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-bold">SUKSES</span>`
            : log.status.includes("⚠️")
            ? `<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-bold">TERTUNDA</span>`
            : `<span class="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold">GAGAL</span>`;

        tr.innerHTML = `
            <td class="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">${log.waktu}</td>
            <td class="p-3 font-semibold text-slate-300">${log.tujuan}</td>
            <td class="p-3 text-slate-400 max-w-xs truncate" title="${log.pesan}">${log.pesan}</td>
            <td class="p-3">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
});

// ================= AUTH SYSTEM =================
function checkAuth() {
    const isLogin = localStorage.getItem("login");
    if (isLogin === "true") {
        document.getElementById("loginPage").classList.add("hidden-section");
        document.getElementById("mainDashboard").classList.remove("hidden-section");
    } else {
        document.getElementById("loginPage").classList.remove("hidden-section");
        document.getElementById("mainDashboard").classList.add("hidden-section");
    }
}

function handleLogin() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (u === "admin" && p === "101312") {
        localStorage.setItem("login", "true");
        checkAuth();
    } else {
        alert("Akses Ditolak! Periksa kembali kredensial Anda.");
    }
}

function handleLogout() {
    localStorage.removeItem("login");
    checkAuth();
}

// ================= CONTACT SYSTEM (FIREBASE INTEGRATED) =================
// PERBAIKAN: Hanya me-render Nama Kontak saja agar select tidak kepanjangan/merusak layout border hijau Anda
function renderKontak(kontakFilter = null) {
    const select = document.getElementById("kontakSelect");
    if (!select) return;
    select.innerHTML = `<option value="">-- Pilih Kontak --</option>`;
    
    const daftarKontak = kontakFilter || kontak;

    daftarKontak.forEach((k) => {
        let opt = document.createElement("option");
        opt.value = k.id; 
        opt.text = k.nama; // Memotong teks nomor telepon dari tampilan visual select
        select.appendChild(opt);
    });
}

// Fungsi Pencarian Kontak Secara Live
function filterKontak() {
    const keyword = document.getElementById("searchKontak").value.toLowerCase().trim();
    if (keyword === "") {
        renderKontak();
        return;
    }

    const hasilFilter = kontak.filter(k => 
        k.nama.toLowerCase().includes(keyword) || 
        k.nomor.includes(keyword)
    );
    renderKontak(hasilFilter);
}

function tambahKontak() {
    let n = document.getElementById("namaKontak").value.trim();
    let num = document.getElementById("nomorKontak").value.trim();
    if (!n || !num) return alert("Lengkapi nama dan nomor!");
    if(num.startsWith("0")) num = "62" + num.slice(1);
    if(num.startsWith("8")) num = "62" + num;
    if(num.startsWith("+")) num = num.slice(1);

    kontakRef.push({
        nama: n,
        nomor: num
    }).then(() => {
        document.getElementById("namaKontak").value = "";
        document.getElementById("nomorKontak").value = "";
    }).catch((err) => {
        alert("Gagal menyimpan ke server: " + err.message);
    });
}

// Mengisi nomor tujuan berdasarkan ID Firebase kontak terpilih secara akurat
function isiNomor() {
    const select = document.getElementById("kontakSelect");
    const firebaseId = select.value;
    
    if (firebaseId !== "") {
        const kontakTerpilih = kontak.find(k => k.id === firebaseId);
        if (kontakTerpilih) {
            document.getElementById("nomor").value = kontakTerpilih.nomor;
        }
    } else {
        document.getElementById("nomor").value = "";
    }
}

function hapusSatuKontak() {
    const firebaseId = document.getElementById("kontakSelect").value;
    if (firebaseId === "") return alert("Pilih kontak yang ingin dihapus!");
    
    const kontakTerpilih = kontak.find(k => k.id === firebaseId);
    if (kontakTerpilih && confirm(`Hapus kontak ${kontakTerpilih.nama} dari server?`)) {
        db.ref("kontak/" + firebaseId).remove()
        .then(() => {
            document.getElementById("nomor").value = "";
        })
        .catch((err) => {
            alert("Gagal menghapus data di server: " + err.message);
        });
    }
}

function hapusSemuaKontak() {
    if (confirm("Hapus seluruh database kontak di cloud server? Tindakan ini tidak bisa dibatalkan.")) {
        kontakRef.remove()
        .then(() => {
            document.getElementById("nomor").value = "";
        })
        .catch((err) => {
            alert("Gagal mengosongkan database server: " + err.message);
        });
    }
}

// PERBAIKAN PENTING: Mendukung multi-kolom CSV (First Name, Last Name, Phone) & membuang tanda '+'
function importCSV() {
    const f = document.getElementById("csvFile").files[0];
    if (!f) return alert("Pilih file CSV dulu!");
    const r = new FileReader();
    r.onload = function(e) {
        const rows = e.target.result.split(/\r?\n/);
        let jumlahBerhasil = 0;
        
        rows.forEach((row, index) => {
            if (!row.trim()) return; 
            
            let columns = row.split(",");
            
            // Lompati baris pertama jika itu adalah nama header kolom
            if (index === 0 && columns[0].toLowerCase().includes("name")) return;
            
            if (columns.length >= 2) {
                // Kolom terakhir diidentifikasi sebagai nomor telepon
                let nomorRaw = columns[columns.length - 1].trim();
                
                // Gabungkan kolom-kolom sebelumnya menjadi nama lengkap utuh
                let namaRaw = columns.slice(0, columns.length - 1).join(" ").trim();
                let namaClean = namaRaw.replace(/\s+/g, ' ');
                let val = nomorRaw;
                
                if (namaClean.toLowerCase() === "my number" && val === "") return;
                if (!val || val === "Phone") return; 
                
                // Sinkronisasi standar kode negara 62 dan hilangkan karakter '+'
                if(val.startsWith("+")) val = val.slice(1);
                if(val.startsWith("0")) val = "62" + val.slice(1);
                if(val.startsWith("8")) val = "62" + val;
                
                if (namaClean && val) {
                    kontakRef.push({
                        nama: namaClean,
                        nomor: val
                    });
                    jumlahBerhasil++;
                }
            }
        });
        alert(`Import selesai! Berhasil menambahkan ${jumlahBerhasil} kontak dengan nomor hp yang akurat.`);
    };
    r.readAsText(f);
}

// ================= MEDIA & SEND SYSTEM =================
const fInput = document.getElementById("file");
if (fInput) {
    fInput.addEventListener("change", function() {
        const file = this.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = document.getElementById("previewImg");
        const vid = document.getElementById("previewVideo");
        if (file.type.startsWith("image")) {
            img.src = url; img.style.display = "block"; vid.style.display = "none";
        } else {
            vid.src = url; vid.style.display = "block"; img.style.display = "none";
        }
    });
}

async function kirim() {
    const st = document.getElementById("status");
    const bt = document.getElementById("btnKirim");
    const no = document.getElementById("nomor").value.trim();
    const ps = document.getElementById("pesan").value.trim();
    const fl = fInput ? fInput.files[0] : null;

    if (!no) return alert("Nomor tujuan wajib diisi!");

    bt.disabled = true;
    st.innerText = "⏳ Sedang memproses media...";

    // Mencari sapaan nama dinamis menggunakan pencocokan ID Firebase unik
    const firebaseId = document.getElementById("kontakSelect").value;
    const kontakTerpilih = kontak.find(k => k.id === firebaseId);
    let sapa = kontakTerpilih ? kontakTerpilih.nama : "Bapak/Ibu";
    let pFinal = ps.replace(/{{nama}}/g, sapa);

    let mUrl = "";
    let upOk = false;
    let statusLog = "❌ Gagal"; 

    try {
        if (fl) {
            let fd = new FormData();
            fd.append("file", fl);
            fd.append("upload_preset", UPLOAD_PRESET);
            let up = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
                method: "POST",
                body: fd
            });
            let rC = await up.json();
            if (rC.secure_url) { mUrl = rC.secure_url; upOk = true; }
        }

        let msgFull = upOk ? (pFinal + "\n\n" + mUrl) : pFinal;
        
        st.innerText = "📤 Mengirim pesan ke WhatsApp...";
        let bdy = { target: no, message: msgFull };
        if (upOk) { bdy.url = mUrl; bdy.filename = fl.name; }

        let res = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": API_KEY_FONNTE, "Content-Type": "application/json" },
            body: JSON.stringify(bdy)
        });

        let d = await res.json();

        if ((!d.status || !upOk) && mUrl) {
            await fetch("https://api.fonnte.com/send", {
                method: "POST",
                headers: { "Authorization": API_KEY_FONNTE, "Content-Type": "application/json" },
                body: JSON.stringify({ target: no, message: pFinal + "\n\n" + mUrl })
            });
            st.innerText = "⚠️ Media tertunda, link terkirim.";
            statusLog = "⚠️ Media Tertunda";
        } else if (d.status) {
            st.innerText = "✅ Pesan berhasil dikirim!";
            alert("Pesan Berhasil Terkirim!");
            statusLog = "✅ Berhasil";
        } else {
            throw new Error("Gagal Kirim");
        }

    } catch (err) {
        console.error(err);
        st.innerText = "❌ Terjadi kesalahan pengiriman.";
        statusLog = "❌ Gagal";
    } finally {
        bt.disabled = false;
        
        // Simpan catatan riwayat aktivitas pesan ke database Firebase secara otomatis
        const sekarang = new Date();
        const opsiWaktu = { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        };
        const stringWaktu = ClinicalTime = sekarang.toLocaleString('id-ID', opsiWaktu).replace(/\//g, '-');

        logRef.push({
            waktu: stringWaktu,
            tujuan: no,
            pesan: pFinal,
            status: statusLog
        }).catch(e => console.error("Gagal mencatat log ke cloud:", e));
    }
}

function hapusSemuaLog() {
    if (confirm("Hapus seluruh data riwayat pengiriman di cloud server?")) {
        logRef.remove().catch(err => alert("Gagal membersihkan log: " + err.message));
    }
}

// Jalankan sistem verifikasi sesi masuk
checkAuth();
