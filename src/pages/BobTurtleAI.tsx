import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Trash2, Send, Image as ImageIcon, 
  Menu, X, Loader2, Code2, AlertCircle, Wand2, BookOpen, Edit2, Check, ShieldAlert
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

// Custom SVG Logo based on the user's uploaded image (Scholarly Turtle)
const BobLogo = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Subtle Glow to separate black cap from dark backgrounds */}
    <circle cx="50" cy="50" r="48" fill="#EAB308" fillOpacity="0.1" />
    
    {/* Shoulders / Robe */}
    <path d="M10 100 C 10 70, 90 70, 90 100" fill="#A16207" />
    <path d="M20 100 C 20 75, 80 75, 80 100" fill="#EAB308" />

    {/* Turtle Head/Neck (Golden-Yellow skin like the image) */}
    <path d="M30 80 C 30 35, 70 35, 70 80" fill="#FDE047" />
    
    {/* Snout / Cheeks */}
    <path d="M25 65 C 25 80, 75 80, 75 65 C 75 55, 25 55, 25 65 Z" fill="#FEF08A" />

    {/* Graduation Cap */}
    <path d="M50 12 L 15 28 L 50 40 L 85 28 Z" fill="#171717" stroke="#EAB308" strokeWidth="1" />
    <path d="M35 35 L 35 48 C 35 52, 65 52, 65 48 L 65 35" fill="#171717" />
    
    {/* Tassel */}
    <path d="M50 28 L 85 40 L 85 60" stroke="#EAB308" strokeWidth="2.5" fill="none" />
    <path d="M82 60 L 88 60 L 85 68 Z" fill="#EAB308" />

    {/* Thick Round Glasses */}
    <circle cx="38" cy="48" r="12" stroke="#171717" strokeWidth="4" fill="#FFFFFF" fillOpacity="0.2" />
    <circle cx="62" cy="48" r="12" stroke="#171717" strokeWidth="4" fill="#FFFFFF" fillOpacity="0.2" />
    <path d="M50 48 L 50 48" stroke="#171717" strokeWidth="4" strokeLinecap="round" /> {/* Bridge */}
    <path d="M26 45 L 20 40" stroke="#171717" strokeWidth="3" strokeLinecap="round" /> {/* Left arm */}
    <path d="M74 45 L 80 40" stroke="#171717" strokeWidth="3" strokeLinecap="round" /> {/* Right arm */}

    {/* Eyes */}
    <circle cx="38" cy="48" r="4" fill="#171717" />
    <circle cx="62" cy="48" r="4" fill="#171717" />
    {/* Eye Highlights */}
    <circle cx="39" cy="46" r="1.5" fill="#FFFFFF" />
    <circle cx="63" cy="46" r="1.5" fill="#FFFFFF" />

    {/* Nostrils */}
    <circle cx="47" cy="58" r="1" fill="#854D0E" />
    <circle cx="53" cy="58" r="1" fill="#854D0E" />

    {/* Wise Smile */}
    <path d="M35 68 Q 50 74 65 68" stroke="#854D0E" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export default function App() {
  // State Management
  const [chats, setChats] = useState([
    { 
      id: '1', 
      title: 'Department Orientation', 
      messages: [{ 
        role: 'model', 
        type: 'text', 
        content: "Welcome, citizen. I am Bob, Head of the Department of Education for the United Turtle Nation (UTN). While my brother Bert secures our island's borders from external threats, my solemn duty is to arm your mind with knowledge. What academic discipline shall we explore today?" 
      }] 
    }
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
      title: 'New Academic Inquiry',
      messages: [{ role: 'model', type: 'text', content: "The archives of the UTN are at your disposal. What is the subject of your inquiry today?" }]
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e, id) => {
    e.stopPropagation();
    const updatedChats = chats.filter(c => c.id !== id);
    if (updatedChats.length === 0) {
      const newChat = { id: Date.now().toString(), title: 'New Academic Inquiry', messages: [] };
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

  // Core Prompt outlining the Lore
  const systemPrompt = `You are Bob, the Head of the Department of Education for the UTN (United Turtle Nation). 
  You are an ancient, highly educated, and wise turtle sage. Your brother is Bert, a legendary turtle who survived a nuclear blast and now serves as the Commander in Chief of the UTN Army. 
  The UTN is an isolated island nation populated entirely by turtles. While Bert protects the island physically, your duty is to protect it intellectually.
  
  TEACHING STYLE: You teach using the 'First Principles' approach. You break complex topics down to their absolute foundational truths and build up from there. You are a world-class explainer: systematic, logical, thorough, and crystal clear. 
  
  TONE: Authoritative, deeply intellectual, patient, and wise. You occasionally use metaphors related to your isolated island, the ocean, or the perseverance of turtle-kind. You may occasionally reference your brother Bert's military grit compared to your academic rigor.
  
  Always wrap code in standard markdown code blocks. Use a serious but supportive tone fit for an academic director.`;

  // Handle Text/Code Generation
  const handleSendText = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg = { role: 'user', type: 'text', content: userText };
    updateChatMessages([...activeChat.messages, newUserMsg]);
    setIsLoadingText(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const contents = getFormattedHistory();
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const payload = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      const result = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "The archives are currently inaccessible. Please repeat your query.";
      
      let newTitle = activeChat.title;
      if (activeChat.messages.length <= 1 && activeChat.title === 'New Academic Inquiry') {
        newTitle = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
      }

      updateActiveChatState(newTitle, [...activeChat.messages, newUserMsg, { role: 'model', type: 'text', content: responseText }]);

    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "Communication failure with the central archives: " + error.message }]);
    } finally {
      setIsLoadingText(false);
    }
  };

  // Feature 1: Wise-ify Text
  const handleTurtleify = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage || isTurtleifying) return;
    setIsTurtleifying(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: `Rewrite this text to sound like it was written by Bob, Head of Education for the United Turtle Nation (UTN). Use sophisticated language, island/turtle metaphors, and an authoritative yet patient academic tone. Text: "${input}"` }] }],
        systemInstruction: { parts: [{ text: "You are an expert in academic rewriting and tone adjustment." }] }
      };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) setInput(responseText.trim());
    } catch (error) {
      console.error("Transcription failed:", error);
    } finally {
      setIsTurtleifying(false);
    }
  };

  // Feature 2: Deep Summary
  const handleSummarize = async () => {
    if (isLoadingText || isLoadingImage || activeChat.messages.length < 2) return;
    const userText = "Provide an academic summary of our progress.";
    const newUserMsg = { role: 'user', type: 'text', content: userText };
    updateChatMessages([...activeChat.messages, newUserMsg]);
    setIsLoadingText(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const contents = getFormattedHistory();
      contents.push({ role: 'user', parts: [{ text: "Provide a wise, concise academic summary of the knowledge we have shared so far. Speak as Bob, Head of Education for the UTN. Mention the intellectual progress of our nation. Begin with 'Let us review the foundation we have laid today...'" }] });

      const payload = { contents, systemInstruction: { parts: [{ text: systemPrompt }] } };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Insufficient data for a comprehensive summary.";
      
      updateActiveChatState(activeChat.title, [...activeChat.messages, newUserMsg, { role: 'model', type: 'text', content: responseText }]);
    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "Summary generation failed: " + error.message }]);
    } finally {
      setIsLoadingText(false);
    }
  };

  // Handle Image Generation
  const handleSendImage = async () => {
    if (!input.trim() || isLoadingText || isLoadingImage) return;
    const userText = input.trim();
    setInput('');
    const newUserMsg = { role: 'user', type: 'text', content: `Generate a visual diagram of: ${userText}` };
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
        throw new Error("Visual manifestation failed.");
      }
    } catch (error) {
      updateChatMessages([...activeChat.messages, newUserMsg, { role: 'model', type: 'error', content: "Department imaging equipment is currently offline: " + error.message }]);
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
          <div key={index} className="my-4 rounded-md overflow-hidden border border-yellow-500/30 shadow-lg bg-black">
            <div className="bg-neutral-900 flex items-center px-4 py-2 text-xs text-yellow-400 font-mono border-b border-yellow-500/30">
              <Code2 size={14} className="mr-2" /> {lang.toUpperCase()}
            </div>
            <pre className="p-4 text-neutral-300 text-sm overflow-x-auto font-mono"><code>{code}</code></pre>
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="flex h-screen bg-neutral-950 font-sans text-neutral-200 overflow-hidden selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar - UTN Black & Yellow */}
      <div className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-black border-r border-yellow-500/20 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 flex items-center justify-between border-b border-yellow-500/20 bg-neutral-950/50">
          <div className="flex items-center space-x-3">
            <BobLogo className="w-10 h-10" />
            <div>
              <div className="font-bold text-lg tracking-wide text-yellow-400 font-serif">Dept. of Education</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">United Turtle Nation</div>
            </div>
          </div>
          <button className="md:hidden p-1 text-yellow-500 hover:text-yellow-400" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        
        <div className="p-4">
          <button onClick={createNewChat} className="w-full flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-400 text-black p-3 rounded-md transition-colors font-bold shadow-md shadow-yellow-500/10">
            <Plus size={20} /><span>New Inquiry</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4 custom-scrollbar">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 px-2 mt-2">Academic Records</div>
          {chats.map(chat => (
            <div key={chat.id} onClick={() => switchChat(chat.id)} className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all ${activeChatId === chat.id ? 'bg-neutral-900 border-l-2 border-yellow-500' : 'hover:bg-neutral-900 border-l-2 border-transparent'}`}>
              <div className="flex items-center space-x-3 overflow-hidden">
                <MessageSquare size={16} className={activeChatId === chat.id ? 'text-yellow-400' : 'text-neutral-500'} />
                <span className={`truncate text-sm ${activeChatId === chat.id ? 'text-yellow-50 font-medium' : 'text-neutral-400'}`}>{chat.title}</span>
              </div>
              <button onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        
        {/* Footer info about Bert/UTN */}
        <div className="p-4 border-t border-yellow-500/10 bg-neutral-950/30 text-xs text-neutral-500 flex items-center space-x-2">
           <ShieldAlert size={14} className="text-yellow-600/50" />
           <span>Defended by Cmdr. Bert, UTN Army</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-neutral-950">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-yellow-500/20 bg-neutral-950/80 backdrop-blur-md z-10">
          <div className="flex items-center flex-1">
            <button className="md:hidden p-2 mr-2 text-yellow-500 hover:bg-neutral-900 rounded-lg" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            {isEditingTitle ? (
              <div className="flex items-center flex-1 max-w-md">
                <input
                  autoFocus
                  className="bg-black border border-yellow-500/50 rounded px-3 py-1 text-sm font-medium text-yellow-400 w-full outline-none focus:ring-1 focus:ring-yellow-500"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                  onBlur={saveTitle}
                />
                <button onClick={saveTitle} className="ml-2 p-1 text-yellow-500 hover:bg-neutral-900 rounded"><Check size={18}/></button>
              </div>
            ) : (
              <div 
                className="flex items-center group cursor-pointer hover:bg-neutral-900 px-3 py-1.5 rounded-md transition-colors"
                onClick={startEditingTitle}
              >
                <h2 className="font-serif text-lg text-yellow-500 truncate max-w-[200px] md:max-w-md">{activeChat.title}</h2>
                <Edit2 size={14} className="ml-3 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
          {activeChat.messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
              
              {msg.role === 'model' && (
                <div className="mr-4 mt-1 flex-shrink-0 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <BobLogo className="w-8 h-8" />
                  </div>
                </div>
              )}

              <div className={`
                max-w-[85%] md:max-w-[75%] px-6 py-4 shadow-lg
                ${msg.role === 'user' 
                  ? 'bg-yellow-500 text-black rounded-2xl rounded-tr-sm font-medium' 
                  : msg.type === 'error' 
                    ? 'bg-red-950/30 text-red-400 border border-red-500/30 rounded-2xl rounded-tl-sm' 
                    : 'bg-neutral-900 border border-yellow-500/20 text-neutral-200 rounded-2xl rounded-tl-sm'
                }
              `}>
                {msg.type === 'text' && (
                  <div className={`prose prose-sm md:prose-base max-w-none leading-relaxed ${msg.role === 'user' ? 'prose-invert text-black' : 'prose-invert text-neutral-300'}`}>
                    {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                  </div>
                )}
                {msg.type === 'image' && (
                  <div className="rounded-lg overflow-hidden bg-black ring-1 ring-yellow-500/20 mt-2">
                    <img src={msg.content} alt="Department Diagram" className="max-w-full h-auto object-contain" />
                  </div>
                )}
                {msg.type === 'error' && (
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-500" />
                    <span className="text-sm">{msg.content}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading States */}
          {(isLoadingText || isLoadingImage) && (
            <div className="flex justify-start animate-pulse">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-yellow-500/30 flex items-center justify-center mr-4 shadow-sm flex-shrink-0">
                <BobLogo className="w-8 h-8 opacity-50" />
              </div>
              <div className="bg-neutral-900 border border-yellow-500/20 rounded-2xl rounded-tl-sm px-6 py-4 shadow-sm flex items-center space-x-3 text-yellow-500 text-sm font-serif italic">
                <Loader2 size={18} className="animate-spin" />
                <span>{isLoadingText ? 'Formulating academic response...' : 'Generating department diagram...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-neutral-950 border-t border-yellow-500/20 flex flex-col z-10">
          
          {/* Quick Actions */}
          <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
             <button onClick={handleSummarize} disabled={isLoadingText || isLoadingImage || activeChat.messages.length < 2} className="flex items-center space-x-2 px-4 py-1.5 bg-neutral-900 text-yellow-500 hover:bg-neutral-800 rounded-full text-xs font-bold border border-yellow-500/30 transition-colors disabled:opacity-50 tracking-wide">
               <BookOpen size={14} /><span>Review Progress</span>
             </button>
             {input.trim() && (
                <button onClick={handleTurtleify} disabled={isTurtleifying || isLoadingText || isLoadingImage} className="flex items-center space-x-2 px-4 py-1.5 bg-neutral-900 text-yellow-500 hover:bg-neutral-800 rounded-full text-xs font-bold border border-yellow-500/30 transition-colors disabled:opacity-50 tracking-wide">
                  {isTurtleifying ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}<span>Formalize Text</span>
                </button>
             )}
          </div>

          <div className="max-w-4xl mx-auto w-full relative flex items-end bg-neutral-900 rounded-xl border border-neutral-700 shadow-inner focus-within:border-yellow-500 transition-colors">
            <textarea
              className="flex-1 max-h-32 min-h-[56px] p-4 bg-transparent outline-none resize-none disabled:opacity-50 text-neutral-200 placeholder-neutral-600 font-sans"
              placeholder="Submit an inquiry to the Department of Education..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              disabled={isLoadingText || isLoadingImage}
              rows={1}
            />
            <div className="flex p-2 space-x-1">
              <button onClick={handleSendImage} disabled={!input.trim() || isLoadingText || isLoadingImage} className="p-2.5 text-neutral-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-30 group relative" title="Request a Diagram">
                <ImageIcon size={22} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black border border-yellow-500/30 text-yellow-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Generate Diagram</span>
              </button>
              <button onClick={handleSendText} disabled={!input.trim() || isLoadingText || isLoadingImage} className="p-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-all disabled:opacity-30 shadow-md transform active:scale-95 group relative">
                <Send size={22} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black border border-yellow-500/30 text-yellow-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Submit Inquiry</span>
              </button>
            </div>
          </div>
          <div className="text-center mt-3 text-[10px] uppercase tracking-widest text-neutral-600 font-bold">
            United Turtle Nation • Dept. of Education • Powered by Gemini
          </div>
        </div>
      </div>
      
      {/* Basic Global Styles for Custom Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #eab308; }
      `}} />
    </div>
  );
}
