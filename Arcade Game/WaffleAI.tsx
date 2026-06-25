import React, { useState, useEffect, useRef } from "react";
import { GameType } from "../types";
import { Sparkles, Bot, Send } from "lucide-react";

interface WaffleAIProps {
  activeGame: GameType | null;
  isBackCloset?: boolean;
}

interface Message {
  role: "waffle" | "user";
  text: string;
}

export default function WaffleAI({ activeGame, isBackCloset }: WaffleAIProps) {
  const aiName = isBackCloset ? "TURTLE AI" : "WAFFLE AI";
  const defaultMsg = isBackCloset 
    ? "[0x9A] ... T U R T L E S ... [ERR_CORRUPT]" 
    : "BZZzt... I am Waffle. Ask a question, or pick a game. T̷h̷e̷ ̷w̷a̷i̷t̷ ̷i̷s̷ ̷l̷o̷n̷g̷.";

  const [messages, setMessages] = useState<Message[]>([
    { role: "waffle", text: defaultMsg }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTip = async (customQuery?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: activeGame, query: customQuery, isBackCloset })
      });
      
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMessages(prev => [...prev, { role: "waffle", text: data.text || "Connection lost... deep within the dark arcade." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "waffle", text: "My core is currently unreachable. Stay in the shadows." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMessages([{ role: "waffle", text: defaultMsg }]);
    if (activeGame) {
      fetchTip();
    }
  }, [activeGame, isBackCloset]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const userQ = query.trim();
    setMessages(prev => [...prev, { role: "user", text: userQ }]);
    setQuery("");
    fetchTip(userQ);
  };

  const themeAccent = isBackCloset ? "green-500" : "amber-500";
  const themeDark = isBackCloset ? "green-950" : "amber-950";
  const themeStroke = isBackCloset ? "green-700" : "amber-700";
  const bgClass = isBackCloset ? "bg-green-950/40 border-green-700/50" : "bg-amber-950/40 border-amber-700/50";
  const iconBg = isBackCloset ? "bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "bg-amber-600 border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.5)]";
  const sparkColor = isBackCloset ? "text-green-400" : "text-amber-400";
  const titleColor = isBackCloset ? "text-green-500" : "text-amber-500";
  const bubbleUserBg = isBackCloset ? "bg-green-800/80 text-green-50" : "bg-amber-800/80 text-amber-50";
  const inputBorder = isBackCloset ? "border-green-900/50 focus:border-green-500 placeholder:text-green-900/60 text-green-100" : "border-amber-900/50 focus:border-amber-500 placeholder:text-amber-900/60 text-amber-100";
  const btnBg = isBackCloset ? "bg-green-600 hover:bg-green-500 border-green-600 disabled:hover:bg-green-600" : "bg-amber-600 hover:bg-amber-500 border-amber-600 disabled:hover:bg-amber-600";

  return (
    <div className={`${bgClass} border rounded-2xl p-4 mt-6 flex flex-col md:flex-row items-start md:items-center gap-4 w-full max-w-5xl ${(isBackCloset && !activeGame) ? 'glitch-container' : ''}`}>
      <div className="flex w-full md:w-auto items-center gap-4 hidden md:flex">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${iconBg} ${(isBackCloset && !activeGame) ? 'glitch-jitter' : ''}`}>
            <Bot size={24} className={`text-black ${(isBackCloset && !activeGame) ? 'glitch-text-1' : ''}`} />
          </div>
          {loading && (
            <div className="absolute -top-1 -right-1">
              <Sparkles size={14} className={`${sparkColor} animate-spin`} />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 w-full flex flex-col gap-2 relative">
        <div className="flex justify-between items-center mb-1">
          <h4 className={`${titleColor} font-bold font-mono text-sm flex items-center gap-2 ${(isBackCloset && !activeGame) ? 'glitch-text-2' : ''}`}>
            {aiName}
            {activeGame && <span className="text-zinc-500 text-[10px] px-2 bg-zinc-900 rounded-full border border-zinc-800 tracking-wider">OBSERVING: {activeGame}</span>}
          </h4>
        </div>
        
        <div 
          ref={scrollRef}
          className={`bg-black/40 border border-${themeDark}/30 rounded-lg p-3 h-[120px] overflow-y-auto flex flex-col gap-3 font-mono text-xs scroll-smooth`}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded px-3 py-1.5 ${msg.role === "user" ? bubbleUserBg : `bg-zinc-900/80 text-${themeAccent}/90 italic`} ${(isBackCloset && !activeGame) && msg.role === 'waffle' ? 'glitch-text-1' : ''}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className={`max-w-[85%] rounded px-3 py-1.5 bg-zinc-900/80 text-${themeAccent}/50 italic animate-pulse`}>
                Decrypting signals...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-1 flex w-full">
          <input 
            type="text" 
            placeholder={`Talk with ${aiName}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`flex-1 bg-black/60 border rounded-l-lg px-3 py-2 text-xs font-mono transition-colors focus:outline-none ${inputBorder}`}
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className={`text-black px-4 py-2 rounded-r-lg border-y border-r transition-colors ${btnBg}`}
          >
            <Send size={14} className={loading && query ? "animate-pulse" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}
