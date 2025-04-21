document.addEventListener("DOMContentLoaded", function () {
  async function fetchProduk() {
    try {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDUyNTc3ODMsInVzZXJuYW1lIjoiZHdpa2kifQ.enMj3cZafCKpR5CD4HlCJ9gmQ7h6tYODPkQnmWLF9XU";
      const response = await fetch("http://localhost:5050/selectproduk", {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });
      console.log("Response status:", response.status);
      const produkData = await response.json();
      console.log("Produk data:", produkData);

      // Update stats cards
      //   document.getElementById("daily-sales").innerText = "Rp 2.5M"; // Replace with actual data
      //   document.getElementById("monthly-revenue").innerText = "Rp 75M"; // Replace with actual data
      //   document.getElementById("inventory-status").innerText =
      //     produkData.length + " Products";

      const productList = document.getElementById("product-list");
      if (!productList) {
        console.error("Product list element not found!");
        return;
      }
      productList.innerHTML = "";

      produkData.forEach((produk) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${produk.produk_id}</td>
          <td>${produk.nama}</td>
          <td><div class="product-image"><img src="${produk.foto}" alt="${
          produk.nama
        }" width="50"></div></td>
          <td>${produk.stok}</td>
          <td>Rp ${produk.harga.toFixed(2)}</td>
          <td>${produk.supplier}</td>
          <td>
              <div class="action-btns">
                <div class="edit-btn">
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
                <div class="delete-btn">
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
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1-2 2v2"
                    />
                  </svg>
                  Hapus
                </div>
              </div>
            </td>
        `;
        productList.appendChild(row);
      });
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

  fetchProduk();
});
