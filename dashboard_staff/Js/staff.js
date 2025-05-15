//Bagian Login

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("authToken");
  const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";

  function isTokenExpired(token) {
    try {
      const payloadBase64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadBase64));

      if (payload && payload.exp) {
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();

        return currentTime > expiryTime;
      } else {
        return true;
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      return true;
    }
  }

  if (!token || isTokenExpired(token)) {
    window.location.href = "/login/login.html";
    return;
  }

  async function initializeApiUrl() {
    const envData = await readJsonFile("/json/env.json");
    if (envData && envData.api_url) {
      localStorage.setItem("apiUrl", envData.api_url);
      window.apiUrl = envData.api_url; // Make it global
    } else {
      console.warn("Failed to read API URL from JSON, using default");
    }
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("authToken");
      window.location.href = "/login/login.html";
    });
  }

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("authToken"); // atau "token" sesuai nama yang kamu pakai
    window.location.href = "/login/login.html"; // ganti path sesuai struktur kamu
  });

  //Manggil Modal untuk Fitur

  const modal = document.getElementById("add-product-modal");
  const openModalBtn = document.getElementById("open-add-modal");
  const closeModalBtn = document.getElementById("close-add-modal");
  const addProductForm = document.getElementById("add-product-form");

  openModalBtn.addEventListener("click", () => {
    modal.style.display = "block";
  });

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nama = document.getElementById("nama").value;
    const stok = document.getElementById("stok").value;
    const harga = document.getElementById("harga").value;
    const harga_beli = document.getElementById("harga_beli").value;
    const foto = document.getElementById("foto").value;
    const supplier = document.getElementById("supplier").value;

    if (!nama || !stok || !harga || !harga_beli || !foto || !supplier) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/addproduk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          nama: nama,
          stok: parseInt(stok),
          harga: parseFloat(harga),
          harga_beli: parseFloat(harga_beli),
          foto: foto,
          supplier: supplier,
        }),
      });

      if (response.ok) {
        modal.style.display = "none";

        fetchProduk();
      } else {
        const errorData = await response.json();
        alert(`Failed to add product: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("An error occurred while adding the product.");
    }
  });

  const closeButton = document.getElementById("closeBtn");

  closeButton.addEventListener("click", function () {
    modal.style.display = "none";
  });

  const addStockModal = document.getElementById("add-stock-modal");
  const openAddStockModalBtn = document.getElementById("open-add-stock-modal");
  const closeAddStockModalBtn = document.getElementById(
    "close-add-stock-modal"
  );
  const addStockForm = document.getElementById("add-stock-form");

  openAddStockModalBtn.addEventListener("click", () => {
    addStockModal.style.display = "block";
    const addStockDropdown = document.querySelector("#add-stock-modal .produk");
    populateProductDropdown(produkData, addStockDropdown);
  });

  closeAddStockModalBtn.addEventListener("click", () => {
    addStockModal.style.display = "none";
  });

  addStockForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const produkId = document.getElementById("produk").value;
    const stokMasuk = document.getElementById("stok_masuk").value;
    console.log(produkId);
    console.log(stokMasuk);
    if (!produkId || !stokMasuk) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const productResponse = await fetch(
        `${apiUrl}/selectProdukById?id=${produkId}`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!productResponse.ok) {
        alert("Failed to fetch product data.");
        return;
      }

      const existingProduct = await productResponse.json();
      console.log("existingProduct:", existingProduct); // Add this line

      if (!existingProduct || Object.keys(existingProduct).length === 0) {
        console.error("No product data found for produkId:", produkId);
        alert("No product data found.");
        return;
      }

      const newStock = existingProduct.stok + parseInt(stokMasuk);

      const response = await fetch(`${apiUrl}/updateproduk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          produk_id: existingProduct.produk_id,
          nama: existingProduct.nama,
          stok: newStock,
          harga: existingProduct.harga,
          harga_beli: existingProduct.harga_beli,
          foto: existingProduct.foto,
          supplier: existingProduct.supplier,
        }),
      });

      if (response.ok) {
        addStockModal.style.display = "none";

        fetchProduk();
      } else {
        const errorData = await response.json();
        alert(`Failed to add stock: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("An error occurred while adding the stock.");
    }
  });

  const closeButtonStock = document.getElementById("closeBtnStock");

  closeButtonStock.addEventListener("click", function () {
    addStockModal.style.display = "none";
  });

  const stokSoldModal = document.getElementById("stok-sold-modal");
  const openStokSoldModalBtn = document.querySelector(".btn-outgoing"); // Assuming you have a class for the "Barang Terjual" button
  const closeStokSoldModalBtn = document.getElementById(
    "close-stok-sold-modal"
  );
  const stokSoldForm = document.getElementById("stok-sold-form");
  const soldItemsList = document.getElementById("sold-items-list");
  const addItemBtn = document.getElementById("add-item-btn");

  openStokSoldModalBtn.addEventListener("click", () => {
    stokSoldModal.style.display = "block";
    populateProductDropdown(
      produkData,
      document.querySelector("#stok-sold-modal .produk")
    );
  });

  closeStokSoldModalBtn.addEventListener("click", () => {
    stokSoldModal.style.display = "none";
  });

  addItemBtn.addEventListener("click", () => {
    const newItem = document.createElement("div");
    newItem.classList.add("sold-item");
    newItem.innerHTML = `
      <div class="form-group">
        <label for="produk">Pilih Produk:</label>
        <select class="produk" name="produk" required>
          <!-- Options will be dynamically added here -->
        </select>
      </div>
      <div class="form-group">
        <label for="stok_terjual">Stok Terjual:</label>
        <input type="number" class="stok_terjual" name="stok_terjual" required />
      </div>
      <button type="button" class="remove-item-btn">Hapus</button>
    `;
    soldItemsList.appendChild(newItem);

    populateProductDropdown(produkData, newItem.querySelector(".produk"));

    newItem.querySelector(".remove-item-btn").addEventListener("click", () => {
      newItem.remove();
    });
  });

  stokSoldForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const soldItems = soldItemsList.querySelectorAll(".sold-item");
    const items = [];

    soldItems.forEach((item) => {
      const produkId = item.querySelector(".produk").value;
      const stokTerjual = item.querySelector(".stok_terjual").value;

      items.push({
        produk_id: parseInt(produkId, 10),
        stok_keluar: parseInt(stokTerjual, 10),
      });
    });

    console.log("Items to send:", items);
    const jsonPayload = JSON.stringify(items);
    console.log("JSON Payload:", jsonPayload);

    if (items.length === 0) {
      alert("Please add at least one product to the sold items list.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/soldproduk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: jsonPayload,
      });

      if (response.ok) {
        stokSoldModal.style.display = "none";

        fetchProduk();
      } else {
        const errorData = await response.json();
        alert(
          `Failed to add sold items: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error adding sold items:", error);
      alert("An error occurred while adding the sold items.");
    }
  });

  const closeButtonStokSold = document.getElementById("closeBtnStokSold");

  closeButtonStokSold.addEventListener("click", function () {
    stokSoldModal.style.display = "none";
  });

  let produkData = [];

  async function readJsonFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const jsonData = await response.json();
      return jsonData;
    } catch (error) {
      console.error("Error reading JSON file:", error);
      return null;
    }
  }

  async function fetchProduk() {
    try {
      const response = await fetch(`${apiUrl}/selectproduk`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Produk data from API:", data);
      produkData = data;
      console.log("produkData after fetch:", produkData);

      renderProductList(produkData);
    } catch (error) {
      console.error("Error fetching produk:", error);
      const productList = document.getElementById("product-list");
      if (productList) {
        productList.innerHTML = `<div class="error-message">Failed to load products. Please check the API.</div>`;
      } else {
        console.error("Product list element not found in catch block!");
      }
    }
  }

  function renderProductList(products) {
    const productList = document.getElementById("product-list");
    if (!productList) {
      console.error("Product list element not found!");
      return;
    }
    productList.innerHTML = "";

    products.forEach((produk) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${produk.produk_id}</td>
        <td>${produk.nama}</td>
        <td><div class="product-image"><img src="/images/${produk.foto}" alt="${
        produk.nama
      }" width="50"></div></td>
        <td>${produk.stok}</td>
        <td>Rp ${produk.harga.toFixed(2)}</td>
        <td>${produk.supplier}</td>
        <td>
            <div class="action-btns">
              <div class="edit-btn">
                <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        viewBox="0 0 24 24"
                        style="margin-right: 5px"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                Edit
              </div>
              <div class="delete-btn">
                <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        viewBox="0 0 24 24"
                        style="margin-right: 5px"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                Delete
              </div>
            </div>
          </td>
      `;
      productList.appendChild(row);

      //tamabahan edit delete

      // Tambahkan event listener untuk delete
      const deleteBtn = row.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          const confirmDelete = confirm(
            `Yakin ingin menghapus produk ${produk.nama}?`
          );
          if (confirmDelete) {
            fetch(`/api/produk/${produk.produk_id}`, {
              method: "DELETE",
            })
              .then((response) => {
                if (response.ok) {
                  alert("Produk berhasil dihapus");
                  // Refresh daftar produk
                  fetchProducts(); // pastikan kamu punya fungsi ini untuk ambil ulang data
                } else {
                  alert("Gagal menghapus produk");
                }
              })
              .catch((error) => {
                console.error("Terjadi kesalahan:", error);
                alert("Terjadi kesalahan saat menghapus");
              });
          }
        });
      }

      // Tambahkan event listener untuk edit
      const editBtn = row.querySelector(".edit-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          // Misal kita munculkan modal edit
          openEditModal(produk); // pastikan kamu punya fungsi modal edit
        });
      }
    });
  }

  function populateProductDropdown(products, dropdown) {
    if (!dropdown) {
      console.error("Product dropdown element not found!");
      return;
    }

    dropdown.innerHTML = "";

    products.forEach((produk) => {
      const option = document.createElement("option");
      option.value = produk.produk_id;
      option.text = produk.nama;
      dropdown.appendChild(option);
    });
  }

  async function deleteProduk(produkId) {
    try {
      const response = await fetch(`${apiUrl}/deleteproduk/${produkId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (response.ok) {
        fetchProduk();
      } else {
        console.error("Failed to delete product:", response.status);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  }

  async function editProduk(produkId) {
    try {
      const response = await fetch(`${apiUrl}/editproduk/${produkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },

        body: JSON.stringify({
          nama: "New Name",
          stok: 10,
          harga: 10000,
          harga_beli: 8000,
          foto: "new_image_url.jpg",
          supplier: "New Supplier",
        }),
      });

      if (response.ok) {
        fetchProduk();
      } else {
        console.error("Failed to edit product:", response.status);
      }
    } catch (error) {
      console.error("Error editing product:", error);
    }

    console.log("Edit product with ID:", produkId);
  }

  const searchInput = document.getElementById("search-input");

  searchInput.addEventListener("input", function () {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = produkData.filter((produk) =>
      produk.nama.toLowerCase().includes(searchTerm)
    );
    renderProductList(filteredProducts);
  });

  initializeApiUrl().then(() => {
    initializeApiUrl();
    fetchProduk();
  });
});

//Bagian Absensi

// Membuka dan menutup modal
document.getElementById("open-absensi-modal").onclick = function () {
  document.getElementById("absensi-modal").style.display = "block";
  checkLocation(); // Otomatis memeriksa lokasi saat modal dibuka
};

document.getElementById("close-absensi-modal").onclick = function () {
  document.getElementById("absensi-modal").style.display = "none";
};

// Fungsi untuk menghitung jarak
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fungsi untuk memeriksa lokasi pengguna
let userLat, userLon;

function checkLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        userLat = position.coords.latitude;
        userLon = position.coords.longitude;

        document.getElementById("latitude").textContent = userLat.toFixed(6);
        document.getElementById("longitude").textContent = userLon.toFixed(6);

        // Lokasi kantor di Pakisaji, Malang
        const officeLat = -7.939997656264779;
        const officeLon = 112.6807606989787;

        const distance = getDistance(userLat, userLon, officeLat, officeLon);

        const statusEl = document.getElementById("status");
        if (distance <= 100) {
          statusEl.textContent = "✅ Anda berada di dalam area absensi.";
          statusEl.className = "success";
          document.getElementById("absen-button-container").style.display =
            "block"; // Menampilkan tombol absen
        } else {
          statusEl.textContent = "❌ Anda berada di luar area absensi.";
          statusEl.className = "danger";
          document.getElementById("absen-button-container").style.display =
            "none"; // Menyembunyikan tombol absen
        }
      },
      function () {
        alert("Gagal mendapatkan lokasi. Aktifkan GPS atau izinkan lokasi.");
      }
    );
  } else {
    alert("Browser Anda tidak mendukung Geolocation.");
  }
}

// // Fungsi untuk melakukan absensi
// function absen() {
//   // Simpan data absensi ke dalam database (menggunakan AJAX atau fetch ke server)

//   const absensiData = {
//     latitude: userLat,
//     longitude: userLon,
//     status: "Hadir",
//     timestamp: new Date().toISOString()
//   };

//   // Mengirim data absensi ke server menggunakan fetch
//   fetch('http://localhost:5050/addabsensi', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(absensiData)
//   })
//   .then(response => response.json())
//   .then(data => {
//     if (data.success) {
//       document.getElementById("absen-status").textContent = "✅ Absensi berhasil!";
//       document.getElementById("absen-status").className = "success";
//     } else {
//       document.getElementById("absen-status").textContent = "❌ Absensi gagal!";
//       document.getElementById("absen-status").className = "danger";
//     }
//   })
//   .catch(error => {
//     document.getElementById("absen-status").textContent = "❌ Terjadi kesalahan. Coba lagi.";
//     document.getElementById("absen-status").className = "danger";
//   });
// }

function absen() {
  const token = localStorage.getItem("authToken"); // Ambil token dari localStorage

  if (!token) {
    alert("Anda belum login!");
    window.location.href = "/login/login.html";
    return;
  }
  // Mendapatkan waktu dan tanggal saat ini
  const now = new Date();
  const tanggal = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const jamMasuk = now.toLocaleTimeString("en-GB", { hour12: false }); // Format: HH:MM:SS (24 jam)

  // Mendapatkan lokasi pengguna (latitude dan longitude)
  navigator.geolocation.getCurrentPosition(
    function (position) {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      const absensiData = {
        staff_id: 1, // Ganti dengan ID staf yang sesuai
        tanggal: tanggal,
        jam_masuk: jamMasuk,
        status: "Hadir",
        keterangan: "Absen pagi",
      };

      // Mengirim data absensi ke server menggunakan fetch
      fetch(`${apiUrl}/addabsensi`, {
        // Pastikan endpoint sesuai
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(absensiData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            document.getElementById("absen-status").textContent =
              "✅ Absensi berhasil!";
            document.getElementById("absen-status").className = "success";
          } else {
            document.getElementById("absen-status").textContent =
              "❌ Absensi gagal!";
            document.getElementById("absen-status").className = "danger";
          }
        })
        .catch((error) => {
          document.getElementById("absen-status").textContent =
            "❌ Terjadi kesalahan. Coba lagi.";
          document.getElementById("absen-status").className = "danger";
        });
    },
    function (error) {
      document.getElementById("absen-status").textContent =
        "❌ Tidak dapat mendeteksi lokasi.";
      document.getElementById("absen-status").className = "danger";
    }
  );
}
