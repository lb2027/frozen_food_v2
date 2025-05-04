document.addEventListener("DOMContentLoaded", function () {
  // Check if the user is logged in
  const token = localStorage.getItem("authToken");

  // Function to check if the token is expired
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
    // Redirect to the login page if not logged in or token is expired
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

        // Refresh the product list
        fetchProduk();
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
  stokSoldForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get all sold items
    const soldItems = soldItemsList.querySelectorAll(".sold-item");
    const items = [];

    soldItems.forEach((item) => {
      const produkId = item.querySelector(".produk").value;
      const stokTerjual = item.querySelector(".stok_terjual").value;
      const selectedOption = item.querySelector(".produk").selectedOptions[0];
      const namaProduk = selectedOption.text; // Get the product name from the dropdown text
      // You might need to fetch the price from the database or store it in the dropdown
      // For simplicity, let's assume you have a way to get the price based on the product ID
      const harga = produkData.find((p) => p.produk_id == produkId).harga;

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

    try {
      // Send a POST request to the sold items API
      const response = await fetch(`${apiUrl}/soldproduk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: jsonPayload,
      });

      if (response.ok) {
        // Close the modal
        stokSoldModal.style.display = "none";

        // Refresh the product list
        fetchProduk();
      } else {
        // Display an error message
        const errorData = await response.json();
        alert(
          `Failed to add sold items: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      // Display an error message
      console.error("Error adding sold items:", error);
      alert("An error occurred while adding the sold items.");
    }
  });

  // close button for stok sold modal
  const closeButtonStokSold = document.getElementById("closeBtnStokSold");

  closeButtonStokSold.addEventListener("click", function () {
    // Close the modal
    stokSoldModal.style.display = "none";
  });

  let produkData = []; // Store the product data

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

  // Read the JSON file and set the API URL
  let apiUrl = "";
  async function initializeApiUrl() {
    const envData = await readJsonFile("/json/env.json");
    if (envData && envData.api_url) {
      apiUrl = envData.api_url;
    } else {
      apiUrl = "http://localhost:5050"; // Default URL if reading fails
      console.warn("Failed to read API URL from JSON, using default:", apiUrl);
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
      const data = await response.json(); // Store the product data
      console.log("Produk data from API:", data);
      produkData = data;
      console.log("produkData after fetch:", produkData);

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
  }

  function populateProductDropdown(products, dropdown) {
    if (!dropdown) {
      console.error("Product dropdown element not found!");
      return;
    }

    // Clear existing options
    dropdown.innerHTML = "";

    // Add options for each product
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
      const response = await fetch(`${apiUrl}/editproduk/${produkId}`, {
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
      });

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

  // Get the search input element
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

  // Call initializeApiUrl before fetching products
  initializeApiUrl().then(() => {
    fetchProduk();
  });

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
});
