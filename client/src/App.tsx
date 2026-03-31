import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TileData, GameState,
  getOkeyInfo, getColorMultiplier,
  findReadyMelds, findDoubles, canAppendToMelds, findMelds
} from './types';
import { Rack } from './components/Rack';
import { PlayerSeat } from './components/PlayerSeat';
import { TableCenter } from './components/TableCenter';
import { Tile } from './components/Tile';
import { ScoreBoard } from './components/ScoreBoard';
import { Login } from './components/Login';
import { Lobby } from './components/Lobby';
import { useSocket } from './context/SocketContext';
import { soundManager } from './utils/soundManager';
import { Store } from './components/Store';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

// Optimization: Pre-checking if we are on Capacitor
const isCapacitor = (window as any).Capacitor !== undefined;

/* ═══════════════════════════════════════════════════════════════
   GAPDİRİK MASTER — ATOMIC ENGINE (ONLINE EDITION)
══════════════════════════════════════════════════════════════════ */

export default function App() {
  const { socket, isConnected, setPlayerName, playerName } = useSocket();
  const [screen, setScreen] = useState<'login' | 'lobby' | 'game' | 'result'>('login');
  const [roomId, setRoomId] = useState<string>('');
  
  const [hand, setHand] = useState<(TileData | null)[]>(Array(30).fill(null));
  const [hasDrawn, setHasDrawn] = useState(false);
  const [openedMelds, setOpenedMelds] = useState<Record<string, TileData[][]>>({});
  const [allDiscards, setAllDiscards] = useState<Record<string, TileData[]>>({});
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'waiting',
    currentTurn: '',
    indicator: { id: 'ind', number: 1, color: 'black' },
    drawPileCount: 106,
    discardPile: [],
    players: [],
    roundBet: 500,
    roundNumber: 1,
    gameColorMultiplier: 3,
    dealerId: '',
    highestSeriesValue: 51,
    highestDoublesValue: 52,
    tournamentScores: {}
  });

  const okS = useMemo(() => getOkeyInfo(gameState.indicator), [gameState.indicator]);
  const colorMult = useMemo(() => getColorMultiplier(gameState.indicator), [gameState.indicator]);

  const [user, setUser] = useState<{name: string, chips: number} | null>(null);
  const [activeGifts, setActiveGifts] = useState<{id: string, type: string, receiverId: string, timestamp: number}[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [theme, setTheme] = useState<'default' | 'casino' | 'night' | 'gold'>('default');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [tileSkin, setTileSkin] = useState<'default' | 'gold' | 'neon' | 'marble'>('default');
  const [tookDiscard, setTookDiscard] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);

  // 0. Native Platform Setup (Full Screen)
  useEffect(() => {
    if (isCapacitor) {
      StatusBar.hide().catch(e => console.warn('StatusBar hide failed:', e));
      StatusBar.setOverlaysWebView({ overlay: true }).catch(e => console.warn('Overlay failed:', e));
    }
  }, []);

  // 1. Durum Senkronizasyonu (Socket Listeners)
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (data: any) => {
      console.log('Room updated:', data.players);
      setGameState(prev => ({ ...prev, players: data.players }));
    };

    const handleYourHand = (serverHand: TileData[]) => {
      console.log('Received hand:', serverHand.length);
      const r: (TileData | null)[] = Array(30).fill(null);
      serverHand.forEach((t, i) => { r[i] = t; });
      setHand(r);
    };

    const handleGameStarted = (data: any) => {
      console.log('Game started! Dealer:', data.dealerName);
      const amDealer = data.dealerId === socket?.id;
      setGameState(prev => ({ 
        ...prev, 
        gamePhase: 'playing', 
        indicator: data.indicator, 
        currentTurn: data.currentTurn,
        roundBet: data.roundBet,
        dealerId: data.dealerId,
        roundNumber: data.roundNumber,
      }));
      soundManager.play('win'); // Game started chime
      // Dealer 15 taşlı başlıyor: taş çekmeden atabilmeli
      if (amDealer) {
        setHasDrawn(true);
        console.log('Ben dealeryım! 15 taşla başlıyorum, direk atabilirim.');
      } else {
        setHasDrawn(false);
      }
      setScreen('game');
    };

    const handleGameUpdate = (data: any) => {
      setGameState(prev => ({ ...prev, ...data }));
      if (data.openedMelds) setOpenedMelds(data.openedMelds);
      if (data.allDiscards) setAllDiscards(data.allDiscards);
      
      if (data.currentTurn !== gameState.currentTurn) {
        if (data.currentTurn === socket?.id) {
          soundManager.play('turn');
        }
      }
    };

    const handleTileDrawn = ({ tile }: { tile: TileData }) => {
      console.log('Tile drawn:', tile);
      setHand(prev => {
        const newHand = [...prev];
        const emptyIdx = newHand.findIndex(t => t === null);
        if (emptyIdx !== -1) {
          newHand[emptyIdx] = tile;
        } else {
          newHand.push(tile); // Should not happen in 101 Okey usually
        }
        return newHand;
      });
      setHasDrawn(true);
      soundManager.play('draw');
    };

    const handlePenalty = (data: { playerName: string; msg: string; amount: number }) => {
      console.warn(`[PENALTY] ${data.playerName}: ${data.msg} (-${data.amount}₺)`);
      if (data.playerName === playerName) {
        soundManager.play('penalty');
        alert(`CEZA! ${data.msg} (-${data.amount}₺)`);
      }
    };

    const handleError = (msg: string) => {
      console.error('[SERVER ERROR]', msg);
      soundManager.play('error');
      alert(`HATA: ${msg}`);
    };

    const handleChatMessage = (msg: any) => {
      setChatMessages(prev => [...prev, msg].slice(-50));
      soundManager.play('chat');
    };

    const handleReceiveGift = (data: { senderName: string, receiverId: string, giftType: string, timestamp: number }) => {
      soundManager.play('gift');
      const giftId = `gift-${Date.now()}-${Math.random()}`;
      setActiveGifts(prev => [...prev, { id: giftId, type: data.giftType, receiverId: data.receiverId, timestamp: data.timestamp }]);
      
      // Remove gift after animation
      setTimeout(() => {
        setActiveGifts(prev => prev.filter(g => g.id !== giftId));
      }, 4000);

      setChatMessages(prev => [...prev, {
        senderName: '🎁 SİSTEM',
        message: `${data.senderName}, bir adet ${data.giftType} gönderdi!`,
        timestamp: data.timestamp
      }].slice(-50));
      // In a real app we would float an animated image on the target player seat.
    };

    const handleGameOver = (data: any) => {
      console.log('Game Over Event Received:', data);
      setGameOverData(data);
      soundManager.play('winner');
    };

    const handleTileDiscarded = (data: { playerId: string, tile: TileData, isOkey?: boolean }) => {
       if (data.playerId !== socket?.id) {
          // If it's an Okey discarded by opponent, play special sound
          if (data.isOkey) soundManager.play('okey');
          else soundManager.play('discard');
       }
    };

    socket.on('room_update', handleRoomUpdate);
    socket.on('your_hand', handleYourHand);
    socket.on('game_started', handleGameStarted);
    socket.on('game_update', handleGameUpdate);
    socket.on('tile_drawn', handleTileDrawn);
    socket.on('penalty_notification', handlePenalty);
    socket.on('error', handleError);
    socket.on('chat_message', handleChatMessage);
    socket.on('receive_gift', handleReceiveGift);
    socket.on('tile_discarded', handleTileDiscarded);
    socket.on('game_over', handleGameOver);

    return () => {
      socket.off('room_update', handleRoomUpdate);
      socket.off('your_hand', handleYourHand);
      socket.off('game_started', handleGameStarted);
      socket.off('game_update', handleGameUpdate);
      socket.off('tile_drawn', handleTileDrawn);
      socket.off('penalty_notification', handlePenalty);
      socket.off('error', handleError);
      socket.off('chat_message', handleChatMessage);
      socket.off('receive_gift', handleReceiveGift);
      socket.off('tile_discarded', handleTileDiscarded);
      socket.off('game_over', handleGameOver);
    };

  }, [socket]);

  // 2. Otomatik Yeniden Bağlanma (Auto-Rejoin)
  useEffect(() => {
    if (isConnected && socket && playerName && screen === 'game' && roomId) {
      console.log(`Auto-rejoining room ${roomId}...`);
      socket.emit('join_room', { roomId, playerName });
    }
  }, [isConnected, socket, playerName, screen, roomId]);

  const [chatMessages, setChatMessages] = useState<{senderName: string; message: string; timestamp: number}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !roomId) return;
    socket.emit('send_message', { roomId, message: chatInput.trim() });
    setChatInput('');
  }, [chatInput, socket, roomId]);

  const onLogin = useCallback((userData: any) => {
    console.log('onLogin called:', userData.username);
    setPlayerName(userData.username);
    setUser(userData);
    setScreen('lobby');
  }, [setPlayerName]);

  const onJoinRoom = useCallback((room: string) => {
    console.log('onJoinRoom called:', room);
    setRoomId(room);
    setScreen('game');
    if (socket) {
      socket.emit('join_room', { roomId: room, playerName });
    }
  }, [socket, playerName]);

  const handleStartGame = useCallback(() => {
    if (socket && roomId) {
      socket.emit('start_game', { roomId });
    }
  }, [socket, roomId]);

  const hS = useMemo(() => findReadyMelds(hand, okS), [hand, okS]);
  const dblS = useMemo(() => findDoubles(hand.filter(Boolean) as TileData[], okS), [hand, okS]);
  const handCount = useMemo(() => hand.filter(Boolean).length, [hand]);
  const tableMelds = useMemo(() => Object.values(openedMelds).flat(), [openedMelds]);
  const appendableTiles = useMemo(
    () => (hand.filter(Boolean) as TileData[]).filter(t => canAppendToMelds(t, tableMelds, okS)),
    [hand, tableMelds, okS]
  );

  // AI Advisor logic
  const handleTakeDiscard = () => {
    if (!socket || !roomId) return;
    socket.emit('take_discard', { roomId });
    setHasDrawn(true);
    setTookDiscard(true);
  };

  const handlePutBackDiscard = () => {
    if (!socket || !roomId) return;
    socket.emit('put_back_discard', { roomId });
    setHasDrawn(false);
    setTookDiscard(false);
  };
  useEffect(() => {
    if (gameState.currentTurn === socket?.id && hasDrawn) {
      const advices = [
        "Okey sende! Çifte gitmeyi düşün.",
        "Solundaki oyuncu kırmızı bekliyor olabilir.",
        "Bitmeye çok yakınsın, bu tur açabilirsin!",
        "Elin %85 oranında bitmeye hazır.",
      ];
      setAiAdvice(advices[Math.floor(Math.random() * advices.length)]);
      const timer = setTimeout(() => setAiAdvice(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, hasDrawn, socket?.id]);

  const handleDiscard = useCallback((tId: string) => {
    if (gameState.currentTurn !== socket?.id || !hasDrawn) return;
    socket?.emit('discard_tile', { roomId, tileId: tId });
    setHasDrawn(false);
    setHand(prev => prev.map(t => t?.id === tId ? null : t));
    soundManager.play('discard');
  }, [gameState.currentTurn, hasDrawn, socket, roomId]);

  const handleDraw = useCallback(() => {
    if (gameState.currentTurn !== socket?.id || hasDrawn) return;
    socket?.emit('draw_tile', { roomId });
    setHasDrawn(true);
  }, [gameState.currentTurn, hasDrawn, socket, roomId]);

  const handleRackMove = useCallback((tId: string, targetIdx: number) => {
    setHand(prev => {
      const sourceIdx = prev.findIndex(t => t?.id === tId);
      if (sourceIdx === -1 || sourceIdx === targetIdx) return prev;
      const newHand = [...prev];
      const movingTile = newHand[sourceIdx]!;
      newHand[sourceIdx] = newHand[targetIdx];
      newHand[targetIdx] = movingTile;
      return newHand;
    });
  }, []);

  const handleSortSeries = useCallback(() => {
    const nonNull = hand.filter(Boolean) as TileData[];
    const { melds } = findMelds(nonNull, okS);
    const meldIds = new Set(melds.flat().map(t => t.id));
    const others = nonNull.filter(t => !meldIds.has(t.id));
    
    const newHand: (TileData|null)[] = Array(30).fill(null);
    let idx = 0;
    
    // Perleri (Seri ve Kare) sırayla diz
    melds.forEach((meld: TileData[]) => {
      meld.forEach((tile: TileData) => {
        if (idx < 30) newHand[idx++] = tile;
      });
      idx++; // Her per arasına bir boşluk bırak
    });
    
    // Per olmayanları sonuna ekle
    others.forEach((tile: TileData) => {
      if (idx < 30) newHand[idx++] = tile;
    });
    
    setHand(newHand);
    console.log('Smart sort applied:', melds.length, 'melds found.');
  }, [hand, okS]);

  const handleSortDoubles = useCallback(() => {
    const nonNull = hand.filter(Boolean) as TileData[];
    const { pairs } = findDoubles(nonNull, okS);
    const pairedIds = new Set(pairs.flat().map(t => t.id));
    const others = nonNull.filter(t => !pairedIds.has(t.id));
    
    const newHand: (TileData|null)[] = Array(30).fill(null);
    let idx = 0;
    pairs.forEach(pair => {
      newHand[idx++] = pair[0];
      newHand[idx++] = pair[1];
      idx++; // Boşluk bırak (isteğe bağlı ama gerçekçi)
    });
    others.forEach(t => {
      newHand[idx++] = t;
    });
    setHand(newHand);
    console.log('Hand sorted by doubles');
  }, [hand, okS]);

  const handleOpenSeries = useCallback(() => {
    const isMeAlreadyOpened = gameState.players.find(p => p.id === socket?.id)?.hasOpened;
    const canbypassBaraj = isMeAlreadyOpened;

    if (gameState.currentTurn !== socket?.id || !hasDrawn) return;
    if (!canbypassBaraj && hS.total < gameState.highestSeriesValue) return;
    if (canbypassBaraj && hS.total === 0) return; // En az bir per olmalı

    const meldIds = new Set(hS.melds.flat().map(t => t.id));
    socket?.emit('open_series', { roomId, melds: hS.melds });
    setHand(prev => prev.map(t => t && meldIds.has(t.id) ? null : t));
    console.log('Opening additional series:', hS.total);
  }, [gameState.currentTurn, socket, hasDrawn, hS, roomId, gameState.highestSeriesValue, gameState.players]);

  const handleOpenDoubles = useCallback(() => {
    const isMeAlreadyOpened = gameState.players.find(p => p.id === socket?.id)?.hasOpened;
    const canbypassBaraj = isMeAlreadyOpened;

    if (gameState.currentTurn !== socket?.id || !hasDrawn) return;
    if (!canbypassBaraj && (dblS.pairs.length < 5 && dblS.total < gameState.highestDoublesValue)) return;
    if (canbypassBaraj && dblS.pairs.length === 0) return;

    const pairIds = new Set(dblS.pairs.flat().map(t => t.id));
    socket?.emit('open_doubles', { roomId, pairs: dblS.pairs });
    setHand(prev => prev.map(t => t && pairIds.has(t.id) ? null : t));
    console.log('Opening additional doubles:', dblS.pairs.length);
  }, [gameState.currentTurn, socket, hasDrawn, dblS, roomId, gameState.highestDoublesValue, gameState.players]);

  const handleAppends = useCallback(() => {
    if (gameState.currentTurn !== socket?.id || !hasDrawn || appendableTiles.length === 0) return;
    const appendIds = new Set(appendableTiles.map(t => t.id));
    socket?.emit('append_tiles', { roomId, tiles: appendableTiles });
    setHand(prev => prev.map(t => t && appendIds.has(t.id) ? null : t));
    console.log('Appending tiles:', appendableTiles.length);
  }, [gameState.currentTurn, socket, hasDrawn, appendableTiles, roomId]);



  const handleWatchAd = () => {
    setIsAdLoading(true);
    soundManager.play('gift');
    setTimeout(() => {
      setIsAdLoading(false);
      setUser(prev => prev ? { ...prev, chips: prev.chips + 5000 } : null);
      alert('Tebrikler! Reklam izlediğiniz için 5.000 Çip kazandınız.');
    }, 5000); // 5 sec mock ad
  };

  const handlePurchase = (amount: number, price: string) => {
    soundManager.play('win');
    setUser(prev => prev ? { ...prev, chips: prev.chips + amount } : null);
    alert(`${price} karşılığında ${amount.toLocaleString()} Çip satın alındı. Keyifli oyunlar!`);
    setIsStoreOpen(false);
  };

  if (screen === 'login') {
    return <Login onLogin={onLogin} />;
  }

  if (screen === 'lobby') {
    return (
      <>
        <Lobby 
          playerName={playerName} 
          userChips={user?.chips || 50000} 
          onJoinRoom={onJoinRoom} 
          onOpenStore={() => setIsStoreOpen(true)}
          onOpenRewardedAd={handleWatchAd}
        />
        <AnimatePresence>
          {isStoreOpen && (
            <Store 
              onClose={() => setIsStoreOpen(false)} 
              onPurchase={handlePurchase}
              onWatchAd={handleWatchAd}
              isAdLoading={isAdLoading}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div 
      className={`theme-${theme}`}
      style={{ position: 'fixed', inset: 0, fontFamily: '"Outfit", sans-serif', overflow: 'hidden' }}
    >
      <div className="table-cloth" />
      <div className="table-frame" />
      
      <div 
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <ScoreBoard 
          indicator={gameState.indicator} 
          highestSeriesValue={gameState.highestSeriesValue} 
          highestDoublesValue={gameState.highestDoublesValue}
          players={gameState.players} 
          roundNumber={gameState.roundNumber} 
        />

        {/* AI ADVISOR PANEL */}
        <AnimatePresence>
          {aiAdvice && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              style={{ position: 'fixed', top: 120, left: 30, zIndex: 11000 }}
              className="ai-advisor-panel"
            >
              <div style={{ fontWeight: 900, color: '#ffd700', marginBottom: 5, fontSize: 10 }}>PRO-ZEKA ANALİZİ</div>
              <div>{aiAdvice}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SKIN SELECTOR (DEV) */}
        <div style={{ position: 'fixed', bottom: 120, right: 30, zIndex: 10000, display: 'flex', gap: 5 }}>
          {['default', 'gold', 'neon', 'marble'].map(s => (
            <button key={s} onClick={() => setTileSkin(s as any)} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>{s.toUpperCase()}</button>
          ))}
        </div>

        <div style={{ position: 'fixed', bottom: 120, left: 30, zIndex: 10000, display: 'flex', gap: 5 }}>
          {['default', 'casino', 'night', 'gold'].map(t => (
            <button key={t} onClick={() => setTheme(t as any)} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>{t.toUpperCase()}</button>
          ))}
        </div>
        
        <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}>
           <StatusMonitor hand={hand} deckCount={gameState.drawPileCount} />
        </div>

        {gameState.players.map((p, idx) => {
           const myIdx = gameState.players.findIndex(pl => pl.id === socket?.id);
           const relIdx = (idx - myIdx + 4) % 4;
           const posMap: Record<number, 'bottom' | 'right' | 'top' | 'left'> = { 0: 'bottom', 1: 'right', 2: 'top', 3: 'left' };
           
           return (
             <PlayerSeat 
                key={p.id}
                player={p} 
                position={posMap[relIdx]} 
                isCurrentTurn={gameState.currentTurn === p.id} 
                playerDiscards={allDiscards[p.id] || []}
                activeGifts={activeGifts.filter(g => g.receiverId === p.id)}
                onSendGift={(receiverId, giftType) => {
                   socket?.emit('send_gift', { roomId, receiverId, giftType });
                }}
             />
           );
        })}

        <OpenedMeldsBoard openedMelds={openedMelds} />
        
        <div style={{ transform: 'scale(1.1)', position: 'fixed', top: '23%', left: '50%', translate: '-50% -50%', zIndex: 1000 }}>
          <TableCenter 
            indicator={gameState.indicator} 
            drawPileCount={gameState.drawPileCount} 
            discardPile={gameState.discardPile} 
            isMyTurn={gameState.currentTurn === socket?.id} 
            hasDrawn={hasDrawn} 
            canTakeDiscard={gameState.currentTurn === socket?.id && !hasDrawn}
            onTakeDiscard={handleTakeDiscard}
            onDraw={handleDraw}
            onDiscard={()=>{}} 
            tileSkin={tileSkin}
          />
        </div>

        <Rack 
          hand={hand} 
          selectedId={null} 
          onSelectTile={()=>{}} 
          onDoubleClickTile={handleDiscard} 
          onMoveToSlot={handleRackMove} 
          seriesPoints={hS.total} 
          doublesPoints={dblS.total} 
          handCount={handCount} 
          appendableTiles={appendableTiles} 
          minMeldToOpen={gameState.highestSeriesValue} 
          colorMult={colorMult} 
          canOpenSeries={gameState.currentTurn === socket?.id && hasDrawn && hS.total >= gameState.highestSeriesValue} 
          canOpenDoubles={gameState.currentTurn === socket?.id && hasDrawn && (dblS.pairs.length >= 5 || dblS.total >= gameState.highestDoublesValue)} 
          canPutBack={tookDiscard}
          onPutBack={handlePutBackDiscard}
          onOpenSeries={handleOpenSeries} 
          onOpenDoubles={handleOpenDoubles} 
          onAppends={handleAppends} 
          onSortDoubles={handleSortDoubles}
          onSortSeries={handleSortSeries} 
          tileSkin={tileSkin}
          highestSeriesValue={gameState.highestSeriesValue}
          highestDoublesValue={gameState.highestDoublesValue}
          tournamentScores={gameState.tournamentScores}
        />

        {!isConnected && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#ff4444', color: '#fff', padding: '5px 15px', borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
            SUNUCU BAĞLANTISI KESİLDİ
          </div>
        )}

        {gameState.gamePhase === 'waiting' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#fff', marginBottom: 20 }}>Oyuncular Bekleniyor ({gameState.players.length}/4)</h2>
                {gameState.players.length >= 1 && (
                  <button className="gold-button" onClick={handleStartGame}>OYUNU BAŞLAT</button>
                )}
             </div>
          </div>
        )}

        {gameOverData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, backdropFilter: 'blur(15px)' }}>
            <h2 style={{ color: '#ffd700', fontSize: 48, fontWeight: 950, textShadow: '0 0 30px rgba(255,215,0,0.3)' }}>TUR SONA ERDİ</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '40px 50px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.1)', width: 550, boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
               {gameOverData?.roundResults?.map((res: any) => (
                 <div key={res.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                     <div style={{ width: 10, height: 10, borderRadius: '50%', background: res.isWinner ? '#ffd700' : '#4cd137' }} />
                     <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{res.playerName}</span>
                   </div>
                   <span style={{ color: res.score > 0 ? '#ff4444' : '#4cd137', fontWeight: 950, fontSize: 24 }}>{res.score > 0 ? `+${res.score}` : res.score}</span>
                 </div>
               ))}
            </div>

            <div style={{ display: 'flex', gap: 30, marginTop: 20 }}>
              <button 
                onClick={() => { setGameOverData(null); socket?.emit('start_game', { roomId }); }}
                style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)', color: '#000', border: 'none', padding: '20px 60px', borderRadius: 45, fontWeight: 950, fontSize: 22, cursor: 'pointer', boxShadow: '0 10px 40px rgba(255,215,0,0.4)', textTransform: 'uppercase' }}
              >
                SIRADAKİ EL (TUR {gameState.roundNumber})
              </button>
            </div>
          </div>
        )}

        <ChatBox 
          open={chatOpen} 
          setOpen={setChatOpen} 
          messages={chatMessages} 
          input={chatInput} 
          setInput={setChatInput} 
          onSend={handleSendMessage} 
        />
      </div>
    </div>
  );
}

const ChatBox = ({ open, setOpen, messages, input, setInput, onSend }: any) => {
  const EMOJIS = ['😂', '😎', '😡', '🤬', '👏', '🍀'];
  const QUICK_PHRASES = ['Bol şans!', 'Hadi oyna!', 'Tebrikler!', 'Okey bende', 'İyi oyunlar'];

  return (
    <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: '"Outfit", sans-serif' }}>
      {open && (
        <div style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 340, height: 450, marginBottom: 15, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, color: '#ffd700', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span>Masa Sohbeti</span>
            <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 500 }}>Etkileşime Geç</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 12, fontSize: 13, color: '#fff', alignSelf: m.senderName.startsWith('🎁') ? 'center' : 'flex-start', border: m.senderName.startsWith('🎁') ? '1px dashed #ffd700' : 'none' }}>
                <span style={{ color: m.senderName.startsWith('🎁') ? '#ffd700' : '#4cd137', fontWeight: 800, marginRight: 5 }}>{m.senderName}:</span>
                <span style={{ opacity: 0.9 }}>{m.message}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 15px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 5, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {EMOJIS.map(em => (
               <button key={em} onClick={() => setInput(input + em)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 16 }}>{em}</button>
            ))}
          </div>
          <div style={{ padding: '0 15px 10px 15px', background: 'rgba(0,0,0,0.4)', display: 'flex', gap: 5, overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
            {QUICK_PHRASES.map(ph => (
               <button key={ph} onClick={(e) => { setInput(ph); setTimeout(() => onSend(e), 50); }} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: '#ffd700', fontWeight: 700 }}>{ph}</button>
            ))}
          </div>

          <form onSubmit={onSend} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Mesaj yaz..." 
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '15px', color: '#fff', outline: 'none', fontSize: 13 }}
            />
            <button type="submit" style={{ background: '#ffd700', border: 'none', color: '#000', padding: '0 20px', fontWeight: 900, cursor: 'pointer' }}>GÖNDER</button>
          </form>
        </div>
      )}
      <button 
        onClick={() => setOpen(!open)}
        style={{ background: open ? '#ff4444' : '#ffd700', color: open ? '#fff' : '#000', border: 'none', borderRadius: '50%', width: 50, height: 50, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', transition: '0.3s' }}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
};

const StatusMonitor = ({ hand, deckCount }: { hand: (TileData|null)[], deckCount: number }) => {
  const currentHand = hand.filter(Boolean) as TileData[];
  return (
    <div style={{ background: 'rgba(0,0,0,0.85)', padding: '8px 15px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, display: 'flex', gap: 20 }}>
      <div>TAŞ: <span style={{ color: '#4cd137' }}>{currentHand.length}</span></div>
      <div>DESTE: <span style={{ color: '#00a8ff' }}>{deckCount}</span></div>
    </div>
  );
};

const OpenedMeldsBoard = ({ openedMelds }: { openedMelds: Record<string, TileData[][]> }) => {
  return (
    <div style={{ position: 'fixed', top: '55%', left: '50%', translate: '-50% -50%', width: '85vw', maxWidth: 900, height: '35%', background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '15px', display: 'flex', flexDirection: 'column', gap: 15, overflowY: 'auto' }}>
      {Object.entries(openedMelds).map(([pId, melds]) => {
        if (melds.length === 0) return null;
        return (
          <div key={pId} style={{ display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 10 }}>
            <div style={{ width: 60, fontSize: 10, fontWeight: 900, color: '#888' }}>{pId.substring(0,6)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{melds.map((m, mi) => (<div key={mi} style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.4)', padding: '4px 6px', borderRadius: 8 }}>{m.map(t => (<Tile key={t.id} {...t} small />))}</div>))}</div>
          </div>
        );
      })}
    </div>
  );
};
