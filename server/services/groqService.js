const config = require("../config");
const { recordGroqCall } = require("./monitoringService");

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function groqHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.groq.apiKey}`,
  };
}

// Stream chat response via SSE using GROQ
async function streamChat(res, messages, systemPrompt = "", model = null) {
  const startedAt = Date.now();
  const chatModel = model || config.groq.chatModel;

  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: chatModel,
        messages: allMessages,
        stream: true,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GROQ API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line === "data: [DONE]") continue;
        if (!line.startsWith("data: ")) continue;

        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            res.write(
              `data: ${JSON.stringify({ token: content })}\n\n`
            );
          }
        } catch (e) {
          // Ignore parse errors for incomplete lines
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    recordGroqCall({ operation: "streamChat", durationMs: Date.now() - startedAt, success: true });
  } catch (error) {
    console.error("❌ GROQ stream chat error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    recordGroqCall({ operation: "streamChat", durationMs: Date.now() - startedAt, success: false });
  } finally {
    res.end();
  }
}

// Non-streaming chat for hints/reviews using GROQ
async function chat(messages, systemPrompt = "", model = null) {
  const startedAt = Date.now();
  const chatModel = model || config.groq.chatModel;

  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: chatModel,
        messages: allMessages,
        stream: false,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GROQ API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    const data = await response.json();
    recordGroqCall({ operation: "chat", durationMs: Date.now() - startedAt, success: true });
    return data.choices[0].message.content;
  } catch (error) {
    console.error("❌ GROQ chat error:", error);
    recordGroqCall({ operation: "chat", durationMs: Date.now() - startedAt, success: false });
    throw error;
  }
}

// Ping GROQ to check if the API is reachable
async function ping() {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: groqHeaders(),
    });
    recordGroqCall({ operation: "ping", durationMs: Date.now() - startedAt, success: response.ok });
    return response.ok;
  } catch (error) {
    recordGroqCall({ operation: "ping", durationMs: Date.now() - startedAt, success: false });
    return false;
  }
}

module.exports = { streamChat, chat, ping };
