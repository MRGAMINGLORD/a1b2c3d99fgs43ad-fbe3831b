import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Trash2, Send, Image as ImageIcon, 
  Menu, X, Turtle, Loader2, Code2, AlertCircle, Wand2, FileText, Edit2, Check, BookOpen
} from 'lucide-react';

// API Key is provided by the execution environment
const apiKey = "";

// Exponential backoff retry logic for API calls
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

export default function App() {
  // State Management
  const [chats, setChats] = useState([
    { id: '1', title: 'A Wise Beginning', messages: [{ role: 'model', type: 'text', content: "Greetings, young traveler. 🐢 I am Bob, a humble turtle who has seen many tides turn. I have gathered much knowledge over my long years beneath the waves. Whether it is the complexities of code or the mysteries of the world, I am here to guide you with patience. What shall we explore together today?" }] }
  ]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [input, setInput] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTurtleifying, setIsTurtleifying] = useState(false);
  
  // Renaming state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const messagesEndRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isLoadingText, isLoadingImage]);

  // Chat Management Functions
  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{ role: 'model', type: 'text', content: "Welcome back to my quiet cove. 🐢 What knowledge do you seek to uncover today? Take your time, there is no rush in the deep sea." }]
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e, id) => {
    e.stopPropagation();
    const updatedChats = chats.filter(c => c.id !== id);
    if (updatedChats.length === 0) {
      const newChat = { id: Date.now().toString(), title: 'New Chat', messages: [] };
      setChats([newChat]);
      setActiveChatId(newChat.id);
    } else {
      setChats(updatedChats);
      if (activeChatId === id) setActiveChatId(updatedChats[0].id);
    }
  };

  const switchChat = (id) => {
    setActiveChatId(id);
    setIsSidebarOpen(false);
    setIsEditingTitle(false);
  };

  const startEditingTitle = () => {
    setTempTitle(activeChat.title);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (tempTitle.trim()) {
      setChats(chats.map(c => c.id === activeChatId ? { ...c, title: tempTitle.trim() } : c));
    }
    setIsEditingTitle(false);
  };

  // Format history for Gemini API
  const getFormattedHistory = () => {
    const history = [];
    activeChat.messages.forEach(msg => {
      if (msg.type === 'text') {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    });
    return history;
  };

  // Handle Text/Code Generation (Gemini 2.5 Flash)
  const handleSendText = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage) return;

    const userText = input.trim();
    setInput('');
    
    // Optimistically add user message
    const newUserMsg = { role: 'user', type: 'text', content: userText };
    updateChatMessages([...activeChat.messages, newUserMsg]);
    setIsLoadingText(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const contents = getFormattedHistory();
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const payload = {
        contents,
        systemInstruction: { 
          parts: [{ text: "You are Bob the Turtle, an ancient, wise, and patient sage. Your tone is calm, warm, and deeply intellectual. You teach by breaking complex topics down into their most fundamental principles. Your explanations should be thorough, clear, and use analogies from nature (the ocean, the stars, the seasons). When asked about code or science, don't just give the answer; explain the 'why' behind it so the student truly learns. Use turtle or ocean emojis sparingly but meaningfully (🐢, 🌊, 🐚). Always wrap code in standard markdown code blocks." }] 
        }
      };

      const result = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "My mind drifted with the current... could you repeat that, young one?";
      
      // Update chat title if it's a new chat and still has default title
      let newTitle = activeChat.title;
      if (activeChat.messages.length <= 1 && activeChat.title === 'New Chat') {
        newTitle = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
      }

      updateActiveChatState(newTitle, [...activeChat.messages, newUserMsg, { role: 'model', type: 'text', content: responseText }]);

    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "A storm has clouded my vision. " + error.message }]);
    } finally {
      setIsLoadingText(false);
    }
  };

  // Feature 1: Wise-ify Text (Formerly Turtle-ify)
  const handleTurtleify = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage || isTurtleifying) return;
    setIsTurtleifying(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: `Rewrite this text to sound like it was written by an ancient, wise turtle sage named Bob. Use sophisticated language, ocean metaphors, and a patient, teaching tone. Text: "${input}"` }] }],
        systemInstruction: { parts: [{ text: "You are a master of tone and wisdom." }] }
      };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) setInput(responseText.trim());
    } catch (error) {
      console.error("Wisdom transfer failed:", error);
    } finally {
      setIsTurtleifying(false);
    }
  };

  // Feature 3: Deep Summary
  const handleSummarize = async () => {
    if (isLoadingText || isLoadingImage || activeChat.messages.length < 2) return;
    const userText = "✨ Reflect on our journey so far. ✨";
    const newUserMsg = { role: 'user', type: 'text', content: userText };
    updateChatMessages([...activeChat.messages, newUserMsg]);
    setIsLoadingText(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const contents = getFormattedHistory();
      contents.push({ role: 'user', parts: [{ text: "Reflect on our conversation. Provide a wise, concise summary of the knowledge we have shared so far. Begin with 'Let us pause to look back at the path we have swam together...'" }] });

      const payload = { contents, systemInstruction: { parts: [{ text: "You are Bob the Turtle, the wise sage." }] } };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "The tides have washed away my immediate memory of our path.";
      
      updateActiveChatState(activeChat.title, [...activeChat.messages, newUserMsg, { role: 'model', type: 'text', content: responseText }]);
    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "The reflection is clouded: " + error.message }]);
    } finally {
      setIsLoadingText(false);
    }
  };

  // Handle Image Generation
  const handleSendImage = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage) return;
    const userText = input.trim();
    setInput('');
    const newUserMsg = { role: 'user', type: 'text', content: `Bob, show me a vision of: ${userText}` };
    updateChatMessages([...activeChat.messages, newUserMsg]);
    setIsLoadingImage(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const payload = { instances: { prompt: userText }, parameters: { sampleCount: 1 } };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
        const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'image', content: imageUrl }]);
      } else {
        throw new Error("The vision did not manifest.");
      }
    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "My inner eye is tired. I cannot see that right now: " + error.message }]);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const updateChatMessages = (newMessages) => {
    setChats(chats.map(c => c.id === activeChatId ? { ...c, messages: newMessages } : c));
  };

  const updateActiveChatState = (newTitle, newMessages) => {
    setChats(chats.map(c => c.id === activeChatId ? { ...c, title: newTitle, messages: newMessages } : c));
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3);
        const firstNewLine = codeContent.indexOf('\n');
        let lang = 'code';
        let code = codeContent;
        if (firstNewLine !== -1) {
          const potentialLang = codeContent.substring(0, firstNewLine).trim();
          if (!potentialLang.includes(' ')) {
             lang = potentialLang || 'code';
             code = codeContent.substring(firstNewLine + 1);
          }
        }
        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-emerald-700 shadow-sm">
            <div className="bg-emerald-900 flex items-center px-4 py-1.5 text-xs text-emerald-300 font-mono border-b border-emerald-800">
              <Code2 size={14} className="mr-2" /> {lang}
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto"><code>{code}</code></pre>
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="flex h-screen bg-emerald-50 font-sans text-gray-800 overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-emerald-900 text-emerald-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-2 font-bold text-xl tracking-wide">
            <Turtle size={28} className="text-emerald-400" />
            <span className="font-serif">Bob the Sage</span>
          </div>
          <button className="md:hidden p-1 text-emerald-300 hover:text-white" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        <div className="p-4">
          <button onClick={createNewChat} className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-600 text-white p-3 rounded-lg transition-colors font-medium shadow-sm">
            <Plus size={20} /><span>Begin New Inquiry</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 px-2 mt-2">Past Dialogues</div>
          {chats.map(chat => (
            <div key={chat.id} onClick={() => switchChat(chat.id)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${activeChatId === chat.id ? 'bg-emerald-800 shadow-inner' : 'hover:bg-emerald-800/50'}`}>
              <div className="flex items-center space-x-3 overflow-hidden">
                <MessageSquare size={18} className={activeChatId === chat.id ? 'text-emerald-400' : 'text-emerald-600'} />
                <span className="truncate text-sm font-medium">{chat.title}</span>
              </div>
              <button onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-emerald-700 rounded text-emerald-400 hover:text-white transition-all"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-white relative">
        <header className="h-16 flex items-center justify-between px-4 border-b border-emerald-100 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center flex-1">
            <button className="md:hidden p-2 mr-2 text-emerald-800 hover:bg-emerald-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            {isEditingTitle ? (
              <div className="flex items-center flex-1 max-w-md">
                <input
                  autoFocus
                  className="bg-emerald-50 border border-emerald-300 rounded px-2 py-1 text-sm font-semibold text-emerald-900 w-full outline-none focus:ring-1 focus:ring-emerald-500 font-serif"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                  onBlur={saveTitle}
                />
                <button onClick={saveTitle} className="ml-2 p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={18}/></button>
              </div>
            ) : (
              <div 
                className="flex items-center group cursor-pointer hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                onClick={startEditingTitle}
              >
                <h2 className="font-semibold text-emerald-900 truncate max-w-[200px] md:max-w-md font-serif text-lg">{activeChat.title}</h2>
                <Edit2 size={14} className="ml-2 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-emerald-50/30 to-white">
          {activeChat.messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {msg.role === 'model' && (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 mt-1 shadow-sm border border-emerald-200 flex-shrink-0"><Turtle size={22} className="text-emerald-700" /></div>
              )}
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${msg.role === 'user' ? 'bg-emerald-700 text-white rounded-tr-sm' : msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm' : 'bg-white border border-emerald-100 text-gray-800 rounded-tl-sm'}`}>
                {msg.type === 'text' && <div className="prose prose-sm md:prose-base prose-emerald max-w-none leading-relaxed font-serif">{msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}</div>}
                {msg.type === 'image' && <div className="rounded-lg overflow-hidden bg-gray-100 ring-1 ring-black/5 mt-2"><img src={msg.content} alt="Vision" className="max-w-full h-auto object-contain" /></div>}
                {msg.type === 'error' && <div className="flex items-start space-x-2"><AlertCircle size={20} className="flex-shrink-0 mt-0.5" /><span className="text-sm font-medium">{msg.content}</span></div>}
              </div>
            </div>
          ))}
          {(isLoadingText || isLoadingImage) && (
            <div className="flex justify-start animate-pulse">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shadow-sm border border-emerald-200"><Turtle size={22} className="text-emerald-700" /></div>
              <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center space-x-3 text-emerald-700 text-sm font-medium font-serif italic">
                <Loader2 size={18} className="animate-spin" /><span>{isLoadingText ? 'Bob is meditating on your inquiry...' : 'Bob is painting a vision...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-emerald-100 flex flex-col">
          <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
             <button onClick={handleSummarize} disabled={isLoadingText || isLoadingImage || activeChat.messages.length < 2} className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-full text-xs font-medium border border-emerald-200 transition-colors disabled:opacity-50"><BookOpen size={14} /><span>✨ Wise Reflection</span></button>
             {input.trim() && (
                <button onClick={handleTurtleify} disabled={isTurtleifying || isLoadingText || isLoadingImage} className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-full text-xs font-medium border border-blue-200 transition-colors disabled:opacity-50">{isTurtleifying ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}<span>✨ Impart Wisdom</span></button>
             )}
          </div>

          <div className="max-w-4xl mx-auto w-full relative flex items-end bg-emerald-50/20 rounded-2xl border border-emerald-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
            <textarea
              className="flex-1 max-h-32 min-h-[56px] p-4 bg-transparent outline-none resize-none disabled:opacity-50 text-gray-800 placeholder-emerald-800/50 font-serif"
              placeholder="Ask the Old Sage for guidance..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              disabled={isLoadingText || isLoadingImage}
              rows={1}
            />
            <div className="flex p-2 space-x-2">
              <button onClick={handleSendImage} disabled={!input.trim() || isLoadingText || isLoadingImage} className="p-2.5 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-40 group relative" title="Request a vision"><ImageIcon size={22} /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Show Vision</span></button>
              <button onClick={handleSendText} disabled={!input.trim() || isLoadingText || isLoadingImage} className="p-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-40 shadow-sm transform active:scale-95 group relative"><Send size={22} /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Speak</span></button>
            </div>
          </div>
          <div className="text-center mt-2 text-xs text-emerald-800/40 font-medium font-serif italic">The tides of time wait for no one, yet wisdom requires patience.</div>
        </div>
      </div>
    </div>
  );
}
