class InvoiceManager {
  constructor() {
    // Get API URL from localStorage or use default
    this.apiBaseUrl =
      localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";
    this.currentPage = 1;
    this.pageLimit = 10;

    // Check authentication before initializing
    if (!this.checkAuth()) {
      return; // Don't initialize if not authenticated
    }

    this.initializeElements();
    this.attachEventListeners();
    this.initializeApiUrl().then(() => {
      this.loadInvoices();
    });
  }

  // Authentication check function (same as owner.js)
  checkAuth() {
    const token = localStorage.getItem("authToken");

    if (!token || this.isTokenExpired(token)) {
      window.location.href = "/login/login.html";
      return false;
    }

    this.token = token; // Store token for API calls
    return true;
  }

  // Function to check if the token is expired (same as owner.js)
  isTokenExpired(token) {
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

  // Function to read the JSON file (same as owner.js)
  async readJsonFile(filePath) {
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

  // Read the JSON file and set the API URL (same as owner.js)
  async initializeApiUrl() {
    const envData = await this.readJsonFile("/json/env.json");
    if (envData && envData.api_url) {
      localStorage.setItem("apiUrl", envData.api_url);
      this.apiBaseUrl = envData.api_url; // Update the instance variable
    } else {
      console.warn("Failed to read API URL from JSON, using default");
    }
  }

  closeInvoiceModal() {
    if (this.invoiceModal) {
      this.invoiceModal.style.display = "none";
      this.invoiceContent.innerHTML = ""; // Clear content
    }
  }

  initializeElements() {
    // Filter elements
    this.startDateInput = document.getElementById("startDate");
    this.endDateInput = document.getElementById("endDate");
    this.statusFilter = document.getElementById("statusFilter");
    this.filterBtn = document.getElementById("filterBtn");
    this.refreshBtn = document.getElementById("refreshBtn");

    // Table elements
    this.invoiceTableBody = document.getElementById("invoiceTableBody");
    this.noDataMessage = document.getElementById("noDataMessage");

    // Modal elements
    this.invoiceModal = document.getElementById("invoiceModal");
    this.invoiceContent = document.getElementById("invoiceContent");
    this.closeModal = document.querySelector(".close");

    // Stats elements (if they exist)
    this.totalInvoicesEl = document.getElementById("totalInvoices");
    this.totalRevenueEl = document.getElementById("totalRevenue");
    this.paidInvoicesEl = document.getElementById("paidInvoices");

    // Pagination elements (if they exist)
    this.paginationInfo = document.getElementById("paginationInfo");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.pageNumbers = document.getElementById("pageNumbers");

    // Navigation elements (if they exist)
    this.logoutBtn = document.getElementById("logout-btn");
    this.backButton = document.querySelector(".back-button");

    // Loading element (if it exists)
    this.loader = document.getElementById("loader");
  }

  // ✅ FIX: Improved date validation and formatting
  validateDateRange(startDate, endDate) {
    if (!startDate && !endDate) {
      return { valid: true }; // No filter applied
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return {
          valid: false,
          message: "Start date must be before or equal to end date",
        };
      }
    }

    return { valid: true };
  }

  // ✅ FIX: Format date for API (ensure YYYY-MM-DD format)
  formatDateForAPI(dateString) {
    if (!dateString) return null;

    // Ensure format is YYYY-MM-DD
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];
  }

  attachEventListeners() {
    // Filter listeners
    if (this.filterBtn) {
      this.filterBtn.addEventListener("click", () => this.applyFilters());
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        // Clear filters and reload all data
        this.clearFilters();
        this.loadInvoices();
      });
    }

    // Modal listeners
    if (this.closeModal) {
      this.closeModal.addEventListener("click", () => this.closeInvoiceModal());
    }

    // Navigation listeners
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    if (this.backButton) {
      this.backButton.addEventListener("click", () => {
        window.location.href = "/dashboard_owner/owner.html";
      });
    }

    // Pagination listeners
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.goToPreviousPage());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.goToNextPage());
    }

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === this.invoiceModal) {
        this.closeInvoiceModal();
      }
    });

    // ✅ IMPROVED: Auto-filter with debouncing for better UX
    if (this.startDateInput) {
      this.startDateInput.addEventListener("change", () => {
        this.debounceApplyFilters();
      });
    }

    if (this.endDateInput) {
      this.endDateInput.addEventListener("change", () => {
        this.debounceApplyFilters();
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", () => {
        this.debounceApplyFilters();
      });
    }
  }

  // ✅ NEW: Debounced filter application for better performance
  debounceApplyFilters() {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.applyFilters();
    }, 500); // Wait 500ms after user stops typing/changing
  }

  // Navigation methods
  handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("apiUrl");
      window.location.href = "/login/login.html";
    }
  }

  // Pagination methods (safe implementation)
  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInvoices();
    }
  }

  goToNextPage() {
    this.currentPage++;
    this.loadInvoices();
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadInvoices();
  }

  updatePagination(totalCount) {
    if (!totalCount) return;

    const totalPages = Math.ceil(totalCount / this.pageLimit);
    const startItem = (this.currentPage - 1) * this.pageLimit + 1;
    const endItem = Math.min(this.currentPage * this.pageLimit, totalCount);

    // Update pagination info (if element exists)
    if (this.paginationInfo) {
      this.paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalCount} invoices`;
    }

    // Update pagination buttons (if elements exist)
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage <= 1;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage >= totalPages;
    }

    // Update page numbers (if element exists)
    if (this.pageNumbers) {
      this.pageNumbers.innerHTML = "";
      const maxVisiblePages = 5;
      let startPage = Math.max(
        1,
        this.currentPage - Math.floor(maxVisiblePages / 2)
      );
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `page-btn ${
          i === this.currentPage ? "active" : ""
        }`;
        pageBtn.textContent = i;
        pageBtn.addEventListener("click", () => this.goToPage(i));
        this.pageNumbers.appendChild(pageBtn);
      }
    }
  }

  async loadInvoices() {
    try {
      this.showLoading();

      let url = `${this.apiBaseUrl}/invoices?page=${this.currentPage}&limit=${this.pageLimit}`;

      // ✅ IMPROVED: Get filter values with validation
      const startDateValue = this.startDateInput?.value;
      const endDateValue = this.endDateInput?.value;
      const statusValue = this.statusFilter?.value;

      // ✅ VALIDATE: Date range validation
      const dateValidation = this.validateDateRange(
        startDateValue,
        endDateValue
      );
      if (!dateValidation.valid) {
        this.showError(dateValidation.message);
        this.hideLoading();
        return;
      }

      // ✅ FORMAT: Ensure proper date format for API
      const startDate = this.formatDateForAPI(startDateValue);
      const endDate = this.formatDateForAPI(endDateValue);

      // ✅ BUILD: URL with properly formatted parameters
      const params = new URLSearchParams();
      params.append("page", this.currentPage);
      params.append("limit", this.pageLimit);

      if (startDate) {
        params.append("start_date", startDate);
        console.log("Adding start_date filter:", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
        console.log("Adding end_date filter:", endDate);
      }
      if (statusValue && statusValue !== "") {
        params.append("status", statusValue);
        console.log("Adding status filter:", statusValue);
      }

      url = `${this.apiBaseUrl}/invoices?${params.toString()}`;
      console.log("Loading invoices from:", url);

      // ✅ API CALL: Include authentication token
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: this.token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Invoice data received:", data);

      // ✅ Store total count for stats
      this.totalInvoicesCount = data.total_count || 0;

      this.displayInvoices(data.invoices || []);
      this.updateStats(data.invoices || []);
      this.updatePagination(data.total_count || 0);

      // ✅ SHOW: Filter info to user
      this.showFilterInfo(startDate, endDate, statusValue);

      this.hideLoading();
    } catch (error) {
      console.error("Error loading invoices:", error);
      this.showError("Failed to load invoices: " + error.message);
      this.hideLoading();
    }
  }

  // ✅ NEW: Show filter information to user
  showFilterInfo(startDate, endDate, status) {
    let filterText = [];

    if (startDate && endDate) {
      if (startDate === endDate) {
        filterText.push(`📅 ${this.formatDateString(startDate)}`);
      } else {
        filterText.push(
          `📅 ${this.formatDateString(startDate)} to ${this.formatDateString(
            endDate
          )}`
        );
      }
    } else if (startDate) {
      filterText.push(`📅 From: ${this.formatDateString(startDate)}`);
    } else if (endDate) {
      filterText.push(`📅 Until: ${this.formatDateString(endDate)}`);
    }

    if (status) {
      filterText.push(`📊 Status: ${status}`);
    }

    // ✅ ADD: Show filter indicator in UI
    const existingIndicator = document.querySelector(".filter-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    if (filterText.length > 0) {
      const indicator = document.createElement("span");
      indicator.className = "filter-indicator";
      indicator.textContent = `🔍 Active: ${filterText.join(", ")}`;

      const filtersContainer = document.querySelector(".quick-filters");
      if (filtersContainer) {
        filtersContainer.appendChild(indicator);
      }

      console.log("Applied filters:", filterText.join(", "));
    }
  }

  // ✅ FIX: Improved applyFilters method
  applyFilters() {
    // Reset to first page when applying filters
    this.currentPage = 1;

    // ✅ VALIDATE: Inputs before applying
    const startDate = this.startDateInput?.value;
    const endDate = this.endDateInput?.value;

    const validation = this.validateDateRange(startDate, endDate);
    if (!validation.valid) {
      this.showError(validation.message);
      return;
    }

    // Show loading and apply filters
    console.log("Applying filters...", {
      startDate,
      endDate,
      status: this.statusFilter?.value,
    });
    this.loadInvoices();
  }

  // Stats elements (if they exist)
  updateStats(invoices) {
    const currentPageInvoices = invoices.length;

    // For total stats, you should get this from the response
    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum + (invoice.total_amount || 0),
      0
    );
    const paidInvoices = invoices.filter(
      (invoice) => invoice.payment_status === "PAID"
    ).length;

    // Only update if elements exist
    if (this.totalInvoicesEl) {
      // ✅ This should show total count from server, not current page
      // You might want to store totalCount from the API response
      this.totalInvoicesEl.textContent =
        this.totalInvoicesCount?.toLocaleString() ||
        currentPageInvoices.toLocaleString();
    }
    if (this.totalRevenueEl) {
      this.totalRevenueEl.textContent = this.formatCurrency(totalRevenue);
    }
    if (this.paidInvoicesEl) {
      this.paidInvoicesEl.textContent = paidInvoices.toLocaleString();
    }
  }

  // ✅ FIX: Format tanggal tanpa timezone conversion
  formatDate(dateString) {
    if (!dateString) return "-";

    // ✅ Method 1: Parse dengan explicit timezone
    const date = new Date(dateString + "T00:00:00");

    // ✅ Method 2: Manual parsing (lebih aman)
    const [year, month, day] = dateString.split("-");
    const dateObj = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );

    return dateObj.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // ✅ Alternative: String manipulation method
  formatDateString(dateString) {
    if (!dateString) return "-";

    const [year, month, day] = dateString.split("-");
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  }

  displayInvoices(invoices) {
    if (!this.invoiceTableBody) {
      console.error("Invoice table body element not found!");
      return;
    }

    if (invoices.length === 0) {
      this.invoiceTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 40px; text-align: center; color: #666;">
            <div style="font-size: 18px; margin-bottom: 10px;">📋</div>
            <div>No invoices found</div>
            <div style="font-size: 14px; margin-top: 5px;">Try adjusting your filters</div>
          </td>
        </tr>
      `;

      if (this.noDataMessage) {
        this.noDataMessage.style.display = "block";
      }
      return;
    }

    if (this.noDataMessage) {
      this.noDataMessage.style.display = "none";
    }

    this.invoiceTableBody.innerHTML = invoices
      .map(
        (invoice) => `
          <tr>
            <td>${invoice.invoice_id}</td>
            <td>${invoice.transaction_id}</td>
            <td>${this.formatDateString(invoice.invoice_date)}</td>
            <td>${invoice.item_count}</td>
            <td>${this.formatCurrency(invoice.total_amount)}</td>
            <td>
              <span class="status-badge status-${invoice.payment_status.toLowerCase()}">
                ${invoice.payment_status}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="invoiceManager.viewInvoice('${
                  invoice.transaction_id
                }')" title="View Details">
                  👁️ View
                </button>
                <button class="btn btn-sm btn-success" onclick="invoiceManager.printProfessionalInvoice('${
                  invoice.transaction_id
                }')" title="Professional Print">
                  🖨️ Print
                </button>
                <button class="btn btn-sm btn-warning" onclick="invoiceManager.previewInvoice('${
                  invoice.transaction_id
                }')" title="Preview Full Layout">
                  📄 Preview
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  async viewInvoice(transactionId) {
    try {
      this.showLoading();

      const response = await fetch(
        `${this.apiBaseUrl}/invoice/by-transaction?transaction_id=${transactionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: this.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const invoice = await response.json();
      this.displayInvoiceDetail(invoice);

      if (this.invoiceModal) {
        this.invoiceModal.style.display = "block";
      }
      this.hideLoading();
    } catch (error) {
      console.error("Error loading invoice detail:", error);
      this.showError("Failed to load invoice details: " + error.message);
      this.hideLoading();
    }
  }

  // ✅ ENHANCEMENT: Update displayInvoiceDetail method for dark theme
  displayInvoiceDetail(invoice) {
    if (!this.invoiceContent) {
      console.error("Invoice content element not found!");
      return;
    }

    const invoiceHTML = `
    <div class="invoice-preview">
      <div class="invoice-header">
        <div class="business-info">
          <h2>${invoice.business_info?.name || "Bintang Jaya Frozen Food"}</h2>
          <p>📍 ${
            invoice.business_info?.address ||
            "Jl. Raya Frozen No. 123, Jakarta Selatan"
          }</p>
          <p>📞 ${invoice.business_info?.phone || "+62 21 1234 5678"}</p>
          <p>📧 ${invoice.business_info?.email || "info@bintangjaya.com"}</p>
          <p>🏢 Tax ID: ${
            invoice.business_info?.tax_id || "01.234.567.8-901.000"
          }</p>
        </div>
        <div class="invoice-info">
          <h1>INVOICE</h1>
          <p><strong>Invoice ID:</strong> ${invoice.invoice_id}</p>
          <p><strong>Transaction ID:</strong> ${invoice.transaction_id}</p>
          <p><strong>Date:</strong> ${this.formatDate(invoice.invoice_date)}</p>
          <p><strong>Due Date:</strong> ${this.formatDate(invoice.due_date)}</p>
        </div>
      </div>

      <div class="customer-section">
        <div class="customer-info">
          <h4>💳 Bill To:</h4>
          <p><strong>${invoice.customer_name || "Walk-in Customer"}</strong></p>
          ${invoice.customer_phone ? `<p>📞 ${invoice.customer_phone}</p>` : ""}
          <p>💰 Payment: ${invoice.payment_method}</p>
          <span class="status-badge status-${invoice.payment_status?.toLowerCase()}">
            ${invoice.payment_status}
          </span>
        </div>
      </div>

      <div class="invoice-items">
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoice.items
                ?.map(
                  (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div class="item-name">${item.product_name}</div>
                    <div class="item-description">${
                      item.description || ""
                    }</div>
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${this.formatCurrency(
                    item.unit_price
                  )}</td>
                  <td style="text-align: right;">${this.formatCurrency(
                    item.total_price
                  )}</td>
                </tr>
              `
                )
                .join("") ||
              '<tr><td colspan="5" style="text-align: center; color: #666;">No items found</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <div class="invoice-summary">
        <div class="summary-table">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          <div class="summary-row">
            <span>Tax (11%):</span>
            <span>${this.formatCurrency(invoice.tax || 0)}</span>
          </div>
          ${
            invoice.discount > 0
              ? `
              <div class="summary-row">
                <span>Discount:</span>
                <span>-${this.formatCurrency(invoice.discount)}</span>
              </div>
            `
              : ""
          }
          <div class="summary-row total-row">
            <span><strong>🏆 TOTAL:</strong></span>
            <span><strong>${this.formatCurrency(
              invoice.total || 0
            )}</strong></span>
          </div>
        </div>
      </div>

      <div class="invoice-actions">
        <button class="btn btn-primary" onclick="invoiceManager.printProfessionalInvoice('${
          invoice.transaction_id
        }')">
          🖨️ Print Professional
        </button>
        <button class="btn btn-success" onclick="invoiceManager.downloadInvoiceHTML('${
          invoice.transaction_id
        }')">
          📄 Download HTML
        </button>
        <button class="btn btn-warning" onclick="invoiceManager.previewInvoice('${
          invoice.transaction_id
        }')">
          👁️ Preview Layout
        </button>
      </div>

      ${
        invoice.notes
          ? `
          <div class="notes-section">
            <h4>📝 Notes:</h4>
            <p>${invoice.notes}</p>
          </div>
        `
          : ""
      }
    </div>
  `;

    this.invoiceContent.innerHTML = invoiceHTML;

    // ✅ ADD: Dark theme class to modal
    if (this.invoiceModal) {
      this.invoiceModal.classList.add("dark-theme");
    }
  }

  // Professional print using your HTML template
  async printProfessionalInvoice(transactionId) {
    try {
      this.showLoading();

      // Use the correct endpoint that matches your Go backend
      const response = await fetch(
        `${this.apiBaseUrl}/invoice/generate-html?transaction_id=${transactionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: this.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate invoice HTML: ${response.status}`);
      }

      const htmlContent = await response.text();
      this.openPrintWindow(htmlContent, transactionId);

      this.hideLoading();
      this.showSuccess("Invoice ready for printing!");
    } catch (error) {
      console.error("Error printing invoice:", error);
      this.showError("Failed to print invoice: " + error.message);
      this.hideLoading();
    }
  }

  openPrintWindow(htmlContent, transactionId) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto print after content loads
    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }

  // Preview invoice in new tab
  async previewInvoice(transactionId) {
    try {
      this.showLoading();

      const response = await fetch(
        `${this.apiBaseUrl}/invoice/generate-html?transaction_id=${transactionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: this.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const htmlContent = await response.text();

      // Open in new tab for preview
      const previewWindow = window.open("", "_blank");
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();

      this.hideLoading();
    } catch (error) {
      console.error("Error previewing invoice:", error);
      this.showError("Failed to preview invoice: " + error.message);
      this.hideLoading();
    }
  }

  // Download as HTML file
  async downloadInvoiceHTML(transactionId) {
    try {
      this.showLoading();

      const response = await fetch(
        `${this.apiBaseUrl}/invoice/generate-html?transaction_id=${transactionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: this.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const htmlContent = await response.text();

      // Create blob and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${transactionId}-${
        new Date().toISOString().split("T")[0]
      }.html`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      this.hideLoading();
      this.showSuccess(
        "Invoice downloaded! You can convert to PDF using browser print."
      );
    } catch (error) {
      console.error("Error downloading invoice:", error);
      this.showError("Failed to download invoice: " + error.message);
      this.hideLoading();
    }
  }

  // Auto-generate invoice after purchase (for POS integration)
  async autoGenerateInvoice(transactionData) {
    try {
      const requestData = {
        transaction_id: transactionData.transaction_id,
        customer_name: transactionData.customer_name || "Walk-in Customer",
        customer_phone: transactionData.customer_phone || "",
        cashier_name: transactionData.cashier_name || "Kasir 1",
        auto_print: transactionData.auto_print || false,
      };

      const response = await fetch(`${this.apiBaseUrl}/invoice/auto-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: this.token,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.showSuccess(
          `Invoice ${result.invoice_id} generated successfully!`
        );

        // Auto print if requested
        if (transactionData.auto_print) {
          setTimeout(() => {
            this.printProfessionalInvoice(result.transaction_id);
          }, 1000);
        }

        return result;
      } else {
        throw new Error(result.message || "Failed to generate invoice");
      }
    } catch (error) {
      console.error("Error auto-generating invoice:", error);
      this.showError("Failed to auto-generate invoice: " + error.message);
      throw error;
    }
  }

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return "-";

    // ✅ Method 1: Parse dengan explicit timezone
    const date = new Date(dateString + "T00:00:00");

    // ✅ Method 2: Manual parsing (lebih aman)
    const [year, month, day] = dateString.split("-");
    const dateObj = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );

    return dateObj.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatCurrency(amount) {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  showLoading() {
    if (this.loader) {
      this.loader.style.display = "flex";
    }
    document.body.style.cursor = "wait";
  }

  hideLoading() {
    if (this.loader) {
      this.loader.style.display = "none";
    }
    document.body.style.cursor = "default";
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showInfo(message) {
    this.showNotification(message, "info");
  }

  showNotification(message, type) {
    // Create and show notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;

    if (type === "success") notification.style.backgroundColor = "#22c55e";
    else if (type === "error") notification.style.backgroundColor = "#ef4444";
    else notification.style.backgroundColor = "#3b82f6";

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 4000);
  }

  // ✅ ADD: Missing clearFilters method
  clearFilters() {
    if (this.startDateInput) this.startDateInput.value = "";
    if (this.endDateInput) this.endDateInput.value = "";
    if (this.statusFilter) this.statusFilter.value = "";

    this.currentPage = 1;
    console.log("Filters cleared");
  }

  // ✅ ADD: Missing setDateRange method
  setDateRange(days) {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    if (this.startDateInput) {
      this.startDateInput.value = startDate.toISOString().split("T")[0];
    }
    if (this.endDateInput) {
      this.endDateInput.value = today.toISOString().split("T")[0];
    }

    console.log(
      `Setting date range: ${days} days (${
        startDate.toISOString().split("T")[0]
      } to ${today.toISOString().split("T")[0]})`
    );
    this.applyFilters();
  }

  // ✅ ADD: Quick filter methods for better UX
  setToday() {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (this.startDateInput) this.startDateInput.value = todayStr;
    if (this.endDateInput) this.endDateInput.value = todayStr;

    console.log("Setting filter to today:", todayStr);
    this.applyFilters();
  }

  setYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (this.startDateInput) this.startDateInput.value = yesterdayStr;
    if (this.endDateInput) this.endDateInput.value = yesterdayStr;

    console.log("Setting filter to yesterday:", yesterdayStr);
    this.applyFilters();
  }

  setThisWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week

    startOfWeek.setDate(today.getDate() - daysToSubtract);

    if (this.startDateInput)
      this.startDateInput.value = startOfWeek.toISOString().split("T")[0];
    if (this.endDateInput)
      this.endDateInput.value = today.toISOString().split("T")[0];

    console.log("Setting filter to this week");
    this.applyFilters();
  }

  setThisMonth() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (this.startDateInput)
      this.startDateInput.value = startOfMonth.toISOString().split("T")[0];
    if (this.endDateInput)
      this.endDateInput.value = today.toISOString().split("T")[0];

    console.log("Setting filter to this month");
    this.applyFilters();
  }
}

// ✅ ADD: Global quick filter functions for HTML onclick
window.invoiceQuickFilters = {
  setDateRange: (days) => window.invoiceManager?.setDateRange(days),
  setToday: () => window.invoiceManager?.setToday(),
  setYesterday: () => window.invoiceManager?.setYesterday(),
  setThisWeek: () => window.invoiceManager?.setThisWeek(),
  setThisMonth: () => window.invoiceManager?.setThisMonth(),
  clearAll: () => {
    window.invoiceManager?.clearFilters();
    window.invoiceManager?.loadInvoices();
  },
};

// Integration with POS system for auto invoice generation
window.generateInvoiceAfterSale = async function (saleData) {
  if (window.invoiceManager) {
    try {
      const invoiceData = {
        transaction_id: saleData.transaction_id,
        customer_name: saleData.customer_name,
        customer_phone: saleData.customer_phone,
        cashier_name: saleData.cashier_name,
        auto_print: saleData.print_receipt || false,
      };

      const result = await window.invoiceManager.autoGenerateInvoice(
        invoiceData
      );
      return result;
    } catch (error) {
      console.error("Failed to generate invoice after sale:", error);
      return null;
    }
  }
};

function initializeMobileNavigation() {
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  if (hamburgerMenu && sidebar && sidebarOverlay) {
    // Toggle sidebar on hamburger click
    hamburgerMenu.addEventListener("click", function () {
      hamburgerMenu.classList.toggle("active");
      sidebar.classList.toggle("active");
      sidebarOverlay.classList.toggle("active");

      // Prevent body scroll when sidebar is open
      if (sidebar.classList.contains("active")) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    });

    // Close sidebar when overlay is clicked
    sidebarOverlay.addEventListener("click", function () {
      closeMobileSidebar();
    });

    // Close sidebar when sidebar item is clicked (for navigation)
    const sidebarItems = document.querySelectorAll(".sidebar-item");
    sidebarItems.forEach((item) => {
      item.addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          closeMobileSidebar();
        }
      });
    });
  }
}

function closeMobileSidebar() {
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  if (hamburgerMenu) hamburgerMenu.classList.remove("active");
  if (sidebar) sidebar.classList.remove("active");
  if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  document.body.style.overflow = "auto";
}

// Mobile Touch Gestures - Match history.js
function initializeTouchGestures() {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  const sidebar = document.querySelector(".sidebar");

  // Touch start
  document.addEventListener(
    "touchstart",
    function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  // Touch move
  document.addEventListener(
    "touchmove",
    function (e) {
      if (!startX || !startY) return;

      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;

      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Horizontal swipe detection
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Swipe right to open sidebar (only from left edge)
        if (diffX < -50 && startX < 50 && window.innerWidth <= 768) {
          e.preventDefault();
          openMobileSidebar();
        }
        // Swipe left to close sidebar
        else if (
          diffX > 50 &&
          sidebar &&
          sidebar.classList.contains("active")
        ) {
          e.preventDefault();
          closeMobileSidebar();
        }
      }
    },
    { passive: false }
  );

  // Touch end
  document.addEventListener(
    "touchend",
    function () {
      startX = 0;
      startY = 0;
      currentX = 0;
      currentY = 0;
    },
    { passive: true }
  );
}

function openMobileSidebar() {
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  if (hamburgerMenu) hamburgerMenu.classList.add("active");
  if (sidebar) sidebar.classList.add("active");
  if (sidebarOverlay) sidebarOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Mobile Performance Optimizations
function optimizeForMobile() {
  if (window.innerWidth <= 768) {
    // Reduce animations on mobile for better performance
    document.documentElement.style.setProperty("--transition-speed", "0.2s");

    // Add touch-friendly classes
    document.body.classList.add("touch-device");

    // Optimize scroll performance
    const scrollElements = document.querySelectorAll(
      ".table-container, .main-content"
    );
    scrollElements.forEach((element) => {
      element.style.webkitOverflowScrolling = "touch";
    });
  }
}

// Initialize all mobile features
function initializeMobileFeatures() {
  initializeMobileNavigation();
  initializeTouchGestures();
  optimizeForMobile();

  // Handle window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
      document.body.style.overflow = "auto";
    }
  });
}

// Initialize mobile features

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeMobileFeatures();
  window.invoiceManager = new InvoiceManager();
});
