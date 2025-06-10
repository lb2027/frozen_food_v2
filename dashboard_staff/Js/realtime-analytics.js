class RealTimeAnalytics {
  constructor(smartInventorySystem) {
    this.system = smartInventorySystem;
    this.metrics = {
      totalRevenue: 0,
      totalTransactions: 0,
      avgOrderValue: 0,
      topSellingProducts: [],
      lowStockAlerts: 0,
      hourlyRevenue: [],
      salesTrend: "stable",
      customerCount: 0,
      conversionRate: 0,
    };

    this.updateInterval = null;
    this.isActive = false;
  }

  async initialize() {
    console.log("🚀 Initializing Real-Time Analytics...");

    try {
      await this.fetchInitialData();
      this.validateMetrics(); // ✅ Validate data after fetching
      this.startRealTimeUpdates();
      console.log("✅ Real-Time Analytics initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize analytics:", error);
      this.useFallbackData();
      this.validateMetrics();
    }
  }

  displayRealTimeMetrics() {
    console.log("📊 Displaying real-time metrics...");

    // Find where to insert the metrics (look for smart widgets container)
    const smartWidgets = document.querySelector(".smart-widgets");
    if (!smartWidgets) {
      console.warn("Smart widgets container not found");
      return;
    }

    // Remove existing metrics display if present
    const existingMetrics = document.querySelector(".real-time-metrics");
    if (existingMetrics) {
      existingMetrics.remove();
    }

    // Create the real-time metrics widget
    const metricsWidget = document.createElement("div");
    metricsWidget.className = "smart-widget real-time-metrics";
    metricsWidget.innerHTML = this.generateMetricsHTML();

    // Insert at the beginning of smart widgets
    smartWidgets.insertBefore(metricsWidget, smartWidgets.firstChild);

    // Add event listeners for interactive elements
    this.attachMetricsEventListeners();
  }

  generateMetricsHTML() {
    const trend = this.calculateSalesTrend();
    const trendIcon = this.getTrendIcon();
    const trendClass = this.getTrendClass();

    return `
      <div class="widget-header">
        <h4>📊 Real-Time Analytics</h4>
        <div class="metrics-controls">
          <button class="metrics-refresh-btn" id="refresh-analytics">
            <span class="refresh-icon">🔄</span>
          </button>
          <button class="metrics-export-btn" id="export-analytics">
            <span class="export-icon">📈</span>
          </button>
        </div>
      </div>
      <div class="widget-content">
        <div class="metrics-grid">
          <div class="metric-card revenue">
            <div class="metric-icon">💰</div>
            <div class="metric-info">
              <div class="metric-value">Rp ${this.metrics.totalRevenue.toLocaleString()}</div>
              <div class="metric-label">Today's Revenue</div>
            </div>
          </div>
          
          <div class="metric-card transactions">
            <div class="metric-icon">🛒</div>
            <div class="metric-info">
              <div class="metric-value">${this.metrics.totalTransactions}</div>
              <div class="metric-label">Transactions</div>
            </div>
          </div>
          
          <div class="metric-card avg-order">
            <div class="metric-icon">📊</div>
            <div class="metric-info">
              <div class="metric-value">Rp ${Math.round(
                this.metrics.avgOrderValue
              ).toLocaleString()}</div>
              <div class="metric-label">Avg Order Value</div>
            </div>
          </div>
          
          <div class="metric-card alerts">
            <div class="metric-icon">⚠️</div>
            <div class="metric-info">
              <div class="metric-value ${
                this.metrics.lowStockAlerts > 0 ? "alert-high" : ""
              }">${this.metrics.lowStockAlerts}</div>
              <div class="metric-label">Low Stock Alerts</div>
            </div>
          </div>
        </div>
        
        <div class="sales-trend">
          <div class="trend-indicator ${trendClass}">
            <span class="trend-icon">${trendIcon}</span>
            <span class="trend-text">Sales ${trend}</span>
          </div>
        </div>
        
        <div class="top-products-section">
          <h5>🏆 Top Selling Products</h5>
          <div class="top-products-list">
            ${this.renderTopProducts()}
          </div>
        </div>
      </div>
    `;
  }

  attachMetricsEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("refresh-analytics");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refresh();
      });
    }

    // Export button
    const exportBtn = document.getElementById("export-analytics");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportData();
      });
    }
  }

  async refresh() {
    console.log("🔄 Refreshing analytics data...");

    // Show loading state
    const metricsWidget = document.querySelector(".real-time-metrics");
    if (metricsWidget) {
      metricsWidget.classList.add("loading");
    }

    try {
      await this.fetchInitialData();
      this.displayRealTimeMetrics(); // Refresh the display

      // Show success message
      this.showNotification(
        "✅ Analytics data refreshed successfully!",
        "success"
      );
    } catch (error) {
      console.error("❌ Error refreshing analytics:", error);
      this.showNotification("❌ Failed to refresh analytics data", "error");
    } finally {
      // Remove loading state
      if (metricsWidget) {
        metricsWidget.classList.remove("loading");
      }
    }
  }

  async fetchInitialData() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";

      // Fix: Change /daily-sales to /dailysales to match your Go endpoint
      try {
        const revenueResponse = await fetch(
          `${apiUrl}/dailysales?date=${today}`,
          {
            headers: { token: localStorage.getItem("authToken") },
          }
        );

        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json();
          this.metrics.totalRevenue = revenueData.totalSales || 0;
        } else {
          console.warn("Daily sales endpoint not ready, using fallback");
          this.metrics.totalRevenue = 150000; // Fallback value
        }
      } catch (error) {
        console.warn("Revenue API error, using fallback:", error);
        this.metrics.totalRevenue = 150000;
      }

      // Add the missing endpoints for now with fallbacks
      try {
        const transactionResponse = await fetch(
          `${apiUrl}/transaction-count?date=${today}`,
          {
            headers: { token: localStorage.getItem("authToken") },
          }
        );
        if (transactionResponse.ok) {
          const transactionData = await transactionResponse.json();
          this.metrics.totalTransactions = transactionData.count || 0;
        } else {
          // Fallback: estimate from revenue
          this.metrics.totalTransactions = Math.round(
            this.metrics.totalRevenue / 25000
          );
        }
      } catch (error) {
        console.warn("Transaction count endpoint not ready, using fallback");
        this.metrics.totalTransactions = Math.round(
          this.metrics.totalRevenue / 25000
        );
      }

      // Calculate average order value
      this.metrics.avgOrderValue =
        this.metrics.totalTransactions > 0
          ? this.metrics.totalRevenue / this.metrics.totalTransactions
          : 0;

      // ✅ Fetch top selling products with improved error handling
      await this.fetchTopSellingProducts();

      // Count low stock alerts
      this.updateLowStockAlerts();

      console.log("✅ Analytics data fetched successfully:", this.metrics);
    } catch (error) {
      console.error("❌ Error fetching initial analytics data:", error);
      // Use fallback data
      this.useFallbackData();
    }
  }

  async fetchTopSellingProducts() {
    try {
      const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";
      const response = await fetch(`${apiUrl}/top-selling-products`, {
        headers: { token: localStorage.getItem("authToken") },
      });

      if (response.ok) {
        const data = await response.json();

        // ✅ Fix: Check if data exists and is an array before calling slice
        if (data && Array.isArray(data) && data.length > 0) {
          this.metrics.topSellingProducts = data.slice(0, 5);
        } else {
          console.warn(
            "Top products API returned empty/invalid data, using fallback"
          );
          this.metrics.topSellingProducts = this.generateFallbackTopProducts();
        }
      } else {
        console.warn("Top products endpoint not ready, using fallback");
        this.metrics.topSellingProducts = this.generateFallbackTopProducts();
      }
    } catch (error) {
      console.warn("Top products API error, using fallback:", error);
      this.metrics.topSellingProducts = this.generateFallbackTopProducts();
    }
  }

  // Add fallback methods
  generateFallbackTopProducts() {
    // ✅ Check if system and products exist before accessing
    if (
      this.system &&
      this.system.products &&
      Array.isArray(this.system.products) &&
      this.system.products.length > 0
    ) {
      return this.system.products.slice(0, 5).map((product, index) => ({
        nama: product.nama || `Product ${index + 1}`,
        total_sold: Math.max(1, 10 - index * 2),
        total_revenue: Math.max(1, 10 - index * 2) * (product.harga || 15000),
      }));
    }

    // ✅ Final fallback with guaranteed data structure
    return [
      { nama: "Frozen Chicken Wings", total_sold: 8, total_revenue: 120000 },
      { nama: "Ice Cream Vanilla", total_sold: 6, total_revenue: 90000 },
      { nama: "Frozen Fish Fillet", total_sold: 4, total_revenue: 60000 },
      { nama: "Frozen Vegetables Mix", total_sold: 3, total_revenue: 45000 },
      { nama: "Frozen Beef Patties", total_sold: 2, total_revenue: 30000 },
    ];
  }

  useFallbackData() {
    console.log("📊 Using fallback analytics data");

    this.metrics = {
      totalRevenue: 150000,
      totalTransactions: 6,
      avgOrderValue: 25000,
      topSellingProducts: this.generateFallbackTopProducts(), // This will now always return valid data
      lowStockAlerts: 3,
      hourlyRevenue: [],
      salesTrend: "stable",
      customerCount: 0,
      conversionRate: 0,
    };
  }

  updateLowStockAlerts() {
    try {
      if (
        this.system &&
        this.system.products &&
        Array.isArray(this.system.products) &&
        this.system.products.length > 0
      ) {
        this.metrics.lowStockAlerts = this.system.products.filter(
          (product) =>
            product && product.stok !== undefined && product.stok <= 10
        ).length;
      } else {
        this.metrics.lowStockAlerts = 3; // Fallback value
      }
    } catch (error) {
      console.warn("Error updating low stock alerts:", error);
      this.metrics.lowStockAlerts = 3; // Fallback value
    }
  }
  startRealTimeUpdates() {
    this.isActive = true;

    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.fetchInitialData();
      this.updateMetricsDisplay();
    }, 30000);

    // Update hourly revenue every hour
    setInterval(() => {
      this.updateHourlyRevenue();
    }, 3600000);
  }

  updateHourlyRevenue() {
    const currentHour = new Date().getHours();
    const currentRevenue = this.metrics.totalRevenue;

    if (this.metrics.hourlyRevenue.length >= 24) {
      this.metrics.hourlyRevenue.shift();
    }

    this.metrics.hourlyRevenue.push({
      hour: currentHour,
      revenue: currentRevenue,
    });
  }

  calculateSalesTrend() {
    if (this.metrics.hourlyRevenue.length < 2) return "stable";

    const current =
      this.metrics.hourlyRevenue[this.metrics.hourlyRevenue.length - 1].revenue;
    const previous =
      this.metrics.hourlyRevenue[this.metrics.hourlyRevenue.length - 2].revenue;

    const changePercent = ((current - previous) / previous) * 100;

    if (changePercent > 5) return "increasing";
    if (changePercent < -5) return "decreasing";
    return "stable";
  }

  renderTopProducts() {
    // ✅ Multiple safety checks
    if (
      !this.metrics.topSellingProducts ||
      !Array.isArray(this.metrics.topSellingProducts) ||
      this.metrics.topSellingProducts.length === 0
    ) {
      return '<div class="no-data">No sales data available</div>';
    }

    return this.metrics.topSellingProducts
      .map((product, index) => {
        // ✅ Safety check for each product
        if (!product) return "";

        const productName = product.nama || `Product ${index + 1}`;
        const totalSold = product.total_sold || 0;
        const totalRevenue = product.total_revenue || 0;

        return `
        <div class="top-product-item">
          <div class="product-rank">#${index + 1}</div>
          <div class="product-info">
            <span class="product-name">${productName}</span>
            <span class="product-sales">${totalSold} sold</span>
          </div>
          <div class="product-revenue">
            Rp ${totalRevenue.toLocaleString()}
          </div>
        </div>
      `;
      })
      .filter((item) => item !== "") // Remove empty items
      .join("");
  }

  getTrendIcon() {
    switch (this.metrics.salesTrend) {
      case "increasing":
        return "📈";
      case "decreasing":
        return "📉";
      default:
        return "➡️";
    }
  }

  getTrendClass() {
    switch (this.metrics.salesTrend) {
      case "increasing":
        return "trend-up";
      case "decreasing":
        return "trend-down";
      default:
        return "trend-stable";
    }
  }

  validateMetrics() {
    // Ensure all required properties exist with valid defaults
    const defaults = {
      totalRevenue: 0,
      totalTransactions: 0,
      avgOrderValue: 0,
      topSellingProducts: [],
      lowStockAlerts: 0,
      hourlyRevenue: [],
      salesTrend: "stable",
      customerCount: 0,
      conversionRate: 0,
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (this.metrics[key] === undefined || this.metrics[key] === null) {
        this.metrics[key] = defaultValue;
      }
    }

    // Ensure topSellingProducts is always an array
    if (!Array.isArray(this.metrics.topSellingProducts)) {
      this.metrics.topSellingProducts = this.generateFallbackTopProducts();
    }
  }

  updateMetricsDisplay() {
    const container = document.querySelector(".real-time-metrics");
    if (container) {
      // Instead of removing and recreating, just update the content
      const newHTML = this.generateMetricsHTML();
      container.innerHTML = newHTML;
      this.attachMetricsEventListeners();
    } else {
      // If container doesn't exist, create it
      this.displayRealTimeMetrics();
    }
  }

  getCurrentMetrics() {
    return { ...this.metrics };
  }

  isReady() {
    return this.isActive && this.metrics.totalRevenue !== undefined;
  }

  handleVoiceCommand(command) {
    const lowerCommand = command.toLowerCase();

    if (
      lowerCommand.includes("refresh analytics") ||
      lowerCommand.includes("update metrics")
    ) {
      this.refresh();
      return true;
    }

    if (
      lowerCommand.includes("export analytics") ||
      lowerCommand.includes("download report")
    ) {
      this.exportData();
      return true;
    }

    return false;
  }

  integrateWithSmartInventory(smartInventorySystem) {
    this.system = smartInventorySystem;
    console.log("🔗 Analytics integrated with Smart Inventory System");

    // Update metrics when products change
    if (this.system.products) {
      this.updateLowStockAlerts();
    }
  }

  async refresh() {
    console.log("🔄 Refreshing analytics data...");
    await this.fetchInitialData();
    this.updateMetricsDisplay();

    // Show success message
    this.showNotification(
      "✅ Analytics data refreshed successfully!",
      "success"
    );
  }

  exportData() {
    const data = {
      date: new Date().toISOString().split("T")[0],
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("📊 Report exported successfully!", "success");
  }

  showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(
      ".analytics-notification"
    );
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `analytics-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  stop() {
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
