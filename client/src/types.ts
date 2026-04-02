export type TileColor = 'red' | 'blue' | 'black' | 'yellow';

export interface TileData {
  id: string;
  number: number;
  color: TileColor;
  isFakeOkey?: boolean;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  isBot: boolean;
  tileCount?: number;
  hasOpened: boolean;
  openedType: 'series' | 'doubles' | null;
  isCurrentTurn: boolean;
}

export interface GameState {
  gamePhase: 'waiting' | 'playing' | 'finished';
  currentTurn: string;
  indicator: TileData;
  drawPileCount: number;
  discardPile: TileData[];
  players: Player[];
  roundBet: number;
  roundNumber: number;
  gameColorMultiplier: number;
  dealerId: string;
  highestSeriesValue: number;
  highestDoublesValue: number;
  tournamentScores: Record<string, number>;
}

// ─── OYUN MANTIĞI (GAME LOGIC) ───

export const COLOR_MULTIPLIERS: Record<TileColor, number> = {
  red: 2,
  blue: 3,
  black: 4,
  yellow: 5,
};

export function getOkeyInfo(indicator: TileData): { number: number; color: TileColor } {
  return {
    number: indicator.number === 13 ? 1 : indicator.number + 1,
    color: indicator.color,
  };
}

export function getColorMultiplier(indicator: TileData): number {
  return COLOR_MULTIPLIERS[indicator.color] || 2;
}

export function isOkeyTile(t: TileData, okey: { number: number; color: TileColor }): boolean {
  return !t.isFakeOkey && t.number === okey.number && t.color === okey.color;
}

export function isValidMeld(meld: TileData[], okey: { number: number; color: TileColor }): boolean {
  if (meld.length < 3) return false;
  // Basit doğrulama (Detaylısı server'da)
  return true; 
}

export function findReadyMelds(hand: (TileData | null)[], okey: { number: number; color: TileColor }): { melds: TileData[][], total: number } {
  const tiles = hand.filter(Boolean) as TileData[];
  // Basit toplam (Detaylı mantık server'da ama HUD için buraya da lazım)
  const total = tiles.reduce((sum, t) => sum + (t.isFakeOkey ? 0 : t.number), 0);
  return { melds: [], total };
}

export function findDoubles(hand: TileData[], okey: { number: number; color: TileColor }): { pairs: TileData[][], total: number } {
  return { pairs: [], total: 0 };
}
