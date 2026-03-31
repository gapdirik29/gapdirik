import { TileData, TileColor } from './gameEngine';

/**
 * Bot Yapay Zekası
 * Strateji: Seri ve çiftleri tespit edip, en az değerli/işe yaramaz taşı atar.
 */
export class BotAI {
  private hand: TileData[];
  private okeyNumber: number;
  private okeyColor: TileColor;

  constructor(hand: TileData[], indicator: TileData) {
    this.hand = [...hand];
    // Göstergelik'in bir üstü = okey
    this.okeyNumber = indicator.number === 13 ? 1 : indicator.number + 1;
    this.okeyColor = indicator.color;
  }

  private isOkey(t: TileData): boolean {
    return t.isFakeOkey || (t.number === this.okeyNumber && t.color === this.okeyColor);
  }

  /**
   * Gruplanabilirlik skoru: seri ya da çified içindeyse değerli
   */
  private scoreGroups(): Map<string, number> {
    const scores = new Map<string, number>();
    this.hand.forEach(t => scores.set(t.id, 0));

    // Seri kontrol
    const colors: TileColor[] = ['red', 'blue', 'black', 'yellow'];
    for (const color of colors) {
      const byColor = this.hand
        .filter(t => !this.isOkey(t) && t.color === color)
        .sort((a, b) => a.number - b.number);

      for (let i = 0; i < byColor.length; i++) {
        let seriesLen = 1;
        for (let j = i + 1; j < byColor.length; j++) {
          if (byColor[j].number === byColor[i].number + (j - i)) seriesLen++;
          else break;
        }
        if (seriesLen >= 2) {
          // Seri uzunluğuna göre bonus
          for (let k = i; k < i + seriesLen; k++) {
            const cur = scores.get(byColor[k].id) || 0;
            scores.set(byColor[k].id, cur + seriesLen * 3);
          }
        }
      }
    }

    // Çift / üçlü kontrol
    const byNumber = new Map<number, TileData[]>();
    this.hand.filter(t => !this.isOkey(t)).forEach(t => {
      if (!byNumber.has(t.number)) byNumber.set(t.number, []);
      byNumber.get(t.number)!.push(t);
    });

    for (const [, group] of byNumber) {
      if (group.length >= 2) {
        group.forEach(t => {
          const cur = scores.get(t.id) || 0;
          scores.set(t.id, cur + group.length * 2);
        });
      }
    }

    // Okey her zaman yüksek değer
    this.hand.filter(t => this.isOkey(t)).forEach(t => scores.set(t.id, 999));

    return scores;
  }

  /**
   * Atacak en iyi taşı seç (en düşük skorlu)
   */
  public pickDiscard(): TileData {
    const scores = this.scoreGroups();
    let worst: TileData = this.hand[0];
    let worstScore = Infinity;

    for (const t of this.hand) {
      const s = scores.get(t.id) || 0;
      if (s < worstScore) {
        worstScore = s;
        worst = t;
      }
    }

    return worst;
  }

  /**
   * Çekilen taşı elde tut mu, at mı?
   */
  public evaluateDrawnTile(drawn: TileData): 'keep' | 'discard' {
    const tempHand = [...this.hand, drawn];
    const bot = new BotAI(tempHand, { id: '', number: this.okeyNumber === 1 ? 13 : this.okeyNumber - 1, color: this.okeyColor });
    const scores = bot.scoreGroups();
    const drawnScore = scores.get(drawn.id) || 0;

    // Eğer taş en az bir grupla ilişkiliyse tut
    return drawnScore >= 4 ? 'keep' : 'discard';
  }

  public addTile(tile: TileData) {
    this.hand.push(tile);
  }

  public removeTile(id: string) {
    this.hand = this.hand.filter(t => t.id !== id);
  }

  public getHand() {
    return this.hand;
  }
}
