/**
 * Shared authentication utilities for dashboard_owner
 */

// Logout function with confirmation
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("apiUrl");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userid");
    window.location.href = "/login/login.html";
  }
}

// Token expiration check (consistent across all files)
function isTokenExpired(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));

    if (payload && payload.exp) {
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      return currentTime > expiryTime;
    } else {
      return true;
    }
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
}

// Authentication check
function checkAuth() {
  const token = localStorage.getItem("authToken");

  if (!token || isTokenExpired(token)) {
    window.location.href = "/login/login.html";
    return false;
  }

  return true;
}

// Initialize logout functionality for any page
function initializeLogout() {
  const logoutSelectors = [
    "#logout-btn",
    ".logout-btn",
    ".logout-container",
    ".sidebar-item[onclick*='logout']",
    "[data-action='logout']",
  ];

  logoutSelectors.forEach((selector) => {
    const logoutBtn = document.querySelector(selector);
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        handleLogout();
      });
    }
  });
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeLogout();
});
