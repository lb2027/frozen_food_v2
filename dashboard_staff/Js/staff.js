// Toggle sidebar 
const sidebarItems = document.querySelectorAll('.sidebar-item');

sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    const icon = item.querySelector('.icon-circle');
    
    if (icon) {
      icon.classList.add('scale-up');

      setTimeout(() => {
        icon.classList.remove('scale-up');
      }, 200); 
    }
  });
});

// Bagian Modal Fitur

//MASUK
function bukaModal() {
  document.getElementById('modalBarangMasuk').style.display = 'flex';
}

function tutupModal() {
  document.getElementById('modalBarangMasuk').style.display = 'none';
}

document.querySelector('.sidebar-item.active').addEventListener('click', bukaModal);

// TERJUAL
function bukaModalTerjual() {
  document.getElementById('modalBarangTerjual').style.display = 'flex';
}

function tutupModalTerjual() {
  document.getElementById('modalBarangTerjual').style.display = 'none';
}

document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    const spanText = item.querySelector('span').textContent.trim();
    if (spanText === "Barang Terjual") {
      bukaModalTerjual();
    }
  });
});


