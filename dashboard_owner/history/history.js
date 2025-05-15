document.addEventListener("DOMContentLoaded", async function () {
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
      console.error("Error decoding token:", error);
      return true;
    }
  }

  if (!token || isTokenExpired(token)) {
    window.location.href = "/login/login.html";
    return;
  }
  await initializeApiUrl();
  // Initialize the transaction history functionality
  initTransactionHistory();
});

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
  try {
    const envData = await readJsonFile("/json/env.json");
    if (envData && envData.api_url) {
      apiUrl = envData.api_url;
    } else {
      apiUrl = "http://localhost:5050";
      console.warn("Failed to read API URL from JSON, using default:", apiUrl);
    }
    console.log("API URL initialized:", apiUrl);
  } catch (error) {
    console.error("Error initializing API URL:", error);
    apiUrl = "http://localhost:5050";
  }
}

function initTransactionHistory() {
  // Load transaction data from the server
  loadTransactionData(); // Load the first page with no filters

  // Initialize search functionality
  initSearchFilter();

  // Initialize filter dropdowns
  initFilterDropdowns();

  // Initialize action buttons
  initActionButtons();

  // Initialize export button
  document
    .querySelector(".btn-outline")
    .addEventListener("click", exportTransactions);

  // Initialize new transaction button
  document
    .querySelector(".btn-primary")
    .addEventListener("click", openNewTransactionForm);

  // Initialize back to dashboard button
  document.getElementById("back-to-dashboard").addEventListener("click", () => {
    window.location.href = "/dashboard_owner/owner.html";
  });
}

// Update the loadTransactionData function to use our local filtering logic
function loadTransactionData(page = 1) {
  // Show loading state
  showLoading();

  const token = localStorage.getItem("authToken");

  if (!token) {
    window.location.href = "/login/login.html";
    return;
  }

  fetch(`${apiUrl}/displayhistory`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("API Response:", data);
      if (data && Array.isArray(data)) {
        transactionData = data; // Store all transaction data

        // Apply any active filters right away
        applyFilters();

        updateStatistics(data);
      } else {
        console.warn("No transaction data received from the server.");
        transactionData = [];
        displayTransactionGroups([]);
      }
      hideLoading();
    })
    .catch((error) => {
      console.error("Error loading transaction data:", error);
      displayError("Failed to load transaction data. Please try again later.");
      hideLoading();
    });
}

// Function to group transactions by transaction_id
function groupTransactionsByID(transactions) {
  const groups = {};

  transactions.forEach((transaction) => {
    const id = transaction.transaksi_id;
    if (!groups[id]) {
      groups[id] = {
        id: id,
        date: transaction.tanggal_transaksi,
        items: [],
      };
    }
    groups[id].items.push(transaction);
  });

  return Object.values(groups);
}

// Function to display transaction groups
function displayTransactionGroups(transactions) {
  const transactionGroups = document.querySelector(".transaction-groups");
  transactionGroups.innerHTML = ""; // Clear existing transaction groups

  // Group transactions by transaction_id
  const groups = groupTransactionsByID(transactions);

  if (groups.length === 0) {
    transactionGroups.innerHTML =
      '<div class="no-data">No transaction data available</div>';
    return;
  }

  // Calculate totals for all transactions
  let totalRevenue = 0;
  let totalProfit = 0;

  groups.forEach((group) => {
    const transactionGroup = document.createElement("div");
    transactionGroup.className = "transaction-group";

    // Calculate totals for this group
    let groupTotalAmount = 0;
    let groupTotalProfit = 0;

    group.items.forEach((item) => {
      const totalPrice = item.harga_jual * item.jumlah_terjual;
      const profit = totalPrice - item.harga_beli * item.jumlah_terjual;

      groupTotalAmount += totalPrice;
      groupTotalProfit += profit;

      totalRevenue += totalPrice;
      totalProfit += profit;
    });

    // Create the transaction group header
    transactionGroup.innerHTML = `
      <div class="transaction-group-header">
        <div class="transaction-id">ID Transaksi: ${group.id}</div>
        <div class="transaction-date">Tanggal: ${group.date}</div>
        <div class="transaction-actions">
          <button class="action-btn view-btn" data-id="${group.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn edit-btn" data-id="${group.id}">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="action-btn delete-btn" data-id="${group.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <table class="transaction-table">
        <thead>
          <tr>
            <th>Nama Produk</th>
            <th>Harga Jual</th>
            <th>Harga Beli</th>
            <th>Jumlah Terjual</th>
            <th>Total Harga</th>
            <th>Keuntungan</th>
            <th>Waktu</th>
          </tr>
        </thead>
        <tbody>
          ${group.items
            .map((item) => {
              const totalPrice = item.harga_jual * item.jumlah_terjual;
              const profit = totalPrice - item.harga_beli * item.jumlah_terjual;

              return `
              <tr>
                <td>${item.nama_produk}</td>
                <td>${formatCurrency(item.harga_jual)}</td>
                <td>${formatCurrency(item.harga_beli)}</td>
                <td>${item.jumlah_terjual}</td>
                <td>${formatCurrency(totalPrice)}</td>
                <td>${formatCurrency(profit)}</td>
                <td>${item.waktu || "N/A"}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Total Transaksi ID ${
              group.id
            }</td>
            <td>${formatCurrency(groupTotalAmount)}</td>
            <td>${formatCurrency(groupTotalProfit)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;

    transactionGroups.appendChild(transactionGroup);
  });

  // Update the transaction summary
  updateTransactionSummary(totalRevenue, totalProfit);

  // Reinitialize action buttons for the new rows
  initActionButtons();

  // Update pagination
  updatePagination({
    currentPage: 1,
    perPage: groups.length,
    total: transactions.length,
    totalPages: Math.ceil(transactions.length / groups.length),
  });
}

// Function to update transaction summary
function updateTransactionSummary(totalRevenue, totalProfit) {
  const summaryContainer = document.querySelector(".transaction-summary");

  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div class="summary-item">
        <div class="summary-label">Total Pendapatan:</div>
        <div class="summary-value">${formatCurrency(totalRevenue)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Keuntungan:</div>
        <div class="summary-value">${formatCurrency(totalProfit)}</div>
      </div>
    `;
  }
}

// Function to update statistics based on transaction data
async function updateStatistics(transactions) {
  // Calculate total transactions
  const totalTransactions = new Set(transactions.map((t) => t.transaksi_id))
    .size;
  console.log("Total Transactions:", totalTransactions);

  // Calculate today's revenue using the /dailysales endpoint
  let todayRevenue = 0;
  try {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];

    const token = localStorage.getItem("authToken");

    const response = await fetch(`${apiUrl}/dailysales?date=${formattedDate}`, {
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

    todayRevenue = data.totalSales || 0;
  } catch (error) {
    console.error("Error fetching daily sales:", error);
    todayRevenue = 0; // Set default value if API call fails
  }
  console.log("Today's Revenue:", todayRevenue);

  // Calculate average transaction amount
  const transactionGroups = groupTransactionsByID(transactions);
  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.harga_jual * t.jumlah_terjual,
    0
  );
  console.log("Total Revenue:", totalRevenue);
  const avgTransactionAmount =
    transactionGroups.length > 0 ? totalRevenue / transactionGroups.length : 0;
  console.log("Average Transaction Amount:", avgTransactionAmount);

  // Calculate total profit
  const totalProfit = transactions.reduce((sum, t) => {
    const profit =
      t.harga_jual * t.jumlah_terjual - t.harga_beli * t.jumlah_terjual;
    return sum + profit;
  }, 0);
  console.log("Total Profit:", totalProfit);

  // Update the stat cards
  document.querySelector(".stat-card:nth-child(1) .stat-value").textContent =
    totalTransactions.toLocaleString();
  document.querySelector(".stat-card:nth-child(2) .stat-value").textContent =
    formatCurrency(todayRevenue);
  document.querySelector(".stat-card:nth-child(3) .stat-value").textContent =
    formatCurrency(avgTransactionAmount);
  document.querySelector(".stat-card:nth-child(4) .stat-value").textContent =
    formatCurrency(totalProfit);
}

// Update pagination based on data
function updatePagination(pagination) {
  const paginationInfo = document.querySelector(".pagination-info");
  const paginationControls = document.querySelector(".pagination-controls");

  // Update pagination info text
  const startItem = (pagination.currentPage - 1) * pagination.perPage + 1;
  const endItem = Math.min(
    startItem + pagination.perPage - 1,
    pagination.total
  );
  paginationInfo.textContent = `Menampilkan ${startItem} sampai ${endItem} dari ${pagination.total} transaksi`;

  // Update pagination controls
  paginationControls.innerHTML = "";

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.className =
    "page-btn" + (pagination.currentPage === 1 ? " disabled" : "");
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  if (pagination.currentPage > 1) {
    prevButton.addEventListener("click", () =>
      loadTransactionData(pagination.currentPage - 1)
    );
  }
  paginationControls.appendChild(prevButton);

  // Page buttons
  const maxButtons = 5;
  const startPage = Math.max(
    1,
    pagination.currentPage - Math.floor(maxButtons / 2)
  );
  const endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.className =
      "page-btn" + (i === pagination.currentPage ? " active" : "");
    pageButton.textContent = i;
    pageButton.addEventListener("click", () => loadTransactionData(i));
    paginationControls.appendChild(pageButton);
  }

  // Next button
  const nextButton = document.createElement("button");
  nextButton.className =
    "page-btn" +
    (pagination.currentPage === pagination.totalPages ? " disabled" : "");
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  if (pagination.currentPage < pagination.totalPages) {
    nextButton.addEventListener("click", () =>
      loadTransactionData(pagination.currentPage + 1)
    );
  }
  paginationControls.appendChild(nextButton);
}

// Update the initSearchFilter function
function initSearchFilter() {
  const searchInput = document.getElementById("search-input");

  searchInput.addEventListener("input", function () {
    // Use the same filter function for consistency
    applyFilters();
  });
}

// Update the initFilterDropdowns function
function initFilterDropdowns() {
  const productFilter = document.querySelectorAll(".filter-select")[0];
  const dateFilter = document.querySelectorAll(".filter-select")[1];

  if (productFilter) {
    productFilter.addEventListener("change", function () {
      applyFilters();
    });
  }

  if (dateFilter) {
    dateFilter.addEventListener("change", function () {
      applyFilters();
    });
  }
}

// Add a new function to apply both filters together
function applyFilters() {
  const productFilter = document.querySelectorAll(".filter-select")[0];
  const dateFilter = document.querySelectorAll(".filter-select")[1];
  const searchInput = document.getElementById("search-input");

  // Start with all transaction data
  let filteredData = [...transactionData];

  // Apply product filter if not "Semua Produk"
  if (productFilter && productFilter.selectedIndex > 0) {
    const selectedProduct = productFilter.value;
    filteredData = filteredData.filter((transaction) =>
      transaction.nama_produk.includes(selectedProduct)
    );
  }

  // Apply date filter if not "Semua Tanggal"
  if (dateFilter && dateFilter.selectedIndex > 0) {
    const selectedDateOption = dateFilter.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (selectedDateOption) {
      case "Hari Ini":
        filteredData = filteredData.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          transactionDate.setHours(0, 0, 0, 0);
          return transactionDate.getTime() === today.getTime();
        });
        break;

      case "Kemarin":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filteredData = filteredData.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          transactionDate.setHours(0, 0, 0, 0);
          return transactionDate.getTime() === yesterday.getTime();
        });
        break;

      case "7 Hari Terakhir":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredData = filteredData.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          transactionDate.setHours(0, 0, 0, 0);
          return transactionDate >= sevenDaysAgo;
        });
        break;

      case "30 Hari Terakhir":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredData = filteredData.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          transactionDate.setHours(0, 0, 0, 0);
          return transactionDate >= thirtyDaysAgo;
        });
        break;
    }
  }

  // Apply search filter if there's text in the search box
  if (searchInput && searchInput.value.trim() !== "") {
    const searchTerm = searchInput.value.trim().toLowerCase();
    filteredData = filteredData.filter((transaction) =>
      transaction.nama_produk.toLowerCase().includes(searchTerm)
    );
  }

  // Display the filtered data
  displayTransactionGroups(filteredData);
}

// Initialize action buttons
function initActionButtons() {
  // View buttons
  const viewButtons = document.querySelectorAll(".view-btn");
  viewButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const transactionId = this.getAttribute("data-id");
      viewTransaction(transactionId);
    });
  });

  // Edit buttons
  const editButtons = document.querySelectorAll(".edit-btn");
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const transactionId = this.getAttribute("data-id");
      editTransaction(transactionId);
    });
  });

  // Delete buttons
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const transactionId = this.getAttribute("data-id");
      deleteTransaction(transactionId);
    });
  });
}

// Function to handle viewing a transaction
function viewTransaction(transactionId) {
  console.log(`Viewing transaction: ${transactionId}`);
  // Here you would typically show a modal with transaction details
  alert(`Viewing details for transaction ${transactionId}`);

  // In a real application, you would fetch the transaction details from the server
  // and display them in a modal
}

// Function to handle editing a transaction
function editTransaction(transactionId) {
  console.log(`Editing transaction: ${transactionId}`);
  // Here you would typically show a form for editing the transaction
  alert(`Edit form for transaction ${transactionId}`);

  // In a real application, you would fetch the transaction details from the server
  // and populate a form for editing
}

// Function to handle deleting a transaction
function deleteTransaction(transactionId) {
  console.log(`Deleting transaction: ${transactionId}`);
  // Here you would typically show a confirmation dialog before deleting
  if (
    confirm(`Are you sure you want to delete transaction ${transactionId}?`)
  ) {
    const token = localStorage.getItem("authToken");

    fetch(`${apiUrl}/deletetransaction/${transactionId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Delete response:", data);
        alert(`Transaction ${transactionId} has been deleted.`);
        // Reload transaction data after deletion
        loadTransactionData();
      })
      .catch((error) => {
        console.error("Error deleting transaction:", error);
        alert("Failed to delete transaction. Please try again later.");
      });
  }
}

// Function to handle exporting transactions
function exportTransactions() {
  console.log("Exporting transactions");

  // Get current filters to export filtered data
  const filters = getActiveFilters();
  const token = localStorage.getItem("authToken");

  // Prepare query parameters
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append("search", filters.search);
  if (filters.productFilter)
    queryParams.append("product", filters.productFilter);
  if (filters.dateFilter) queryParams.append("dateRange", filters.dateFilter);

  // In a real application, you would send a request to the server to generate
  // and download a CSV/Excel file with transaction data
  fetch(`${apiUrl}/exporttransactions?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      // Create a download link and click it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "transaction_history.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      alert("Export successful!");
    })
    .catch((error) => {
      console.error("Error exporting transactions:", error);
      alert("Failed to export transactions. Please try again later.");
    });
}

// Function to handle opening a new transaction form
function openNewTransactionForm() {
  console.log("Opening new transaction form");
  // Redirect to transaction form page
  window.location.href = "/dashboard_owner/transactions/new_transaction.html";
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function showLoading() {
  // In a real application, you would show a loading spinner
  console.log("Loading...");

  // Add a loading overlay to the content
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "loading-overlay";
  loadingOverlay.innerHTML = '<div class="spinner"></div>';
  loadingOverlay.style.position = "fixed";
  loadingOverlay.style.top = "0";
  loadingOverlay.style.left = "0";
  loadingOverlay.style.width = "100%";
  loadingOverlay.style.height = "100%";
  loadingOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.justifyContent = "center";
  loadingOverlay.style.alignItems = "center";
  loadingOverlay.style.zIndex = "9999";

  document.body.appendChild(loadingOverlay);
}

function hideLoading() {
  // In a real application, you would hide the loading spinner
  console.log("Loading complete.");

  // Remove the loading overlay
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

function displayError(message) {
  console.error(message);

  // Create and show error toast
  const errorToast = document.createElement("div");
  errorToast.className = "error-toast";
  errorToast.textContent = message;
  errorToast.style.position = "fixed";
  errorToast.style.bottom = "20px";
  errorToast.style.right = "20px";
  errorToast.style.backgroundColor = "#f44336";
  errorToast.style.color = "white";
  errorToast.style.padding = "15px";
  errorToast.style.borderRadius = "4px";
  errorToast.style.zIndex = "9999";

  document.body.appendChild(errorToast);

  // Remove the toast after 3 seconds
  setTimeout(() => {
    errorToast.remove();
  }, 3000);
}

// Global variable to store transaction data
let transactionData = [];
//historia
