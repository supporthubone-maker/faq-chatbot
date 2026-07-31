# FAQ Chatbot - Vercel

Project HTML/CSS/JavaScript thuần, có thể deploy trực tiếp lên Vercel.

## Chỉnh dữ liệu FAQ

Mở file `faq-data.js`, thêm hoặc sửa câu hỏi, từ khóa và câu trả lời.

## Ghi câu hỏi chưa có đáp án

Mặc định câu hỏi được lưu tạm trong Local Storage của trình duyệt.

Để gửi câu hỏi về Google Sheet, tạo Google Apps Script Web App rồi dán URL vào:

```js
const CONFIG = {
  googleAppsScriptUrl: "DAN_URL_WEB_APP_TAI_DAY",
  minMatchScore: 0.34
};
```

## Deploy

1. Đưa toàn bộ file trong thư mục này lên thư mục gốc của GitHub repository.
2. Vào Vercel > Add New > Project.
3. Import repository.
4. Framework Preset: Other.
5. Root Directory: `./`.
6. Build Command và Output Directory: để mặc định/trống.
7. Chọn Deploy.
