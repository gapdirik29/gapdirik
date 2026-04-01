import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Users, Zap, Crown, Wallet, Coins, PlayCircle, Settings, MessageCircle, Lock } from 'lucide-react';
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

interface LobbyProps {
  playerName: string;
  userChips: number;
  isGuest: boolean;
  onJoinRoom: (roomId: string) => void;
  onOpenStore: () => void;
  onOpenRewardedAd: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ playerName, userChips, isGuest, onJoinRoom, onOpenStore, onOpenRewardedAd }) => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBet, setNewRoomBet] = useState(1000);
  const [activeTab, setActiveTab] = useState<'all' | 'vip' | 'standard'>('all');
  const [friends, setFriends] = useState<{id: string, name: string, status: string, level: number}[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('get_rooms');
    const handleRoomsList = (data: RoomInfo[]) => setRooms(data);
    const handleRoomCreated = (roomId: string) => onJoinRoom(roomId);
    const handleQuickJoinSuccess = (roomId: string) => onJoinRoom(roomId);

    socket.on('rooms_list', handleRoomsList);
    socket.on('room_created', handleRoomCreated);
    socket.on('quick_join_success', handleQuickJoinSuccess);
    socket.on('friends_list', (data) => setFriends(data));

    socket.emit('get_friends');

    const itv = setInterval(() => {
      socket.emit('get_rooms');
      socket.emit('get_friends');
    }, 5000);
    return () => {
      socket.off('rooms_list', handleRoomsList);
      socket.off('room_created', handleRoomCreated);
      socket.off('quick_join_success', handleQuickJoinSuccess);
      socket.off('friends_list');
      clearInterval(itv);
    };
  }, [socket, onJoinRoom]);

  useEffect(() => {
    soundManager.toggle(soundEnabled);
  }, [soundEnabled]);

  const handleCreateRoom = (betOverride?: number) => {
    if (!socket) return;
    const bet = betOverride || newRoomBet;
    socket.emit('create_room', { name: newRoomName, bet });
  };

  const handleQuickPlay = (betLevel?: number) => {
    if (!socket) return;
    if (isGuest && betLevel && betLevel >= 10000) {
      alert('🔒 VIP MASALAR: Elit masalara sadece kayıtlı üyelerimiz girebilir!');
      return;
    }
    socket.emit('quick_join', { playerName, preferredBet: betLevel });
  };

  const filteredRooms = rooms.filter(r => {
    if (activeTab === 'vip') return r.roundBet >= 10000;
    if (activeTab === 'standard') return r.roundBet < 10000;
    return true;
  });

  return (
    <div className="lobby-root" style={{
      position: 'fixed', inset: 0, 
      background: '#010c0a',
      display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', fontFamily: '"Outfit", sans-serif', color: '#fff'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 20% 30%, rgba(5, 77, 59, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(218, 165, 32, 0.1) 0%, transparent 50%)',
        zIndex: 0
      }} />
      <div className="noise-overlay" />

      {/* HEADER: RESPONSIVE PADDING */}
      <header style={{ 
        position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: isPortrait ? '15px 20px' : '20px 40px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
           <motion.div 
             animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
             style={{ width: isPortrait ? 35 : 45, height: isPortrait ? 35 : 45, borderRadius: 12, background: 'linear-gradient(135deg, #ffd700, #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
           >
              <Zap size={isPortrait ? 20 : 24} color="#000" fill="#000" />
           </motion.div>
           <div>
              <h1 style={{ fontSize: isPortrait ? 18 : 24, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1, margin: 0, color: '#ffd700' }}>GAPDİRİK <span style={{ color: '#fff' }}>{!isPortrait && 'MASTER'}</span></h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 700, opacity: 0.5 }}>
                 <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4cd137' }} />
                 CANLI: {rooms.length} MASA | GÜVENLİ BAĞLANTI AKTİF
              </div>
           </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isPortrait ? 10 : 20 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 15, border: '1px solid rgba(255,215,0,0.2)' }}>
              <Wallet size={14} color="#ffd700" />
              <span style={{ fontWeight: 900, color: '#ffd700', fontSize: isPortrait ? 12 : 16 }}>{userChips.toLocaleString()}</span>
              <button 
                onClick={() => {
                  if (isGuest) alert('💰 Gerçek alışveriş için kayıt olun!');
                  else onOpenStore();
                }} 
                className="buy-btn"
              >+</button>
           </div>
           
           {!isPortrait && <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />}
           
           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!isPortrait && (
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: 13, fontWeight: 800 }}>{playerName}</div>
                   <div style={{ fontSize: 9, color: isGuest ? '#888' : '#ffd700', fontWeight: 900 }}>ELİT ÜYE</div>
                </div>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${isGuest ? '#666' : '#ffd700'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{isGuest ? '👤' : '🧧'}</div>
           </div>
        </div>
      </header>

      {/* MAIN CONTENT: RESPONSIVE GRID */}
      <main style={{ 
        position: 'relative', zIndex: 5, flex: 1, 
        display: 'flex', flexDirection: isPortrait ? 'column' : 'row',
        overflow: 'hidden' 
      }}>
        
        {/* SIDEBAR: COLLAPSIBLE OR TOP IN PORTRAIT */}
        <aside style={{ 
          width: isPortrait ? '100%' : '350px',
          height: isPortrait ? 'auto' : '100%',
          borderRight: isPortrait ? 'none' : '1px solid rgba(255,255,255,0.05)', 
          borderBottom: isPortrait ? '1px solid rgba(255,255,255,0.05)' : 'none',
          background: 'rgba(0,0,0,0.2)', padding: isPortrait ? '15px' : '30px', 
          display: 'flex', flexDirection: isPortrait ? 'row' : 'column', 
          gap: 15, overflowX: isPortrait ? 'auto' : 'hidden', overflowY: isPortrait ? 'hidden' : 'auto' 
        }}>
           
           <motion.button 
             whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
             onClick={() => handleQuickPlay()} 
             className="premium-btn quick-play"
             style={{ minWidth: isPortrait ? '160px' : 'auto' }}
           >
              <Zap size={20} fill="#000" />
              <div>
                 <div style={{ fontSize: isPortrait ? 13 : 16, fontWeight: 950 }}>HIZLI OYNA</div>
                 {!isPortrait && <div style={{ fontSize: 10, opacity: 0.7 }}>ANINDA KATIL</div>}
              </div>
           </motion.button>

           <div className="sidebar-section" style={{ minWidth: isPortrait ? '200px' : 'auto' }}>
              {!isPortrait && <h4 style={{ fontSize: 12, fontWeight: 900, opacity: 0.4, marginBottom: 10 }}>ÖZEL MASA OLUŞTUR</h4>}
              <div style={{ display: 'flex', flexDirection: isPortrait ? 'row' : 'column', gap: 10 }}>
                 {!isPortrait && (
                   <input 
                     className="premium-input" placeholder="Masa İsmi..." 
                     value={newRoomName} onChange={e => setNewRoomName(e.target.value)} 
                   />
                 )}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, flex: 1 }}>
                    {[1000, 5000, 25000].map(val => (
                      <button 
                        key={val} onClick={() => {
                          if (isGuest && val >= 10000) alert('🔒 VIP: Kayıt olun!');
                          else setNewRoomBet(val);
                        }}
                        style={{ padding: '8px 0', borderRadius: 8, border: 'none', background: newRoomBet === val ? '#ffd700' : 'rgba(255,255,255,0.05)', color: newRoomBet === val ? '#000' : '#fff', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}
                      >
                         {val/1000}K
                      </button>
                    ))}
                 </div>
                 <button onClick={() => handleCreateRoom()} className="premium-btn create" style={{ padding: isPortrait ? '8px 15px' : '12px' }}>AÇ</button>
              </div>
           </div>

           {!isPortrait && (
             <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: 12, fontWeight: 900, opacity: 0.4, marginBottom: 10 }}>ARKADAŞLAR</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                   {friends.slice(0, 5).map((f: any) => (
                     <div key={f.id} className="friend-item">
                        <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👤</div>
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 800 }}>{f.name}</div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4cd137' }} />
                     </div>
                   ))}
                </div>
             </div>
           )}

           <button onClick={onOpenRewardedAd} style={{ minWidth: isPortrait ? '140px' : 'auto', background: 'rgba(255,215,0,0.05)', border: '1px dashed rgba(255,215,0,0.2)', padding: '12px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
              <PlayCircle size={16} color="#ffd700" />
              <span style={{ fontSize: 10, fontWeight: 900, color: '#ffd700' }}>HEDİYE ÇİP</span>
           </button>
        </aside>

        {/* ROOM LIST: RESPONSIVE COLUMNS */}
        <section style={{ padding: isPortrait ? '20px' : '40px', flex: 1, overflowY: 'auto' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                 <h2 style={{ fontSize: isPortrait ? 20 : 28, fontWeight: 950, marginBottom: 2 }}>AKTİF MASALAR</h2>
                 {!isPortrait && <p style={{ fontSize: 14, opacity: 0.4 }}>Global sunuculardaki rekabetler</p>}
              </div>
              <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 10 }}>
                 {['all', 'vip'].map(t => (
                   <button 
                     key={t} onClick={() => setActiveTab(t as any)}
                     style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: activeTab === t ? '#fff' : 'transparent', color: activeTab === t ? '#000' : '#fff', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}
                   >
                     {t.toUpperCase()}
                   </button>
                 ))}
              </div>
           </div>

           <div style={{ 
             display: 'grid', 
             gridTemplateColumns: isPortrait ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
             gap: isPortrait ? 15 : 20 
           }}>
              {filteredRooms.map(room => (
                <motion.div 
                  key={room.id} whileHover={{ y: -5 }}
                  onClick={() => {
                    if (isGuest && room.roundBet >= 10000) alert('🔒 VIP: Kayıt olun!');
                    else onJoinRoom(room.id);
                  }}
                  className={`room-card-premium ${room.roundBet >= 10000 ? 'vip-glow' : ''}`}
                  style={{ padding: isPortrait ? '15px' : '20px' }}
                >
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="room-badge" style={{ fontSize: 8 }}>{room.roundBet >= 10000 ? 'VIP' : 'STANDART'}</div>
                      <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6 }}>👥 {room.playerCount}/4</div>
                   </div>
                   
                   <h3 style={{ fontSize: isPortrait ? 16 : 20, fontWeight: 950, marginBottom: 2 }}>{room.name}</h3>
                   <div style={{ fontSize: 20, fontWeight: 950, color: room.roundBet >= 10000 ? '#ffd700' : '#fff' }}>{room.roundBet.toLocaleString()} ₺</div>
                   
                   <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button className="play-now-btn" style={{ padding: '6px 15px', fontSize: 10 }}>KATIL</button>
                   </div>
                </motion.div>
              ))}
           </div>
        </section>

      </main>

      <style>{`
        .noise-overlay { position: absolute; inset: 0; background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); opacity: 0.05; pointer-events: none; z-index: 1; }
        .buy-btn { background: #ffd700; border: none; width: 20px; height: 20px; border-radius: 5px; color: #000; font-weight: 950; cursor: pointer; }
        .premium-btn { padding: 12px 15px; border-radius: 12px; border: none; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s; }
        .premium-btn.quick-play { background: #ffd700; color: #000; box-shadow: 0 5px 15px rgba(255,215,0,0.2); }
        .premium-btn.create { background: #fff; color: #000; font-weight: 900; }
        .premium-input { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; color: #fff; outline: none; font-size: 12px; }
        .friend-item { background: rgba(255,255,255,0.02); padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 8px; }
        .room-card-premium { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; cursor: pointer; position: relative; }
        .room-badge { background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 8px; font-weight: 950; color: #888; }
        .vip-glow { border-color: rgba(255,215,0,0.3); background: linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,255,255,0.02) 100%); }
        .vip-glow .room-badge { background: #ffd700; color: #000; }
        .play-now-btn { background: #fff; color: #000; border: none; border-radius: 8px; font-weight: 950; cursor: pointer; transition: 0.3s; }
        .room-card-premium:hover .play-now-btn { background: #ffd700; }
      `}</style>
    </div>
  );
};
