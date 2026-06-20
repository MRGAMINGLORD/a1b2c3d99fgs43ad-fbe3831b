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
//curently 86 rows
// Tile Map: W = Wall, D = Dot, E = Energizer (Power Pellet), O = Empty Space, T = Tunnel
const MAZE_MAP = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WDDDDDDDDDDDDWWDDDDDDDDDDDDW",
  "WDWWWWDWWWWWDWWDWWWWWDWWWWDW",
  "WEWWWWDWWWWWDWWDWWWWWDWWWWEW",
  "WDWWWWDWWWWWDWWDWWWWWDWWWWDW",
  "WDDDDDDDDDDDDDDDDDDDDDDDDDDW",
  "WDWWWWDWWDWWWWWWWWDWWDWWWWDW",
  "WDWWWWDWWDWWWWWWWWDWWDWWWWDW",
  "WDDDDDDWWDDDDWWDDDDWWDDDDDDW",
  "WWWWWWDWWWWWOOOOWWWWWDWWWWWW",
  "WWWWWWDWWWWWOOOOWWWWWDWWWWWW",
  "WWWWWWDWWOOOOOOOOOOWWDWWWWWW",
  "WWWWWWDWWOOWW--WWOOWWDWWWWWW",
  "WWWWWWDWWOOWOOOOWOOWWDWWWWWW",
  "TOOOOOOWWOOWOOOOWOOWWOOOOOOT",
  "WWWWWWDWWOOWOOOOWOOWWDWWWWWW",
  "WWWWWWDWWOOWWWWWWOOWWDWWWWWW",
  "WWWWWWDWWOOOOOOOOOOWWDWWWWWW",
  "WWWWWWDWWDWWWWWWWWDWWDWWWWWW",
  "WWWWWWDWWDWWWWWWWWDWWDWWWWWW",
  "WDDDDDDDDDDDDWWDDDDDDDDDDDDW",
  "WDWWWWDWWWWWDWWDWWWWWDWWWWDW",
  "WDWWWWDWWWWWDWWDWWWWWDWWWWDW",
  "WEDDDWDDDDDDDDDDDDDDDDWDDDEW",
  "WWWWDWDWWWDWWWWWWDWWWDWDWWWW",
  "WWWWDWDWWWDWWWWWWDWWWDWDWWWW",
  "WDDDDDDWWWDDDWWDDDWWWDDDDDDW",
  "WDWWWWWWWWWWDWWDWWWWWWWWWWDW",
  "WDWWWWWWWWWWDWWDWWWWWWWWWWDW",
  "WDDDDDDDDDDDDDDDDDDDDDDDDDDW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWW"
].map(r => r.split(''));

const COLS = 28;
const ROWS = 31;
const TILE_SIZE = 16;

interface Entity {
  x: number; // Grid index
  y: number;
  subX: number; // Offset pixels within tile
  subY: number;
  dirX: number; // Current movement direction
  dirY: number;
  nextDirX: number; // Injected next direction key
  nextDirY: number;
  speed: number;
}

interface Ghost extends Entity {
  id: "blinky" | "pinky" | "inky" | "clyde";
  color: string;
  isFrightened: boolean;
  isDead: boolean;
  inHouse: boolean;
  isExiting: boolean;
}

export default function Pacman({ keyboardState, onGameOver, highScore, isBackCloset = false, difficulty = "MEDIUM", isPaused = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<"READY" | "PLAYING" | "DYING" | "GAMEOVER" | "VICTORY" | "PAUSED">( "READY" );
  
  const mapRef = useRef<string[][]>(JSON.parse(JSON.stringify(MAZE_MAP)));
  
  const diffM = difficulty === "HARD" ? 1.3 : (difficulty === "EASY" ? 0.7 : 1);
  const baseGhostSpeed = (1.5 + ((level - 1) * 0.1)) * diffM;

  const pacmanRef = useRef<Entity>({
    x: 13, y: 23, subX: 0, subY: 0,
    dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
    speed: 2
  });

  const ghostsRef = useRef<Ghost[]>([
    {
      id: "blinky", color: "#ef4444",
      x: 13, y: 11, subX: 0, subY: 0,
      dirX: 1, dirY: 0, nextDirX: 1, nextDirY: 0,
      speed: baseGhostSpeed, isFrightened: false, isDead: false, inHouse: false, isExiting: false
    },
    {
      id: "pinky", color: "#ffb8ff",
      x: 13, y: 14, subX: 0, subY: 0,
      dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
      speed: baseGhostSpeed, isFrightened: false, isDead: false, inHouse: true, isExiting: false
    },
    {
      id: "inky", color: "#00ffff",
      x: 12, y: 14, subX: 0, subY: 0,
      dirX: 1, dirY: 0, nextDirX: 1, nextDirY: 0,
      speed: baseGhostSpeed * 0.95, isFrightened: false, isDead: false, inHouse: true, isExiting: false
    },
    {
      id: "clyde", color: "#fb923c",
      x: 15, y: 14, subX: 0, subY: 0,
      dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
      speed: baseGhostSpeed * 0.95, isFrightened: false, isDead: false, inHouse: true, isExiting: false
    }
  ]);

  const fTimerRef = useRef(0); // Frightened state timer frames
  const animFrameRef = useRef(0);
  const globalModeRef = useRef<"CHASE" | "SCATTER">("SCATTER");
  const modeTimerFramesRef = useRef(0); // Frames in current mode
  const modeStageRef = useRef(0); // which part of the scatter/chase sequence
  const globalDotCounterRef = useRef({ active: false, dots: 0 });
  const ghostDotCountersRef = useRef({ pinky: 0, inky: 0, clyde: 0 });
  const timeSinceLastDotFramesRef = useRef(0);
  const ghostEatenCountRef = useRef(0);

  
  const prevP = useRef(false);

  
  useEffect(() => {
    const onDebug = (e: any) => {
      if (e.detail.game === 'PACMAN') {
        if (e.detail.updates.score !== undefined) setScore(e.detail.updates.score);
        if (e.detail.updates.level !== undefined) setLevel(e.detail.updates.level);
      }
    };
    window.addEventListener("debugAction", onDebug);
    return () => window.removeEventListener("debugAction", onDebug);
  }, []);

  useEffect(() => {
    if (score >= 1000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_1000", title: "Arcade Master", text: "1000 Points Reached in " + "Pacman" + "!" } }));
    }
  }, [score]);

  useEffect(() => {
    if (score >= 5000) {
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_5000", title: "Retro God", text: "5000 Points Reached in " + "Pacman" + "!" } }));
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

  const contextRef = useRef({ keyboardState, score, lives, level });
  contextRef.current = { keyboardState, score, lives, level };

  useEffect(() => {
    if (gameState !== "PLAYING" && gameState !== "DYING") return;
    if (isPaused) return;

    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Movement helpers
    const getTargetPos = (ent: Entity, dirX: number, dirY: number) => {
      let tx = ent.x + dirX;
      let ty = ent.y + dirY;

      // Wrap around tunnel grid edges
      if (tx < 0) tx = COLS - 1;
      if (tx >= COLS) tx = 0;
      return { tx, ty };
    };

    const isWall = (tx: number, ty: number, isPacmanCheck: boolean = false) => {
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return true;
      const tile = mapRef.current[ty][tx];
      if (isPacmanCheck && tile === "-") return true;
      return tile === "W";
    };

    const updateEntityPosition = (ent: Entity, isPacman: boolean = false) => {
      const speed = ent.speed;

      // Handle transitions
      if (ent.subX === 0 && ent.subY === 0) {
        // We are exactly on a tile center. Choose direction decision.
        
        // Pacman tries to turn to the queued direction if valid
        const queuedTarget = getTargetPos(ent, ent.nextDirX, ent.nextDirY);
        if (!isWall(queuedTarget.tx, queuedTarget.ty, isPacman)) {
          ent.dirX = ent.nextDirX;
          ent.dirY = ent.nextDirY;
        }

        // Check if path is blocked in current direction
        const currentTarget = getTargetPos(ent, ent.dirX, ent.dirY);
        if (isWall(currentTarget.tx, currentTarget.ty, isPacman)) {
          // Blocked
          ent.dirX = 0;
          ent.dirY = 0;
        }
      }

      // Move toward next tile space
      if (ent.dirX !== 0 || ent.dirY !== 0) {
        ent.subX += ent.dirX * speed;
        ent.subY += ent.dirY * speed;

        if (Math.abs(ent.subX) >= TILE_SIZE || Math.abs(ent.subY) >= TILE_SIZE) {
          // Finalize reaching the next grid tile
          const next = getTargetPos(ent, ent.dirX, ent.dirY);
          ent.x = next.tx;
          ent.y = next.ty;
          ent.subX = 0;
          ent.subY = 0;

          // Pacman eats things at center of tiles
          if (isPacman) {
            const tile = mapRef.current[ent.y][ent.x];
            let eaten = false;
            
            if (tile === "D") {
              mapRef.current[ent.y][ent.x] = "O";
              setScore((s) => (!isBackCloset && s < 6700 && s + 10 >= 6700) ? 6700 : s + 10);
              synth.playChomp();
              eaten = true;
            } else if (tile === "E") {
              mapRef.current[ent.y][ent.x] = "O";
              setScore((s) => (!isBackCloset && s < 6700 && s + 50 >= 6700) ? 6700 : s + 50);
              fTimerRef.current = 400; // Power duration frames
              ghostEatenCountRef.current = 0; // reset multiplier
              ghostsRef.current.forEach((g) => {
                if (!g.isDead) {
                  g.isFrightened = true;
                  // reverse instantly when scared
                  if (!g.inHouse) {
                    g.dirX *= -1;
                    g.dirY *= -1;
                  }
                }
              });
              synth.playBounce();
              eaten = true;
            }
            
            if (eaten) {
              timeSinceLastDotFramesRef.current = 0;
              if (globalDotCounterRef.current.active) {
                globalDotCounterRef.current.dots++;
                if (globalDotCounterRef.current.dots === 7 && ghostsRef.current.find(g => g.id === "pinky")?.inHouse) {
                  ghostsRef.current.find(g => g.id === "pinky")!.isExiting = true;
                }
                if (globalDotCounterRef.current.dots === 17 && ghostsRef.current.find(g => g.id === "inky")?.inHouse) {
                  ghostsRef.current.find(g => g.id === "inky")!.isExiting = true;
                }
                if (globalDotCounterRef.current.dots === 32 && ghostsRef.current.find(g => g.id === "clyde")?.inHouse) {
                  ghostsRef.current.find(g => g.id === "clyde")!.isExiting = true;
                  globalDotCounterRef.current.active = false; // Deactivate global
                }
              } else {
                // Individual counters
                if (ghostsRef.current.find(g => g.id === "pinky")?.inHouse) {
                  ghostDotCountersRef.current.pinky++;
                  if (ghostDotCountersRef.current.pinky >= 0) ghostsRef.current.find(g => g.id === "pinky")!.isExiting = true;
                } else if (ghostsRef.current.find(g => g.id === "inky")?.inHouse) {
                  ghostDotCountersRef.current.inky++;
                  if (ghostDotCountersRef.current.inky >= 30) ghostsRef.current.find(g => g.id === "inky")!.isExiting = true;
                } else if (ghostsRef.current.find(g => g.id === "clyde")?.inHouse) {
                  ghostDotCountersRef.current.clyde++;
                  if (ghostDotCountersRef.current.clyde >= 60) ghostsRef.current.find(g => g.id === "clyde")!.isExiting = true;
                }
              }
            }

            // Check Victory (no more dots left)
            let dotsRemainingCount = 0;
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                if (mapRef.current[r][c] === "D" || mapRef.current[r][c] === "E") {
                  dotsRemainingCount++;
                }
              }
            }
            if (dotsRemainingCount === 0) {
              setGameState("VICTORY");
              synth.playLevelUp();
            }
            
            // Blinky Cruise Elroy global state update reference
            // the actual speed adjustment will be calculated inside updateGhosts loop
            if (dotsRemainingCount <= 10) {
               ghostsRef.current.find(g => g.id === "blinky")!.color = "#ff0000"; // visually identical but signals Elroy 2 implicitly 
            }
          }
        }
      }
    };

    const updateGhosts = () => {
      const { level } = contextRef.current;
      const pac = pacmanRef.current;
      const ghostSpeedBase = 1.5 + (level > 1 ? (level - 1) * 0.1 : 0);
      
      // Update global timers
      if (fTimerRef.current > 0) {
        fTimerRef.current--;
      } else {
        modeTimerFramesRef.current++;
        let limit = 0;
        const s = modeStageRef.current;
        if (level === 1) {
          limit = [420, 1200, 420, 1200, 300, 1200, 300, Infinity][s] || Infinity;
        } else if (level <= 4) {
          limit = [420, 1200, 420, 1200, 300, 61200, 1, Infinity][s] || Infinity;
        } else {
          limit = [300, 1200, 300, 1200, 300, 61200, 1, Infinity][s] || Infinity;
        }
        
        if (modeTimerFramesRef.current >= limit) {
          modeTimerFramesRef.current = 0;
          modeStageRef.current++;
          globalModeRef.current = globalModeRef.current === "SCATTER" ? "CHASE" : "SCATTER";
          
          // Reverse all ghosts that are outside
          ghostsRef.current.forEach(g => {
            if (!g.inHouse && !g.isDead) {
              g.dirX *= -1;
              g.dirY *= -1;
            }
          });
        }
      }

      // 4-second safety timer (240 frames at 60fps)
      timeSinceLastDotFramesRef.current++;
      if (timeSinceLastDotFramesRef.current > 240) {
        const nextInHouse = ghostsRef.current.find(g => g.inHouse && !g.isExiting);
        if (nextInHouse) nextInHouse.isExiting = true;
        timeSinceLastDotFramesRef.current = 0;
      }

      ghostsRef.current.forEach((ghost) => {
        // Return to house logic (isDead means migrating back)
        if (ghost.isDead && ghost.x === 13 && ghost.y === 11 && Math.abs(ghost.subX) <= 2 && Math.abs(ghost.subY) <= 2) {
            ghost.isDead = false;
            ghost.inHouse = true;
            ghost.isExiting = true; // Instantly bounce back out
            ghost.x = 13;
            ghost.y = 14;
            ghost.subX = 0;
            ghost.subY = 0;
        }

        if (ghost.isFrightened && fTimerRef.current <= 0) {
          ghost.isFrightened = false;
        }

        let targetTx = 0;
        let targetTy = 0;

        if (ghost.isDead) {
           targetTx = 13;
           targetTy = 11;
           ghost.speed = ghostSpeedBase * 2;
        } else if (ghost.inHouse) {
           if (ghost.isExiting) {
              targetTx = 13;
              targetTy = 11;
              ghost.speed = ghostSpeedBase * 0.5; // moving out
           } else {
              // Bouncing up and down
              targetTx = ghost.x;
              targetTy = ghost.y + (ghost.subY > 0 ? -1 : 1);
              ghost.speed = ghostSpeedBase * 0.4;
           }
        } else {
           // Normal modes
           ghost.speed = ghost.isFrightened ? ghostSpeedBase * 0.5 : ghostSpeedBase;
           
           if (ghost.id === "blinky" && !ghost.isFrightened) {
              let dotsCount = 0;
              for (let r = 0; r < ROWS; r++) {
                 for (let c = 0; c < COLS; c++) {
                    if (mapRef.current[r][c] === "D" || mapRef.current[r][c] === "E") dotsCount++;
                 }
              }
              if (dotsCount <= 10) ghost.speed = ghostSpeedBase * 1.1; // Elroy 2
              else if (dotsCount <= 20) ghost.speed = ghostSpeedBase * 1.05; // Elroy 1
           }

           // Tunnel penalty
           if (ghost.y === 14 && (ghost.x < 5 || ghost.x > 22)) {
             ghost.speed *= 0.5;
           }

           if (globalModeRef.current === "SCATTER" && !ghost.isFrightened) {
             if (ghost.id === "blinky") { targetTx = COLS - 2; targetTy = 0; }
             if (ghost.id === "pinky") { targetTx = 2; targetTy = 0; }
             if (ghost.id === "inky") { targetTx = COLS - 1; targetTy = ROWS - 2; }
             if (ghost.id === "clyde") { targetTx = 0; targetTy = ROWS - 2; }
           } else if (globalModeRef.current === "CHASE" && !ghost.isFrightened) {
             if (ghost.id === "blinky") {
               targetTx = pac.x; targetTy = pac.y;
             } else if (ghost.id === "pinky") {
               targetTx = pac.x + pac.dirX * 4;
               targetTy = pac.y + pac.dirY * 4;
               if (pac.dirY === -1) targetTx -= 4; // up bug
             } else if (ghost.id === "inky") {
               let px = pac.x + pac.dirX * 2;
               let py = pac.y + pac.dirY * 2;
               if (pac.dirY === -1) px -= 2;
               const blinky = ghostsRef.current.find(g => g.id === "blinky")!;
               targetTx = px + (px - blinky.x);
               targetTy = py + (py - blinky.y);
             } else if (ghost.id === "clyde") {
               const distSq = (ghost.x - pac.x) ** 2 + (ghost.y - pac.y) ** 2;
               if (distSq > 64) {
                 targetTx = pac.x; targetTy = pac.y;
               } else {
                 targetTx = 0; targetTy = ROWS - 2;
               }
             }
           }
        }

        let needsPath = (ghost.dirX === 0 && ghost.dirY === 0);
        
        // Prevent stacking
        if (!ghost.isDead && !ghost.inHouse) {
           const otherG = ghostsRef.current.find(g => g !== ghost && !g.isDead && !g.inHouse && g.x === ghost.x && g.y === ghost.y && Math.abs(g.subX - ghost.subX) < 4 && Math.abs(g.subY - ghost.subY) < 4);
           if (otherG && ghostsRef.current.indexOf(ghost) < ghostsRef.current.indexOf(otherG)) {
             ghost.speed *= 0.5;
           }
        }

        // Move ghost
        ghost.subX += ghost.dirX * ghost.speed;
        ghost.subY += ghost.dirY * ghost.speed;
        
        const overX = Math.abs(ghost.subX) >= TILE_SIZE;
        const overY = Math.abs(ghost.subY) >= TILE_SIZE;

        if (overX || overY) {
            const next = getTargetPos(ghost, ghost.dirX, ghost.dirY);
            ghost.x = next.tx;
            ghost.y = next.ty;
            if (overX) ghost.subX = ghost.subX - Math.sign(ghost.subX) * TILE_SIZE;
            if (overY) ghost.subY = ghost.subY - Math.sign(ghost.subY) * TILE_SIZE;
            needsPath = true;
        }

        // Only choose passing at an intersection / tile center when entering a fully new tile or stuck
        // Note: we consider "center" as exact when needsPath triggers, but practically we are slightly past center now.
        if (needsPath || (ghost.isExiting && ghost.x === 13 && ghost.y === 11 && Math.abs(ghost.subX) <= ghost.speed && Math.abs(ghost.subY) <= ghost.speed)) {
           if (ghost.isExiting && ghost.x === 13 && ghost.y === 11) {
              ghost.isExiting = false;
              ghost.inHouse = false;
              ghost.dirX = -1; ghost.dirY = 0; // standard initial exit dir
           }

           const dirs = [
             { dx: 0, dy: -1 }, // Up
             { dx: -1, dy: 0 }, // Left
             { dx: 0, dy: 1 },  // Down
             { dx: 1, dy: 0 }   // Right
           ];

           let bestDist = Infinity;
           let bestDir = { dx: ghost.dirX, dy: ghost.dirY };
           let validFound = false;

           const isIntersectionOrTurn = () => {
              let paths = 0;
              for (const d of dirs) {
                const tx = ghost.x + d.dx;
                const ty = ghost.y + d.dy;
                // Tunnel wrap handling for intersection check
                let checkTx = tx;
                if (checkTx < 0) checkTx = COLS - 1;
                if (checkTx >= COLS) checkTx = 0;

                if (!isWall(checkTx, ty, false) || (isWall(checkTx,ty,false) && mapRef.current[ty]?.[checkTx] === "-" && (ghost.isExiting || ghost.isDead))) {
                  paths++;
                }
              }
              // Tunnel wrap handling for current dir ahead
              let fTx = ghost.x + ghost.dirX;
              let fTy = ghost.y + ghost.dirY;
              if (fTx < 0) fTx = COLS - 1;
              if (fTx >= COLS) fTx = 0;
              
              const wallAhead = isWall(fTx, fTy, false) && !(mapRef.current[fTy]?.[fTx] === "-" && (ghost.isExiting || ghost.isDead));
              return paths > 2 || wallAhead;
           };

           if (isIntersectionOrTurn() || ghost.dirX === 0 && ghost.dirY === 0) {
             // Pseudo-random if frightened
             if (ghost.isFrightened && !ghost.isDead && !ghost.inHouse) {
                const validDirs = dirs.filter(d => {
                  if (d.dx === -ghost.dirX && d.dy === -ghost.dirY && (ghost.dirX!==0||ghost.dirY!==0)) return false;
                  const tx = ghost.x + d.dx;
                  const ty = ghost.y + d.dy;
                  if (ty < 0 || ty >= ROWS) return false;
                  
                  // Handle tunnel wrapping
                  let checkTx = tx;
                  if (checkTx < 0) checkTx = COLS - 1;
                  if (checkTx >= COLS) checkTx = 0;
                  
                  const isDoor = mapRef.current[ty]?.[checkTx] === "-";
                  return !isWall(checkTx, ty, false) && !isDoor;
                });
                if (validDirs.length > 0) {
                  const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                  ghost.dirX = randomDir.dx; ghost.dirY = randomDir.dy;
                }
             } else {
                for (const d of dirs) {
                  // No 180 reversing unless we are standing still or inhouse bouncing
                  if (!ghost.inHouse && d.dx === -ghost.dirX && d.dy === -ghost.dirY && (ghost.dirX !== 0 || ghost.dirY !== 0)) continue;
                  
                  const tx = ghost.x + d.dx;
                  const ty = ghost.y + d.dy;
                  
                  // Handle tunnel wrapping internally to find distance
                  let checkTx = tx;
                  if (checkTx < 0) checkTx = COLS - 1;
                  if (checkTx >= COLS) checkTx = 0;
                  if (ty < 0 || ty >= ROWS) continue;
                  
                  // Ghost house door
                  let passable = !isWall(checkTx, ty, false);
                  if (mapRef.current[ty]?.[checkTx] === "-") {
                    passable = ghost.isExiting || ghost.isDead;
                  }
   
                  if (passable) {
                    validFound = true;
                    const distSq = (checkTx - targetTx) ** 2 + (ty - targetTy) ** 2;
                    if (distSq < bestDist) {
                      bestDist = distSq;
                      bestDir = d;
                    }
                  }
                }
                if (validFound) {
                  ghost.dirX = bestDir.dx;
                  ghost.dirY = bestDir.dy;
                } else {
                  // Fallback if fully stuck (should theoretically never happen)
                  ghost.dirX = -ghost.dirX;
                  ghost.dirY = -ghost.dirY;
                }
             }
           }
        }
      });
    };

    const handleCollisions = () => {
      const pac = pacmanRef.current;
      ghostsRef.current.forEach((ghost) => {
        if (ghost.isDead) return;

        // Tile alignment collision check (approximate collision threshold)
        const dx = Math.abs((pac.x * TILE_SIZE + pac.subX) - (ghost.x * TILE_SIZE + ghost.subX));
        const dy = Math.abs((pac.y * TILE_SIZE + pac.subY) - (ghost.y * TILE_SIZE + ghost.subY));

        if (dx < 12 && dy < 12) {
          if (ghost.isFrightened) {
            // Eat ghost
            synth.playEatGhost();
            ghost.isDead = true;
            ghost.isFrightened = false;
            let mult = Math.pow(2, ghostEatenCountRef.current);
            ghostEatenCountRef.current++;
            let points = 200 * mult;
            setScore((s) => (!isBackCloset && s < 6700 && s + points >= 6700) ? 6700 : s + points);
          } else {
            // Pacman hit and loses life
            setGameState("DYING");
            animFrameRef.current = 0; // use to track death animation frames
          }
        }
      });
    };

    const respawnPacAndGhosts = () => {
      const { level } = contextRef.current;
      const diffM = difficulty === "HARD" ? 1.3 : (difficulty === "EASY" ? 0.7 : 1);
      const ghostSpeed = Math.min(2.8, (1.5 + ((level - 1) * 0.1)) * diffM);
      const pacSpeed = Math.min(3.2, 2 + ((level - 1) * 0.05));

      pacmanRef.current = {
        x: 13, y: 23, subX: 0, subY: 0,
        dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
        speed: pacSpeed
      };
      ghostsRef.current = [
        {
          id: "blinky", color: "#ef4444",
          x: 13, y: 11, subX: 0, subY: 0,
          dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
          speed: ghostSpeed, isFrightened: false, isDead: false, inHouse: false, isExiting: false
        },
        {
          id: "pinky", color: "#ffb8ff",
          x: 13, y: 14, subX: 0, subY: 0,
          dirX: 0, dirY: -1, nextDirX: 0, nextDirY: -1,
          speed: ghostSpeed, isFrightened: false, isDead: false, inHouse: true, isExiting: false
        },
        {
          id: "inky", color: "#00ffff",
          x: 11, y: 14, subX: 0, subY: 0,
          dirX: 1, dirY: 0, nextDirX: 1, nextDirY: 0,
          speed: ghostSpeed * 0.95, isFrightened: false, isDead: false, inHouse: true, isExiting: false
        },
        {
          id: "clyde", color: "#fb923c",
          x: 15, y: 14, subX: 0, subY: 0,
          dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
          speed: ghostSpeed * 0.9, isFrightened: false, isDead: false, inHouse: true, isExiting: false
        }
      ];

      fTimerRef.current = 0;
      globalModeRef.current = "SCATTER";
      modeStageRef.current = 0;
      modeTimerFramesRef.current = 0;
      globalDotCounterRef.current = { active: true, dots: 0 };
      timeSinceLastDotFramesRef.current = 0;
    };

    const update = () => {
      const { keyboardState } = contextRef.current;
      const pac = pacmanRef.current;

      // Handle keyboard instructions queued to pacman next direction
      if (keyboardState.ArrowUp) { pac.nextDirX = 0; pac.nextDirY = -1; }
      if (keyboardState.ArrowDown) { pac.nextDirX = 0; pac.nextDirY = 1; }
      if (keyboardState.ArrowLeft) { pac.nextDirX = -1; pac.nextDirY = 0; }
      if (keyboardState.ArrowRight) { pac.nextDirX = 1; pac.nextDirY = 0; }

      updateEntityPosition(pac, true);
      updateGhosts();
      handleCollisions();

      if (fTimerRef.current > 0) {
        fTimerRef.current--;
      }
      animFrameRef.current++;
    };

    const draw = () => {
      const paddingX = (canvas.width - COLS * TILE_SIZE) / 2;
      const paddingY = (canvas.height - ROWS * TILE_SIZE) / 2;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw maze grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = mapRef.current[r][c];
          const x = paddingX + c * TILE_SIZE;
          const y = paddingY + r * TILE_SIZE;

          if (tile === "W") {
            ctx.fillStyle = isBackCloset ? "#4c1d95" : "#1e3a8a"; // Glitchy purple vs Deep neon blue
            ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          } else if (tile === "D") {
            ctx.fillStyle = isBackCloset ? "#ec4899" : "#fbbf24"; // Pink food dot or Yellow food dot
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === "E") {
            // Flashing energizer
            if (Math.floor(animFrameRef.current / 8) % 2 === 0) {
              ctx.fillStyle = isBackCloset ? "#f472b6" : "#ffffff";
              ctx.beginPath();
              ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (tile === "-") {
            // Ghost gate door
            ctx.fillStyle = "#ec4899"; // pink border
            ctx.fillRect(x + 2, y + Math.floor(TILE_SIZE / 2) - 1, TILE_SIZE - 4, 2);
          }
        }
      }

      // Draw Pacman
      const pac = pacmanRef.current;
      const pacWorldX = paddingX + pac.x * TILE_SIZE + pac.subX + TILE_SIZE / 2;
      const pacWorldY = paddingY + pac.y * TILE_SIZE + pac.subY + TILE_SIZE / 2;

      ctx.fillStyle = "#facc15"; // pacman yellow
      
      if (gameState === "DYING") {
        // Detailed stretching and flattening sequence:
        // Tilts head back, opens mouth incredibly wide, shrinks down to single pixel, fades away.
        const dTimer = animFrameRef.current; // 0 to 120
        let shrinkScale = 1;
        let mouthOpen = 0.25;
        let rotateAngle = 0;
        
        if (dTimer < 60) {
          mouthOpen = 0.25 + (dTimer / 60) * Math.PI; // opens incredibly wide
          rotateAngle = (dTimer / 60) * -Math.PI / 2; // tilts head back (up)
        } else if (dTimer < 100) {
          mouthOpen = Math.PI;
          rotateAngle = -Math.PI / 2;
          shrinkScale = 1 - ((dTimer - 60) / 40);     // collapses in
        } else {
          shrinkScale = 0; // single pixel / vanished
        }
        
        if (shrinkScale > 0) {
          ctx.beginPath();
          ctx.translate(pacWorldX, pacWorldY);
          ctx.rotate(rotateAngle);
          ctx.arc(0, 0, (TILE_SIZE / 2.3) * shrinkScale, mouthOpen, -mouthOpen + Math.PI * 2);
          ctx.lineTo(0, 0);
          ctx.fill();
          ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        }
      } else {
        ctx.beginPath();
        // Calculate mouth rotation angle depending on moving direction
        let startAngle = 0;
        let endAngle = Math.PI * 2;
        const mouthAnim = Math.sin(animFrameRef.current * 0.4) * 0.25 + 0.25; // opening/closing
        
        let rot = 0;
        if (pac.dirX === 1) rot = 0;
        else if (pac.dirX === -1) rot = Math.PI;
        else if (pac.dirY === 1) rot = Math.PI / 2;
        else if (pac.dirY === -1) rot = -Math.PI / 2;

        startAngle = rot + mouthAnim;
        endAngle = rot + Math.PI * 2 - mouthAnim;

        ctx.arc(pacWorldX, pacWorldY, TILE_SIZE / 2.3, startAngle, endAngle);
        ctx.lineTo(pacWorldX, pacWorldY);
        ctx.fill();
      }

      // If Ms Pacman, draw a red bow
      if (isBackCloset) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        // Calculate bow offset based on rotation
        const bowX = pacWorldX - 2;
        const bowY = pacWorldY - TILE_SIZE / 2 + 1;
        // Two triangles for bow
        ctx.moveTo(bowX, bowY);
        ctx.lineTo(bowX - 6, bowY - 4);
        ctx.lineTo(bowX - 6, bowY + 4);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(bowX, bowY);
        ctx.lineTo(bowX + 6, bowY - 4);
        ctx.lineTo(bowX + 6, bowY + 4);
        ctx.fill();
        
        ctx.fillStyle = "#ffffff"; // center knot
        ctx.fillRect(bowX - 1.5, bowY - 1.5, 3, 3);
      }

      // Draw Ghosts
      ghostsRef.current.forEach((ghost) => {
        if (ghost.isDead) return;

        const ghostWorldX = paddingX + ghost.x * TILE_SIZE + ghost.subX + TILE_SIZE / 2;
        const ghostWorldY = paddingY + ghost.y * TILE_SIZE + ghost.subY + TILE_SIZE / 2;

        ctx.beginPath();
        if (ghost.isFrightened) {
          // Scared state: dark blue or flashing white/blue
          const isFlashing = fTimerRef.current < 120 && Math.floor(animFrameRef.current / 10) % 2 === 0;
          ctx.fillStyle = isFlashing ? "#ffffff" : "#2563eb";
        } else {
          ctx.fillStyle = ghost.color;
        }

        // Arcade standard dome head and wavy feet
        const size = TILE_SIZE / 2.2;
        ctx.arc(ghostWorldX, ghostWorldY, size, Math.PI, 0, false);
        ctx.lineTo(ghostWorldX + size, ghostWorldY + size);
        ctx.lineTo(ghostWorldX - size, ghostWorldY + size);
        ctx.fill();

        // Draw Ghost eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        const eyeOffsetX = ghost.dirX * 2;
        const eyeOffsetY = ghost.dirY * 2;
        ctx.arc(ghostWorldX - 3 + eyeOffsetX, ghostWorldY - 2 + eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.arc(ghostWorldX + 3 + eyeOffsetX, ghostWorldY - 2 + eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = ghost.isFrightened ? "#ef4444" : "#000000"; // Red pupils if scared
        ctx.beginPath();
        ctx.arc(ghostWorldX - 3 + eyeOffsetX, ghostWorldY - 2 + eyeOffsetY, 1.2, 0, Math.PI * 2);
        ctx.arc(ghostWorldX + 3 + eyeOffsetX, ghostWorldY - 2 + eyeOffsetY, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Simple HUD overlay
      const { score, level, lives } = contextRef.current;
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'JetBrains Mono', Courier, monospace";
      ctx.fillText(`SCORE: ${score}`, 15, 20);
      ctx.fillText(`LEVEL: ${level}`, Math.floor(canvas.width / 2) - 30, 20);
      ctx.fillText(`LIVES: ${"❤".repeat(Math.max(0, lives))}`, canvas.width - 100, 20);
    };

    const loop = () => {
      if (gameState === "DYING") {
        animFrameRef.current += 1;
        if (animFrameRef.current > 120) { // 2 seconds at 60fps
          setLives((l) => {
            const remaining = l - 1;
            if (remaining <= 0) {
              setGameState("GAMEOVER");
              onGameOver(contextRef.current.score);
            } else {
              setGameState("PLAYING");
              respawnPacAndGhosts();
            }
            return remaining;
          });
          return; // wait for next effect
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
  }, [gameState, isPaused]);

  const startGame = (isNextLevel: boolean = false) => {
    if (!isNextLevel) {
      synth.playCoin();
      setScore(0);
      setLives(3);
      setLevel(1);
    } else {
      setLevel((l) => l + 1);
    }
    
    // Ghost speed increases per level (capped)
    const diffM = difficulty === "HARD" ? 1.3 : (difficulty === "EASY" ? 0.7 : 1);
    let levelForSpeed = isNextLevel ? level + 1 : 1;
    const ghostSpeed = Math.min(2.8, (1.5 + ((levelForSpeed - 1) * 0.1)) * diffM);

    mapRef.current = JSON.parse(JSON.stringify(MAZE_MAP));
    pacmanRef.current = {
      x: 13, y: 23, subX: 0, subY: 0,
      dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
      speed: Math.min(3.2, 2 + ((levelForSpeed - 1) * 0.05))
    };
    ghostsRef.current = [
      {
        id: "blinky", color: "#ef4444",
        x: 13, y: 11, subX: 0, subY: 0,
        dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
        speed: ghostSpeed, isFrightened: false, isDead: false, inHouse: false, isExiting: false
      },
      {
        id: "pinky", color: "#ffb8ff",
        x: 13, y: 14, subX: 0, subY: 0,
        dirX: 0, dirY: -1, nextDirX: 0, nextDirY: -1,
        speed: ghostSpeed, isFrightened: false, isDead: false, inHouse: true, isExiting: false
      },
      {
        id: "inky", color: "#00ffff",
        x: 11, y: 14, subX: 0, subY: 0,
        dirX: 1, dirY: 0, nextDirX: 1, nextDirY: 0,
        speed: ghostSpeed * 0.95, isFrightened: false, isDead: false, inHouse: true, isExiting: false // Inky
      },
      {
        id: "clyde", color: "#fb923c",
        x: 15, y: 14, subX: 0, subY: 0,
        dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0,
        speed: ghostSpeed * 0.9, isFrightened: false, isDead: false, inHouse: true, isExiting: false // Clyde
      }
    ];

    fTimerRef.current = 0;
    globalModeRef.current = "SCATTER";
    modeStageRef.current = 0;
    modeTimerFramesRef.current = 0;
    globalDotCounterRef.current = { active: false, dots: 0 }; // normal start uses individual counters
    ghostDotCountersRef.current = { pinky: 0, inky: 0, clyde: 0 };
    timeSinceLastDotFramesRef.current = 0;

    setGameState("PLAYING");
  };

  return (
    <div id="pacman-game-container" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 rounded-xl border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] w-full h-full overflow-hidden">
      <div className="flex justify-between w-full mb-2 sm:mb-3 items-center flex-shrink-0">
        <h3 className="text-yellow-400 font-bold tracking-widest text-base sm:text-lg">PAC-MAN</h3>
        <span className="text-zinc-400 text-xs font-mono">HIGH SCORE: {highScore}</span>
      </div>

      <div className="relative border-4 border-zinc-800 rounded-md overflow-hidden bg-black flex justify-center items-center flex-1 min-h-0 w-full max-w-[448px] aspect-[448/546]">
        <canvas
          ref={canvasRef}
          width={448}
          height={546}
          className="w-full h-full object-contain bg-black"
        />
        {/* CRT Glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.1)] mix-blend-screen rounded-sm opacity-80 select-none bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.15)_100%)]"></div>

        {gameState === "READY" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6">
            <h4 className="text-yellow-400 font-mono text-3xl mb-4 tracking-wider animate-pulse">INSERT COIN / START</h4>
            <div className="text-zinc-300 font-mono text-sm max-w-[450px] mb-6 space-y-2">
              <p>Navigate with Arrow Keys <span className="text-white font-bold">▲ ▼ ◄ ►</span> to eat all the dots.</p>
              <p>Eat corner <span className="text-white font-bold">Energizer Blocks</span> to frighten the ghosts so you can eat them!</p>
            </div>
            <button
              id="pacman-start-btn"
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
            <h4 className="font-mono text-ef-red text-red-500 text-4xl mb-4 tracking-wider">GAME OVER</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="pacman-retry-btn"
              onClick={() => startGame()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              TRY AGAIN (ENTER)
            </button>
          </div>
        )}

        {gameState === "VICTORY" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <h4 className="font-mono text-yellow-400 text-4xl mb-4 tracking-widest animate-bounce">MAZE CLEARED!</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Fantastic job. Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="pacman-victory-btn"
              onClick={() => startGame(true)}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              NEXT STAGE (ENTER)
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
        <div>CONTROLS: [<span className="text-yellow-400">◄</span> / <span className="text-yellow-400">▲</span> / <span className="text-yellow-400">►</span> / <span className="text-yellow-400">▼</span>] Navigate Maze</div>
        <div>[<span className="text-yellow-400">ENTER</span>] Start Game</div>
      </div>
    </div>
  );
}
