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
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

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
        <>
          {/* HEADER (SCOREBOARD + KALK) */}
          <header className="header-stats" style={{ zIndex: 2000, gridArea: 'header', justifyContent: 'space-between' }}>
            <div style={{ transformOrigin: 'top left' }}>
              <ScoreBoard indicator={gameState.indicator} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} players={gameState.players} roundNumber={gameState.roundNumber} />
            </div>
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              <button onClick={() => { setScreen('lobby'); soundManager.play('click'); }} className="btn-premium" style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4d4d' }}>KALK</button>
            </div>
          </header>

          {/* PLAYERS */}
          <aside style={{ gridArea: 'left-player', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getSeat('left')}</aside>
          
          <main className="center-board-area" style={{ gridArea: 'center' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <div style={{ height: '8rem', display: 'flex', alignItems: 'center' }}>{getSeat('top')}</div>
                <TableCenter indicator={gameState.indicator} drawPileCount={gameState.drawPileCount} discardPile={gameState.discardPile} isMyTurn={gameState.currentTurn === socket?.id} hasDrawn={hasDrawn} canTakeDiscard={gameState.currentTurn === socket?.id && !hasDrawn} onTakeDiscard={() => socket?.emit('take_discard', { roomId })} onDraw={() => socket?.emit('draw_tile', { roomId })} onDiscard={()=>{}} tileSkin={tileSkin} />
             </div>
          </main>

          <aside style={{ gridArea: 'right-player', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getSeat('right')}</aside>

          {/* FOOTER LEFT (DURUM PANELI) */}
          <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
             <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', fontSize: '0.7rem', fontWeight: 900 }}>
                <span style={{ color: '#ffcc00' }}>BARAJ: {gameState.highestSeriesValue}</span>
                <span style={{ color: '#fff' }}>ELİM: {hS.total}</span>
             </div>
             <div className="glass-panel" style={{ padding: '0.4rem 1rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#fff', cursor: 'pointer' }}>
                YAZBOZ ⌃
             </div>
          </div>

          {/* FOOTER CENTER (USER + RACK) */}
          <footer className="rack-footer" style={{ gridArea: 'footer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
               <div style={{ transform: 'scale(0.8)', marginBottom: '-0.5rem', zIndex: 1600 }}>{getSeat('bottom')}</div>
               <Rack hand={hand} selectedId={selectedId} onSelectTile={setSelectedId} onDoubleClickTile={(tId) => { if (gameState.currentTurn === socket?.id && hasDrawn) { socket?.emit('discard_tile', { roomId, tileId: tId }); setHand(prev => prev.map(t => t?.id === tId ? null : t)); setHasDrawn(false); } }} onMoveToSlot={(tId, targetIdx) => setHand(prev => { const s = prev.findIndex(t => t?.id === tId); if (s===-1) return prev; const n = [...prev]; const m = n[s]! ; n[s] = n[targetIdx]; n[targetIdx] = m; return n; })} seriesPoints={hS.total} doublesPoints={dblS.total} handCount={hand.filter(Boolean).length} appendableTiles={[]} minMeldToOpen={gameState.highestSeriesValue} colorMult={getColorMultiplier(gameState.indicator)} canOpenSeries={gameState.currentTurn === socket?.id && hasDrawn && hS.total >= gameState.highestSeriesValue} canOpenDoubles={gameState.currentTurn === socket?.id && hasDrawn && (dblS.pairs.length >= 5 || dblS.total >= gameState.highestDoublesValue)} canPutBack={tookDiscard} onPutBack={()=>{}} onOpenSeries={() => socket?.emit('open_series', { roomId, melds: hS.melds })} onOpenDoubles={() => socket?.emit('open_doubles', { roomId, pairs: dblS.pairs })} onAppends={()=>{}} onSortDoubles={()=>{}} onSortSeries={()=>{}} tileSkin={tileSkin} highestSeriesValue={gameState.highestSeriesValue} highestDoublesValue={gameState.highestDoublesValue} tournamentScores={gameState.tournamentScores} />
            </div>
          </footer>

          {/* FOOTER RIGHT (SOCIAL + TILE COUNTER) */}
          <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
             <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['Helal!', 'Hadi!'].map(msg => (
                  <button key={msg} onClick={() => socket?.emit('send_message', { roomId, message: msg })} className="glass-panel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.6rem', color: '#fff', fontWeight: 900, border: 'none' }}>{msg}</button>
                ))}
             </div>
             <div className="glass-panel" style={{ width: '4rem', height: '4rem', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-gold)' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--accent-gold)' }}>0</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 900, opacity: 0.8 }}>TAŞ</span>
             </div>
          </div>
        </>
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
