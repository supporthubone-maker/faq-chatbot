const CONFIG = {
  // Dán URL Web App của Google Apps Script tại đây khi đã có.
  // Ví dụ: "https://script.google.com/macros/s/XXXXX/exec"
  googleAppsScriptUrl: "",
  minMatchScore: 0.34
};

const messagesEl = document.getElementById("messages");
const suggestionsEl = document.getElementById("suggestions");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");

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
  return new Set(normalizeText(value).split(" ").filter(word => word.length > 1));
}

function calculateScore(question, faq) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = tokenize(question);
  const searchableText = [faq.question, ...(faq.keywords || [])].join(" ");
  const faqTokens = tokenize(searchableText);

  let overlap = 0;
  questionTokens.forEach(token => {
    if (faqTokens.has(token)) overlap += 1;
  });

  const tokenScore = overlap / Math.max(questionTokens.size, 1);
  const phraseBonus = (faq.keywords || []).some(keyword =>
    normalizedQuestion.includes(normalizeText(keyword))
  ) ? 0.55 : 0;

  return Math.min(tokenScore + phraseBonus, 1);
}

function findBestAnswer(question) {
  const ranked = window.FAQ_DATA
    .map(faq => ({ faq, score: calculateScore(question, faq) }))
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
  window.FAQ_DATA.slice(0, 4).forEach(faq => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-chip";
    button.textContent = faq.question;
    button.addEventListener("click", () => handleQuestion(faq.question));
    suggestionsEl.appendChild(button);
  });
}

async function saveUnansweredQuestion(question) {
  if (!CONFIG.googleAppsScriptUrl) {
    const localQuestions = JSON.parse(localStorage.getItem("unansweredQuestions") || "[]");
    localQuestions.push({ question, createdAt: new Date().toISOString() });
    localStorage.setItem("unansweredQuestions", JSON.stringify(localQuestions));
    return;
  }

  try {
    await fetch(CONFIG.googleAppsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveUnansweredQuestion",
        question,
        pageUrl: window.location.href,
        createdAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error("Không thể ghi nhận câu hỏi:", error);
  }
}

async function handleQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question) return;

  addMessage(question, "user");
  questionInput.value = "";
  questionInput.disabled = true;

  const result = findBestAnswer(question);
  await new Promise(resolve => setTimeout(resolve, 300));

  if (result && result.score >= CONFIG.minMatchScore) {
    addMessage(result.faq.answer, "bot");
  } else {
    addMessage(
      "Hiện tại mình chưa tìm thấy câu trả lời phù hợp. Câu hỏi của bạn đã được ghi nhận để bộ phận phụ trách bổ sung dữ liệu FAQ.",
      "bot"
    );
    await saveUnansweredQuestion(question);
  }

  questionInput.disabled = false;
  questionInput.focus();
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  handleQuestion(questionInput.value);
});

addMessage("Xin chào! Bạn cần hỗ trợ thông tin gì?", "bot");
renderSuggestions();
