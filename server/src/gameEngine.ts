export type TileColor = 'red' | 'blue' | 'black' | 'yellow';

export interface TileData {
  id: string;
  number: number;
  color: TileColor;
  isFakeOkey?: boolean;
}

// Renk çarpanları — Kural 2
export const COLOR_MULTIPLIERS: Record<TileColor, number> = {
  blue: 6,
  red: 5,
  black: 4,
  yellow: 3,
};

// Sahte Okey çarpanı — Kural 2
export const FAKE_OKEY_MULTIPLIER = 10;

export class GameEngine {
  private tiles: TileData[] = [];

  constructor() {
    this.initializeTiles();
  }

  private initializeTiles() {
    const colors: TileColor[] = ['red', 'blue', 'black', 'yellow'];
    let idCounter = 0;

    // Her renk için 1-13 arası her sayıdan 2'şer taş (4 renk × 13 sayı × 2 = 104 taş)
    for (const color of colors) {
      for (let num = 1; num <= 13; num++) {
        for (let set = 0; set < 2; set++) {
          this.tiles.push({ id: `tile-${idCounter++}`, number: num, color });
        }
      }
    }

    // 2 adet Sahte Okey (Joker)
    this.tiles.push({ id: 'fake-1', number: 0, color: 'black', isFakeOkey: true });
    this.tiles.push({ id: 'fake-2', number: 0, color: 'black', isFakeOkey: true });
  }

  public shuffle() {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  /**
   * Taşları dağıtır.
   * @param playerCount Oyuncu sayısı (genellikle 4)
   * @param dealerIndex 15 taşı alacak "koltuk altı" oyuncunun index'i
   */
  public deal(playerCount: number, dealerIndex: number = 0) {
    this.shuffle();

    // Göstergelik taşı belirle (sahte okey olmayan)
    const indicatorIdx = this.tiles.findIndex(t => !t.isFakeOkey);
    const [indicator] = this.tiles.splice(indicatorIdx, 1);

    const hands: TileData[][] = [];
    for (let i = 0; i < playerCount; i++) {
      // dealerIndex'teki oyuncu 15, diğerleri 14 taş alır
      const count = i === dealerIndex ? 15 : 14;
      hands.push(this.tiles.splice(0, count));
    }

    return {
      hands,
      remaining: this.tiles,
      indicator,
      dealerIndex,
    };
  }
}
