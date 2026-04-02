import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TileData, GameState,
  getOkeyInfo, getColorMultiplier,
  findReadyMelds, findDoubles, canAppendToMelds, findMelds, TileColor
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
import { StatusBar } from '@capacitor/status-bar';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

const isCapacitor = (window as any).Capacitor !== undefined;
const APP_VERSION = 'v3.0.0 "HÜKÜMDAR"';

export default function App() {
  const { socket, isConnected, setPlayerName, playerName } = useSocket();
  const [screen, setScreen] = useState<'login' | 'lobby' | 'game' | 'result' | 'payment-success'>('login');
  const [roomId, setRoomId] = useState<string>('');
  const [hand, setHand] = useState<(TileData | null)[]>(Array(30).fill(null));
  const [hasDrawn, setHasDrawn] = useState(false);
  const [openedMelds, setOpenedMelds] = useState<Record<string, TileData[][]>>({});
  const [allDiscards, setAllDiscards] = useState<Record<string, TileData[]>>({});
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'waiting',
    currentTurn: '',
    indicator: { id: 'ind', number: 1, color: 'black' as TileColor },
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

  const [user, setUser] = useState<any>(null);
  const [activeGifts, setActiveGifts] = useState<{id: string, type: string, receiverId: string, timestamp: number}[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [theme, setTheme] = useState<'default' | 'casino' | 'night' | 'gold'>('default');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [tileSkin, setTileSkin] = useState<'default' | 'gold' | 'neon' | 'marble'>('default');
  const [tookDiscard, setTookDiscard] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<{senderName: string; message: string; timestamp: number}[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [uiScale, setUiScale] = useState(1.0); // Hükümdar Ölçekleme Silsilesi (En Tepeye Taşındı - Fix #310)

  // 0. Oturum Kontrolü & Ödeme Yönlendirme Kontrolü
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    // Stripe başarıyla dönerse URL'de session_id olur
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      setScreen('payment-success');
    }
    // Otomatik lobiye dönme mantığı kaldırıldı. Artık F5 her zaman Login açar.
  }, [setPlayerName]);

  // ÖDEME DOĞRULAMA SAYFASI BİLEŞENİ
  const PaymentSuccessScreen = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [newBalance, setNewBalance] = useState<number>(0);

    useEffect(() => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      const fetchStatus = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/confirm-session/${sessionId}`);
          const data = await res.json();
          if (data.success) {
            setStatus('success');
            setNewBalance(data.chips);
            // Güncel kullanıcıyı state'e yaz
            setUser((prev: any) => ({ ...prev, chips: data.chips }));
            soundManager.play('win');
            setTimeout(() => {
              window.history.replaceState({}, document.title, "/"); // URL'deki session_id'yi temizle
              setScreen('lobby');
            }, 3500);
          } else {
            setStatus('error');
          }
        } catch (e) {
          setStatus('error');
        }
      };
      if (sessionId) fetchStatus();
    }, []);

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, #022b22 0%, #01140f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', color: '#fff', padding: 40, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1.5px solid rgba(255,215,0,0.2)', width: 450 }}>
          {status === 'loading' && (
            <>
              <Loader2 className="animate-spin" size={64} style={{ color: '#ffd700', marginBottom: 20 }} />
              <h2 style={{ fontSize: 24, fontWeight: 900 }}>Ödeme Doğrulanıyor...</h2>
              <p style={{ opacity: 0.5 }}>Lütfen sayfayı kapatmayın, ürünleriniz yükleniyor.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={84} style={{ color: '#4cd137', marginBottom: 20 }} />
              <h1 style={{ fontSize: 32, fontWeight: 950, color: '#ffd700', marginBottom: 10 }}>TEBRİKLER!</h1>
              <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 25 }}>Satın aldığınız paket başarıyla hesabınıza yüklendi.</p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px 25px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 900, color: '#ffd700', border: '1px dashed rgba(255,215,0,0.4)' }}>
                YENİ BAKİYE: {newBalance.toLocaleString()} ÇİP
              </div>
              <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.5 }}>
                 <p>Lobiye aktarılıyorsunuz</p> <ArrowRight size={16} />
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontSize: 64 }}>❌</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 20 }}>BİR HATA OLUŞTU</h2>
              <p style={{ opacity: 0.5, marginTop: 10 }}>Ödeme doğrulanamadı. Destek hattıyla iletişime geçin.</p>
              <button onClick={() => setScreen('lobby')} className="gold-button" style={{ marginTop: 30 }}>LOBİYE DÖN</button>
            </>
          )}
        </motion.div>
      </div>
    );
  };

  // 1. Durum Senkronizasyonu (Socket Listeners - Kısaltıldı)
  useEffect(() => {
    if (!socket) return;
    const handleRoomUpdate = (data: any) => setGameState(prev => ({ ...prev, players: data.players }));
    const handleYourHand = (serverHand: TileData[]) => {
      const r: (TileData | null)[] = Array(30).fill(null);
      serverHand.forEach((t, i) => { r[i] = t; });
      setHand(r);
    };
    const handleGameStarted = (data: any) => {
      setGameState(prev => ({ ...prev, gamePhase: 'playing', indicator: data.indicator, currentTurn: data.currentTurn, roundBet: data.roundBet, dealerId: data.dealerId, roundNumber: data.roundNumber }));
      if (data.dealerId === socket?.id) setHasDrawn(true); else setHasDrawn(false);
      setScreen('game');
    };
    const handleGameUpdate = (data: any) => {
      setGameState(prev => ({ ...prev, ...data }));
      if (data.openedMelds) setOpenedMelds(data.openedMelds);
      if (data.allDiscards) setAllDiscards(data.allDiscards);
    };
    const handleTileDrawn = ({ tile }: { tile: TileData }) => {
      setHand(prev => { const n = [...prev]; const i = n.findIndex(t => t === null); if (i!==-1) n[i]=tile; return n; });
      setHasDrawn(true); soundManager.play('draw');
    };
    const handleGameOver = (data: any) => { setGameOverData(data); soundManager.play('winner'); };
    const handleChatMessage = (msg: any) => setChatMessages(prev => [...prev, msg].slice(-50));
    const handleLevelUp = (data: any) => {
       if (data.playerName === playerName) {
          setUser((prev: any) => ({ ...prev, level: data.newLevel, xp: 0 }));
          soundManager.play('win');
          alert(`TEBRİKLER! LEVEL ${data.newLevel} OLDUNUZ!`); // Geliştirilebilir lüks modal için zemin
       }
    };
    
    socket.on('room_update', handleRoomUpdate);
    socket.on('your_hand', handleYourHand);
    socket.on('game_started', handleGameStarted);
    socket.on('game_update', handleGameUpdate);
    socket.on('tile_drawn', handleTileDrawn);
    socket.on('chat_message', handleChatMessage);
    socket.on('player_level_up', handleLevelUp);
    socket.on('game_over', handleGameOver);
    return () => { 
      socket.off('room_update'); socket.off('your_hand'); socket.off('game_started'); 
      socket.off('game_update'); socket.off('tile_drawn'); socket.off('chat_message'); 
      socket.off('player_level_up'); socket.off('game_over'); 
    };
  }, [socket]);

  const onLogin = useCallback((d: any) => { 
    setPlayerName(d.username); 
    setUser(d); 
    setScreen('lobby'); 
    localStorage.setItem('user', JSON.stringify(d)); 
  }, [setPlayerName]);

  const onLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setScreen('login');
    soundManager.play('click');
  }, []);

  const onJoinRoom = useCallback((r: string) => { 
    setRoomId(r); 
    setScreen('game'); 
    socket?.emit('join_room', { roomId: r, playerName }); 
  }, [socket, playerName]);

  const handleWatchAd = () => { 
    setIsAdLoading(true); 
    setTimeout(() => { 
      setIsAdLoading(false); 
      setUser((prev: any) => ({ ...prev, chips: prev.chips + 5000 })); 
      alert('5.000 Çip kazandınız!'); 
    }, 3000); 
  };
  
  const hS = useMemo(() => findReadyMelds(hand, getOkeyInfo(gameState.indicator)), [hand, gameState.indicator]);
  const dblS = useMemo(() => findDoubles(hand.filter(Boolean) as TileData[], getOkeyInfo(gameState.indicator)), [hand, gameState.indicator]);

  // OYUNCU KOLTUĞU SIRALAMA YARDIMCISI (En Tepeye Taşındı - Fix #310)
  const getSeat = useCallback((posStr: 'bottom' | 'right' | 'top' | 'left') => {
    const myIdx = gameState.players.findIndex(p => p.id === socket?.id);
    const targetIdx = (myIdx + (posStr === 'bottom' ? 0 : posStr === 'right' ? 1 : posStr === 'top' ? 2 : 3)) % gameState.players.length;
    const p = gameState.players[targetIdx];
    if (!p) return null;

    const seatLastMsg = chatMessages.find(m => m.senderName === p.name && (Date.now() - m.timestamp < 5000))?.message;
    
    return (
      <PlayerSeat 
        key={p.id} 
        player={p} 
        position={posStr} 
        isCurrentTurn={gameState.currentTurn === p.id} 
        playerDiscards={allDiscards[p.id] || []} 
        activeGifts={activeGifts.filter(g => g.receiverId === p.id)} 
        onSendGift={(r, g) => socket?.emit('send_gift', { roomId, receiverId: r, giftType: g })} 
        lastMessage={seatLastMsg}
      />
    );
  }, [gameState.players, socket?.id, chatMessages, allDiscards, activeGifts, roomId, socket]);

  if (screen === 'login') return (
    <>
      <Login onLogin={onLogin} />
      <div style={{ position: 'fixed', left: 10, bottom: 'calc(10px + var(--safe-bottom))', zIndex: 100000, pointerEvents: 'none', opacity: 0.3 }}>
        <span style={{ fontSize: 9, fontWeight: 950, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {APP_VERSION}
        </span>
      </div>
    </>
  );
  
  if (screen === 'payment-success') return (
    <>
      <PaymentSuccessScreen />
      <div style={{ position: 'fixed', left: 10, bottom: 'calc(10px + var(--safe-bottom))', zIndex: 100000, pointerEvents: 'none', opacity: 0.3 }}>
        <span style={{ fontSize: 9, fontWeight: 950, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {APP_VERSION}
        </span>
      </div>
    </>
  );

  if (screen === 'lobby') return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-main)' }}>
      <Lobby 
        playerName={playerName} 
        userChips={user?.chips || 0} 
        user={user}
        isGuest={user?.isGuest || false} 
        onJoinRoom={onJoinRoom} 
        onLogout={onLogout}
      />
      <AnimatePresence>
        {isStoreOpen && (
          <Store 
            onClose={() => setIsStoreOpen(false)} 
            onPurchase={()=>{}} 
            onWatchAd={handleWatchAd} 
            isAdLoading={isAdLoading} 
          />
        )}
      </AnimatePresence>
      <div style={{ position: 'fixed', left: 10, bottom: 'calc(10px + var(--safe-bottom))', zIndex: 100000, pointerEvents: 'none', opacity: 0.3 }}>
        <span style={{ fontSize: 9, fontWeight: 950, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {APP_VERSION}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`theme-${theme} game-layout`} style={{ fontSize: `calc(${uiScale} * 1.25vmax)` }}>
      
      {/* HÜKÜMDAR TASARIM STÜDYOSU (ÖLÇEK SÜRGÜSÜ) */}
      <div style={{ position: 'fixed', top: '0.2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 1rem', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent-gold)', borderRadius: '2rem', backdropFilter: 'blur(10px)' }}>
         <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-gold)' }}>TASARIM MODU (UI BOYUTU):</span>
         <input 
            type="range" min="0.5" max="1.5" step="0.05" 
            value={uiScale} onChange={(e) => setUiScale(parseFloat(e.target.value))} 
            style={{ width: '8rem', accentColor: 'var(--accent-gold)' }}
         />
         <span style={{ fontSize: '0.6rem', fontWeight: 950, color: '#fff' }}>%{Math.round(uiScale * 100)}</span>
      </div>

      {/* ÜST PANEL (DRAGGABLE) */}
      <motion.header drag dragMomentum={false} className="header-stats" style={{ zIndex: 2000, cursor: 'move' }}>
        <ScoreBoard 
          indicator={gameState.indicator} 
          highestSeriesValue={gameState.highestSeriesValue} 
          highestDoublesValue={gameState.highestDoublesValue} 
          players={gameState.players} 
          roundNumber={gameState.roundNumber} 
        />
        <button 
          onClick={() => { setScreen('lobby'); soundManager.play('click'); }}
          className="btn-premium" 
          style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4d4d' }}
        >
          KALK
        </button>
      </motion.header>

      {/* SOL OYUNCU (DRAGGABLE) */}
      <motion.aside drag dragMomentum={false} style={{ gridArea: 'left-player', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, cursor: 'move' }}>
         {getSeat('left')}
      </motion.aside>

      {/* OYUN MERKEZİ (DRAGGABLE) */}
      <motion.main drag dragMomentum={false} className="center-board-area" style={{ zIndex: 1400, cursor: 'move' }}>
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <div style={{ height: '8rem', display: 'flex', alignItems: 'center' }}>
               {getSeat('top')}
            </div>
            <TableCenter 
              indicator={gameState.indicator} 
              drawPileCount={gameState.drawPileCount} 
              discardPile={gameState.discardPile} 
              isMyTurn={gameState.currentTurn === socket?.id} 
              hasDrawn={hasDrawn} 
              canTakeDiscard={gameState.currentTurn === socket?.id && !hasDrawn} 
              onTakeDiscard={() => socket?.emit('take_discard', { roomId })} 
              onDraw={() => socket?.emit('draw_tile', { roomId })} 
              onDiscard={()=>{}} 
              tileSkin={tileSkin} 
            />
         </div>
      </motion.main>

      {/* SAĞ OYUNCU + SOSYAL HUB (DRAGGABLE) */}
      <motion.aside drag dragMomentum={false} style={{ gridArea: 'right-player', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', zIndex: 1500, cursor: 'move' }}>
         {getSeat('right')}
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.5rem' }}>
            {['Helal!', 'Hadi!', 'Okey Boşa!', 'Nasip...'].map(msg => (
              <motion.button key={msg} whileTap={{ scale: 0.9 }} 
                onClick={() => { socket?.emit('send_message', { roomId, message: msg }); soundManager.play('click'); }}
                className="glass-panel" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem', color: '#fff', fontWeight: 900, whiteSpace: 'nowrap', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                {msg}
              </motion.button>
            ))}
         </div>
      </motion.aside>

      {/* ISTAKA ALANI (DRAGGABLE - ALT OYUNCU) */}
      <footer className="rack-footer">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
           <motion.div drag dragMomentum={false} style={{ transform: 'scale(0.8)', marginBottom: '-1rem', zIndex: 1600, cursor: 'move' }}>
              {getSeat('bottom')}
           </motion.div>
           
           <Rack 
             hand={hand} 
             selectedId={selectedId}
             onSelectTile={setSelectedId}
             onDoubleClickTile={(tId) => { 
                 if (gameState.currentTurn === socket?.id && hasDrawn) { 
                   socket?.emit('discard_tile', { roomId, tileId: tId }); 
                   setHand(prev => prev.map(t => t?.id === tId ? null : t)); 
                   setHasDrawn(false); 
                 } 
             }}
             onMoveToSlot={(tId, targetIdx) => setHand(prev => { 
                 const s = prev.findIndex(t => t?.id === tId); 
                 if (s===-1) return prev; 
                 const n = [...prev]; 
                 const m = n[s]! ; 
                 n[s] = n[targetIdx]; 
                 n[targetIdx] = m; 
                 return n; 
             })}
             seriesPoints={hS.total} 
             doublesPoints={dblS.total} 
             handCount={hand.filter(Boolean).length} 
             appendableTiles={[]} 
             minMeldToOpen={gameState.highestSeriesValue} 
             colorMult={getColorMultiplier(gameState.indicator)} 
             canOpenSeries={gameState.currentTurn === socket?.id && hasDrawn && hS.total >= gameState.highestSeriesValue} 
             canOpenDoubles={gameState.currentTurn === socket?.id && hasDrawn && (dblS.pairs.length >= 5 || dblS.total >= gameState.highestDoublesValue)} 
             canPutBack={tookDiscard} 
             onPutBack={()=>{}} 
             onOpenSeries={() => socket?.emit('open_series', { roomId, melds: hS.melds })} 
             onOpenDoubles={() => socket?.emit('open_doubles', { roomId, pairs: dblS.pairs })} 
             onAppends={()=>{}} 
             onSortDoubles={()=>{}} 
             onSortSeries={()=>{}} 
             tileSkin={tileSkin} 
             highestSeriesValue={gameState.highestSeriesValue} 
             highestDoublesValue={gameState.highestDoublesValue} 
             tournamentScores={gameState.tournamentScores} 
           />
        </div>
      </footer>

      {/* VERSİYON BİLGİSİ */}
      <div style={{ position: 'fixed', left: '1rem', bottom: 'calc(0.5rem + var(--safe-bottom))', zIndex: 100000, pointerEvents: 'none', opacity: 0.3 }}>
         <span style={{ fontSize: '0.6rem', fontWeight: 950, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,0.4)', padding: '0.3rem 0.8rem', borderRadius: '1rem' }}>
           {APP_VERSION}
         </span>
      </div>

      {/* TUR SONU SONUÇLARI */}
      <AnimatePresence>
        {gameOverData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(15px)' }}
          >
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 950, marginBottom: '2rem' }}>TUR SONA ERDİ</h2>
            <div className="glass-panel" style={{ padding: '2rem 1.5rem', width: '100%', maxWidth: '25rem' }}>
              {gameOverData?.roundResults?.map((res: any) => (
                <div key={res.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#fff', fontWeight: 800 }}>{res.playerName}</span>
                  <span style={{ color: res.score > 0 ? '#ff4444' : '#4cd137', fontWeight: 950 }}>{res.score > 0 ? `+${res.score}` : res.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setGameOverData(null); socket?.emit('start_game', { roomId }); }} className="btn-premium" style={{ marginTop: '2.5rem', width: '100%', maxWidth: '20rem' }}>
              SIRADAKİ EL <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
