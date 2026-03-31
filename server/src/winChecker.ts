import { TileColor, TileData, COLOR_MULTIPLIERS, FAKE_OKEY_MULTIPLIER } from './gameEngine';

// ─── OKEY BİLGİSİ ────────────────────────────────────────────────
export function getOkeyInfo(indicator: TileData): { number: number; color: TileColor } {
  return {
    number: indicator.number === 13 ? 1 : indicator.number + 1,
    color: indicator.color,
  };
}

export function isOkeyTile(t: TileData, okey: { number: number; color: TileColor }): boolean {
  return !t.isFakeOkey && t.number === okey.number && t.color === okey.color;
}

function isJoker(t: TileData, okey: { number: number; color: TileColor }): boolean {
  return t.isFakeOkey === true || isOkeyTile(t, okey);
}

// ─── KURAL 1: 13→1 YASAK — SERİ PER KONTROLÜ ────────────────────
function isValidSeries(meld: TileData[], okey: { number: number; color: TileColor }): boolean {
  const firstNormal = meld.find(t => !isJoker(t, okey));
  if (!firstNormal) return meld.length >= 3;

  const isAllSameColor = meld.every(t => isJoker(t, okey) || t.color === firstNormal.color);
  if (!isAllSameColor) return false;

  const ns = meld.map(t => isJoker(t, okey) ? -1 : t.number);
  const pivot = firstNormal.number;
  const pIdx = ns.indexOf(pivot);

  for (let i = 0; i < ns.length; i++) {
    if (ns[i] !== -1) {
      const expected = pivot + (i - pIdx);
      // KURAL 1: Sayı 1 ile 13 arasında olmalı, 13→1 geçişi yok
      if (expected < 1 || expected > 13) return false;
      if (ns[i] !== expected) return false;
    }
  }

  // Seri içinde aynı sayı iki kez olamaz
  const normalNums = ns.filter(n => n !== -1);
  if (new Set(normalNums).size !== normalNums.length) return false;

  return true;
}

// ─── GRUP PER KONTROLÜ (Aynı sayı, farklı renk) ─────────────────
function isValidGroup(meld: TileData[], okey: { number: number; color: TileColor }): boolean {
  if (meld.length < 3 || meld.length > 4) return false;
  const firstNormal = meld.find(t => !isJoker(t, okey));
  if (!firstNormal) return meld.length >= 3;

  const isAllSameNumber = meld.every(t => isJoker(t, okey) || t.number === firstNormal.number);
  if (!isAllSameNumber) return false;

  const colors = new Set<string>();
  for (const t of meld) {
    if (!isJoker(t, okey)) {
      if (colors.has(t.color)) return false; // AYNI RENKTEN BİRDEN FAZLA OLAMAZ
      colors.add(t.color);
    }
  }
  return true;
}

export function isValidMeld(meld: TileData[], okey: { number: number; color: TileColor }): boolean {
  if (meld.length < 3) return false;
  return isValidSeries(meld, okey) || isValidGroup(meld, okey);
}

// ─── ÇİFT PER KONTROLÜ (Tam 2 aynı taş, aynı renk ve sayı) ─────
export function isValidDouble(pair: TileData[], okey: { number: number; color: TileColor }): boolean {
  const normals = pair.filter(t => !isJoker(t, okey));
  const jokers = pair.filter(t => isJoker(t, okey));
  if (pair.length < 2) return false;
  if (normals.length === 0) return true; // Tüm joker
  // Çift: aynı sayı, aynı renk (not: grup peri gibi farklı renk değil, gerçek çift)
  if (normals.length >= 2) {
    return normals.every(t => t.number === normals[0].number && t.color === normals[0].color);
  }
  return true; // 1 normal + 1 joker
}

// ─── KAZANMA KONTROLÜ ────────────────────────────────────────────
export function isWinningHand(hand: TileData[], indicator: TileData): boolean {
  if (hand.length !== 14) return false;
  const okey = getOkeyInfo(indicator);
  return canArrangeAll(hand, okey);
}

function canArrangeAll(tiles: TileData[], okey: { number: number; color: TileColor }): boolean {
  const jokers = tiles.filter(t => isJoker(t, okey));
  const normals = tiles.filter(t => !isJoker(t, okey));
  return tryArrange(normals, jokers.length, okey);
}

function tryArrange(tiles: TileData[], jokerCount: number, okey: { number: number; color: TileColor }): boolean {
  if (tiles.length === 0) return true;

  const first = tiles[0];
  const rest = tiles.slice(1);

  // Seri dene (3-14 uzunluk)
  for (let len = 3; len <= tiles.length; len++) {
    const result = tryBuildSeries(first, rest, len - 1, jokerCount, okey);
    if (result) {
      const remaining = rest.filter((_, i) => !result.usedIndices.includes(i));
      if (tryArrange(remaining, jokerCount - result.jokersUsed, okey)) return true;
    }
  }

  // Grup dene (3-4 uzunluk)
  for (let len = 3; len <= 4; len++) {
    const result = tryBuildGroup(first, rest, len - 1, jokerCount, okey);
    if (result) {
      const remaining = rest.filter((_, i) => !result.usedIndices.includes(i));
      if (tryArrange(remaining, jokerCount - result.jokersUsed, okey)) return true;
    }
  }

  return false;
}

// ─── MODEL: TÜM PERLERİ BUL (BOT VE YARDIMCI İÇİN) ───────────
export function findMelds(hand: TileData[], okey: { number: number; color: TileColor }): { melds: TileData[][], total: number } {
  const jokers = hand.filter(t => isJoker(t, okey));
  const normals = hand.filter(t => !isJoker(t, okey));
  
  let bestMelds: TileData[][] = [];
  let bestScore = 0;

  // Basit Açgözlü Algoritma: En uzun/değerli perleri bulur
  function search(remaining: TileData[], currentMelds: TileData[][], currentJokers: number) {
    if (remaining.length < 3 && currentJokers === 0) {
      const score = currentMelds.flat().reduce((sum, t) => sum + (isJoker(t, okey) ? 0 : t.number), 0);
      if (score > bestScore) {
        bestScore = score;
        bestMelds = JSON.parse(JSON.stringify(currentMelds));
      }
      return;
    }

    const first = remaining[0];
    const rest = remaining.slice(1);
    let foundAny = false;

    // Seri dene
    for (let len = 3; len <= 14; len++) {
       const res = tryBuildSeries(first, rest, len - 1, currentJokers, okey);
       if (res) {
          foundAny = true;
          const meld: TileData[] = [first];
          const innerRest = [...rest];
          // Realistically reconstruct the meld for reporting
          res.usedIndices.forEach(idx => meld.push(innerRest[idx]));
          for(let j=0; j<res.jokersUsed; j++) meld.push(jokers[currentJokers - 1 - j]);
          
          const nextRemaining = rest.filter((_, i) => !res.usedIndices.includes(i));
          search(nextRemaining, [...currentMelds, meld], currentJokers - res.jokersUsed);
       }
    }

    // Grup dene
    for (let len = 3; len <= 4; len++) {
       const res = tryBuildGroup(first, rest, len - 1, currentJokers, okey);
       if (res) {
          foundAny = true;
          const meld: TileData[] = [first];
          const innerRest = [...rest];
          res.usedIndices.forEach(idx => meld.push(innerRest[idx]));
          for(let j=0; j<res.jokersUsed; j++) meld.push(jokers[currentJokers - 1 - j]);

          const nextRemaining = rest.filter((_, i) => !res.usedIndices.includes(i));
          search(nextRemaining, [...currentMelds, meld], currentJokers - res.jokersUsed);
       }
    }

    if (!foundAny && rest.length > 0) {
      search(rest, currentMelds, currentJokers);
    } else if (!foundAny) {
      const score = currentMelds.flat().reduce((sum, t) => sum + (isJoker(t, okey) ? 0 : t.number), 0);
      if (score > bestScore) {
        bestScore = score;
        bestMelds = JSON.parse(JSON.stringify(currentMelds));
      }
    }
  }

  // Optimize search by sorting normals first
  search(normals.sort((a,b) => b.number - a.number), [], jokers.length);

  return { melds: bestMelds, total: bestScore };
}

function tryBuildSeries(
  first: TileData,
  rest: TileData[],
  needed: number,
  jokers: number,
  okey: { number: number; color: TileColor }
) {
  const usedIndices: number[] = [];
  let jokersUsed = 0;

  for (let i = 1; i <= needed; i++) {
    const targetNum = first.number + i;
    if (targetNum > 13) return null; // KURAL 1: 13'ten sonra gelemez
    const idx = rest.findIndex((t, ri) => !usedIndices.includes(ri) && t.color === first.color && t.number === targetNum);
    if (idx !== -1) {
      usedIndices.push(idx);
    } else if (jokersUsed < jokers) {
      jokersUsed++;
    } else {
      return null;
    }
  }
  return { usedIndices, jokersUsed };
}

function tryBuildGroup(
  first: TileData,
  rest: TileData[],
  needed: number,
  jokers: number,
  okey: { number: number; color: TileColor }
) {
  const usedColors = new Set<TileColor>([first.color]);
  const usedIndices: number[] = [];
  let jokersUsed = 0;

  for (const [i, t] of rest.entries()) {
    if (usedIndices.length >= needed) break;
    if (t.number === first.number && !usedColors.has(t.color)) {
      usedColors.add(t.color);
      usedIndices.push(i);
    }
  }

  while (usedIndices.length < needed) {
    if (jokersUsed < jokers) {
      jokersUsed++;
      usedIndices.push(-1); // joker placeholder
    } else {
      return null;
    }
  }

  return { usedIndices: usedIndices.filter(i => i >= 0), jokersUsed };
}

// ─── KURAL 6 & 7: ÇİFT AÇMA KONTROLÜ ───────────────────────────
export function findDoubles(hand: TileData[], okey: { number: number; color: TileColor }): {
  pairs: TileData[][];
  total: number;
} {
  const normalTiles: TileData[] = [];
  const jokers: TileData[] = [];

  for (const t of hand) {
    if (isJoker(t, okey)) {
      jokers.push(t);
    } else {
      normalTiles.push(t);
    }
  }

  const groups = new Map<string, TileData[]>();
  for (const t of normalTiles) {
    const key = `${t.number}-${t.color}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const pairs: TileData[][] = [];
  const remainders: TileData[] = [];

  // Önce tam eşleşen normal çiftleri bul
  for (const [, tiles] of groups) {
    for (let i = 0; i < Math.floor(tiles.length / 2); i++) {
        pairs.push([tiles[i * 2], tiles[i * 2 + 1]]);
    }
    if (tiles.length % 2 === 1) {
      remainders.push(tiles[tiles.length - 1]);
    }
  }

  // Sonra kalan tekleri jokerlerle eşleştir
  let jokerIdx = 0;
  for (const t of remainders) {
    if (jokerIdx < jokers.length) {
      pairs.push([t, jokers[jokerIdx++]]);
    }
  }

  // Kalan jokerler varsa onları da kendi içinde eşleştir
  const remainingJokers = jokers.slice(jokerIdx);
  for (let i = 0; i < Math.floor(remainingJokers.length / 2); i++) {
    pairs.push([remainingJokers[i * 2], remainingJokers[i * 2 + 1]]);
  }

  // Toplam puanı hesapla (Joker eşleştiği taşın puanını alır, iki joker okey puanı alır)
  const total = pairs.reduce((sum, pair) => {
    const p1 = pair[0];
    const p2 = pair[1];
    if (isJoker(p1, okey) && isJoker(p2, okey)) return sum + 25; // Çift joker yüksek puan
    if (isJoker(p1, okey)) return sum + p2.number * 2;
    if (isJoker(p2, okey)) return sum + p1.number * 2;
    return sum + p1.number * 2;
  }, 0);

  return { pairs, total };
}

// ─── PUAN HESAPLAMA (EL SONU) ────────────────────────────────────

export interface PlayerEndState {
  id: string;
  name: string;
  hasOpened: boolean;
  openedType: 'series' | 'doubles' | null;
  remainingTiles: TileData[];
  openedMelds: TileData[][];
  isWinner: boolean;
  /** Okey atarak mı bitti (winner için) */
  winByOkey: boolean;
  /** Eşli oyunda partner id */
  partnerId?: string;
}

export interface ScoreResult {
  playerId: string;
  score: number; // Negatif = bonus, Pozitif = ceza
  breakdown: string[];
}

/**
 * El sonu puanlarını hesaplar — Tüm kurallar uygulanır
 */
export function calculateRoundScores(
  players: PlayerEndState[],
  indicator: TileData,
  isTeamMode: boolean
): ScoreResult[] {
  const okey = getOkeyInfo(indicator);
  const mult = indicator.isFakeOkey ? FAKE_OKEY_MULTIPLIER : COLOR_MULTIPLIERS[indicator.color as TileColor];

  const winner = players.find(p => p.isWinner);
  const results: ScoreResult[] = players.map(p => ({ playerId: p.id, score: 0, breakdown: [] }));
  const getResult = (id: string) => results.find(r => r.playerId === id)!;

  // ─── KAZANAN PUANI (Örn: Mavi biterse -600) ───────────────────
  if (winner) {
    const r = getResult(winner.id);
    const bonus = -(mult * 100);
    r.score += bonus;
    r.breakdown.push(`${indicator.color.toUpperCase()} Renk Bitme Bonusu: ${bonus}`);
    
    // OKEY ile biterse bonus ikiye katlanır (Klasik Kural)
    if (winner.winByOkey) {
      r.score += bonus;
      r.breakdown.push(`OKEY ile Bitme Bonusu: ${bonus}`);
    }
  }

  // ─── DİĞER OYUNCULAR İÇİN CEZA ───────────────────────────────
  for (const p of players) {
    if (p.isWinner) continue;
    const r = getResult(p.id);

    if (!p.hasOpened) {
      // EL AÇMAYAN CEZASI (Örn: Mavi biterse +600)
      const penalty = 100 * mult;
      r.score += penalty;
      r.breakdown.push(`El Açmama Cezası: +${penalty}`);
    } else {
      // EL AÇAN AMA KAYBEDEN (Eldeki sayıların katı kadar ceza)
      let handSum = p.remainingTiles.reduce((sum, t) => {
        // Elde kalan Okey taşı genellikle 10 veya indicator değeri sayılır, biz kafa karışıklığı olmasın diye tile değerini alalım
        return sum + (t.isFakeOkey ? 20 : t.number); 
      }, 0);

      let penalty = handSum * mult;
      
      // Çiftten açtıysa ceza ikiye katlanır (Klasik Kural)
      if (p.openedType === 'doubles') {
        penalty *= 2;
        r.breakdown.push(`Çift Açan Kalan Cezası (x2): +${penalty}`);
      } else {
        r.breakdown.push(`Seri Açan Kalan Cezası: +${penalty}`);
      }
      
      r.score += penalty;
    }
  }

  return results;
}

// ─── İŞLEK TAŞ ATMA CEZASI (Kural 12) ─────────────────────────
export function getThrowAppendablePenalty(indicator: TileData): number {
  const mult = indicator.isFakeOkey ? FAKE_OKEY_MULTIPLIER : COLOR_MULTIPLIERS[indicator.color as TileColor];
  return (mult * 100) / 2;
}

// ─── TAŞ KAPTIRMA CEZASI (Kural 8) ────────────────────────────
export function getDiscardStealPenalty(tileNumber: number): number {
  return tileNumber * 10;
}

// ─── İŞLEK KAPTIRMA CEZASI (Kural 10/11) ─────────────────────
export function getAppendPenalty(tiles: TileData[]): number {
  const total = tiles.reduce((sum, t) => sum + (t.isFakeOkey ? 0 : t.number), 0);
  return total * 10;
}
