import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ===== CONFIG =====
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "verify_token";

// ===== WEBHOOK VERIFY =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== MAIN WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("🔥 EVENT:", JSON.stringify(body, null, 2));

  if (body.object === "page") {
    for (const entry of body.entry) {
      const events = entry.messaging || entry.changes || [];

      for (const event of events) {
        const senderId = event.sender?.id;

        // ===== IG message format =====
        const message = event.message || event.value?.messages?.[0];

        if (senderId && message?.text) {
          const text = message.text.toLowerCase();

          console.log("👉 User:", text);

          const reply = handleLogic(text);

          await sendMessage(senderId, reply);
        }
      }
    }
  }

  res.sendStatus(200);
});

// ===== LOGIC CHATBOT =====
function handleLogic(text) {
  // 1. hỏi còn áo không
  if (
    text.includes("còn") ||
    text.includes("còn áo") ||
    text.includes("còn không")
  ) {
    return "Dạ áo này bên mình vẫn còn nha 😄\nBạn cao bao nhiêu, nặng bao nhiêu để mình tư vấn size chuẩn cho bạn luôn ạ?";
  }

  // 2. khách gửi chiều cao cân nặng
  if (text.match(/\d{2,3}.*\d{2,3}/)) {
    return "Mình đã nhận được thông tin số đo của bạn, bạn chờ mình xíu để mình tư vấn kỹ hơn cho bạn nha ạ 🙆‍♂️";
  }

  // 3. chốt đơn
  if (
    text.includes("chốt") ||
    text.includes("lấy") ||
    text.includes("mua")
  ) {
    return `Dạ mình lên đơn cho bạn nha 😄  

Bạn gửi giúp mình:

- Tên người nhận  
- SĐT  
- Địa chỉ  

(Đối với đơn hàng tỉnh shop sẽ thu cọc ship là 30k, trong thành phố thì sẽ là 20k)
Để shop giao hàng cho bạn nha 🚚`;
  }

  // mặc định
  return "Xin chào! Bạn cần tư vấn mẫu áo nào ạ? 😄";
}

// ===== SEND MESSAGE =====
async function sendMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
      }
    );
  } catch (error) {
    console.error("❌ Send error:", error.response?.data || error.message);
  }
}

// ===== START SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
