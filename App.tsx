/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { KeyboardState, GameType, ArcadeHighscores } from "./types";
import { synth } from "./components/AudioSynth";
import Pong from "./components/Pong";
import Pacman from "./components/Pacman";
import DonkeyKong from "./components/DonkeyKong";
import Galaga from "./components/Galaga";
import SpaceInvaders from "./components/SpaceInvaders";
import WaffleAI from "./components/WaffleAI";
import { 
  Volume2, 
  VolumeX, 
  Tv, 
  RotateCcw, 
  CircleDot, 
  Sparkles,
  Gamepad2,
  Trophy,
  Coins,
  Play,
  Award,
  X
} from "lucide-react";

const ZALGO_CHARS = "!<>-_\\/[]{}—=+*^?#_";

function GlitchText({ text, active }: { text: string; active?: boolean }) {
  const [glitchText, setGlitchText] = useState(text);

  useEffect(() => {
    if (!active) {
      setGlitchText(text);
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    const glitchLoop = () => {
      const isGlitching = Math.random() < 0.2;
      if (isGlitching) {
         let newText = "";
         for(let i=0; i<text.length; i++) {
           if (text[i] === " " || Math.random() > 0.4) {
             newText += text[i];
           } else {
             newText += ZALGO_CHARS[Math.floor(Math.random() * ZALGO_CHARS.length)];
           }
         }
         setGlitchText(newText);
         timeoutId = setTimeout(glitchLoop, Math.random() * 150 + 50);
      } else {
         setGlitchText(text);
         timeoutId = setTimeout(glitchLoop, Math.random() * 4000 + 500);
      }
    };
    glitchLoop();

    return () => clearTimeout(timeoutId);
  }, [text, active]);

  return <>{glitchText}</>;
}

const ALL_ACHIEVEMENTS = [
  { id: 'score_1000', title: 'ARCADE MASTER', game: 'DonkeyKong', description: 'Reach 1000 points' },
  { id: 'score_5000', title: 'RETRO GOD', game: 'DonkeyKong', description: 'Reach 5000 points' },
  { id: 'pong_master', title: 'PADDLE PRO', game: 'Pong', description: 'Score a point against AI' },
  { id: 'pong_god', title: 'PONG GOD', game: 'Pong', description: 'Win a match against AI' },
  { id: 'pacman_1000', title: 'WAKKA WAKKA', game: 'Pac-Man', description: 'Reach 1000 points' },
  { id: 'pacman_ghost', title: 'GHOST BUSTER', game: 'Pac-Man', description: 'Eat a scared ghost' },
  { id: 'galaga_fighter', title: 'STAR FIGHTER', game: 'Galaga', description: 'Defeat 10 enemies' },
  { id: 'back_closet', title: 'SECRET ROOM', game: 'Arcade', description: 'Discover the back closet' },
];

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [globalDifficulty, setGlobalDifficulty] = useState<import('./types').Difficulty>(() => {
    try {
      const saved = localStorage.getItem("arcade_difficulty");
      if (saved === "EASY" || saved === "MEDIUM" || saved === "HARD" || saved === "NIGHTMARE") {
        return saved;
      }
    } catch (e) {}
    return "MEDIUM";
  });

  useEffect(() => {
    localStorage.setItem("arcade_difficulty", globalDifficulty);
  }, [globalDifficulty]);
  const [highScores, setHighScores] = useState<ArcadeHighscores>({
    PONG: 0,
    PACMAN: 0,
    DONKEYKONG: 0,
    GALAGA: 0,
    SPACEINVADERS: 0
  });

  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    KeyZ: false,
    KeyX: false,
    KeyP: false,
    Enter: false,
    Escape: false
  });

  const [isMuted, setIsMuted] = useState(false);
  const [scanlineEnabled, setScanlineEnabled] = useState(true);
  const [cabinetCoins, setCabinetCoins] = useState(() => {
    const saved = localStorage.getItem("arcade_cabinet_coins");
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem("arcade_cabinet_coins", cabinetCoins.toString());
  }, [cabinetCoins]);

  const [activeAchievements, setActiveAchievements] = useState<{id: string, title: string, text: string, time: number}[]>([]);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    const saved = localStorage.getItem("arcade_unlocked_achievements");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("arcade_unlocked_achievements", JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements]);

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      const { id, title, text } = e.detail;
      setUnlockedAchievements(prev => {
        if (prev.includes(id)) return prev;
        
        synth.playCoin(); // Play a nice sound
        
        setActiveAchievements(current => {
          if (current.some(a => a.id === id)) return current;
          return [...current, { id, title, text, time: Date.now() }];
        });
        
        // Remove after 5 seconds
        setTimeout(() => {
          setActiveAchievements(current => current.filter(a => a.id !== id));
        }, 5000);

        return [...prev, id];
      });
    }) as EventListener;
    
    window.addEventListener("achievement", handler);
    return () => window.removeEventListener("achievement", handler);
  }, []);

  const [isBackCloset, setIsBackCloset] = useState(false);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [debugKeysCount, setDebugKeysCount] = useState(0);

  const [turtleHighScores, setTurtleHighScores] = useState<Record<GameType, number>>({
    PONG: 0,
    PACMAN: 0,
    DONKEYKONG: 0,
    GALAGA: 0,
    SPACEINVADERS: 0
  });

  // Load high scores from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("arcade_highscores");
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse highscores", e);
      }
    }
    const savedTurtles = localStorage.getItem("arcade_highscores_turtles");
    if (savedTurtles) {
      try {
        setTurtleHighScores(JSON.parse(savedTurtles));
      } catch (e) { }
    }
  }, []);

  // Sync mute state with AudioSynth
  useEffect(() => {
    synth.setMuted(isMuted);
  }, [isMuted]);

  // Handle keyboard inputs global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q' && activeGame === null) {
        setDebugKeysCount(prev => prev + 1);
        return; // Don't process other keys
      }

      // Prevent browser default scroll action on arrows and space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
      }

      let key: keyof KeyboardState | null = null;
      if (e.key === "ArrowUp") key = "ArrowUp";
      else if (e.key === "ArrowDown") key = "ArrowDown";
      else if (e.key === "ArrowLeft") key = "ArrowLeft";
      else if (e.key === "ArrowRight") key = "ArrowRight";
      else if (e.key === " " || e.key === "Spacebar") key = "Space";
      else if (e.key.toLowerCase() === "z") key = "KeyZ";
      else if (e.key.toLowerCase() === "x") key = "KeyX";
      else if (e.key.toLowerCase() === "p") key = "KeyP";
      else if (e.key === "Enter") key = "Enter";
      else if (e.key === "Escape") key = "Escape";

      if (key) {
        setKeyboardState((prev) => ({ ...prev, [key!]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      let key: keyof KeyboardState | null = null;
      if (e.key === "ArrowUp") key = "ArrowUp";
      else if (e.key === "ArrowDown") key = "ArrowDown";
      else if (e.key === "ArrowLeft") key = "ArrowLeft";
      else if (e.key === "ArrowRight") key = "ArrowRight";
      else if (e.key === " " || e.key === "Spacebar") key = "Space";
      else if (e.key.toLowerCase() === "z") key = "KeyZ";
      else if (e.key.toLowerCase() === "x") key = "KeyX";
      else if (e.key.toLowerCase() === "p") key = "KeyP";
      else if (e.key === "Enter") key = "Enter";
      else if (e.key === "Escape") key = "Escape";

      if (key) {
        setKeyboardState((prev) => ({ ...prev, [key!]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (debugKeysCount >= 2) {
      setShowDebugMenu(true);
      setDebugKeysCount(0);
    }
    
    if (debugKeysCount > 0) {
      const timer = setTimeout(() => setDebugKeysCount(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [debugKeysCount]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [debugTab, setDebugTab] = useState<'SCORES'|'ACHIEVEMENTS'>('SCORES');

  // Handle returning on escape press
  useEffect(() => {
    if (keyboardState.Escape && activeGame && !showExitConfirm) {
      synth.playBounce();
      setShowExitConfirm(true);
    }
  }, [keyboardState.Escape]);

  const requestExit = () => {
    synth.playBounce();
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    synth.playBounce();
    setShowExitConfirm(false);
    exitToSelection();
  };

  const cancelExit = () => {
    synth.playBounce();
    setShowExitConfirm(false);
  };

  const insertCoin = () => {
    synth.resume();
    synth.playCoin();
    setCabinetCoins((c) => c + 1);
  };

  const handleSelectGame = (game: GameType) => {
    synth.resume();
    if (cabinetCoins > 0 || activeGame !== null) {
      synth.playCoin();
      if (cabinetCoins > 0 && activeGame === null) {
        setCabinetCoins((c) => c - 1);
      }
      setActiveGame(game);
    } else {
      // Prompt coin insertion sound
      synth.playBounce();
    }
  };

  const exitToSelection = () => {
    synth.playBounce();
    setActiveGame(null);
  };

  const handleGameOver = (finalScore: number) => {
    if (activeGame) {
      if (isBackCloset) {
        if (activeGame === "PONG") {
          const nextHighscores = { ...turtleHighScores, PONG: turtleHighScores.PONG + finalScore };
          setTurtleHighScores(nextHighscores);
          localStorage.setItem("arcade_highscores_turtles", JSON.stringify(nextHighscores));
        } else {
          if (finalScore > turtleHighScores[activeGame]) {
            const nextHighscores = { ...turtleHighScores, [activeGame]: finalScore };
            setTurtleHighScores(nextHighscores);
            localStorage.setItem("arcade_highscores_turtles", JSON.stringify(nextHighscores));
          }
        }
      } else {
        if (activeGame === "PONG") {
          const nextHighscores = {
            ...highScores,
            PONG: highScores.PONG + finalScore
          };
          setHighScores(nextHighscores);
          localStorage.setItem("arcade_highscores", JSON.stringify(nextHighscores));
        } else {
          if (finalScore > highScores[activeGame]) {
            const nextHighscores = {
              ...highScores,
              [activeGame]: finalScore
            };
            setHighScores(nextHighscores);
            localStorage.setItem("arcade_highscores", JSON.stringify(nextHighscores));
          }
        }
      }
    }
  };

  // Simulated virtual controller taps
  const pressVirtualKey = (key: keyof KeyboardState, state: boolean) => {
    synth.resume();
    setKeyboardState((prev) => ({ ...prev, [key]: state }));
    if (state) {
      if (key === "KeyZ") synth.playBounce();
      if (key === "KeyX") synth.playBounce();
    }
  };

  const gamesList = [
    {
      id: "PONG" as GameType,
      title: "PONG",
      year: "1972",
      desc: "The vintage tennis simulator. Command the paddles to target and reflect the ball past the opponent's guard. Features realistic angle-of-incidence spin.",
      color: "border-green-500 text-green-400 bg-green-950/20 shadow-[0_0_10px_rgba(34,197,94,0.15)]",
      badgeColor: "bg-green-500/20 text-green-400",
      accent: "bg-green-500",
      icon: "🏓"
    },
    {
      id: "PACMAN" as GameType,
      title: "PAC-MAN",
      year: "1980",
      desc: "Chomp yellow food dots in a vintage dark maze while avoiding Blinky and Pinky. Eat big Energizers to scare and digest ghosts for major point bonuses.",
      color: "border-yellow-500 text-yellow-400 bg-yellow-950/20 shadow-[0_0_10px_rgba(234,179,8,0.15)]",
      badgeColor: "bg-yellow-500/20 text-yellow-400",
      accent: "bg-yellow-500",
      icon: "🍕"
    },
    {
      id: "DONKEYKONG" as GameType,
      title: "DONKEY KONG",
      year: "1981",
      desc: "The climb-and-jump retro masterpiece. Pilot Jumpman up the scaffolding structure grids, jump-dodge rolling logs, and rescue Pauline from the top.",
      color: "border-pink-500 text-pink-400 bg-pink-950/20 shadow-[0_0_10px_rgba(236,72,153,0.15)]",
      badgeColor: "bg-pink-500/20 text-pink-400",
      accent: "bg-pink-500",
      icon: "🦍"
    },
    {
      id: "GALAGA" as GameType,
      title: "GALAGA",
      year: "1981",
      desc: "Slide dynamically across space borders and blast alien grids. Evade coordinate dive-bombing kamikaze scouts scaling and twisting down around you.",
      color: "border-blue-500 text-blue-400 bg-blue-950/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
      badgeColor: "bg-blue-500/20 text-blue-400",
      accent: "bg-blue-500",
      icon: "🚀"
    },
    {
      id: "SPACEINVADERS" as GameType,
      title: "SPACE INVADERS",
      year: "1978",
      desc: "Retro defending battle action. Blast ranks of approaching extraterrestrials that march down closer progressively. Hide behind crumbling bunkers.",
      color: "border-emerald-500 text-emerald-400 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
      badgeColor: "bg-emerald-500/20 text-emerald-400",
      accent: "bg-emerald-500",
      icon: "👾"
    }
  ];

  const [hasVisitedCloset, setHasVisitedCloset] = useState(() => {
    return localStorage.getItem("arcade_visited_closet") === "true";
  });

  const unlockedCloset = 
    (highScores.PONG === 6 &&
    highScores.PACMAN === 6700 &&
    highScores.DONKEYKONG === 6700 &&
    highScores.GALAGA === 6700 &&
    highScores.SPACEINVADERS === 6700) || hasVisitedCloset;

  const themeColors = {
    amber: {
      bg: "bg-amber-500",
      textPrimary: "text-amber-500",
      textLight: "text-yellow-400",
      border: "border-amber-500",
      bgDark: "bg-amber-950",
      shadow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]",
      cabShadow: "shadow-[0_0_50px_rgba(245,158,11,0.25),_inset_0_4px_10px_rgba(255,255,255,0.1)]",
      marqueeBg: "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600",
      marqueeStripes: "bg-amber-900/40",
      title: "WAFFLE"
    },
    turtles: {
      bg: "bg-green-700",
      textPrimary: "text-green-500",
      textLight: "text-green-400",
      border: "border-amber-900",
      bgDark: "bg-amber-950",
      shadow: "shadow-[0_0_15px_rgba(34,197,94,0.4)]",
      cabShadow: "shadow-[0_0_50px_rgba(120,60,0,0.4),_inset_0_4px_10px_rgba(255,255,255,0.1)]",
      marqueeBg: "bg-gradient-to-r from-[#4e342e] via-[#388e3c] to-[#4e342e]",
      marqueeStripes: "bg-[#27100b]/60",
      title: "TURTLES"
    }
  };
  const theme = isBackCloset ? themeColors.turtles : themeColors.amber;

  const activeScores = isBackCloset ? turtleHighScores : highScores;

  const applyGlitch = isBackCloset && activeGame === null;

  return (
    <div id="arcade-app-root" className={`min-h-screen ${isBackCloset ? "bg-[#3e2723]" : "bg-zinc-950"} text-white flex flex-col items-center justify-start py-8 px-4 font-sans select-none overflow-x-hidden`}>
      
      {/* Upper branding and stats dashboard */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        {/* Logo and Credits */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 text-black rounded-lg ${applyGlitch ? 'glitch-jitter' : 'animate-pulse'} ${theme.bg} ${theme.shadow}`}>
            <Gamepad2 id="app-logo-icon" size={28} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-widest font-mono flex items-center gap-2 ${theme.textPrimary} ${applyGlitch ? 'glitch-text-1' : ''}`}>
              {theme.title} <span className="text-white">ARCADE</span>
            </h1>
            <p className={`text-zinc-500 text-xs font-mono ${applyGlitch ? 'glitch-text-2' : ''}`}>1980s Retro Canvas Machine Simulator</p>
          </div>
        </div>

        {/* Global Machine Diagnostics */}
        <div className="flex items-center gap-4 bg-zinc-900 border-2 border-zinc-800 p-3 rounded-xl font-mono text-sm max-w-sm">
          <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3.5">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-zinc-400 text-xs">CREDITS:</span>
            <span className="text-yellow-400 font-bold text-base">{cabinetCoins}</span>
          </div>
          <button 
            id="global-mute-btn"
            onClick={() => setIsMuted(!isMuted)} 
            className="p-1 hover:bg-zinc-800 rounded transition duration-200 cursor-pointer flex items-center gap-1"
          >
            {isMuted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-green-500" />}
            <span className="text-[10px] text-zinc-500 hidden sm:inline">{isMuted ? "MUTED" : "SOUNDS"}</span>
          </button>
          <button 
            onClick={() => setScanlineEnabled(!scanlineEnabled)} 
            className="p-1 hover:bg-zinc-800 rounded transition duration-200 cursor-pointer flex items-center gap-1"
          >
            <span className={`text-[10px] hidden sm:inline ${scanlineEnabled ? "text-blue-400" : "text-zinc-500"}`}>CRT: {scanlineEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main ARCADE CABINET wrapper */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left side: Cabinet Panel (12-column span-9 on desktop) */}
        <div className="col-span-1 lg:col-span-9 flex flex-col items-center">
          
          {/* Physical Arcade Wooden Frame */}
          <div className={`w-full relative animate-arcade-glow rounded-3xl border-[8px] overflow-hidden flex flex-col ${theme.bgDark} ${theme.border} ${theme.cabShadow} ${applyGlitch ? 'glitch-container' : ''}`}>
            {applyGlitch && <div className="absolute inset-0 z-50 pointer-events-none flicker-overlay rounded-[20px]" />}
            
            {/* CABINET UPPER MARQUEE (Classic Glowing Signboard) */}
            <div className={`border-b-[6px] border-zinc-950 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden ${theme.marqueeBg}`}>
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
              {/* Retro striping */}
              <div className={`absolute -left-10 top-0 bottom-0 w-32 skew-x-30 ${theme.marqueeStripes}`}></div>
              <div className={`absolute -right-10 top-0 bottom-0 w-32 skew-x-30 ${theme.marqueeStripes}`}></div>
              
              <h2 className="text-4xl md:text-5xl font-black italic tracking-widest text-black/80 font-mono select-none drop-shadow-[0_2px_4px_rgba(255,255,255,0.7)]">
                ★ {theme.title} ARCADE ★
              </h2>
              <p className="text-black/80 font-bold font-mono tracking-widest text-[11px] mt-1 space-x-2">
                <span>INSERT COIN</span> • <span>SELECT SYSTEM</span> • <span>START</span>
              </p>
            </div>

            {/* SCREEN PORTAL (The CTR Bezel Framing) */}
            <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center relative border-b-8 border-zinc-950">
              
              {/* CRT Glass Overlay reflections & curves */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.04] pointer-events-none rounded-2xl z-20"></div>

              {/* ACTIVE MACHINE GRAPHIC SCREEN */}
              <div 
                className={`w-full flex items-center justify-center aspect-[3/2] rounded-2xl border-4 border-zinc-950 bg-black overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] ${applyGlitch ? 'glitch-jitter' : ''}`}
              >
                
                {/* Scanline flickering glass look */}
                {scanlineEnabled && <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.07] z-10"></div>}

                {activeGame === null ? (
                  /* SYSTEM MENU HUB SELECTOR */
                  <div className="absolute inset-0 flex flex-col justify-between p-6 overflow-y-auto bg-zinc-950 font-mono">
                    <div className="text-center py-4">
                      <div className="inline-block px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs mb-2 tracking-widest animate-pulse max-w-max mx-auto">
                        MAIN CABINET MENU
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white tracking-widest">CHOOSE GAME</h3>
                      <p className="text-zinc-500 text-[11px] mt-1">Please insert coin credits to boot game engine</p>
                    </div>

                    {/* Difficulty selector (Physical Dial) */}
                    <div className="flex flex-col items-center gap-1 mb-4">
                       <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1 drop-shadow-md">DIFFICULTY DIAL</div>
                       <div className="relative w-16 h-16 bg-zinc-900 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.05)] border-[3px] border-zinc-950 flex items-center justify-center group cursor-pointer"
                          onClick={(e) => { 
                             e.stopPropagation();
                             const diffs = ["EASY", "MEDIUM", "HARD"] as const;
                             const next = diffs[(diffs.indexOf(globalDifficulty) + 1) % diffs.length];
                             setGlobalDifficulty(next); 
                             synth.playBounce(); 
                          }}
                       >
                          {/* Ticks & Labels */}
                          <div className="absolute top-1 left-1.5 text-[7px] font-black text-green-500/60 -rotate-[40deg]">EZ</div>
                          <div className="absolute top-0 text-[7px] font-black text-yellow-500/60">MD</div>
                          <div className="absolute top-1 right-1 text-[7px] font-black text-red-500/60 rotate-[40deg]">HD</div>
                          
                          {/* The Knob */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-950 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)] relative transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center"
                               style={{ transform: `rotate(${globalDifficulty === 'EASY' ? -45 : globalDifficulty === 'MEDIUM' ? 0 : 45}deg)` }}>
                             {/* Grip Texture */}
                             <div className="absolute inset-0.5 rounded-full border-[2px] border-dashed border-zinc-950 opacity-20 pointer-events-none"></div>
                             {/* Red Indicator indent */}
                             <div className="absolute top-1 w-1.5 h-3 bg-red-500 rounded-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_0_5px_rgba(239,68,68,0.5)]"></div>
                          </div>
                       </div>
                       <div className="h-4 flex items-center justify-center px-2 py-0.5 bg-black/40 rounded border border-zinc-800 mt-1">
                          {globalDifficulty === 'EASY' && <span className="text-[9px] text-green-400 font-black tracking-widest drop-shadow-[0_0_4px_#22c55e]">EASY</span>}
                          {globalDifficulty === 'MEDIUM' && <span className="text-[9px] text-yellow-400 font-black tracking-widest drop-shadow-[0_0_4px_#eab308]">MEDIUM</span>}
                          {globalDifficulty === 'HARD' && <span className="text-[9px] text-red-500 font-black tracking-widest drop-shadow-[0_0_4px_#ef4444]">HARD</span>}
                       </div>
                    </div>

                    {/* Bento grid game scroll view */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 px-1">
                      {gamesList.map((g, index) => {
                        const hasCredits = cabinetCoins > 0;
                        return (
                          <div 
                            key={g.id}
                            id={`game-card-${g.id}`}
                            onClick={() => handleSelectGame(g.id)}
                            className={`border-2 p-3.5 rounded-xl transition duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer group ${g.color} hover:scale-[1.02] ${isBackCloset ? 'glitch-card' : ''}`}
                            style={isBackCloset ? { animationDuration: `${6 + (index % 3) * 1.7}s`, animationDelay: `${(index * 1.3) % 4}s` } : {}}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-2xl">{g.icon}</span>
                                <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold ${g.badgeColor}`}>
                                  {g.year}
                                </span>
                              </div>
                              <h4 className="text-base font-black tracking-wider text-white group-hover:text-yellow-400 transition-colors">
                                <GlitchText text={g.title} active={isBackCloset} />
                              </h4>
                              <p className="text-zinc-400 text-[10px] leading-relaxed mt-1 line-clamp-3">
                                <GlitchText text={g.desc} active={isBackCloset} />
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-zinc-800/60">
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Trophy size={11} className="text-yellow-500/80" />
                                HIGH: <span className="text-zinc-300 font-bold">{activeScores[g.id]}</span>
                              </span>
                              <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                <Play size={10} className="fill-yellow-400" />
                                {hasCredits ? "START" : "INSERT COIN"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cabinet Status strip */}
                    <div className="border-t border-zinc-900 pt-3 text-center flex items-center justify-center gap-4">
                      {cabinetCoins === 0 && (
                        <button
                          id="insert-coin-prompt-btn"
                          onClick={insertCoin}
                          className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm tracking-widest rounded-lg border-2 border-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all animate-bounce cursor-pointer"
                        >
                          INSERT 25¢ COIN (ENTER)
                        </button>
                      )}
                      {cabinetCoins > 0 && (
                        <div className="text-green-400 text-xs tracking-widest animate-pulse font-bold">
                          READY COINS: {cabinetCoins} • CLICK A GAME TO LOAD STATE
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* RUNNING ACTIVE GAME ENGINE PANEL */
                  <div className="absolute inset-0 w-full h-full">
                    {/* Header return controller */}
                    <div className="absolute top-2.5 right-3 z-30">
                      <button
                        id="exit-game-nav-btn"
                        onClick={requestExit}
                        className="px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800/90 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        EXIT GAME (ESC)
                      </button>
                    </div>

                    {/* Exit Confirmation Dialog */}
                    {showExitConfirm && (
                      <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
                        <div className="bg-zinc-900 border-2 border-red-500/50 rounded-xl p-6 max-w-sm w-full text-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                          <h3 className="text-red-400 font-black text-xl mb-2 flex items-center justify-center gap-2">
                            <span className="animate-pulse">⚠️</span>
                            PAUSED
                          </h3>
                          <p className="text-zinc-300 text-[10px] uppercase tracking-wider mb-6 font-mono">Are you sure you want to exit? Your current session will be lost.</p>
                          <div className="flex items-center gap-3 justify-center">
                            <button onClick={cancelExit} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono font-bold text-xs transition cursor-pointer">RESUME</button>
                            <button onClick={confirmExit} className="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-500/50 text-red-100 rounded font-mono font-bold text-xs transition cursor-pointer">QUIT</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MOUNT SELECT GAME IF CORRESPONDING */}
                    {activeGame === "PONG" && (
                      <Pong 
                        keyboardState={keyboardState} 
                        highScore={activeScores.PONG} 
                        onGameOver={handleGameOver} 
                        isBackCloset={isBackCloset}
                        difficulty={globalDifficulty}
                        isPaused={showExitConfirm}
                      />
                    )}
                    {activeGame === "PACMAN" && (
                      <Pacman 
                        keyboardState={keyboardState} 
                        highScore={activeScores.PACMAN} 
                        onGameOver={handleGameOver} 
                        isBackCloset={isBackCloset}
                        difficulty={globalDifficulty}
                        isPaused={showExitConfirm}
                      />
                    )}
                    {activeGame === "DONKEYKONG" && (
                      <DonkeyKong 
                        keyboardState={keyboardState} 
                        highScore={activeScores.DONKEYKONG} 
                        onGameOver={handleGameOver} 
                        isBackCloset={isBackCloset}
                        difficulty={globalDifficulty}
                        isPaused={showExitConfirm}
                      />
                    )}
                    {activeGame === "GALAGA" && (
                      <Galaga 
                        keyboardState={keyboardState} 
                        highScore={activeScores.GALAGA} 
                        onGameOver={handleGameOver} 
                        isBackCloset={isBackCloset}
                        difficulty={globalDifficulty}
                        isPaused={showExitConfirm}
                      />
                    )}
                    {activeGame === "SPACEINVADERS" && (
                      <SpaceInvaders 
                        keyboardState={keyboardState} 
                        highScore={activeScores.SPACEINVADERS} 
                        onGameOver={handleGameOver} 
                        isBackCloset={isBackCloset}
                        difficulty={globalDifficulty}
                        isPaused={showExitConfirm}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LOWER CONTROLS DECK PANEL (Vintage joystick + grid buttons) */}
            <div className={`bg-zinc-950 p-6 px-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t-4 ${theme.border}`}>
              
              {/* JOYSTICK CONTROLLER */}
              <div className="flex flex-col items-center gap-1 bg-zinc-900 border-2 border-zinc-800 p-4 rounded-2xl min-w-[160px]">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500">D-PAD ARROWS</span>
                
                {/* 4-way direction pad layout */}
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <div />
                  <button
                    id="joy-up-btn"
                    onMouseDown={() => pressVirtualKey("ArrowUp", true)}
                    onMouseUp={() => pressVirtualKey("ArrowUp", false)}
                    onTouchStart={() => pressVirtualKey("ArrowUp", true)}
                    onTouchEnd={() => pressVirtualKey("ArrowUp", false)}
                    className={`nav-button-up w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-zinc-300 border-2 transition ${keyboardState.ArrowUp ? "bg-yellow-500 text-black border-yellow-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}
                  >
                    ▲
                  </button>
                  <div />
                  
                  <button
                    id="joy-left-btn"
                    onMouseDown={() => pressVirtualKey("ArrowLeft", true)}
                    onMouseUp={() => pressVirtualKey("ArrowLeft", false)}
                    onTouchStart={() => pressVirtualKey("ArrowLeft", true)}
                    onTouchEnd={() => pressVirtualKey("ArrowLeft", false)}
                    className={`nav-button-left w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-zinc-300 border-2 transition ${keyboardState.ArrowLeft ? "bg-yellow-500 text-black border-yellow-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}
                  >
                    ◄
                  </button>
                  <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <CircleDot size={14} className="text-zinc-600" />
                  </div>
                  <button
                    id="joy-right-btn"
                    onMouseDown={() => pressVirtualKey("ArrowRight", true)}
                    onMouseUp={() => pressVirtualKey("ArrowRight", false)}
                    onTouchStart={() => pressVirtualKey("ArrowRight", true)}
                    onTouchEnd={() => pressVirtualKey("ArrowRight", false)}
                    className={`nav-button-right w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-zinc-300 border-2 transition ${keyboardState.ArrowRight ? "bg-yellow-500 text-black border-yellow-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}
                  >
                    ►
                  </button>

                  <div />
                  <button
                    id="joy-down-btn"
                    onMouseDown={() => pressVirtualKey("ArrowDown", true)}
                    onMouseUp={() => pressVirtualKey("ArrowDown", false)}
                    onTouchStart={() => pressVirtualKey("ArrowDown", true)}
                    onTouchEnd={() => pressVirtualKey("ArrowDown", false)}
                    className={`nav-button-down w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-zinc-300 border-2 transition ${keyboardState.ArrowDown ? "bg-yellow-500 text-black border-yellow-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}
                  >
                    ▼
                  </button>
                  <div />
                </div>
              </div>

              {/* COIN SLOT TRIGGER & START BUTTONS */}
              <div className="flex items-center gap-4 border border-zinc-800 p-4 rounded-2xl bg-zinc-900/60">
                <button
                  id="insert-coin-physical-btn"
                  onClick={insertCoin}
                  className={`px-4 py-3.5 bg-zinc-950 hover:bg-zinc-900 rounded-xl border border-zinc-800 text-center flex flex-col items-center justify-center gap-1 cursor-pointer min-w-[90px] shadow-inner group ${applyGlitch ? 'glitch-button' : ''}`}
                >
                  <Coins className="text-yellow-500 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[9px] font-mono tracking-widest text-[#ef4444] font-bold">25¢ INSERT</span>
                </button>

                <button
                  id="start-physical-btn"
                  onMouseDown={() => pressVirtualKey("Enter", true)}
                  onMouseUp={() => pressVirtualKey("Enter", false)}
                  onTouchStart={() => pressVirtualKey("Enter", true)}
                  onTouchEnd={() => pressVirtualKey("Enter", false)}
                  className={`px-5 py-3.5 rounded-xl border-2 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-[90px] ${keyboardState.Enter ? "bg-green-500 text-black border-green-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"} ${applyGlitch ? 'glitch-button' : ''}`}
                >
                  <Play size={18} className={keyboardState.Enter ? "text-black fill-black" : "text-green-500 fill-green-500"} />
                  <span className="text-[10px] font-mono tracking-widest font-extrabold">START</span>
                </button>
              </div>

              {/* PRIMARY ACTION BUTTONS GRIDS */}
              <div className="flex gap-4">
                {/* Button B - Primary action (Black styled with yellow shell) */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    id="button-b-trigger"
                    onMouseDown={() => pressVirtualKey("KeyX", true)}
                    onMouseUp={() => pressVirtualKey("KeyX", false)}
                    onTouchStart={() => pressVirtualKey("KeyX", true)}
                    onTouchEnd={() => pressVirtualKey("KeyX", false)}
                    className={`w-14 h-14 rounded-full border-4 font-mono font-black text-lg shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer active:translate-y-1 transition-all ${keyboardState.KeyX ? "bg-zinc-600 border-yellow-400 text-yellow-400 scale-95" : "bg-zinc-950 border-yellow-500 text-yellow-500 hover:bg-zinc-900"}`}
                  >
                    B
                  </button>
                  <span className="text-[9px] font-mono text-zinc-500">ACTION B (X)</span>
                </div>

                {/* Button A - Fire/Jump primary (Bright Yellow) */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    id="button-a-trigger"
                    onMouseDown={() => pressVirtualKey("KeyZ", true)}
                    onMouseUp={() => pressVirtualKey("KeyZ", false)}
                    onTouchStart={() => pressVirtualKey("KeyZ", true)}
                    onTouchEnd={() => pressVirtualKey("KeyZ", false)}
                    className={`w-14 h-14 rounded-full border-4 font-mono font-black text-lg text-black shadow-[0_4px_10px_rgba(234,179,8,0.3)] flex items-center justify-center cursor-pointer active:translate-y-1 transition-all ${keyboardState.KeyZ ? "bg-yellow-600 border-yellow-300 scale-95" : "bg-yellow-400 border-yellow-300 hover:bg-yellow-300"}`}
                  >
                    A
                  </button>
                  <span className="text-[9px] font-mono text-zinc-500">ACTION A (Z / Space)</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right side: High Score and System Statistics (12-column span-3 on desktop) */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          
          {/* HIGH SCORE DASHBOARD */}
          <div className="bg-zinc-900 border-2 border-yellow-500 rounded-2xl p-5 shadow-lg flex flex-col">
            <h3 className="text-yellow-400 font-mono font-black text-sm tracking-wider flex items-center gap-2 mb-4">
              <Trophy size={16} />
              SYSTEM HIGHSCORES
            </h3>

            <div className="space-y-3.5 font-mono">
              <div className={`p-3 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-between ${applyGlitch ? 'glitch-card' : ''}`} style={applyGlitch ? { animationDuration: '5s', animationDelay: '0s' } : {}}>
                <div>
                  <span className="text-[10px] text-zinc-500 block">PONG</span>
                  
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">MATCH WINS</span>
                  <span className="text-base text-zinc-200 font-black">{activeScores.PONG}</span>
                </div>
              </div>

              <div className={`p-3 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-between ${applyGlitch ? 'glitch-card' : ''}`} style={applyGlitch ? { animationDuration: '7.1s', animationDelay: '2.5s' } : {}}>
                <div>
                  <span className="text-[10px] text-zinc-500 block">PAC-MAN</span>
                  
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">SCORE</span>
                  <span className="text-base text-zinc-200 font-black">{activeScores.PACMAN}</span>
                </div>
              </div>

              <div className={`p-3 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-between ${applyGlitch ? 'glitch-card' : ''}`} style={applyGlitch ? { animationDuration: '9.2s', animationDelay: '0s' } : {}}>
                <div>
                  <span className="text-[10px] text-zinc-500 block">DONKEY KONG</span>
                  
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">SCORE</span>
                  <span className="text-base text-zinc-200 font-black">{activeScores.DONKEYKONG}</span>
                </div>
              </div>

              <div className={`p-3 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-between ${applyGlitch ? 'glitch-card' : ''}`} style={applyGlitch ? { animationDuration: '11.3s', animationDelay: '2.5s' } : {}}>
                <div>
                  <span className="text-[10px] text-zinc-500 block">GALAGA</span>
                  
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">SCORE</span>
                  <span className="text-base text-zinc-200 font-black">{activeScores.GALAGA}</span>
                </div>
              </div>

              <div className={`p-3 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-between ${applyGlitch ? 'glitch-card' : ''}`} style={applyGlitch ? { animationDuration: '5s', animationDelay: '0s' } : {}}>
                <div>
                  <span className="text-[10px] text-zinc-500 block">SPACE INVADERS</span>
                  
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">SCORE</span>
                  <span className="text-base text-zinc-200 font-black">{activeScores.SPACEINVADERS}</span>
                </div>
              </div>
            </div>
            
            {!showResetWarning ? (
              <button
                id="clear-logs-btn"
                onClick={() => setShowResetWarning(true)}
                className="mt-5 text-[10px] font-mono text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1 justify-center border border-zinc-800/80 py-2 rounded-lg bg-black/20 hover:bg-red-950/15 cursor-pointer"
              >
                <RotateCcw size={11} />
                RESET CABINET RECORDS
              </button>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-[10px] font-mono text-red-400 text-center">ARE YOU SURE?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const cleared = { PONG: 0, PACMAN: 0, DONKEYKONG: 0, GALAGA: 0, SPACEINVADERS: 0 };
                      if (isBackCloset) {
                        setTurtleHighScores(cleared);
                        localStorage.setItem("arcade_highscores_turtles", JSON.stringify(cleared));
                      } else {
                        setHighScores(cleared);
                        localStorage.setItem("arcade_highscores", JSON.stringify(cleared));
                      }
                      synth.playExplosion();
                      setShowResetWarning(false);
                    }}
                    className="flex-1 text-[10px] font-mono text-red-500 hover:text-white transition-colors flex items-center justify-center border border-red-900 py-1 rounded bg-red-950 hover:bg-red-600 cursor-pointer"
                  >
                    YES, DELETE
                  </button>
                  <button
                    onClick={() => setShowResetWarning(false)}
                    className="flex-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center justify-center border border-zinc-700 py-1 rounded bg-zinc-800 hover:bg-zinc-600 cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            <button
              id="view-achievements-btn"
              onClick={() => setShowAchievementsModal(true)}
              className="mt-2 text-xs font-mono font-bold text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-2 justify-center border border-yellow-500/50 py-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 cursor-pointer"
            >
              <Award size={14} />
              VIEW ALL ACHIEVEMENTS ({unlockedAchievements.length}/{ALL_ACHIEVEMENTS.length})
            </button>
          
            {isBackCloset && (
              <button
                onClick={() => {
                  const evt = new CustomEvent("leaveroom");
                  window.dispatchEvent(evt);
                  window.location.reload();
                }}
                className="mt-2 text-xs font-mono font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 justify-center border border-red-500/50 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
              >
                !!! LEAVE BACK CLOSET !!!
              </button>
            )}
            </div>

          {/* SYSTEM GUIDELINES */}
            <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col font-mono">
              <h4 className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-yellow-400" />
                HOW TO PLAY
              </h4>
              <ul className="text-[10.5px] text-zinc-500 space-y-2.5 leading-snug">
                <li>
                  <strong className="text-zinc-300">1. INSERT COIN:</strong> Tap the red coin slot or press <strong className="text-yellow-500">Enter / Click coin</strong> to deposit credits first.
                </li>
                <li>
                  <strong className="text-zinc-300">2. MOUSE & TOUCHES:</strong> Fully play on mobile using the virtual cabinet joystick and yellow buttons below the screen! Good touch interfaces.
                </li>
                <li>
                  <strong className="text-zinc-300">3. KEYBOARD KEYS:</strong> Use <strong className="text-yellow-500">▲ ▼ ◄ ►</strong> arrows + <strong className="text-yellow-500">Z</strong> key for action A (Shoot/Jump) and <strong className="text-yellow-500">X</strong> for action B.
                </li>
                <li>
                  <strong className="text-zinc-300">4. ESCAPE KEY:</strong> Instantly exit play state back to the arcade selection room using the <strong className="text-yellow-500">ESC</strong> key!
                </li>
              </ul>
            </div>

        </div>

      </div>
      
      {/* Achievements Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {activeAchievements.map(ach => {
           const isGlitch = ach.id === "back_closet";
           return (
           <div key={ach.id} className={`w-80 rounded p-4 border-2 animate-slide-in-right flex items-start gap-4 ${isGlitch ? 'bg-black border-red-800 shadow-[0_0_20px_rgba(220,38,38,0.5)] glitch-jitter' : 'bg-zinc-900 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]'}`}>
              <div className={`p-2 rounded-full border ${isGlitch ? 'bg-red-900/20 border-red-500/50' : 'bg-yellow-500/20 border-yellow-500/50'}`}>
                 <Award className={isGlitch ? "text-red-600" : "text-yellow-400"} size={24} />
              </div>
              <div className="flex-1">
                 <h4 className={`font-bold text-sm tracking-widest uppercase mb-1 ${isGlitch ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-purple-800 font-serif rotate-1' : 'text-yellow-400'}`}>
                    {isGlitch ? 'T̸̅̚H̵̾̇Ḛ̴̐ ̷̆͝B̵̀̚A̷̓̈C̵͒̏K̷̈́͛ ̸͒̄C̴̎̍L̷͐̊O̵̿̅S̵̈́̊E̷̓̂T̸̈̀' : ach.title}
                 </h4>
                 <p className={`text-xs opacity-90 ${isGlitch ? 'text-red-500 font-mono tracking-tighter mix-blend-screen' : 'text-white'}`}>
                    {isGlitch ? 'E̶R̵R̷O̷R̴:̷ ̴U̸N̴K̸N̷O̷W̸N̴ ̷V̸O̵I̵D̵ ̵D̶E̸T̴E̶C̸T̸E̴D̷ ̴!̵!̵!̵' : ach.text}
                 </p>
              </div>
           </div>
        )})}
      </div>

      {showAchievementsModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border-4 border-yellow-500 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.2)] flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b-2 border-zinc-800">
               <h2 className="text-yellow-400 font-mono font-black text-2xl tracking-widest flex items-center gap-3">
                 <Award size={28} />
                 ACHIEVEMENTS
               </h2>
               <button onClick={() => setShowAchievementsModal(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-2">
                 <X size={24} />
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 gap-3 grid grid-cols-1 sm:grid-cols-2 content-start">
               {ALL_ACHIEVEMENTS.map(ach => {
                  const unlocked = unlockedAchievements.includes(ach.id);
                  return (
                     <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${unlocked ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]' : 'bg-black/40 border-zinc-900 opacity-60'}`}>
                        <div className={`p-3 rounded-full border ${unlocked ? 'bg-yellow-500 border-yellow-300 text-black shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-zinc-700 text-zinc-700'}`}>
                           <Award size={24} />
                        </div>
                        <div className="flex-1 font-mono">
                           <span className="text-[10px] text-zinc-500 block mb-1">{ach.game.toUpperCase()}</span>
                           <h4 className={`font-bold tracking-wider mb-1 ${unlocked ? 'text-yellow-400' : 'text-zinc-600'} ${ach.id === 'back_closet' ? 'glitch-jitter bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-purple-500 to-red-600 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]' : ''}`}>{ach.id === 'back_closet' ? 'T̸̅̚H̵̾̇Ḛ̴̐ ̷̆͝B̵̀̚A̷̓̈C̵͒̏K̷̈́͛ ̸͒̄C̴̎̍L̷͐̊O̵̿̅S̵̈́̊E̷̓̂T̸̈̀' : ach.title}</h4>
                           <p className={`text-xs ${unlocked ? 'text-zinc-300' : 'text-zinc-700'} ${ach.id === 'back_closet' ? 'font-mono text-red-500/80 mix-blend-screen' : ''}`}>{ach.id === 'back_closet' ? 'E̶R̵R̷O̷R̴:̷ ̴U̸N̴K̸N̷O̷W̸N̴ ̷V̸O̵I̵D̵ ̵D̶E̸T̴E̶C̸T̸E̴D̷ ̴!̵!̵!̵' : ach.description}</p>
                        </div>
                     </div>
                  );
               })}
            </div>
          </div>
        </div>
      )}

      {/* Waffle AI Tips Assistant */}
      <WaffleAI activeGame={activeGame} isBackCloset={isBackCloset} />

      {unlockedCloset && !isBackCloset && (
        <div className="w-full max-w-5xl mt-6 flex justify-center animate-fade-in">
          <button 
            onClick={() => {
              setIsBackCloset(true);
              setHasVisitedCloset(true);
              localStorage.setItem("arcade_visited_closet", "true");
              window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "back_closet", title: "SECRET ROOM", text: "Discover the back closet" } }));
            }}
            className="px-8 py-4 bg-zinc-900 border-2 border-red-900/50 hover:border-red-600/80 hover:bg-black text-red-500 font-mono tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] cursor-pointer text-sm"
          >
            Go to the Back Closet?
          </button>
        </div>
      )}

      {/* Debug Menu */}
      {showDebugMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-yellow-500 rounded-xl p-6 w-full max-w-sm font-mono shadow-[0_0_30px_rgba(234,179,8,0.3)] max-h-[80vh] overflow-y-auto">
            <h3 className="text-yellow-400 font-bold mb-4">DEBUG MENU</h3>

            <div className="flex border-b border-zinc-800 mb-4 gap-4 pb-2">
               <button className={`text-xs ${debugTab === 'SCORES' ? 'text-yellow-400 font-bold border-b border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setDebugTab('SCORES')}>GAME & SCORES</button>
               <button className={`text-xs ${debugTab === 'ACHIEVEMENTS' ? 'text-yellow-400 font-bold border-b border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setDebugTab('ACHIEVEMENTS')}>ACHIEVEMENTS</button>
            </div>

            {debugTab === 'SCORES' && (
              <>
                <div className="mb-6">
                  <h4 className="text-yellow-500 font-bold mb-2">OVERRIDE SCORES (CABINET)</h4>
                  <div className="flex flex-col gap-3">
                    {Object.keys(activeScores).map((game) => (
                      <div key={game} className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">{game}</span>
                        <input 
                          type="number" 
                          value={activeScores[game as GameType]} 
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value) || 0;
                            if (isBackCloset) {
                              const nextHighscores = { ...turtleHighScores, [game]: newScore };
                              setTurtleHighScores(nextHighscores);
                              localStorage.setItem("arcade_highscores_turtles", JSON.stringify(nextHighscores));
                            } else {
                              const nextHighscores = { ...highScores, [game]: newScore };
                              setHighScores(nextHighscores);
                              localStorage.setItem("arcade_highscores", JSON.stringify(nextHighscores));
                            }
                          }}
                          className="w-24 bg-black border border-zinc-700 px-2 py-1 text-white text-right outline-none focus:border-yellow-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {activeGame && (
                  <div className="mb-6">
                    <h4 className="text-yellow-500 font-bold mb-2">ACTIVE GAME HACKS ({activeGame})</h4>
                    {activeGame === 'DONKEYKONG' && (
                      <div className="flex flex-col gap-2 border-l border-zinc-800 pl-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'DONKEYKONG', updates:{score:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Level (1+)</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'DONKEYKONG', updates:{level:parseInt(e.target.value)||1}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex flex-col gap-1">
                           <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-400">Stage Seq Idx (0-5)</span>
                             <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'DONKEYKONG', updates:{stageIndex:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                           </div>
                           <span className="text-[9px] text-zinc-500 leading-tight">
                             Index of stage type within the level's progression.<br/>
                             Types: 0=Barrels, 1=Conveyors/Elevators (varies), Last=Rivets
                           </span>
                        </div>
                      </div>
                    )}
                    {activeGame === 'PACMAN' && (
                      <div className="flex flex-col gap-2 border-l border-zinc-800 pl-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'PACMAN', updates:{score:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Level (1+)</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'PACMAN', updates:{level:parseInt(e.target.value)||1}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                      </div>
                    )}
                    {activeGame === 'GALAGA' && (
                      <div className="flex flex-col gap-2 border-l border-zinc-800 pl-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'GALAGA', updates:{score:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Level (1+)</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'GALAGA', updates:{level:parseInt(e.target.value)||1}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                      </div>
                    )}
                    {activeGame === 'SPACEINVADERS' && (
                      <div className="flex flex-col gap-2 border-l border-zinc-800 pl-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'SPACEINVADERS', updates:{score:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Level (1+)</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'SPACEINVADERS', updates:{level:parseInt(e.target.value)||1}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                      </div>
                    )}
                    {activeGame === 'PONG' && (
                      <div className="flex flex-col gap-2 border-l border-zinc-800 pl-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">Player Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'PONG', updates:{playerScore:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-zinc-400">AI Score</span>
                           <input type="number" onChange={(e) => window.dispatchEvent(new CustomEvent('debugAction', {detail: {game: 'PONG', updates:{aiScore:parseInt(e.target.value)||0}}}))} className="w-20 bg-black border border-zinc-700 text-right px-1"/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {debugTab === 'ACHIEVEMENTS' && (
              <div className="mb-6">
                 <h4 className="text-yellow-500 font-bold mb-2">TOGGLE ACHIEVEMENTS</h4>
                 <div className="flex flex-col gap-1 pr-2">
                   {ALL_ACHIEVEMENTS.map(ach => (
                     <label key={ach.id} className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-white">
                       <input type="checkbox" checked={unlockedAchievements.includes(ach.id)} 
                         onChange={(e) => {
                           if (e.target.checked) setUnlockedAchievements(prev => [...prev, ach.id]);
                           else setUnlockedAchievements(prev => prev.filter(x => x !== ach.id));
                         }}
                       />
                       <span>{ach.id}</span>
                     </label>
                   ))}
                 </div>
              </div>
            )}

            <button 
              onClick={() => setShowDebugMenu(false)}
              className="mt-6 w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase transition"
            >
              CLOSE DBG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
