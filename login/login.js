document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.querySelector("form");
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    let apiUrl = "";

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

    async function initializeApiUrl() {
      const envData = await readJsonFile("/json/env.json");
      if (envData && envData.api_url) {
        apiUrl = envData.api_url;
      } else {
        console.log("failed login"); // Default URL if reading fails
        console.warn(
          "Failed to read API URL from JSON, using default:",
          apiUrl
        );
      }
    }

    await initializeApiUrl();

    console.log("API URL:", apiUrl);

    const usernameInput = document.querySelector('input[type="text"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        const role = data.role;
        const userId = data.user_id; // Extract user_id

        // display from api response username, password, and role
        console.log("Username:", username);
        console.log("Password:", password);
        console.log("Role:", role);
        console.log("User ID from API:", userId); // Log the actual user_id value

        // Set everything in localStorage
        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", role);
        localStorage.setItem("staffid", userId);

        // Now log the stored value to confirm it's working
        console.log(
          "User ID in localStorage:",
          localStorage.getItem("staffid")
        );

        alert("Login successful!");

        if (role === "admin") {
          window.location.href = "/dashboard_owner/owner.html";
        } else if (role === "staff") {
          window.location.href = "/dashboard_staff/Html/staff.html";
        } else {
          alert("Unknown role. Redirecting to a default page.");
        }
      } else {
        const errorData = await response.json();
        console.error("Login failed:", errorData.message);
        alert("Login failed: " + errorData.message);
      }
    } catch (error) {
      // display error message with timeout
      const errorMessage = document.querySelector(".error-message");
      errorMessage.style.display = "block";
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 3000); // Hide after 3 seconds

      // Handle network error
    }
  });
});
