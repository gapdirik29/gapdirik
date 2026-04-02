import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Users, Zap, Crown, Wallet, Play, Plus, Settings, MessageCircle, LogOut, ShoppingBag, User as UserIcon, Star, ArrowUpRight, TrendingUp } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { motion, AnimatePresence } from 'framer-motion';

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: 4;
  roundBet: number;
  gameState: 'waiting' | 'playing' | 'finished';
}

interface LeaderboardPlayer {
  _id: string;
  username: string;
  level: number;
  chips: number;
  stats: {
    totalTournamentPoints: number;
    wins: number;
    gamesPlayed: number;
  };
}

interface LobbyProps {
  playerName: string;
  userChips: number;
  user: any;
  isGuest?: boolean;
  onJoinRoom: (roomId: string) => void;
  onLogout: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ playerName, userChips, user, isGuest, onJoinRoom, onLogout }) => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'vip' | 'standard'>('all');
  const [activeNav, setActiveNav] = useState<'lobby' | 'leaderboard' | 'store' | 'profile'>('lobby');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [bonusMessage, setBonusMessage] = useState('');

  useEffect(() => {
    if (!socket || !user) return;
    
    // GÜNLÜK HEDİYE KONTROLÜ
    const checkBonus = async () => {
       try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://192.168.1.104:10000'}/api/auth/daily-bonus`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ userId: user._id })
          });
          const data = await res.json();
          if (data.success) {
             setBonusMessage(data.message);
             setShowDailyBonus(true);
             soundManager.play('win');
          }
       } catch (e) {
          console.warn('Bonus check failed');
       }
    };
    checkBonus();

    socket.emit('get_rooms');
    const handleRoomsList = (data: RoomInfo[]) => setRooms(data);
    const handleRoomCreated = (roomId: string) => onJoinRoom(roomId);
    const handleQuickJoinSuccess = (roomId: string) => onJoinRoom(roomId);

    socket.on('rooms_list', handleRoomsList);
    socket.on('room_created', handleRoomCreated);
    socket.on('quick_join_success', handleQuickJoinSuccess);

    const itv = setInterval(() => socket.emit('get_rooms'), 3000);
    return () => {
      socket.off('rooms_list', handleRoomsList);
      socket.off('room_created', handleRoomCreated);
      socket.off('quick_join_success', handleQuickJoinSuccess);
      clearInterval(itv);
    };
  }, [socket, onJoinRoom]);

  // Leaderboard Verisi Çek
  useEffect(() => {
    if (activeNav === 'leaderboard') {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.104:10000';
      fetch(`${apiUrl}/api/leaderboard/top`)
        .then(res => res.json())
        .then(res => {
          if (res.success) setLeaderboardData(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [activeNav]);

  const handleQuickPlay = () => {
    if (!socket) return;
    socket.emit('quick_join', { playerName });
    soundManager.play('click');
  };

  const filteredRooms = rooms.filter(r => {
    if (activeTab === 'vip') return r.roundBet >= 10000;
    if (activeTab === 'standard') return r.roundBet < 10000;
    return true;
  });

  /* ─── LOBİ GÖRÜNÜMÜ ─── */
  const renderLobby = () => (
    <div className="scroll-container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 25 }}>
        <div className="glass-panel" style={{ padding: '25px', background: 'linear-gradient(135deg, rgba(255,204,0,0.15) 0%, rgba(0,0,0,0.4) 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 5 }}>HEMEN BAŞLA</h2>
            <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>En hızlı masaya anında ışınlan!</p>
          </div>
          <button className="btn-premium" onClick={handleQuickPlay}>
            <Play size={20} fill="#000" />
          </button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['all', 'standard', 'vip'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ 
            flex: 1, padding: '10px', borderRadius: 12, border: 'none',
            background: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.04)',
            color: activeTab === tab ? '#000' : '#888',
            fontWeight: 900, fontSize: 11, textTransform: 'uppercase', transition: '0.3s'
          }}>
            {tab === 'all' ? 'TÜMÜ' : tab === 'vip' ? '👑 VİP' : 'MASALAR'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
        <AnimatePresence mode="popLayout">
          {filteredRooms.map((room) => (
            <motion.div layout key={room.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="room-card-premium" onClick={() => onJoinRoom(room.id)}
              style={room.roundBet >= 10000 ? { borderColor: 'rgba(255,204,0,0.3)', background: 'linear-gradient(145deg, rgba(255,204,0,0.08) 0%, rgba(0,0,0,0.4) 100%)' } : {}}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.5, marginBottom: 4, letterSpacing: 1 }}>{room.roundBet >= 10000 ? '👑 ELİT TURNUVA' : 'STANDART ODA'}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{room.name}</h3>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 900, color: 'var(--accent-gold)' }}>👥 {room.playerCount}/4</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 950, color: room.roundBet >= 10000 ? 'var(--accent-gold)' : '#fff' }}>{room.roundBet.toLocaleString()} ₺</div>
                <button className="btn-premium" style={{ padding: '8px 15px', fontSize: 11 }}>KATIL</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredRooms.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}><p>Aktif masa bulunamadı.</p></div>}
      </div>
    </div>
  );

  /* ─── SIRALAMA GÖRÜNÜMÜ ─── */
  const renderLeaderboard = () => (
    <div className="scroll-container">
      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <h2 style={{ fontSize: 24, fontWeight: 950, color: 'var(--accent-gold)', margin: 0 }}>HÜKÜMDARLAR</h2>
        <p style={{ fontSize: 11, opacity: 0.5 }}>Küresel Sıralama & Turnuva Puanları</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, opacity: 0.5 }}>Yükleniyor...</div>
        ) : leaderboardData.map((p, idx) => (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
            key={p._id} className="glass-panel"
            style={{ 
              display: 'flex', alignItems: 'center', gap: 15, padding: '12px 15px',
              borderLeft: idx < 3 ? '4px solid var(--accent-gold)' : '1px solid var(--glass-border)',
              background: idx === 0 ? 'linear-gradient(90deg, rgba(255,204,0,0.1) 0%, transparent 100%)' : ''
            }}
          >
            <div style={{ width: 24, fontSize: 16, fontWeight: 950, color: idx < 3 ? 'var(--accent-gold)' : '#555', textAlign: 'center' }}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <UserIcon size={20} opacity={0.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>{p.username}</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>SEVİYE {p.level} • {p.stats?.wins || 0} GALİBİYET</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 950, color: 'var(--accent-gold)', fontSize: 16 }}>{p.stats?.totalTournamentPoints || 0}</div>
              <div style={{ fontSize: 8, opacity: 0.5, letterSpacing: 1 }}>PUAN</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  /* ─── MAĞAZA GÖRÜNÜMÜ ─── */
  const renderStore = () => (
    <div className="scroll-container">
      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <h2 style={{ fontSize: 24, fontWeight: 950, color: '#4cd137', margin: 0 }}>GÜMÜŞ MAĞAZASI</h2>
        <p style={{ fontSize: 11, opacity: 0.5 }}>Çipini Artır, Masalara Hükmet!</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
        {[
          { icon: '💰', title: 'Küçük Kese', chips: '50.000', price: '29,99 ₺', color: '#fff' },
          { icon: '👜', title: 'Zengin Çanta', chips: '150.000', price: '79,99 ₺', color: '#fff' },
          { icon: '💎', title: 'Elmas Sandık', chips: '500.000', price: '199,99 ₺', color: 'var(--accent-gold)' },
          { icon: '👑', title: 'Kral Hazinesi', chips: '2.500.000', price: '749,99 ₺', color: 'var(--accent-gold)', hot: true },
        ].map((pkg, idx) => (
          <motion.div key={idx} whileTap={{ scale: 0.95 }} className="glass-panel" 
            style={{ 
              padding: 15, textAlign: 'center', position: 'relative',
              borderColor: pkg.hot ? 'rgba(255,204,0,0.3)' : 'var(--glass-border)',
              background: pkg.hot ? 'linear-gradient(145deg, rgba(255,204,0,0.05) 0%, transparent 100%)' : ''
            }}>
            {pkg.hot && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: '#000', padding: '2px 8px', borderRadius: 20, fontSize: 8, fontWeight: 950 }}>POPÜLER</div>}
            <div style={{ fontSize: 40, marginBottom: 10 }}>{pkg.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>{pkg.title}</div>
            <div style={{ fontWeight: 950, fontSize: 18, color: pkg.color, marginBottom: 10 }}>{pkg.chips} ₺</div>
            <button className="btn-premium" style={{ width: '100%', padding: '8px', fontSize: 11, background: pkg.hot ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', color: pkg.hot ? '#000' : '#fff' }}>{pkg.price}</button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  /* ─── PROFİL GÖRÜNÜMÜ ─── */
  const renderProfile = () => (
    <div className="scroll-container">
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 20px' }}>
           <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-gold), #ff9500)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              <UserIcon size={50} color="#000" />
           </div>
           <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', color: '#000', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 950, boxShadow: '0 5px 15px rgba(0,0,0,0.3)', border: '2px solid var(--accent-gold)' }}>
             LVL {user?.level || 1}
           </div>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 950, margin: 0, letterSpacing: 1 }}>{playerName.toUpperCase()}</h2>
        <div style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 900, marginTop: 5, letterSpacing: 2 }}>{user?.level > 10 ? 'İMPARATOR' : 'HAREKAT ÜYESİ'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25 }}>
        {[
          { label: 'GALİBİYET', val: user?.stats?.wins || 0, icon: <TrendingUp size={14} />, color: '#4cd137' },
          { label: 'TOPLAM OYUN', val: user?.stats?.gamesPlayed || 0, icon: <Play size={14} />, color: '#3498db' },
          { label: 'TURNUVA PUANI', val: (user?.stats?.totalTournamentPoints || 0).toLocaleString(), icon: <Star size={14} />, color: 'var(--accent-gold)' },
          { label: 'SERİ', val: user?.stats?.currentWinStreak || 0, icon: <Zap size={14} />, color: '#e67e22' },
        ].map((s, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: 15, textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 9, fontWeight: 900, opacity: 0.5, marginBottom: 5 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 950, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <button className="btn-premium" style={{ width: '100%', background: 'rgba(255,50,50,0.15)', color: '#ff4444', border: '1px solid rgba(255,50,50,0.2)', marginBottom: 20 }} onClick={onLogout}>
        <LogOut size={18} /> GÜVENLİ ÇIKIŞ
      </button>
    </div>
  );

  return (
    <div className="lobby-root" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <header style={{ 
        padding: 'calc(15px + var(--safe-top)) 20px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(10, 14, 18, 0.9)', backdropFilter: 'blur(15px)', zIndex: 100, borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #ffcc00, #ff9500)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255, 204, 0, 0.4)', position: 'relative' }}>
            <Zap size={24} color="#000" fill="#000" />
            <div style={{ position: 'absolute', bottom: -5, right: -5, width: 22, height: 22, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 950, color: '#000', border: '2px solid var(--accent-gold)', boxShadow: '0 2px 5px rgba(0,0,0,0.4)' }}>
              {user?.level || 1}
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 950, margin: 0, color: 'var(--accent-gold)', letterSpacing: 1 }}>GAPDİRİK</h1>
            <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 800, letterSpacing: 1.5 }}>HÜKÜMDARLIĞI</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: 25, border: '1.5px solid rgba(255, 215, 0, 0.4)' }}>
            <Wallet size={16} color="var(--accent-gold)" />
            <span style={{ fontWeight: 950, color: 'var(--accent-gold)', fontSize: 16 }}>{userChips.toLocaleString()} ₺</span>
          </div>
          {/* XP BAR (GERÇEK VERİ) */}
          <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${((user?.xp || 0) / ((user?.level || 1) * 1000)) * 100}%` }} 
               style={{ position: 'absolute', height: '100%', left: 0, background: 'var(--accent-gold)', boxShadow: '0 0 10px var(--accent-gold-glow)' }} 
             />
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={activeNav} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {activeNav === 'lobby' && renderLobby()}
          {activeNav === 'leaderboard' && renderLeaderboard()}
          {activeNav === 'store' && renderStore()}
          {activeNav === 'profile' && renderProfile()}
        </motion.div>
      </AnimatePresence>

      <nav className="mobile-nav">
        {[
          { key: 'lobby', icon: <Users size={20} />, label: 'LOBİ' },
          { key: 'leaderboard', icon: <Trophy size={20} />, label: 'SIRALAMA' },
          { key: 'store', icon: <ShoppingBag size={20} />, label: 'MAĞAZA' },
          { key: 'profile', icon: <UserIcon size={20} />, label: 'PROFİL' },
        ].map(item => (
          <div key={item.key} className={`nav-item ${activeNav === item.key ? 'active' : ''}`} onClick={() => { setActiveNav(item.key as any); soundManager.play('click'); }}>
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <style>{`
        .nav-item { transition: 0.3s; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; opacity: 0.4; }
        .nav-item.active { color: var(--accent-gold); opacity: 1; }
        .nav-item span { font-size: 8px; font-weight: 950; }
        .scroll-container { height: calc(100vh - 150px); overflow-y: auto; padding: 20px; padding-bottom: 100px; -webkit-overflow-scrolling: touch; }
      `}</style>

      {/* GÜNLÜK HEDİYE MODALI (PREMIUM) */}
      <AnimatePresence>
        {showDailyBonus && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(20px)' }}
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
              style={{ padding: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 32, border: '2px solid var(--accent-gold)', textAlign: 'center', maxWidth: 450, position: 'relative', boxShadow: '0 0 50px rgba(255,204,0,0.2)' }}
            >
              <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, background: 'var(--accent-gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(255,204,0,0.5)' }}>
                <Zap size={40} color="#000" fill="#000" />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 950, color: 'var(--accent-gold)', margin: '20px 0 10px', letterSpacing: 2 }}>TEBRİKLER!</h2>
              <p style={{ fontSize: 16, color: '#fff', opacity: 0.8, lineHeight: 1.5 }}>Hükümdarlığa katılımın için sana özel bir rızık ayrıldı.</p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: 20, margin: '25px 0', border: '1px dashed rgba(255,204,0,0.4)' }}>
                <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--accent-gold)' }}>10.000 ÇİP</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>RURUM: HESABA YATIRILDI</div>
              </div>
              <button 
                onClick={() => { setShowDailyBonus(false); soundManager.play('click'); }} 
                className="btn-premium" style={{ width: '100%', padding: '15px', borderRadius: 15, fontSize: 14 }}
              >
                MASALARA DÖN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
