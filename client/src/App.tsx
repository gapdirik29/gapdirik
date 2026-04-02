import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TileData, GameState,
  getOkeyInfo, getColorMultiplier,
  findReadyMelds, findDoubles, TileColor
} from './types';
import { Rack } from './components/Rack';
import { PlayerSeat } from './components/PlayerSeat';
import { GameEngine } from './components/3d/GameEngine';
import { ScoreBoard } from './components/ScoreBoard';
import { Login } from './components/Login';
import { Lobby } from './components/Lobby';
import { useSocket } from './context/SocketContext';
import { soundManager } from './utils/soundManager';
import { Store } from './components/Store';
import { CheckCircle, ArrowRight, Loader2, User, LayoutDashboard, Settings, MessageSquare } from 'lucide-react';

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
  const [tookDiscard] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [activeGifts] = useState<any[]>([]);
  const [isScoreOpen, setIsScoreOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handlers = {
      room_update: (data: any) => setGameState((prev: GameState) => ({ ...prev, players: data.players })),
      your_hand: (serverHand: TileData[]) => {
        const r: (TileData | null)[] = Array(30).fill(null);
        serverHand.forEach((t, i) => { r[i] = t; });
        setHand(r);
      },
      game_started: (data: any) => {
        setGameState((prev: GameState) => ({ ...prev, ...data, gamePhase: 'playing' }));
        setHasDrawn(data.dealerId === socket?.id);
        setScreen('game');
      },
      game_update: (data: any) => {
        setGameState((prev: GameState) => ({ ...prev, ...data }));
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

  return (
    <div className="game-layout">
      
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
          
          {/* 1. ROYAL HEADER HUD */}
          <header style={{ 
            height: '3.8rem', background: 'rgba(5, 12, 10, 0.85)', 
            borderBottom: '2.5rem solid transparent', /* Shadow yer açma */
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.5rem', zIndex: 2500, position: 'fixed', top: 0, left: 0, right: 0,
            backdropFilter: 'blur(20px)'
          }}>
            {/* Header Content Overlay (Avoid background border flex issue) */}
            <div style={{ width: '100%', height: '3.8rem', position: 'absolute', top: 0, left: 0, borderBottom: '2px solid var(--accent-gold)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', zIndex: 3 }}>
               <div className="glass-panel" style={{ width: '3rem', height: '3rem', borderRadius: '1rem', background: '#0a1410', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: 'var(--accent-gold)' }}>
                  <User size={30} color="var(--accent-gold)" />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 1000, color: '#fff', letterSpacing: 1 }}>{playerName?.toUpperCase()}</span>
                  <div className="glass-panel" style={{ padding: '0.2rem 0.6rem', transform: 'scale(0.9) translateX(-5%)', background: '#000', borderColor: 'rgba(255,204,0,0.3)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                     <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 1000 }}>{user?.chips.toLocaleString() || '0'} $</span>
                     <div style={{ width: 14, height: 14, background: 'var(--accent-gold)', borderRadius: '50%', color: '#000', fontSize: 9, textAlign: 'center', lineHeight: '14px', fontWeight: 1000, cursor: 'pointer' }}>+</div>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', zIndex: 3 }}>
               <button onClick={() => setIsScoreOpen(!isScoreOpen)} className="glass-panel" style={{ padding: '0.5rem 1rem', background: isScoreOpen ? 'var(--accent-gold)' : 'rgba(255,215,0,0.1)', color: isScoreOpen ? '#000' : 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 1000 }}>YAZBOZ</button>
               <button onClick={() => setIsStoreOpen(true)} className="btn-premium" style={{ height: '2.5rem', padding: '0 1.2rem' }}>MAĞAZA</button>
               <button className="glass-panel" style={{ width: '2.5rem', height: '2.5rem', border: 'none', background: 'transparent' }}><Settings size={22} color="#fff" /></button>
               <button onClick={() => setScreen('lobby')} className="glass-panel" style={{ padding: '0.5rem 1rem', background: 'rgba(255,0,0,0.1)', borderColor: 'rgba(255,0,0,0.3)', color: '#ff4747', fontSize: '0.7rem', fontWeight: 1000 }}>KALK</button>
            </div>
          </header>

          <main style={{ flex: 1, position: 'relative', marginTop: '3.8rem' }}>
            {/* LOBY / SALONLAR BUTTONS (FLOATING GLASS) */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 2000, display: 'flex', flexLines: 'column', gap: '1rem' }}>
               <button className="glass-panel" style={{ padding: '0.8rem 1.4rem', color: '#fff', fontSize: '0.7rem', fontWeight: 1000, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <LayoutDashboard size={18} /> SALONLAR
               </button>
            </div>

            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2000 }}>
               <button className="glass-panel" style={{ padding: '0.8rem 1.4rem', color: '#fff', fontSize: '0.7rem', fontWeight: 1000, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <MessageSquare size={18} /> SOHBET
               </button>
            </div>

            {/* SEATS (ELITE DIAMOND POSITIONS) */}
            <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}>{getSeat('top')}</div>
            <div style={{ position: 'absolute', left: '3rem', top: '40%', transform: 'translateY(-50%)', zIndex: 2000 }}>{getSeat('left')}</div>
            <div style={{ position: 'absolute', right: '3rem', top: '40%', transform: 'translateY(-50%)', zIndex: 2000 }}>{getSeat('right')}</div>

            {/* 3D ENGINE (THE MASTERPIECE) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
               <GameEngine 
                 hand={hand.filter(Boolean) as TileData[]}
                 indicator={gameState.indicator}
                 players={gameState.players}
                 isMyTurn={gameState.currentTurn === socket?.id}
                 onDraw={() => socket?.emit('draw_tile', { roomId })}
                 onDiscard={(tId) => {
                    if (gameState.currentTurn === socket?.id && hasDrawn) {
                       socket?.emit('discard_tile', { roomId, tileId: tId });
                       setHand(prev => prev.map(t => t?.id === tId ? null : t));
                       setHasDrawn(false);
                    }
                 }}
               />
            </div>

            {/* SLIDE-OUT SCOREBOARD */}
            <AnimatePresence>
               {isScoreOpen && (
                 <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   style={{ position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 5000 }}
                 >
                    <ScoreBoard indicator={gameState.indicator} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} players={gameState.players} roundNumber={gameState.roundNumber} />
                 </motion.div>
               )}
            </AnimatePresence>
          </main>

          {/* RACK FOOTER (AUTO OVERLAP) */}
          <footer style={{ position: 'relative', zIndex: 3000 }}>
             <Rack hand={hand} selectedId={selectedId} onSelectTile={setSelectedId} onDoubleClickTile={(tId) => { if (gameState.currentTurn === socket?.id && hasDrawn) { socket?.emit('discard_tile', { roomId, tileId: tId }); setHand(prev => prev.map(t => t?.id === tId ? null : t)); setHasDrawn(false); } }} onMoveToSlot={(tId, targetIdx) => setHand(prev => { const s = prev.findIndex(t => t?.id === tId); if (s===-1) return prev; const n = [...prev]; const m = n[s]! ; n[s] = n[targetIdx]; n[targetIdx] = m; return n; })} seriesPoints={hS.total} doublesPoints={dblS.total} handCount={hand.filter(Boolean).length} appendableTiles={[]} minMeldToOpen={gameState.highestSeriesValue} colorMult={getColorMultiplier(gameState.indicator)} canOpenSeries={gameState.currentTurn === socket?.id && hasDrawn && hS.total >= gameState.highestSeriesValue} canOpenDoubles={gameState.currentTurn === socket?.id && hasDrawn && (dblS.pairs.length >= 5 || dblS.total >= gameState.highestDoublesValue)} canPutBack={tookDiscard} onPutBack={()=>{}} onOpenSeries={() => socket?.emit('open_series', { roomId, melds: hS.melds })} onOpenDoubles={() => socket?.emit('open_doubles', { roomId, pairs: dblS.pairs })} onAppends={()=>{}} onSortDoubles={()=>{}} onSortSeries={()=>{}} tileSkin={null} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} tournamentScores={gameState.tournamentScores} />
          </footer>
        </div>
      )}

      {/* GAME OVER MODAL (DARK ROYAL BLUR) */}
      <AnimatePresence>
        {gameOverData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '28rem', textAlign: 'center' }}>
               <h2 style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 1000, marginBottom: '2rem', letterSpacing: 2 }}>TUR SONA ERDİ</h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                  {gameOverData?.roundResults?.map((res: any) => (
                    <div key={res.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#fff', fontWeight: 800 }}>{res.playerName}</span>
                      <span style={{ color: res.score > 0 ? '#ff4747' : '#4cd137', fontWeight: 1000 }}>{res.score > 0 ? `+${res.score}` : res.score}</span>
                    </div>
                  ))}
               </div>
               <button onClick={() => { setGameOverData(null); socket?.emit('start_game', { roomId }); }} className="btn-premium" style={{ width: '100%' }}>YENİ EL BAŞLAT <ArrowRight size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', left: '1rem', bottom: '0.2rem', zIndex: 100000, pointerEvents: 'none', opacity: 0.3 }}>
         <span style={{ fontSize: '0.55rem', fontWeight: 1000, color: '#fff' }}>HÜKÜMDAR ELITE PRO {APP_VERSION}</span>
      </div>
    </div>
  );
}
