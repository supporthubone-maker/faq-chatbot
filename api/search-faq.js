export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const question = String(
      request.body?.question || ""
    ).trim();

    if (!question) {
      return response.status(400).json({
        success: false,
        message: "Câu hỏi đang trống."
      });
    }

    const appsScriptUrl =
  "https://script.google.com/macros/s/AKfycbz3UPWdeYXjLZ0mkMbZNHDwPfNonsDmvXqPaM6vEhqUJCfMignD0pXjTt71qWyZtHUy/exec";

    const appsScriptResponse = await fetch(
      appsScriptUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: JSON.stringify({
          action: "searchFAQ",
          question,
          source: "HuBI Vercel",
          createdAt: new Date().toISOString()
        }),
        redirect: "follow"
      }
    );

    if (!appsScriptResponse.ok) {
      throw new Error(
        `Apps Script trả lỗi HTTP ${appsScriptResponse.status}`
      );
    }

    const text = await appsScriptResponse.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        "Apps Script không trả về dữ liệu JSON hợp lệ."
      );
    }

    return response.status(200).json(result);

  } catch (error) {
    console.error("search-faq error:", error);

    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể tìm dữ liệu FAQ."
    });
  }
}
