import express from "express";

const app = express();
app.use(express.json());

// ====== ENV ======
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VERIFY_TOKEN = "123456";

// ====== VERIFY WEBHOOK ======
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

// ====== RECEIVE MESSAGE ======
app.post("/webhook", async (req, res) => {
  console.log("🔥 Webhook event:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const webhookEvent of entry.messaging) {

        const senderId = webhookEvent.sender.id;

        if (webhookEvent.message) {
          let text = webhookEvent.message.text;

          // Nếu gửi icon/sticker
          if (!text) {
            await sendMessage(senderId, "Bạn vừa gửi icon 😄");
            continue;
          }

          try {
            const reply = await getAIResponse(text);
            await sendMessage(senderId, reply);
          } catch (err) {
            console.error("❌ AI error:", err);
            await sendMessage(senderId, "Bot đang bận, thử lại sau nha!");
          }
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  } else {
    return res.sendStatus(404);
  }
});

// ====== OPENAI ======
async function getAIResponse(userText) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là nhân viên bán hàng thân thiện, trả lời ngắn gọn, dễ hiểu, mục tiêu chốt đơn."
        },
        {
          role: "user",
          content: userText
        }
      ]
    })
  });

  const data = await res.json();

  return data.choices?.[0]?.message?.content || "Xin lỗi mình chưa hiểu 😢";
}

// ====== SEND MESSAGE ======
async function sendMessage(senderId, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text }
    })
  });
}

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
