import express from "express";

const app = express();
app.use(express.json());

// ===== ENV =====
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VERIFY_TOKEN = "123456";

// ===== LƯU TRẠNG THÁI BOT =====
const ACTIVE_USERS = {}; // true = bot trả lời, false = bot tắt

// ===== VERIFY =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const webhookEvent of entry.messaging) {

        const senderId = webhookEvent.sender.id;

        if (webhookEvent.message) {
          let text = (webhookEvent.message.text || "").toLowerCase();

          console.log("User:", text);

          // ===== BẬT / TẮT BOT =====

          if (text === "#off") {
            ACTIVE_USERS[senderId] = false;
            await sendMessage(senderId, "Dạ đã chuyển sang nhân viên hỗ trợ bạn nha 👨‍💼");
            return;
          }

          if (text === "#on") {
            ACTIVE_USERS[senderId] = true;
            await sendMessage(senderId, "Bot đã hoạt động lại 🤖");
            return;
          }

          // nếu bot đang tắt → không trả lời
          if (ACTIVE_USERS[senderId] === false) {
            return;
          }

          const reply = await handleMessage(senderId, text);

          await sendMessage(senderId, reply);
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.sendStatus(404);
});


// ===== LOGIC CHÍNH =====
async function handleMessage(senderId, text) {

  // 1. hỏi còn hàng
  if (text.includes("còn") || text.includes("hết")) {
    return "Dạ áo này bên mình vẫn còn nha 😄\nBạn cao bao nhiêu, nặng bao nhiêu để mình tư vấn size chuẩn cho bạn luôn ạ?";
  }

  // 2. khách gửi chiều cao cân nặng
  if (text.match(/\d{2,3}kg/) || text.match(/1m\d{1,2}/)) {
    return "Dạ mình đã nhận được thông tin của bạn rồi ạ 😄\nMình check size chuẩn cho bạn trong giây lát nha!";
  }

  // 3. hỏi giá (KHÔNG TRẢ GIÁ)
  if (text.includes("giá") || text.includes("bao nhiêu")) {
    return "Dạ bên mình đang tư vấn theo form và nhu cầu nên mình báo chi tiết cho bạn nha 😄\nBạn cao bao nhiêu, nặng bao nhiêu để mình tư vấn chuẩn cho bạn luôn ạ?";
  }

  // 4. chốt đơn → TẮT BOT
  if (text.includes("mua") || text.includes("chốt") || text.includes("lấy")) {

    ACTIVE_USERS[senderId] = false; // 🔥 tắt bot luôn

    return `Dạ mình lên đơn cho bạn nha 😄  
Bạn gửi giúp mình:

- Tên người nhận  
- SĐT  
- Địa chỉ  

Phí ship:
- Nội thành: 20k  
- Tỉnh: 30k (cọc trước)

Nhân viên sẽ hỗ trợ bạn tiếp nha 👨‍💼`;
  }

  // ===== AI fallback =====
  return await getAIResponse(text);
}


// ===== AI =====
async function getAIResponse(userText) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
Bạn là nhân viên bán quần áo.

Quy tắc:
- KHÔNG báo giá
- Trả lời tự nhiên như người thật
- Luôn dẫn khách về hỏi chiều cao cân nặng
- Mục tiêu là giữ khách

Phong cách:
- Ngắn gọn
- Thân thiện
- Có emoji nhẹ 😄
`
          },
          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const data = await res.json();

    return data.choices?.[0]?.message?.content || "Bạn nói rõ hơn giúp mình nha 😄";

  } catch (err) {
    console.error(err);
    return "Shop đang bận, bạn đợi xíu nha 😄";
  }
}


// ===== SEND =====
async function sendMessage(senderId, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text }
    })
  });
}


// ===== RUN =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
