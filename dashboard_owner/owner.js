document.addEventListener("DOMContentLoaded", function () {
  // Check if the user is logged in
  const token = localStorage.getItem("authToken");
  if (!token) {
    // Redirect to the login page if not logged in
    window.location.href = "/login/login.html"; // Replace with login page
    return; // Prevent further execution
  }

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
      const response = await fetch("http://localhost:5050/addproduk", {
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

  async function fetchProduk() {
    try {
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
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
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

  async function deleteProduk(produkId) {
    try {
      const response = await fetch(
        `http://localhost:5050/deleteproduk/${produkId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (response.ok) {
        // Refresh the product list
        fetchProduk();
      } else {
        console.error("Failed to delete product:", response.status);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  }

  async function editProduk(produkId) {
    // Implement edit functionality here
    try {
      const response = await fetch(
        `http://localhost:5050/editproduk/${produkId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },

          body: JSON.stringify({
            // Add the fields you want to edit
            nama: "New Name",
            stok: 10,
            harga: 10000,
            harga_beli: 8000,
            foto: "new_image_url.jpg",
            supplier: "New Supplier",
          }),
        }
      );

      if (response.ok) {
        // Refresh the product list
        fetchProduk();
      } else {
        console.error("Failed to edit product:", response.status);
      }
    } catch (error) {
      console.error("Error editing product:", error);
    }

    console.log("Edit product with ID:", produkId);
  }

  fetchProduk();
});
