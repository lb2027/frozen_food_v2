class ExpandableSmartInventory {
  constructor() {
    this.isExpanded = false;
    this.isLoading = false;
    this.smartInventorySystem = null;
  }

  async initialize() {
    console.log("🎯 Initializing Expandable Smart Inventory...");

    try {
      // Find or enhance existing dashboard
      this.enhanceExistingDashboard();

      console.log("✅ Expandable Smart Inventory initialized successfully");
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize Expandable Smart Inventory:",
        error
      );
      throw error;
    }
  }

  // Enhance existing Smart Inventory Dashboard with expandable functionality
  // Update the enhanceExistingDashboard method

  enhanceExistingDashboard() {
    console.log("🔧 Enhancing existing Smart Inventory Dashboard...");

    // Wait for the dashboard to be created if it doesn't exist yet
    const checkForDashboard = () => {
      const existingDashboard = document.querySelector(
        ".smart-inventory-dashboard"
      );

      if (!existingDashboard) {
        console.log("Dashboard not found yet, waiting...");
        return false;
      }

      // Check if already enhanced
      if (existingDashboard.closest(".smart-inventory-expandable-wrapper")) {
        console.log("Dashboard already enhanced with expandable functionality");
        return true;
      }

      // ✅ Ensure dashboard is positioned correctly after header
      this.ensureCorrectPosition(existingDashboard);

      // Wrap existing dashboard in expandable container
      this.wrapExistingDashboard(existingDashboard);
      console.log(
        "✅ Dashboard successfully enhanced with expandable functionality"
      );
      return true;
    };

    // Try immediately
    if (checkForDashboard()) {
      return true;
    }

    // If not found, retry with intervals
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(() => {
      retryCount++;

      if (checkForDashboard() || retryCount >= maxRetries) {
        clearInterval(retryInterval);
        if (retryCount >= maxRetries) {
          console.warn(
            "⚠️ Could not find Smart Inventory dashboard after 10 attempts"
          );
          // Create dashboard in correct position
          this.createDashboardInCorrectPosition();
        }
      }
    }, 1000);

    return false;
  }

  createDashboardInCorrectPosition() {
    console.log("📦 Creating Smart Inventory dashboard in correct position...");

    const placeholder = document.getElementById("smart-inventory-placeholder");
    const header = document.querySelector(".main-content header");

    const fallbackHTML = `
    <div class="smart-inventory-dashboard">
      <div class="smart-header">
        <h3>🧠 Smart Inventory System</h3>
        <button id="refresh-predictions" class="smart-btn" type="button">
          <span class="refresh-icon">🔄</span> Refresh
        </button>
      </div>
      <div class="smart-widgets">
        <div class="smart-widget">
          <h4>⏳ Loading Smart Inventory...</h4>
          <p>Smart Inventory System is initializing...</p>
        </div>
      </div>
    </div>
  `;

    if (placeholder) {
      placeholder.innerHTML = fallbackHTML;
      console.log("✅ Dashboard created in placeholder");
    } else if (header) {
      header.insertAdjacentHTML("afterend", fallbackHTML);
      console.log("✅ Dashboard created after header");
    } else {
      console.error("❌ Could not create dashboard in correct position");
      return;
    }

    // Now wrap it
    setTimeout(() => {
      const dashboard = document.querySelector(".smart-inventory-dashboard");
      if (dashboard) {
        this.wrapExistingDashboard(dashboard);
      }
    }, 100);
  }

  ensureCorrectPosition(dashboard) {
    const header = document.querySelector(".main-content header");
    const placeholder = document.getElementById("smart-inventory-placeholder");

    if (placeholder && !placeholder.contains(dashboard)) {
      // Move dashboard to placeholder
      placeholder.appendChild(dashboard);
      console.log("📍 Dashboard moved to correct position (placeholder)");
    } else if (header && dashboard.previousElementSibling !== header) {
      // Move dashboard right after header
      header.insertAdjacentElement("afterend", dashboard);
      console.log("📍 Dashboard moved to correct position (after header)");
    }
  }

  // Add fallback container creation
  createFallbackContainer() {
    console.log("📦 Creating fallback Smart Inventory container...");

    const targetElement =
      document.querySelector(".main-content") || document.body;

    const fallbackContainer = document.createElement("div");
    fallbackContainer.className = "smart-inventory-dashboard";
    fallbackContainer.innerHTML = `
    <div class="smart-header">
      <h3>🧠 Smart Inventory System</h3>
      <button id="refresh-predictions" class="smart-btn" type="button">
        <span class="refresh-icon">🔄</span> Refresh
      </button>
    </div>
    <div class="smart-widgets">
      <div class="smart-widget">
        <h4>⏳ Loading Smart Inventory...</h4>
        <p>Smart Inventory System is initializing...</p>
      </div>
    </div>
  `;

    // Insert at the beginning of main content
    const firstChild = targetElement.firstElementChild;
    if (firstChild) {
      targetElement.insertBefore(fallbackContainer, firstChild);
    } else {
      targetElement.appendChild(fallbackContainer);
    }

    // Now wrap it
    setTimeout(() => {
      this.wrapExistingDashboard(fallbackContainer);
    }, 100);
  }

  wrapExistingDashboard(dashboard) {
    // Create expandable wrapper
    const expandableWrapper = document.createElement("div");
    expandableWrapper.className = "smart-inventory-expandable-wrapper";

    // Create header with expand functionality
    const expandableHeader = document.createElement("div");
    expandableHeader.className = "smart-inventory-expandable-header";
    expandableHeader.innerHTML = `
      <div class="expandable-title">
        <span class="ai-icon">🤖</span>
        <span>Smart Inventory System</span>
        <span class="preview-indicator">- Quick Overview</span>
      </div>
      <div class="expand-controls">
        <button class="expand-toggle-btn" id="smart-inventory-expand-toggle">
          <span class="expand-text">Show Full Dashboard</span>
          <span class="expand-arrow">▼</span>
        </button>
      </div>
    `;

    // Create collapsible content wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "smart-inventory-content-wrapper collapsed";

    // Move existing dashboard into content wrapper
    dashboard.parentNode.insertBefore(expandableWrapper, dashboard);
    contentWrapper.appendChild(dashboard);
    expandableWrapper.appendChild(expandableHeader);
    expandableWrapper.appendChild(contentWrapper);

    // Add click event to header
    expandableHeader.addEventListener("click", () => {
      this.toggleExpansion(contentWrapper, expandableHeader);
    });

    // Initially show only preview
    this.setupPreviewMode(dashboard);
  }

  setupPreviewMode(dashboard) {
    // Hide all widgets except the first one (or create a preview widget)
    const widgets = dashboard.querySelectorAll(".smart-widget");

    if (widgets.length === 0) {
      // Create preview widget if no widgets exist yet
      this.createPreviewWidget(dashboard);
    } else {
      // Hide widgets beyond the first one in collapsed mode
      widgets.forEach((widget, index) => {
        if (index > 0) {
          widget.style.display = "none";
          widget.classList.add("hidden-in-preview");
        }
      });
    }
  }

  createPreviewWidget(dashboard) {
    const smartWidgets = dashboard.querySelector(".smart-widgets");
    if (!smartWidgets) return;

    const previewWidget = document.createElement("div");
    previewWidget.className = "smart-widget preview-widget";
    previewWidget.innerHTML = `
      <div class="widget-header">
        <h4>🎯 AI Analysis Ready</h4>
        <span class="status-badge active">Active</span>
      </div>
      <div class="widget-content">
        <div class="preview-stats">
          <div class="preview-stat">
            <span class="stat-icon">📊</span>
            <span class="stat-label">Stock Analysis</span>
            <span class="stat-status">Ready</span>
          </div>
          <div class="preview-stat">
            <span class="stat-icon">🔮</span>
            <span class="stat-label">Predictions</span>
            <span class="stat-status">Available</span>
          </div>
          <div class="preview-stat">
            <span class="stat-icon">💡</span>
            <span class="stat-label">AI Insights</span>
            <span class="stat-status">Generated</span>
          </div>
        </div>
        <div class="preview-action">
          <p>Click header to expand full AI dashboard with detailed analytics, predictions, and insights.</p>
        </div>
      </div>
    `;

    smartWidgets.insertBefore(previewWidget, smartWidgets.firstChild);
  }

  // Update the toggleExpansion method in the ExpandableSmartInventory class

  async toggleExpansion(contentWrapper, header) {
    if (this.isLoading) return;

    this.isExpanded = !this.isExpanded;
    this.isLoading = true;

    const expandText = header.querySelector(".expand-text");
    const expandArrow = header.querySelector(".expand-arrow");
    const previewIndicator = header.querySelector(".preview-indicator");

    if (this.isExpanded) {
      // Add expanding animation class
      contentWrapper.classList.add("expanding");

      // Expand
      contentWrapper.classList.remove("collapsed");
      contentWrapper.classList.add("expanded");
      expandText.textContent = "Collapse Dashboard";
      expandArrow.textContent = "▲";
      previewIndicator.textContent = "- Full Dashboard";

      // Show all hidden widgets
      await this.showFullDashboard(contentWrapper);

      // Remove animation class after transition
      setTimeout(() => {
        contentWrapper.classList.remove("expanding");
      }, 500);
    } else {
      // Add collapsing animation class
      contentWrapper.classList.add("collapsing");

      // Collapse
      contentWrapper.classList.remove("expanded");
      contentWrapper.classList.add("collapsed");
      expandText.textContent = "Show Full Dashboard";
      expandArrow.textContent = "▼";
      previewIndicator.textContent = "- Quick Overview";

      // Hide widgets beyond preview
      this.hideNonPreviewWidgets(contentWrapper);

      // Remove animation class after transition
      setTimeout(() => {
        contentWrapper.classList.remove("collapsing");
      }, 500);
    }

    this.isLoading = false;

    // Smooth scroll to header if expanding
    if (this.isExpanded) {
      setTimeout(() => {
        header.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }

  async showFullDashboard(contentWrapper) {
    const dashboard = contentWrapper.querySelector(
      ".smart-inventory-dashboard"
    );
    const widgets = dashboard.querySelectorAll(
      ".smart-widget.hidden-in-preview"
    );

    // Show loading for hidden widgets
    widgets.forEach((widget) => {
      widget.style.display = "block";
      widget.classList.remove("hidden-in-preview");
    });

    // Refresh Smart Inventory data if system is available
    if (window.smartInventorySystem) {
      try {
        await window.smartInventorySystem.updateDashboard();
        console.log("✅ Smart Inventory dashboard refreshed");
      } catch (error) {
        console.error("❌ Error refreshing Smart Inventory:", error);
      }
    }
  }

  hideNonPreviewWidgets(contentWrapper) {
    const widgets = contentWrapper.querySelectorAll(".smart-widget");

    widgets.forEach((widget, index) => {
      if (index > 0 && !widget.classList.contains("preview-widget")) {
        widget.style.display = "none";
        widget.classList.add("hidden-in-preview");
      }
    });
  }

  // Method to update preview stats with real data
  updatePreviewStats(data) {
    const previewWidget = document.querySelector(
      ".smart-widget.preview-widget"
    );
    if (!previewWidget || !data) return;

    const stats = previewWidget.querySelectorAll(".preview-stat");

    if (stats.length >= 3) {
      // Update stock analysis status
      const lowStock = data.filter((p) => p.stok < 10).length;
      stats[0].querySelector(".stat-status").textContent =
        lowStock > 0 ? `${lowStock} alerts` : "Good";

      // Update predictions status
      stats[1].querySelector(".stat-status").textContent =
        data.length > 0 ? "Ready" : "No data";

      // Update insights status
      stats[2].querySelector(".stat-status").textContent = "Updated";
    }
  }

  // Update the toggleExpansion method in the ExpandableSmartInventory class
}
