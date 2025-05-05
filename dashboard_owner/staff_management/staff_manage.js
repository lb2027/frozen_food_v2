document.addEventListener("DOMContentLoaded", function () {
  // Get API URL from config
  const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";

  // Get auth token
  const token = localStorage.getItem("authToken");

  // Check if user is logged in
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // DOM Elements
  const staffTable = document.querySelector("table tbody");
  const staffCountElement = document.querySelector(".staff-count");
  const addStaffBtn = document.querySelector(".add-staff-btn");
  const sortBtn = document.querySelector(".sort-btn");
  const backButton = document.querySelector(".back-button");
  const logoutBtn = document.querySelector(
    ".sidebar-item[style*='margin-top: auto']"
  );
  const mainCheckbox = document.querySelector(
    "thead .checkbox-container .custom-checkbox"
  );
  const tabButtons = document.querySelectorAll(".tab");
  const loader = document.querySelector(".loader");
  const noDataMessage = document.querySelector(".no-data-message");

  // Add search functionality
  const searchElement = document.createElement("div");
  searchElement.className = "search-container";
  searchElement.innerHTML = `
    <input type="text" id="staff-search" placeholder="Search staff..." class="search-input">
    <button id="search-btn" class="search-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  `;

  // Insert search before actions
  const actions = document.querySelector(".actions");
  if (actions && actions.parentNode) {
    actions.parentNode.insertBefore(searchElement, actions);
  }

  // Add bulk action buttons
  const bulkActionsElement = document.createElement("div");
  bulkActionsElement.className = "bulk-actions";
  bulkActionsElement.innerHTML = `
    <button class="bulk-action-btn danger-btn" data-action="delete">Delete Selected</button>
    <button class="bulk-action-btn status-btn" data-action="active">Set Active</button>
    <button class="bulk-action-btn status-btn" data-action="inactive">Set Inactive</button>
  `;

  const container = document.querySelector(".container");
  if (container) {
    container.appendChild(bulkActionsElement);
  }

  // State variables
  let staffData = [];
  let filteredStaffData = []; // For search results
  let selectedStaffIds = [];
  let currentSortField = "nama";
  let sortDirection = "asc";
  let currentTab = "management";
  let isSearchActive = false;

  // Initialize view
  init();

  // Modified init() function to include filter initialization
  function init() {
    fetchStaffData();
    fetchStaffStats();
    setupEventListeners();
    initFilters();
  }

  // New function to initialize filters
  function initFilters() {
    const statusFilter = document.querySelector(
      '.filter-select[title="Filter by status"]'
    );
    const dateFilter = document.querySelector(
      '.filter-select[title="Filter by date"]'
    );

    if (statusFilter) {
      statusFilter.addEventListener("change", applyFilters);
    }

    if (dateFilter) {
      dateFilter.addEventListener("change", applyFilters);
    }
  }

  // Function to apply filters
  function applyFilters() {
    const statusFilter = document.querySelector(
      '.filter-select[title="Filter by status"]'
    );
    const dateFilter = document.querySelector(
      '.filter-select[title="Filter by date"]'
    );
    const searchInput = document.getElementById("staff-search");

    // Start with all staff data
    let filtered = [...staffData];

    // Apply status filter if selected
    if (statusFilter && statusFilter.value) {
      const selectedStatus = statusFilter.value;
      filtered = filtered.filter(
        (staff) => staff.status_kerja === selectedStatus
      );
    }

    // Apply date filter if selected
    if (dateFilter && dateFilter.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (dateFilter.value) {
        case "today":
          filtered = filtered.filter((staff) => {
            if (!staff.created_at) return false;
            const staffDate = new Date(staff.created_at);
            staffDate.setHours(0, 0, 0, 0);
            return staffDate.getTime() === today.getTime();
          });
          break;

        case "yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          filtered = filtered.filter((staff) => {
            if (!staff.created_at) return false;
            const staffDate = new Date(staff.created_at);
            staffDate.setHours(0, 0, 0, 0);
            return staffDate.getTime() === yesterday.getTime();
          });
          break;

        case "week":
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          filtered = filtered.filter((staff) => {
            if (!staff.created_at) return false;
            const staffDate = new Date(staff.created_at);
            return staffDate >= lastWeek;
          });
          break;

        case "month":
          const lastMonth = new Date(today);
          lastMonth.setDate(lastMonth.getDate() - 30);
          filtered = filtered.filter((staff) => {
            if (!staff.created_at) return false;
            const staffDate = new Date(staff.created_at);
            return staffDate >= lastMonth;
          });
          break;
      }
    }

    // Apply search filter if there's text
    if (searchInput && searchInput.value.trim()) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      filtered = filtered.filter((staff) => {
        return (
          (staff.nama && staff.nama.toLowerCase().includes(searchTerm)) ||
          (staff.email && staff.email.toLowerCase().includes(searchTerm)) ||
          (staff.no_hp && staff.no_hp.toLowerCase().includes(searchTerm)) ||
          (staff.status_kerja &&
            staff.status_kerja.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Update the filteredStaffData
    filteredStaffData = filtered;
    isSearchActive = true;

    // Update UI
    updateStaffCount();
    renderStaffTable();
  }

  function setupEventListeners() {
    // Add staff button
    if (addStaffBtn) {
      addStaffBtn.addEventListener("click", showAddStaffModal);
    }

    // Sort button
    if (sortBtn) {
      sortBtn.addEventListener("click", showSortOptions);
    }

    // Back button
    if (backButton) {
      backButton.addEventListener("click", () => {
        window.location.href = "../owner.html";
      });
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("authToken");
        window.location.href = "../index.html";
      });
    }

    // Main checkbox (select all)
    if (mainCheckbox) {
      mainCheckbox.addEventListener("click", toggleAllCheckboxes);
    }

    // Tab buttons
    if (tabButtons) {
      tabButtons.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabButtons.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          const tabName = tab.textContent.toLowerCase();
          currentTab = tabName;

          // Handle tab switching
          if (tabName.includes("management")) {
            // Show main staff table
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) tableContainer.style.display = "block";

            // Hide any other containers that might be open
            hideTabContainers();

            // Update bulk actions visibility
            updateBulkActionButtonsVisibility();
          } else if (tabName.includes("attendance")) {
            // Hide staff table and show attendance section
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) tableContainer.style.display = "none";

            const bulkActions = document.querySelector(".bulk-actions");
            if (bulkActions) bulkActions.style.display = "none";

            hideTabContainers();
            showAttendanceTab();
          } else if (tabName.includes("performance")) {
            // Hide staff table and show performance section
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) tableContainer.style.display = "none";

            const bulkActions = document.querySelector(".bulk-actions");
            if (bulkActions) bulkActions.style.display = "none";

            hideTabContainers();
            showPerformanceTab();
          } else if (tabName.includes("payroll")) {
            // Hide staff table and show payroll section
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) tableContainer.style.display = "none";

            const bulkActions = document.querySelector(".bulk-actions");
            if (bulkActions) bulkActions.style.display = "none";

            hideTabContainers();
            showPayrollTab();
          }
        });
      });
    }

    // Search functionality
    const searchInput = document.getElementById("staff-search");
    const searchBtn = document.getElementById("search-btn");

    if (searchInput && searchBtn) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          applyFilters(); // Use the same filter function instead of searchStaff
        }
      });

      searchBtn.addEventListener("click", () => {
        applyFilters(); // Use the same filter function
      });

      // Add input event to make filtering more responsive
      searchInput.addEventListener("input", () => {
        if (searchInput.value.trim() === "") {
          applyFilters(); // Reapply filters without search term
        }
      });
    }

    // Bulk action buttons
    const bulkActionBtns = document.querySelectorAll(".bulk-action-btn");
    if (bulkActionBtns) {
      bulkActionBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          handleBulkAction(btn.dataset.action);
        });
      });
    }
  }

  // Update bulk action buttons visibility
  function updateBulkActionButtonsVisibility() {
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = selectedStaffIds.length > 0 ? "flex" : "none";
    }
  }

  // Hide all tab containers (attendance, performance, payroll)
  function hideTabContainers() {
    const containers = document.querySelectorAll(
      ".attendance-container, .performance-container, .payroll-container"
    );
    containers.forEach((container) => {
      if (container) {
        container.style.display = "none";
      }
    });
  }

  // Show attendance tab
  function showAttendanceTab() {
    // Create attendance container if it doesn't exist
    let attendanceContainer = document.querySelector(".attendance-container");

    if (!attendanceContainer) {
      attendanceContainer = document.createElement("div");
      attendanceContainer.className = "attendance-container";
      attendanceContainer.innerHTML = `
        <h2>Staff Attendance</h2>
        <p>This feature will be available in the next update.</p>
      `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(attendanceContainer);
      }
    }

    attendanceContainer.style.display = "block";
  }

  // Show performance tab
  function showPerformanceTab() {
    // Create performance container if it doesn't exist
    let performanceContainer = document.querySelector(".performance-container");

    if (!performanceContainer) {
      performanceContainer = document.createElement("div");
      performanceContainer.className = "performance-container";
      performanceContainer.innerHTML = `
        <h2>Staff Performance</h2>
        <p>This feature will be available in the next update.</p>
      `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(performanceContainer);
      }
    }

    performanceContainer.style.display = "block";
  }

  // Show payroll tab
  function showPayrollTab() {
    // Create payroll container if it doesn't exist
    let payrollContainer = document.querySelector(".payroll-container");

    if (!payrollContainer) {
      payrollContainer = document.createElement("div");
      payrollContainer.className = "payroll-container";
      payrollContainer.innerHTML = `
        <h2>Staff Payroll</h2>
        <p>This feature will be available in the next update.</p>
      `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(payrollContainer);
      }
    }

    payrollContainer.style.display = "block";
  }

  // Fetch staff data from API
  async function fetchStaffData() {
    showLoader();

    try {
      const response = await fetch(`${apiUrl}/staff`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      staffData = Array.isArray(data) ? data : [];
      filteredStaffData = [...staffData]; // Initialize with all staff
      isSearchActive = false; // Reset search state

      // Reset filter dropdowns
      const statusFilter = document.querySelector(
        '.filter-select[title="Filter by status"]'
      );
      const dateFilter = document.querySelector(
        '.filter-select[title="Filter by date"]'
      );

      if (statusFilter) statusFilter.selectedIndex = 0;
      if (dateFilter) dateFilter.selectedIndex = 0;

      updateStaffCount();
      renderStaffTable();

      hideLoader();

      // Update visibility of no data message
      if (noDataMessage) {
        noDataMessage.style.display = staffData.length === 0 ? "block" : "none";
      }
    } catch (error) {
      console.error("Error fetching staff data:", error);
      hideLoader();
      showErrorAlert("Failed to load staff data. Please try again later.");

      // Show no data message
      if (noDataMessage) {
        noDataMessage.style.display = "block";
      }
    }
  }

  // Fetch staff statistics
  async function fetchStaffStats() {
    try {
      const response = await fetch(`${apiUrl}/staffstats`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      updateStaffStats(data);
    } catch (error) {
      console.error("Error fetching staff statistics:", error);
    }
  }

  // Update staff statistics in the UI
  function updateStaffStats(stats) {
    // You can add a statistics panel to the UI
    // For now, just update the staff count if it's different from what we already have
    if (stats && stats.total !== staffData.length && staffCountElement) {
      staffCountElement.textContent = `Staff (${stats.total})`;
    }
  }

  // Update staff count in the UI
  function updateStaffCount() {
    if (staffCountElement) {
      if (isSearchActive) {
        staffCountElement.textContent = `Search Results (${filteredStaffData.length})`;
      } else {
        staffCountElement.textContent = `Staff (${staffData.length})`;
      }
    }
  }

  // Search staff
  function searchStaff(query) {
    // Simply call applyFilters which now handles search too
    applyFilters();
  }

  // Render staff table
  function renderStaffTable() {
    if (!staffTable) return;

    staffTable.innerHTML = "";

    // Use either filtered data (search results) or all staff data
    const dataToRender = isSearchActive ? filteredStaffData : staffData;

    // Clear selection if the selected staff is not in the current view
    selectedStaffIds = selectedStaffIds.filter((id) =>
      dataToRender.some((staff) => staff.id === id)
    );

    // Update bulk actions visibility
    updateBulkActionButtonsVisibility();

    // Show no data message if appropriate
    if (noDataMessage) {
      noDataMessage.style.display =
        dataToRender.length === 0 ? "block" : "none";
    }

    if (dataToRender.length === 0) {
      return;
    }

    // Apply sorting to the data
    const sortedData = [...dataToRender].sort((a, b) => {
      let fieldA = a[currentSortField];
      let fieldB = b[currentSortField];

      if (fieldA === null || fieldA === undefined) fieldA = "";
      if (fieldB === null || fieldB === undefined) fieldB = "";

      if (typeof fieldA === "string") {
        fieldA = fieldA.toLowerCase();
        fieldB = fieldB.toLowerCase();
      }

      if (sortDirection === "asc") {
        return fieldA > fieldB ? 1 : -1;
      } else {
        return fieldA < fieldB ? 1 : -1;
      }
    });

    // Render each staff row
    sortedData.forEach((staff) => {
      const isSelected = selectedStaffIds.includes(staff.id);
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          <div class="checkbox-container">
            <span class="custom-checkbox ${isSelected ? "checked" : ""}"></span>
          </div>
        </td>
        <td>#${staff.id}</td>
        <td>
          <div class="staff-details">
            <div class="staff-avatar">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='12' cy='8' r='5'%3E%3C/circle%3E%3Cpath d='M20 21v-2a7 7 0 0 0-14 0v2'%3E%3C/path%3E%3C/svg%3E" alt="Staff">
            </div>
            <div class="staff-info">
              <span class="staff-name">${staff.nama || "No Name"}</span>
              <span class="staff-role">${staff.status_kerja || "Staff"}</span>
            </div>
          </div>
        </td>
        <td>${staff.email || "-"}</td>
        <td>${staff.no_hp || "-"}</td>
        <td>-</td>
        <td>-</td>
        <td>${staff.status_kerja || "-"}</td>
        <td>
          <div class="action-icons">
            <button class="action-btn view-btn" data-id="${staff.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="action-btn edit-btn" data-id="${staff.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete-btn" data-id="${staff.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      staffTable.appendChild(row);

      // Add event listeners to the new row
      const checkbox = row.querySelector(".custom-checkbox");
      checkbox.addEventListener("click", () =>
        toggleStaffSelection(staff.id, checkbox)
      );

      const viewBtn = row.querySelector(".view-btn");
      viewBtn.addEventListener("click", () => viewStaffDetails(staff.id));

      const editBtn = row.querySelector(".edit-btn");
      editBtn.addEventListener("click", () => editStaff(staff.id));

      const deleteBtn = row.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", () => deleteStaff(staff.id));
    });
  }

  // Toggle staff selection (checkbox)
  function toggleStaffSelection(id, checkbox) {
    const index = selectedStaffIds.indexOf(id);

    if (index === -1) {
      // Add to selection
      selectedStaffIds.push(id);
      checkbox.classList.add("checked");
    } else {
      // Remove from selection
      selectedStaffIds.splice(index, 1);
      checkbox.classList.remove("checked");
    }

    // Update bulk actions visibility
    updateBulkActionButtonsVisibility();
  }

  // Toggle all checkboxes
  function toggleAllCheckboxes() {
    const isChecked = mainCheckbox.classList.toggle("checked");
    const checkboxes = document.querySelectorAll(
      "tbody .checkbox-container .custom-checkbox"
    );

    if (isChecked) {
      // Select all
      selectedStaffIds = [];
      const dataToUse = isSearchActive ? filteredStaffData : staffData;
      dataToUse.forEach((staff) => {
        selectedStaffIds.push(staff.id);
      });
      checkboxes.forEach((checkbox) => checkbox.classList.add("checked"));
    } else {
      // Deselect all
      selectedStaffIds = [];
      checkboxes.forEach((checkbox) => checkbox.classList.remove("checked"));
    }

    // Update bulk actions visibility
    updateBulkActionButtonsVisibility();
  }

  // Show add staff modal
  function showAddStaffModal() {
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Add New Staff</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="add-staff-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="staff-name">Full Name*</label>
                  <input type="text" id="staff-name" name="nama" required placeholder="Enter full name">
                </div>
                <div class="form-group">
                  <label for="staff-email">Email</label>
                  <input type="email" id="staff-email" name="email" placeholder="Enter email">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="staff-phone">Phone Number*</label>
                  <input type="text" id="staff-phone" name="no_hp" required placeholder="Enter phone number">
                </div>
                <div class="form-group">
                  <label for="staff-status">Status*</label>
                  <select id="staff-status" name="status_kerja" required>
                    <option value="" disabled selected>Select status</option>
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                    <option value="Kasir">Kasir</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="staff-address">Address</label>
                <textarea id="staff-address" name="alamat" rows="3" placeholder="Enter address"></textarea>
              </div>
              
              <div class="form-group">
                <label for="staff-user-id">User ID (Optional)</label>
                <input type="number" id="staff-user-id" name="user_id" placeholder="Enter user ID if applicable">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="cancel-add-staff">Cancel</button>
            <button class="btn primary-btn" id="save-staff-btn">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listeners
    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("cancel-add-staff")
      .addEventListener("click", closeModal);
    document
      .getElementById("save-staff-btn")
      .addEventListener("click", addStaff);

    // Close modal if clicked outside
    document
      .querySelector(".modal-overlay")
      .addEventListener("click", function (e) {
        if (e.target === this) closeModal();
      });
  }

  // Close any open modal
  function closeModal() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
      modal.remove();
    }
  }

  // Add staff
  async function addStaff() {
    const form = document.getElementById("add-staff-form");
    if (!form) return;

    // Check if required fields are filled
    const nameField = form.querySelector('[name="nama"]');
    const phoneField = form.querySelector('[name="no_hp"]');
    const statusField = form.querySelector('[name="status_kerja"]');

    if (!nameField.value.trim()) {
      showErrorAlert("Please enter a name");
      nameField.focus();
      return;
    }

    if (!phoneField.value.trim()) {
      showErrorAlert("Please enter a phone number");
      phoneField.focus();
      return;
    }

    if (!statusField.value) {
      showErrorAlert("Please select a status");
      statusField.focus();
      return;
    }

    // Collect form data
    const formData = new FormData(form);
    const staffData = {};

    formData.forEach((value, key) => {
      // Only add non-empty values
      if (value.trim() !== "") {
        // Convert user_id to integer if present
        if (key === "user_id") {
          staffData[key] = parseInt(value, 10);
        } else {
          staffData[key] = value;
        }
      }
    });

    showLoader();

    try {
      const response = await fetch(`${apiUrl}/addstaff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(staffData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      showSuccessAlert("Staff added successfully!");
      closeModal();
      fetchStaffData(); // Refresh table
    } catch (error) {
      console.error("Error adding staff:", error);
      hideLoader();
      showErrorAlert("Failed to add staff. Please try again.");
    }
  }

  // View staff details
  function viewStaffDetails(id) {
    const staff = staffData.find((s) => s.id === id);
    if (!staff) return;

    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Staff Details</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="staff-profile">
              <div class="staff-avatar-large">
                <img src="../assets/default-avatar.png" alt="Staff" onerror="this.src='../assets/default-avatar.png'">
              </div>
              <h3>${staff.nama || "No Name"}</h3>
              <p class="staff-role">${staff.status_kerja || "Staff"}</p>
            </div>
            
            <div class="staff-details-grid">
              <div class="detail-item">
                <span class="detail-label">ID:</span>
                <span class="detail-value">#${staff.id}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${staff.email || "-"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${staff.no_hp || "-"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address:</span>
                <span class="detail-value">${staff.alamat || "-"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${staff.status_kerja || "-"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">${staff.user_id || "-"}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="close-view-staff">Close</button>
            <button class="btn primary-btn" id="edit-staff-btn" data-id="${
              staff.id
            }">Edit</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listeners
    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("close-view-staff")
      .addEventListener("click", closeModal);
    document
      .getElementById("edit-staff-btn")
      .addEventListener("click", function () {
        closeModal();
        editStaff(staff.id);
      });

    // Close modal if clicked outside
    document
      .querySelector(".modal-overlay")
      .addEventListener("click", function (e) {
        if (e.target === this) closeModal();
      });
  }

  // Edit staff
  function editStaff(id) {
    const staff = staffData.find((s) => s.id === id);
    if (!staff) return;

    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Edit Staff</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-staff-form">
              <input type="hidden" name="id" value="${staff.id}">
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-staff-name">Full Name*</label>
                  <input type="text" id="edit-staff-name" name="nama" required value="${
                    staff.nama || ""
                  }" placeholder="Enter full name">
                </div>
                <div class="form-group">
                  <label for="edit-staff-email">Email</label>
                  <input type="email" id="edit-staff-email" name="email" value="${
                    staff.email || ""
                  }" placeholder="Enter email">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-staff-phone">Phone Number*</label>
                  <input type="text" id="edit-staff-phone" name="no_hp" required value="${
                    staff.no_hp || ""
                  }" placeholder="Enter phone number">
                </div>
                <div class="form-group">
                  <label for="edit-staff-status">Status*</label>
                  <select id="edit-staff-status" name="status_kerja" required>
                    <option value="Owner" ${
                      staff.status_kerja === "Owner" ? "selected" : ""
                    }>Owner</option>
                    <option value="Manager" ${
                      staff.status_kerja === "Manager" ? "selected" : ""
                    }>Manager</option>
                    <option value="Staff" ${
                      staff.status_kerja === "Staff" ? "selected" : ""
                    }>Staff</option>
                    <option value="Kasir" ${
                      staff.status_kerja === "Kasir" ? "selected" : ""
                    }>Kasir</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="edit-staff-address">Address</label>
                <textarea id="edit-staff-address" name="alamat" rows="3" placeholder="Enter address">${
                  staff.alamat || ""
                }</textarea>
              </div>
              
              <div class="form-group">
                <label for="edit-staff-user-id">User ID</label>
                <input type="number" id="edit-staff-user-id" name="user_id" value="${
                  staff.user_id || ""
                }" placeholder="Enter user ID if applicable">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="cancel-edit-staff">Cancel</button>
            <button class="btn primary-btn" id="update-staff-btn">Update</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listeners
    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("cancel-edit-staff")
      .addEventListener("click", closeModal);
    document
      .getElementById("update-staff-btn")
      .addEventListener("click", updateStaff);

    // Close modal if clicked outside
    document
      .querySelector(".modal-overlay")
      .addEventListener("click", function (e) {
        if (e.target === this) closeModal();
      });
  }

  // Update staff
  async function updateStaff() {
    const form = document.getElementById("edit-staff-form");
    if (!form) return;

    // Check if required fields are filled
    const idField = form.querySelector('[name="id"]');
    const nameField = form.querySelector('[name="nama"]');
    const phoneField = form.querySelector('[name="no_hp"]');
    const statusField = form.querySelector('[name="status_kerja"]');

    if (!idField.value) {
      showErrorAlert("Staff ID is missing");
      return;
    }

    if (!nameField.value.trim()) {
      showErrorAlert("Please enter a name");
      nameField.focus();
      return;
    }

    if (!phoneField.value.trim()) {
      showErrorAlert("Please enter a phone number");
      phoneField.focus();
      return;
    }

    if (!statusField.value) {
      showErrorAlert("Please select a status");
      statusField.focus();
      return;
    }

    // Collect staff data
    const emailField = form.querySelector('[name="email"]');
    const alamatField = form.querySelector('[name="alamat"]');
    const userIdField = form.querySelector('[name="user_id"]');

    const staffData = {
      id: parseInt(idField.value, 10),
      nama: nameField.value.trim(),
      no_hp: phoneField.value.trim(),
      status_kerja: statusField.value,
      email: emailField.value.trim() || null,
      alamat: alamatField.value.trim() || null,
      user_id: userIdField.value.trim()
        ? parseInt(userIdField.value.trim(), 10)
        : null,
    };

    showLoader();

    try {
      console.log("Updating staff data:", staffData);
      const response = await fetch(`${apiUrl}/updatestaff`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(staffData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server responded with:", errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      showSuccessAlert("Staff updated successfully!");
      closeModal();
      fetchStaffData(); // Refresh table
    } catch (error) {
      console.error("Error updating staff:", error);
      hideLoader();
      showErrorAlert("Failed to update staff. Please try again.");
    }
  }

  // Delete staff
  async function deleteStaff(id) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this staff member? This action cannot be undone."
    );
    if (!confirmDelete) return;

    showLoader();

    try {
      const response = await fetch(`${apiUrl}/deletestaff`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({ id: id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      showSuccessAlert("Staff deleted successfully!");

      // Remove from selected IDs if present
      const index = selectedStaffIds.indexOf(id);
      if (index > -1) {
        selectedStaffIds.splice(index, 1);
      }

      fetchStaffData(); // Refresh table
    } catch (error) {
      console.error("Error deleting staff:", error);
      hideLoader();
      showErrorAlert("Failed to delete staff. Please try again.");
    }
  }

  // Handle bulk actions
  function handleBulkAction(action) {
    if (selectedStaffIds.length === 0) {
      showErrorAlert("No staff members selected");
      return;
    }

    switch (action) {
      case "delete":
        bulkDeleteStaff();
        break;
      case "active":
        bulkUpdateStatus("Active");
        break;
      case "inactive":
        bulkUpdateStatus("Inactive");
        break;
      default:
        break;
    }
  }

  // Bulk delete staff
  function bulkDeleteStaff() {
    const confirmDelete = confirm(
      `Are you sure you want to delete ${selectedStaffIds.length} staff members? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    showLoader();

    fetch(`${apiUrl}/bulkdeletestaff`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify({ ids: selectedStaffIds }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        showSuccessAlert(
          `${selectedStaffIds.length} staff members deleted successfully!`
        );
        selectedStaffIds = []; // Clear selection
        fetchStaffData(); // Refresh table
      })
      .catch((error) => {
        console.error("Error deleting staff in bulk:", error);
        hideLoader();
        showErrorAlert(
          "Failed to delete selected staff members. Please try again."
        );
      });
  }

  // Bulk update staff status
  function bulkUpdateStatus(status) {
    showLoader();

    fetch(`${apiUrl}/bulkupdatestaffstatus`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify({
        ids: selectedStaffIds,
        status_kerja: status,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        showSuccessAlert(
          `Status updated to ${status} for ${selectedStaffIds.length} staff members!`
        );
        fetchStaffData(); // Refresh table
      })
      .catch((error) => {
        console.error("Error updating staff status in bulk:", error);
        hideLoader();
        showErrorAlert("Failed to update status. Please try again.");
      });
  }

  // Show sort options
  function showSortOptions() {
    // Remove any existing sort dropdown
    const existingDropdown = document.querySelector(".sort-dropdown");
    if (existingDropdown) {
      existingDropdown.remove();
    }

    const sortFields = [
      { field: "nama", label: "Name" },
      { field: "email", label: "Email" },
      { field: "no_hp", label: "Phone" },
      { field: "status_kerja", label: "Status" },
    ];

    const dropdown = document.createElement("div");
    dropdown.className = "sort-dropdown";

    // Add a header to the dropdown
    const header = document.createElement("div");
    header.className = "sort-header";
    header.style.padding = "10px 15px";
    header.style.borderBottom = "1px solid #2d2d3f";
    header.style.fontWeight = "500";
    header.style.fontSize = "14px";
    header.style.color = "var(--primary-color)";
    header.textContent = "Sort by";
    dropdown.appendChild(header);

    sortFields.forEach((sortField) => {
      const item = document.createElement("div");
      item.className = "sort-item";

      const isCurrentSort = currentSortField === sortField.field;

      item.innerHTML = `
        <span>${sortField.label}</span>
        <div class="sort-directions">
          <span class="sort-direction ${
            isCurrentSort && sortDirection === "asc" ? "active" : ""
          }" 
                data-direction="asc" title="Sort ascending">↑</span>
          <span class="sort-direction ${
            isCurrentSort && sortDirection === "desc" ? "active" : ""
          }" 
                data-direction="desc" title="Sort descending">↓</span>
        </div>
      `;

      item.querySelectorAll(".sort-direction").forEach((dirElement) => {
        dirElement.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent event bubbling
          const direction = e.target.dataset.direction;
          currentSortField = sortField.field;
          sortDirection = direction;

          // Apply visual feedback
          document.querySelectorAll(".sort-direction").forEach((el) => {
            el.classList.remove("active");
          });
          e.target.classList.add("active");

          // Update the sort button to indicate active sorting
          sortBtn.innerHTML = `
            <span class="material-icons">sort</span>
            <span>Sort: ${sortField.label} ${
            direction === "asc" ? "↑" : "↓"
          }</span>
          `;

          renderStaffTable();

          // Don't close the dropdown immediately to allow multiple sorts
          // dropdown.remove();
        });
      });

      dropdown.appendChild(item);
    });

    // Add a close button
    const closeButton = document.createElement("div");
    closeButton.className = "sort-item";
    closeButton.style.justifyContent = "center";
    closeButton.style.color = "var(--light-text)";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
      dropdown.remove();
    });
    dropdown.appendChild(closeButton);

    // Position the dropdown
    const sortBtnRect = sortBtn.getBoundingClientRect();
    dropdown.style.top = `${sortBtnRect.bottom + window.scrollY + 5}px`;
    dropdown.style.left = `${sortBtnRect.left + window.scrollX}px`;

    document.body.appendChild(dropdown);

    // Close dropdown when clicking elsewhere
    function handleClickOutside(e) {
      if (!dropdown.contains(e.target) && !sortBtn.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener("click", handleClickOutside);
      }
    }

    // Use setTimeout to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
  }

  // Show loader
  function showLoader() {
    if (loader) {
      loader.style.display = "flex";
    }
  }

  // Hide loader
  function hideLoader() {
    if (loader) {
      loader.style.display = "none";
    }
  }

  // Show success alert
  function showSuccessAlert(message) {
    showAlert(message, "success");
  }

  // Show error alert
  function showErrorAlert(message) {
    showAlert(message, "error");
  }

  // Show alert
  function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll(".alert");
    existingAlerts.forEach((alert) => {
      alert.remove();
    });

    const alertElement = document.createElement("div");
    alertElement.className = `alert ${type}-alert`;
    alertElement.innerHTML = `
      <div class="alert-content">
        <span class="alert-icon">
          ${type === "success" ? "✓" : "⚠"}
        </span>
        <span class="alert-message">${message}</span>
      </div>
      <button class="close-alert">&times;</button>
    `;

    document.body.appendChild(alertElement);

    // Add close button functionality
    alertElement.querySelector(".close-alert").addEventListener("click", () => {
      alertElement.remove();
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.remove();
      }
    }, 5000);
  }
});
