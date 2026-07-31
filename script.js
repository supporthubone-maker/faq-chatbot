console.log("HuBI version 2026-07-31-02");

const CONFIG = {
  botName: "HuBI",

  // URL Web App của Google Apps Script, phải kết thúc bằng /exec
  googleAppsScriptUrl:
    "https://script.google.com/macros/s/AKfycbz3UPWdeYXjLZ0mkMbZNHDwPfNonsDmvXqPaM6vEhqUJCfMignD0pXjTt71qWyZtHUy/exec",

  // Điểm khớp tối thiểu để HuBI trả lời từ dữ liệu FAQ
  minMatchScore: 0.34
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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(word => word.length > 1)
  );
}

function calculateScore(question, faq) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = tokenize(question);
  const searchableText = [faq.question, ...(faq.keywords || [])].join(" ");
  const faqTokens = tokenize(searchableText);

  let overlap = 0;

  questionTokens.forEach(token => {
    if (faqTokens.has(token)) {
      overlap += 1;
    }
  });

  const tokenScore =
    overlap / Math.max(questionTokens.size, 1);

  const phraseBonus = (faq.keywords || []).some(keyword =>
    normalizedQuestion.includes(normalizeText(keyword))
  )
    ? 0.55
    : 0;

  return Math.min(tokenScore + phraseBonus, 1);
}

function findBestAnswer(question) {
  const faqData = Array.isArray(window.FAQ_DATA)
    ? window.FAQ_DATA
    : [];

  const ranked = faqData
    .map(faq => ({
      faq,
      score: calculateScore(question, faq)
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}

function addMessage(text, sender = "bot") {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSuggestions() {
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

function saveQuestionLocally(payload) {
  try {
    const localQuestions = JSON.parse(
      localStorage.getItem("unansweredQuestions") || "[]"
    );

    localQuestions.push(payload);

    localStorage.setItem(
      "unansweredQuestions",
      JSON.stringify(localQuestions)
    );
  } catch (error) {
    console.error(
      "Không thể lưu câu hỏi trên trình duyệt:",
      error
    );
  }
}

async function saveUnansweredQuestion(question) {
  const payload = {
    action: "saveUnansweredQuestion",
    question,
    botName: CONFIG.botName,
    pageUrl: window.location.href,
    createdAt: new Date().toISOString()
  };

  if (!CONFIG.googleAppsScriptUrl) {
    console.warn(
      "Chưa cấu hình Google Apps Script URL. Câu hỏi được lưu tạm trên trình duyệt."
    );

    saveQuestionLocally(payload);

    return {
      success: false,
      savedLocally: true
    };
  }

  try {
    console.log(
      "Đang gửi câu hỏi lên Google Apps Script:",
      question
    );

    await fetch(CONFIG.googleAppsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    /*
      Với mode: "no-cors", trình duyệt không cho đọc
      response.json(), response.status hoặc response.ok.
      Tuy nhiên yêu cầu POST vẫn được gửi đến Apps Script.
    */

    console.log(
      "Đã gửi yêu cầu ghi nhận câu hỏi lên Google Apps Script."
    );

    return {
      success: true
    };
  } catch (error) {
    console.error(
      "Không thể ghi nhận câu hỏi:",
      error
    );

    saveQuestionLocally(payload);

    return {
      success: false,
      savedLocally: true,
      message: error.message
    };
  }
}

async function handleQuestion(rawQuestion) {
  const question = String(rawQuestion || "").trim();

  if (!question) {
    return;
  }

  addMessage(question, "user");

  questionInput.value = "";
  questionInput.disabled = true;

  const result = findBestAnswer(question);

  await new Promise(resolve => {
    setTimeout(resolve, 300);
  });

  if (
    result &&
    result.score >= CONFIG.minMatchScore
  ) {
    addMessage(result.faq.answer, "bot");
  } else {
    const saveResult =
      await saveUnansweredQuestion(question);

    if (saveResult.success) {
      addMessage(
        `${CONFIG.botName} chưa tìm thấy câu trả lời phù hợp. Câu hỏi của bạn đã được ghi nhận để bộ phận phụ trách bổ sung dữ liệu FAQ.`,
        "bot"
      );
    } else if (saveResult.savedLocally) {
      addMessage(
        `${CONFIG.botName} chưa tìm thấy câu trả lời phù hợp. Câu hỏi đang được lưu tạm trên trình duyệt và sẽ cần được gửi lại khi kết nối hoạt động.`,
        "bot"
      );
    } else {
      addMessage(
        `${CONFIG.botName} chưa tìm thấy câu trả lời phù hợp và hiện chưa thể ghi nhận câu hỏi. Bạn vui lòng thử lại sau.`,
        "bot"
      );
    }
  }

  questionInput.disabled = false;
  questionInput.focus();
}

if (chatForm) {
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
