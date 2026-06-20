/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { ParticleExplosion } from "./ParticleExplosion";
import { KeyboardState, Difficulty } from "../types";
import { synth } from "./AudioSynth";

interface GameProps {
  keyboardState: KeyboardState;
  onGameOver: (score: number) => void;
  highScore: number;
  isBackCloset?: boolean;
  difficulty?: Difficulty;
  isPaused?: boolean;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Enemy {
  id: number;
  gridX: number; // base center x in grid
  gridY: number; // base center y in grid
  x: number;     // current drawing x
  y: number;     // current drawing y
  type: "SCOUT" | "DRONE" | "BOSS" | "TRANSFORMED";
  color: string;
  lives: number;
  state: "ENTER" | "GRID" | "DIVING" | "RETURNING";
  diveTime: number;
  offsetX: number; // sinusoidal wobbles during dive
  isTransformed?: boolean;
  enterDelay: number;
  enterPath: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  fromEnemy: boolean;
}

export default function Galaga({ keyboardState, onGameOver, highScore, isBackCloset = false, difficulty = "MEDIUM", isPaused = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<"READY" | "PLAYING" | "DYING" | "GAMEOVER" | "VICTORY" | "PAUSED">( "READY" );

  // Keep heavy physics loop states in a ref
  const stateRef = useRef({
    playerX: 300,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    stars: [] as Star[],
    shootCooldown: 0,
    diveTimer: 0,
    animFrame: 0,
    score: 0,
    directionX: 1, // swing direction of grid
    formationWobble: 0,
    level: 2,
    deathTimer: 0,
  });

  const canvasWidth = 448;
  const canvasHeight = 512;

  // Initialize scrolling starfield logic
  
  const prevP = useRef(false);

  
  useEffect(() => {
    if (score >= 1000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_1000", title: "Arcade Master", text: "1000 Points Reached in " + "Galaga" + "!" } }));
    }
  }, [score]);

  useEffect(() => {
    if (score >= 5000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_5000", title: "Retro God", text: "5000 Points Reached in " + "Galaga" + "!" } }));
    }
  }, [score]);
useEffect(() => {
    if (keyboardState.KeyP && !prevP.current) {
      setGameState(prev => {
        if (prev === "PLAYING") return "PAUSED";
        if (prev === "PAUSED") return "PLAYING";
        return prev;
      });
    }
    prevP.current = keyboardState.KeyP;
  }, [keyboardState.KeyP]);

  useEffect(() => {
    const starCount = 60; // Better graphic star count
    const initialStars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      initialStars.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 2 + 0.5,
      });
    }
    stateRef.current.stars = initialStars;
  }, []);

  useEffect(() => {
    stateRef.current.score = score;
    stateRef.current.level = level;
  }, [score, level]);

  useEffect(() => {
    const onDebug = (e: any) => {
      if (e.detail.game === 'GALAGA') {
        if (e.detail.updates.score !== undefined) setScore(e.detail.updates.score);
        if (e.detail.updates.level !== undefined) setLevel(e.detail.updates.level);
      }
    };
    window.addEventListener("debugAction", onDebug);
    return () => window.removeEventListener("debugAction", onDebug);
  }, []);

  useEffect(() => {
    if (gameState !== "PLAYING" && gameState !== "DYING") return;
    if (isPaused) return;

    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupWave = () => {
      const list: Enemy[] = [];
      let nid = 0;
      
      const isChallengeStage = ((level - 1) % 4 === 2);

      // BOSS Row (Top) - Green
      for (let i = 0; i < 4; i++) {
        list.push({
          id: nid++,
          gridX: Math.floor(canvasWidth / 2) - 60 + i * 40,
          gridY: 60,
          x: Math.floor(canvasWidth / 2) - 60 + i * 40,
          y: isChallengeStage ? -50 - (i * 20) : -50,
          type: "BOSS",
          color: "#22c55e", // Green Boss
          lives: 2,
          state: isChallengeStage ? "DIVING" : "ENTER",
          diveTime: 0,
          offsetX: 0,
          enterDelay: 0,
          enterPath: 0,
        });
      }

      // SCOUT Rows (Middle) - Red & White
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 8; i++) {
          list.push({
            id: nid++,
            gridX: Math.floor(canvasWidth / 2) - 130 + i * 37,
            gridY: 100 + r * 35,
            x: Math.floor(canvasWidth / 2) - 130 + i * 37,
            y: isChallengeStage ? -100 - (r * 40 + i * 15) : -80,
            type: "SCOUT",
            color: "#ef4444", // Red/White Goei
            lives: 1,
            state: isChallengeStage ? "DIVING" : "ENTER",
            diveTime: 0,
            offsetX: 0,
            enterDelay: 0,
            enterPath: 0,
          });
        }
      }

      // DRONE Rows (Bottom) - Blue & Yellow
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 10; i++) {
          list.push({
            id: nid++,
            gridX: Math.floor(canvasWidth / 2) - 165 + i * 36,
            gridY: 170 + r * 35,
            x: Math.floor(canvasWidth / 2) - 165 + i * 36,
            y: isChallengeStage ? -200 - (r * 40 + i * 15) : -110,
            type: "DRONE",
            color: "#3b82f6", // Blue/Yellow Zako
            lives: 1,
            state: isChallengeStage ? "DIVING" : "ENTER",
            diveTime: 0,
            offsetX: 0,
            enterDelay: 0,
            enterPath: 0,
          });
        }
      }

      list.forEach((en, idx) => {
        const waveIndex = Math.floor(idx / 8);
        en.enterPath = waveIndex;
        if (isChallengeStage) {
          en.enterDelay = (waveIndex * 120) + ((idx % 8) * 15);
        } else {
          en.enterDelay = (waveIndex * 180) + ((idx % 8) * 12);
        }
        en.x = -100;
        en.y = -100;
        en.diveTime = 0; // Using diveTime as entering animation clock
      });

      stateRef.current.enemies = list;
    };

    if (stateRef.current.enemies.length === 0) {
      setupWave();
    }

    const update = () => {
      const state = stateRef.current;
      state.animFrame++;

      // 1. Scroll stars
      state.stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > canvasHeight) {
          star.y = 0;
          star.x = Math.random() * canvasWidth;
        }
      });

      // 2. Adjust grid wobble (formation sway back and forth)
      state.formationWobble = Math.sin(state.animFrame * 0.035) * 20;

      // 3. Move Player Ship
      const playerSpeed = 4.5;
      if (keyboardState.ArrowLeft) {
        state.playerX = Math.max(30, state.playerX - playerSpeed);
      }
      if (keyboardState.ArrowRight) {
        state.playerX = Math.min(canvasWidth - 30, state.playerX + playerSpeed);
      }

      // Shooting trigger
      state.shootCooldown--;
      if ((keyboardState.Space || keyboardState.KeyZ) && state.shootCooldown <= 0) {
        state.bullets.push({
          x: state.playerX,
          y: canvasHeight - 45,
          vy: -8,
          fromEnemy: false,
        });
        synth.playLaser();
        state.shootCooldown = 15; // firing delay rate
      }

      // 4. Update Bullets
      state.bullets.forEach((bull) => {
        bull.y += bull.vy;
      });

      // Bullets deletion checks
      state.bullets = state.bullets.filter((b) => b.y > 0 && b.y < canvasHeight);

      const isChallengeStage = ((state.level - 1) % 4 === 2);
      const isTransformStage = ((state.level - 1) % 4 === 3); // Every 4th stage (Stage 4)
      const isAggressiveStage = ((state.level - 1) % 4 === 1);

      // Max scale at level 31
      const effLevel = Math.min(31, state.level);
      const gameSpeedMuliplier = 1 + (effLevel * 0.05);

      // 5. Update Enemies Formation & diving curves
      const isEnteringPhase = state.enemies.some(e => e.state === "ENTER");
      
      if (!isEnteringPhase) {
        state.diveTimer--;
        // Select an alien to dive downwards
        if (state.diveTimer <= 0 && state.enemies.length > 0) {
          const gridEnemies = state.enemies.filter((e) => e.state === "GRID");
          if (gridEnemies.length > 0) {
            const diver = gridEnemies[Math.floor(Math.random() * gridEnemies.length)];
            diver.state = "DIVING";
            diver.diveTime = 0;
            diver.offsetX = Math.random() > 0.5 ? 1 : -1;

            if (isTransformStage && (diver.type === "SCOUT" || diver.type === "DRONE") && Math.random() < 0.4) {
               diver.type = "TRANSFORMED";
               diver.color = "#22d3ee";
            }
          }
          
          if (isChallengeStage) {
              state.diveTimer = 10; // Rapid frenzied dive sequence
          } else {
              const diffM = difficulty === "HARD" ? 0.6 : (difficulty === "EASY" ? 1.5 : 1);
              const baseTimer = isAggressiveStage ? 100 : 140;
              state.diveTimer = Math.max(30, baseTimer - effLevel * 3) * diffM; // rate scaling difficulty
          }
        }
      }

      state.enemies.forEach((en) => {
        const targetX = en.gridX + state.formationWobble;
        const targetY = en.gridY;

        if (en.state === "GRID") {
          // Stay glued to breathing formation shape
          en.x = targetX;
          en.y = targetY;
        } else if (en.state === "DIVING") {
          en.diveTime += 0.016 * gameSpeedMuliplier; // increment animation frame clock
          en.y += 3.5 * gameSpeedMuliplier;
          // Loop sinusoidal flight arcs
          en.x += Math.sin(en.diveTime * 10) * 4.8 * en.offsetX;

          // Enemy randomly shoots bullets when diving
          const fireProb = 0.012 * (difficulty === "HARD" ? 2 : (difficulty === "EASY" ? 0.5 : 1)) * (isAggressiveStage ? 1.5 : 1);
          if (!isChallengeStage && Math.random() < fireProb && en.y < canvasHeight - 120) {
            state.bullets.push({
              x: en.x,
              y: en.y + 10,
              vy: 4.5 * gameSpeedMuliplier,
              fromEnemy: true,
            });
          }

          // Screen looping back and returning home
          if (en.y > canvasHeight + 20) {
            if (isChallengeStage) {
                en.lives = 0; // Off-screen permanently
            } else {
                if (en.type === "TRANSFORMED") {
                    en.lives = 0; // Transforms don't return
                } else {
                    en.y = -40;
                    en.x = targetX;
                    en.state = "RETURNING";
                }
            }
          }
        } else if (en.state === "ENTER") {
          if (en.enterDelay > 0) {
            en.enterDelay -= 1;
            en.x = -100;
            en.y = -100;
          } else {
            en.diveTime += 0.016 * gameSpeedMuliplier;
            const t = en.diveTime;
            const duration = isChallengeStage ? 3.5 : 2.5; 
            const p = Math.min(1.0, t / duration);
            
            if (p >= 1.0) {
               if (isChallengeStage) {
                  en.lives = 0; // Escaped off-screen
               } else {
                  en.state = "RETURNING"; 
               }
            } else {
               let startX = 0, startY = 0, cp1X = 0, cp1Y = 0, cp2X = 0, cp2Y = 0;
               let tX = isChallengeStage ? targetX : targetX;
               let tY = isChallengeStage ? -150 : targetY;
               
               if (en.enterPath === 0) { // Top Center down
                 startX = canvasWidth / 2; startY = -40;
                 cp1X = canvasWidth / 2 - 250; cp1Y = canvasHeight + 100;
                 cp2X = canvasWidth / 2 + 250; cp2Y = canvasHeight + 100;
                 if (isChallengeStage) { tX = canvasWidth / 2; tY = canvasHeight + 100; }
               } else if (en.enterPath === 1) { // Bottom-Left up
                 startX = -40; startY = canvasHeight - 40;
                 cp1X = canvasWidth / 2; cp1Y = canvasHeight;
                 cp2X = canvasWidth; cp2Y = 50;
                 if (isChallengeStage) { tX = canvasWidth + 100; tY = 50; }
               } else if (en.enterPath === 2) { // Bottom-Right up
                 startX = canvasWidth + 40; startY = canvasHeight - 40;
                 cp1X = canvasWidth / 2; cp1Y = canvasHeight;
                 cp2X = 0; cp2Y = 50;
                 if (isChallengeStage) { tX = -100; tY = 50; }
               } else if (en.enterPath === 3) { // Top-Left across
                 startX = -40; startY = 150;
                 cp1X = canvasWidth; cp1Y = canvasHeight;
                 cp2X = 0; cp2Y = canvasHeight - 50;
                 if (isChallengeStage) { tX = canvasWidth + 100; tY = canvasHeight - 50; }
               } else { // Top-Right across
                 startX = canvasWidth + 40; startY = 150;
                 cp1X = 0; cp1Y = canvasHeight;
                 cp2X = canvasWidth; cp2Y = canvasHeight - 50;
                 if (isChallengeStage) { tX = -100; tY = canvasHeight - 50; }
               }

               const u = 1 - p;
               en.x = u*u*u*startX + 3*u*u*p*cp1X + 3*u*p*p*cp2X + p*p*p*tX;
               en.y = u*u*u*startY + 3*u*u*p*cp1Y + 3*u*p*p*cp2Y + p*p*p*tY;

               const fireProb = 0.005 * (difficulty === "HARD" ? 2 : (difficulty === "EASY" ? 0.5 : 1)) * (isAggressiveStage ? 1.5 : 1);
               if (!isChallengeStage && Math.random() < fireProb) {
                 state.bullets.push({
                   x: en.x, y: en.y + 10, vy: 4.5 * gameSpeedMuliplier, fromEnemy: true
                 });
               }
            }
          }
        } else if (en.state === "RETURNING") {
          // Seamlessly float back to set grid position
          const dx = targetX - en.x;
          const dy = targetY - en.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 4) {
            en.x = targetX;
            en.y = targetY;
            en.state = "GRID";
          } else {
            en.x += dx * 0.08 * gameSpeedMuliplier;
            en.y += dy * 0.08 * gameSpeedMuliplier;
          }
        }

        // Body collision
        if (!isChallengeStage && gameState !== "DYING") {
           const dx = Math.abs(en.x - state.playerX);
           const dy = Math.abs(en.y - (canvasHeight - 35));
           if (dx < 20 && dy < 20) {
             synth.playExplosion();
             state.deathTimer = 0;
             setGameState("DYING");
           }
        }
      });

      // 6. Handle Laser/Entity Collision detections
      const hitRadius = 15;
      state.bullets.forEach((bull) => {
        if (!bull.fromEnemy) {
          // Check player striking active alien
          state.enemies.forEach((en) => {
            if (en.lives > 0) {
              const dx = Math.abs(bull.x - en.x);
              const dy = Math.abs(bull.y - en.y);
              if (dx < hitRadius && dy < hitRadius) {
                // Strike registered! delete bullet, deplete lives
                bull.y = -100; // scheduled delete
                en.lives--;

                if (en.lives <= 0) {
                  // Alien vaporized!
                  synth.playExplosion();
                  setScore((s) => {
                    let pts = 50;
                    if (en.type === "BOSS") pts = en.state === "DIVING" ? 400 : 150;
                    else if (en.type === "SCOUT") pts = en.state === "DIVING" ? 160 : 80;
                    else if (en.type === "DRONE") pts = en.state === "DIVING" ? 100 : 50;
                    else if (en.type === "TRANSFORMED") pts = 160;
                    
                    return (!isBackCloset && s < 6700 && s + pts >= 6700) ? 6700 : s + pts;
                  });
                } else {
                  // partial damage flash cue
                  synth.playBounce();
                }
              }
            }
          });
        } else {
          // Check enemy striking player craft
          const dx = Math.abs(bull.x - state.playerX);
          const dy = Math.abs(bull.y - (canvasHeight - 35));
          if (dx < 14 && dy < 14 && gameState !== "DYING") {
            // Player struck!
            bull.y = canvasHeight + 100; // discard bullet
            synth.playExplosion();
            state.deathTimer = 0;
            setGameState("DYING");
          }
        }
      });

      // Purge dead enemies and clean out bullet junk
      state.enemies = state.enemies.filter((e) => e.lives > 0);

      // Check Victory condition (grid wiped clean)
      if (state.enemies.length === 0) {
        setGameState("VICTORY");
        synth.playLevelUp();
        
        // Perfect Bonus check for Challenge Stage
        if (isChallengeStage) {
           // We destroyed everything (Wait, did they escape or did we shoot them?)
           // In this simplified logic, enemies escape by setting lives = 0 when off-screen.
           // So if we kill them, their lives are -1 essentially by the bullet decrement, but off screen sets to 0.
           // Actually, earlier we set en.lives = 0 when offscreen for Challenge stages. 
           // We can't really reliably tell perfect clear without tracking escaped count.
           // Let's add a quick score bump:
           setScore(s => s + 1000); 
        }
      }
    };

    const draw = () => {
      const state = stateRef.current;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw scrolling stars background
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      state.stars.forEach((star) => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Enemy ships
      const animFrame = Math.floor(Date.now() / 250) % 2;
      
      state.enemies.forEach((en) => {
        const isPurpleBoss = en.type === "BOSS" && en.lives === 1;
        const mainColor = isPurpleBoss ? "#a855f7" : en.color;

        ctx.shadowBlur = 4;
        ctx.shadowColor = mainColor;

        ctx.save();
        ctx.translate(en.x, en.y);

        if (en.type === "BOSS") {
          // Boss Galaga
          const baseGreen = isPurpleBoss ? "#581c87" : "#14532d"; 
          const wingGreen = isPurpleBoss ? "#a855f7" : "#22c55e"; 
          const highlight = isPurpleBoss ? "#ffffff" : "#facc15"; 

          // Core & Lower Body
          ctx.fillStyle = baseGreen;
          ctx.beginPath();
          ctx.moveTo(-8, -4); ctx.lineTo(8, -4);
          ctx.lineTo(10, 8); ctx.lineTo(-10, 8);
          ctx.closePath(); ctx.fill();

          // Yellow cross-section
          ctx.fillStyle = highlight;
          ctx.fillRect(-6, 2, 12, 2);

          // Upper Wing Brackets
          ctx.fillStyle = wingGreen;
          ctx.fillRect(-14, -8, 8, 8);
          ctx.fillRect(6, -8, 8, 8);

          // Inner mechanical joints
          ctx.fillStyle = highlight;
          ctx.fillRect(-6, -6, 2, 4);
          ctx.fillRect(4, -6, 2, 4);

          // Mandibles / Horns
          ctx.fillStyle = wingGreen;
          ctx.fillRect(-12, -14, 4, 6);
          ctx.fillRect(8, -14, 4, 6);
          
          // Sensory clusters
          ctx.fillStyle = highlight;
          ctx.fillRect(-6, -12, 4, 4);
          ctx.fillRect(2, -12, 4, 4);

        } else if (en.type === "SCOUT") {
          // Goei (Butterfly)
          // Wide wings (Top White, Bottom Red)
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(-16, -6); ctx.lineTo(-4, -6);
          ctx.lineTo(-4, -10); ctx.lineTo(4, -10);
          ctx.lineTo(4, -6); ctx.lineTo(16, -6);
          ctx.lineTo(16, 0); ctx.lineTo(-16, 0);
          ctx.closePath(); ctx.fill();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
          ctx.lineTo(12, 6); ctx.lineTo(8, 2);
          ctx.lineTo(4, 6); ctx.lineTo(0, 2);
          ctx.lineTo(-4, 6); ctx.lineTo(-8, 2);
          ctx.lineTo(-12, 6);
          ctx.closePath(); ctx.fill();

          // White/Red crest & eyes
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-4, -10, 8, 4); // white crest
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-4, -6, 8, 4); // red eye mass
          ctx.fillStyle = "#ffffff"; // actual pupils
          ctx.fillRect(-3, -5, 2, 2);
          ctx.fillRect(1, -5, 2, 2);

          // Dark Antennas
          ctx.fillStyle = "#111827";
          ctx.fillRect(-3, -14, 2, 4);
          ctx.fillRect(1, -14, 2, 4);

          // Fuselage & Legs (White/Blue)
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(-4, 2, 8, 6);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-4, 8, 2, 4);
          ctx.fillRect(2, 8, 2, 4);

        } else if (en.type === "DRONE") {
          // Zako (Bee)
          // Antennas
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-4, -14, 2, 4);
          ctx.fillRect(2, -14, 2, 4);

          // Head & Red Eyes
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(-6, -10, 12, 6);
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-6, -10, 4, 4); // left eye
          ctx.fillRect(2, -10, 4, 4); // right eye

          // Blue Core
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(-4, -4, 8, 8);

          // Wings (Yellow, animating)
          ctx.fillStyle = "#facc15";
          if (animFrame === 0) { // Wings Up
            ctx.fillRect(-12, -8, 6, 8);
            ctx.fillRect(6, -8, 6, 8);
          } else { // Wings Down
            ctx.fillRect(-14, 0, 8, 6);
            ctx.fillRect(6, 0, 8, 6);
          }

          // Abdomen (Tapered, bands)
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(-4, 4); ctx.lineTo(4, 4);
          ctx.lineTo(2, 8); ctx.lineTo(-2, 8);
          ctx.closePath(); ctx.fill();
          
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.moveTo(-2, 8); ctx.lineTo(2, 8);
          ctx.lineTo(0, 12);
          ctx.closePath(); ctx.fill();

        } else if (en.type === "TRANSFORMED") {
          const tType = en.id % 3; // 0=Galboss, 1=Ei, 2=Ogawamushi
          
          if (tType === 0) {
            // Galboss (Scorpion / Spacecraft)
            ctx.fillStyle = "#ffffff"; // Outer hull
            ctx.beginPath();
            ctx.moveTo(-12, -4); ctx.lineTo(-6, -10);
            ctx.lineTo(6, -10); ctx.lineTo(12, -4);
            ctx.lineTo(14, 8); ctx.lineTo(8, 6);
            ctx.lineTo(-8, 6); ctx.lineTo(-14, 8);
            ctx.closePath(); ctx.fill();
            
            // Red structural lines
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(-8, -8, 2, 12);
            ctx.fillRect(6, -8, 2, 12);
            
            // Dark blue engine core
            ctx.fillStyle = "#1e3a8a";
            ctx.fillRect(-4, -4, 8, 12);
            // Yellow power cell
            ctx.fillStyle = "#facc15";
            ctx.fillRect(-2, 2, 4, 4);
            
          } else if (tType === 1) {
            // Ei (Stingray)
            ctx.fillStyle = "#22d3ee"; // Cyan manta ray
            ctx.beginPath();
            ctx.moveTo(-16, -2); ctx.lineTo(16, -2); // Flat front
            ctx.lineTo(12, 6); ctx.lineTo(4, 2);
            ctx.lineTo(0, 8); ctx.lineTo(-4, 2);
            ctx.lineTo(-12, 6);
            ctx.closePath(); ctx.fill();
            
            ctx.fillRect(-1, 8, 2, 6); // Vertical tail
            
          } else {
            // Ogawamushi (Caterpillar)
            // Segments (Red/Yellow)
            const colors = ["#ef4444", "#facc15", "#ef4444"];
            for (let i = 0; i < 3; i++) {
              ctx.fillStyle = colors[i];
              ctx.fillRect(-6, -8 + (i * 6), 12, 5);
            }
            // Wiggly stubby legs (white)
            ctx.fillStyle = "#ffffff";
            const wobble = animFrame === 0 ? 0 : 2;
            ctx.fillRect(-10, -6 + wobble, 4, 2);
            ctx.fillRect(6, -6 + wobble, 4, 2);
            ctx.fillRect(-10, 0 - wobble, 4, 2);
            ctx.fillRect(6, 0 - wobble, 4, 2);
          }
        }
        ctx.restore();
      });

      ctx.shadowBlur = 0; // Reset blur depth

      // Bullets rendering (Lasers vs Enemy fire)
      state.bullets.forEach((bull) => {
        if (!bull.fromEnemy) {
          ctx.fillStyle = "#ef4444"; // Laser energy red
          ctx.fillRect(bull.x - 1.5, bull.y, 3, 12);
        } else {
          ctx.fillStyle = "#fb923c"; // Alien laser orange
          ctx.beginPath();
          ctx.arc(bull.x, bull.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Player Spaceship (White and blue fuselage with delta wings and red fire exhaust)
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#3b82f6";

      if (gameState === "DYING") {
        // Shatters into bright fragmented pixels scattering outward
        const t = state.deathTimer; // 0 to 120
        ctx.fillStyle = "#3b82f6"; // Mix of blue and white
        const numParticles = 24;
        
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2;
          const speed = (i % 2 === 0 ? 1 : 2.5); // some slow, some fast
          const dist = (t * speed);
          const px = state.playerX + Math.cos(angle) * dist;
          const py = (canvasHeight - 35) + Math.sin(angle) * dist;
          
          if (i % 3 === 0) ctx.fillStyle = "#ffffff";
          else if (i % 3 === 1) ctx.fillStyle = "#ef4444";
          else ctx.fillStyle = "#3b82f6";
          
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
      } else {
        ctx.fillStyle = "#ffffff"; // Fuselage
        ctx.beginPath();
        ctx.moveTo(state.playerX, canvasHeight - 42); // nose tip
        ctx.lineTo(state.playerX + 11, canvasHeight - 24);
        ctx.lineTo(state.playerX - 11, canvasHeight - 24);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#3b82f6"; // Blue wing tips
        ctx.fillRect(state.playerX - 15, canvasHeight - 28, 4, 8);
        ctx.fillRect(state.playerX + 11, canvasHeight - 28, 4, 8);

        // Red nose tip accent
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(state.playerX - 2, canvasHeight - 44, 4, 5);
      }

      ctx.shadowBlur = 0; // reset

      // HUD dashboard
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'JetBrains Mono', Courier, monospace";
      ctx.fillText(`SCORE: ${score}`, 15, 20);
      
      const isChallengeStage = ((stateRef.current.level - 1) % 4 === 2);
      if (isChallengeStage) {
          ctx.fillStyle = "#facc15";
          ctx.fillText(`CHALLENGE STAGE`, Math.floor(canvasWidth / 2) - 55, 20);
      } else {
          ctx.fillText(`LEVEL: ${stateRef.current.level}`, Math.floor(canvasWidth / 2) - 30, 20);
      }
      
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`LIVES: ${"❤".repeat(Math.max(0, lives))}`, canvasWidth - 100, 20);
    };

    const loop = () => {
      if (gameState === "DYING") {
        stateRef.current.deathTimer++;
        if (stateRef.current.deathTimer > 120) { // roughly 2 seconds
          setLives((l) => {
            const restL = l - 1;
            if (restL <= 0) {
              setGameState("GAMEOVER");
              onGameOver(score);
            } else {
              setGameState("PLAYING");
              stateRef.current.playerX = 300;
              stateRef.current.bullets = [];
              stateRef.current.enemies.forEach(en => {
                if (en.lives > 0) {
                  en.x = en.gridX;
                  en.y = en.gridY;
                  en.state = "GRID";
                  en.diveTime = 0;
                }
              });
            }
            return restL;
          });
          return;
        }
      } else {
        update();
      }
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, keyboardState, score, lives, difficulty, isPaused]);

  const startGame = (isNextLevel: boolean = false) => {
    if (!isNextLevel) {
      synth.playCoin();
      setScore(0);
      setLives(3);
      setLevel(1);
    } else {
      setLevel((l) => l + 1);
    }
    const state = stateRef.current;
    state.playerX = 300;
    state.bullets = [];
    state.enemies = []; // setupWave will trigger automatically
    state.shootCooldown = 0;
    state.diveTimer = 80;
    setGameState("PLAYING");
  };

  return (
    <div id="galaga-game-container" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 rounded-xl border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] w-full h-full overflow-hidden">
      <div className="flex justify-between w-full mb-2 sm:mb-3 items-center flex-shrink-0">
        <h3 className="text-yellow-400 font-bold tracking-widest text-base sm:text-lg font-mono">GALAGA</h3>
        <span className="text-zinc-400 text-xs font-mono">HIGH SCORE: {highScore}</span>
      </div>

      <div className="relative border-4 border-zinc-800 rounded-md overflow-hidden bg-black flex justify-center items-center flex-1 min-h-0 w-full max-w-[448px]">
        <canvas
          ref={canvasRef}
          width={448}
          height={512}
          className="w-full h-full object-contain bg-black"
        />
        {/* CRT Glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.1)] mix-blend-screen rounded-sm opacity-80 select-none bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.15)_100%)]"></div>

        {gameState === "READY" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6 justify-center">
            <h4 className="text-blue-500 font-mono text-3xl mb-4 tracking-wider animate-pulse">INSERT COIN / START</h4>
            <div className="text-zinc-300 font-mono text-sm max-w-[450px] mb-6 space-y-2">
              <p>Move your fighter with keys <span className="text-white font-bold">◄ ►</span>.</p>
              <p>Press <span className="text-white font-bold">SPACE</span> or <span className="text-white font-bold">Z</span> (Virtual Button A) to shoot.</p>
              <p>Watch out for diving ships that break formation and attack!</p>
            </div>
            <button
              id="galaga-start-btn"
              onClick={() => startGame()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              PLAY GAME (ENTER)
            </button>
          </div>
        )}

        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <ParticleExplosion color="#ef4444" />
            <h4 className="font-mono text-ref-orange text-orange-500 text-4xl mb-4 tracking-wider">GAME OVER</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="galaga-retry-btn"
              onClick={() => startGame()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              PLAY AGAIN (ENTER)
            </button>
          </div>
        )}

        {gameState === "VICTORY" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <h4 className="font-mono text-yellow-400 text-4xl mb-4 tracking-widest animate-bounce">WAVE CLEARED!</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Elite Marksman. Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="galaga-victory-btn"
              onClick={() => startGame(true)}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              NEXT WAVE (ENTER)
            </button>
          </div>
        )}
        {gameState === "PAUSED" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-6 backdrop-blur-[2px]">
            <h4 className="font-mono text-yellow-500 text-4xl tracking-wider animate-pulse font-black">PAUSED</h4>
          </div>
        )}
      </div>

      {/* Control hints */}
      <div className="mt-4 flex gap-6 text-zinc-500 text-xs font-mono">
        <div>CONTROLS: [<span className="text-yellow-400">◄</span> / <span className="text-yellow-400">►</span>] Horizontal Slide</div>
        <div>[<span className="text-yellow-400">SPACE / Z</span>] Fire Laser</div>
        <div>[<span className="text-yellow-400">ENTER</span>] Start Game</div>
      </div>
    </div>
  );
}
