/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameType = "PONG" | "PACMAN" | "DONKEYKONG" | "GALAGA" | "SPACEINVADERS";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface GameScore {
  score: number;
}

export interface ArcadeHighscores {
  PONG: number;
  PACMAN: number;
  DONKEYKONG: number;
  GALAGA: number;
  SPACEINVADERS: number;
}

export interface KeyboardState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Space: boolean;
  KeyZ: boolean; // Virtual A button
  KeyX: boolean; // Virtual B button
  KeyP: boolean; // Pause button
  Enter: boolean; // Insert Coin / Start
  Escape: boolean; // Go back to game menu
}
