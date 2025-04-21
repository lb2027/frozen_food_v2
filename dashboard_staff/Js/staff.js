// Toggle active sidebar item
const sidebarItems = document.querySelectorAll('.sidebar-item');
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// Toggle time filter active state
const timeOptions = document.querySelectorAll('.time-option');
timeOptions.forEach(option => {
  option.addEventListener('click', () => {
    timeOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    console.log(`Filter waktu: ${option.textContent}`);
    // Bisa tambahkan fungsi untuk fetch data baru sesuai filter
  });
});

// Export button handler
const exportBtn = document.querySelector('.export-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    alert('Fitur export belum tersedia 😅');
    // Di sini bisa integrasi ke fungsi export PDF, CSV, dll
  });
}

// Simulasi notifikasi
const notifIcon = document.querySelector('.notification-icon');
if (notifIcon) {
  notifIcon.addEventListener('click', () => {
    alert('Belum ada notifikasi baru 🔔');
  });
}