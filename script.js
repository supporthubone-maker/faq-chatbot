console.log("HuBI version 2026-07-31-04");

const CONFIG = {
  botName: "HuBI"
};

const messagesEl = document.getElementById("messages");
const suggestionsEl = document.getElementById("suggestions");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");
const botDisplayName = document.getElementById("botDisplayName");

if (botDisplayName) {
  botDisplayName.textContent = CONFIG.botName;
}

document.title = `${CONFIG.botName} | Trợ lý hỗ trợ`;

function addMessage(text, sender = "bot") {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = String(text || "");

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSuggestions() {
  if (!suggestionsEl) return;

  suggestionsEl.innerHTML = "";

  const faqData = Array.isArray(window.FAQ_DATA)
    ? window.FAQ_DATA
    : [];

  faqData.slice(0, 4).forEach(faq => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "suggestion-chip";
    button.textContent = faq.question;
    button.title = faq.question;

    button.addEventListener("click", () => {
      handleQuestion(faq.question);
    });

    suggestionsEl.appendChild(button);
  });
}

async function searchFAQFromGoogleSheet(question) {
  const response = await fetch("/api/search-faq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question
    })
  });

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error(
      "API không trả về dữ liệu JSON hợp lệ."
    );
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
      "Không thể tìm dữ liệu FAQ."
    );
  }

  return result;
}

async function handleQuestion(rawQuestion) {
  const question = String(rawQuestion || "").trim();

  if (!question) return;

  addMessage(question, "user");

  questionInput.value = "";
  questionInput.disabled = true;

  try {
    const result =
      await searchFAQFromGoogleSheet(question);

    console.log("Kết quả từ Google Sheet:", result);

    if (
      result.success &&
      result.found &&
      result.answer
    ) {
      addMessage(result.answer, "bot");
    } else {
      addMessage(
        result.message ||
        `${CONFIG.botName} chưa tìm thấy câu trả lời phù hợp. Câu hỏi của bạn đã được ghi nhận để bộ phận phụ trách bổ sung dữ liệu FAQ.`,
        "bot"
      );
    }
  } catch (error) {
    console.error(
      "Không thể tra cứu FAQ:",
      error
    );

    addMessage(
      `${CONFIG.botName} đang gặp lỗi kết nối dữ liệu. Bạn vui lòng thử lại sau.`,
      "bot"
    );
  } finally {
    questionInput.disabled = false;
    questionInput.focus();
  }
}

if (chatForm && questionInput) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();
    handleQuestion(questionInput.value);
  });
}

addMessage(
  `Xin chào! Mình là ${CONFIG.botName}, trợ lý hỗ trợ thông tin. Bạn cần mình hỗ trợ nội dung gì?`,
  "bot"
);

renderSuggestions();
