import express from "express";

const app = express();
app.use(express.json());

// ===== ENV =====
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VERIFY_TOKEN = "123456";

// ===== DATA =====
const ACTIVE_USERS = {};
const USERS = {}; // lưu danh sách khách

// ===== VERIFY =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== API: XEM DANH SÁCH KHÁCH =====
app.get("/users", (req, res) => {
  res.json(USERS);
});

// ===== API: TẮT BOT =====
app.get("/off/:id", (req, res) => {
  const userId = req.params.id;

  ACTIVE_USERS[userId] = false;

  res.send("Đã tắt bot cho: " + userId);
});

// ===== API: BẬT BOT =====
app.get("/on/:id", (req, res) => {
  const userId = req.params.id;

  ACTIVE_USERS[userId] = true;

  res.send("Đã bật bot cho: " + userId);
});

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const webhookEvent of entry.messaging) {

        const senderId = webhookEvent.sender.id;

        if (webhookEvent.message) {
          const text = (webhookEvent.message.text || "").toLowerCase();

          console.log("User:", senderId, text);

          // ===== LƯU KHÁCH =====
          USERS[senderId] = {
            lastMessage: text,
            time: new Date()
          };

          // ===== CHECK BOT =====
          if (ACTIVE_USERS[senderId] === false) {
            return res.status(200).send("BOT OFF");
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


// ===== LOGIC =====
async function handleMessage(senderId, text) {

  if (text.includes("còn")) {
    return "Dạ áo này bên mình vẫn còn nha 😄\nBạn cao bao nhiêu, nặng bao nhiêu để mình tư vấn size chuẩn cho bạn luôn ạ?";
  }

  if (text.match(/\d{2,3}kg/) || text.match(/1m\d{1,2}/)) {
    return "Dạ mình đã nhận được thông tin của bạn rồi ạ 😄\nMình check size chuẩn cho bạn trong giây lát nha!";
  }

  if (text.includes("giá")) {
    return "Dạ bên mình đang tư vấn theo form nên mình hỗ trợ bạn kỹ hơn nha 😄\nBạn cho mình xin chiều cao cân nặng nhé!";
  }

  if (text.includes("mua") || text.includes("chốt")) {
    ACTIVE_USERS[senderId] = false;

    return `Dạ mình lên đơn cho bạn nha 😄  
Bạn gửi giúp mình:

- Tên người nhận  
- SĐT  
- Địa chỉ  

Phí ship:
- Nội thành: 20k  
- Tỉnh: 30k

Nhân viên sẽ hỗ trợ bạn tiếp nha 👨‍💼`;
  }

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
            content: "Bạn là nhân viên bán quần áo, trả lời ngắn gọn, thân thiện, không báo giá."
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
app.listen(PORT, () => console.log("Server running"));
