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
  difficulty?: Difficulty;
  isBackCloset?: boolean;
  isPaused?: boolean;
}

interface Barrel {
  x: number;
  y: number;
  vx: number;
  currentPlatformIndex: number;
  size: number;
  falling: boolean;
  passed: boolean;
}

interface Platform {
  yStart: number;
  yEnd: number;
  xStart: number;
  xEnd: number;
}

interface Ladder {
  x: number;
  yBottom: number;
  yTop: number;
  isBroken?: boolean;
}

interface Rivet {
  id: string;
  x: number;
  y: number;
  pulled: boolean;
}


const SPRITES_BASE = {
  marioStand: [
    "....rrrrr.......",
    "...rrrrrrrrr....",
    "...bbbooyyo.....",
    "..bobooyyoyyy...",
    "..bobbooyyoyyy..",
    "..bbboooyyyy....",
    "....ooooooo.....",
    "....rrbrrrr.....",
    "...rrrbrbrrr....",
    "..rrrrbbbbrrr...",
    "..oorrbybbrroo..",
    "..ooorbbbbrooo..",
    "..oorbbbbbroo...",
    "....bbb.bbb.....",
    "...===...===...."
  ],
  marioRun1: [
    "....rrrrr.......",
    "...rrrrrrrrr....",
    "...bbbooyyo.....",
    "..bobooyyoyyy...",
    "..bobbooyyoyyy..",
    "..bbboooyyyy....",
    "....ooooooo.....",
    "....rrbrrrr.....",
    "...rrrbrbrrr....",
    "..rrrrbbbbrrr...",
    "..oorrbybbrr....",
    "..ooorbbbbro....",
    "..oorbbbbbroo...",
    "....bbb.........",
    "...===.........."
  ],
  marioRun2: [
    "....rrrrr.......",
    "...rrrrrrrrr....",
    "...bbbooyyo.....",
    "..bobooyyoyyy...",
    "..bobbooyyoyyy..",
    "..bbboooyyyy....",
    "....ooooooo.....",
    "....rrbrrrr.....",
    "...rrrbrbrrr....",
    "..rrrrbbbbrrr...",
    "....rrbybbrroo..",
    "....orbbbbrooo..",
    "...oorbbbbbro...",
    "........bbb.....",
    ".........===...."
  ],
  marioClimb1: [
    "....rrrrr.......",
    "...rrrrrrrrr....",
    "...bbbooyyo.....",
    "..bobooyyoyyy...",
    "..bobbooyyoyyy..",
    "..bbboooyyyy....",
    "....ooooooo.....",
    "...rrrbrbrrr....",
    "..oorrbbbbrroo..",
    "..ooorbbbbrooo..",
    "...oorbbbbro....",
    ".....rbbbb......",
    "....bbbbbbbb....",
    "...===....===..."
  ],
  marioClimb2: [
    "....rrrrr.......",
    "...rrrrrrrrr....",
    "...bbbooyyo.....",
    "..bobooyyoyyy...",
    "..bobbooyyoyyy..",
    "..bbboooyyyy....",
    "....ooooooo.....",
    "...rrrbrbrrr....",
    "....rrbbbbrroo..",
    "....orbbbbrooo..",
    ".....rbbbbroo...",
    "......bbbb......",
    "....bbbbbbbb....",
    "...===....===..."
  ],
  dkStand: [
    "........DDDD........",
    "......DDddddDD......",
    ".....DddwDkwDkD.....",
    ".....DddwDkwDkD.....",
    "....DDddddddddDD....",
    "...DDDdDwdDwdDdDD...",
    "...DDDwwwwwwwwwDD...",
    "...DDDdDwdDwdDwDD...",
    ".D.DDDDddddddddDD.D.",
    "DDDD..DDddDddDD..DDDD",
    "DDDD...DDddddDD..DDDD",
    ".DDD...DDDDDDDD..DDD.",
    ".DDDD.DDDDDDDDDD.DDDD",
    "...DDDDDDDDDDDDDD...",
    ".....DDD....DDD.....",
    "....DDD......DDD....",
    "...dDD........DDd...",
    "..dddd........dddd.."
  ],
  dkStomp1: [
    "........DDDD........",
    "......DDddddDD......",
    ".....DddwDkwDkD.....",
    ".....DddwDkwDkD.....",
    "....DDddddddddDD....",
    "...DDDdDwdDwdDdDD...",
    "...DDDwwwwwwwwwDD...",
    "...DDDdDwdDwdDwDD...",
    ".D.DDDDddddddddDD...",
    "DDDD..DDddDddDD.....",
    "DDDD...DDddddDD.....",
    ".DDD...DDDDDDDD..DD.",
    ".......DDDDDDDDDDDD.",
    ".......DDDDDDDD..DD.",
    ".....DDD....DDD.....",
    "....DDD......DDD....",
    "...dDD........DDd...",
    "..dddd........dddd.."
  ],
  dkStomp2: [
    "........DDDD........",
    "......DDddddDD......",
    ".....DddwDkwDkD.....",
    ".....DddwDkwDkD.....",
    "....DDddddddddDD....",
    "...DDDdDwdDwdDdDD...",
    "...DDDwwwwwwwwwDD...",
    "...DDDdDwdDwdDwDD...",
    "...DDDDddddddddDD.D.",
    ".....DDddDddDD..DDDD",
    ".....DDddddDD...DDDD",
    ".DD..DDDDDDDD...DDD.",
    ".DDDDDDDDDDDD.......",
    ".DD..DDDDDDDD.......",
    ".....DDD....DDD.....",
    "....DDD......DDD....",
    "...dDD........DDd...",
    "..dddd........dddd.."
  ],
  pauline: [
    "....HHHHH....",
    "...HHSHSHH...",
    "...HSHSHSH...",
    "...HSSSSS....",
    "....SSSSS....",
    "....SSSSS....",
    "...ppppppp...",
    "..ppppppppp..",
    "..ppppppppp..",
    "..ppppppppp..",
    "...PPPPPPP...",
    "...PPPPPPP...",
    "....PP.PP....",
    "....PP.PP....",
    "....SS.SS....",
    "....BB.BB...."
  ],
  barrel1: [
    "..kkkkkkkk..",
    ".kBxBBBBxBk.",
    "kBBxBBBBxBBk",
    "kBBBBBBBBBBk",
    "kBBxBBBBxBBk",
    "kxBBBBBBBBxk",
    "kBBxBBBBxBBk",
    "kBBBBBBBBBBk",
    "kBBBBBBBBBBk",
    "kBBxBBBBxBBk",
    ".kBxBBBBxBk.",
    "..kkkkkkkk.."
  ],
  barrel2: [
    "..kkkkkkkk..",
    ".kxBBBBBBxk.",
    "kxBBBBBBBBxk",
    "kBBxBBBBxBBk",
    "kxBBBBBBBBxk",
    "kxBBBBBBBBxk",
    "kxBBBBBBBBxk",
    "kBBxBBBBxBBk",
    "kBBBBBBBBBBk",
    "kxBBBBBBBBxk",
    ".kxBBBBBBxk.",
    "..kkkkkkkk.."
  ],
  fireball: [
    "...FFffFF...",
    "..FFFfffff..",
    ".FFFffFffFf.",
    "FFFF.ff.FffF",
    "FFFFFFffFFFF",
    "fFFFFFffFFFf",
    ".ffFFFffFFf.",
    "..ffFFfFff..",
    "...ffFFff...",
    "....ffff...."
  ],
  fireball2: [
    "..ffFFFFff..",
    ".fffFFFFfff.",
    "ffFF.FF.FFFf",
    "FFFfFFFFfFFF",
    "fFFffFFFffFf",
    ".fffFFFFfff.",
    "..ffFffFff..",
    "...fFffFf...",
    "....fFFf....",
    ".....ff....."
  ]
};

const PALETTE: Record<string, string> = {
  '.': 'transparent',
  'r': '#e60000', // Mario red
  'b': '#00004d', // Mario navy blue
  'o': '#ffcc99', // Mario skin
  'y': '#000000', // Mario hair/mustache/buttons
  '=': '#663300', // Shoes
  'w': '#ffffff', // White
  'D': '#3c2415', // DK Fur (Dark chocolate)
  'd': '#ffcc99', // DK Skin (Tan peach)
  'k': '#000000', // DK pupil / general black
  'p': '#ff63b1', // Pauline pastel
  'P': '#ff007f', // Pauline hot pink
  'H': '#5c3a21', // Pauline hair
  'S': '#ffcc99', // Pauline skin
  'B': '#c17a22', // Barrel golden-brown
  'x': '#000000', // Barrel hoops
  'F': '#ef4444', // Fireball Red
  'f': '#f97316', // Fireball Orange
  'M': '#9ca3af', // Metal gray
  'W': '#ffffff', // White
};

const SPRITES = {
  ...SPRITES_BASE,
  hammer: [
    "..MMMM..",
    ".MMMMMM.",
    "MMMMMMMM",
    "MMMMMMMM",
    "MMMMMMMM",
    ".MMMMMM.",
    "..MMMM..",
    "...WW...",
    "...WW...",
    "...WW..."
  ]
};

function drawSprite(ctx: CanvasRenderingContext2D, sprite: string[], x: number, y: number, scale: number, flipX: boolean = false) {

  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      const char = sprite[r][c];
      if (char === '.') continue;
      ctx.fillStyle = PALETTE[char] || '#000';
      const drawX = flipX ? (x + (sprite[r].length - 1 - c) * scale) : (x + c * scale);
      ctx.fillRect(Math.floor(drawX), Math.floor(y + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
}

export default function DonkeyKong({ keyboardState, onGameOver, highScore, difficulty = "MEDIUM", isBackCloset = false, isPaused = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<"INTRO" | "READY" | "PLAYING" | "DYING" | "GAMEOVER" | "VICTORY" | "PAUSED">( "READY" );
  const [level, setLevel] = useState(1);
  const [stageIndex, setStageIndex] = useState(0);

  const LEVEL_SEQUENCES = [
    ['BARRELS', 'RIVETS'], // Level 1
    ['BARRELS', 'ELEVATORS', 'RIVETS'], // Level 2
    ['BARRELS', 'CONVEYORS', 'ELEVATORS', 'RIVETS'], // Level 3
    ['BARRELS', 'ELEVATORS', 'BARRELS', 'ELEVATORS', 'RIVETS'], // Level 4
    ['BARRELS', 'CONVEYORS', 'BARRELS', 'ELEVATORS', 'BARRELS', 'RIVETS'] // Level 5
  ];

  const currentSequence = LEVEL_SEQUENCES[Math.min(level - 1, 4)];
  const stageType = currentSequence[stageIndex];
  
  const isRivetStage = stageType === 'RIVETS';
  const isElevators = stageType === 'ELEVATORS';
  const isConveyors = stageType === 'CONVEYORS';
  const isDKJr = isBackCloset;

  // Physics states kept in ref to run at solid 60fps
  const stateRef = useRef({
    playerX: 80,
    playerY: 320, // starts safely above bottom platform
    playerVx: 0,
    playerVy: 0,
    isJumping: false,
    isClimbing: false,
    fallStartY: 320,
    currentPlatform: 3, // index in platforms array
    score: 0,
    barrels: [] as Barrel[],
    rivets: [] as Rivet[],
    hammers: [] as { id: string, x: number, y: number }[],
    hammerTimer: 0, // > 0 means active
    fireballs: [] as { x: number, y: number, vx: number, vy: number, state: 'CHASE' | 'RANDOM', isFox: boolean, stateTimer: number, currentPlatformIndex: number }[],
    barrelTimer: 0,
    animFrame: 0,
    level: 1,
    deathTimer: 0,
    introTimer: 0,
    isFacingLeft: false,
  });

  const canvasWidth = 600;
  const canvasHeight = 400;

  const isFlatStage = isRivetStage || isConveyors;

  // Platform layouts (Index 0 = top-most, Index 3 = bottom)
  const platforms: Platform[] = isFlatStage ? [
    { yStart: 130, yEnd: 130, xStart: 190, xEnd: 410 }, // Top deck
    { yStart: 190, yEnd: 190, xStart: 50, xEnd: 550 }, // Tier 1
    { yStart: 250, yEnd: 250, xStart: 50, xEnd: 550 }, // Tier 2
    { yStart: 310, yEnd: 310, xStart: 50, xEnd: 550 }, // Tier 3
    { yStart: 370, yEnd: 370, xStart: 0, xEnd: 600 },  // Bottom
  ] : [
    { yStart: 120, yEnd: 120, xStart: 50, xEnd: 570 },  // Top platform (Flat)
    { yStart: 200, yEnd: 180, xStart: 30, xEnd: 600 },  // Middle 1 (Right is up)
    { yStart: 260, yEnd: 280, xStart: 0,  xEnd: 570 },  // Middle 2 (Left is up)
    { yStart: 360, yEnd: 340, xStart: 0,  xEnd: 600 },  // Bottom platform (Right is up)
  ];

  const getPlatformY = (plat: Platform, x: number) => {
    if (x < plat.xStart) return plat.yStart;
    if (x > plat.xEnd) return plat.yEnd;
    const t = (x - plat.xStart) / (plat.xEnd - plat.xStart);
    return plat.yStart + t * (plat.yEnd - plat.yStart);
  };

  // Ladders connecting the layers
  const ladders: Ladder[] = isFlatStage ? [
    { x: 100, yTop: 310, yBottom: 370 },
    { x: 500, yTop: 310, yBottom: 370 },
    { x: 250, yTop: 250, yBottom: 310 },
    { x: 350, yTop: 250, yBottom: 310 },
    { x: 150, yTop: 190, yBottom: 250 },
    { x: 450, yTop: 190, yBottom: 250 },
    { x: 250, yTop: 130, yBottom: 190 },
    { x: 350, yTop: 130, yBottom: 190 },
    ...(isConveyors ? [{ x: 300, yBottom: 130, yTop: 60 }] : [])
  ] : [
    { x: 480, yBottom: getPlatformY(platforms[3], 480), yTop: getPlatformY(platforms[2], 480) }, // 3 -> 2
    { x: 380, yBottom: getPlatformY(platforms[3], 380), yTop: getPlatformY(platforms[2], 380) }, // Extra 3 -> 2
    { x: 250, yTop: getPlatformY(platforms[2], 250), yBottom: getPlatformY(platforms[2], 250) + 25, isBroken: true },
    { x: 250, yTop: getPlatformY(platforms[3], 250) - 25, yBottom: getPlatformY(platforms[3], 250), isBroken: true },

    { x: 120, yBottom: getPlatformY(platforms[2], 120), yTop: getPlatformY(platforms[1], 120) }, // 2 -> 1
    { x: 240, yBottom: getPlatformY(platforms[2], 240), yTop: getPlatformY(platforms[1], 240) }, // Extra 2 -> 1
    { x: 380, yTop: getPlatformY(platforms[1], 380), yBottom: getPlatformY(platforms[1], 380) + 25, isBroken: true },
    { x: 380, yTop: getPlatformY(platforms[2], 380) - 25, yBottom: getPlatformY(platforms[2], 380), isBroken: true },

    { x: 460, yBottom: getPlatformY(platforms[1], 460), yTop: getPlatformY(platforms[0], 460) }, // 1 -> 0
    { x: 350, yBottom: getPlatformY(platforms[1], 350), yTop: getPlatformY(platforms[0], 350) }, // Extra 1 -> 0
    
    { x: 180, yTop: getPlatformY(platforms[0], 180), yBottom: getPlatformY(platforms[0], 180) + 25, isBroken: true },
    { x: 180, yTop: getPlatformY(platforms[1], 180) - 25, yBottom: getPlatformY(platforms[1], 180), isBroken: true },

    { x: 300, yBottom: 120, yTop: 60 },  // Pauline ladder
  ];

  const paulinePlatform: Platform = { yStart: 60, yEnd: 60, xStart: 250, xEnd: 350 };
  const dkPlatform: Platform = isFlatStage ? { yStart: 130, yEnd: 130, xStart: 210, xEnd: 390 } : { yStart: 100, yEnd: 100, xStart: 80, xEnd: 220 };

  
  const prevP = useRef(false);
  const achievementsFired = useRef<Set<string>>(new Set());

  const startGameRef = useRef<any>(null);

  useEffect(() => {
    const onDebug = (e: any) => {
      if (e.detail.game === 'DONKEYKONG') {
        let needsRestart = false;
        let newL = undefined;
        let newS = undefined;
        if (e.detail.updates.score !== undefined) setScore(e.detail.updates.score);
        if (e.detail.updates.level !== undefined) {
           newL = e.detail.updates.level;
           setLevel(newL);
           needsRestart = true;
        }
        if (e.detail.updates.stageIndex !== undefined) {
           newS = e.detail.updates.stageIndex;
           setStageIndex(newS);
           needsRestart = true;
        }
        if (needsRestart && startGameRef.current) {
           setTimeout(() => {
             startGameRef.current(false, true, newL, newS);
             setGameState("INTRO");
           }, 10);
        }
      }
    };
    window.addEventListener("debugAction", onDebug);
    return () => window.removeEventListener("debugAction", onDebug);
  }, []);

  useEffect(() => {
    if (score >= 1000 && !achievementsFired.current.has('score_1000')) {
      achievementsFired.current.add('score_1000');
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_1000", title: "Arcade Master", text: "1000 Points Reached in " + "DonkeyKong" + "!" } }));
    }
  }, [score]);

  useEffect(() => {
    if (score >= 5000 && !achievementsFired.current.has('score_5000')) {
      achievementsFired.current.add('score_5000');
      window.dispatchEvent(new CustomEvent("achievement", { detail: { id: "score_5000", title: "Retro God", text: "5000 Points Reached in " + "DonkeyKong" + "!" } }));
    }
  }, [score]);

  useEffect(() => {
    const state = stateRef.current;
    if (isRivetStage) {
      state.rivets = ladders.map((l, i) => ({ id: `rivet-${i}`, x: l.x, y: l.yTop, pulled: false }));
    } else {
      state.rivets = [];
    }
     
    const isBarrelStage = !isFlatStage && !isElevators;
    if (isBarrelStage) {
      state.hammers = [
         { id: 'h1', x: 60, y: getPlatformY(platforms[2], 60) - 20 },
         { id: 'h2', x: 480, y: getPlatformY(platforms[0], 480) - 20 }
      ];
    } else if (isRivetStage) {
      state.hammers = [
         { id: 'h1', x: 80, y: 250 - 20 },
         { id: 'h2', x: 520, y: 190 - 20 }
      ];
    } else {
      state.hammers = [];
    }
  }, [stageIndex, level]);

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
  }, [score]);

  useEffect(() => {
    if (gameState !== "PLAYING" && gameState !== "DYING" && gameState !== "INTRO") return;
    if (isPaused) return;

    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.6;
    const playerSpeed = 3.0; // 1.5 * 2
    const climbSpeed = 1.5;
    const jumpStrength = -6.2;
    const playerHeight = 32;
    const playerWidth = 24;

    const spawnBarrel = () => {
      stateRef.current.barrels.push({
        x: isFlatStage ? 300 : 130,
        y: isFlatStage ? 100 : 80,
        vx: 2.2,
        currentPlatformIndex: -1, // -1 means top start
        size: 10,
        falling: true,
        passed: false
      });
      synth.playBounce();
    };

    const resetPlayer = () => {
      const state = stateRef.current;
      state.playerX = 80;
      state.playerY = (isFlatStage ? 380 : 360) - playerHeight;
      state.playerVx = 0;
      state.playerVy = 0;
      state.isJumping = false;
      state.isClimbing = false;
      state.currentPlatform = isElevators ? 3 : 4;
      state.barrels = []; // Clear barrels on death/reset
      state.fireballs = [];
      state.hammerTimer = 0;
      
      const isBarrelStage = !isFlatStage && !isElevators;
      if (isBarrelStage) {
         state.hammers = [
            { id: 'h1', x: 60, y: getPlatformY(platforms[2], 60) - 20 },  // 3rd tier from bottom -> index 2? (3 = bottom, 2 = 3rd, 1 = 4th, 0 = 5th)
            { id: 'h2', x: 480, y: getPlatformY(platforms[0], 480) - 20 } // 5th tier
         ];
      } else if (isRivetStage) {
         state.hammers = [
            { id: 'h1', x: 80, y: 250 - 20 },
            { id: 'h2', x: 520, y: 190 - 20 }
         ];
      } else {
         state.hammers = [];
      }

      if (isRivetStage) {
        state.rivets = ladders.map((l, i) => ({ id: `rivet-${i}`, x: l.x, y: l.yTop, pulled: false }));
      } else {
        state.rivets = [];
      }
    };

    const update = () => {
      const state = stateRef.current;
      state.animFrame++;

      // 1. Spawn barrels
      state.barrelTimer--;
      if (state.barrelTimer <= 0) {
        spawnBarrel();
        state.barrelTimer = 180 - Math.min(80, score / 15); // spawn progressively faster
      }

      // 2. Ladder check (near ladder X-alignment)
      let nearLadder: Ladder | null = null;
      ladders.forEach((ladder) => {
        if (Math.abs(state.playerX + playerWidth / 2 - ladder.x) < 14) {
          // Verify vertical bounds
          if (state.playerY + playerHeight >= ladder.yTop - 5 && state.playerY + playerHeight <= ladder.yBottom + 10) {
            nearLadder = ladder;
          }
        }
      });

      // 3. Jumpman controls
      if (state.isClimbing && nearLadder) {
        state.playerVx = 0;
        if (keyboardState.ArrowUp) {
          state.playerY -= 2;
          // Top edge safety
          if (state.playerY + playerHeight <= (nearLadder as Ladder).yTop) {
            state.playerY = (nearLadder as Ladder).yTop - playerHeight;
            state.isClimbing = false;
          }
        } else if (keyboardState.ArrowDown) {
          state.playerY += 1.5; // Climb slower than walking
          // Bottom edge safety
          if (state.playerY + playerHeight >= (nearLadder as Ladder).yBottom) {
            state.playerY = (nearLadder as Ladder).yBottom - playerHeight;
            state.isClimbing = false;
          }
        } else if (!keyboardState.ArrowUp && !keyboardState.ArrowDown) {
          // stop sliding
        }
      } else {
        // Run and Jump mechanics (Horizontal lock during jump)
        if (!state.isJumping) {
          state.playerVx = 0;
          const speed = state.hammerTimer > 0 ? 1.5 : playerSpeed;
          if (keyboardState.ArrowLeft) {
            state.playerVx = -speed;
            state.isFacingLeft = true;
          }
          if (keyboardState.ArrowRight) {
            state.playerVx = speed;
            state.isFacingLeft = false;
          }
        }

        // Initiate Climbing
        if (nearLadder && !state.isClimbing && !state.isJumping && state.hammerTimer === 0) {
          const atTop = Math.abs(state.playerY + playerHeight - nearLadder.yTop) < 5;
          const atBot = Math.abs(state.playerY + playerHeight - nearLadder.yBottom) < 5;
          if ((keyboardState.ArrowUp && !atTop) || (keyboardState.ArrowDown && !atBot)) {
            state.isClimbing = true;
            state.isJumping = false;
            state.playerX = (nearLadder as Ladder).x - playerWidth / 2; // align to ladder center
          }
        }

        // Apply running
        state.playerX += state.playerVx;

        // Jump trigger
        if (keyboardState.ArrowUp && !state.isJumping && !state.isClimbing && state.hammerTimer === 0) {
          state.playerVy = jumpStrength;
          state.isJumping = true;
          state.fallStartY = state.playerY; // Track jump starting Y
          synth.playJump();
        }

        // Win condition simply by reaching high enough
        if (state.playerY + playerHeight <= 75) {
            if (state.playerX >= 230 && state.playerX <= 370) {
              state.playerY = 60 - playerHeight;
              state.playerVy = 0;
              state.isJumping = false;

              if (gameState !== "VICTORY") {
                setGameState("VICTORY");
                const bonus = Math.max(0, 5000 - Math.floor(stateRef.current.animFrame / 60) * 100);
                setScore((s) => s + bonus);
                synth.playLevelUp();
              }
            }
        }

        // Gravity and floor alignments
        if (!state.isClimbing) {
          state.playerVy += gravity;
          state.playerY += state.playerVy;

          // Align to platforms
          let onSolidGround = false;
          let activeIndex = 3;

          // Check main platforms
          platforms.forEach((plat, idx) => {
            const cx = state.playerX + playerWidth / 2;
            if (cx >= plat.xStart && cx <= plat.xEnd) {
              const footPosition = state.playerY + playerHeight;
              const platY = getPlatformY(plat, cx);
              
              let hasGap = false;
              if (isRivetStage) {
                // Check if over a pulled rivet
                hasGap = state.rivets.some(r => r.pulled && Math.abs(cx - r.x) < 12 && Math.abs(platY - r.y) < 5);
              }

              if (!hasGap && footPosition >= platY - 4 && footPosition - state.playerVy <= platY + 14) {
                state.playerY = platY - playerHeight;
                state.playerVy = 0;
                state.isJumping = false;
                onSolidGround = true;
                activeIndex = idx;
              }
            }
          });

          // Check Pauline top zone
          if (
            state.playerX + playerWidth / 2 >= paulinePlatform.xStart &&
            state.playerX + playerWidth / 2 <= paulinePlatform.xEnd
          ) {
            const footPosition = state.playerY + playerHeight;
            const platY = getPlatformY(paulinePlatform, state.playerX + playerWidth / 2);
            if (footPosition >= platY - 4 && footPosition - state.playerVy <= platY + 14) {
              state.playerY = platY - playerHeight;
              state.playerVy = 0;
              state.isJumping = false;
              onSolidGround = true;

              // Pauline reached -> Victory!
              if (gameState !== "VICTORY") {
                setGameState("VICTORY");
                const bonus = Math.max(0, 5000 - Math.floor(stateRef.current.animFrame / 60) * 100);
                setScore((s) => s + bonus);
                synth.playLevelUp();
              }
            }
          }

          if (!onSolidGround) {
            if (!state.isJumping && state.playerVy >= 0) {
              // Walked off an edge without jumping
              state.fallStartY = state.playerY; 
            }
            state.isJumping = true;
          } else {
            if (state.isJumping) {
              // We just landed. Check if fall distance exceeded fatal height (32px = 16px scaled)
              if (state.playerY - state.fallStartY >= 32 && gameState !== "DYING") {
                setGameState("DYING");
                synth.playExplosion();
                state.deathTimer = 0;
              }
              state.isJumping = false;
            } else if (isConveyors && activeIndex >= 0 && activeIndex < platforms.length) {
               // Conveyors push the player if they're just walking/standing
               const plat = platforms[activeIndex];
               if (plat.yStart >= 190 && plat.yStart <= 310) { // Only conveyor tiers
                 const direction = plat.yStart === 250 ? 1 : -1;
                 state.playerX += direction * 1.5;
               }
            }
            state.fallStartY = state.playerY; 
            state.currentPlatform = activeIndex;
          }
        }
      }

      // Maintain screen boundaries
      state.playerX = Math.max(10, Math.min(canvasWidth - 10 - playerWidth, state.playerX));

      // 4. Rivet Pulling mechanic
      if (isRivetStage && !state.isJumping && gameState === "PLAYING") {
        let allPulled = true;
        const cx = state.playerX + playerWidth / 2;
        const cy = state.playerY + playerHeight;
        state.rivets.forEach(r => {
           if (!r.pulled) {
             if (Math.abs(cx - r.x) < 12 && Math.abs(cy - r.y) < 6) {
               r.pulled = true;
               setScore((s) => s + 100);
               synth.playBounce();
             } else {
               allPulled = false;
             }
           }
        });

        if (allPulled && state.rivets.length > 0 && gameState !== "VICTORY") {
           setGameState("VICTORY");
           const bonus = Math.max(0, 5000 - Math.floor(stateRef.current.animFrame / 60) * 100);
           setScore(s => s + bonus);
           synth.playLevelUp();
        }
      }

      // 4.5 Hammer Logic
      if (state.hammerTimer > 0) {
        state.hammerTimer--;
      } else {
        const cx = state.playerX + playerWidth / 2;
        const cy = state.playerY + playerHeight / 2;
        for (let i = 0; i < state.hammers.length; i++) {
           const h = state.hammers[i];
           if (Math.abs(h.x + 8 - cx) < 16 && Math.abs(h.y + 10 - cy) < 24) {
              state.hammers.splice(i, 1);
              state.hammerTimer = 600;
              synth.playBounce();
              break;
           }
        }
      }

      // 5. Update barrels
      state.barrels.forEach((bar, idx) => {
        if (bar.falling) {
          bar.y += 3;
          // Land on platform below
          let landed = false;
          // We check the platform it's supposed to fall to, which is currentPlatformIndex + 1
          const nextPlatIndex = bar.currentPlatformIndex + 1;
          const plat = platforms[nextPlatIndex];
          if (plat) {
            if (bar.x >= plat.xStart && bar.x <= plat.xEnd) {
              const platY = getPlatformY(plat, bar.x);
              if (bar.y + bar.size >= platY - 4 && bar.y + bar.size - 5 <= platY + 6) {
                bar.y = platY - bar.size;
                bar.currentPlatformIndex = nextPlatIndex;
                bar.falling = false;
                landed = true;
                
                // Roll direction based on slope or layer
                if (plat.yEnd > plat.yStart) {
                   bar.vx = 2.2; // rolls right (downhill)
                } else if (plat.yEnd < plat.yStart) {
                   bar.vx = -2.2; // rolls left (downhill)
                } else {
                   // Flat platform
                   bar.vx = nextPlatIndex % 2 === 0 ? 2.2 : -2.2; 
                }
              }
            }
          }
          // Bottom pit delete
          if (bar.y > canvasHeight - 15) {
            landed = true;
          }
        } else {
          bar.x += bar.vx;

          // Check if it rolled off edge
          const plat = platforms[bar.currentPlatformIndex];
          if (plat && (bar.x < plat.xStart || bar.x > plat.xEnd)) {
            bar.falling = true;
            bar.vx = bar.vx > 0 ? 0.3 : -0.3; // Give it slight forward momentum, but mostly fall straight down
          } else if (plat) {
             // Snap to slope
             bar.y = getPlatformY(plat, bar.x) - bar.size;
          }

          // Randomly roll down ladder with some probability
          ladders.forEach((ladder) => {
            if (Math.abs(bar.x - ladder.x) < 4 && Math.abs(bar.y + bar.size - ladder.yTop) < 4) {
              let dropChance = 0.25;
              if (Math.abs(state.playerX + playerWidth/2 - ladder.x) < 30 && state.playerY > ladder.yTop) {
                dropChance = 0.75; // Mario is below this ladder
              }
              if (!ladder.isBroken && Math.random() < dropChance && ladder.yBottom !== 60) {
                bar.vx = 0;
                bar.falling = true;
                bar.y += 5; // offset slightly down to fall
              }
            }
          });
        }

        // Barrel and Jumpman collision checking
        const bDistX = Math.abs((state.playerX + playerWidth / 2) - bar.x);
        const bDistY = Math.abs((state.playerY + playerHeight / 2) - (bar.y + bar.size / 2));

        let smashed = false;
        if (state.hammerTimer > 0 && gameState !== "DYING") {
           // Hammer is active
           const phase = Math.floor(state.hammerTimer / 3) % 2; // 0 = UP, 1 = DOWN
           if (phase === 1) { // DOWN phase, active kill box in front
              const dX = bar.x - (state.playerX + playerWidth / 2);
              const inFront = state.isFacingLeft ? (dX < 0 && dX > -30) : (dX > 0 && dX < 30);
              if (inFront && bDistY < 20) {
                 smashed = true;
                 bar.falling = true; // wait, rather we just filter it out
                 bar.y = 9999; // hack to delete it
                 const pts = [300, 500, 800][Math.floor(Math.random()*3)];
                 setScore(s => s + pts);
                 synth.playCoin(); // Or some smash sound
              }
           }
        }

        if (!smashed) {
           if (bDistX < 14 && bDistY < 14 && gameState !== "DYING") {
             // Collapse / Lose life!
             synth.playExplosion();
             state.deathTimer = 0;
             setGameState("DYING");
           } else if (!bar.passed && state.isJumping && bDistX < 14 && state.playerY + playerHeight <= bar.y + 4) {
             // Jumped over barrel successfully
             bar.passed = true;
             setScore(s => s + 100);
             synth.playCoin(); 
           }
        }
      });

      // Fireball Spawning
      const maxFireballs = Math.min(5, 2 + state.level);
      if (state.fireballs.length < maxFireballs && Math.random() < 0.005) {
         if (isRivetStage) {
            const rndPlatIdx = Math.floor(Math.random() * 4); 
            const p = platforms[rndPlatIdx];
            state.fireballs.push({ x: p.xStart + Math.random() * (p.xEnd - p.xStart), y: p.yStart - 16, vx: 0, vy: 0, state: 'RANDOM', isFox: true, stateTimer: 60, currentPlatformIndex: rndPlatIdx });
         } else if (!isFlatStage && !isElevators) { 
            state.fireballs.push({ x: 50, y: platforms[3].yStart - 16, vx: 0, vy: 0, state: 'RANDOM', isFox: false, stateTimer: 60, currentPlatformIndex: 3 });
         }
      }

      // Update Fireballs
      state.fireballs.forEach(fb => {
         fb.stateTimer--;
         if (fb.stateTimer <= 0) {
            fb.stateTimer = 60 + Math.random() * 60;
            let chaseProb = 0.4 + (state.level - 1) * 0.125;
            chaseProb = Math.min(0.9, chaseProb);
            fb.state = Math.random() < chaseProb ? 'CHASE' : 'RANDOM';
            if (fb.state === 'RANDOM') {
               fb.vx = Math.random() < 0.5 ? -1.2 : 1.2;
            }
         }

         const speed = Math.min(1.5, 0.8 + state.level * 0.15); 
         if (fb.vy === 0) { 
            if (fb.state === 'CHASE') {
               fb.vx = state.playerX > fb.x ? speed : -speed;
            } else {
               fb.vx = fb.vx > 0 ? speed : -speed;
            }
            fb.x += fb.vx;
            const plat = platforms[fb.currentPlatformIndex];
            if (plat) {
               if (fb.x < plat.xStart) { fb.x = plat.xStart; fb.vx *= -1; }
               if (fb.x > plat.xEnd) { fb.x = plat.xEnd; fb.vx *= -1; }
               fb.y = getPlatformY(plat, fb.x) - 16;
            }

            if (state.animFrame % 4 === 0) {
                ladders.forEach(l => {
                   if (!l.isBroken && Math.abs(fb.x - l.x) < 5 && Math.abs(fb.y + 16 - l.yTop) < 10) {
                      if ((fb.state === 'CHASE' && state.playerY > fb.y) || (fb.state === 'RANDOM' && Math.random() < 0.2)) {
                         fb.vy = speed; fb.vx = 0; fb.x = l.x;
                      }
                   } else if (!l.isBroken && Math.abs(fb.x - l.x) < 5 && Math.abs(fb.y + 16 - l.yBottom) < 10) {
                      if ((fb.state === 'CHASE' && state.playerY < fb.y) || (fb.state === 'RANDOM' && Math.random() < 0.2)) {
                         fb.vy = -speed; fb.vx = 0; fb.x = l.x;
                      }
                   }
                });
            }
         } else {
            fb.y += fb.vy;
            let endedClimb = false;
            ladders.forEach(l => {
               if (!l.isBroken && Math.abs(fb.x - l.x) < 5) {
                  if (fb.vy < 0 && fb.y + 16 <= l.yTop) { 
                     fb.y = l.yTop - 16; endedClimb = true; fb.vy = 0;
                     fb.currentPlatformIndex = platforms.findIndex(p => fb.x >= p.xStart && fb.x <= p.xEnd && Math.abs(getPlatformY(p, fb.x) - l.yTop) < 5);
                  } else if (fb.vy > 0 && fb.y + 16 >= l.yBottom) { 
                     fb.y = l.yBottom - 16; endedClimb = true; fb.vy = 0;
                     fb.currentPlatformIndex = platforms.findIndex(p => fb.x >= p.xStart && fb.x <= p.xEnd && Math.abs(getPlatformY(p, fb.x) - l.yBottom) < 5);
                  }
               }
            });
            if (endedClimb) {
               fb.vx = Math.random() < 0.5 ? speed : -speed;
            }
         }

         const fDistX = Math.abs((state.playerX + playerWidth / 2) - fb.x);
         const fDistY = Math.abs((state.playerY + playerHeight / 2) - fb.y);
         let fSmashed = false;
         if (state.hammerTimer > 0 && gameState !== "DYING") {
             const phase = Math.floor(state.hammerTimer / 3) % 2; 
             if (phase === 1) { 
                const dX = fb.x - (state.playerX + playerWidth / 2);
                const inFront = state.isFacingLeft ? (dX < 0 && dX > -30) : (dX > 0 && dX < 30);
                if (inFront && fDistY < 20) {
                   fSmashed = true;
                   fb.y = 9999; 
                   const pts = [300, 500, 800][Math.floor(Math.random()*3)];
                   setScore(s => s + pts);
                   synth.playCoin(); 
                }
             }
         }
         if (!fSmashed && fDistX < 12 && fDistY < 16 && gameState !== "DYING") {
             synth.playExplosion();
             state.deathTimer = 0;
             setGameState("DYING");
         }
      });
      state.fireballs = state.fireballs.filter(f => f.y < 1000);

      // Filter off-screen barrels
      state.barrels = state.barrels.filter((b) => b.y < canvasHeight + 20 && b.x > 0 && b.x < canvasWidth);
    };

    const draw = () => {
      const state = stateRef.current;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // CRT Scanline lighting effect
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#ff0077";

      // Draw Pauline top deck girders
      ctx.fillStyle = "#ef4444"; // Classic Arcade Red
      ctx.fillRect(paulinePlatform.xStart, paulinePlatform.yStart, paulinePlatform.xEnd - paulinePlatform.xStart, 8);

      // Draw Donkey Kong platform
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(dkPlatform.xStart, dkPlatform.yStart, dkPlatform.xEnd - dkPlatform.xStart, 8);

      // Draw standard Girder Platforms
      platforms.forEach((plat) => {
        // Break platform into segments if rivets are pulled
        let segments: {xStart: number, xEnd: number, yStart: number, yEnd: number}[] = [];
        if (isRivetStage) {
           let currentX = plat.xStart;
           const sortedRivets = state.rivets
              .filter(r => r.y === plat.yStart && r.pulled)
              .sort((a,b) => a.x - b.x);
           
           sortedRivets.forEach(r => {
              if (r.x > currentX) {
                 segments.push({
                   xStart: currentX, xEnd: r.x - 12,
                   yStart: plat.yStart, yEnd: plat.yEnd
                 });
              }
              currentX = r.x + 16; // ladder gap
           });
           if (currentX < plat.xEnd) {
             segments.push({
                xStart: currentX, xEnd: plat.xEnd,
                yStart: plat.yStart, yEnd: plat.yEnd
             });
           }
        } else {
           segments = [{ xStart: plat.xStart, xEnd: plat.xEnd, yStart: plat.yStart, yEnd: plat.yEnd }];
        }

        segments.forEach(seg => {
          ctx.fillStyle = "#e50050"; // bright, solid magenta-red
          
          // Top beam
          ctx.beginPath();
          ctx.moveTo(seg.xStart, seg.yStart);
          ctx.lineTo(seg.xEnd, seg.yEnd);
          ctx.lineTo(seg.xEnd, seg.yEnd + 2);
          ctx.lineTo(seg.xStart, seg.yStart + 2);
          ctx.closePath();
          ctx.fill();
          
          // Bottom beam
          ctx.beginPath();
          ctx.moveTo(seg.xStart, seg.yStart + 6);
          ctx.lineTo(seg.xEnd, seg.yEnd + 6);
          ctx.lineTo(seg.xEnd, seg.yEnd + 8);
          ctx.lineTo(seg.xStart, seg.yStart + 8);
          ctx.closePath();
          ctx.fill();
          
          if (isConveyors) {
             // Conveyor Belt styling
             ctx.fillStyle = "#06b6d4"; // Cyan
             ctx.beginPath();
             ctx.moveTo(seg.xStart, seg.yStart);
             ctx.lineTo(seg.xEnd, seg.yEnd);
             ctx.lineTo(seg.xEnd, seg.yEnd + 8);
             ctx.lineTo(seg.xStart, seg.yStart + 8);
             ctx.closePath();
             ctx.fill();

             // Conveyor Moving Marks
             ctx.fillStyle = "#0891b2";
             const direction = (seg.yStart === 250) ? 1 : -1;
             const rawOffset = (stateRef.current.animFrame * 1.5 * direction) % 12;
             const offset = rawOffset >= 0 ? rawOffset : rawOffset + 12;
             for (let gx = seg.xStart + offset - 12; gx < seg.xEnd - 4; gx += 12) {
               if (gx >= seg.xStart && gx <= seg.xEnd - 4) {
                 ctx.fillRect(Math.floor(gx), seg.yStart + 2, 4, 4);
               }
             }
          } else {
             // X-shaped cross-braces
             ctx.strokeStyle = "#e50050";
             ctx.lineWidth = 2;
             for (let gx = seg.xStart; gx < seg.xEnd - 8; gx += 12) {
               const gy = getPlatformY(plat, gx);
               const gNextY = getPlatformY(plat, gx + 12);
               
               ctx.beginPath();
               // line \
               ctx.moveTo(gx + 1, gy + 1);
               ctx.lineTo(gx + 11, gNextY + 7);
               // line /
               ctx.moveTo(gx + 1, gy + 7);
               ctx.lineTo(gx + 11, gNextY + 1);
               ctx.stroke();
             }
          }
        });
      });

      // Draw Rivets
      if (isRivetStage) {
        ctx.fillStyle = "#ffff00"; // yellow
        state.rivets.forEach(r => {
          if (!r.pulled) {
             ctx.fillRect(r.x - 6, r.y, 12, 8);
          }
        });
      }

      ctx.shadowBlur = 0; // Disable shadow for general detail

      // Draw Ladders
      ladders.forEach((ladder) => {
        ctx.strokeStyle = "#93c5fd"; // Light Blue ladders classic
        ctx.lineWidth = 3;
        
        // Left rail, Right rail
        ctx.beginPath();
        ctx.moveTo(ladder.x - 8, ladder.yBottom);
        ctx.lineTo(ladder.x - 8, ladder.yTop);
        ctx.moveTo(ladder.x + 8, ladder.yBottom);
        ctx.lineTo(ladder.x + 8, ladder.yTop);
        ctx.stroke();

        // Rungs
        ctx.strokeStyle = "#bfdbfe";
        ctx.lineWidth = 1.5;
        for (let ry = ladder.yTop + 5; ry < ladder.yBottom; ry += 8) {
          ctx.beginPath();
          ctx.moveTo(ladder.x - 8, ry);
          ctx.lineTo(ladder.x + 8, ry);
          ctx.stroke();
        }
      });

      // --- OIL DRUM ---
      const oilX = 30; 
      const oilY = 360 - 28; 
      
      // Drum Body
      ctx.fillStyle = "#1e3a8a"; // deep blue
      ctx.fillRect(oilX, oilY, 26, 28);
      // Drum accents
      ctx.fillStyle = "#ffffff";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      // To fit perfectly
      ctx.fillText("OIL", oilX + 1, oilY + 16);
      
      // Drum Flames
      const fireFrame = Math.floor(stateRef.current.animFrame / 8) % 3;
      ctx.fillStyle = fireFrame === 0 ? "#ef4444" : (fireFrame === 1 ? "#f97316" : "#facc15");
      ctx.fillRect(oilX + 2, oilY - (fireFrame === 0 ? 8 : 12), 6, (fireFrame === 0 ? 8 : 12));
      
      ctx.fillStyle = fireFrame === 1 ? "#ef4444" : (fireFrame === 2 ? "#f97316" : "#facc15");
      ctx.fillRect(oilX + 10, oilY - (fireFrame === 1 ? 14 : 10), 6, (fireFrame === 1 ? 14 : 10));
      
      ctx.fillStyle = fireFrame === 2 ? "#ef4444" : (fireFrame === 0 ? "#f97316" : "#facc15");
      ctx.fillRect(oilX + 18, oilY - (fireFrame === 2 ? 10 : 6), 6, (fireFrame === 2 ? 10 : 6));

      // --- INTRO SEQUENCE ---
      if (gameState === "INTRO") {
        const t = state.introTimer;
        const startY = 360;
        const endY = dkPlatform.yStart - 51;
        const progress = Math.min(1, t / 140);
        // ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const dkY = startY - (startY - endY) * easeOut;
        const dkX = 80 + Math.sin(t * 0.5) * 5; // wiggle

        if (isDKJr) {
          drawSprite(ctx, SPRITES.marioRun1, dkX, dkY, 2);
          drawSprite(ctx, SPRITES.dkStand, dkX, dkY - 20, 2);
        } else {
          drawSprite(ctx, Math.floor(t / 8) % 2 === 0 ? SPRITES.dkStomp1 : SPRITES.dkStomp2, dkX, dkY, 3);
          drawSprite(ctx, SPRITES.pauline, dkX, dkY - 20, 2);
        }
      } else {
        // Draw Goal (Pauline or DK)
        if (isDKJr) {
            drawSprite(ctx, SPRITES.dkStand, paulinePlatform.xStart + 35, paulinePlatform.yStart - 35, 2);
        } else {
            drawSprite(ctx, SPRITES.pauline, paulinePlatform.xStart + 35, paulinePlatform.yStart - 25, 2);
        }

        // Draw Enemy (DK or Mario)
        if (isDKJr) {
            drawSprite(ctx, state.animFrame % 60 < 30 ? SPRITES.marioRun1 : SPRITES.marioRun2, dkPlatform.xStart + 35, dkPlatform.yStart - 35, 2);
        } else {
            drawSprite(ctx, state.animFrame % 60 < 30 ? SPRITES.dkStomp1 : SPRITES.dkStomp2, dkPlatform.xStart + 30, dkPlatform.yStart - 51, 3);
        }

        // Player
        if (gameState === "DYING") {
            const t = state.deathTimer;
            const fallOffset = t > 60 ? (t - 60) * 5 : 0;
            const wiggleX = t <= 60 ? (Math.sin(t * 0.8) * 3) : 0;
            
            if (isDKJr) {
              drawSprite(ctx, SPRITES.dkStand, state.playerX + wiggleX, state.playerY + fallOffset, 2);
            } else {
              // dead mario
              ctx.save();
              ctx.translate(state.playerX + wiggleX + 12, state.playerY + fallOffset + 16);
              ctx.rotate(t * 0.1);
              drawSprite(ctx, SPRITES.marioStand, -16, -16, 2);
              ctx.restore();
            }
        } else {
            const isClimbing = state.isClimbing;
            const isMoving = state.playerVx !== 0 || (isClimbing && state.playerVy !== 0);
            const walkCycleOffset = Math.floor(state.animFrame / 8) % 2;
            const flip = state.playerVx < 0;

            if (isDKJr) {
                // DK Jr
                if (isClimbing) {
                    drawSprite(ctx, SPRITES.dkStand, state.playerX, state.playerY, 2, flip);
                } else if (isMoving) {
                    drawSprite(ctx, SPRITES.dkStand, state.playerX, state.playerY, 2, flip);
                } else {
                    drawSprite(ctx, SPRITES.dkStand, state.playerX, state.playerY, 2, flip);
                }
            } else {
                // Mario Player
                let sprite = SPRITES.marioStand;
                if (isClimbing) {
                  sprite = walkCycleOffset === 0 ? SPRITES.marioClimb1 : SPRITES.marioClimb2;
                  drawSprite(ctx, sprite, state.playerX, state.playerY, 2);
                } else if (state.isJumping) {
                  sprite = SPRITES.marioRun1;
                  drawSprite(ctx, sprite, state.playerX, state.playerY, 2, state.playerVx < 0);
                } else if (state.hammerTimer > 0) {
                  sprite = walkCycleOffset === 0 ? SPRITES.marioStand : SPRITES.marioRun1;
                  drawSprite(ctx, sprite, state.playerX, state.playerY, 2, state.isFacingLeft);
                  
                  // Blinking hammer effect below 150 frames
                  if (state.hammerTimer > 150 || (state.hammerTimer % 4 < 2)) {
                    ctx.save();
                    const phase = Math.floor(state.hammerTimer / 3) % 2; // 0 = UP, 1 = DOWN
                    if (state.isFacingLeft) {
                      ctx.translate(state.playerX + 4, state.playerY + 16);
                      if (phase === 0) {
                         ctx.translate(-4, -28);
                         drawSprite(ctx, SPRITES.hammer, 0, 0, 2, true);
                      } else {
                         ctx.translate(-24, -4);
                         // active kill box
                         ctx.rotate(-Math.PI / 2);
                         drawSprite(ctx, SPRITES.hammer, 0, 0, 2, true);
                      }
                    } else {
                      ctx.translate(state.playerX + playerWidth - 4, state.playerY + 16);
                      if (phase === 0) {
                         ctx.translate(-4, -28);
                         drawSprite(ctx, SPRITES.hammer, 0, 0, 2, false);
                      } else {
                         ctx.translate(16, -4);
                         // active kill box
                         ctx.rotate(Math.PI / 2);
                         drawSprite(ctx, SPRITES.hammer, 0, 0, 2, false);
                      }
                    }
                    ctx.restore();
                  }

                } else if (state.playerVx !== 0) {
                  sprite = walkCycleOffset === 0 ? SPRITES.marioRun1 : SPRITES.marioRun2;
                  drawSprite(ctx, sprite, state.playerX, state.playerY, 2, state.isFacingLeft);
                } else {
                  drawSprite(ctx, sprite, state.playerX, state.playerY, 2, state.isFacingLeft);
                }
            }
        }
      }

      // Draw Uncollected Hammers
      state.hammers.forEach(h => {
         drawSprite(ctx, SPRITES.hammer, h.x, h.y, 1.5);
      });

      // Draw Fireballs
      state.fireballs.forEach(fb => {
         // Firefoxes cycle faster
         const frameRate = fb.isFox ? 2 : 4;
         const frame = Math.floor(state.animFrame / frameRate) % 2;
         ctx.save();
         if (fb.isFox) {
            // Neon cyan/yellow palette shift trick by rendering with globalCompositeOperation or just drawing the sprite
            // We'll just draw the fireball, maybe use a color tint. But drawSprite doesn't support custom palette directly.
            // A simple hack: set shadow and filter 
            ctx.filter = "hue-rotate(200deg) brightness(200%)";
         }
         drawSprite(ctx, SPRITES.fireball, fb.x - 6, fb.y - 4, 1.5, frame === 1);
         ctx.restore();
      });

      // Draw Barrels
      state.barrels.forEach((bar) => {
        const frame = Math.floor(state.animFrame / 5) % 2;
        if (isRivetStage) {
           // draw enemy
           drawSprite(ctx, frame === 0 ? SPRITES.barrel1 : SPRITES.barrel2, bar.x - bar.size/2, bar.y, 1.5);
        } else {
           drawSprite(ctx, frame === 0 ? SPRITES.barrel1 : SPRITES.barrel2, bar.x - bar.size/2, bar.y, 1.5);
        }
      });


      // Authentic HUD
      ctx.font = "10px 'Press Start 2P', 'Courier New', monospace";
      
      // Score
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`SCORE`, 30, 25);
      ctx.fillStyle = "#ffff00"; // yellow
      ctx.fillText(`${score.toString().padStart(6, '0')}`, 30, 45);

      // High Score
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`HIGH SCORE`, canvasWidth / 2, 25);
      ctx.fillStyle = "#ffff00";
      ctx.fillText(`${highScore.toString().padStart(6, '0')}`, canvasWidth / 2, 45);

      // Bonus
      const bonus = Math.max(0, 5000 - Math.floor(stateRef.current.animFrame / 60) * 100);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`BONUS `, canvasWidth - 75, 25);
      
      // Bonus double border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasWidth - 75, 33, 50, 16);
      ctx.strokeRect(canvasWidth - 77, 31, 54, 20);

      ctx.fillStyle = "#ffff00"; // yellow
      ctx.textAlign = "center";
      ctx.fillText(`${bonus.toString().padStart(4, '0')}`, canvasWidth - 50, 45);

      // Level
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "right";
      ctx.fillText(`L=`, canvasWidth - 50, 75);
      
      // Level Blue Box
      ctx.fillStyle = "#1e3a8a"; // Deep blue
      ctx.fillRect(canvasWidth - 45, 65, 22, 12);
      ctx.fillStyle = "#ffff00";
      ctx.textAlign = "center";
      ctx.fillText(`${stateRef.current.level.toString().padStart(2, '0')}`, canvasWidth - 34, 75);

      // Lives
      for(let i=0; i<Math.max(0, lives); i++) {
         // Scale 1.25 is nice for the tiny icons
         drawSprite(ctx, SPRITES.marioStand, canvasWidth - 85 - (i*16), 85, 1.25, false);
      }
    };

    const loop = () => {
      if (gameState === "DYING") {
        stateRef.current.deathTimer++;
        if (stateRef.current.deathTimer > 120) { // roughly 2 seconds
          const nextL = lives - 1;
          setLives(nextL);
          if (nextL <= 0) {
            setGameState("GAMEOVER");
            onGameOver(score);
          } else {
            stateRef.current.introTimer = 0;
            setGameState("INTRO");
            resetPlayer();
          }
          return;
        }
      } else if (gameState === "INTRO") {
        stateRef.current.introTimer++;
        if (stateRef.current.introTimer > 140) {
          setGameState("PLAYING");
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
  }, [gameState, keyboardState, score, lives, isPaused, difficulty]);

  useEffect(() => {
    stateRef.current.level = level;
  }, [level]);

  const startGame = (isNextLevel: boolean = false, isDebug: boolean = false, debugL?: number, debugS?: number) => {
    let currentL = isDebug && debugL !== undefined ? debugL : level;
    let currentS = isDebug && debugS !== undefined ? debugS : stageIndex;
    if (isDebug) {
       synth.playCoin();
    } else if (!isNextLevel) {
      synth.playCoin();
      setScore(0);
      setLives(3);
      setLevel(1);
      setStageIndex(0);
      currentL = 1;
      currentS = 0;
    } else {
      const seqLen = LEVEL_SEQUENCES[Math.min(level - 1, 4)].length;
      if (stageIndex + 1 >= seqLen) {
         setLevel((l) => l + 1);
         setStageIndex(0);
         currentL = level + 1;
         currentS = 0;
      } else {
         setStageIndex((s) => s + 1);
         currentS = stageIndex + 1;
      }
    }
    const state = stateRef.current;
    state.barrels = [];
    const diffM = difficulty === "HARD" ? 0.6 : (difficulty === "EASY" ? 1.5 : 1);
    state.barrelTimer = Math.max(20, (60 - (currentL * 5)) * diffM); // Increase difficulty by spawning barrels faster!
    
    // Have to defer resetPlayer slightly to allow isRivetStage to update, but state is ref anyway
    // Since isRivetStage is computed during render, we'll manually override inner reset if it's Rivets
    const nextStageType = LEVEL_SEQUENCES[Math.min(currentL - 1, 4)][currentS];
    const nextFlatStage = nextStageType === 'RIVETS' || nextStageType === 'CONVEYORS';
    const nextElevators = nextStageType === 'ELEVATORS';
    state.playerX = 80;
    state.playerY = (nextFlatStage ? 380 : 360) - 32;
    state.playerVx = 0;
    state.playerVy = 0;
    state.isJumping = false;
    state.isClimbing = false;
    state.currentPlatform = nextElevators ? 3 : 4;

    state.introTimer = 0;
    setGameState("INTRO");
  };

  startGameRef.current = startGame;

  const resetPlayer = () => {
    const state = stateRef.current;
    state.playerX = 80;
    state.playerY = (isFlatStage ? 380 : 360) - 32;
    state.playerVx = 0;
    state.playerVy = 0;
    state.isJumping = false;
    state.isClimbing = false;
    state.currentPlatform = isElevators ? 3 : 4;
    state.barrels = []; // Clear barrels on death/reset
    
    // We don't have ladders variable exposed here, but the inner resetPlayer 
    // will run on next frame anyway so it will initialize rivets correctly.
  };

  return (
    <div id="donkeykong-game-container" className={`flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 rounded-xl border-4 w-full h-full overflow-hidden ${isDKJr ? "border-purple-600 shadow-[0_0_15px_rgba(153,0,255,0.4)]" : "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]"}`}>
      <div className="flex justify-between w-full mb-2 sm:mb-3 items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className={`${isDKJr ? "text-purple-400" : "text-yellow-400"} font-bold tracking-widest text-base sm:text-lg`}>
            {isDKJr ? "DONKEY KONG JR." : "DONKEY KONG"}
          </h3>
          <span className="text-zinc-400 text-xs font-mono">L={level.toString().padStart(2, '0')}</span>
          <span className="text-zinc-500 text-[10px] font-mono border border-zinc-700 px-1 rounded">{stageType}</span>
        </div>
        <span className="text-zinc-400 text-xs font-mono">HIGH SCORE: {highScore}</span>
      </div>

      <div className="relative border-4 border-zinc-800 rounded-md overflow-hidden bg-black flex-1 min-h-0 w-full flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full h-full object-contain bg-black"
        />
        {/* CRT Glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.1)] mix-blend-screen rounded-sm opacity-80 select-none bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.15)_100%)]"></div>

        {gameState === "READY" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6">
            <h4 className="text-rose-500 font-mono text-3xl mb-4 tracking-wider animate-pulse">INSERT COIN / START</h4>
            <div className="text-zinc-300 font-mono text-sm max-w-[450px] mb-6 space-y-2">
              <p>Move with Arrow Keys <span className="text-white font-bold">◄ ►</span>.</p>
              <p>Use <span className="text-white font-bold">▲</span> to climb ladders and **Jump** over rolling wood barrels!</p>
              <p>Reach <span className="text-rose-400 font-bold uppercase">{isDKJr ? "DONKEY KONG" : "Pauline"}</span> at the top deck to complete the level!</p>
            </div>
            <button
              id="dk-start-btn"
              onClick={() => startGame()}
              className={`px-6 py-3 font-bold font-mono tracking-widest text-xl rounded-md border-2 transition duration-200 cursor-pointer ${
                isDKJr 
                ? "bg-purple-800 hover:bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(153,0,255,0.5)]" 
                : "bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              }`}
            >
              PLAY GAME (ENTER)
            </button>
          </div>
        )}

        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <ParticleExplosion color="#ef4444" />
            <h4 className="font-mono text-cyan-500 text-4xl mb-4 tracking-wider">GAME OVER</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="dk-retry-btn"
              onClick={() => startGame()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              PLAY AGAIN (ENTER)
            </button>
          </div>
        )}

        {gameState === "VICTORY" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <h4 className="font-mono text-green-400 text-4xl mb-4 tracking-widest animate-bounce">CONGRATULATIONS!</h4>
            <p className="text-zinc-400 font-mono text-lg mb-6">
              {isDKJr ? "You SAVED DONKEY KONG!" : "You SAVED Pauline!"} Stage Bonus Added. Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              id="dk-victory-btn"
              onClick={() => startGame(true)}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-mono tracking-widest text-xl rounded-md border-2 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition duration-200 cursor-pointer"
            >
              NEXT LEVEL (ENTER)
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
        <div>CONTROLS: [<span className="text-yellow-400">◄</span> / <span className="text-yellow-400">►</span>] Run</div>
        <div>[<span className="text-yellow-400">▲</span>] Jump / Climb</div>
        <div>[<span className="text-yellow-400">ENTER</span>] Start Game</div>
      </div>
    </div>
  );
}
