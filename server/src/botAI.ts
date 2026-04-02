import { TileData, TileColor } from './gameEngine.js';
import { findMelds, findDoubles, getOkeyInfo } from './winChecker.js';

/**
 * Bot Yapay Zekası - PRO MAESTRO Sürümü
 * Strateji: Fırsatçı (Discard Pick), Stratejik Atış ve Seri Korumalı.
 */
export class BotAI {
  private hand: TileData[];
  private okeyNumber: number;
  private okeyColor: TileColor;
  private indicator: TileData;

  constructor(hand: TileData[], indicator: TileData) {
    this.hand = [...hand];
    this.indicator = indicator;
    const okey = getOkeyInfo(indicator);
    this.okeyNumber = okey.number;
    this.okeyColor = okey.color;
  }

  private isOkey(t: TileData): boolean {
    return t.isFakeOkey || (t.number === this.okeyNumber && t.color === this.okeyColor);
  }

  /**
   * Yerden gelen taşı alayım mı? (Kapsın mı?) 
   */
  public shouldPickDiscard(discarded: TileData, currentOpeningBaraj: number, hasOpened: boolean): boolean {
    const okey = { number: this.okeyNumber, color: this.okeyColor };
    
    // 1. Okey ise MUTLAKA AL (Asla kaçırma)
    if (this.isOkey(discarded)) return true;

    // 2. Halihazırda açıksa ve işleyebiliyorsa al
    if (hasOpened) {
       const tempHand = [...this.hand, discarded];
       const newMelds = findMelds(tempHand, okey);
       const oldMelds = findMelds(this.hand, okey);
       if (newMelds.total > oldMelds.total) return true;
    }

    // 3. Henüz açmamışsa ve bu taşla barajı geçiyorsa al
    if (!hasOpened) {
       const tempHand = [...this.hand, discarded];
       const res = findMelds(tempHand, okey);
       const resD = findDoubles(tempHand, okey);
       if (res.total >= currentOpeningBaraj || resD.total >= 5) return true;
    }

    return false;
  }

  /**
   * Taş Değerlendirme (Weighted Scoring)
   */
  private scoreHand(): Map<string, number> {
    const scores = new Map<string, number>();
    const okey = { number: this.okeyNumber, color: this.okeyColor };
    
    // Temel puanlar
    this.hand.forEach(t => scores.set(t.id, 0));

    // Seri Bonusu
    const sRes = findMelds(this.hand, okey);
    sRes.melds.flat().forEach((t: TileData) => {
      const cur = scores.get(t.id) || 0;
      scores.set(t.id, cur + 50); 
    });

    // Çift Bonusu
    const dRes = findDoubles(this.hand, okey);
    dRes.pairs.flat().forEach((t: TileData) => {
      const cur = scores.get(t.id) || 0;
      scores.set(t.id, cur + 30);
    });

    // Gelecek Vaat Edenler
    this.hand.forEach(t => {
        if (this.isOkey(t)) {
            scores.set(t.id, 9999);
            return;
        }
        
        const neighbors = this.hand.filter(other => 
            other.id !== t.id && 
            other.color === t.color && 
            Math.abs(other.number - t.number) <= 2
        );
        const cur = scores.get(t.id) || 0;
        scores.set(t.id, cur + (neighbors.length * 5));
    });

    return scores;
  }

  public pickDiscard(): TileData {
    const scores = this.scoreHand();
    let worstTile: TileData = this.hand[0];
    let minScore = Infinity;

    this.hand.forEach((t: TileData) => {
      const s = scores.get(t.id) || 0;
      if (s < minScore || (s === minScore && t.number < worstTile.number)) {
        minScore = s;
        worstTile = t;
      }
    });

    return worstTile;
  }

  public addTile(tile: TileData) {
    this.hand.push(tile);
  }

  public removeTile(id: string) {
    this.hand = this.hand.filter(t => t.id !== id);
  }
}
