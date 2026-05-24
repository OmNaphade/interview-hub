const config = require("../config");

function ollamaUrl(path) {
  const baseUrl = config.ollama.baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${baseUrl}/api${path}`;
}

function ollamaHeaders() {
  const headers = { "Content-Type": "application/json" };

  if (config.ollama.apiKey) {
    headers.Authorization = `Bearer ${config.ollama.apiKey}`;
  }

  return headers;
}

// Stream chat response via SSE
async function streamChat(res, messages, systemPrompt = "", model = null) {
  const chatModel = model || config.ollama.chatModel;

  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(ollamaUrl("/chat"), {
      method: "POST",
      headers: ollamaHeaders(),
      body: JSON.stringify({
        model: chatModel,
        messages: allMessages,
        stream: true,
        options: {
          temperature: 0.4,
          num_predict: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}${
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
        try {
          const data = JSON.parse(line);
          if (data.message && data.message.content) {
            res.write(
              `data: ${JSON.stringify({ token: data.message.content })}\n\n`
            );
          }
        } catch (e) {
          // Ignore parse errors for incomplete lines
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (error) {
    console.error("❌ Stream chat error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
}

// Get embedding vector for text
async function getEmbedding(text) {
  try {
    const response = await fetch(ollamaUrl("/embed"), {
      method: "POST",
      headers: ollamaHeaders(),
      body: JSON.stringify({
        model: config.ollama.embedModel,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama embed error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    const data = await response.json();
    return data.embeddings?.[0] || data.embedding;
  } catch (error) {
    console.error("❌ Embedding error:", error);
    throw error;
  }
}

// Non-streaming chat for hints/reviews
async function chat(messages, systemPrompt = "", model = null) {
  const chatModel = model || config.ollama.chatModel;

  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(ollamaUrl("/chat"), {
      method: "POST",
      headers: ollamaHeaders(),
      body: JSON.stringify({
        model: chatModel,
        messages: allMessages,
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error("❌ Chat error:", error);
    throw error;
  }
}

// Ping Ollama to check if it's running
async function ping() {
  try {
    const response = await fetch(ollamaUrl("/tags"), {
      headers: config.ollama.apiKey
        ? { Authorization: `Bearer ${config.ollama.apiKey}` }
        : undefined,
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

module.exports = { streamChat, getEmbedding, chat, ping, ollamaHeaders, ollamaUrl };
