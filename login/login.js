document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.querySelector("form");
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const usernameInput = document.querySelector('input[type="text"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch("http://localhost:5050/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        const role = data.role; // Get the role from the API response

        // display from api response username, password, and role
        console.log("Username:", username);
        console.log("Password:", password);
        console.log("Role:", role);

        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", role);

        if (role === "admin") {
          window.location.href = "/dashboard_owner/owner.html";
        } else if (role === "staff") {
          window.location.href = "/dashboard_staff/Html/staff.html";
        } else {
          alert("Unknown role. Redirecting to a default page.");
        }
      } else {
        // Handle login error
      }
    } catch (error) {
      // Handle network error
    }
  });
});
