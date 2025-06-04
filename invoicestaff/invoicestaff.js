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

  attachEventListeners() {
    // Filter listeners
    if (this.filterBtn) {
      this.filterBtn.addEventListener("click", () => this.applyFilters());
    }
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => this.loadInvoices());
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
        window.location.href = "../../dashboard_staff/Html/staff.html";
      });
    }

    // Pagination listeners (if elements exist)
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

    // Auto-filter on date/status change
    if (this.startDateInput) {
      this.startDateInput.addEventListener("change", () => this.applyFilters());
    }
    if (this.endDateInput) {
      this.endDateInput.addEventListener("change", () => this.applyFilters());
    }
    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", () => this.applyFilters());
    }
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

      // Add filters if applied
      const startDate = this.startDateInput?.value;
      const endDate = this.endDateInput?.value;
      const status = this.statusFilter?.value;

      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (status) url += `&status=${status}`;

      console.log("Loading invoices from:", url);

      // Include authentication token in headers
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: this.token, // Match your system's token header
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Invoice data received:", data);

      this.displayInvoices(data.invoices || []);
      this.updateStats(data.invoices || []);
      this.updatePagination(
        data.total_count || data.total || data.invoices?.length || 0
      );
      this.hideLoading();
    } catch (error) {
      console.error("Error loading invoices:", error);
      this.showError("Failed to load invoices: " + error.message);
      this.hideLoading();
    }
  }

  updateStats(invoices) {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum + (invoice.total_amount || 0),
      0
    );
    const paidInvoices = invoices.filter(
      (invoice) => invoice.payment_status === "PAID"
    ).length;

    // Only update if elements exist
    if (this.totalInvoicesEl) {
      this.totalInvoicesEl.textContent = totalInvoices.toLocaleString();
    }
    if (this.totalRevenueEl) {
      this.totalRevenueEl.textContent = this.formatCurrency(totalRevenue);
    }
    if (this.paidInvoicesEl) {
      this.paidInvoicesEl.textContent = paidInvoices.toLocaleString();
    }
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
            <td>${this.formatDate(invoice.invoice_date)}</td>
            <td>${invoice.item_count}</td>
            <td>${this.formatCurrency(invoice.total_amount)}</td>
            <td>
              <span class="status-badge status-${invoice.payment_status.toLowerCase()}">
                ${invoice.payment_status}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="invoiceManager.viewInvoice('${invoice.transaction_id}')" title="View Details">
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View
                </button>

                <button class="btn btn-sm btn-success" onclick="invoiceManager.printProfessionalInvoice('${invoice.transaction_id}')" title="Professional Print">
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
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print
                </button>

                <button class="btn btn-sm btn-warning" onclick="invoiceManager.previewInvoice('${invoice.transaction_id}')" title="Preview Full Layout">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Preview
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

  displayInvoiceDetail(invoice) {
    if (!this.invoiceContent) {
      console.error("Invoice content element not found!");
      return;
    }

    const invoiceHTML = `
      <div class="invoice-preview">
        <div class="invoice-header">
          <div class="business-info">
            <h2>${
              invoice.business_info?.name || "Bintang Jaya Frozen Food"
            }</h2>
            <p>${
              invoice.business_info?.address ||
              "Jl. Raya Frozen No. 123, Jakarta Selatan"
            }</p>
            <p>Phone: ${invoice.business_info?.phone || "+62 21 1234 5678"}</p>
            <p>Email: ${
              invoice.business_info?.email || "info@bintangjaya.com"
            }</p>
            <p>Tax ID: ${
              invoice.business_info?.tax_id || "01.234.567.8-901.000"
            }</p>
          </div>
          <div class="invoice-info">
            <h1>INVOICE</h1>
            <p><strong>Invoice ID:</strong> ${invoice.invoice_id}</p>
            <p><strong>Transaction ID:</strong> ${invoice.transaction_id}</p>
            <p><strong>Date:</strong> ${this.formatDate(
              invoice.invoice_date
            )}</p>
            <p><strong>Due Date:</strong> ${this.formatDate(
              invoice.due_date
            )}</p>
          </div>
        </div>

        <div class="customer-section">
          <div class="customer-info">
            <h4>Bill To:</h4>
            <p><strong>${
              invoice.customer_name || "Walk-in Customer"
            }</strong></p>
            ${
              invoice.customer_phone
                ? `<p>Phone: ${invoice.customer_phone}</p>`
                : ""
            }
            <p>Payment: ${invoice.payment_method}</p>
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
                  .join("") || '<tr><td colspan="5">No items found</td></tr>'
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
              <span><strong>TOTAL:</strong></span>
              <span><strong>${this.formatCurrency(
                invoice.total || 0
              )}</strong></span>
            </div>
          </div>
        </div>

        <div class="invoice-actions">
          <button class="btn btn-sm btn-success" onclick="invoiceManager.printProfessionalInvoice('${invoice.transaction_id}')" title="Professional Print">
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          <button class="btn btn-sm btn-warning" onclick="invoiceManager.previewInvoice('${invoice.transaction_id}')" title="Preview Full Layout">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Preview
          </button>

          <button class="btn btn-sm btn-primary" onclick="invoiceManager.viewInvoice('${invoice.transaction_id}')" title="View Details">
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View
          </button>

        </div>

        ${
          invoice.notes
            ? `
            <div class="notes-section">
              <h4>Notes:</h4>
              <p>${invoice.notes}</p>
            </div>
          `
            : ""
        }
      </div>
    `;

    this.invoiceContent.innerHTML = invoiceHTML;
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
      //this.showSuccess("Invoice ready for printing!");
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

  applyFilters() {
    this.currentPage = 1;
    this.loadInvoices();
  }

  closeInvoiceModal() {
    if (this.invoiceModal) {
      this.invoiceModal.style.display = "none";
    }
  }

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
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
}

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

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.invoiceManager = new InvoiceManager();
});
