document.addEventListener("DOMContentLoaded", function () {
  const apiUrl = localStorage.getItem("apiUrl") || "http://103.16.116.58:5050";
  const registerForm = document.getElementById("register-form");
  const passwordError = document.getElementById("password-error");
  const registerError = document.getElementById("register-error");

  // Form submission handler
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get form values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const nama = document.getElementById("nama").value;
    const noHp = document.getElementById("no_hp").value;
    const alamat = document.getElementById("alamat").value;
    const email = document.getElementById("email").value;
    const tanggalLahir = document.getElementById("tanggal_lahir").value;

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
      role: "staff", // Default role is staff
    };

    console.log("Attempting registration with:", userData);

    // First, create user account
    fetch(`${apiUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })
      .then((response) => {
        console.log("Register response status:", response.status);
        return response.json();
      })
      .then((result) => {
        console.log("User registration result:", result);

        if (!result.message || !result.message.includes("successfully")) {
          throw new Error(
            "User registration failed: " + JSON.stringify(result)
          );
        }

        // Login to get token
        return fetch(`${apiUrl}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        });
      })
      .then((response) => {
        console.log("Login response status:", response.status);
        return response.json();
      })
      .then((loginData) => {
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
          status_kerja: "Active",
          user_id: parseInt(loginData.user_id), // Ensure it's a number
          tanggal_lahir: tanggalLahir || null,
        };

        console.log("Creating staff with data:", staffData);
        console.log("Using token:", loginData.token);

        return fetch(`${apiUrl}/addstaff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: loginData.token,
          },
          body: JSON.stringify(staffData),
        });
      })
      .then((response) => {
        console.log("Staff creation response status:", response.status);
        return response.json();
      })
      .then((staffResult) => {
        console.log("Staff creation result:", staffResult);

        alert("Registration successful! Please login.");
        window.location.href = "/login/login.html";
      })
      .catch((error) => {
        console.error("Registration error:", error);
        registerError.textContent =
          error.message || "Registration failed. Please try again.";
        registerError.style.display = "block";
      });
  });
});
