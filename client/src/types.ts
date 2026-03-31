export type TileColor = 'blue' | 'red' | 'black' | 'yellow';

export interface TileData {
  id: string;
  number: number;
  color: TileColor;
  isFakeOkey?: boolean;
  isOkey?: boolean;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  tileCount: number;
  isReady: boolean;
  isBot?: boolean;
  score: number;
  hasOpened: boolean;
  openedType?: 'series' | 'doubles' | null;
  openScore?: number;
}

export interface PenaltyNotification {
  id: string;
  msg: string;
  amount: number;
}

export interface GameState {
  gamePhase: 'waiting' | 'playing' | 'round_end' | 'game_over';
  currentTurn: string;
  indicator: TileData;
  drawPileCount: number;
  discardPile: TileData[];
  players: Player[];
  roundBet: number;
  roundNumber: number;
  gameColorMultiplier: number;
  dealerId?: string;
  highestSeriesValue: number;
  highestDoublesValue: number;
  tournamentScores: Record<string, number>;
}

// Kural 2: Renk çarpanları
export const COLOR_MULTIPLIERS: Record<TileColor, number> = {
  blue: 6,
  red: 5,
  black: 4,
  yellow: 3,
};

export const FAKE_OKEY_MULTIPLIER = 10;

// ─── OKEY BİLGİSİ ───────────────────────────────────────────────
export function getOkeyInfo(ind: TileData): { number: number; color: TileColor } {
  return { number: ind.number === 13 ? 1 : ind.number + 1, color: ind.color };
}

export function isOkeyTile(t: TileData, ok: { number: number; color: TileColor }): boolean {
  return !t.isFakeOkey && t.number === ok.number && t.color === ok.color;
}

export function isJoker(t: TileData, ok: { number: number; color: TileColor }): boolean {
  return !!t.isFakeOkey || isOkeyTile(t, ok);
}

// ─── KURAL 1: Seri Per Kontrolü (13→1 yasak) ────────────────────
function isValidSeries(meld: TileData[], ok: { number: number; color: TileColor }): boolean {
  const firstNormal = meld.find(t => !isJoker(t, ok));
  if (!firstNormal) return meld.length >= 3;

  if (!meld.every(t => isJoker(t, ok) || t.color === firstNormal.color)) return false;

  const ns = meld.map(t => isJoker(t, ok) ? -1 : t.number);
  const pivot = firstNormal.number;
  const pIdx = ns.indexOf(pivot);

  for (let i = 0; i < ns.length; i++) {
    if (ns[i] !== -1) {
      const expected = pivot + (i - pIdx);
      if (expected < 1 || expected > 13) return false; // KURAL 1
      if (ns[i] !== expected) return false;
    }
  }

  const normalNums = ns.filter(n => n !== -1);
  return new Set(normalNums).size === normalNums.length;
}

// ─── Grup Per Kontrolü (Aynı sayı, farklı renk) ─────────────────
function isValidGroup(meld: TileData[], ok: { number: number; color: TileColor }): boolean {
  if (meld.length < 3 || meld.length > 4) return false;
  const firstNormal = meld.find(t => !isJoker(t, ok));
  if (!firstNormal) return meld.length >= 3;

  if (!meld.every(t => isJoker(t, ok) || t.number === firstNormal.number)) return false;

  const colors = new Set<string>();
  for (const t of meld) {
    if (!isJoker(t, ok)) {
      if (colors.has(t.color)) return false; // Aynı renk tekrar edemez
      colors.add(t.color);
    }
  }
  return true;
}

export function isValidMeld(meld: TileData[], ok: { number: number; color: TileColor }): boolean {
  if (meld.length < 3) return false;
  return isValidSeries(meld, ok) || isValidGroup(meld, ok);
}

// ─── ÇİFT BULMA (Kural 6) ───────────────────────────────────────
export function findDoubles(hand: TileData[], ok: { number: number; color: TileColor }): {
  pairs: TileData[][];
  total: number;
} {
  const groups = new Map<string, TileData[]>();
  for (const t of hand) {
    // Sahte okey ve gerçek okey → okey'in sayısı/rengiyle grupla
    // Örnek: okey sarı 6 ise, sahte okey de "sarı-6" grubuna girer
    const tileNum = isJoker(t, ok) ? ok.number : t.number;
    const tileCol = isJoker(t, ok) ? ok.color : t.color;
    const key = `${tileNum}-${tileCol}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const pairs: TileData[][] = [];
  for (const [, tiles] of groups) {
    for (let i = 0; i + 1 < tiles.length; i += 2) {
      pairs.push([tiles[i], tiles[i + 1]]);
    }
  }

  // Çift toplamı: okey/sahte okey için okey'in sayı değeri kullan
  const total = pairs.reduce((sum, pair) => {
    const val = isJoker(pair[0], ok) ? ok.number : pair[0].number;
    return sum + val * 2;
  }, 0);

  return { pairs, total };
}

// ─── MASAYA EKLENEBİLİR TAŞ KONTROLÜ ───────────────────────────
export function canAppendToMelds(
  tile: TileData,
  allMelds: TileData[][],
  ok: { number: number; color: TileColor }
): boolean {
  for (const m of allMelds) {
    if (isValidMeld([...m, tile], ok)) return true;
    if (isValidMeld([tile, ...m], ok)) return true;
  }
  return false;
}

// ─── AKILLI PER BULUCU (SERİ DİZ İÇİN) ──────────────────────────
export function findMelds(hand: TileData[], ok: { number: number; color: TileColor }): { melds: TileData[][] } {
  let remaining = [...hand];
  const result: TileData[][] = [];

  // Greedy yaklaşım: Önce en uzun meldleri bulmaya çalış
  
  // 1. Grupları bul (Kareler - Aynı Sayı, Farklı Renk)
  const byNumber = new Map<number, TileData[]>();
  remaining.forEach(t => {
    if (isJoker(t, ok)) return;
    if (!byNumber.has(t.number)) byNumber.set(t.number, []);
    byNumber.get(t.number)!.push(t);
  });

  for (const [, tiles] of byNumber) {
    const uniqueColors = new Map<TileColor, TileData>();
    tiles.forEach(t => uniqueColors.set(t.color, t));
    
    if (uniqueColors.size >= 3) {
      const group = Array.from(uniqueColors.values());
      result.push(group);
      const groupIds = new Set(group.map(t => t.id));
      remaining = remaining.filter(t => !groupIds.has(t.id));
    }
  }

  // 2. Serileri bul (Aynı Renk, Ardışık)
  const byColor = new Map<TileColor, TileData[]>();
  remaining.forEach(t => {
    if (isJoker(t, ok)) return;
    if (!byColor.has(t.color)) byColor.set(t.color, []);
    byColor.get(t.color)!.push(t);
  });

  for (const [color, tiles] of byColor) {
    const sorted = [...tiles].sort((a, b) => a.number - b.number);
    let i = 0;
    while (i < sorted.length) {
      let currentRun = [sorted[i]];
      let j = i + 1;
      while (j < sorted.length && sorted[j].number === currentRun[currentRun.length - 1].number + 1) {
        currentRun.push(sorted[j]);
        j++;
      }
      if (currentRun.length >= 3) {
        result.push(currentRun);
        const runIds = new Set(currentRun.map(t => t.id));
        remaining = remaining.filter(t => !runIds.has(t.id));
        // Reset and re-sort this color because some tiles are gone
        const newTiles = remaining.filter(t => t.color === color);
        sorted.length = 0;
        sorted.push(...newTiles.sort((a, b) => a.number - b.number));
        i = 0;
      } else {
        i++;
      }
    }
  }

  return { melds: result };
}

// ─── HAZIR PER BULMA (Rack Üzerindeki Boşluklara Göre) ───────────
export function findReadyMelds(
  handData: (TileData | null)[],
  ok: { number: number; color: TileColor }
): { melds: TileData[][]; total: number; type: 'series' | 'doubles' | null } {
  // Seri perleri tarat (boşlukları ayraç say)
  let foundMelds: TileData[][] = [];
  let cur: TileData[] = [];

  handData.forEach(x => {
    if (x) {
      cur.push(x);
    } else {
      if (isValidMeld(cur, ok)) foundMelds.push([...cur]);
      cur = [];
    }
  });
  if (isValidMeld(cur, ok)) foundMelds.push([...cur]);

  let total = 0;
  foundMelds.forEach(m =>
    m.forEach(x => {
      total += isJoker(x, ok) ? ok.number : x.number;
    })
  );

  if (foundMelds.length > 0) return { melds: foundMelds, total, type: 'series' };

  // Seri yoksa çiftlere bak
  const nonNull = handData.filter(x => x !== null) as TileData[];
  const { pairs, total: pTotal } = findDoubles(nonNull, ok);
  if (pairs.length > 0) return { melds: pairs, total: pTotal, type: 'doubles' };

  return { melds: [], total: 0, type: null };
}

// ─── EL SONU CEZA HESABI (Client tarafı) ────────────────────────
export interface RoundResult {
  id: string;
  name: string;
  score: number;
  penalty: number;
  isWinner: boolean;
  breakdown: string[];
}

export function calculateEndRoundPenalties(params: {
  players: Player[];
  indicator: TileData;
  winnerId: string | null;
  winByOkey: boolean;
  playerHands: Record<string, (TileData | null)[]>;
  playerOpenedMelds: Record<string, TileData[][]>;
  isTeamMode: boolean;
}): RoundResult[] {
  const { players, indicator, winnerId, winByOkey, playerHands } = params;
  const ok = getOkeyInfo(indicator);
  const mult = getColorMultiplier(indicator);

  return players.map(p => {
    const breakdown: string[] = [];
    let penalty = 0;
    const isWinner = p.id === winnerId;
    const isPlayerOpened = p.hasOpened;

    if (isWinner) {
       // KAZANAN: Renk katı × 100 kadar ödül (eksi ceza = ödül)
       if (winByOkey) {
          // Okeyle bitme: 2 katı ödül
          penalty = -(200 * mult);
          breakdown.push(`Okeyle bitme ödülü (200 × ${mult}): ${penalty}`);
       } else {
          // Normal bitme: Mavi=-600, Kırmızı=-500, Siyah=-400, Sarı=-300
          penalty = -(100 * mult);
          breakdown.push(`Kazanma ödülü (100 × ${mult}): ${penalty}`);
       }
    } else {
       // KAYBEDENLER VEYA DESTE BİTİNCE AÇIK OLANLAR
       if (!isPlayerOpened) {
          // KURAL: Açmayan kişiye 100 x renk katı sabit ceza
          penalty = 100 * mult;
          breakdown.push(`El açamama cezası (100 x ${mult}): +${penalty}`);
       } else {
          // KURAL: Açan oyuncuya elindeki taş toplamı x renk katı ceza
          const remainingHand = (playerHands[p.id] || []).filter(t => t !== null) as TileData[];
          const rawSum = remainingHand.reduce((sum, t) => sum + (isJoker(t, ok) ? ok.number : t.number), 0);
          
          if (p.openedType === 'doubles') {
             penalty = rawSum * 2 * mult;
             breakdown.push(`Çift açan kalan (${rawSum}) x 2 x ${mult}: +${penalty}`);
          } else {
             penalty = rawSum * mult;
             breakdown.push(`Açan oyuncu kalan (${rawSum}) x ${mult}: +${penalty}`);
          }
       }
    }

    return {
      id: p.id,
      name: p.name,
      score: p.score,
      penalty,
      isWinner,
      breakdown,
    };
  });
}

// ─── RENK ÇARPANI YARDIMCI ──────────────────────────────────────
export function getColorMultiplier(indicator: TileData): number {
  if (indicator.isFakeOkey) return FAKE_OKEY_MULTIPLIER;
  return COLOR_MULTIPLIERS[indicator.color] ?? 3;
}

// ─── İŞLEK TAŞ CEZASI (Kural 12) ───────────────────────────────
export function getThrowAppendablePenalty(indicator: TileData): number {
  return (getColorMultiplier(indicator) * 100) / 2;
}

// ─── TAŞ KAPTIRMA CEZASI (Kural 8) ─────────────────────────────
export function getDiscardStealPenalty(tileNumber: number): number {
  return tileNumber * 10;
}
