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

const openCustomerModal = document.getElementById("open-customer-modal");
const customerModal = document.getElementById("customer-modal");
const closeCustomerModal = document.getElementById("close-customer-modal");

openCustomerModal.addEventListener("click", () => {
  customerModal.style.display = "block";
});

closeCustomerModal.addEventListener("click", () => {
  customerModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === customerModal) {
    customerModal.style.display = "none";
  }
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
        const officeLat = -7.850200290575959;
        const officeLon = 112.69948133462827;

        const distance = getDistance(userLat, userLon, officeLat, officeLon);

        const statusEl = document.getElementById("status");
        if (distance <= 100000000000000000000000000000) {
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

function isTokenExpired(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));

    // Check if the token has an expiration time
    if (payload && payload.exp) {
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      // Check if the token is expired
      return currentTime > expiryTime;
    } else {
      // If the token doesn't have an expiration time, consider it invalid
      return true;
    }
  } catch (error) {
    // If there's an error decoding the token, consider it invalid
    console.error("Error decoding token:", error);
    return true;
  }
}

function absen() {
  const token = localStorage.getItem("authToken");
  const userid = localStorage.getItem("userid");

  // Get API URL from proper source
  const apiUrl = localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";

  // Use userid instead of undefined staffid variable
  console.log("Staff ID being used:", userid);

  if (!token || isTokenExpired(token)) {
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
        staff_id: parseInt(userid),
        tanggal: tanggal,
        jam_masuk: jamMasuk,
        status: "Hadir",
        keterangan: "Absen pagi",
      };

      console.log("Sending data:", JSON.stringify(absensiData));

      // Use the dynamic apiUrl
      fetch(`${apiUrl}/addabsensi`, {
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
            document.getElementById("absen-status").className = "success-2";
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

//customer member

document
  .getElementById("customer-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Anda belum login!");
      return;
    }

    const data = {
      nama: document.getElementById("nama").value,
      no_hp: document.getElementById("no_hp").value,
      email: document.getElementById("email").value,
      tanggal_daftar: document.getElementById("tanggal_daftar").value,
      point_member: parseInt(document.getElementById("point_member").value),
    };

    fetch(`${apiUrl}/addcustomer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success === "true") {
          alert("Customer berhasil ditambahkan!");
          document.getElementById("customer-modal").style.display = "none";
          document.getElementById("customer-form").reset();
        } else {
          alert("Gagal menambahkan customer.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
      });
  });

//

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("authToken");

  const apiUrl = localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";

  if (!token || isTokenExpired(token)) {
    window.location.href = "/login/login.html";
    return;
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
        <td><div class="product-image"><img src="${apiUrl}/images/${
        produk.foto
      }" 
            alt="${produk.nama}" width="50" 
            onerror="this.onerror=null; this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANtSURBVHic7ZpNaxNRFIafSdOvfKi1KoK14gcVRHRRNMY/UNCNWrcu3Lh0JbgQROjCnYuCv8ClaF2L4KIIIgqKH9UWamurbcHaJJqatzk3TszEmcmZO3NnmswDL4FC7nvPeTI595wzbkBRFEVRFEVRlHLDAxaAH0AcSCop/UjHvCiGkfXAO66MgwK4Dqz7k48CzfgTuQMcB/YCLqCWqAbm5diPwAXZ7iQ5AX4CJ2RbMXk6HiVn/vEiO1MqJoFfwJZiOVQsNgEpYLxYjhSRadQV/pu9wCbgfbGdKRIvkWV5R7EdKRaHEJN3QzrjTFyBmaCnwE7gGnCV/B9Qm4F+4CrQYNK/TuAtcAZYMumDrRwBPoWHwLgch334f0yzK0EkS2xF3qKZBHAHuIl/Sm4CTiXkB3AImDDpg63UIrfzCnAPf62xPLADJoC0PLPZ5MUztQ44iQz+ALDBhC+2IQvMH8A2i+6fKsCfALBz8JEQv82CRCLfIz0OHLVw/S0FuBMI1wgnLfgXaKpC6l8x4FYO8WXgWj5fWoHRDNcYLuB+gaEu/TFMKDiSZxvvA5vTnFsiYK3A08I9DAzVWdigI2OTicAQcAA4k+WakcAdh4YzriedaXDPqUGrgaeZBgdbkBp9qt59DpQAR0uDztwyBHSjD8JA0gFcRFaNqht8gNgA9CEf1i/lgEKmwTuRFHdrBvEtSFq8H1husy/lxDIkRvuQGmZQqEcSIheAd1nEn/PJDgLPbfClHPmMBI7DiMmMb0Q2MmKSKcpkvB2JwdvAByz4PIdMd14LjgWReqALGfdLDPuScZAqJmPA7mzDroaYaegDRgKDvfUZ/LUTS/4QcBO4jRWTW9K8+oKsLJ6kx4EUkk7HSj5sT9NqjGwC/C0tScV6JLANp72JHZNbVsR3yA0i6U6Uvmsc6EGSrUCRdQcojKQavcDD9IdZGeAQUnh4iDweO4A9SP0xFsQbBIaFuJVVQP8HBZDE6YeQVvJVkaSJo1oqgAoAKoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKABVQAFWtAOoG1lloh6cajJJmxXMgJq3kX1bIQhnJAVtLPXiABuSngMVu/pId8zRa9kdRFEVRFEVRHM9fBnWbxULiR8UAAAAASUVORK5CYII='"></div></td>
        <td>${produk.stok}</td>
        <td>Rp ${produk.harga.toFixed(2)}</td>
        <td>${produk.supplier}</td>
        <td>
            <div class="action-btns">
              <!-- buttons -->
            </div>
        </td>
      `;
      productList.appendChild(row);
    });
  }

  // Function to check if the token is expired

  // Get references to the modal and button elements
  const modal = document.getElementById("add-product-modal");
  const openModalBtn = document.getElementById("open-add-modal");
  const closeModalBtn = document.getElementById("close-add-modal");
  const addProductForm = document.getElementById("add-product-form");

  // Function to open the modal
  openModalBtn.addEventListener("click", () => {
    modal.style.display = "block";
  });

  // Function to close the modal
  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Function to handle form submission
  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get form values
    const nama = document.getElementById("nama").value;
    const stok = document.getElementById("stok").value;
    const harga = document.getElementById("harga").value;
    const harga_beli = document.getElementById("harga_beli").value;
    const foto = document.getElementById("foto").value;
    const supplier = document.getElementById("supplier").value;

    // Validate form values
    if (!nama || !stok || !harga || !harga_beli || !foto || !supplier) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Send a POST request to the add product API
      const response = await fetch(`${apiUrl}/addproduk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          nama: nama, // Use "name" instead of "nama"
          stok: parseInt(stok), // Parse as integer
          harga: parseFloat(harga), // Parse as float
          harga_beli: parseFloat(harga_beli), // Parse as float
          foto: foto,
          supplier: supplier,
        }),
      });

      if (response.ok) {
        // Close the modal
        showSuccessAlert("Produk baru berhasil ditambahkan.");

        modal.style.display = "none";

        // Refresh the product list
        fetchProduk();
      } else {
        // Display an error message
        const errorData = await response.json();
        alert(`Failed to add product: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      // Display an error message
      console.error("Error adding product:", error);
      alert("An error occurred while adding the product.");
    }
  });

  // close button
  const closeButton = document.getElementById("closeBtn");

  closeButton.addEventListener("click", function () {
    // Close the modal
    modal.style.display = "none";
  });

  // Get references to the modal and button elements for adding stock
  const addStockModal = document.getElementById("add-stock-modal");
  const openAddStockModalBtn = document.getElementById("open-add-stock-modal");
  const closeAddStockModalBtn = document.getElementById(
    "close-add-stock-modal"
  );
  const addStockForm = document.getElementById("add-stock-form");

  // Function to open the add stock modal
  openAddStockModalBtn.addEventListener("click", () => {
    addStockModal.style.display = "block";
    const addStockDropdown = document.querySelector("#add-stock-modal .produk");
    populateProductDropdown(produkData, addStockDropdown);
  });

  // Function to close the add stock modal
  closeAddStockModalBtn.addEventListener("click", () => {
    addStockModal.style.display = "none";
  });

  // Function to handle add stock form submission
  addStockForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get form values
    const produkId = document.getElementById("produk").value;
    const stokMasuk = document.getElementById("stok_masuk").value;
    console.log(produkId);
    console.log(stokMasuk);
    // Validate form values
    if (!produkId || !stokMasuk) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Fetch the existing product data
      const productResponse = await fetch(
        `${apiUrl}/selectProdukById?id=${produkId}`, // Corrected URL
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

      // Update the stock
      const newStock = existingProduct.stok + parseInt(stokMasuk);

      // Send the updated product data
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
        // Close the modal
        addStockModal.style.display = "none";
        //showSuccessAlert("Stok berhasil ditambahkan.");

        // Refresh the product list
        fetchProduk();
        triggerSmartInventoryRefresh(); // ADD THIS LINE
      } else {
        // Display an error message
        const errorData = await response.json();
        alert(`Failed to add stock: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      // Display an error message
      console.error("Error adding stock:", error);
      alert("An error occurred while adding the stock.");
    }
  });

  // close button for add stock modal
  const closeButtonStock = document.getElementById("closeBtnStock");

  closeButtonStock.addEventListener("click", function () {
    // Close the modal
    addStockModal.style.display = "none";
  });

  // Get references to the modal and button elements for stok sold
  const stokSoldModal = document.getElementById("stok-sold-modal");
  const openStokSoldModalBtn = document.querySelector(".btn-outgoing"); // Assuming you have a class for the "Barang Terjual" button
  const closeStokSoldModalBtn = document.getElementById(
    "close-stok-sold-modal"
  );
  const stokSoldForm = document.getElementById("stok-sold-form");
  const soldItemsList = document.getElementById("sold-items-list");
  const addItemBtn = document.getElementById("add-item-btn");

  // Function to open the stok sold modal
  openStokSoldModalBtn.addEventListener("click", () => {
    stokSoldModal.style.display = "block";
    // Populate the product dropdown when the modal is opened
    populateProductDropdown(
      produkData,
      document.querySelector("#stok-sold-modal .produk")
    );
  });

  // Function to close the stok sold modal
  closeStokSoldModalBtn.addEventListener("click", () => {
    stokSoldModal.style.display = "none";
  });

  // Function to add a new product item to the sold items list
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

    // Populate the product dropdown in the new item
    populateProductDropdown(produkData, newItem.querySelector(".produk"));

    // Add event listener to the remove button
    newItem.querySelector(".remove-item-btn").addEventListener("click", () => {
      newItem.remove();
    });
  });

  // Function to handle stok sold form submission
  // Function to handle stok sold form submission
  stokSoldForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get all sold items
    const soldItems = soldItemsList.querySelectorAll(".sold-item");
    const items = [];

    soldItems.forEach((item) => {
      const produkId = item.querySelector(".produk").value;
      const stokTerjual = item.querySelector(".stok_terjual").value;
      const selectedOption = item.querySelector(".produk").selectedOptions[0];
      const namaProduk = selectedOption.text;

      const product = produkData.find((p) => p.produk_id == produkId);
      if (!product) {
        alert(`Product with ID ${produkId} not found.`);
        return;
      }
      const harga = product.harga;

      items.push({
        produk_id: parseInt(produkId, 10),
        nama_produk: namaProduk,
        harga: harga,
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

    const token = localStorage.getItem("authToken");
    console.log("Token:", token);

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
        console.log("Sold items submitted successfully");

        // Close the modal first
        stokSoldModal.style.display = "none";

        // Show success message

        try {
          // Refresh the product list
          await fetchProduk();
          console.log("Product list refreshed");
        } catch (refreshError) {
          console.error("Error refreshing product list:", refreshError);
        }

        try {
          // Refresh sales data
          await fetchDailySales();
          await fetchWeeklySales();
          console.log("Sales data refreshed");
        } catch (salesError) {
          console.error("Error refreshing sales data:", salesError);
        }

        try {
          // Trigger Smart Inventory refresh
          triggerSmartInventoryRefresh();
          console.log("Smart Inventory refresh triggered");
        } catch (smartError) {
          console.error(
            "Error triggering Smart Inventory refresh:",
            smartError
          );
        }

        // Clear the sold items list
        soldItemsList.innerHTML = `
        <div class="sold-item">
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
        </div>
      `;

        // Repopulate the dropdown in the cleared form
        const newDropdown = soldItemsList.querySelector(".produk");
        if (newDropdown && produkData) {
          populateProductDropdown(produkData, newDropdown);
        }
      } else {
        // Display an error message for failed API call
        const errorData = await response.json();
        console.error("API Error:", errorData);
        alert(
          `Failed to add sold items: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      // This catch block handles network errors or JSON parsing errors
      console.error("Network/Parse error adding sold items:", error);
      alert(
        "A network error occurred while adding the sold items. Please check your connection and try again."
      );
    }
  });
  // close button for stok sold modal
  const closeButtonStokSold = document.getElementById("closeBtnStokSold");

  closeButtonStokSold.addEventListener("click", function () {
    // Close the modal
    stokSoldModal.style.display = "none";
  });

  let produkData = [];

  // Function to read the JSON file
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

  async function initializeApiUrl() {
    const envData = await readJsonFile("/json/env.json");
    if (envData && envData.api_url) {
      localStorage.setItem("apiUrl", envData.api_url);
      window.apiUrl = envData.api_url; // Make it global
    } else {
      console.warn("Failed to read API URL from JSON, using default");
    }
  }

  // Generate sample data for testing
  function generateSampleSalesData() {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      data.push({
        date: date.toISOString().split("T")[0],
        sales: Math.floor(Math.random() * 2000000) + 500000,
      });
    }

    return data;
  }

  // Function to update the sales chart
  function updateSalesChart(data) {
    const miniChart = document.querySelector(
      ".stat-card:first-child .mini-chart"
    );

    miniChart.innerHTML = "";

    const maxSales = Math.max(...data.map((day) => day.sales));

    // Create bars for each day
    data.forEach((day) => {
      const heightPercentage = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;

      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.height = `${heightPercentage}%`;

      // Add tooltip with date and sales amount
      bar.setAttribute(
        "title",
        `${formatDate(day.date)}: ${formatCurrency(day.sales)}`
      );

      miniChart.appendChild(bar);
    });
  }

  // Helper function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  // Function to fetch monthly revenue data
  async function fetchMonthlyRevenue() {
    try {
      const response = await fetch(`${apiUrl}/monthlysales`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Monthly revenue data:", data);

      // Update the monthly revenue card
      updateMonthlyRevenueCard(data);
    } catch (error) {
      console.error("Error fetching monthly revenue:", error);
      // Set default values if API call fails
      updateMonthlyRevenueCard({
        month: new Date().toLocaleString("default", { month: "long" }),
        year: new Date().getFullYear(),
        totalRevenue: 0,
      });
    }
  }

  // Function to update the monthly revenue card with real data
  function updateMonthlyRevenueCard(data) {
    console.log("updateMonthlyRevenueCard called with data:", data);
    const monthlyRevenueValue = document.querySelector(
      ".stat-card:nth-child(2) .stat-value"
    );
    const monthlyRevenueDate = document.querySelector(
      ".stat-card:nth-child(2) .stat-date"
    );

    // Check if data is valid
    if (!data || typeof data.totalRevenue !== "number") {
      console.error("Invalid data for monthly revenue:", data);
      return;
    }

    // Format the revenue value as currency
    const formattedRevenue = formatCurrency(data.totalRevenue || 0);

    // Update the card content
    monthlyRevenueValue.textContent = formattedRevenue;

    // Update the date (month and year)
    monthlyRevenueDate.textContent = `${data.month} ${data.year}`;
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
      const data = await response.json(); // Store the product data
      console.log("Produk data from API:", data);
      produkData = data;
      console.log("produkData after fetch:", produkData); // Add this line

      renderProductList(produkData); // Render the product list
    } catch (error) {
      console.error("Error fetching produk:", error);
      const productList = document.getElementById("product-list");
      if (productList) {
        productList.innerHTML = `<div class="error-message">Failed to load products. Please check the API.</div>`;
      } else {
        console.error("Product list element not found in catch block!");
      }
    }

    // After successfully fetching products, trigger update
    if (window.triggerStockChange) {
      window.triggerStockChange("products_loaded");
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
  <td><div class="product-image"><img src="${apiUrl}/images/${produk.foto}" 
      alt="${produk.nama}" width="50" 
      onerror="this.onerror=null; this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANtSURBVHic7ZpNaxNRFIafSdOvfKi1KoK14gcVRHRRNMY/UNCNWrcu3Lh0JbgQROjCnYuCv8ClaF2L4KIIIgqKH9UWamurbcHaJJqatzk3TszEmcmZO3NnmswDL4FC7nvPeTI595wzbkBRFEVRFEVRlHLDAxaAH0AcSCop/UjHvCiGkfXAO66MgwK4Dqz7k48CzfgTuQMcB/YCLqCWqAbm5diPwAXZ7iQ5AX4CJ2RbMXk6HiVn/vEiO1MqJoFfwJZiOVQsNgEpYLxYjhSRadQV/pu9wCbgfbGdKRIvkWV5R7EdKRaHEJN3QzrjTFyBmaCnwE7gGnCV/B9Qm4F+4CrQYNK/TuAtcAZYMumDrRwBPoWHwLgch334f0yzK0EkS2xF3qKZBHAHuIl/Sm4CTiXkB3AImDDpg63UIrfzCnAPf62xPLADJoC0PLPZ5MUztQ44iQz+ALDBhC+2IQvMH8A2i+6fKsCfALBz8JEQv82CRCLfIz0OHLVw/S0FuBMI1wgnLfgXaKpC6l8x4FYO8WXgWj5fWoHRDNcYLuB+gaEu/TFMKDiSZxvvA5vTnFsiYK3A08I9DAzVWdigI2OTicAQcAA4k+WakcAdh4YzriedaXDPqUGrgaeZBgdbkBp9qt59DpQAR0uDztwyBHSjD8JA0gFcRFaNqht8gNgA9CEf1i/lgEKmwTuRFHdrBvEtSFq8H1husy/lxDIkRvuQGmZQqEcSIheAd1nEn/PJDgLPbfClHPmMBI7DiMmMb0Q2MmKSKcpkvB2JwdvAByz4PIdMd14LjgWReqALGfdLDPuScZAqJmPA7mzDroaYaegDRgKDvfUZ/LUTS/4QcBO4jRWTW9K8+oKsLJ6kx4EUkk7HSj5sT9NqjGwC/C0tScV6JLANp72JHZNbVsR3yA0i6U6Uvmsc6EGSrUCRdQcojKQavcDD9IdZGeAQUnh4iDweO4A9SP0xFsQbBIaFuJVVQP8HBZDE6YeQVvJVkaSJo1oqgAoAKoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKACoAqACgAoAKABVQAFWtAOoG1lloh6cajJJmxXMgJq3kX1bIQhnJAVtLPXiABuSngMVu/pId8zRa9kdRFEVRFEVRHM9fBnWbxULiR8UAAAAASUVORK5CYII='"></div></td>
  <td>${produk.stok}</td>
  <td>Rp ${produk.harga.toFixed(2)}</td>
  <td>${produk.supplier}</td>
  <td>
      <div class="action-btns">
        <div class="edit-btn" data-produk-id="${produk.produk_id}">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
          >
            <path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            />
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            />
          </svg>
          Edit
        </div>
        <div class="delete-btn" data-produk-id="${produk.produk_id}">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            />
          </svg>
          Hapus
        </div>
      </div>
    </td>
  `;
      productList.appendChild(row);

      // Add event listeners to the edit and delete buttons
      const editBtn = row.querySelector(".edit-btn");
      const deleteBtn = row.querySelector(".delete-btn");

      editBtn.addEventListener("click", () => {
        const produkId = editBtn.dataset.produkId;

        openEditModal(produkId);
      });

      deleteBtn.addEventListener("click", () => {
        const produkId = deleteBtn.dataset.produkId;
        deleteProduk(produkId);
      });
    });
  }

  async function openEditModal(produkId) {
    try {
      // Fetch the product data
      const response = await fetch(
        `${apiUrl}/selectProdukById?id=${produkId}`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!response.ok) {
        alert("Failed to fetch product data.");
        return;
      }

      const produk = await response.json();

      // Get references to the edit modal and form elements
      const editModal = document.getElementById("edit-product-modal");
      const editForm = document.getElementById("edit-product-form");

      // Populate the form with the product data
      editForm.querySelector("#edit_produk_id").value = produk.produk_id;
      editForm.querySelector("#edit_nama").value = produk.nama;
      editForm.querySelector("#edit_stok").value = produk.stok;
      editForm.querySelector("#edit_harga").value = produk.harga;
      editForm.querySelector("#edit_harga_beli").value = produk.harga_beli;
      editForm.querySelector("#edit_foto").value = produk.foto;
      editForm.querySelector("#edit_supplier").value = produk.supplier;

      // Display the edit modal
      editModal.style.display = "block";
    } catch (error) {
      console.error("Error opening edit modal:", error);
      alert("An error occurred while opening the edit modal.");
    }
  }

  function populateProductDropdown(products, dropdown) {
    if (!dropdown) {
      console.error("Product dropdown element not found!");
      return;
    }

    // Clear existing options
    dropdown.innerHTML = "";

    // Add default option FIRST
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Pilih Produk --";
    dropdown.appendChild(defaultOption);

    // Add options for each product
    products.forEach((produk) => {
      const option = document.createElement("option");
      option.value = produk.produk_id;
      option.textContent = `${produk.nama} (Stock: ${produk.stok})`;
      dropdown.appendChild(option);
    });

    console.log("Dropdown populated with", products.length, "products");
  }

  async function deleteProduk(produkId) {
    // Add confirmation dialog
    const confirmation = confirm(
      "Apakah Anda yakin ingin menghapus produk ini?"
    );
    if (!confirmation) {
      return; // Do nothing if the user cancels
    }

    try {
      const response = await fetch(`${apiUrl}/deleteproduk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          produk_id: parseInt(produkId),
        }),
      });

      if (response.ok) {
        // Refresh the product list
        fetchProduk();
        showSuccessAlert("Produk berhasil dihapus.");
      } else {
        console.error("Failed to delete product:", response.status);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  }

  const searchInput = document.getElementById("search-input");

  // Add an event listener to the search input
  searchInput.addEventListener("input", function () {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = produkData.filter((produk) =>
      produk.nama.toLowerCase().includes(searchTerm)
    );
    renderProductList(filteredProducts);
  });

  btnHistory = document.querySelector(".btn-history");
  btnHistory.addEventListener("click", function () {
    // Redirect to the history page
    window.location.href = "/dashboard_owner/history/history.html"; // Replace with the actual path to your history page
  });

  // Function to fetch inventory status data
  async function fetchInventoryStatus() {
    try {
      const response = await fetch(`${apiUrl}/inventorystatus`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Inventory status data:", data);

      // Update the inventory status card
      updateInventoryStatusCard(data);
    } catch (error) {
      console.error("Error fetching inventory status:", error);
      // Set default values if API call fails
      updateInventoryStatusCard({
        totalProducts: 0,
      });
    }
  }

  // Function to update the inventory status card with real data
  function updateInventoryStatusCard(data) {
    console.log("updateInventoryStatusCard called with data:", data);
    const inventoryStatusValue = document.querySelector(
      ".stat-card:nth-child(3) .stat-value"
    );
    const inventoryStatusDate = document.querySelector(
      ".stat-card:nth-child(3) .stat-date"
    );

    // Check if data is valid
    if (!data || typeof data.totalProducts !== "number") {
      console.error("Invalid data for inventory status:", data);
      return;
    }

    // Update the card content
    inventoryStatusValue.textContent = `${data.totalProducts} Products`;

    // Update the date (current date)
    const today = new Date();
    const options = { day: "numeric", month: "long", year: "numeric" };
    inventoryStatusDate.textContent = `Updated ${today.toLocaleDateString(
      "en-US",
      options
    )}`;
  }

  // Initialize everything
  // Add this to your existing staff.js file in the initializeDashboard function

  // Update your initializeDashboard function

  async function initializeDashboard() {
    console.log("🚀 Starting dashboard initialization...");

    try {
      await initializeApiUrl();
      await fetchProduk();

      // ✅ Initialize Smart Inventory FIRST
      await initializeSmartInventoryIntegration();

      // ✅ Wait for Smart Inventory to create its dashboard
      await new Promise((resolve) => {
        const checkDashboard = () => {
          if (document.querySelector(".smart-inventory-dashboard")) {
            resolve();
          } else {
            setTimeout(checkDashboard, 500);
          }
        };
        checkDashboard();
      });

      // ✅ Then enhance with expandable functionality
      if (!window.expandableSmartInventory) {
        window.expandableSmartInventory = new ExpandableSmartInventory();
        await window.expandableSmartInventory.initialize();

        // Update preview with current data
        if (produkData) {
          window.expandableSmartInventory.updatePreviewStats(produkData);
        }
      }

      console.log("✅ Dashboard initialization complete");
    } catch (error) {
      console.error("❌ Dashboard initialization failed:", error);
    }
  }

  // Enhanced refresh function
  function triggerSmartInventoryRefresh() {
    console.log("🔄 Triggering Smart Inventory refresh...");

    if (window.expandableSmartInventory) {
      // Update preview stats
      if (window.produkData) {
        window.expandableSmartInventory.updatePreviewStats(window.produkData);
      }
    }

    if (window.smartInventorySystem) {
      setTimeout(async () => {
        try {
          window.smartInventorySystem.products = window.produkData;
          await window.smartInventorySystem.updateDashboard();
          console.log("✅ Smart Inventory refreshed after stock change");
        } catch (error) {
          console.error("❌ Error refreshing Smart Inventory:", error);
        }
      }, 1000);
    }
  }

  // Call initializeDashboard instead of just initializeApiUrl
  initializeDashboard();

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    modal.querySelector(".modal-content").style.opacity = "0";
    modal.querySelector(".modal-content").style.transform = "translateY(-20px)";
    setTimeout(() => {
      modal.style.display = "none";
    }, 300); // Match this with your transition speed
  });

  openModalBtn.addEventListener("click", () => {
    modal.style.display = "block";
    modal.classList.add("show");
    setTimeout(() => {
      modal.querySelector(".modal-content").style.opacity = "1";
      modal.querySelector(".modal-content").style.transform = "translateY(0)";
    }, 10);
  });

  setInterval(() => {
    fetchDailySales();
    fetchWeeklySales();
    fetchMonthlyRevenue();
    fetchInventoryStatus();
  }, 60000); // Refresh every 60 seconds (1 minute)

  // Get references to the edit modal and form elements
  const editModal = document.getElementById("edit-product-modal");
  const editForm = document.getElementById("edit-product-form");

  // Function to close the edit modal
  function closeEditModal() {
    editModal.style.display = "none";
  }

  // Add event listener to the close button
  document
    .getElementById("close-edit-modal")
    .addEventListener("click", closeEditModal);

  // Add event listener to the close button
  document.getElementById("closeBtnEdit").addEventListener("click", () => {
    editModal.style.display = "none";
  });

  // Function to handle edit product form submission
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get form values
    const produkId = document.getElementById("edit_produk_id").value;
    const nama = document.getElementById("edit_nama").value;
    const stok = document.getElementById("edit_stok").value;
    const harga = document.getElementById("edit_harga").value;
    const harga_beli = document.getElementById("edit_harga_beli").value;
    const foto = document.getElementById("edit_foto").value;
    const supplier = document.getElementById("edit_supplier").value;

    // Validate form values
    if (!nama || !stok || !harga || !harga_beli || !foto || !supplier) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Send a PUT request to the update product API
      const response = await fetch(`${apiUrl}/updateproduk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          produk_id: parseInt(produkId),
          nama: nama,
          stok: parseInt(stok),
          harga: parseFloat(harga),
          harga_beli: parseFloat(harga_beli),
          foto: foto,
          supplier: supplier,
        }),
      });

      if (response.ok) {
        // Close the modal
        // showSuccessAlert("");

        editModal.style.display = "none";

        // Refresh the product list
        fetchProduk();
        triggerSmartInventoryRefresh(); // ADD THIS LINE
      } else {
        // Display an error message
        const errorData = await response.json();
        alert(
          `Failed to update product: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      // Display an error message
      console.error("Error updating product:", error);
      alert("An error occurred while updating the product.");
    }
  });

  // Add these missing functions before the setInterval call

  // Function to fetch daily sales data
  async function fetchDailySales() {
    try {
      const apiUrl =
        localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${apiUrl}/dailysales`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Daily sales data:", data);

      // Update the daily sales chart or display
      updateSalesChart(data);
    } catch (error) {
      console.error("Error fetching daily sales:", error);
      // Use sample data if API call fails
      const sampleData = generateSampleSalesData();
      updateSalesChart(sampleData);
    }
  }

  // Function to fetch weekly sales data
  async function fetchWeeklySales() {
    try {
      const apiUrl =
        localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${apiUrl}/weeklysales`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Weekly sales data:", data);

      // Update weekly sales display if you have one
      // updateWeeklySalesDisplay(data);
    } catch (error) {
      console.error("Error fetching weekly sales:", error);
    }
  }

  // Helper function to format currency (if not already defined)
  function formatCurrency(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function showSuccessAlert(message) {
    showAlert(message, "success");
  }

  function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll(".alert");
    existingAlerts.forEach((alert) => {
      alert.remove();
    });

    const alertElement = document.createElement("div");
    alertElement.className = `alert ${type}-alert`;
    alertElement.innerHTML = `
      <div class="alert-content">
        <span class="alert-icon">
          ${type === "success" ? "✓" : "⚠"}
        </span>
        <span class="alert-message">${message}</span>
      </div>
      <button class="close-alert">&times;</button>
    `;

    document.body.appendChild(alertElement);

    // Add close button functionality
    alertElement.querySelector(".close-alert").addEventListener("click", () => {
      alertElement.remove();
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.remove();
      }
    }, 5000);
  }

  async function initializeSmartInventoryIntegration() {
    console.log("🤖 Initializing Smart Inventory Integration...");

    try {
      // Wait for TensorFlow to be available
      if (typeof tf === "undefined") {
        console.log("⏳ Waiting for TensorFlow.js to load...");
        await waitForTensorFlow();
      }

      // Check if Smart Inventory classes are available
      if (typeof OptimizedMultiEnsembleAISystem === "undefined") {
        console.error("❌ Smart Inventory classes not found!");
        console.log("📝 Loading Smart Inventory script...");

        // Dynamically load the smart inventory script if not loaded
        await loadSmartInventoryScript();
      }

      // Initialize the AI system
      console.log("🚀 Creating Smart Inventory System...");
      window.smartInventorySystem = new OptimizedMultiEnsembleAISystem();

      // Make products available to the system
      if (produkData && produkData.length > 0) {
        window.smartInventorySystem.products = produkData;
        console.log(
          `📦 Loaded ${produkData.length} products into Smart Inventory`
        );
      }

      // Initialize the system
      await window.smartInventorySystem.initialize();

      console.log("✅ Smart Inventory System initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Smart Inventory:", error);
      console.log("🔄 Retrying in 3 seconds...");
      setTimeout(initializeSmartInventoryIntegration, 3000);
    }
  }

  async function loadSmartInventoryScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/dashboard_staff/Js/smart-inventory.js";
      script.onload = () => {
        console.log("✅ Smart Inventory script loaded");
        resolve();
      };
      script.onerror = () => {
        console.error("❌ Failed to load Smart Inventory script");
        reject(new Error("Failed to load smart-inventory.js"));
      };
      document.head.appendChild(script);
    });
  }

  // Enhanced Face Attendance Integration
  document.addEventListener("DOMContentLoaded", function () {
    function isTokenExpired(token) {
      try {
        const payloadBase64 = token.split(".")[1];
        const payload = JSON.parse(atob(payloadBase64));

        // Check if the token has an expiration time
        if (payload && payload.exp) {
          const expiryTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();

          // Check if the token is expired
          return currentTime > expiryTime;
        } else {
          // If the token doesn't have an expiration time, consider it invalid
          return true;
        }
      } catch (error) {
        // If there's an error decoding the token, consider it invalid
        console.error("Error decoding token:", error);
        return true;
      }
    }

    if (!token || isTokenExpired(token)) {
      window.location.href = "/login/login.html";
      return;
    }
    // Enhanced attendance option switching
    const manualAttendanceBtn = document.getElementById(
      "manual-attendance-btn"
    );
    const faceAttendanceBtn = document.getElementById("face-attendance-btn");
    const manualAttendanceSection = document.getElementById(
      "manual-attendance-section"
    );
    const faceAttendanceSection = document.getElementById(
      "face-attendance-section"
    );

    // Initialize attendance system
    let currentAttendanceMode = "manual";

    if (manualAttendanceBtn && faceAttendanceBtn) {
      manualAttendanceBtn.addEventListener("click", function () {
        switchAttendanceMode("manual");
      });

      faceAttendanceBtn.addEventListener("click", function () {
        switchAttendanceMode("face");
      });
    }

    function switchAttendanceMode(mode) {
      currentAttendanceMode = mode;

      if (mode === "manual") {
        manualAttendanceBtn.classList.add("active");
        faceAttendanceBtn.classList.remove("active");

        if (manualAttendanceSection)
          manualAttendanceSection.style.display = "block";
        if (faceAttendanceSection) faceAttendanceSection.style.display = "none";

        // Stop camera if running
        if (window.faceAttendanceSystem) {
          window.faceAttendanceSystem.stopCamera();
        }
      } else if (mode === "face") {
        faceAttendanceBtn.classList.add("active");
        manualAttendanceBtn.classList.remove("active");

        if (faceAttendanceSection)
          faceAttendanceSection.style.display = "block";
        if (manualAttendanceSection)
          manualAttendanceSection.style.display = "none";

        // Initialize face attendance if not already done
        initializeFaceAttendance();
      }
    }

    async function initializeFaceAttendance() {
      try {
        // Check if face attendance system is available
        if (typeof FaceAttendanceSystem === "undefined") {
          console.error("Face attendance system not loaded");
          updateFaceStatus("Face attendance system not available", "danger");
          return;
        }

        // Initialize or get existing instance
        if (!window.faceAttendanceSystem) {
          window.faceAttendanceSystem = new FaceAttendanceSystem();
        }

        // Initialize camera
        const initialized =
          await window.faceAttendanceSystem.initializeCamera();
        if (!initialized) {
          updateFaceStatus("Failed to initialize camera", "danger");
        }
      } catch (error) {
        console.error("Error initializing face attendance:", error);
        updateFaceStatus("Error initializing face attendance", "danger");
      }
    }

    function updateFaceStatus(message, type = "info") {
      const statusElement = document.getElementById("face-status");
      if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
      }
    }

    // Enhanced modal opening with proper initialization
    document.getElementById("open-absensi-modal").onclick = function () {
      const modal = document.getElementById("absensi-modal");
      modal.style.display = "block";

      // Reset to manual mode by default
      switchAttendanceMode("manual");

      // Check location for manual attendance
      checkLocation();
    };

    // Enhanced modal closing with cleanup
    document.getElementById("close-absensi-modal").onclick = function () {
      const modal = document.getElementById("absensi-modal");
      modal.style.display = "none";

      // Cleanup face attendance system
      if (window.faceAttendanceSystem) {
        window.faceAttendanceSystem.stopCamera();
      }
    };
  });

  function waitForTensorFlow() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 25 seconds max wait

      const checkTensorFlow = () => {
        attempts++;
        if (typeof tf !== "undefined") {
          console.log("✅ TensorFlow.js loaded");
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error("❌ TensorFlow.js failed to load after 25 seconds");
          reject(new Error("TensorFlow.js not available"));
        } else {
          setTimeout(checkTensorFlow, 500);
        }
      };

      checkTensorFlow();
    });
  }
  // Add this after your fetchProduk function
  function triggerSmartInventoryRefresh() {
    console.log("🔄 Triggering Smart Inventory refresh...");

    if (window.expandableSmartInventory) {
      // Update preview stats
      if (window.produkData) {
        window.expandableSmartInventory.updatePreviewStats(window.produkData);
      }
    }

    if (window.smartInventorySystem) {
      setTimeout(async () => {
        try {
          window.smartInventorySystem.products = window.produkData;
          await window.smartInventorySystem.updateDashboard();
          console.log("✅ Smart Inventory refreshed after stock change");
        } catch (error) {
          console.error("❌ Error refreshing Smart Inventory:", error);
        }
      }, 1000);
    }
  }
});
