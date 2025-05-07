document.addEventListener("DOMContentLoaded", function () {
  // Get API URL from config
  const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";

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
    window.location.href = "/login/login.html";
    return;
  }
  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  document.getElementById("start-date").valueAsDate = thirtyDaysAgo;
  document.getElementById("end-date").valueAsDate = today;

  // Initialize charts
  let salesTrendChart, topProductsChart, productComparisonChart;

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const reportContents = document.querySelectorAll(".report-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remove active class from all buttons and contents
      tabBtns.forEach((b) => b.classList.remove("active"));
      reportContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      this.classList.add("active");
      const tabName = this.dataset.tab;
      document.getElementById(`${tabName}-report`).classList.add("active");

      // Refresh the active report
      if (tabName === "sales") {
        fetchSalesData();
      } else if (tabName === "product") {
        fetchProductData();
      } else if (tabName === "transaction") {
        fetchTransactionData();
      }
    });
  });

  // Generate report button
  document
    .getElementById("generate-report")
    .addEventListener("click", function () {
      const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
      if (activeTab === "sales") {
        fetchSalesData();
      } else if (activeTab === "product") {
        fetchProductData();
      } else if (activeTab === "transaction") {
        fetchTransactionData();
      }
    });

  // Logout button
  document.getElementById("logout-btn").addEventListener("click", function () {
    localStorage.removeItem("authToken");
    window.location.href = "../index.html";
  });

  // Initialize charts
  initializeCharts();

  // Fetch initial data for the active tab
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "sales") {
    fetchSalesData();
  } else if (activeTab === "product") {
    fetchProductData();
  } else if (activeTab === "transaction") {
    fetchTransactionData();
  }

  // Function to initialize all charts
  function initializeCharts() {
    // Sales trend chart
    const salesCtx = document
      .getElementById("salesTrendChart")
      .getContext("2d");
    salesTrendChart = new Chart(salesCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Sales",
            data: [],
            borderColor: "#32D583",
            backgroundColor: "rgba(50, 213, 131, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "#9CA3AF",
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "#9CA3AF",
              callback: function (value) {
                return "Rp " + formatNumber(value);
              },
            },
          },
        },
      },
    });

    // Top products chart (doughnut)
    const topProductsCtx = document
      .getElementById("topProductsChart")
      .getContext("2d");
    topProductsChart = new Chart(topProductsCtx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "#32D583",
              "#39ADFD",
              "#FDBE00",
              "#FF5252",
              "#9C27B0",
            ],
            borderWidth: 0,
            cutout: "70%",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#fff",
              padding: 10,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} units (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Product comparison chart (bar)
    const productComparisonCtx = document
      .getElementById("productComparisonChart")
      .getContext("2d");
    productComparisonChart = new Chart(productComparisonCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Revenue",
            data: [],
            backgroundColor: "#32D583",
            borderRadius: 5,
          },
          {
            label: "Profit",
            data: [],
            backgroundColor: "#39ADFD",
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#9CA3AF",
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "#9CA3AF",
              callback: function (value) {
                return "Rp " + formatNumber(value);
              },
            },
          },
        },
      },
    });
  }

  // Function to fetch sales data
  async function fetchSalesData() {
    try {
      // Fetch daily sales
      const today = new Date().toISOString().split("T")[0];
      const dailyResponse = await fetch(`${apiUrl}/dailysales?date=${today}`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!dailyResponse.ok) {
        throw new Error(`HTTP error! Status: ${dailyResponse.status}`);
      }

      const dailyData = await dailyResponse.json();

      // Fetch weekly sales (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyStartDate = sevenDaysAgo.toISOString().split("T")[0];
      const weeklyEndDate = new Date().toISOString().split("T")[0];

      const weeklyResponse = await fetch(
        `${apiUrl}/weeklysales?startDate=${weeklyStartDate}&endDate=${weeklyEndDate}`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!weeklyResponse.ok) {
        throw new Error(`HTTP error! Status: ${weeklyResponse.status}`);
      }

      const weeklyData = await weeklyResponse.json();

      // Fetch monthly revenue
      const monthlyResponse = await fetch(`${apiUrl}/monthlysales`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!monthlyResponse.ok) {
        throw new Error(`HTTP error! Status: ${monthlyResponse.status}`);
      }

      const monthlyData = await monthlyResponse.json();

      // Fetch inventory status
      const inventoryResponse = await fetch(`${apiUrl}/inventorystatus`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!inventoryResponse.ok) {
        throw new Error(`HTTP error! Status: ${inventoryResponse.status}`);
      }

      const inventoryData = await inventoryResponse.json();

      // Update the dashboard with the data
      updateSalesReport(dailyData, weeklyData, monthlyData, inventoryData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      // Show fallback data or error message
    }
  }

  // Function to update sales report
  function updateSalesReport(
    dailyData,
    weeklyData,
    monthlyData,
    inventoryData
  ) {
    // Update daily sales
    document.getElementById("dailySales").textContent = formatCurrency(
      dailyData.totalSales || 0
    );
    document.getElementById("dailySalesDate").textContent = formatDate(
      dailyData.date || new Date().toISOString()
    );

    // Calculate weekly total
    let weeklyTotal = 0;
    if (weeklyData && Array.isArray(weeklyData)) {
      weeklyTotal = weeklyData.reduce((sum, day) => sum + (day.sales || 0), 0);
    }
    document.getElementById("weeklySales").textContent =
      formatCurrency(weeklyTotal);

    // Set weekly date range
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    document.getElementById("weeklySalesDate").textContent = `${formatDateShort(
      sevenDaysAgo
    )} - ${formatDateShort(today)}`;

    // Update monthly revenue
    document.getElementById("monthlyRevenue").textContent = formatCurrency(
      monthlyData.totalRevenue || 0
    );
    document.getElementById("monthlyRevenueDate").textContent = `${
      monthlyData.month || ""
    } ${monthlyData.year || ""}`;

    // Update total products
    document.getElementById("totalProducts").textContent =
      inventoryData.totalProducts || 0;

    // Update sales trend chart with weekly data
    updateSalesTrendChart(weeklyData);
  }

  // Function to update sales trend chart
  function updateSalesTrendChart(weeklyData) {
    if (!weeklyData || !Array.isArray(weeklyData) || weeklyData.length === 0) {
      salesTrendChart.data.labels = [];
      salesTrendChart.data.datasets[0].data = [];
      salesTrendChart.update();
      return;
    }

    // Sort data by date
    const sortedData = [...weeklyData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Update chart data
    salesTrendChart.data.labels = sortedData.map((day) =>
      formatDateShort(day.date)
    );
    salesTrendChart.data.datasets[0].data = sortedData.map(
      (day) => day.sales || 0
    );
    salesTrendChart.update();
  }

  // Function to fetch product performance data
  async function fetchProductData() {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;

    try {
      // Fetch transaction history which includes product data
      const response = await fetch(`${apiUrl}/displayhistory`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const transactions = await response.json();

      // Filter transactions by date range if dates are provided
      let filteredTransactions = transactions;
      if (startDate && endDate) {
        filteredTransactions = transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59); // Include the entire end date
          return transactionDate >= start && transactionDate <= end;
        });
      }

      updateProductReport(filteredTransactions);
    } catch (error) {
      console.error("Error fetching product data:", error);
      document.getElementById("no-product-data").style.display = "block";
      document.getElementById("productTable").style.display = "none";
    }
  }

  // Function to update product report
  function updateProductReport(transactions) {
    if (!transactions || transactions.length === 0) {
      document.getElementById("no-product-data").style.display = "block";
      document.getElementById("productTable").style.display = "none";

      // Update charts with empty data
      topProductsChart.data.labels = [];
      topProductsChart.data.datasets[0].data = [];
      topProductsChart.update();

      productComparisonChart.data.labels = [];
      productComparisonChart.data.datasets[0].data = [];
      productComparisonChart.data.datasets[1].data = [];
      productComparisonChart.update();

      return;
    }

    document.getElementById("no-product-data").style.display = "none";
    document.getElementById("productTable").style.display = "table";

    // Aggregate data by product
    const productMap = new Map();

    transactions.forEach((transaction) => {
      const product = productMap.get(transaction.nama_produk) || {
        name: transaction.nama_produk,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
      };

      product.unitsSold += transaction.jumlah_terjual;
      product.revenue += transaction.total_harga;
      product.cost += transaction.harga_beli * transaction.jumlah_terjual;

      productMap.set(transaction.nama_produk, product);
    });

    // Convert map to array and calculate profits
    const productData = Array.from(productMap.values()).map((product) => ({
      ...product,
      profit: product.revenue - product.cost,
      profitMargin: ((product.revenue - product.cost) / product.revenue) * 100,
    }));

    // Sort products by units sold for the charts
    const sortedByUnitsSold = [...productData].sort(
      (a, b) => b.unitsSold - a.unitsSold
    );
    const sortedByRevenue = [...productData].sort(
      (a, b) => b.revenue - a.revenue
    );

    // Update top products chart (take top 5)
    const topProducts = sortedByUnitsSold.slice(0, 5);
    topProductsChart.data.labels = topProducts.map((p) => p.name);
    topProductsChart.data.datasets[0].data = topProducts.map(
      (p) => p.unitsSold
    );
    topProductsChart.update();

    // Update product comparison chart (take top 8)
    const topRevenueProducts = sortedByRevenue.slice(0, 8);
    productComparisonChart.data.labels = topRevenueProducts.map((p) => p.name);
    productComparisonChart.data.datasets[0].data = topRevenueProducts.map(
      (p) => p.revenue
    );
    productComparisonChart.data.datasets[1].data = topRevenueProducts.map(
      (p) => p.profit
    );
    productComparisonChart.update();

    // Update product table
    const tableBody = document.querySelector("#productTable tbody");
    tableBody.innerHTML = "";

    sortedByRevenue.forEach((product, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${product.name}</td>
        <td>${product.unitsSold}</td>
        <td>${formatCurrency(product.revenue)}</td>
        <td>${formatCurrency(product.profit)}</td>
        <td>${product.profitMargin.toFixed(2)}%</td>
        <td>-</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Function to fetch transaction data
  async function fetchTransactionData() {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;

    try {
      const response = await fetch(`${apiUrl}/transactionhistory`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const transactions = await response.json();

      // Filter transactions by date range if dates are provided
      let filteredTransactions = transactions;
      if (startDate && endDate) {
        filteredTransactions = transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.tanggal_transaksi);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59); // Include the entire end date
          return transactionDate >= start && transactionDate <= end;
        });
      }

      updateTransactionReport(filteredTransactions);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      document.getElementById("no-transaction-data").style.display = "block";
      document.getElementById("transactionTable").style.display = "none";
    }
  }

  // Function to update transaction report
  function updateTransactionReport(transactions) {
    if (!transactions || transactions.length === 0) {
      document.getElementById("no-transaction-data").style.display = "block";
      document.getElementById("transactionTable").style.display = "none";
      return;
    }

    document.getElementById("no-transaction-data").style.display = "none";
    document.getElementById("transactionTable").style.display = "table";

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(b.tanggal_transaksi) - new Date(a.tanggal_transaksi)
    );

    // Update transaction table
    const tableBody = document.querySelector("#transactionTable tbody");
    tableBody.innerHTML = "";

    sortedTransactions.forEach((transaction) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${transaction.transaksi_id}</td>
        <td>${transaction.nama_produk}</td>
        <td>${formatCurrency(transaction.harga_jual)}</td>
        <td>${formatCurrency(transaction.harga_beli)}</td>
        <td>${transaction.jumlah_terjual}</td>
        <td>${formatCurrency(transaction.total_harga)}</td>
        <td>${formatDateTime(transaction.tanggal_transaksi)}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Helper functions
  function formatCurrency(value) {
    return "Rp " + formatNumber(value);
  }

  function formatNumber(value) {
    return parseFloat(value || 0)
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
});
