// Create: dashboard_owner/shared/mobile-sidebar.js
// Shared mobile sidebar functionality for all pages

function initializeMobileSidebar() {
  // Create mobile header if it doesn't exist
  const mainContent =
    document.querySelector(".main-content") ||
    document.querySelector(".content");
  if (!document.querySelector(".mobile-header")) {
    const mobileHeader = document.createElement("div");
    mobileHeader.className = "mobile-header";
    mobileHeader.style.display = "none";

    mobileHeader.innerHTML = `
      <div class="hamburger-menu" id="hamburger-menu">
        <div class="hamburger-line"></div>
        <div class="hamburger-line"></div>
        <div class="hamburger-line"></div>
      </div>
      <h1 class="mobile-title">BINTANG JAYA</h1>
      <div class="mobile-user-info">
        <div class="notification">🔔</div>
      </div>
    `;

    mainContent.insertBefore(mobileHeader, mainContent.firstChild);
  }

  // Create sidebar overlay
  if (!document.querySelector(".sidebar-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  // Mobile menu functionality
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const mobileHeader = document.querySelector(".mobile-header");

  function toggleMobileMenu() {
    hamburgerMenu.classList.toggle("active");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  }

  function closeMobileMenu() {
    hamburgerMenu.classList.remove("active");
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  hamburgerMenu.addEventListener("click", toggleMobileMenu);
  overlay.addEventListener("click", closeMobileMenu);

  // Show/hide mobile header based on screen size
  function handleResize() {
    if (window.innerWidth <= 768) {
      mobileHeader.style.display = "flex";
    } else {
      mobileHeader.style.display = "none";
      closeMobileMenu();
    }
  }

  window.addEventListener("resize", handleResize);
  handleResize(); // Initial check

  // Close mobile menu when clicking sidebar items
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  // Touch gestures
  initializeMobileTouchGestures();
}

function initializeMobileTouchGestures() {
  let startX = 0;
  let startY = 0;

  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  document.addEventListener("touchend", (e) => {
    if (!startX || !startY) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = startX - endX;
    const diffY = startY - endY;

    // Swipe right to open sidebar (mobile only)
    if (window.innerWidth <= 768 && diffX < -100 && Math.abs(diffY) < 100) {
      const sidebar = document.querySelector(".sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      const hamburger = document.getElementById("hamburger-menu");

      if (!sidebar.classList.contains("active")) {
        hamburger.classList.add("active");
        sidebar.classList.add("active");
        overlay.classList.add("active");
      }
    }

    // Swipe left to close sidebar
    if (window.innerWidth <= 768 && diffX > 100 && Math.abs(diffY) < 100) {
      const sidebar = document.querySelector(".sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      const hamburger = document.getElementById("hamburger-menu");

      if (sidebar.classList.contains("active")) {
        hamburger.classList.remove("active");
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      }
    }

    startX = 0;
    startY = 0;
  });
}

function initializePullToRefreshForAllPages() {
  let startY = 0;
  let isPulling = false;
  const threshold = 100;

  const refreshContainer = document.createElement("div");
  refreshContainer.className = "pull-refresh-container";
  refreshContainer.innerHTML = "⬇️ Tarik untuk refresh";
  refreshContainer.style.cssText = `
    position: fixed;
    top: -60px;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    transition: top 0.3s ease;
    z-index: 1001;
    font-size: 14px;
  `;
  document.body.appendChild(refreshContainer);

  document.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
    }
  });

  document.addEventListener("touchmove", (e) => {
    if (window.scrollY === 0 && startY > 0) {
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0) {
        isPulling = true;
        const translateY = Math.min(pullDistance * 0.5, threshold);
        refreshContainer.style.top = `${translateY - 60}px`;

        if (pullDistance > threshold) {
          refreshContainer.innerHTML = "🔄 Lepas untuk refresh";
          refreshContainer.style.backgroundColor = "#2bb974";
        } else {
          refreshContainer.innerHTML = "⬇️ Tarik untuk refresh";
          refreshContainer.style.backgroundColor = "var(--primary)";
        }
      }
    }
  });

  document.addEventListener("touchend", (e) => {
    if (isPulling) {
      const pullDistance = e.changedTouches[0].clientY - startY;

      if (pullDistance > threshold) {
        refreshContainer.innerHTML = "⏳ Memuat ulang...";
        refreshContainer.style.top = "0px";

        // Page-specific refresh logic
        setTimeout(() => {
          const currentPath = window.location.pathname;

          if (currentPath.includes("owner.html")) {
            // Refresh dashboard data
            if (typeof fetchProduk === "function") fetchProduk();
            if (typeof fetchDailySales === "function") fetchDailySales();
          } else if (currentPath.includes("reports")) {
            // Refresh reports data
            if (typeof loadReports === "function") loadReports();
          } else if (currentPath.includes("history")) {
            // Refresh history data
            if (typeof loadTransactionHistory === "function")
              loadTransactionHistory();
          } else if (currentPath.includes("staff")) {
            // Refresh staff data
            if (typeof loadStaffData === "function") loadStaffData();
          } else if (currentPath.includes("invoice")) {
            // Refresh invoice data
            if (typeof loadInvoices === "function") loadInvoices();
          } else {
            // General page refresh
            window.location.reload();
          }

          refreshContainer.style.top = "-60px";
          refreshContainer.innerHTML = "✅ Berhasil diperbarui!";

          setTimeout(() => {
            refreshContainer.innerHTML = "⬇️ Tarik untuk refresh";
            refreshContainer.style.backgroundColor = "var(--primary)";
          }, 1000);
        }, 1000);
      } else {
        refreshContainer.style.top = "-60px";
      }

      isPulling = false;
      startY = 0;
    }
  });
}

// Enhanced navigation with page-specific features
function enhanceMobileNavigation() {
  // Add active page detection
  const currentPath = window.location.pathname;
  const sidebarItems = document.querySelectorAll(".sidebar-item a");

  sidebarItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (currentPath.includes(href.replace("/", ""))) {
      item.parentElement.classList.add("active");
    }
  });

  // Add page-specific mobile enhancements
  if (currentPath.includes("reports")) {
    initializeReportsMobile();
  } else if (currentPath.includes("history")) {
    initializeHistoryMobile();
  } else if (currentPath.includes("staff")) {
    initializeStaffMobile();
  } else if (currentPath.includes("invoice")) {
    initializeInvoiceMobile();
  }
}

function initializeReportsMobile() {
  // Reports-specific mobile features
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Close mobile menu when switching tabs
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar");
        const overlay = document.getElementById("sidebar-overlay");
        const hamburger = document.getElementById("hamburger-menu");

        hamburger.classList.remove("active");
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      }
    });
  });
}

function initializeHistoryMobile() {
  // History-specific mobile features
  const searchFilters = document.querySelector(".search-filters");
  if (searchFilters && window.innerWidth <= 768) {
    searchFilters.style.flexDirection = "column";
    searchFilters.style.gap = "10px";
  }
}

function initializeStaffMobile() {
  // Staff management-specific mobile features
  const tabsContainer = document.querySelector(".tabs-container");
  if (tabsContainer && window.innerWidth <= 768) {
    tabsContainer.style.overflowX = "auto";
    tabsContainer.style.webkitOverflowScrolling = "touch";
  }
}

function initializeInvoiceMobile() {
  // Invoice-specific mobile features
  const invoiceActions = document.querySelector(".invoice-actions");
  if (invoiceActions && window.innerWidth <= 768) {
    invoiceActions.style.flexDirection = "column";
    invoiceActions.style.gap = "10px";
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeMobileSidebar();
  enhanceMobileNavigation();
  if (window.innerWidth <= 768) {
    initializePullToRefreshForAllPages();
  }
});
