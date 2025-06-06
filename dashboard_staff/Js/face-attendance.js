class FaceAttendanceSystem {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.stream = null;
    this.isCapturing = false;
    this.faceDescriptors = new Map();
    this.apiUrl = localStorage.getItem("apiUrl") || "http://localhost:5050";
    this.token = localStorage.getItem("authToken");
    this.userid = localStorage.getItem("userid");
  }

  async initializeCamera() {
    try {
      this.video = document.getElementById("face-video");
      this.canvas = document.getElementById("face-canvas");

      if (!this.video || !this.canvas) {
        throw new Error("Video or canvas element not found");
      }

      this.ctx = this.canvas.getContext("2d");

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      this.video.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          resolve();
        };
      });

      this.updateStatus("Camera terhubung", "success");
      return true;
    } catch (error) {
      console.error("Error initializing camera:", error);
      this.updateStatus(
        "Failed to access camera. Please allow camera permissions.",
        "danger"
      );
      return false;
    }
  }

  captureFrame() {
    if (!this.video || !this.canvas || !this.ctx) {
      this.updateStatus("Camera not initialized", "danger");
      return null;
    }

    // Draw video frame to canvas
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Get image data as base64
    const imageData = this.canvas.toDataURL("image/png", 0.8);
    return imageData;
  }

  async processAttendance() {
    try {
      this.updateStatus("Processing attendance...", "info");
      this.isCapturing = true;

      const imageData = this.captureFrame();
      if (!imageData) {
        throw new Error("Failed to capture image");
      }

      // Prepare face attendance data for the correct endpoint
      const faceAttendanceData = {
        user_id: parseInt(this.userid),
        image: imageData, // Send the full base64 image including the data: prefix
      };

      console.log("Sending face attendance data:", {
        user_id: faceAttendanceData.user_id,
        image_length: imageData.length,
      });

      // Send to the face attendance API endpoint
      const response = await fetch(`${this.apiUrl}/absensi-wajah`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: this.token,
        },
        body: JSON.stringify(faceAttendanceData),
      });

      const result = await response.json();
      console.log("Face attendance response:", result);

      if (result.success) {
        this.updateStatus(`✅ ${result.message}`, "success");
        // Close modal after success
        setTimeout(() => {
          document.getElementById("absensi-modal").style.display = "none";
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to record attendance");
      }
    } catch (error) {
      console.error("Attendance error:", error);
      this.updateStatus(`❌ Error: ${error.message}`, "danger");
    } finally {
      this.isCapturing = false;
    }
  }

  async registerFace() {
    try {
      this.updateStatus("Registering face...", "info");

      const imageData = this.captureFrame();
      if (!imageData) {
        throw new Error("Failed to capture image");
      }

      // Prepare registration data
      const registrationData = {
        user_id: parseInt(this.userid),
        image: imageData,
        name: "Staff Face", // You can get actual name from staff data
      };

      // Send to API
      const response = await fetch(`${this.apiUrl}/register-face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: this.token,
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (result.success) {
        this.updateStatus("✅ Face registered successfully!", "success");
      } else {
        throw new Error(result.message || "Failed to register face");
      }
    } catch (error) {
      console.error("Registration error:", error);
      this.updateStatus(`❌ Error: ${error.message}`, "danger");
    }
  }

  updateStatus(message, type = "info") {
    const statusElement = document.getElementById("face-status");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  destroy() {
    this.stopCamera();
    this.faceDescriptors.clear();
  }
}

// Initialize face attendance system
let faceAttendanceSystem = null;

// Event listeners for face attendance
document.addEventListener("DOMContentLoaded", function () {
  // Attendance option buttons
  const manualBtn = document.getElementById("manual-attendance-btn");
  const faceBtn = document.getElementById("face-attendance-btn");
  const manualSection = document.getElementById("manual-attendance-section");
  const faceSection = document.getElementById("face-attendance-section");

  // Switch between manual and face attendance
  if (manualBtn && faceBtn && manualSection && faceSection) {
    manualBtn.addEventListener("click", () => {
      manualBtn.classList.add("active");
      faceBtn.classList.remove("active");
      manualSection.style.display = "block";
      faceSection.style.display = "none";

      // Stop camera if active
      if (faceAttendanceSystem) {
        faceAttendanceSystem.stopCamera();
      }
    });

    faceBtn.addEventListener("click", async () => {
      faceBtn.classList.add("active");
      manualBtn.classList.remove("active");
      faceSection.style.display = "block";
      manualSection.style.display = "none";

      // Initialize face attendance system
      if (!faceAttendanceSystem) {
        faceAttendanceSystem = new FaceAttendanceSystem();
      }

      await faceAttendanceSystem.initializeCamera();
    });
  }

  // Face capture button
  const captureFaceBtn = document.getElementById("capture-face-btn");
  if (captureFaceBtn) {
    captureFaceBtn.addEventListener("click", async () => {
      if (faceAttendanceSystem && !faceAttendanceSystem.isCapturing) {
        await faceAttendanceSystem.processAttendance();
      }
    });
  }

  // Face registration button
  const registerFaceBtn = document.getElementById("register-face-btn");
  if (registerFaceBtn) {
    registerFaceBtn.addEventListener("click", async () => {
      if (faceAttendanceSystem && !faceAttendanceSystem.isCapturing) {
        await faceAttendanceSystem.registerFace();
      }
    });
  }

  // Clean up when modal is closed
  const closeAbsensiModal = document.getElementById("close-absensi-modal");
  if (closeAbsensiModal) {
    closeAbsensiModal.addEventListener("click", () => {
      if (faceAttendanceSystem) {
        faceAttendanceSystem.stopCamera();
      }
    });
  }
});
