import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TileData, GameState,
  getOkeyInfo, getColorMultiplier,
  findReadyMelds, findDoubles, TileColor
} from './types';
import { Rack } from './components/Rack';
import { PlayerSeat } from './components/PlayerSeat';
import { TableCenter } from './components/TableCenter';
import { ScoreBoard } from './components/ScoreBoard';
import { Login } from './components/Login';
import { Lobby } from './components/Lobby';
import { useSocket } from './context/SocketContext';
import { soundManager } from './utils/soundManager';
import { Store } from './components/Store';
import { CheckCircle, ArrowRight, Loader2, User } from 'lucide-react';

const APP_VERSION = 'v3.2.0 "HÜKÜMDAR PRIME"';

// --- ALT BİLEŞENLER (HOISTED) ---
const PaymentSuccessScreen = ({ onLobbyReturn, onUpdateUser }: { onLobbyReturn: () => void, onUpdateUser: (chips: number) => void }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [newBalance, setNewBalance] = useState<number>(0);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/confirm-session/${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setNewBalance(data.chips);
          onUpdateUser(data.chips);
          soundManager.play('win');
          setTimeout(() => {
            window.history.replaceState({}, document.title, "/");
            onLobbyReturn();
          }, 3500);
        } else setStatus('error');
      } catch (e) { setStatus('error'); }
    };
    fetchStatus();
  }, [onLobbyReturn, onUpdateUser]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, #022b22 0%, #01140f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000 }}>
       <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', color: '#fff', padding: 40, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1.5px solid rgba(255,215,0,0.2)', width: 450 }}>
          {status === 'loading' && (
            <>
              <Loader2 className="animate-spin" size={64} style={{ color: '#ffd700', marginBottom: 20 }} />
              <h2 style={{ fontSize: 24, fontWeight: 900 }}>Ödeme Doğrulanıyor...</h2>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={84} style={{ color: '#4cd137', marginBottom: 20 }} />
              <h1 style={{ fontSize: 32, fontWeight: 950, color: '#ffd700', marginBottom: 10 }}>TEBRİKLER!</h1>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px 25px', borderRadius: 20, fontSize: 20, fontWeight: 900, color: '#ffd700' }}>
                YENİ BAKİYE: {newBalance.toLocaleString()} ÇİP
              </div>
            </>
          )}
        </motion.div>
    </div>
  );
};

export default function App() {
  const { socket, playerName, setPlayerName } = useSocket();
  
  // 1. TÜM KANCALAR (EN TEPEDE - FIXED ORDER)
  const [screen, setScreen] = useState<'login' | 'lobby' | 'game' | 'result' | 'payment-success'>('login');
  const [user, setUser] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [hand, setHand] = useState<(TileData | null)[]>(Array(30).fill(null));
  const [hasDrawn, setHasDrawn] = useState(false);
  const [openedMelds, setOpenedMelds] = useState<Record<string, TileData[][]>>({});
  const [allDiscards, setAllDiscards] = useState<Record<string, TileData[]>>({});
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'waiting', currentTurn: '', indicator: { id: 'ind', number: 1, color: 'black' as TileColor },
    drawPileCount: 106, discardPile: [], players: [], roundBet: 500, roundNumber: 1,
    gameColorMultiplier: 3, dealerId: '', highestSeriesValue: 51, highestDoublesValue: 52, tournamentScores: {}
  });
  const [chatMessages, setChatMessages] = useState<{senderName: string; message: string; timestamp: number}[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [theme] = useState<'default' | 'casino' | 'night' | 'gold'>('default');
  const [tileSkin] = useState<'default' | 'gold' | 'neon' | 'marble'>('default');
  const [tookDiscard] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [activeGifts] = useState<any[]>([]);
  const [isScoreOpen, setIsScoreOpen] = useState(false);

  // 2. SOCKET DINLEYICILERI
  useEffect(() => {
    if (!socket) return;
    const handlers = {
      room_update: (data: any) => setGameState(prev => ({ ...prev, players: data.players })),
      your_hand: (serverHand: TileData[]) => {
        const r: (TileData | null)[] = Array(30).fill(null);
        serverHand.forEach((t, i) => { r[i] = t; });
        setHand(r);
      },
      game_started: (data: any) => {
        setGameState(prev => ({ ...prev, ...data, gamePhase: 'playing' }));
        setHasDrawn(data.dealerId === socket?.id);
        setScreen('game');
      },
      game_update: (data: any) => {
        setGameState(prev => ({ ...prev, ...data }));
        if (data.openedMelds) setOpenedMelds(data.openedMelds);
        if (data.allDiscards) setAllDiscards(data.allDiscards);
      },
      tile_drawn: ({ tile }: { tile: TileData }) => {
        setHand(prev => { const n = [...prev]; const i = n.findIndex(t => t === null); if (i!==-1) n[i]=tile; return n; });
        setHasDrawn(true); soundManager.play('draw');
      },
      chat_message: (msg: any) => setChatMessages(prev => [...prev, msg].slice(-50)),
      game_over: (data: any) => { setGameOverData(data); soundManager.play('winner'); }
    };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => { Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn)); };
  }, [socket, playerName]);

  const onLogin = useCallback((d: any) => { setPlayerName(d.username); setUser(d); setScreen('lobby'); localStorage.setItem('user', JSON.stringify(d)); }, [setPlayerName]);
  const onLogout = useCallback(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setScreen('login'); }, []);
  const onJoinRoom = useCallback((r: string) => { setRoomId(r); setScreen('game'); socket?.emit('join_room', { roomId: r, playerName }); }, [socket, playerName]);
  const handleWatchAd = () => { setIsAdLoading(true); setTimeout(() => { setIsAdLoading(false); setUser((prev: any) => ({ ...prev, chips: prev.chips + 5000 })); alert('5.000 Çip kazandınız!'); }, 3000); };
  
  const hS = useMemo(() => findReadyMelds(hand, getOkeyInfo(gameState.indicator)), [hand, gameState.indicator]);
  const dblS = useMemo(() => findDoubles(hand.filter(Boolean) as TileData[], getOkeyInfo(gameState.indicator)), [hand, gameState.indicator]);

  const getSeat = useCallback((posStr: 'bottom' | 'right' | 'top' | 'left') => {
    const myIdx = gameState.players.findIndex(p => p.id === socket?.id);
    const targetIdx = (myIdx + (posStr === 'bottom' ? 0 : posStr === 'right' ? 1 : posStr === 'top' ? 2 : 3)) % Math.max(1, gameState.players.length);
    const p = gameState.players[targetIdx];
    if (!p) return null;
    const seatLastMsg = chatMessages.find(m => m.senderName === p.name && (Date.now() - m.timestamp < 5000))?.message;
    return (
      <PlayerSeat 
        key={p.id} player={p} position={posStr} isCurrentTurn={gameState.currentTurn === p.id} 
        playerDiscards={allDiscards[p.id] || []} 
        activeGifts={activeGifts.filter(g => g.receiverId === p.id)} 
        onSendGift={(r, g) => socket?.emit('send_gift', { roomId, receiverId: r, giftType: g })} 
        lastMessage={seatLastMsg}
      />
    );
  }, [gameState.players, socket?.id, chatMessages, allDiscards, activeGifts, roomId, socket]);

  // 5. TEK DÖNÜŞ (GÖRSELDEKİ SABİT YERLEŞİM)
  return (
    <div className={`theme-${theme} game-layout`}>
      
      <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
            <Login onLogin={onLogin} />
          </motion.div>
        )}

        {screen === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 90000, background: 'var(--bg-main)' }}>
            <Lobby playerName={playerName} userChips={user?.chips || 0} user={user} isGuest={user?.isGuest || false} onJoinRoom={onJoinRoom} onLogout={onLogout} />
            {isStoreOpen && <Store onClose={() => setIsStoreOpen(false)} onPurchase={()=>{}} onWatchAd={handleWatchAd} isAdLoading={isAdLoading} />}
          </motion.div>
        )}

        {screen === 'payment-success' && (
          <PaymentSuccessScreen key="pay" onLobbyReturn={() => setScreen('lobby')} onUpdateUser={(c) => setUser((p:any)=>({...p, chips:c}))} />
        )}
      </AnimatePresence>

      {(screen === 'game' || screen === 'result') && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* 1. ÜST PANEL (TOP BAR - ROYAL STYLE) */}
          <header style={{ 
            height: '3.8rem', background: 'rgba(0,0,0,0.85)', 
            borderBottom: '2px solid var(--accent-gold)', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.5rem', zIndex: 2000, boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
               <div style={{ width: '2.8rem', height: '2.8rem', borderRadius: '0.8rem', background: '#2c3e50', border: '1px solid var(--accent-gold)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={26} color="var(--accent-gold)" />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 950, color: '#fff', letterSpacing: 0.5 }}>{playerName?.toUpperCase()}</span>
                  <div style={{ background: '#000', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(255,204,0,0.4)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     <span style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 950 }}>{user?.chips.toLocaleString() || '0'} $</span>
                     <div style={{ width: 14, height: 14, background: 'var(--accent-gold)', borderRadius: '50%', color: '#000', fontSize: 9, textAlign: 'center', lineHeight: '14px', fontWeight: 1000, cursor: 'pointer' }}>+</div>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
               <button onClick={() => setIsScoreOpen(!isScoreOpen)} className="glass-panel" style={{ padding: '0.4rem 0.8rem', border: '1px solid var(--accent-gold)', background: isScoreOpen ? 'var(--accent-gold)' : 'rgba(255,204,0,0.1)', color: isScoreOpen ? '#000' : 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 950, borderRadius: '0.5rem' }}>YAZBOZ</button>
               <button onClick={() => setIsStoreOpen(true)} className="glass-panel" style={{ padding: '0.4rem 0.8rem', border: '1px solid var(--accent-gold)', background: 'rgba(255,204,0,0.1)', color: 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 950, borderRadius: '0.5rem' }}>ÇİPSATINAL</button>
               <button className="glass-panel" style={{ width: '2.2rem', height: '2.2rem', border: 'none', background: 'transparent', fontSize: '1.2rem' }}>⚙️</button>
               <button className="glass-panel" style={{ width: '2.2rem', height: '2.2rem', border: 'none', background: 'transparent', fontSize: '1.2rem' }}>✉️</button>
               <button onClick={() => setScreen('lobby')} className="btn-premium" style={{ height: '2.4rem', padding: '0 1.2rem', fontSize: '0.7rem', background: 'rgba(255,0,0,0.15)', color: '#ff4747', border: '1.2px solid rgba(255,0,0,0.3)' }}>KALK</button>
            </div>
          </header>

          <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* LOBY / SALONLAR BUTONU (SOL YAN) */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 1000 }}>
               <button className="glass-panel" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.65rem', fontWeight: 950, padding: '0.6rem 1.2rem', borderRadius: '0.8rem' }}>
                  ⋮≡ SALONLAR
               </button>
            </div>

            {/* ARKADAŞLAR BUTONU (SAĞ YAN) */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 1000 }}>
               <button className="glass-panel" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.65rem', fontWeight: 950, padding: '0.6rem 1.2rem', borderRadius: '0.8rem' }}>
                  👥 ARKADAŞLAR
               </button>
            </div>

            {/* MASADAKİ DİĞER OYUNCULAR (ELITE DIAMOND POSITIONS) */}
            <div style={{ position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
               {getSeat('top')}
            </div>
            <div style={{ position: 'absolute', left: '2rem', top: '48%', transform: 'translateY(-50%)', zIndex: 1000 }}>
               {getSeat('left')}
            </div>
            <div style={{ position: 'absolute', right: '2rem', top: '48%', transform: 'translateY(-50%)', zIndex: 1000 }}>
               {getSeat('right')}
            </div>

            {/* OYUN MERKEZİ (MERKEZİ OYUN ALANI) */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10rem' }}>
               <TableCenter 
                 indicator={gameState.indicator} drawPileCount={gameState.drawPileCount} discardPile={gameState.discardPile} 
                 isMyTurn={gameState.currentTurn === socket?.id} hasDrawn={hasDrawn} tileSkin={tileSkin}
                 onDraw={() => socket?.emit('draw_tile', { roomId })} onTakeDiscard={() => socket?.emit('take_discard', { roomId })} onDiscard={()=>{}}
               />
            </div>

            {/* YAZBOZ BOARD (SLIDE-OUT) */}
            <AnimatePresence>
               {isScoreOpen && (
                 <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="glass-panel"
                   style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '22rem', padding: '2rem', zIndex: 5000, borderLeft: '3px solid var(--accent-gold)', borderRadius: '2rem 0 0 2rem', background: 'rgba(5, 15, 20, 0.98)' }}
                 >
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                       <ScoreBoard indicator={gameState.indicator} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} players={gameState.players} roundNumber={gameState.roundNumber} />
                    </div>
                    <button onClick={() => setIsScoreOpen(false)} style={{ position: 'absolute', top: '1rem', left: '-1rem', width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--accent-gold)', border: 'none', fontWeight: 1000, cursor: 'pointer', boxShadow: '0 0.2rem 0.5rem rgba(0,0,0,0.5)' }}>×</button>
                 </motion.div>
               )}
            </AnimatePresence>
          </main>

          {/* ALT PANEL (ISTAKA + DURUM) */}
          <footer style={{ 
            width: '100%', paddingBottom: 'var(--safe-bottom)', zIndex: 1500, position: 'relative'
          }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* DURUM BİLGİSİ (BARAJ/ELİM) - SOL ALTTA ISTAKA ÜSTÜNDE */}
                <div style={{ alignSelf: 'flex-start', marginLeft: '2rem', marginBottom: '0.5rem', display: 'flex', gap: '0.8rem' }}>
                   <div className="glass-panel" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', fontWeight: 950, color: 'var(--accent-gold)', background: 'rgba(0,0,0,0.5)' }}>
                      BARAJ: {gameState.highestSeriesValue}
                   </div>
                   <div className="glass-panel" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', fontWeight: 950, color: '#fff', background: 'rgba(0,0,0,0.5)' }}>
                      ELİM: {hS.total}
                   </div>
                </div>

                {/* ALT OYUNCU (SİZ) */}
                <div style={{ marginBottom: '-1.5rem', zIndex: 1600 }}>{getSeat('bottom')}</div>
                
                {/* ISTAKA */}
                <Rack hand={hand} selectedId={selectedId} onSelectTile={setSelectedId} onDoubleClickTile={(tId) => { if (gameState.currentTurn === socket?.id && hasDrawn) { socket?.emit('discard_tile', { roomId, tileId: tId }); setHand(prev => prev.map(t => t?.id === tId ? null : t)); setHasDrawn(false); } }} onMoveToSlot={(tId, targetIdx) => setHand(prev => { const s = prev.findIndex(t => t?.id === tId); if (s===-1) return prev; const n = [...prev]; const m = n[s]! ; n[s] = n[targetIdx]; n[targetIdx] = m; return n; })} seriesPoints={hS.total} doublesPoints={dblS.total} handCount={hand.filter(Boolean).length} appendableTiles={[]} minMeldToOpen={gameState.highestSeriesValue} colorMult={getColorMultiplier(gameState.indicator)} canOpenSeries={gameState.currentTurn === socket?.id && hasDrawn && hS.total >= gameState.highestSeriesValue} canOpenDoubles={gameState.currentTurn === socket?.id && hasDrawn && (dblS.pairs.length >= 5 || dblS.total >= gameState.highestDoublesValue)} canPutBack={tookDiscard} onPutBack={()=>{}} onOpenSeries={() => socket?.emit('open_series', { roomId, melds: hS.melds })} onOpenDoubles={() => socket?.emit('open_doubles', { roomId, pairs: dblS.pairs })} onAppends={()=>{}} onSortDoubles={()=>{}} onSortSeries={()=>{}} tileSkin={tileSkin} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} tournamentScores={gameState.tournamentScores} />
             </div>
          </footer>
        </div>
      )}

      {/* SONUÇ MODALI */}
      <AnimatePresence>
        {gameOverData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(15px)' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 950, marginBottom: '2rem' }}>TUR SONA ERDİ</h2>
            <div className="glass-panel" style={{ padding: '2rem 1.5rem', width: '100%', maxWidth: '25rem' }}>
              {gameOverData?.roundResults?.map((res: any) => (
                <div key={res.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#fff', fontWeight: 800 }}>{res.playerName}</span>
                  <span style={{ color: res.score > 0 ? '#ff4444' : '#4cd137', fontWeight: 950 }}>{res.score > 0 ? `+${res.score}` : res.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setGameOverData(null); socket?.emit('start_game', { roomId }); }} className="btn-premium" style={{ marginTop: '2.5rem', width: '100%', maxWidth: '20rem' }}>SIRADAKİ EL <ArrowRight size={20} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', left: '1rem', bottom: '0.2rem', zIndex: 100000, pointerEvents: 'none', opacity: 0.2 }}>
         <span style={{ fontSize: '0.5rem', fontWeight: 950, color: '#fff' }}>{APP_VERSION}</span>
      </div>
    </div>
  );
}
