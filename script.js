const STORAGE_KEY = "studentAttendanceRecords";
const form = document.getElementById("attendanceForm");
const nameInput = document.getElementById("studentName");
const nimInput = document.getElementById("studentNim");
const dateInput = document.getElementById("attendanceDate");
const statusInput = document.getElementById("attendanceStatus");
const body = document.getElementById("attendanceBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const formMessage = document.getElementById("formMessage");

let records = loadRecords();

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

dateInput.value = localDateString();
document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
}).format(new Date());

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function renderStats() {
  document.getElementById("totalCount").textContent = records.length;
  document.getElementById("presentCount").textContent = records.filter(item => item.status === "Hadir").length;
  document.getElementById("excusedCount").textContent = records.filter(item => ["Izin", "Sakit"].includes(item.status)).length;
  document.getElementById("absentCount").textContent = records.filter(item => item.status === "Alpa").length;
}

function renderRecords() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterStatus.value;
  const filtered = records.filter(item => {
    const matchesKeyword = item.name.toLowerCase().includes(keyword) || item.nim.toLowerCase().includes(keyword);
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesKeyword && matchesStatus;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  body.innerHTML = filtered.map(item => `
    <tr>
      <td><div class="student-cell"><div class="student-avatar">${escapeHTML(item.name.trim().charAt(0).toUpperCase() || "M")}</div>
        <div><div class="student-name">${escapeHTML(item.name)}</div><div class="student-nim">${escapeHTML(item.nim)}</div></div>
      </div></td>
      <td>${formatDate(item.date)}</td>
      <td><span class="status status-${item.status.toLowerCase()}">${item.status}</span></td>
      <td><button class="delete-btn" type="button" data-id="${item.id}" aria-label="Hapus absensi">×</button></td>
    </tr>`).join("");

  emptyState.hidden = filtered.length > 0;
  document.getElementById("recordCount").textContent = `Menampilkan ${filtered.length} dari ${records.length} data`;
  renderStats();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const nim = nimInput.value.trim();
  const date = dateInput.value;
  const status = statusInput.value;

  if (!name || !nim || !date) {
    formMessage.textContent = "Lengkapi semua data terlebih dahulu.";
    return;
  }

  const duplicate = records.some(item => item.nim.toLowerCase() === nim.toLowerCase() && item.date === date);
  if (duplicate) {
    formMessage.textContent = "NIM tersebut sudah memiliki absensi pada tanggal ini.";
    formMessage.style.color = "#d99131";
    return;
  }

  records.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name, nim, date, status, createdAt: Date.now() });
  saveRecords();
  form.reset();
  dateInput.value = localDateString();
  statusInput.value = "Hadir";
  formMessage.style.color = "#2ca66e";
  formMessage.textContent = "Absensi berhasil disimpan.";
  renderRecords();
});

body.addEventListener("click", event => {
  const button = event.target.closest(".delete-btn");
  if (!button) return;
  const record = records.find(item => item.id === button.dataset.id);
  if (!record) return;
  if (confirm(`Hapus absensi ${record.name}?`)) {
    records = records.filter(item => item.id !== record.id);
    saveRecords();
    renderRecords();
    formMessage.textContent = "Data absensi dihapus.";
  }
});

searchInput.addEventListener("input", renderRecords);
filterStatus.addEventListener("change", renderRecords);

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!records.length) {
    alert("Belum ada data untuk dihapus.");
    return;
  }
  if (confirm("Yakin ingin menghapus semua data absensi?")) {
    records = [];
    saveRecords();
    renderRecords();
    formMessage.textContent = "Semua data absensi telah dihapus.";
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  if (!records.length) {
    alert("Belum ada data untuk diekspor.");
    return;
  }
  const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [
    ["Nama Mahasiswa", "NIM", "Tanggal", "Status"],
    ...records.map(item => [item.name, item.nim, item.date, item.status])
  ];
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "data-absensi-mahasiswa.csv";
  link.click();
  URL.revokeObjectURL(url);
});

renderRecords();
