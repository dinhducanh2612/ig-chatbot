import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// ===== ENV =====
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VERIFY_TOKEN = "123456";

// ===== VERIFY WEBHOOK =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// ===== NHẬN TIN NHẮN =====
app.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("🔥 Webhook event:", JSON.stringify(body, null, 2));

  if (body.object === "page") {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message) {
        const text = webhookEvent.message.text || "";

        console.log("👉 User hỏi:", text);

        const reply = await getAIResponse(text);

        console.log("👉 Bot trả:", reply);

        await sendMessage(senderId, reply);
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  } else {
    return res.sendStatus(404);
  }
});

// ===== AI (GROQ FREE) =====
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
            content: "Bạn là chatbot bán hàng, trả lời ngắn gọn, thân thiện, tiếng Việt."
          },
          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const data = await res.json();

    console.log("🤖 Groq raw:", JSON.stringify(data));

    return data.choices?.[0]?.message?.content || "Mình chưa hiểu 😢";

  } catch (err) {
    console.error("❌ Lỗi AI:", err);
    return "AI đang lỗi 😢";
  }
}

// ===== GỬI TIN NHẮN =====
async function sendMessage(senderId, text) {
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text }
        })
      }
    );
  } catch (err) {
    console.error("❌ Lỗi gửi message:", err);
  }
}

// ===== RUN SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
