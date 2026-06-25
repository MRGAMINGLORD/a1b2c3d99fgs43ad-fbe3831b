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

interface Invader {
  id: number;
  x: number;
  y: number;
  row: number; // 0 (top) to 3 (bottom)
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  fromEnemy: boolean;
}

interface BunkerBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number; // starts at 4, collapses on 0
}

interface UFO {
  x: number;
  y: number;
  vx: number;
  active: boolean;
}

export default function SpaceInvaders({ keyboardState, onGameOver, highScore, isBackCloset = false, difficulty = "MEDIUM", isPaused = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<"READY" | "PLAYING" | "DYING" | "GAMEOVER" | "VICTORY" | "PAUSED">("READY");

  // Keep heavy physics loops state in a ref to run at high speed natively
  const stateRef = useRef({
    playerX: 300,
    bullets: [] as Bullet[],
    invaders: [] as Invader[],
    bunkers: [] as BunkerBlock[],
    ufo: { x: -50, y: 55, vx: 2, active: false } as UFO,
    invaderDx: 1.0, // horizontal move step speed
    invaderStepTimer: 0,
    shootCooldown: 0,
    animFrame: 0,
    score: 0,
    marchFreq: 0, // handles the classic thump-thump bass sounds rhythm
    marchTimer: 40,
    level: 2,
    deathTimer: 0,
  });

  const canvasWidth = 448;
  const canvasHeight = 512;

  const prevP = useRef(false);

  
  useEffect(() => {
    if (score >= 1000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_1000", title: "Arcade Master", text: "1000 Points Reached in " + "SpaceInvaders" + "!" } }));
    }
  }, [score]);

  useEffect(() => {
    if (score >= 5000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_5000", title: "Retro God", text: "5000 Points Reached in " + "SpaceInvaders" + "!" } }));
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
    stateRef.current.score = score;
    stateRef.current.level = level;
  }, [score, level]);

  useEffect(() => {
    const onDebug = (e: any) => {
      if (e.detail.game === 'SPACEINVADERS') {
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

    const setupInvadersAndBunkers = () => {
      const list: Invader[] = [];
      let nid = 0;
      // 5 rows of 11 invaders
      // Difficulty ceiling at Wave 9: From Wave 9 onward, aliens spawn at the absolute lowest possible starting position.
      const effLevel = Math.min(9, stateRef.current.level);
      const yOffset = 60 + (effLevel - 1) * 20; 
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 11; col++) {
          list.push({
            id: nid++,
            x: 50 + col * 30,
            y: yOffset + row * 26,
            row: row,
            alive: true,
          });
        }
      }
      stateRef.current.invaders = list;
      
      // Fixed horizontal step size
      stateRef.current.invaderDx = 10;

      // Setup 4 bunkers, each bunker comprising small mosaic grid sub-rects
      // Always reset bunkers on new wave
      const bBlocks: BunkerBlock[] = [];
      const bunkerXPositions = [65, 155, 245, 335];
      bunkerXPositions.forEach((bx) => {
        // Create a 5x4 tile mosaic for each barrier bunker
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 7; c++) {
            // Cut out archway at the bottom center of bunker
            if (r >= 2 && (c >= 2 && c <= 4)) continue;
            if (r === 0 && (c === 0 || c === 6)) continue; // rounded top corners
            
            bBlocks.push({
              x: bx - 14 + c * 8, // Shift slightly centered
              y: canvasHeight - 110 + r * 6,
              width: 8,
              height: 6,
              hp: 4, // 4 hits to destroy this chunk
            });
          }
        }
      });
      stateRef.current.bunkers = bBlocks;
    };

    if (stateRef.current.invaders.length === 0) {
      setupInvadersAndBunkers();
    }

    const update = () => {
      const state = stateRef.current;
      state.animFrame++;

      // 1. Player Cannon mechanics
      const playerSpeed = 3.8;
      if (keyboardState.ArrowLeft) {
        state.playerX = Math.max(30, state.playerX - playerSpeed);
      }
      if (keyboardState.ArrowRight) {
        state.playerX = Math.min(canvasWidth - 30, state.playerX + playerSpeed);
      }

      // Shoot cooldown
      state.shootCooldown--;
      if ((keyboardState.Space || keyboardState.KeyZ) && state.shootCooldown <= 0) {
        // Only allow exactly *ONE* player bullet on screen like original Arcade
        const playerBullets = state.bullets.filter((b) => !b.fromEnemy);
        if (playerBullets.length < 1) {
          state.bullets.push({
            x: state.playerX,
            y: canvasHeight - 45,
            vy: -8.5,
            fromEnemy: false,
          });
          synth.playLaser();
          state.shootCooldown = 15; // small gap rate
        }
      }

      // 2. Bullets update
      state.bullets.forEach((bull) => {
        bull.y += bull.vy;
      });

      // 3. Invaders Grid horizontal and vertical drop updates
      const aliveCount = state.invaders.filter((i) => i.alive).length;
      if (aliveCount === 0) {
        setGameState("VICTORY");
        synth.playLevelUp();
        return;
      }

      // Invaders move timer speed scales with invader numbers drop
      // As you destroy aliens, hardware processes fewer objects -> moves faster & faster.
      // Final alien sprint -> blistering speed.
      const minInterval = difficulty === "HARD" ? 1 : (difficulty === "EASY" ? 4 : 2);
      const baseInterval = Math.max(minInterval + 5, 45 - (state.level * 3));
      const moveInterval = Math.max(minInterval, Math.floor((aliveCount / 55) * baseInterval));
      
      state.invaderStepTimer++;

      if (state.invaderStepTimer >= moveInterval) {
        state.invaderStepTimer = 0;

        // March sound rhythm
        state.marchTimer--;
        if (state.marchTimer <= 0) {
          state.marchTimer = Math.max(2, Math.floor((aliveCount / 55) * 15));
          synth.playBounce(); // Marching thump thump sound
        }

        // Move all horizontal step
        let minX = 9999;
        let maxX = -9999;
        state.invaders.forEach((inv) => {
          if (inv.alive) {
            inv.x += state.invaderDx;
            if (inv.x < minX) minX = inv.x;
            if (inv.x > maxX) maxX = inv.x + 24; // 24 = max width of invader
          }
        });

        // Trigger drop down upon touching map edges
        if (minX < 15 || maxX > canvasWidth - 15) {
          state.invaderDx = -state.invaderDx; // Reverse direction
          
          state.invaders.forEach((inv) => {
            if (inv.alive) {
              inv.x += state.invaderDx; // nudge back
              inv.y += 20; // march down
              
              // If invaders reach players deck area (Earth) -> Instant Game Over!
              if (inv.y > canvasHeight - 80) {
                setGameState("GAMEOVER");
                onGameOver(score);
              }
            }
          });
        }
      }

      // Invaders return fire randomly
      // Probability and max bullets scale up based on level
      const fireProb = Math.min(0.04, 0.015 + (state.level * 0.003)) * (difficulty === "HARD" ? 1.5 : (difficulty === "EASY" ? 0.5 : 1));
      const maxEnemyBullets = Math.min(8, 3 + state.level) * (difficulty === "HARD" ? 1.5 : (difficulty === "EASY" ? 0.5 : 1));

      if (Math.random() < fireProb && state.bullets.filter((b) => b.fromEnemy).length < maxEnemyBullets) {
        const liveInvaders = state.invaders.filter((i) => i.alive);
        if (liveInvaders.length > 0) {
          const shooter = liveInvaders[Math.floor(Math.random() * liveInvaders.length)];
          state.bullets.push({
            x: shooter.x + 15,
            y: shooter.y + 16,
            vy: 4.2 + (state.level * 0.2), // faster bullets too
            fromEnemy: true,
          });
        }
      }

      // 4. Mystery UFO logic
      if (!state.ufo.active && Math.random() < 0.0015) {
        state.ufo.active = true;
        if (Math.random() < 0.5) {
          state.ufo.x = -40;
          state.ufo.vx = 2.5;
        } else {
          state.ufo.x = canvasWidth + 40;
          state.ufo.vx = -2.5;
        }
      }
      if (state.ufo.active) {
        state.ufo.x += state.ufo.vx;
        // loop trigger sound
        if (state.animFrame % 14 === 0) {
          synth.playBounce();
        }
        if ((state.ufo.vx > 0 && state.ufo.x > canvasWidth + 50) || 
            (state.ufo.vx < 0 && state.ufo.x < -50)) {
          state.ufo.active = false;
        }
      }

      // 5. Colliders checking
      state.bullets.forEach((bull) => {
        // Player striking invaders or UFO
        if (!bull.fromEnemy) {
          // Bullet vs Enemy Bullet collision (they cancel out!)
          state.bullets.forEach((enemyBull) => {
            if (enemyBull.fromEnemy && enemyBull.y > 0 && bull.y > 0) {
                const dx = Math.abs(bull.x - enemyBull.x);
                const dy = Math.abs(bull.y - enemyBull.y);
                if (dx < 4 && dy < 16) {
                    bull.y = -200; // cancel player bullet
                    enemyBull.y = canvasHeight + 100; // cancel enemy bullet
                    synth.playBounce(); // tiny pop
                }
            }
          });

          // UFO hit checker
          if (state.ufo.active) {
            const dx = Math.abs(bull.x - state.ufo.x);
            const dy = Math.abs(bull.y - state.ufo.y);
            if (dx < 18 && dy < 12) {
              synth.playEatGhost(); // ufo pop jingle
              state.ufo.active = false;
              bull.y = -200; // clear bullet
              const mysteryPoints = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
              setScore((s) => (!isBackCloset && s < 6700 && s + mysteryPoints >= 6700) ? 6700 : s + mysteryPoints);
            }
          }

          // Invader hit checks
          state.invaders.forEach((inv) => {
            if (inv.alive) {
              const dx = bull.x - inv.x;
              const dy = bull.y - inv.y;
              if (dx >= 0 && dx <= 32 && dy >= 0 && dy <= 24) {
                inv.alive = false;
                bull.y = -200; // scrap bullet
                synth.playExplosion();
                // Score based on row layers
                const rowPts = [50, 40, 30, 20, 10];
                setScore((s) => (!isBackCloset && s < 6700 && s + rowPts[inv.row] >= 6700) ? 6700 : s + rowPts[inv.row]);
              }
            }
          });
        } else {
          // Enemy hitting Player Cannon
          const dx = Math.abs(bull.x - state.playerX);
          const dy = Math.abs(bull.y - (canvasHeight - 35));
          if (dx < 15 && dy < 12 && gameState !== "DYING") {
            bull.y = canvasHeight + 100; // delete
            synth.playExplosion();
            state.deathTimer = 0;
            setGameState("DYING");
          }
        }

        // Bunkers degradation checks (absorbs shots from both alignments!)
        state.bunkers.forEach((block) => {
          if (block.hp > 0) {
            const dx = bull.x - block.x;
            const dy = bull.y - block.y;
            if (dx >= 0 && dx <= block.width && dy >= 0 && dy <= block.height) {
              bull.y = bull.fromEnemy ? canvasHeight + 100 : -200; // discard bullet
              block.hp--; // erode bunker piece
              if (block.hp === 0) {
                synth.playBounce();
              }
            }
          }
        });
      });

      // Filter off-screen bullets
      state.bullets = state.bullets.filter((b) => b.y > 0 && b.y < canvasHeight);

      // 6. Invader touching Bunkers logic (Bunkers erode by touch)
      state.invaders.forEach((inv) => {
        if (!inv.alive) return;
        state.bunkers.forEach((block) => {
          if (block.hp > 0) {
            // Invader collision box approx 24px wide, 16px high
            const dx = Math.abs((inv.x + 12) - (block.x + block.width/2));
            const dy = Math.abs((inv.y + 8) - (block.y + Math.max(2, block.height/2)));
            if (dx < 16 && dy < 12) {
              block.hp = 0; // Destroy bunker block
            }
          }
        });
      });
    };

    const draw = () => {
      const state = stateRef.current;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // CRT Glow styling
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#22c55e";

      // 1. Draw Player Cannon
      ctx.fillStyle = "#22c55e";
      if (gameState === "DYING") {
        // Ship halts, flashes white, turns on side, mangled graphic, sinks/shrinks
        const t = state.deathTimer; // 0 to 120
        ctx.save();
        ctx.translate(state.playerX, canvasHeight - 35);
        
        // Flashing white
        if (Math.floor(t / 8) % 2 === 0) {
          ctx.fillStyle = "#ffffff";
        }
        
        // Turn on side and sink
        ctx.rotate(Math.PI / 2); // 90 degrees
        ctx.scale(1 - (t / 120), 1 - (t / 120)); // shrinking
        
        // Mangled shape
        ctx.fillRect(-10, -5, 20, 10);
        ctx.fillRect(-14, 5, 8, 8);
        ctx.fillRect(6, 5, 8, 8);
        ctx.fillRect(-2, -12, 4, 7);
        
        ctx.restore();
      } else {
        ctx.fillRect(state.playerX - 16, canvasHeight - 35, 32, 12);
        ctx.fillRect(state.playerX - 4, canvasHeight - 43, 8, 8);
        ctx.fillRect(state.playerX - 1, canvasHeight - 48, 2, 5);
      }

      // 2. Draw Invaders (various classic sprites depending on rows)
      state.invaders.forEach((inv) => {
        if (!inv.alive) return;

        ctx.shadowColor = "#ffffff";
        ctx.fillStyle = "#ffffff";

        // Animated leg waving
        const animLegs = Math.floor(state.animFrame / 15) % 2 === 0;

        // Custom pixel-grid representations of invaders
        if (inv.row === 0) {
          // Squid (top row)
          ctx.fillRect(inv.x + 8, inv.y + 2, 8, 12);
          ctx.fillRect(inv.x + 4, inv.y + 6, 16, 6);
          if (animLegs) {
            ctx.fillRect(inv.x + 4, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 16, inv.y + 12, 4, 6);
          } else {
            ctx.fillRect(inv.x + 6, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 14, inv.y + 12, 4, 6);
          }
        } else if (inv.row === 1 || inv.row === 2) {
          // Crab invader (middle rows)
          ctx.fillRect(inv.x + 4, inv.y + 2, 16, 12);
          ctx.fillRect(inv.x + 2, inv.y + 6, 20, 6);
          // Antennas
          ctx.fillRect(inv.x + 4, inv.y, 2, 3);
          ctx.fillRect(inv.x + 18, inv.y, 2, 3);
          if (animLegs) {
            ctx.fillRect(inv.x, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 20, inv.y + 12, 4, 6);
          } else {
            ctx.fillRect(inv.x + 4, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 16, inv.y + 12, 4, 6);
          }
        } else {
          // Octopus invader (bottom rows)
          ctx.fillRect(inv.x + 6, inv.y + 2, 12, 14);
          ctx.fillRect(inv.x + 2, inv.y + 6, 20, 6);
          if (animLegs) {
            ctx.fillRect(inv.x + 2, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 18, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 10, inv.y + 14, 4, 4);
          } else {
            ctx.fillRect(inv.x + 6, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + 14, inv.y + 12, 4, 6);
          }
        }

        // Draw alien eyes (cutouts)
        ctx.fillStyle = "#000000";
        if (inv.row === 0) {
          ctx.fillRect(inv.x + 8, inv.y + 6, 3, 3);
          ctx.fillRect(inv.x + 13, inv.y + 6, 3, 3);
        } else {
          ctx.fillRect(inv.x + 6, inv.y + 6, 3, 3);
          ctx.fillRect(inv.x + 15, inv.y + 6, 3, 3);
        }
      });

      // 3. Draw Bunkers (shows erosion/cracks by HP value)
      state.bunkers.forEach((block) => {
        if (block.hp <= 0) return;

        // Erode alpha color on HP loss
        const alpha = block.hp / 4;
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fillRect(block.x, block.y, block.width, block.height);

        // draw small black erosion dots
        if (block.hp < 4) {
          ctx.fillStyle = "#000000";
          if (block.hp <= 2) ctx.fillRect(block.x + 2, block.y + 2, 2, 2);
          if (block.hp === 1) ctx.fillRect(block.x + 4, block.y + 3, 2, 1);
        }
      });

      // 4. Draw UFO
      if (state.ufo.active) {
        ctx.shadowColor = "#ef4444";
        ctx.fillStyle = "#ef4444"; // UFO red
        ctx.beginPath();
        ctx.ellipse(state.ufo.x, state.ufo.y, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dome
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(state.ufo.x, state.ufo.y - 4, 6, 0, Math.PI, true);
        ctx.fill();
      }

      ctx.shadowBlur = 0; // reset

      // 5. Draw Bullets
      state.bullets.forEach((bull) => {
        ctx.fillStyle = bull.fromEnemy ? "#ffffff" : "#22c55e"; // original white invaders fire vs green tank fire
        ctx.fillRect(bull.x - 1.5, bull.y, 3, 11);
      });

      // 6. Draw floor boundary line
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(10, canvasHeight - 20);
      ctx.lineTo(canvasWidth - 10, canvasHeight - 20);
      ctx.stroke();

      // HUD board
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'JetBrains Mono', Courier, monospace";
      ctx.fillText(`SCORE: ${score}`, 15, 20);
      ctx.fillText(`LEVEL: ${stateRef.current.level}`, Math.floor(canvasWidth / 2) - 30, 20);
      ctx.fillText(`LIVES: ${"❤".repeat(Math.max(0, lives))}`, canvasWidth - 100, 20);
    };

    const loop = () => {
      if (gameState === "DYING") {
        stateRef.current.deathTimer++;
        if (stateRef.current.deathTimer > 120) { // roughly 2 seconds
          const restL = lives - 1;
          setLives(restL);
          if (restL <= 0) {
            setGameState("GAMEOVER");
            onGameOver(score);
          } else {
            setGameState("PLAYING");
            stateRef.current.playerX = 300;
          }
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
    state.invaders = []; // setup will trigger automatically
    state.ufo.active = false;
    state.shootCooldown = 0;
    setGameState("PLAYING");
  };

  return (
    <div id="spaceinvaders-game-container" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 rounded-xl border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] w-full h-full overflow-hidden">
      <div className="flex justify-between w-full mb-2 sm:mb-3 items-center flex-shrink-0">
        <h3 className="text-yellow-400 font-bold tracking-widest text-base sm:text-lg font-mono">SPACE INVADERS</h3>
        <span className="text-zinc-400 text-xs font-mono">HIGH SCORE: {highScore}</span>
      </div>

      <div className="relative border-4 border-zinc-800 rounded-md overflow-hidden bg-black flex justify-center items-center flex-1 min-h-0 w-full max-w-[448px]">
        <canvas
          ref={canvasRef}
          width={448}
          height={512}
          className="w-full h-full object-contain bg-black"
        />

        {gameState === "READY" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6">
            <h4 className="text-green-500 font-mono text-3xl mb-4 tracking-wider animate-pulse">INSERT COIN / START</h4>
            <div className="text-zinc-300 font-mono text-sm max-w-[450px] mb-6 space-y-2">
              <p>Move your Cannon ship with Arrow Keys <span className="text-white font-bold">◄ ►</span>.</p>
              <p>Fire lasers with <span className="text-white font-bold">SPACE</span> or <span className="text-white font-bold">Z</span>.</p>
              <p>Bunker shields protect you from invader drops, but degrade with damage!</p>
              <p>Shoot down the flying <span className="text-red-400 font-bold font-mono">UFO mystery ship</span> at the top for bonus points!</p>
            </div>
            <button
              id="invaders-start-btn"
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
            <h4 className="font-mono text-red-500 text-4xl mb-4 tracking-wider animate-bounce">EARTH CONQUERED!</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="invaders-retry-btn"
              onClick={() => startGame()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              PLAY AGAIN (ENTER)
            </button>
          </div>
        )}

        {gameState === "VICTORY" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <h4 className="font-mono text-yellow-400 text-4xl mb-4 tracking-widest animate-bounce">INVADERS DEFEATED!</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Earth is safe! Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="invaders-victory-btn"
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
        <div>CONTROLS: [<span className="text-yellow-400">◄</span> / <span className="text-yellow-400">►</span>] Horizontal Move</div>
        <div>[<span className="text-yellow-400">SPACE / Z</span>] Fire Cannon</div>
        <div>[<span className="text-yellow-400">ENTER</span>] Start Game</div>
      </div>
    </div>
  );
}
