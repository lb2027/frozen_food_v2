document.addEventListener("DOMContentLoaded", async function () {
  await initializeApiUrl(); // Ensure the API URL is initialized before proceeding
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
      apiUrl = "http://localhost:5050"; // Default URL if reading fails
      console.warn("Failed to read API URL from JSON, using default:", apiUrl);
    }
    console.log("API URL initialized:", apiUrl);
  } catch (error) {
    console.error("Error initializing API URL:", error);
    apiUrl = "http://localhost:5050"; // Default URL on error
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
}

// Function to load transaction data from the server
function loadTransactionData(page = 1, filters = {}) {
  // Show loading state
  showLoading();

  // Prepare query parameters
  const queryParams = new URLSearchParams();
  queryParams.append("page", page);

  // Add any filters
  if (filters.search) queryParams.append("search", filters.search);
  if (filters.type) queryParams.append("type", filters.type);
  if (filters.status) queryParams.append("status", filters.status);
  if (filters.dateRange) queryParams.append("dateRange", filters.dateRange);

  const token = localStorage.getItem("authToken");

  console.log("JWT Token:", token); // Add this line

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

  // Fetch data from server - this would be replaced with your actual API endpoint
  fetch(`${apiUrl}/displayhistory`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  }) // Replace with your actual API endpoint
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("API Response:", data); // Add this line
      if (data && Array.isArray(data)) {
        displayTransactionData(data);
      } else {
        console.warn("No transaction data received from the server.");
        displayTransactionData([]); // Display an empty table
      }
      hideLoading();
    })
    .catch((error) => {
      console.error("Error loading transaction data:", error);
      displayError("Failed to load transaction data. Please try again later.");
      hideLoading();
    });
}

// Mock function to generate sample data (replace with actual API call in production)

// Function to display transaction data in the table
function displayTransactionData(transactions) {
  const tableBody = document.querySelector(".transaction-table tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  transactions.forEach((transaction) => {
    // Format currency values
    const formattedSellPrice = formatCurrency(transaction.harga_jual);
    const formattedBuyPrice = formatCurrency(transaction.harga_beli);

    const row = document.createElement("tr");
    row.innerHTML = `
            <td class="transaction-id">${transaction.transaksi_id}</td>
            <td>${transaction.tanggal_transaksi}</td>
            <td>${transaction.nama_produk}</td>
            <td>${formattedSellPrice}</td>
            <td>${formattedBuyPrice}</td>
            <td>${transaction.jumlah_terjual}</td>
            <td>
                
            </td>
            <td>
                <div class="actions">
                    <button class="action-btn view-btn" data-id="${transaction.transaction_id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" data-id="${transaction.transaction_id}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${transaction.transaction_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });

  // Reinitialize action buttons for the new rows
  initActionButtons();
}

// Function to update pagination based on data
function updatePagination(pagination) {
  const paginationInfo = document.querySelector(".pagination-info");
  const paginationControls = document.querySelector(".pagination-controls");

  // Update pagination info text
  const startItem = (pagination.currentPage - 1) * pagination.perPage + 1;
  const endItem = Math.min(
    startItem + pagination.perPage - 1,
    pagination.total
  );
  paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${pagination.total} entries`;

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

// Function to update stat cards
function updateStatCards(stats) {
  document.querySelector(".stat-card:nth-child(1) .stat-value").textContent =
    stats.totalTransactions.toLocaleString();
  document.querySelector(
    ".stat-card:nth-child(2) .stat-value"
  ).textContent = `$${stats.todayRevenue.toLocaleString()}`;
  document.querySelector(
    ".stat-card:nth-child(3) .stat-value"
  ).textContent = `$${stats.averageTransaction.toLocaleString()}`;
  document.querySelector(
    ".stat-card:nth-child(4) .stat-value"
  ).textContent = `$${stats.refunds.toLocaleString()}`;
}

// Initialize search functionality
function initSearchFilter() {
  const searchInput = document.querySelector(".search-input input");
  let debounceTimer;

  searchInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const currentFilters = getActiveFilters();
      currentFilters.search = this.value.trim();
      loadTransactionData(1, currentFilters);
    }, 500); // 500ms debounce
  });
}

// Initialize filter dropdowns
function initFilterDropdowns() {
  const filterSelects = document.querySelectorAll(".filter-select");

  filterSelects.forEach((select) => {
    select.addEventListener("change", function () {
      const filters = getActiveFilters();
      loadTransactionData(1, filters);
    });
  });
}

// Function to get active filters
function getActiveFilters() {
  const filters = {};

  // Get search input value
  const searchInput = document.querySelector(".search-input input");
  if (searchInput.value.trim()) {
    filters.search = searchInput.value.trim();
  }

  // Get filter select values
  const typeSelect = document.querySelector(".filter-select:nth-child(1)");
  if (typeSelect.selectedIndex > 0) {
    filters.type = typeSelect.value;
  }

  const statusSelect = document.querySelector(".filter-select:nth-child(2)");
  if (statusSelect.selectedIndex > 0) {
    filters.status = statusSelect.value;
  }

  const dateSelect = document.querySelector(".filter-select:nth-child(3)");
  if (dateSelect.selectedIndex > 0) {
    filters.dateRange = dateSelect.value;
  }

  return filters;
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
    // In a real application, you would send a delete request to the server
    alert(`Transaction ${transactionId} has been deleted.`);

    // Reload transaction data after deletion
    loadTransactionData();
  }
}

// Function to handle exporting transactions
function exportTransactions() {
  console.log("Exporting transactions");
  alert("Exporting transactions...");

  // In a real application, you would send a request to the server to generate
  // and download a CSV/Excel file with transaction data
}

// Function to handle opening a new transaction form
function openNewTransactionForm() {
  console.log("Opening new transaction form");
  alert("New transaction form");

  // In a real application, you would show a form for creating a new transaction
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
}

function hideLoading() {
  // In a real application, you would hide the loading spinner
  console.log("Loading complete.");
}

function displayError(message) {
  console.error(message);
  alert(message);

  // In a real application, you would show a toast or an error message
  // in a designated area of the page
}
