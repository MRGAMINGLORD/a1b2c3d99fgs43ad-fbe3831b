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

const MODIFIERS = [
  "SECRET_WALL",
  "FIREBALL",
  "BUMPER_BALL",
  "MULTIBALL",
  "BIG_BALL_LITTLE_PADDLES",
  "FOG_ZONE",
  "GRAVITY_WELL",
  "DONT_HIT_THE_KITTY",
  "BLASTER",
  "ROBO_BATTLE",
  "FLAPPY_PONG",
  "DODGEBALL",
  "SHATTER_PADDLE",
  "BRICK_BREAKER"
];

export default function Pong({ keyboardState, onGameOver, highScore, isBackCloset = false, difficulty = "MEDIUM", isPaused = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [playerSets, setPlayerSets] = useState(0);
  const [aiSets, setAiSets] = useState(0);
  const [gameState, setGameState] = useState<"READY" | "PLAYING" | "SET_OVER" | "GAMEOVER" | "PAUSED">( "READY" );
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [secretWallHit, setSecretWallHit] = useState<number>(0);

  const paddleWidth = 10;
  const canvasWidth = 600;
  const canvasHeight = 400;

  // Key tracking for spacebar inside the game loop to act quickly
  const spacePressedRef = useRef(false);

  
  const prevP = useRef(false);

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
    // If keyboardState includes space or we do it globally
    // We already have keyboardState, let's assume it doesn't track Spacebar. We will add a local event listener for space.
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === "Space") spacePressedRef.current = true; };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") spacePressedRef.current = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const stateRef = useRef({
    playerY: 150,
    aiY: 150,
    balls: [{x: 300, y: 200, vx: 4, vy: 2}],
    playerScore: 0,
    aiScore: 0,
    playerSets: 0,
    aiSets: 0,
    activeModifiers: [] as string[],
    secretWallHit: 0,
    paddleHeightPlayer: 60,
    paddleHeightAI: 60,
    ballSize: 8,
    bumpers: [] as {x: number, y: number}[],
    kitty: null as {x: number, y: number, vx: number, vy: number, hits: number} | null,
    playerLaser: null as {x: number, y: number, vx: number} | null,
    aiLaser: null as {x: number, y: number, vx: number} | null,
    roboLaser: null as {x: number, y: number, vx: number} | null,
    strayBalls: [] as {x: number, y: number, vx: number}[],
    bricks: [] as {x: number, y: number, active: boolean}[],
    playerFlyV: 0,
    playerHits: 0, 
    aiHits: 0,
    roboHP: 5,
    blasterCooldown: 0
  });

  useEffect(() => {
    stateRef.current.playerScore = playerScore;
    stateRef.current.aiScore = aiScore;
    stateRef.current.playerSets = playerSets;
    stateRef.current.aiSets = aiSets;
    stateRef.current.activeModifiers = activeModifiers;
  }, [playerScore, aiScore, playerSets, aiSets, activeModifiers]);

  useEffect(() => {
    const onDebug = (e: any) => {
      if (e.detail.game === 'PONG') {
        if (e.detail.updates.playerScore !== undefined) setPlayerScore(e.detail.updates.playerScore);
        if (e.detail.updates.aiScore !== undefined) setAiScore(e.detail.updates.aiScore);
      }
    };
    window.addEventListener("debugAction", onDebug);
    return () => window.removeEventListener("debugAction", onDebug);
  }, []);

  useEffect(() => {
    if (gameState !== "PLAYING") return;
    if (isPaused) return;

    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pickModifiers = () => {
      if (!isBackCloset) return [];
      const count = Math.random() > 0.7 ? 2 : 1;
      const mods: string[] = [];
      const available = [...MODIFIERS];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * available.length);
        mods.push(available[idx]);
        available.splice(idx, 1);
      }
      return mods;
    };

    const resetRound = (direction: number) => {
      const state = stateRef.current;
      const newMods = pickModifiers();
      setActiveModifiers(newMods);
      state.activeModifiers = newMods;

      // Ensure basic ball properties
      state.ballSize = newMods.includes("BIG_BALL_LITTLE_PADDLES") ? 20 : 8;
      state.paddleHeightPlayer = newMods.includes("BIG_BALL_LITTLE_PADDLES") ? 25 : 60;
      state.paddleHeightAI = newMods.includes("BIG_BALL_LITTLE_PADDLES") ? 25 : 60;
      
      state.playerHits = 0;
      state.aiHits = 0;
      state.playerLaser = null;
      state.aiLaser = null;
      state.roboLaser = null;
      state.kitty = null;
      state.bumpers = [];
      state.strayBalls = [];
      state.bricks = [];
      state.secretWallHit = 0;
      setSecretWallHit(0);
      state.playerFlyV = 0;
      state.roboHP = 5;

      const numBalls = newMods.includes("MULTIBALL") ? 3 : 1;
      state.balls = [];
      for(let i=0; i<numBalls; i++) {
        let bvx = direction * 4;
        let bvy = (Math.random() * 2 - 1) * 3;
        // Make it easier to reach early
        if (Math.abs(bvy) > 1.5) {
          bvy = bvy > 0 ? 1.5 : -1.5;
        }

        let startX = canvasWidth / 2;
        if (newMods.includes("GRAVITY_WELL")) {
           startX = direction > 0 ? canvasWidth / 4 : 3 * canvasWidth / 4;
        }

        state.balls.push({
          x: startX,
          y: canvasHeight / 2 + (i * 20 - (numBalls-1)*10), 
          vx: bvx,
          vy: bvy
        });
      }

      if (newMods.includes("BUMPER_BALL")) {
        for(let i=0; i<4; i++) {
          state.bumpers.push({
             x: 150 + Math.random() * 300,
             y: 50 + Math.random() * 300
          });
        }
      }

      if (newMods.includes("DONT_HIT_THE_KITTY")) {
        state.kitty = {x: 300, y: 200, vx: (Math.random()*2-1)*2, vy: (Math.random()*2-1)*2, hits: 0};
      }

      if (newMods.includes("BRICK_BREAKER")) {
        for(let r=0; r<6; r++) {
           state.bricks.push({x: 280, y: 50 + r*50, active: true});
           state.bricks.push({x: 300, y: 50 + r*50, active: true});
        }
        // Give AI a ball too to chip away
        if (!newMods.includes("MULTIBALL")) {
          state.balls.push({
            x: canvasWidth / 2 + 30,
            y: canvasHeight / 2,
            vx: 4,
            vy: (Math.random() * 2 - 1) * 3
          });
        }
      }
    };

    const grantPoint = (to: "PLAYER" | "AI", cause?: string, noReset: boolean = false) => {
      const state = stateRef.current;
      if (to === "PLAYER") {
        synth.playCoin();
        const nextScore = state.playerScore + 1;
        setPlayerScore(nextScore);
        if (nextScore >= 10) {
          const nextSetPlayer = state.playerSets + 1;
          setPlayerSets(nextSetPlayer);
          if (nextSetPlayer >= 2) {
            setGameState("GAMEOVER");
            setLastWinner("PLAYER");
            onGameOver(1); 
          } else {
            setLastWinner("PLAYER");
            setGameState("SET_OVER");
            setTimeout(() => startNextSet(), 2000);
          }
        } else if (!noReset) {
          resetRound(-1);
        }
      } else {
        synth.playExplosion();
        const nextScore = state.aiScore + 1;
        setAiScore(nextScore);
        if (nextScore >= 10) {
          const nextSetAI = state.aiSets + 1;
          setAiSets(nextSetAI);
          if (nextSetAI >= 2) {
            setGameState("GAMEOVER");
            setLastWinner("AI");
            onGameOver(0);
          } else {
            setLastWinner("AI");
            setGameState("SET_OVER");
            setTimeout(() => startNextSet(), 2000);
          }
        } else if (!noReset) {
          resetRound(1);
        }
      }
    };

    const update = () => {
      const state = stateRef.current;
      const hasModifier = (m: string) => state.activeModifiers.includes(m);

      if (state.secretWallHit > 0) {
        state.secretWallHit = Math.max(0, state.secretWallHit - 0.05);
        setSecretWallHit(state.secretWallHit); 
      }

      // 1. Move Player Paddle
      const paddleSpeed = 6;
      if (hasModifier("FLAPPY_PONG")) {
        // Flappy Mechanics
        state.playerFlyV += 0.3; // Gravity
        if (keyboardState.ArrowUp) {
          state.playerFlyV -= 0.8; // Fly up
        }
        state.playerY += state.playerFlyV;
        if (state.playerY > canvasHeight - state.paddleHeightPlayer) {
          state.playerY = canvasHeight - state.paddleHeightPlayer;
          state.playerFlyV = 0;
        }
        if (state.playerY < 0) {
          state.playerY = 0;
          state.playerFlyV = 0;
        }
      } else {
        if (keyboardState.ArrowUp) {
          state.playerY = Math.max(0, state.playerY - paddleSpeed);
        }
        if (keyboardState.ArrowDown) {
          state.playerY = Math.min(canvasHeight - state.paddleHeightPlayer, state.playerY + paddleSpeed);
        }
      }

      // 2. Move AI Paddle
      const diffM = difficulty === "HARD" ? 1.5 : (difficulty === "EASY" ? 0.6 : 1);
      const aiSpeed = 3.8 * diffM;
      // Track the closest ball moving towards AI
      let targetBall = state.balls.find(b => b.vx > 0);
      if (!targetBall && state.balls.length > 0) targetBall = state.balls[0];

      if (targetBall) {
        const targetY = targetBall.y - state.paddleHeightAI / 2;
        const diff = targetY - state.aiY;
        const shouldTrack = targetBall.vx > 0 || targetBall.x > canvasWidth / 2;
        if (shouldTrack) {
          if (Math.abs(diff) > 4) {
            state.aiY = diff > 0 ? 
              Math.min(canvasHeight - state.paddleHeightAI, state.aiY + aiSpeed) : 
              Math.max(0, state.aiY - aiSpeed);
          }
        }
      }

      // 3. Modifiers logic
      if (hasModifier("BLASTER")) {
        if (state.blasterCooldown > 0) state.blasterCooldown--;
        if (spacePressedRef.current && state.blasterCooldown <= 0 && !state.playerLaser) {
          state.playerLaser = {x: 40, y: state.playerY + state.paddleHeightPlayer/2, vx: 8};
          synth.playCoin();
          state.blasterCooldown = 60;
        }
        // AI occasionally shoots
        if (Math.random() < 0.01 && !state.aiLaser) {
          state.aiLaser = {x: canvasWidth - 40, y: state.aiY + state.paddleHeightAI/2, vx: -8};
        }

        if (state.playerLaser) {
          state.playerLaser.x += state.playerLaser.vx;
          if (state.playerLaser.x > canvasWidth - 40 && state.playerLaser.y > state.aiY && state.playerLaser.y < state.aiY + state.paddleHeightAI) {
            state.playerLaser = null;
            state.aiHits++;
            synth.playExplosion();
            if (state.aiHits >= 2) return grantPoint("PLAYER", "BLASTED");
          } else if (state.playerLaser.x > canvasWidth) {
            state.playerLaser = null;
          }
        }

        if (state.aiLaser) {
          state.aiLaser.x += state.aiLaser.vx;
          if (state.aiLaser.x < 40 && state.aiLaser.y > state.playerY && state.aiLaser.y < state.playerY + state.paddleHeightPlayer) {
            state.aiLaser = null;
            state.playerHits++;
            synth.playExplosion();
            if (state.playerHits >= 2) return grantPoint("AI", "BLASTED");
          } else if (state.aiLaser.x < 0) {
            state.aiLaser = null;
          }
        }
      }

      if (hasModifier("ROBO_BATTLE") && state.roboHP > 0) {
         if (Math.random() < 0.02 && !state.roboLaser) {
           state.roboLaser = {x: canvasWidth/2, y: canvasHeight/2, vx: -5 + (Math.random()*2-1)*2 };
         }
         if (state.roboLaser) {
           state.roboLaser.x += state.roboLaser.vx;
           if (state.roboLaser.x < 40 && state.roboLaser.y > state.playerY && state.roboLaser.y < state.playerY + state.paddleHeightPlayer) {
             state.roboLaser = null;
             state.playerHits++;
             synth.playExplosion();
             if (state.playerHits >= 2) return grantPoint("AI", "ROBO");
           } else if (state.roboLaser.x < 0) {
             state.roboLaser = null;
           }
         }
      }

      if (hasModifier("DODGEBALL")) {
        if (Math.random() < 0.03) {
          state.strayBalls.push({x: canvasWidth, y: Math.random() * canvasHeight, vx: -4 - Math.random()*3});
        }
        for(let i=0; i<state.strayBalls.length; i++) {
          let sb = state.strayBalls[i];
          sb.x += sb.vx;
          if (sb.x < 40 && sb.y > state.playerY && sb.y < state.playerY + state.paddleHeightPlayer) {
             state.playerHits++;
             synth.playExplosion();
             state.strayBalls.splice(i, 1);
             i--;
             if (state.playerHits >= 2) return grantPoint("AI", "DODGE");
          } else if (sb.x < 0) {
             state.strayBalls.splice(i, 1);
             i--;
          }
        }
      }

      if (hasModifier("DONT_HIT_THE_KITTY") && state.kitty) {
        state.kitty.x += state.kitty.vx;
        state.kitty.y += state.kitty.vy;
        if (state.kitty.x < 0 || state.kitty.x > canvasWidth) state.kitty.vx *= -1;
        if (state.kitty.y < 0 || state.kitty.y > canvasHeight) state.kitty.vy *= -1;
      }

      // 4. Update Balls
      for (let i = 0; i < state.balls.length; i++) {
        let b = state.balls[i];

        if (hasModifier("GRAVITY_WELL")) {
          const dx = (canvasWidth / 2) - b.x;
          const dy = (canvasHeight / 2) - b.y;
          const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
          if (dist > 40) {
            const force = 5 / dist; 
            b.vx += (dx / dist) * force;
            b.vy += (dy / dist) * force;
          }
          b.vx = Math.max(-10, Math.min(10, b.vx));
          b.vy = Math.max(-10, Math.min(10, b.vy));
        }

        if (hasModifier("FIREBALL")) {
          const inCenter = b.x > canvasWidth/2 - 40 && b.x < canvasWidth/2 + 40;
          if (inCenter) {
             b.vx *= 1.01;
             b.vy *= 1.01;
          }
        }

        b.x += b.vx;
        b.y += b.vy;

        if (hasModifier("SECRET_WALL")) {
          const cx = canvasWidth / 2;
          if (b.x > cx - Math.abs(b.vx) && b.x < cx + Math.abs(b.vx) && b.y > canvasHeight / 2 - 75 && b.y < canvasHeight / 2 + 75) {
             b.vx = -b.vx;
             state.secretWallHit = 1;
             setSecretWallHit(1);
             synth.playBounce();
          }
        }

        // Bumper collisions
        if (hasModifier("BUMPER_BALL")) {
          for (let bump of state.bumpers) {
             const dx = b.x - bump.x;
             const dy = b.y - bump.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 15 + state.ballSize) {
                b.vx = (dx/dist) * 5;
                b.vy = (dy/dist) * 5;
                synth.playBounce();
             }
          }
        }

        // Kitty collisions
        if (hasModifier("DONT_HIT_THE_KITTY") && state.kitty) {
          const dx = b.x - state.kitty.x;
          const dy = b.y - state.kitty.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 20 + state.ballSize) {
             b.vx = (dx/dist) * 5;
             b.vy = (dy/dist) * 5;
             state.kitty.hits++;
             synth.playExplosion();
             if (state.kitty.hits >= 2) {
                // The last paddle to touch it is to blame... simplified: random penalty or kitty just ends round for whichever side it crossed
                if (b.vx > 0) return grantPoint("AI", "KITTY"); // Player hit it over
                else return grantPoint("PLAYER", "KITTY");
             }
          }
        }

        // Brick Breaker collisions
        if (hasModifier("BRICK_BREAKER")) {
          for (let j = 0; j < state.bricks.length; j++) {
            let br = state.bricks[j];
            if (br.active && b.x > br.x && b.x < br.x + 10 && b.y > br.y && b.y < br.y + 40) {
               br.active = false;
               b.vx *= -1;
               synth.playBounce();
               break; // One brick per frame max
            }
          }
        }

        // Robo
        if (hasModifier("ROBO_BATTLE") && state.roboHP > 0) {
          const rx = canvasWidth / 2;
          const ry = canvasHeight / 2;
          if (b.x > rx - 15 && b.x < rx + 15 && b.y > ry - 15 && b.y < ry + 15) {
            const hitByPlayer = b.vx > 0;
            b.vx = -b.vx; // Bounce off robo
            synth.playBounce();
            state.roboHP--;
            if (state.roboHP <= 0) {
               synth.playExplosion();
               return grantPoint(hitByPlayer ? "PLAYER" : "AI", "ROBO_KILLED");
            }
          }
        }

        // Top/Bottom Wrap/Bounce
        if (b.y - state.ballSize <= 0) {
          b.y = state.ballSize;
          b.vy = -b.vy;
          synth.playBounce();
        } else if (b.y + state.ballSize >= canvasHeight) {
          b.y = canvasHeight - state.ballSize;
          b.vy = -b.vy;
          synth.playBounce();
        }

        // Player Collision
        if (b.vx < 0 && b.x - state.ballSize <= 30 && b.x + state.ballSize >= 20 && b.y >= state.playerY && b.y <= state.playerY + state.paddleHeightPlayer) {
          const relativeHitY = (b.y - (state.playerY + state.paddleHeightPlayer / 2)) / (state.paddleHeightPlayer / 2);
          b.vx = -b.vx * 1.08; 
          b.vy = relativeHitY * 4.5;
          b.x = 31 + state.ballSize; 
          synth.playBounce();
          if (hasModifier("SHATTER_PADDLE")) {
             state.paddleHeightPlayer = Math.max(10, state.paddleHeightPlayer - 10);
          }
        }

        // AI Collision
        const rightPaddleX = canvasWidth - 30 - paddleWidth;
        if (b.vx > 0 && b.x + state.ballSize >= rightPaddleX && b.x - state.ballSize <= rightPaddleX + paddleWidth && b.y >= state.aiY && b.y <= state.aiY + state.paddleHeightAI) {
          const relativeHitY = (b.y - (state.aiY + state.paddleHeightAI / 2)) / (state.paddleHeightAI / 2);
          b.vx = -b.vx * 1.08;
          b.vy = relativeHitY * 4.5;
          b.x = rightPaddleX - state.ballSize - 1; 
          synth.playBounce();
          if (hasModifier("SHATTER_PADDLE")) {
             state.paddleHeightAI = Math.max(10, state.paddleHeightAI - 10);
          }
        }

        // Scoring
        if (b.x < 0) {
          if (state.balls.length > 1) {
            state.balls.splice(i, 1);
            i--;
            grantPoint("AI", undefined, true);
          } else {
            return grantPoint("AI");
          }
        } else if (b.x > canvasWidth) {
          if (state.balls.length > 1) {
             state.balls.splice(i, 1);
             i--;
             grantPoint("PLAYER", undefined, true);
          } else {
             return grantPoint("PLAYER");
          }
        }
      }
    };

    const draw = () => {
      const state = stateRef.current;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.shadowBlur = isBackCloset ? 20 : 10;
      ctx.shadowColor = isBackCloset ? "#4caf50" : "#ffffff"; // Turtle green or white
      ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff"; // Lighter turtle green or white

      const hasModifier = (m: string) => state.activeModifiers.includes(m);

      if (hasModifier("SECRET_WALL") && state.secretWallHit > 0) {
        ctx.fillStyle = `rgba(255, 50, 50, ${state.secretWallHit})`;
        ctx.fillRect(canvasWidth / 2 - 2, canvasHeight / 2 - 75, 4, 150);
        ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      if (hasModifier("GRAVITY_WELL")) {
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2, 30, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(100, 50, 200, 0.5)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100, 50, 200, 0.8)";
        ctx.fill();
        ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff"; // restore
        ctx.strokeStyle = isBackCloset ? "#795548" : "#ffffff"; // Turtle brown
      }

      if (!hasModifier("FOG_ZONE") && !hasModifier("SECRET_WALL")) {
        ctx.strokeStyle = isBackCloset ? "#795548" : "#ffffff";
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.moveTo(canvasWidth / 2, 0);
        ctx.lineTo(canvasWidth / 2, canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]); 
      }

      ctx.font = "16px 'JetBrains Mono', Courier, monospace";
      ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      ctx.fillText(`SETS: ${state.playerSets}`, canvasWidth / 4 - 35, 25);
      ctx.fillText(`SETS: ${state.aiSets}`, (3 * canvasWidth) / 4 - 35, 25);

      if (hasModifier("BLASTER") || hasModifier("ROBO_BATTLE") || hasModifier("DODGEBALL")) {
        ctx.font = "12px monospace";
        ctx.fillText(`DMG: ${state.playerHits}/2`, 20, 15);
        ctx.fillText(`DMG: ${state.aiHits}/2`, canvasWidth - 80, 15);
      }

      // Player Paddle
      ctx.fillRect(20, state.playerY, paddleWidth, state.paddleHeightPlayer);
      if (hasModifier("BLASTER")) {
         ctx.fillStyle = "#ff5555";
         ctx.fillRect(30, state.playerY + state.paddleHeightPlayer/2 - 2, 10, 4);
         ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      // AI Paddle
      ctx.fillRect(canvasWidth - 30, state.aiY, paddleWidth, state.paddleHeightAI);

      // Robo
      if (hasModifier("ROBO_BATTLE") && state.roboHP > 0) {
         ctx.fillStyle = "#ff0000";
         ctx.fillRect(canvasWidth/2 - 15, canvasHeight/2 - 15, 30, 30);
         ctx.fillStyle = "#ffffff";
         ctx.fillRect(canvasWidth/2 - 8, canvasHeight/2 - 5, 5, 5);
         ctx.fillRect(canvasWidth/2 + 3, canvasHeight/2 - 5, 5, 5);
         ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      // Bricks
      if (hasModifier("BRICK_BREAKER")) {
         ctx.fillStyle = "#ffff00";
         for(let br of state.bricks) {
            if (br.active) {
               ctx.fillRect(br.x, br.y, 10, 40);
            }
         }
         ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      // Bumpers
      if (hasModifier("BUMPER_BALL")) {
         ctx.fillStyle = "#00ffff";
         for(let bump of state.bumpers) {
            ctx.beginPath();
            ctx.arc(bump.x, bump.y, 15, 0, Math.PI*2);
            ctx.fill();
         }
         ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      // Kitty
      if (hasModifier("DONT_HIT_THE_KITTY") && state.kitty) {
         ctx.fillStyle = state.kitty.hits === 0 ? "#ff99aa" : "#ff0000";
         ctx.fillRect(state.kitty.x - 10, state.kitty.y - 10, 20, 20);
         ctx.fillStyle = "#ffffff";
         ctx.fillText("MEOW", state.kitty.x - 15, state.kitty.y - 15);
         ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      // Lasers
      if (state.playerLaser) {
         ctx.fillStyle = "#ff0000";
         ctx.fillRect(state.playerLaser.x, state.playerLaser.y - 2, 15, 4);
      }
      if (state.aiLaser) {
         ctx.fillStyle = "#ff0000";
         ctx.fillRect(state.aiLaser.x - 15, state.aiLaser.y - 2, 15, 4);
      }
      if (state.roboLaser && state.roboHP > 0) {
         ctx.fillStyle = "#ff00ff";
         ctx.fillRect(state.roboLaser.x, state.roboLaser.y - 2, 10, 4);
      }
      for (let sb of state.strayBalls) {
         ctx.fillStyle = "#ff0000";
         ctx.beginPath();
         ctx.arc(sb.x, sb.y, 5, 0, Math.PI*2);
         ctx.fill();
      }

      if (hasModifier("FIREBALL")) {
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2, 40, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 50, 0, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Balls
      for (let b of state.balls) {
        if (hasModifier("FIREBALL")) {
          ctx.shadowColor = "#ff3300";
          ctx.fillStyle = "#ff3300";
        }
        ctx.fillRect(b.x - state.ballSize / 2, b.y - state.ballSize / 2, state.ballSize, state.ballSize);
        ctx.shadowColor = isBackCloset ? "#4caf50" : "#ffffff"; 
        ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
      }

      if (hasModifier("FOG_ZONE")) {
        // Draw the fog OVER the background but under or partially over balls?
        // Let's just make it a striped fog or semi-transparent so the ball is visible?
        // The prompt says "you should be able to see the fog but not the ball in the fog"
        // Wait, "you should be able to see the fog but not the ball in the fog." -> So the fog should be visible (e.g. gray or dark green) and completely hide the ball?
        // Right now, black fog hides the ball completely, but ALSO blends with the black background! So we can't see the fog.
        // So we should make the fog a visible color like rgba(100, 100, 100, 0.5) but make sure it obscures the ball?
        // If it's drawn AFTER the balls, it covers them.
        ctx.fillStyle = isBackCloset ? "rgba(40, 100, 40, 1)" : "rgba(80, 80, 80, 1)";
        ctx.shadowBlur = 0;
        const fogWidth = 200;
        ctx.fillRect(canvasWidth / 2 - fogWidth / 2, 0, fogWidth, canvasHeight);
        ctx.fillStyle = isBackCloset ? "#81c784" : "#ffffff";
        ctx.shadowBlur = 10;
      }


      // Scores
      ctx.font = "40px 'JetBrains Mono', Courier, monospace";
      ctx.fillText(state.playerScore.toString(), canvasWidth / 4 - 20, 60);
      ctx.fillText(state.aiScore.toString(), (3 * canvasWidth) / 4 - 20, 60);

      // CRT Scanlines
      ctx.shadowBlur = 0; 
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      for (let y = 0; y < canvasHeight; y += 4) {
        ctx.fillRect(0, y, canvasWidth, 1.5);
      }
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationId);
  }, [gameState, keyboardState, onGameOver, isPaused]);

  const startNextSet = () => {
    synth.playCoin();
    setPlayerScore(0);
    setAiScore(0);
    stateRef.current.playerScore = 0;
    stateRef.current.aiScore = 0;
    stateRef.current.playerY = canvasHeight / 2 - 30;
    stateRef.current.aiY = canvasHeight / 2 - 30;
    stateRef.current.balls = [{
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: Math.random() < 0.5 ? -4 : 4,
      vy: (Math.random() * 2 - 1) * 2
    }];
    setGameState("PLAYING");
  };

  const startGame = () => {
    synth.playCoin();
    setPlayerSets(0);
    setAiSets(0);
    stateRef.current.playerSets = 0;
    stateRef.current.aiSets = 0;
    startNextSet();
  };

  return (
    <div id="pong-game-container" className={`flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 rounded-xl border-4 w-full h-full overflow-hidden ${isBackCloset ? "border-purple-600 shadow-[0_0_15px_rgba(153,0,255,0.4)]" : "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]"}`}>
      <div className="flex justify-between w-full mb-2 sm:mb-3 items-center flex-shrink-0">
        <h3 className={`${isBackCloset ? "text-purple-400" : "text-yellow-400"} font-bold tracking-widest text-base sm:text-lg`}>
          {isBackCloset ? "p0nG _v2.??" : "PONG"}
        </h3>
        <span className="text-zinc-400 text-xs font-mono">MATCH WINS: {highScore}</span>
      </div>

      <div className="relative border-4 border-zinc-800 rounded-md overflow-hidden bg-black flex-1 min-h-0 w-full flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain bg-black cursor-none"
        />
        {/* CRT Glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.1)] mix-blend-screen rounded-sm opacity-80 select-none bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.15)_100%)]"></div>

        {isBackCloset && activeModifiers.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-green-400 font-bold animate-pulse bg-green-950/60 px-2 py-1 rounded border border-green-500/30 z-10 pointer-events-none">
            ANOMALIES: {activeModifiers.join(", ")}
          </div>
        )}

        {gameState === "READY" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6">
            <h4 className={`${isBackCloset ? "text-purple-500" : "text-green-500"} font-mono text-3xl mb-4 tracking-wider animate-pulse`}>INSERT COIN / START</h4>
            <p className="text-zinc-400 font-mono text-sm max-w-[400px] mb-6">
              Use arrow keys <span className="text-white font-bold">▲</span> and <span className="text-white font-bold">▼</span>. 
              {isBackCloset && <span className="text-red-400 block mt-2">Spacebar configures weapons in Blaster mode. 'W' for Flappy mode.</span>}
            </p>
            <button
              onClick={() => startGame()}
              className={`px-6 py-3 font-bold font-mono tracking-widest text-xl rounded-md border-2 transition duration-200 cursor-pointer ${
                isBackCloset 
                ? "bg-purple-800 hover:bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(153,0,255,0.5)]" 
                : "bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              }`}
            >
              PLAY GAME (ENTER)
            </button>
          </div>
        )}

        {gameState === "SET_OVER" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-6">
            <h4 className={`font-mono text-3xl mb-2 tracking-widest ${lastWinner === "PLAYER" ? "text-yellow-400" : "text-red-500"}`}>
              {lastWinner === "PLAYER" ? "YOU WON THE SET" : "AI WON THE SET"}
            </h4>
          </div>
        )}

        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <ParticleExplosion color="#ef4444" />
            <h4 className={`font-mono text-4xl mb-2 tracking-widest ${lastWinner === "PLAYER" ? "text-yellow-400" : "text-red-500"}`}>
              {lastWinner === "PLAYER" ? "MATCH VICTORY!" : "MATCH LOST"}
            </h4>
            <button
              onClick={() => startGame()}
              className="mt-6 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-lg rounded-md border-2 border-yellow-300 cursor-pointer"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
        {gameState === "PAUSED" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-6 backdrop-blur-[2px]">
            <h4 className="font-mono text-yellow-500 text-4xl tracking-wider animate-pulse font-black">PAUSED</h4>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-6 text-zinc-500 text-xs font-mono">
        <div>CONTROLS: [↑ / ↓] Move {isBackCloset ? "[SPACE] Shoot" : ""}</div>
      </div>
    </div>
  );
}
