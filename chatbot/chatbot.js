// Enhanced Chatbot with Voice Commands
class POSChatbot {
  constructor() {
    this.apiKey = "AIzaSyAjRePFyWIPoonuh25YTalHcHn9rDyzkqk"; // Replace with your actual API key
    this.apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";
    this.isOpen = false;
    this.isMinimized = false;

    // Voice recognition properties
    this.recognition = null;
    this.isListening = false;
    this.voiceEnabled = false;
    this.speechSynthesis = window.speechSynthesis;
    this.voiceEnabled =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

    this.initializeElements();
    this.initializeVoiceRecognition();
    this.attachEventListeners();
    this.loadChatHistory();

    // Get POS context
    this.posContext = this.getPOSContext();
  }

  initializeElements() {
    this.chatbotToggle = document.getElementById("chatbot-toggle");
    this.chatbotContainer = document.getElementById("chatbot-container");
    this.chatbotMessages = document.getElementById("chatbot-messages");
    this.chatbotInput = document.getElementById("chatbot-input");
    this.chatbotSend = document.getElementById("chatbot-send");
    this.chatbotClose = document.getElementById("chatbot-close");
    this.chatbotMinimize = document.getElementById("chatbot-minimize");
    this.chatbotTyping = document.getElementById("chatbot-typing");
    this.suggestions = document.querySelectorAll(".suggestion-btn");

    // Voice elements
    this.voiceBtn = document.getElementById("voice-btn");
    this.voiceHelpBtn = document.getElementById("voice-help-btn");
    this.voiceStatus = document.getElementById("voice-status");
    this.voiceTranscript = document.getElementById("voice-transcript");
    this.voiceCommandsHelp = document.getElementById("voice-commands-help");
  }

  initializeVoiceRecognition() {
    if (!this.voiceEnabled) {
      console.log("Voice recognition not supported");
      if (this.voiceBtn) {
        this.voiceBtn.style.display = "none";
      }
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US"; // Start with English

    this.recognition.onstart = () => {
      this.isListening = true;
      this.voiceBtn.classList.add("recording");
      this.updateVoiceStatus("Listening... speak now");
      if (this.voiceTranscript) {
        this.voiceTranscript.style.display = "none";
      }
      console.log("Voice recognition started");
    };

    this.recognition.onresult = (event) => {
      console.log("Voice recognition result received");
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      console.log("Transcript:", transcript);

      if (transcript.trim() && this.voiceTranscript) {
        this.voiceTranscript.textContent = `"${transcript}"`;
        this.voiceTranscript.classList.add("show");
      }

      // If final result
      if (event.results[event.results.length - 1].isFinal) {
        console.log("Final transcript:", transcript);
        this.processVoiceCommand(transcript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.stopListening();
      this.updateVoiceStatus(`Error: ${event.error}`);

      setTimeout(() => {
        this.updateVoiceStatus("");
      }, 3000);
    };

    this.recognition.onend = () => {
      console.log("Voice recognition ended");
      this.stopListening();
    };
  }

  attachEventListeners() {
    // Toggle chatbot
    if (this.chatbotToggle) {
      this.chatbotToggle.addEventListener("click", () => this.toggleChatbot());
    }

    // Close and minimize
    if (this.chatbotClose) {
      this.chatbotClose.addEventListener("click", () => this.closeChatbot());
    }
    if (this.chatbotMinimize) {
      this.chatbotMinimize.addEventListener("click", () =>
        this.minimizeChatbot()
      );
    }

    // Send message
    if (this.chatbotSend) {
      this.chatbotSend.addEventListener("click", () => this.sendMessage());
    }
    if (this.chatbotInput) {
      this.chatbotInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendMessage();
      });

      // Input validation
      this.chatbotInput.addEventListener("input", () => {
        if (this.chatbotSend) {
          this.chatbotSend.disabled = this.chatbotInput.value.trim() === "";
        }
      });
    }

    // Suggestion buttons
    this.suggestions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const suggestion = btn.getAttribute("data-suggestion");
        if (this.chatbotInput) {
          this.chatbotInput.value = suggestion;
          this.sendMessage();
        }
      });
    });

    // Voice event listeners
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener("click", () =>
        this.toggleVoiceRecognition()
      );
    }

    if (this.voiceHelpBtn) {
      this.voiceHelpBtn.addEventListener("click", () => this.toggleVoiceHelp());
    }

    // Keyboard shortcut for voice (Ctrl + Shift + V)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V" && this.isOpen) {
        e.preventDefault();
        this.toggleVoiceRecognition();
      }
    });
  }

  getPOSContext() {
    // Get current POS data to provide context to the AI
    const context = {
      currentPage: "Dashboard",
      userRole: "Owner",
      businessType: "Frozen Food Store",
      businessName: "Bintang Jaya",
      availableFeatures: [
        "Product Management",
        "Inventory Tracking",
        "Sales Analytics",
        "Staff Management",
        "Transaction History",
        "Voice Commands",
      ],
    };

    // Try to get real data if available
    try {
      const products = this.getProductData();
      const sales = this.getSalesData();
      context.products = products;
      context.sales = sales;
    } catch (error) {
      console.log("Could not fetch real-time data:", error);
    }

    return context;
  }

  getProductData() {
    // Try to get product data from the current page
    const productRows = document.querySelectorAll("#product-list tr");
    const products = [];

    productRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 6) {
        products.push({
          id: cells[0]?.textContent?.trim(),
          name: cells[1]?.textContent?.trim(),
          stock: cells[3]?.textContent?.trim(),
          price: cells[4]?.textContent?.trim(),
          supplier: cells[5]?.textContent?.trim(),
        });
      }
    });

    return products;
  }

  getSalesData() {
    // Try to get sales data from dashboard cards
    const statCards = document.querySelectorAll(".stat-card");
    const sales = {};

    statCards.forEach((card) => {
      const title = card.querySelector(".card-title")?.textContent?.trim();
      const value = card.querySelector(".stat-value")?.textContent?.trim();
      if (title && value) {
        sales[title] = value;
      }
    });

    return sales;
  }

  toggleChatbot() {
    if (this.isOpen) {
      this.closeChatbot();
    } else {
      this.openChatbot();
    }
  }

  openChatbot() {
    if (this.chatbotContainer) {
      this.chatbotContainer.classList.add("active");
      this.chatbotContainer.classList.remove("minimized");
    }
    if (this.chatbotToggle) {
      this.chatbotToggle.style.display = "none";
    }
    this.isOpen = true;
    this.isMinimized = false;

    // Focus input
    setTimeout(() => {
      if (this.chatbotInput) {
        this.chatbotInput.focus();
      }
    }, 300);
  }

  closeChatbot() {
    if (this.chatbotContainer) {
      this.chatbotContainer.classList.remove("active");
    }
    if (this.chatbotToggle) {
      this.chatbotToggle.style.display = "flex";
    }
    this.isOpen = false;
    this.isMinimized = false;
  }

  minimizeChatbot() {
    if (this.chatbotContainer) {
      this.chatbotContainer.classList.toggle("minimized");
    }
    this.isMinimized = !this.isMinimized;
  }

  toggleVoiceRecognition() {
    if (!this.voiceEnabled) {
      this.addMessage(
        "Voice recognition is not supported in your browser.",
        "bot"
      );
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition) return;

    try {
      this.recognition.start();
      this.updateVoiceStatus("Click to stop listening");
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      this.updateVoiceStatus("Error starting voice recognition");
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    if (this.voiceBtn) {
      this.voiceBtn.classList.remove("recording", "processing");
    }
    this.updateVoiceStatus("");

    setTimeout(() => {
      if (this.voiceTranscript) {
        this.voiceTranscript.classList.remove("show");
      }
    }, 2000);
  }

  processVoiceCommand(transcript) {
    if (this.voiceBtn) {
      this.voiceBtn.classList.remove("recording");
      this.voiceBtn.classList.add("processing");
    }
    this.updateVoiceStatus("Processing...");

    // Process the voice command
    const processedCommand = this.interpretVoiceCommand(transcript);

    if (processedCommand.action === "direct") {
      // Execute direct action
      this.executeDirectCommand(processedCommand.command);
    } else {
      // Send to chatbot
      if (this.chatbotInput) {
        this.chatbotInput.value = processedCommand.message;
        this.sendMessage();
      }
    }

    setTimeout(() => {
      if (this.voiceBtn) {
        this.voiceBtn.classList.remove("processing");
      }
      this.updateVoiceStatus("");
    }, 1000);
  }

  interpretVoiceCommand(transcript) {
    const lowerTranscript = transcript.toLowerCase();

    // Define voice command patterns
    const commands = {
      // Direct actions
      "add product": { action: "direct", command: "add_product" },
      "add new product": { action: "direct", command: "add_product" },
      "open add product": { action: "direct", command: "add_product" },

      "show sales": {
        action: "chat",
        message: "Show me today's sales summary",
      },
      "sales today": { action: "chat", message: "What are today's sales?" },
      "today sales": { action: "chat", message: "Show today's sales" },

      "low stock": {
        action: "chat",
        message: "Which products are running low on stock?",
      },
      "check stock": {
        action: "chat",
        message: "Show me current stock levels",
      },

      help: {
        action: "chat",
        message: "Show me available voice commands and features",
      },
      "what can you do": {
        action: "chat",
        message: "What can you help me with?",
      },

      "calculate profit": {
        action: "chat",
        message: "Calculate today's profit and losses",
      },
      "profit loss": {
        action: "chat",
        message: "Show profit and loss summary",
      },
    };

    // Check for exact matches first
    for (const [command, action] of Object.entries(commands)) {
      if (lowerTranscript.includes(command)) {
        return action;
      }
    }

    // Check for product-specific commands
    if (
      lowerTranscript.includes("stock for") ||
      lowerTranscript.includes("check stock for")
    ) {
      const productMatch = lowerTranscript.match(
        /(?:stock for|check stock for)\s+(.+)/
      );
      if (productMatch) {
        return {
          action: "chat",
          message: `Check stock level for ${productMatch[1]}`,
        };
      }
    }

    // Default: send as regular message
    return {
      action: "chat",
      message: transcript,
    };
  }

  executeDirectCommand(command) {
    switch (command) {
      case "add_product":
        // Trigger add product modal if it exists
        const addProductBtn = document.querySelector(
          '[onclick*="showAddModal"], #add-product-btn, .add-product-btn'
        );
        if (addProductBtn) {
          addProductBtn.click();
          this.addMessage("Opening add product form...", "bot");
          this.speakResponse("Opening add product form");
        } else {
          this.addMessage("Add product feature not found on this page.", "bot");
        }
        break;

      default:
        this.addMessage("Command not recognized.", "bot");
    }
  }

  toggleVoiceHelp() {
    if (this.voiceCommandsHelp) {
      this.voiceCommandsHelp.classList.toggle("show");
    }
  }

  updateVoiceStatus(message) {
    if (this.voiceStatus) {
      this.voiceStatus.textContent = message;
    }
  }

  // Text-to-speech for bot responses
  speakResponse(text, options = {}) {
    if (!this.speechSynthesis) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || "en-US";
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.7;

    // Try to use a female voice
    const voices = this.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (voice) =>
        voice.name.includes("Female") ||
        voice.name.includes("Samantha") ||
        voice.name.includes("Karen")
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    this.speechSynthesis.speak(utterance);
  }

  // Enhanced sendMessage with voice response option
  async sendMessage() {
    if (!this.chatbotInput) return;

    const message = this.chatbotInput.value.trim();
    if (!message) return;

    this.addMessage(message, "user");
    this.chatbotInput.value = "";
    if (this.chatbotSend) {
      this.chatbotSend.disabled = true;
    }

    this.showTyping();

    try {
      const response = await this.getAIResponse(message);
      this.hideTyping();
      this.addMessage(response, "bot");

      // Optional: Speak the response (you can make this toggleable)
      if (this.shouldSpeakResponse(response)) {
        this.speakResponse(this.extractSpeakableText(response));
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage(
        "Sorry, I encountered an error. Please try again.",
        "bot"
      );
      console.error("Chatbot error:", error);
    }

    this.saveChatHistory();
  }

  shouldSpeakResponse(response) {
    // Only speak short responses to avoid overwhelming
    return response.length < 200;
  }

  extractSpeakableText(response) {
    // Remove markdown and HTML, keep only essential text
    return response
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/\n/g, " ")
      .trim();
  }

  async getAIResponse(userMessage) {
    // Dynamic context based on current page and data
    const currentContext = this.buildDynamicContext();

    const systemPrompt = `You are an intelligent business assistant for ${this.posContext.businessName}, a ${this.posContext.businessType}.

CURRENT CONTEXT:
${currentContext}

YOUR PERSONALITY & APPROACH:
- Be conversational and helpful, not overly formal
- Think like a business advisor who understands both POS systems AND general business
- You can discuss topics beyond just POS features - business strategy, customer service, operations, etc.
- Always try to connect advice back to their frozen food business when relevant
- Be encouraging and supportive of their business growth

CAPABILITIES:
🏪 POS & Operations: Sales analysis, inventory management, staff coordination, customer insights
💼 Business Advice: Growth strategies, cost optimization, market trends, customer retention
🎯 Problem Solving: Troubleshooting, process improvements, efficiency tips
🗣️ Voice Commands: Quick actions and information retrieval
📊 Analytics: Performance insights, forecasting, business intelligence

RESPONSE STYLE:
- For quick questions: Be concise but friendly (under 150 characters for voice)
- For complex topics: Provide thoughtful, detailed responses
- Use Indonesian business terms naturally when appropriate (stok, omzet, keuntungan)
- Share practical insights that a frozen food business owner would find valuable
- Don't be afraid to ask follow-up questions to better help them

EXAMPLES OF BROADER THINKING:
- If asked about sales → Also consider customer trends, seasonal patterns, competition
- If asked about staff → Think about motivation, training, efficiency, customer service
- If asked about products → Consider profit margins, supplier relationships, customer preferences
- If asked about general business → Connect to their specific frozen food context

Remember: You're not just a POS system helper - you're a knowledgeable business partner who happens to know their POS system really well.

User Input: "${userMessage}"`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8, // More creative and flexible
        topK: 50,
        topP: 0.95,
        maxOutputTokens: 1200, // Allow longer responses
        candidateCount: 1,
      },
    };

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        let responseText = data.candidates[0].content.parts[0].text;

        // Post-process for better conversation flow
        responseText = this.enhanceResponse(responseText, userMessage);

        return responseText;
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (error) {
      console.error("AI Response error:", error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  // Build more comprehensive context
  buildDynamicContext() {
    let context = `Business: ${this.posContext.businessName} (${this.posContext.businessType})\n`;
    context += `Current Page: ${this.posContext.currentPage}\n`;
    context += `User Role: ${this.posContext.userRole}\n`;

    // Add business insights
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
    context += `Current Time: ${timeOfDay}, ${dayOfWeek}\n`;

    // Add real-time business data if available
    if (this.posContext.products && this.posContext.products.length > 0) {
      const totalProducts = this.posContext.products.length;
      const lowStock = this.posContext.products.filter(
        (p) => parseInt(p.stock || 0) < 10
      ).length;
      const outOfStock = this.posContext.products.filter(
        (p) => parseInt(p.stock || 0) === 0
      ).length;

      context += `\nINVENTORY STATUS:\n`;
      context += `- Total products: ${totalProducts}\n`;
      if (lowStock > 0) context += `- Low stock alerts: ${lowStock} products\n`;
      if (outOfStock > 0) context += `- Out of stock: ${outOfStock} products\n`;
    }

    // Add sales context if available
    if (
      this.posContext.sales &&
      Object.keys(this.posContext.sales).length > 0
    ) {
      context += `\nSALES DATA AVAILABLE:\n`;
      Object.entries(this.posContext.sales).forEach(([key, value]) => {
        context += `- ${key}: ${value}\n`;
      });
    }

    // Add business context based on time/day
    context += `\nBUSINESS CONTEXT:\n`;
    if (timeOfDay === "Morning") {
      context += `- Good time for inventory checks and staff briefings\n`;
    } else if (timeOfDay === "Afternoon") {
      context += `- Peak business hours for frozen food sales\n`;
    } else if (timeOfDay === "Evening") {
      context += `- Good time for daily sales review and planning\n`;
    }

    if (dayOfWeek === "Monday") {
      context += `- Start of business week, good for planning and goal setting\n`;
    } else if (["Saturday", "Sunday"].includes(dayOfWeek)) {
      context += `- Weekend sales typically higher for frozen food retail\n`;
    }

    return context;
  }

  // Enhance responses for better conversation flow
  enhanceResponse(response, originalMessage) {
    const messageType = this.detectMessageType(originalMessage);

    // Add conversation starters for certain types
    if (messageType === "greeting") {
      response +=
        "\n\nHow can I help you with your business today? I can assist with sales analysis, inventory management, or any other questions you might have!";
    }

    // Add follow-up suggestions for business advice
    if (
      response.length > 200 &&
      !response.includes("Would you like") &&
      !response.includes("Need help")
    ) {
      response +=
        "\n\nWould you like me to dive deeper into any of these points?";
    }

    // Make voice responses more natural
    if (originalMessage.length < 30 && response.length > 150) {
      // Likely a voice command, provide summary + offer details
      const summary = response.split("\n")[0] || response.substring(0, 120);
      response = summary + "... Want me to explain more?";
    }

    return response;
  }

  // Detect message type for appropriate response style
  detectMessageType(message) {
    const lowerMessage = message.toLowerCase();

    if (
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(message)
    ) {
      return "greeting";
    }

    if (lowerMessage.includes("how to") || lowerMessage.includes("how do i")) {
      return "tutorial";
    }

    if (
      lowerMessage.includes("what") ||
      lowerMessage.includes("why") ||
      lowerMessage.includes("when")
    ) {
      return "question";
    }

    if (/suggest|recommend|advice|should i|what do you think/i.test(message)) {
      return "advice_seeking";
    }

    if (lowerMessage.length < 20) {
      return "quick_query";
    }

    return "general";
  }

  // Get time of day for contextual responses
  getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour < 6) return "Early Morning";
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    if (hour < 21) return "Evening";
    return "Night";
  }

  // Enhanced fallback for when AI fails
  generateFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    const responses = {
      sales:
        "I'd love to help you analyze your sales data! You can find detailed sales information in your Reports section, or I can help you interpret what you're seeing there.",
      inventory:
        "For inventory management, I can help you understand stock levels, identify which products need restocking, and suggest optimization strategies for your frozen food business.",
      staff:
        "Staff management is crucial for business success! I can help with scheduling, performance tracking, or strategies to improve team efficiency and customer service.",
      customer:
        "Customer relationships are the heart of any business! I can help you analyze customer data, improve retention strategies, or enhance the customer experience.",
      business:
        "I'm here to help with all aspects of your frozen food business - from operations and growth strategies to daily management tasks. What specific area would you like to explore?",
      general:
        "I'm having a technical moment, but I'm still here to help! I can assist with POS operations, business advice, inventory management, or any questions about running your frozen food business efficiently.",
    };

    for (const [keyword, response] of Object.entries(responses)) {
      if (lowerMessage.includes(keyword)) {
        return response;
      }
    }

    return responses.general;
  }

  // Missing methods that were causing the error
  addMessage(content, sender) {
    if (!this.chatbotMessages) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const avatar = sender === "bot" ? "🤖" : "👤";

    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        ${this.formatMessage(content)}
      </div>
    `;

    this.chatbotMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Convert markdown-like formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");

    // Convert lists
    formatted = formatted.replace(/^- (.+)$/gm, "<li>$1</li>");
    if (formatted.includes("<li>")) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    }

    return formatted;
  }

  showTyping() {
    if (this.chatbotTyping) {
      this.chatbotTyping.style.display = "flex";
      this.scrollToBottom();
    }
  }

  hideTyping() {
    if (this.chatbotTyping) {
      this.chatbotTyping.style.display = "none";
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatbotMessages) {
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
      }
    }, 100);
  }

  saveChatHistory() {
    // Save basic chat state
    const history = {
      isOpen: this.isOpen,
      timestamp: Date.now(),
    };
    localStorage.setItem("pos_chatbot_history", JSON.stringify(history));
  }

  loadChatHistory() {
    // Load basic chat state
    try {
      const history = JSON.parse(
        localStorage.getItem("pos_chatbot_history") || "{}"
      );
      // You can restore previous conversation here if needed
    } catch (error) {
      console.log("Could not load chat history:", error);
    }
  }
}

// Initialize enhanced chatbot
document.addEventListener("DOMContentLoaded", function () {
  // Wait a bit to ensure all other scripts are loaded
  setTimeout(() => {
    window.posChatbot = new POSChatbot();
  }, 1000);
});
