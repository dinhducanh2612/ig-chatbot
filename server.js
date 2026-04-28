const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// webhook verify
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "123456";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// nhận tin nhắn
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry;
    const message = entry?.[0]?.messaging?.[0];

    if (!message || !message.message) return res.sendStatus(200);

    const senderId = message.sender.id;
    const text = message.message.text;

    // gọi AI
    const aiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "Bạn là nhân viên bán áo secondhand. Nói chuyện tự nhiên, thân thiện, luôn hỏi size và cố gắng chốt đơn.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const reply = aiRes.data.choices[0].message.content;

    // gửi lại IG
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: senderId },
        message: { text: reply },
      },
      {
        params: {
          access_token: process.env.PAGE_ACCESS_TOKEN,
        },
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("Server chạy rồi 🚀"));