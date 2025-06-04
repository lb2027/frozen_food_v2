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
  searchElement.className = "filter-group-staff search-container";
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
    initFilters(); // ✅ Initialize filters properly
    setupEventListeners();
    fetchStaffData();
    updateBulkActionButtonsVisibility();

    // ✅ Start with Staff Management tab active
    showStaffManagementTab();
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
      // ✅ Ensure "All Status" option exists and works
      if (!statusFilter.querySelector('option[value=""]')) {
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "✓ All Status";
        statusFilter.insertBefore(allOption, statusFilter.firstChild);
      }
    }

    if (dateFilter) {
      dateFilter.addEventListener("change", applyFilters);
      // ✅ Ensure "All Time" option exists and works
      if (!dateFilter.querySelector('option[value=""]')) {
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "✓ All Time";
        dateFilter.insertBefore(allOption, dateFilter.firstChild);
      }
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

    // Apply status filter if selected and not "All Status"
    if (statusFilter && statusFilter.value && statusFilter.value !== "") {
      const selectedStatus = statusFilter.value;
      filtered = filtered.filter(
        (staff) => staff.status_kerja === selectedStatus
      );
    }

    // Apply date filter if selected and not "All Time"
    if (dateFilter && dateFilter.value && dateFilter.value !== "") {
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

    // Main checkbox (select all)
    if (mainCheckbox) {
      mainCheckbox.addEventListener("click", toggleAllCheckboxes);
    }

    // Tab buttons
    if (tabButtons) {
      tabButtons.forEach((tab) => {
        tab.addEventListener("click", (e) => {
          // Remove active class from all tabs
          tabButtons.forEach((t) => t.classList.remove("active"));

          // Add active class to clicked tab
          tab.classList.add("active");

          const tabName = tab.textContent.toLowerCase();
          console.log("Switching to tab:", tabName);

          if (tabName.includes("staff") || tabName.includes("management")) {
            // ✅ STAFF MANAGEMENT TAB
            showStaffManagementTab();
          } else if (tabName.includes("attendance")) {
            // ✅ ATTENDANCE TAB
            showAttendanceTab();
          } else if (tabName.includes("payroll")) {
            // ✅ PAYROLL TAB
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

  // Show staff management tab
  function showStaffManagementTab() {
    console.log("Showing Staff Management tab");

    // Show staff table and related elements
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.style.display = "block";
    }

    // ✅ SHOW staff management filters and actions
    showStaffFiltersAndActions();

    // Show bulk actions
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = selectedStaffIds.length > 0 ? "flex" : "none";
    }

    // Hide other tab containers
    hideTabContainers();

    // Update UI
    updateBulkActionButtonsVisibility();
    updateStaffCount();
    renderStaffTable();
  }

  // Show/hide filters dan actions
  function showStaffFiltersAndActions() {
    // Show filter dropdowns
    const statusFilter = document.querySelector(
      '.filter-select[title="Filter by status"]'
    );
    const dateFilter = document.querySelector(
      '.filter-select[title="Filter by date"]'
    );

    if (statusFilter) {
      statusFilter.style.display = "block";
      statusFilter.parentElement.style.display = "flex"; // Show parent filter-group
    }
    if (dateFilter) {
      dateFilter.style.display = "block";
    }

    // Show action buttons
    const addStaffBtn = document.querySelector(".add-staff-btn");
    const sortBtn = document.querySelector(".sort-btn");

    if (addStaffBtn) {
      addStaffBtn.style.display = "flex";
    }
    if (sortBtn) {
      sortBtn.style.display = "flex";
    }

    // Show the entire actions container
    const actionsContainer = document.querySelector(".actions");
    if (actionsContainer) {
      actionsContainer.style.display = "flex";
    }

    // Show filter group container
    const filterGroup = document.querySelector(".filter-group");
    if (filterGroup) {
      filterGroup.style.display = "flex";
    }
  }

  // Hide filters dan actions
  function hideStaffFiltersAndActions() {
    // Hide filter dropdowns
    const statusFilter = document.querySelector(
      '.filter-select[title="Filter by status"]'
    );
    const dateFilter = document.querySelector(
      '.filter-select[title="Filter by date"]'
    );

    if (statusFilter) {
      statusFilter.style.display = "none";
    }
    if (dateFilter) {
      dateFilter.style.display = "none";
    }

    // Hide action buttons
    const addStaffBtn = document.querySelector(".add-staff-btn");
    const sortBtn = document.querySelector(".sort-btn");

    if (addStaffBtn) {
      addStaffBtn.style.display = "none";
    }
    if (sortBtn) {
      sortBtn.style.display = "none";
    }

    // Hide the entire actions container
    const actionsContainer = document.querySelector(".actions");
    if (actionsContainer) {
      actionsContainer.style.display = "none";
    }

    // Hide filter group container
    const filterGroup = document.querySelector(".filter-group-staff");
    if (filterGroup) {
      filterGroup.style.display = "none";
    }
  }

  // Attendance tab
  function showAttendanceTab() {
    console.log("Showing Attendance tab");

    // Hide staff table and related elements
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.style.display = "none";
    }

    // ✅ HIDE staff management filters and actions
    hideStaffFiltersAndActions();

    // Hide bulk actions
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = "none";
    }

    // Hide other tab containers first
    hideTabContainers();

    // Create or get attendance container
    let attendanceContainer = document.querySelector(".attendance-container");

    if (!attendanceContainer) {
      attendanceContainer = document.createElement("div");
      attendanceContainer.className = "attendance-container";

      // Create attendance table structure
      attendanceContainer.innerHTML = `
        <div class="attendance-header">
          <h2 class="attendance-count">Attendance Records (0)</h2>
          <div class="attendance-actions">
            <button class="refresh-btn">
              <span class="material-icons">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        <div class="attendance-table-container">
          <table class="attendance-table">
            <thead>
              <tr>
                <th width="60">
                  <div class="checkbox-container">
                    <span class="custom-checkbox"></span>
                  </div>
                </th>
                <th width="90">ID</th>
                <th>Staff Name</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
                <th width="180">Notes</th>
              </tr>
            </thead>
            <tbody>
              <!-- Attendance rows will be populated here -->
            </tbody>
          </table>
          <div class="no-data-message">No attendance data available.</div>
        </div>
      `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(attendanceContainer);
      }

      // Add event listeners to attendance actions
      const refreshBtn = attendanceContainer.querySelector(".refresh-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchAttendanceData);
      }
    }

    attendanceContainer.style.display = "block";

    // Get attendance data from API
    fetchAttendanceData();
  }

  // Payroll tab
  function showPayrollTab() {
    console.log("Showing Payroll tab");

    // Hide staff table and related elements
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.style.display = "none";
    }

    // ✅ HIDE staff management filters and actions
    hideStaffFiltersAndActions();

    // Hide bulk actions
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = "none";
    }

    // Hide other tab containers first
    hideTabContainers();

    let payrollContainer = document.querySelector(".payroll-container");

    if (!payrollContainer) {
      payrollContainer = document.createElement("div");
      payrollContainer.className = "payroll-container";
      payrollContainer.innerHTML = `
        <div class="payroll-header section-header">
          <h2 class="payroll-count">Payroll Records (0)</h2>
          <div class="section-actions">
            <button class="btn secondary-btn refresh-payroll-btn">
              <span class="material-icons">refresh</span>
              <span>Refresh</span>
            </button>
            <button class="btn primary-btn add-payroll-btn">
              <span class="material-icons">add_card</span> 
              <span>Add Salary Record</span>
            </button>
          </div>
        </div>
        
        <div class="payroll-table-container table-responsive-container">
          <table class="data-table payroll-table">
            <thead>
              <tr>
                <th width="50">ID</th>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Salary Month</th>
                <th>Amount (Rp)</th>
                <th>Transfer Date</th>
                <th>Notes</th>
                <th width="120">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Payroll rows will be populated here -->
            </tbody>
          </table>
          <div class="no-data-message payroll-no-data">No payroll data available.</div>
        </div>
      `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(payrollContainer);
      }

      // Add event listeners for payroll actions
      const refreshBtn = payrollContainer.querySelector(".refresh-payroll-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchPayrollData);
      }

      const addBtn = payrollContainer.querySelector(".add-payroll-btn");
      if (addBtn) {
        addBtn.addEventListener("click", showAddPayrollModal);
      }
    }

    payrollContainer.style.display = "block";
    fetchPayrollData(); // Fetch data when tab is shown
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

  // Add this function to fetch attendance data from the API
  async function fetchAttendanceData() {
    showLoader();

    try {
      const response = await fetch(`${apiUrl}/getabsensi`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Update the attendance count - check if element exists first
      const attendanceCountElement =
        document.querySelector(".attendance-count");
      if (attendanceCountElement) {
        attendanceCountElement.textContent = `Attendance Records (${
          data ? data.length : 0
        })`;
      }

      // Render attendance data - check if data exists
      if (data && Array.isArray(data)) {
        renderAttendanceTable(data);
      } else {
        // Handle the case where data is not an array
        const tableBody = document.querySelector(".attendance-table tbody");
        if (tableBody) {
          tableBody.innerHTML = "";
        }

        const noDataMessage = document.querySelector(
          ".attendance-container .no-data-message"
        );
        if (noDataMessage) {
          noDataMessage.style.display = "block";
        }
      }

      hideLoader();
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      hideLoader();
      showErrorAlert("Failed to load attendance data. Please try again.");
    }
  }

  function formatTimeOnly(timeString) {
    if (!timeString) return "-";

    // Check if it's a full ISO timestamp
    if (timeString.includes("T")) {
      // Extract just the time portion from ISO timestamp (after the T)
      const timePart = timeString.split("T")[1];
      // Get just HH:MM:SS
      return timePart.substring(0, 8);
    }
    // If it's just a time string already
    else if (timeString.includes(":")) {
      // Return first 8 chars (HH:MM:SS) if longer
      return timeString.substring(0, 8);
    }

    return timeString;
  }

  // Add this function to render the attendance data
  function renderAttendanceTable(attendanceData) {
    const tableBody = document.querySelector(".attendance-table tbody");
    const noDataMessage = document.querySelector(
      ".attendance-container .no-data-message"
    );

    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = "";

    // Show message if no data
    if (!attendanceData || attendanceData.length === 0) {
      if (noDataMessage) noDataMessage.style.display = "block";
      return;
    }

    // Hide no data message
    if (noDataMessage) noDataMessage.style.display = "none";

    // Create table rows
    attendanceData.forEach((record) => {
      const row = document.createElement("tr");

      // Format the date for display
      const formattedDate = new Date(record.tanggal).toLocaleDateString();
      const formattedDateTimeIn = new Date(record.jam_masuk).toLocaleTimeString(
        "id-ID",
        { hour12: false }
      );
      // Create status badge based on attendance status
      const statusClass = record.status.toLowerCase();
      const statusBadge = `<span class="status-badge ${statusClass}">${record.status}</span>`;

      row.innerHTML = `
      <td>
        <div class="checkbox-container">
          <span class="custom-checkbox" data-id="${record.id}"></span>
        </div>
      </td>
      <td>${record.id}</td>
      <td>${record.nama}</td>
      <td>${formattedDate}</td>
      <td>${formatTimeOnly(record.jam_masuk)}</td>
      <td>${record.jam_keluar || "-"}</td>
      <td>${statusBadge}</td>
      <td>${record.keterangan || "-"}</td>
    `;

      tableBody.appendChild(row);

      // Add event listeners to the action buttons
      const viewBtn = row.querySelector(".view-btn");
      if (viewBtn) {
        viewBtn.addEventListener("click", () =>
          viewAttendanceDetails(record.id, record)
        );
      }

      const editBtn = row.querySelector(".edit-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () =>
          editAttendanceRecord(record.id, record)
        );
      }
    });
  }

  // Add this placeholder function (you can expand it later)
  function showAddAttendanceModal() {
    showAlert("Add attendance functionality will be available soon.", "info");
  }

  // Add this placeholder function (you can expand it later)
  function viewAttendanceDetails(id, record) {
    const modalHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Attendance Details</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="details-grid">
            <div class="detail-row">
              <div class="detail-label">ID:</div>
              <div class="detail-value">${record.id}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Staff Name:</div>
              <div class="detail-value">${record.nama}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Date:</div>
              <div class="detail-value">${new Date(
                record.tanggal
              ).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Time In:</div>
              <div class="detail-value">${record.jam_masuk}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Time Out:</div>
              <div class="detail-value">${
                record.jam_keluar || "Not recorded"
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-badge ${record.status.toLowerCase()}">${
      record.status
    }</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Notes:</div>
              <div class="detail-value">${record.keterangan || "-"}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary-btn" id="close-view">Close</button>
          <button class="btn primary-btn" id="edit-attendance" data-id="${
            record.id
          }">Edit</button>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document.getElementById("close-view").addEventListener("click", closeModal);
    document.getElementById("edit-attendance").addEventListener("click", () => {
      closeModal();
      editAttendanceRecord(record.id, record);
    });

    document.querySelector(".modal-overlay").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) closeModal();
    });
  }

  // Add this placeholder function (you can expand it later)
  function editAttendanceRecord(id, record) {
    showAlert("Edit attendance functionality will be available soon.", "info");
  }

  // Show attendance tab
  // Replace the existing showAttendanceTab() function with this one
  function showAttendanceTab() {
    console.log("Showing Attendance tab");

    // Hide staff table and related elements
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.style.display = "none";
    }

    // ✅ HIDE staff management filters and actions
    hideStaffFiltersAndActions();

    // Hide bulk actions
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = "none";
    }

    // Hide other tab containers first
    hideTabContainers();

    // Create or get attendance container
    let attendanceContainer = document.querySelector(".attendance-container");

    if (!attendanceContainer) {
      attendanceContainer = document.createElement("div");
      attendanceContainer.className = "attendance-container";

      // Create attendance table structure
      attendanceContainer.innerHTML = `
      <div class="attendance-header">
        <h2 class="attendance-count">Attendance Records (0)</h2>
        <div class="attendance-actions">
          <button class="refresh-btn">
            <span class="material-icons">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      <div class="attendance-table-container">
        <table class="attendance-table">
          <thead>
            <tr>
              <th width="60">
                <div class="checkbox-container">
                  <span class="custom-checkbox"></span>
                </div>
              </th>
              <th width="90">ID</th>
              <th>Staff Name</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
              <th width="180">Notes</th>
            </tr>
          </thead>
          <tbody>
            <!-- Attendance rows will be populated here -->
          </tbody>
        </table>
        <div class="no-data-message">No attendance data available.</div>
      </div>
    `;

      const container = document.querySelector(".container");
      if (container) {
        container.appendChild(attendanceContainer);
      }

      // Add event listeners to attendance actions
      const refreshBtn = attendanceContainer.querySelector(".refresh-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchAttendanceData);
      }

      const addAttendanceBtn = attendanceContainer.querySelector(
        ".add-attendance-btn"
      );
      if (addAttendanceBtn) {
        addAttendanceBtn.addEventListener("click", showAddAttendanceModal);
      }
    }

    attendanceContainer.style.display = "block";

    // Get attendance data from API
    fetchAttendanceData();
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
  // --- PAYROLL (GAJI) SECTION ---

  // Function to show the payroll tab
  function showPayrollTab() {
    console.log("Showing Payroll tab");

    // Hide staff table and related elements
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.style.display = "none";
    }

    // ✅ HIDE staff management filters and actions
    hideStaffFiltersAndActions();

    // Hide bulk actions
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = "none";
    }

    // Hide other tab containers first
    hideTabContainers();

    let payrollContainer = document.querySelector(".payroll-container");

    if (!payrollContainer) {
      payrollContainer = document.createElement("div");
      payrollContainer.className = "payroll-container";
      payrollContainer.innerHTML = `
        <div class="payroll-header section-header">
          <h2 class="payroll-count">Payroll Records (0)</h2>
          <div class="section-actions">
            <button class="btn secondary-btn refresh-payroll-btn">
              <span class="material-icons">refresh</span>
              <span>Refresh</span>
            </button>
            <button class="btn primary-btn add-payroll-btn">
              <span class="material-icons">add_card</span> 
              <span>Add Salary Record</span>
            </button>
          </div>
        </div>
        
        <div class="payroll-table-container table-responsive-container">
          <table class="data-table payroll-table">
            <thead>
              <tr>
                <th width="50">ID</th>
                <th>Staff ID</th>
                <th>Staff Name</th> <!-- Will need to fetch staff name separately or join in backend -->
                <th>Salary Month</th>
                <th>Amount (Rp)</th>
                <th>Transfer Date</th>
                <th>Notes</th>
                <th width="120">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Payroll rows will be populated here -->
            </tbody>
          </table>
          <div class="no-data-message payroll-no-data">No payroll data available.</div>
        </div>
      `;

      const container = document.querySelector(".container"); // Main content container
      if (container) {
        container.appendChild(payrollContainer);
      }

      // Add event listeners for payroll actions
      const refreshBtn = payrollContainer.querySelector(".refresh-payroll-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchPayrollData);
      }

      const addBtn = payrollContainer.querySelector(".add-payroll-btn");
      if (addBtn) {
        addBtn.addEventListener("click", showAddPayrollModal);
      }
    }

    payrollContainer.style.display = "block";
    fetchPayrollData(); // Fetch data when tab is shown
  }

  // Fetch payroll data from API
  async function fetchPayrollData() {
    showLoader();
    const payrollNoDataMsg = document.querySelector(".payroll-no-data");
    const payrollCountElement = document.querySelector(".payroll-count");

    try {
      const response = await fetch(`${apiUrl}/getgaji`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      const data = await response.json();

      if (payrollCountElement) {
        payrollCountElement.textContent = `Payroll Records (${
          data ? data.length : 0
        })`;
      }

      // To display staff names, you might need to fetch staff data and map it
      // For simplicity, this example assumes staff names might come from a join or will be handled later
      renderPayrollTable(data || []);

      if (payrollNoDataMsg) {
        payrollNoDataMsg.style.display =
          !data || data.length === 0 ? "block" : "none";
      }
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      showErrorAlert(`Failed to load payroll data: ${error.message}`);
      if (payrollNoDataMsg) payrollNoDataMsg.style.display = "block";
      if (payrollCountElement)
        payrollCountElement.textContent = `Payroll Records (0)`;
      renderPayrollTable([]); // Clear table on error
    } finally {
      hideLoader();
    }
  }

  // Render payroll data into the table
  function renderPayrollTable(payrollData) {
    const tableBody = document.querySelector(".payroll-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = ""; // Clear existing rows

    if (!payrollData || payrollData.length === 0) {
      return; // No data to render
    }

    payrollData.forEach((record) => {
      const row = document.createElement("tr");
      // Assuming you have a way to get staff name, e.g., from staffData array
      const staffMember = staffData.find((s) => s.id === record.staff_id);
      const staffName = staffMember
        ? staffMember.nama
        : `ID: ${record.staff_id}`;

      row.innerHTML = `
        <td>${record.id}</td>
        <td>${record.staff_id}</td>
        <td>${staffName}</td>
        <td>${
          record.bulan_gaji
            ? new Date(record.bulan_gaji).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
              })
            : "-"
        }</td>
        <td>${
          record.gaji_perbulan
            ? record.gaji_perbulan.toLocaleString("id-ID")
            : "-"
        }</td>
        <td>${
          record.tanggal_transfer
            ? new Date(record.tanggal_transfer).toLocaleDateString("id-ID")
            : "-"
        }</td>
        <td>${record.keterangan || "-"}</td>
        <td>
          <div class="action-icons">
            <button class="action-btn view-payroll-btn" data-id="${
              record.id
            }" title="View Details">
              <span class="material-icons">visibility</span>
            </button>
            <button class="action-btn edit-payroll-btn" data-id="${
              record.id
            }" title="Edit Record">
              <span class="material-icons">edit</span>
            </button>
            <button class="action-btn delete-payroll-btn" data-id="${
              record.id
            }" title="Delete Record">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);

      // Add event listeners for action buttons
      row
        .querySelector(".view-payroll-btn")
        .addEventListener("click", () => viewPayrollRecord(record));
      row
        .querySelector(".edit-payroll-btn")
        .addEventListener("click", () => showEditPayrollModal(record));
      row
        .querySelector(".delete-payroll-btn")
        .addEventListener("click", () => deletePayrollRecord(record.id));
    });
  }

  // Show modal to add a new payroll record
  function showAddPayrollModal() {
    closeModal(); // Close any existing modal

    const staffOptions = staffData
      .map(
        (staff) =>
          `<option value="${staff.id}">${staff.nama} (ID: ${staff.id})</option>`
      )
      .join("");

    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Add New Salary Record</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="add-payroll-form">
              <div class="form-group">
                <label for="payroll-staff-id">Staff*</label>
                <select id="payroll-staff-id" name="staff_id" required>
                  <option value="" disabled selected>Select Staff</option>
                  ${staffOptions}
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="payroll-bulan-gaji">Salary Month (YYYY-MM-DD)*</label>
                  <input type="date" id="payroll-bulan-gaji" name="bulan_gaji" required>
                </div>
                <div class="form-group">
                  <label for="payroll-gaji-perbulan">Amount (Rp)*</label>
                  <input type="number" id="payroll-gaji-perbulan" name="gaji_perbulan" step="0.01" required placeholder="e.g., 5000000">
                </div>
              </div>
              <div class="form-group">
                <label for="payroll-tanggal-transfer">Transfer Date (YYYY-MM-DD)*</label>
                <input type="date" id="payroll-tanggal-transfer" name="tanggal_transfer" required>
              </div>
              <div class="form-group">
                <label for="payroll-keterangan">Notes</label>
                <textarea id="payroll-keterangan" name="keterangan" rows="3" placeholder="Optional notes"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="cancel-add-payroll">Cancel</button>
            <button class="btn primary-btn" id="save-payroll-btn">Save Record</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("cancel-add-payroll")
      .addEventListener("click", closeModal);
    document
      .getElementById("save-payroll-btn")
      .addEventListener("click", addPayrollRecord);
    document.querySelector(".modal-overlay").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) closeModal();
    });
  }

  // Add a new payroll record
  async function addPayrollRecord() {
    const form = document.getElementById("add-payroll-form");
    if (!form) return;

    const staffIdField = form.querySelector('[name="staff_id"]');
    const bulanGajiField = form.querySelector('[name="bulan_gaji"]');
    const gajiPerbulanField = form.querySelector('[name="gaji_perbulan"]');
    const tanggalTransferField = form.querySelector(
      '[name="tanggal_transfer"]'
    );

    if (!staffIdField.value) {
      showErrorAlert("Please select a staff member.");
      staffIdField.focus();
      return;
    }
    if (!bulanGajiField.value) {
      showErrorAlert("Please select the salary month.");
      bulanGajiField.focus();
      return;
    }
    if (!gajiPerbulanField.value || parseFloat(gajiPerbulanField.value) <= 0) {
      showErrorAlert("Please enter a valid salary amount.");
      gajiPerbulanField.focus();
      return;
    }
    if (!tanggalTransferField.value) {
      showErrorAlert("Please select the transfer date.");
      tanggalTransferField.focus();
      return;
    }

    const payrollData = {
      staff_id: parseInt(staffIdField.value),
      bulan_gaji: bulanGajiField.value,
      gaji_perbulan: parseFloat(gajiPerbulanField.value),
      tanggal_transfer: tanggalTransferField.value,
      keterangan:
        form.querySelector('[name="keterangan"]').value.trim() || null,
    };

    showLoader();
    try {
      const response = await fetch(`${apiUrl}/addgaji`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(payrollData),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(
          responseData.Error ||
            responseData.message ||
            `HTTP error! Status: ${response.status}`
        );
      }

      showSuccessAlert(
        responseData.message || "Salary record added successfully!"
      );
      closeModal();
      fetchPayrollData(); // Refresh table
    } catch (error) {
      console.error("Error adding payroll record:", error);
      showErrorAlert(`Failed to add salary record: ${error.message}`);
    } finally {
      hideLoader();
    }
  }

  // Show modal to edit an existing payroll record
  function showEditPayrollModal(record) {
    closeModal();
    if (!record) return;

    const staffOptions = staffData
      .map(
        (staff) =>
          `<option value="${staff.id}" ${
            staff.id === record.staff_id ? "selected" : ""
          }>${staff.nama} (ID: ${staff.id})</option>`
      )
      .join("");

    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Edit Salary Record (ID: ${record.id})</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-payroll-form">
              <input type="hidden" name="id" value="${record.id}">
              <div class="form-group">
                <label for="edit-payroll-staff-id">Staff*</label>
                <select id="edit-payroll-staff-id" name="staff_id" required>
                  ${staffOptions}
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-payroll-bulan-gaji">Salary Month (YYYY-MM-DD)*</label>
                  <input type="date" id="edit-payroll-bulan-gaji" name="bulan_gaji" value="${
                    record.bulan_gaji || ""
                  }" required>
                </div>
                <div class="form-group">
                  <label for="edit-payroll-gaji-perbulan">Amount (Rp)*</label>
                  <input type="number" id="edit-payroll-gaji-perbulan" name="gaji_perbulan" step="0.01" value="${
                    record.gaji_perbulan || ""
                  }" required>
                </div>
              </div>
              <div class="form-group">
                <label for="edit-payroll-tanggal-transfer">Transfer Date (YYYY-MM-DD)*</label>
                <input type="date" id="edit-payroll-tanggal-transfer" name="tanggal_transfer" value="${
                  record.tanggal_transfer || ""
                }" required>
              </div>
              <div class="form-group">
                <label for="edit-payroll-keterangan">Notes</label>
                <textarea id="edit-payroll-keterangan" name="keterangan" rows="3">${
                  record.keterangan || ""
                }</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="cancel-edit-payroll">Cancel</button>
            <button class="btn primary-btn" id="update-payroll-btn">Update Record</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("cancel-edit-payroll")
      .addEventListener("click", closeModal);
    document
      .getElementById("update-payroll-btn")
      .addEventListener("click", updatePayrollRecord);
    document.querySelector(".modal-overlay").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) closeModal();
    });
  }

  // Update an existing payroll record
  async function updatePayrollRecord() {
    const form = document.getElementById("edit-payroll-form");
    if (!form) return;

    const recordId = form.querySelector('[name="id"]').value;
    const staffIdField = form.querySelector('[name="staff_id"]');
    const bulanGajiField = form.querySelector('[name="bulan_gaji"]');
    const gajiPerbulanField = form.querySelector('[name="gaji_perbulan"]');
    const tanggalTransferField = form.querySelector(
      '[name="tanggal_transfer"]'
    );

    if (!staffIdField.value) {
      showErrorAlert("Please select a staff member.");
      staffIdField.focus();
      return;
    }
    if (!bulanGajiField.value) {
      showErrorAlert("Please select the salary month.");
      bulanGajiField.focus();
      return;
    }
    if (!gajiPerbulanField.value || parseFloat(gajiPerbulanField.value) <= 0) {
      showErrorAlert("Please enter a valid salary amount.");
      gajiPerbulanField.focus();
      return;
    }
    if (!tanggalTransferField.value) {
      showErrorAlert("Please select the transfer date.");
      tanggalTransferField.focus();
      return;
    }

    const payrollData = {
      id: parseInt(recordId),
      staff_id: parseInt(staffIdField.value),
      bulan_gaji: bulanGajiField.value,
      gaji_perbulan: parseFloat(gajiPerbulanField.value),
      tanggal_transfer: tanggalTransferField.value,
      keterangan:
        form.querySelector('[name="keterangan"]').value.trim() || null,
    };

    showLoader();
    try {
      const response = await fetch(`${apiUrl}/gaji/${recordId}`, {
        // Assuming PUT to /gaji/{id}
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(payrollData),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(
          responseData.Error ||
            responseData.message ||
            `HTTP error! Status: ${response.status}`
        );
      }
      showSuccessAlert(
        responseData.message || "Salary record updated successfully!"
      );
      closeModal();
      fetchPayrollData();
    } catch (error) {
      console.error("Error updating payroll record:", error);
      showErrorAlert(`Failed to update salary record: ${error.message}`);
    } finally {
      hideLoader();
    }
  }

  // Delete a payroll record
  async function deletePayrollRecord(id) {
    if (
      !confirm(
        `Are you sure you want to delete salary record ID: ${id}? This action cannot be undone.`
      )
    ) {
      return;
    }
    showLoader();
    try {
      const response = await fetch(`${apiUrl}/deletegaji/${id}`, {
        // Assuming DELETE to /gaji/{id}
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(
          responseData.Error ||
            responseData.message ||
            `HTTP error! Status: ${response.status}`
        );
      }
      showSuccessAlert(
        responseData.message || "Salary record deleted successfully!"
      );
      fetchPayrollData();
    } catch (error) {
      console.error("Error deleting payroll record:", error);
      showErrorAlert(`Failed to delete salary record: ${error.message}`);
    } finally {
      hideLoader();
    }
  }

  // View payroll record details (placeholder - build out a modal similar to viewStaffDetails)
  function viewPayrollRecord(record) {
    if (!record) return;
    closeModal();

    const staffMember = staffData.find((s) => s.id === record.staff_id);
    const staffName = staffMember ? staffMember.nama : `ID: ${record.staff_id}`;

    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>Salary Record Details (ID: ${record.id})</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-row"><div class="detail-label">Record ID:</div><div class="detail-value">${
                record.id
              }</div></div>
              <div class="detail-row"><div class="detail-label">Staff ID:</div><div class="detail-value">${
                record.staff_id
              }</div></div>
              <div class="detail-row"><div class="detail-label">Staff Name:</div><div class="detail-value">${staffName}</div></div>
              <div class="detail-row"><div class="detail-label">Salary Month:</div><div class="detail-value">${
                record.bulan_gaji
                  ? new Date(record.bulan_gaji).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
              }</div></div>
              <div class="detail-row"><div class="detail-label">Amount:</div><div class="detail-value">Rp ${
                record.gaji_perbulan
                  ? record.gaji_perbulan.toLocaleString("id-ID")
                  : "-"
              }</div></div>
              <div class="detail-row"><div class="detail-label">Transfer Date:</div><div class="detail-value">${
                record.tanggal_transfer
                  ? new Date(record.tanggal_transfer).toLocaleDateString(
                      "id-ID",
                      { year: "numeric", month: "long", day: "numeric" }
                    )
                  : "-"
              }</div></div>
              <div class="detail-row"><div class="detail-label">Notes:</div><div class="detail-value">${
                record.keterangan || "-"
              }</div></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn secondary-btn" id="close-view-payroll">Close</button>
            <button class="btn primary-btn" id="edit-viewed-payroll-btn">Edit</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .querySelector(".close-modal")
      .addEventListener("click", closeModal);
    document
      .getElementById("close-view-payroll")
      .addEventListener("click", closeModal);
    document
      .getElementById("edit-viewed-payroll-btn")
      .addEventListener("click", () => {
        closeModal();
        showEditPayrollModal(record);
      });
    document.querySelector(".modal-overlay").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) closeModal();
    });
  }

  // Add staff with registration (like register.html)
  async function addStaffWithRegistration() {
    const form = document.getElementById("add-staff-form");
    if (!form) return;

    // Get form values
    const username = document.getElementById("staff-username").value;
    const password = document.getElementById("staff-password").value;
    const confirmPassword = document.getElementById(
      "staff-confirm-password"
    ).value;
    const nama = document.getElementById("staff-name").value;
    const noHp = document.getElementById("staff-phone").value;
    const alamat = document.getElementById("staff-address").value;
    const email = document.getElementById("staff-email").value;
    const tanggalLahir = document.getElementById("staff-dob").value;
    const statusKerja = document.getElementById("staff-status").value;
    const role = document.getElementById("staff-role").value;

    const passwordError = document.getElementById("staff-password-error");
    const registerError = document.getElementById("staff-register-error");

    // Validate required fields
    if (!username.trim()) {
      showErrorAlert("Username is required");
      return;
    }

    if (!password.trim()) {
      showErrorAlert("Password is required");
      return;
    }

    if (!nama.trim()) {
      showErrorAlert("Full name is required");
      return;
    }

    if (!noHp.trim()) {
      showErrorAlert("Phone number is required");
      return;
    }

    if (!statusKerja) {
      showErrorAlert("Status is required");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      passwordError.style.display = "block";
      return;
    } else {
      passwordError.style.display = "none";
    }

    // Prepare data for API
    const userData = {
      username: username,
      password: password,
      role: role || "staff", // Default role is staff
    };

    console.log("Attempting registration with:", userData);

    showLoader();

    try {
      // First, create user account
      const registerResponse = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const registerResult = await registerResponse.json();
      console.log("User registration result:", registerResult);

      if (
        !registerResult.message ||
        !registerResult.message.includes("successfully")
      ) {
        throw new Error(
          "User registration failed: " + JSON.stringify(registerResult)
        );
      }

      // Login to get token
      const loginResponse = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const loginData = await loginResponse.json();
      console.log("Login response:", loginData);

      if (!loginData.token || !loginData.user_id) {
        throw new Error("Failed to get authentication token");
      }

      // Now create staff record with the user_id from login
      const staffData = {
        nama: nama,
        no_hp: noHp,
        alamat: alamat,
        email: email,
        status_kerja: statusKerja,
        user_id: parseInt(loginData.user_id), // Ensure it's a number
        tanggal_lahir: tanggalLahir || null,
      };

      console.log("Creating staff with data:", staffData);
      console.log("Using token:", loginData.token);

      const staffResponse = await fetch(`${apiUrl}/addstaff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: loginData.token,
        },
        body: JSON.stringify(staffData),
      });

      const staffResult = await staffResponse.json();
      console.log("Staff creation result:", staffResult);

      if (
        staffResult.success === "true" ||
        (staffResult.message && staffResult.message.includes("success"))
      ) {
        showSuccessAlert("Staff added successfully!");
        closeModal();
        fetchStaffData(); // Refresh the staff list
      } else {
        registerError.textContent =
          "Staff profile creation failed. Please contact support.";
        registerError.style.display = "block";
      }
    } catch (error) {
      console.error("Registration error:", error);
      registerError.textContent =
        error.message || "Registration failed. Please try again.";
      registerError.style.display = "block";
    } finally {
      hideLoader();
    }
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

    // Sort the data before rendering
    const sortedData = [...dataToRender].sort((a, b) => {
      // Handle null or undefined values
      const aValue = a[currentSortField] || "";
      const bValue = b[currentSortField] || "";

      // Compare values based on sort direction
      if (sortDirection === "asc") {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    // When rendering each staff row, calculate their age
    sortedData.forEach((staff) => {
      const isSelected = selectedStaffIds.includes(staff.id);
      const row = document.createElement("tr");

      // Calculate age if date_of_birth is available
      let age = "-";
      if (staff.date_of_birth) {
        const dob = new Date(staff.date_of_birth);
        const today = new Date();
        let ageValue = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < dob.getDate())
        ) {
          ageValue--;
        }
        age = ageValue.toString();
      }

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
        <td>${age}</td>
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
            <!-- Account Information - Full width -->
            <div class="form-row">
              <div class="form-group col-full">
                <label for="staff-username">Username*</label>
                <input
                  type="text"
                  id="staff-username"
                  name="username"
                  class="form-control"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <!-- Password fields - Two columns -->
            <div class="form-row">
              <div class="form-group col-half">
                <label for="staff-password">Password*</label>
                <input
                  type="password"
                  id="staff-password"
                  name="password"
                  class="form-control"
                  placeholder="Enter password"
                  required
                />
              </div>
              <div class="form-group col-half">
                <label for="staff-confirm-password">Confirm Password*</label>
                <input
                  type="password"
                  id="staff-confirm-password"
                  name="confirm_password"
                  class="form-control"
                  placeholder="Confirm password"
                  required
                />
                <div class="error-message" id="staff-password-error" style="display: none;">
                  Passwords do not match
                </div>
              </div>
            </div>

            <!-- Personal Information - Two columns -->
            <div class="form-row">
              <div class="form-group col-half">
                <label for="staff-name">Full Name*</label>
                <input
                  type="text"
                  id="staff-name"
                  name="nama"
                  class="form-control"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div class="form-group col-half">
                <label for="staff-email">Email</label>
                <input
                  type="email"
                  id="staff-email"
                  name="email"
                  class="form-control"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-half">
                <label for="staff-phone">Phone Number*</label>
                <input
                  type="text"
                  id="staff-phone"
                  name="no_hp"
                  class="form-control"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div class="form-group col-half">
                <label for="staff-dob">Date of Birth</label>
                <input type="date" id="staff-dob" name="tanggal_lahir" class="form-control" />
              </div>
            </div>

            <!-- Status and Role - Two columns -->
            <div class="form-row">
              <div class="form-group col-half">
                <label for="staff-status">Status*</label>
                <select id="staff-status" name="status_kerja" class="form-control" required>
                  <option value="" disabled selected>Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div class="form-group col-half">
                <label for="staff-role">Role</label>
                <select id="staff-role" name="role" class="form-control">
                  <option value="staff" selected>Staff</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <!-- Address - Full width -->
            <div class="form-row">
              <div class="form-group col-full">
                <label for="staff-address">Address</label>
                <textarea
                  id="staff-address"
                  name="alamat"
                  class="form-control"
                  placeholder="Enter address"
                  rows="2"
                ></textarea>
              </div>
            </div>

            <div class="error-message" id="staff-register-error" style="display: none;">
              Registration failed. Please try again.
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn secondary-btn" id="cancel-add-staff">Cancel</button>
          <button class="btn primary-btn" id="save-staff-btn">Add Staff</button>
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
      .addEventListener("click", addStaffWithRegistration);

    // Close modal if clicked outside
    document
      .querySelector(".modal-overlay")
      .addEventListener("click", function (e) {
        if (e.target === this) {
          closeModal();
        }
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

    // Calculate age if date_of_birth is available
    let ageText = "-";
    if (staff.date_of_birth) {
      const dob = new Date(staff.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }
      ageText = `${age} years old`;
    }

    // Format date of birth for display
    const formattedDOB = staff.date_of_birth
      ? new Date(staff.date_of_birth).toLocaleDateString()
      : "-";

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
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='12' cy='8' r='5'%3E%3C/circle%3E%3Cpath d='M20 21v-2a7 7 0 0 0-14 0v2'%3E%3C/path%3E%3C/svg%3E" alt="Staff">
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
                <span class="detail-label">Date of Birth:</span>
                <span class="detail-value">${formattedDOB}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Age:</span>
                <span class="detail-value">${ageText}</span>
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
                  <label for="edit-staff-dob">Date of Birth</label>
                  <input type="date" id="edit-staff-dob" name="date_of_birth" value="${
                    staff.date_of_birth || ""
                  }" placeholder="Select date of birth">
                </div>
              </div>
              
              <div class="form-row">
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
                <div class="form-group">
                  <label for="edit-staff-user-id">User ID</label>
                  <input type="number" id="edit-staff-user-id" name="user_id" value="${
                    staff.user_id || ""
                  }" placeholder="Enter user ID if applicable">
                </div>
              </div>
              
              <div class="form-group">
                <label for="edit-staff-address">Address</label>
                <textarea id="edit-staff-address" name="alamat" rows="3" placeholder="Enter address">${
                  staff.alamat || ""
                }</textarea>
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
