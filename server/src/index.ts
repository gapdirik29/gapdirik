import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';
import { TileColor, TileData, GameEngine, COLOR_MULTIPLIERS, FAKE_OKEY_MULTIPLIER } from './gameEngine.js';
import { BotAI } from './botAI.js';
import { getOkeyInfo, isWinningHand, isValidMeld, isOkeyTile, isValidDouble, calculateRoundScores, findMelds, findDoubles } from './winChecker.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

// MongoDB Bağlantısı (Varsayılan Yerel MongoDB veya .env)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gapdirik-db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Bağlantısı Başarılı'))
  .catch((err) => console.error('❌ MongoDB Bağlantı Hatası:', err));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

/* ───────────── Tipler ───────────── */
interface Player {
  id: string;
  name: string;
  chips: number;
  isBot: boolean;
  hand: TileData[];
  hasDrawn: boolean; // Sıra geldiğinde taş çekti mi?
  hasOpened: boolean;
  openedType: 'series' | 'doubles' | null;
  botAI?: BotAI;
}

interface Room {
  id: string;
  name: string;
  players: Player[];
  gameState: 'waiting' | 'playing' | 'finished';
  turnIndex: number;
  drawPile: TileData[];
  allDiscards: Record<string, TileData[]>; 
  indicator: TileData | null;
  roundBet: number;
  botTimers: ReturnType<typeof setTimeout>[];
  openedMelds: Record<string, TileData[][]>;
  dealerIndex: number;
  roundNumber: number;
  tournamentScores: Record<string, number>;
  highestSeriesValue: number;
  highestDoublesValue: number;
}

const rooms = new Map<string, Room>();

/* ───────────── Yardımcılar ───────────── */
function getSafeRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null;
}

function canAppendToMelds(
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

function broadcastGameState(room: Room) {
  const prevIdx = (room.turnIndex - 1 + room.players.length) % room.players.length;
  const prevPlayerId = room.players[prevIdx]?.id;
  const discardPile = prevPlayerId ? (room.allDiscards[prevPlayerId] || []) : [];

  const publicState = {
    gamePhase: room.gameState,
    gameState: room.gameState,
    turnIndex: room.turnIndex,
    currentTurn: room.players[room.turnIndex]?.id,
    drawPileCount: room.drawPile.length,
    discardPile: discardPile, 
    allDiscards: room.allDiscards,
    indicator: room.indicator,
    openedMelds: room.openedMelds,
    dealerIndex: room.dealerIndex,
    roundNumber: room.roundNumber,
    dealerId: room.players[room.dealerIndex]?.id,
    highestSeriesValue: room.highestSeriesValue,
    highestDoublesValue: room.highestDoublesValue,
    tournamentScores: room.tournamentScores,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      isBot: p.isBot,
      tileCount: p.hand.length,
      hasOpened: p.hasOpened,
      openedType: p.openedType,
      isCurrentTurn: room.players[room.turnIndex]?.id === p.id
    }))
  };
  io.to(room.id).emit('game_update', publicState);
}

function advanceTurn(room: Room) {
  if (!room || room.gameState !== 'playing') return;
  
  // KURAL: Eğer çekilecek taş kalmadıysa oyun biter
  if (room.drawPile.length === 0) {
    endGame(room, ''); // BERABERE (Deste bitti)
    return;
  }

  const current = room.players[room.turnIndex];
  if (current) current.hasDrawn = false;
  
  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  broadcastGameState(room);
  scheduleBotTurn(room);
}

function endGame(room: Room, winnerId: string) {
  if (!room || room.gameState === 'finished') return;

  room.gameState = 'finished';
  room.botTimers.forEach(t => clearTimeout(t));
  room.botTimers = [];
  
  if (!room.indicator) {
     console.error('[ERROR] endGame called without indicator');
     return;
  }

  // Create player states for score calculation
  const playerStates = room.players.map(p => ({
    id: p.id,
    name: p.name,
    hasOpened: p.hasOpened,
    openedType: p.openedType,
    remainingTiles: p.hand,
    openedMelds: room.openedMelds[p.id] || [],
    isWinner: p.id === winnerId,
    winByOkey: false // Detection happens here if winner is set and was okey bitme
  }));

  const roundResults = calculateRoundScores(playerStates, room.indicator!, false);
  
  // Update tournament scores
  roundResults.forEach((res: any) => {
    if (!room.tournamentScores[res.playerId]) room.tournamentScores[res.playerId] = 0;
    room.tournamentScores[res.playerId] += res.score;
    
    // Also deduct chips based on score intensity
    const player = room.players.find(p => p.id === res.playerId);
    if (player) {
       // Typically in 101, chips are separate from score points, but we'll link them for impact
       player.chips -= Math.max(0, res.score * 10); 
    }
  });

  io.to(room.id).emit('game_over', {
    winnerId,
    roundResults,
    tournamentScores: room.tournamentScores,
    roundNumber: room.roundNumber,
    isTournamentEnd: room.roundNumber >= 9
  });

  room.roundNumber++; // Tur sayısını artır
}

function scheduleBotTurn(room: Room) {
  if (room.gameState !== 'playing') return;
  const current = room.players[room.turnIndex];
  if (!current || !current.isBot) return;

  const delay = 1000 + Math.random() * 1500;
  const timer = setTimeout(() => {
    if (room.gameState !== 'playing') return;
    if (room.players[room.turnIndex]?.id !== current.id) return;

    if (room.drawPile.length === 0) {
      endGame(room, ''); 
      return;
    }
    const drawn = room.drawPile.shift()!;
    current.hand.push(drawn);

    const ai = current.botAI!;
    ai.addTile(drawn);

    const okey = getOkeyInfo(room.indicator!);

    // BOT EL AÇMA MANTIĞI (Baraj Seri: 51, Çift: 52 - GAPDİRİK KURALLARI)
    if (!current.hasOpened) {
       const series = findMelds(current.hand, okey);
       const doubles = findDoubles(current.hand, okey);

       if (series.total >= room.highestSeriesValue) {
          current.hasOpened = true;
          current.openedType = 'series';
          room.openedMelds[current.id] = series.melds;
          room.highestSeriesValue = series.total + 1;
          const meldIds = new Set(series.melds.flat().map((t: TileData) => t.id));
          current.hand = current.hand.filter((t: TileData) => !meldIds.has(t.id));
          series.melds.flat().forEach((t: TileData) => ai.removeTile(t.id));
          console.log(`[BOT OPEN] ${current.name} opened Series with ${series.total}`);
       } else if (doubles.total >= room.highestDoublesValue) {
          current.hasOpened = true;
          current.openedType = 'doubles';
          room.openedMelds[current.id] = doubles.pairs;
          room.highestDoublesValue = doubles.total + 1;
          const pairIds = new Set(doubles.pairs.flat().map((t: TileData) => t.id));
          current.hand = current.hand.filter((t: TileData) => !pairIds.has(t.id));
          doubles.pairs.flat().forEach((t: TileData) => ai.removeTile(t.id));
          console.log(`[BOT OPEN] ${current.name} opened Doubles with ${doubles.total}`);
       }
    } else {
       // AÇIKSA DİĞERLERİNE İŞLE VE EK PER AÇ
       const series = findMelds(current.hand, okey);
       if (series.total > 0) {
          room.openedMelds[current.id] = [...(room.openedMelds[current.id] || []), ...series.melds];
          const meldIds = new Set(series.melds.flat().map((t: TileData) => t.id));
          current.hand = current.hand.filter((t: TileData) => !meldIds.has(t.id));
          series.melds.flat().forEach((t: TileData) => ai.removeTile(t.id));
       }
    }

    if (room.indicator && isWinningHand(current.hand, room.indicator)) {
      endGame(room, current.id);
      return;
    }

    const discard = ai.pickDiscard();
    ai.removeTile(discard.id);
    current.hand = current.hand.filter(t => t.id !== discard.id);
    if (!room.allDiscards[current.id]) room.allDiscards[current.id] = [];
    room.allDiscards[current.id].push(discard);

    io.to(room.id).emit('bot_action', {
      botId: current.id,
      botName: current.name,
      drawnTile: null,
      discardedTile: discard,
    });

    advanceTurn(room);
  }, delay);

  room.botTimers.push(timer);
}

/* Dealer bot ise: 15 taşla başlıyor, taş çEKMEDEN direkt atıyor */
function scheduleBotDealerDiscard(room: Room) {
  if (room.gameState !== 'playing') return;
  const current = room.players[room.turnIndex];
  if (!current || !current.isBot) return;

  const delay = 800 + Math.random() * 1000;
  const timer = setTimeout(() => {
    if (room.gameState !== 'playing') return;
    if (room.players[room.turnIndex]?.id !== current.id) return;

    const ai = current.botAI!;

    if (room.indicator && isWinningHand(current.hand, room.indicator)) {
      endGame(room, current.id);
      return;
    }

    // Sadece at, çekme yok
    const discard = ai.pickDiscard();
    ai.removeTile(discard.id);
    current.hand = current.hand.filter(t => t.id !== discard.id);
    if (!room.allDiscards[current.id]) room.allDiscards[current.id] = [];
    room.allDiscards[current.id].push(discard);

    io.to(room.id).emit('bot_action', {
      botId: current.id,
      botName: current.name,
      drawnTile: null,
      discardedTile: discard,
    });

    advanceTurn(room);
  }, delay);

  room.botTimers.push(timer);
}


/* ───────────── Socket Olayları ───────────── */
io.on('connection', (socket: Socket) => {
  console.log(`[+] Bağlandı: ${socket.id}`);

    socket.on('get_rooms', () => {
    const availableRooms = Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.length,
      maxPlayers: 4,
      roundBet: r.roundBet,
      gameState: r.gameState
    }));
    socket.emit('rooms_list', availableRooms);
  });

  socket.on('create_room', ({ name, bet }: { name: string; bet: number }) => {
    const roomId = `room-${Date.now()}`;
    let roomTitle = name;
    if (!roomTitle) {
      if (bet >= 10000) roomTitle = `VIP Kral Masası #${rooms.size + 1}`;
      else if (bet >= 5000) roomTitle = `Usta Masası #${rooms.size + 1}`;
      else roomTitle = `Çaylak Masası #${rooms.size + 1}`;
    }
    
    const newRoom: Room = {
      id: roomId,
      name: roomTitle,
      players: [],
      gameState: 'waiting',
      turnIndex: 0,
      drawPile: [],
      allDiscards: {},
      indicator: null,
      roundBet: bet || 200,
      botTimers: [],
      openedMelds: {},
      dealerIndex: 0,
      roundNumber: 1,
      tournamentScores: {},
      highestSeriesValue: 51,
      highestDoublesValue: 52,
    };
    rooms.set(roomId, newRoom);
    socket.emit('room_created', roomId);
  });

  socket.on('join_room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    console.log(`[JOIN] ${playerName} joins ${roomId}`);
    let room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('join_error', 'Oda bulunamadı');
      return;
    }

    if (room.gameState === 'playing' || room.players.filter(p => !p.isBot).length >= 4) {
      socket.emit('join_error', 'Oda dolu veya oyun devam ediyor');
      return;
    }

    room.players = room.players.filter(p => p.id !== socket.id);

    // Initial Chip Count: 50,000
    const START_CHIPS = 50000;
    
    if (START_CHIPS < room.roundBet) {
       socket.emit('join_error', 'Yetersiz çip! Bu odaya girmek için daha fazlasına ihtiyacın var.');
       return;
    }

    const newPlayer: Player = {
      id: socket.id,
      name: playerName || `Oyuncu ${room.players.length + 1}`,
      chips: START_CHIPS,
      isBot: false,
      hand: [],
      hasDrawn: false,
      hasOpened: false,
      openedType: null,
    };
    room.players.push(newPlayer);
    socket.join(roomId);

    const updateData = {
      id: room.id,
      name: room.name,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        isBot: p.isBot,
        tileCount: p.hand.length,
        hasOpened: p.hasOpened,
        openedType: p.openedType
      })),
      gameState: room.gameState,
      roundBet: room.roundBet
    };
    
    io.to(roomId).emit('room_update', updateData);
  });

  socket.on('quick_join', ({ playerName, preferredBet }: { playerName: string; preferredBet?: number }) => {
    console.log(`[QUICK JOIN] ${playerName} looking for a game...`);
    
    // Find rooms: waiting, has space, not private
    let availableRooms = Array.from(rooms.values()).filter(r => 
      r.gameState === 'waiting' && 
      r.players.filter(p => !p.isBot).length < 4
    );

    // If preferredBet is specified, prioritize matching that
    if (preferredBet) {
      const matchingBet = availableRooms.filter(r => r.roundBet === preferredBet);
      if (matchingBet.length > 0) availableRooms = matchingBet;
    }

    // Sort by player count (descending) to fill rooms faster
    availableRooms.sort((a, b) => b.players.length - a.players.length);

    let targetRoomId: string;

    if (availableRooms.length > 0) {
      targetRoomId = availableRooms[0].id;
      console.log(`[QUICK JOIN] Found existing room: ${targetRoomId}`);
    } else {
      // Create a new room
      targetRoomId = `room-${Date.now()}`;
      const bet = preferredBet || 2000;
      let roomTitle = '';
      if (bet >= 25000) roomTitle = `VIP Kral Masası #${rooms.size + 1}`;
      else if (bet >= 5000) roomTitle = `Usta Masası #${rooms.size + 1}`;
      else roomTitle = `Çaylak Masası #${rooms.size + 1}`;

      const newRoom: Room = {
        id: targetRoomId,
        name: roomTitle,
        players: [],
        gameState: 'waiting',
        turnIndex: 0,
        drawPile: [],
        allDiscards: {},
        indicator: null,
        roundBet: bet,
        botTimers: [],
        openedMelds: {},
        dealerIndex: 0,
        roundNumber: 1,
        tournamentScores: {},
        highestSeriesValue: 51,
        highestDoublesValue: 52,
      };
      rooms.set(targetRoomId, newRoom);
      console.log(`[QUICK JOIN] Created new room: ${targetRoomId} with bet ${bet}`);
    }

    // Reuse join_room logic via emitting or calling it? 
    // Easier to just emit 'room_created' or 'quick_join_success' and let client join
    socket.emit('quick_join_success', targetRoomId);
  });

  /* ─── Oyunu Başlat ─── */
  socket.on('start_game', ({ roomId }: { roomId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState === 'playing') return;

    const botNames = ['Bot Ahmet', 'Bot Fatma', 'Bot Kemal'];
    while (room.players.length < 4) {
      const bot: Player = {
        id: `bot-${Date.now()}-${room.players.length}`,
        name: botNames[room.players.length - 1] ?? `Bot ${room.players.length}`,
        chips: 800 + Math.floor(Math.random() * 600),
        isBot: true,
        hand: [],
        hasDrawn: false,
        hasOpened: false,
        openedType: null,
      };
      room.players.push(bot);
    }

    // İlk elde rastgele dealer, sonraki ellerde +1 (koltuk altı)
    if (room.roundNumber === 1) {
      room.dealerIndex = Math.floor(Math.random() * room.players.length);
    } else {
      room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
    }

    room.gameState = 'playing';
    room.turnIndex = room.dealerIndex;
    room.allDiscards = {};
    room.players.forEach(p => room!.allDiscards[p.id] = []);
    room.openedMelds = {};

    const engine = new GameEngine();
    const { hands, remaining, indicator } = engine.deal(room.players.length, room.dealerIndex);

    room.drawPile = remaining;
    room.indicator = indicator;

    room.players.forEach((player, idx) => {
      player.hand = hands[idx];
      player.hasDrawn = (idx === room.dealerIndex); // Dealer 15 taşla başlar, sanki çekmiş gibi
      player.hasOpened = false;
      player.openedType = null;
      if (player.isBot) {
        player.botAI = new BotAI(player.hand, room.indicator!);
      } else {
        io.to(player.id).emit('your_hand', player.hand);
      }
    });

    const dealerPlayer = room.players[room.dealerIndex];
    console.log(`[DEALER] ${dealerPlayer.name} (idx: ${room.dealerIndex}) — El #${room.roundNumber} — 15 taş başlıyor`);

    broadcastGameState(room);
    io.to(roomId).emit('game_started', {
      indicator: room.indicator,
      currentTurn: dealerPlayer.id,
      dealerId: dealerPlayer.id,
      dealerName: dealerPlayer.name,
      roundBet: room.roundBet,
      roundNumber: room.roundNumber,
    });

    // Dealer bot ise direkt atma mantığını çalıştır (çekme yok)
    if (dealerPlayer.isBot) {
      scheduleBotDealerDiscard(room);
    }
    // Dealer insan ise client zaten 15 taşla başlayacak (hasDrawn=true durumu)
  });

  /* ─── El Aç (Seri) ─── */
  socket.on('open_series', ({ roomId, melds }: { roomId: string; melds: TileData[][] }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const okey = getOkeyInfo(room.indicator!);
    
    const meldTiles = melds.flat();
    const playerHandIds = new Set(player.hand.map(t => t.id));
    const ownsAll = meldTiles.every(t => playerHandIds.has(t.id));
    if (!ownsAll) {
      socket.emit('error', 'Elinde olmayan taşları açmaya çalışıyorsun!');
      return;
    }

    // Server-side validation of melds
    let totalScore = 0;
    const isValid = melds.every(m => {
      if (!isValidMeld(m, okey)) return false;
      totalScore += m.reduce((sum, t) => {
        if (t.isFakeOkey || isOkeyTile(t, okey)) return sum + okey.number;
        return sum + t.number;
      }, 0);
      return true;
    });

    // 51 OKEY (Katlamalı) KURALI: Baraj 51'dir ve masadaki en yüksekten fazla olmalıdır.
    const minMeld = room.highestSeriesValue;
    if (!isValid || totalScore < minMeld) {
      socket.emit('error', `Geçersiz seri! Masadaki Baraj: ${minMeld}, Senin: ${totalScore}`);
      return;
    }

    player.hasOpened = true;
    player.openedType = 'series';
    room.openedMelds[player.id] = melds;
    
    // Masadaki barajı güncelle
    room.highestSeriesValue = totalScore + 1;
    
    // Elinden bu taşları çıkar (Server authoritative hand)
    const meldIds = new Set(melds.flat().map(t => t.id));
    player.hand = player.hand.filter(t => !meldIds.has(t.id));

    socket.emit('your_hand', player.hand);
    broadcastGameState(room);
  });

  /* ─── El Aç (Çift) ─── */
  socket.on('open_doubles', ({ roomId, pairs }: { roomId: string; pairs: TileData[][] }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const okey = getOkeyInfo(room.indicator!);
    
    const pairTiles = pairs.flat();
    const playerHandIds = new Set(player.hand.map(t => t.id));
    const ownsAll = pairTiles.every(t => playerHandIds.has(t.id));
    if (!ownsAll) {
      socket.emit('error', 'Elinde olmayan taşları açmaya çalışıyorsun!');
      return;
    }

    // 52 ÇİFT (Katlamalı) KURALI: Baraj 52'dir ve masadaki en yüksekten fazla olmalıdır.
    const isValid = pairs.every(p => isValidDouble(p, okey));
    const totalPoints = pairs.flat().reduce((sum, t) => sum + t.number, 0);
    const minMeld = room.highestDoublesValue;

    if (!isValid || totalPoints < minMeld) {
      socket.emit('error', `Geçersiz çift! Masadaki Baraj: ${minMeld}, Senin: ${totalPoints}`);
      return;
    }

    player.hasOpened = true;
    player.openedType = 'doubles';
    room.openedMelds[player.id] = pairs;

    // Masadaki barajı güncelle
    room.highestDoublesValue = totalPoints + 1;
    
    const pairIds = new Set(pairs.flat().map(t => t.id));
    player.hand = player.hand.filter(t => !pairIds.has(t.id));

    socket.emit('your_hand', player.hand);
    broadcastGameState(room);
  });

  /* ─── Taş Çek ─── */
  socket.on('draw_tile', ({ roomId }: { roomId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;

    const current = room.players[room.turnIndex];
    if (current.id !== socket.id || current.hasDrawn) {
      socket.emit('error', current.hasDrawn ? 'Zaten taş çektin' : 'Senin sıran değil');
      return;
    }
    if (room.drawPile.length === 0) {
      endGame(room, ''); // Deste bitti, cezalar yazılsın
      return;
    }

    const drawn = room.drawPile.shift();
    if (!drawn) {
      endGame(room, '');
      return;
    }
    
    current.hand.push(drawn);
    current.hasDrawn = true;
    socket.emit('tile_drawn', { tile: drawn, drawPileCount: room.drawPile.length, source: 'pile' });
    broadcastGameState(room);
  });

  /* ─── Yandan Taş Al (Kural 4/5) ─── */
  socket.on('take_discard', ({ roomId }: { roomId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;

    const current = room.players[room.turnIndex];
    if (current.id !== socket.id || current.hasDrawn) return;

    const prevIdx = (room.turnIndex - 1 + room.players.length) % room.players.length;
    const prevPlayer = room.players[prevIdx];
    const discards = room.allDiscards[prevPlayer.id] || [];
    if (discards.length === 0) return;

    const takenTile = discards.pop()!;
    current.hand.push(takenTile);
    current.hasDrawn = true;
    (current as any).tookDiscard = true;
    (current as any).mustOpenThisTurn = true;

    socket.emit('tile_drawn', { tile: takenTile, drawPileCount: room.drawPile.length, source: 'discard' });
    broadcastGameState(room);
  });

  socket.on('put_back_discard', ({ roomId }: { roomId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;

    const current = room.players[room.turnIndex];
    if (current.id !== socket.id || !(current as any).tookDiscard) return;

    // Son alınan taşı bul (En son eklenen taş)
    const takenTile = current.hand.pop()!;
    current.hasDrawn = false;
    (current as any).tookDiscard = false;
    (current as any).mustOpenThisTurn = false;

    // Geri önceki oyuncunun atığına koy
    const prevIdx = (room.turnIndex - 1 + room.players.length) % room.players.length;
    if (!room.allDiscards[room.players[prevIdx].id]) room.allDiscards[room.players[prevIdx].id] = [];
    room.allDiscards[room.players[prevIdx].id].push(takenTile);

    socket.emit('your_hand', current.hand);
    broadcastGameState(room);
  });

  /* ─── Taş At ─── */
  socket.on('discard_tile', ({ roomId, tileId }: { roomId: string; tileId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;

    const current = room.players[room.turnIndex];
    if (current.id !== socket.id || !current.hasDrawn) {
      socket.emit('error', !current.hasDrawn ? 'Önce taş çekmelisin' : 'Senin sıran değil');
      return;
    }

    const tileIdx = current.hand.findIndex(t => t.id === tileId);
    if (tileIdx === -1) return;

    const [discarded] = current.hand.splice(tileIdx, 1);
    
    // Rakiplerin veya kendinin elindeki işlek taş kontrolü (KURAL 12)
    const okey = getOkeyInfo(room.indicator!);
    const mult = discarded.isFakeOkey ? FAKE_OKEY_MULTIPLIER : COLOR_MULTIPLIERS[room.indicator!.color as TileColor];
    
    // İŞLEK TAŞ PUANI KONTROLÜ
    const tableMelds = Object.values(room.openedMelds).flat();
    const canBeAppended = canAppendToMelds(discarded, tableMelds, okey);
    
    if (canBeAppended) {
      const penalty = (mult * 100) / 2;
      current.chips -= penalty;
      io.to(roomId).emit('penalty_notification', {
        playerId: current.id,
        playerName: current.name,
        msg: 'İşlek Taşı Attın! (Ceza)',
        amount: penalty
      });
    }

    // OKEY ATMA CEZASI (Kural 23)
    if (isOkeyTile(discarded, okey)) {
       const okeyPenalty = 50 * mult * 10; 
       current.chips -= okeyPenalty;
       io.to(roomId).emit('penalty_notification', {
         playerId: current.id,
         playerName: current.name,
         msg: 'OKEY ATTI! (Büyük Hata)',
         amount: okeyPenalty
       });
    }

    // Yandan taş alıp açmama kontrolü
    if ((current as any).mustOpenThisTurn && !current.hasOpened) {
       const penalty = 1010; // 101 ceza puanı karşılığı çip
       current.chips -= penalty;
       io.to(roomId).emit('penalty_notification', {
         playerId: current.id,
         playerName: current.name,
         msg: 'Yandan aldı ama açmadı!',
         amount: penalty
       });
       (current as any).mustOpenThisTurn = false;
    }

    if (!room.allDiscards[current.id]) room.allDiscards[current.id] = [];
    room.allDiscards[current.id].push(discarded);

    // Kazandı mı?
    if (room.indicator && isWinningHand(current.hand, room.indicator)) {
      endGame(room, socket.id);
      return;
    }

    io.to(roomId).emit('tile_discarded', {
      playerId: socket.id,
      tile: discarded,
      isOkey: isOkeyTile(discarded, okey)
    });

    advanceTurn(room);
  });

  /* ─── İşle (Append) ─── */
  socket.on('append_tiles', ({ roomId, tiles }: { roomId: string; tiles: TileData[] }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const okey = getOkeyInfo(room.indicator!);
    const tableMelds = Object.values(room.openedMelds).flat();
    
    // Server verification: Check if player actually HAS these tiles
    const playerHandIds = new Set(player.hand.map(t => t.id));
    const tilesToAppend = tiles.filter(t => playerHandIds.has(t.id));
    
    // Only proceed if the player has all (or some) of the sent tiles
    if (tilesToAppend.length === 0) return;

    // Sadece gerçekten işlenebilir olanları işle
    const validAppends = tilesToAppend.filter(t => canAppendToMelds(t, tableMelds, okey));
    if (validAppends.length === 0) return;

    // Elinden çıkar
    const appendIds = new Set(validAppends.map(t => t.id));
    player.hand = player.hand.filter(t => !appendIds.has(t.id));

    // Masaya işle
    validAppends.forEach(t => {
       let ownerId = "";
       let targetMeld: TileData[] | undefined;

       for (const [pId, pMelds] of Object.entries(room.openedMelds)) {
          const found = pMelds.find(m => isValidMeld([...m, t], okey) || isValidMeld([t, ...m], okey));
          if (found) {
             ownerId = pId;
             targetMeld = found;
             break;
          }
       }

       if (targetMeld) {
          if (isValidMeld([t, ...targetMeld], okey)) targetMeld.unshift(t);
          else targetMeld.push(t);

          // ÇİFT AÇANA CEZA KURALI (User Request 39)
          const targetPlayer = room.players.find(p => p.id === ownerId);
          if (targetPlayer && targetPlayer.openedType === 'doubles') {
             const mult = COLOR_MULTIPLIERS[room.indicator!.color as TileColor];
             const penalty = mult * 100; // Gapdirik Penalty
             targetPlayer.chips -= penalty;
             room.tournamentScores[targetPlayer.id] = (room.tournamentScores[targetPlayer.id] || 0) + penalty;
             
             io.to(roomId).emit('penalty_notification', {
                playerId: targetPlayer.id,
                playerName: targetPlayer.name,
                msg: 'ÇİFTTEN İŞLEDİ GELEN CEZA!',
                amount: penalty
             });
          }
       }
    });

    socket.emit('your_hand', player.hand);
    broadcastGameState(room);
  });

  /* ─── Açık Okey (El Aç) ─── */
  socket.on('declare_win', ({ roomId }: { roomId: string }) => {
    const room = getSafeRoom(roomId);
    if (!room || room.gameState !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (room.indicator && isWinningHand(player.hand, room.indicator)) {
      endGame(room, socket.id);
    } else {
      socket.emit('invalid_hand', { message: 'Elin geçersiz!' });
    }
  });

  /* ─── Oda İçi Sohbet (Sosyallik) ─── */
  socket.on('send_message', ({ roomId, message }: { roomId: string; message: string }) => {
    const room = getSafeRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(roomId).emit('chat_message', {
      senderId: player.id,
      senderName: player.name,
      message,
      timestamp: Date.now()
    });
  });

  /* ─── Hediyeleşme ─── */
  socket.on('send_gift', ({ roomId, receiverId, giftType }: { roomId: string, receiverId: string, giftType: string }) => {
    const room = getSafeRoom(roomId);
    if (!room) return;
    const sender = room.players.find(p => p.id === socket.id);
    if (!sender) return;

    io.to(roomId).emit('receive_gift', {
      senderId: sender.id,
      senderName: sender.name,
      receiverId,
      giftType,
      timestamp: Date.now()
    });
  });

  /* ─── Arkadaşlık ve Davet ─── */
  socket.on('get_friends', () => {
    // Mock friends for demonstration
    const mockFriends = [
      { id: 'f1', name: 'Canberk', status: 'online', level: 42 },
      { id: 'f2', name: 'Zeynep', status: 'playing', level: 15, roomId: 'global' },
      { id: 'f3', name: 'Mert', status: 'offline', level: 8 },
    ];
    socket.emit('friends_list', mockFriends);
  });

  socket.on('invite_friend', ({ friendId, roomId }: { friendId: string, roomId: string }) => {
     // In a real app, you'd send this to the friend's socket
     console.log(`[INVITE] Sending invite from ${socket.id} to ${friendId} for room ${roomId}`);
     
     // System message simulation
     io.to(roomId).emit('chat_message', {
       senderName: '🎁 SİSTEM',
       message: `Davetiye arkadaşınıza iletildi.`,
       timestamp: Date.now()
     });
  });

  /* ─── Bağlantı Kesildi ─── */
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const name = room.players[idx].name;
        room.players.splice(idx, 1);

        // Odayı sadece gerçek oyuncu kalmadıysa temizle
        const humanPlayers = room.players.filter(p => !p.isBot);
        if (humanPlayers.length === 0) {
          console.log(`[CLEANUP] No humans left in ${roomId}. Deleting room.`);
          room.botTimers.forEach(t => clearTimeout(t));
          rooms.delete(roomId);
        } else {
          if (room.gameState === 'playing') {
            room.turnIndex = room.turnIndex % room.players.length;
          }
          io.to(roomId).emit('player_left', { name, roomId });
          broadcastGameState(room);
        }
      }
    });
    console.log(`[-] Ayrıldı: ${socket.id}`);
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎮 Gapdirik Sunucu → http://localhost:${PORT}\n`);
});
