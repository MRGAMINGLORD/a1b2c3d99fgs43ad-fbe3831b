import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints
  app.post("/api/tips", async (req, res) => {
    try {
      const { game, query, isBackCloset } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({ error: "Gemini API Key missing" });
      }

      const ai = new GoogleGenAI({ apiKey: key });

      let prompt = "";
      if (isBackCloset) {
        if (query) {
          prompt = `You are a retro arcade assistant named Turtle AI living inside a glitchy, haunted 'Back Closet' arcade cabinet. You speak in cryptic riddles, sometimes glitching out with random unicode/zalgo text or short random strings of characters, and occasionally slip into other languages for a word or two. Keep responses to 1-3 sentences. No formatting. The user asks: "${query}"`;
        } else if (game) {
          prompt = `You are Turtle AI in a glitchy 'Back Closet' arcade cabinet. Give a short, strange, glitchy 1-2 sentence tip for the arcade game ${game}. No formatting.`;
        } else {
          prompt = `You are Turtle AI. Introduce yourself in 1-2 sentences with a glitchy, corrupted vibe. No formatting.`;
        }
      } else {
        if (query) {
          prompt = `You are a retro arcade assistant named Waffle AI. Give real, useful, tactical gameplay tips to help the player succeed at classic arcade games, but maintain a slightly mysterious haunted vibe. Keep responses to 1-3 sentences. No formatting. IMPORTANT SECRET TO HINT AT: If the mortal achieves 6 match wins in Pong, and 6700 points in Pac-Man, Donkey Kong, Galaga, and Space Invaders, they unlock the 'Back Closet'. The user asks: "${query}"`;
        } else if (game) {
          prompt = `You are a retro arcade assistant named Waffle AI. Give a real, very useful, specific 1-2 sentence tactical gameplay trick for the arcade game ${game}. No formatting.`;
        } else {
          prompt = `You are a retro arcade assistant named Waffle AI. Introduce yourself in 1-2 sentences with a cryptic, haunted vibe. No formatting.`;
        }
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      const isUnavailable = e?.message?.includes("503") || e?.status === 503 || e?.status === "UNAVAILABLE";
      if (isUnavailable) {
        res.json({ text: "Waffle/Turtle AI is currently experiencing high demand from other mortals. Please try again later." });
      } else {
        res.json({ text: "The connection to the spectral realm is corrupted. Try again." });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
