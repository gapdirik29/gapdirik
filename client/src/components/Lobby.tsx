import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Users, Zap, Crown, Wallet, Coins, PlayCircle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

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
  onJoinRoom: (roomId: string) => void;
  onOpenStore: () => void;
  onOpenRewardedAd: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ playerName, userChips, onJoinRoom, onOpenStore, onOpenRewardedAd }) => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBet, setNewRoomBet] = useState(1000);
  const [activeTab, setActiveTab] = useState<'all' | 'vip' | 'standard'>('all');
  const [friends, setFriends] = useState<{id: string, name: string, status: string, level: number}[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playerChips = userChips;

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
    socket.emit('quick_join', { playerName, preferredBet: betLevel });
  };

  const filteredRooms = rooms.filter(r => {
    if (activeTab === 'vip') return r.roundBet >= 25000;
    if (activeTab === 'standard') return r.roundBet < 25000;
    return true;
  });

  return (
    <div className="lobby-root" style={{
      position: 'fixed', inset: 0, 
      background: 'radial-gradient(circle at top left, #054d3b 0%, #011c16 100%)',
      display: 'flex', flexDirection: 'column', padding: '40px',
      overflowY: 'auto', fontFamily: '"Outfit", sans-serif', color: '#fff'
    }}>
      <div className="glass-overlay" />
      
      {/* --- HEADER --- */}
      <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
           <div style={{ width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, #ffd700, #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
              <Zap size={32} color="#000" fill="#000" />
           </div>
           <div>
              <h1 style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, background: 'linear-gradient(to right, #fff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Gapdirik Master</h1>
              <p style={{ opacity: 0.6, fontSize: 14 }}>Global Lobi • {rooms.length} Aktif Masa</p>
           </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 15, background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)' }}>
           <Wallet size={18} color="#ffd700" />
           <span style={{ fontWeight: 900, color: '#ffd700', fontSize: 18 }}>{playerChips.toLocaleString()} ₺</span>
           <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
           <span style={{ fontSize: 14, opacity: 0.8 }}>{playerName}</span>
           <button 
             onClick={onOpenStore}
             style={{ 
               background: 'linear-gradient(90deg, #ffd700, #ff8f00)', 
               border: 'none', borderRadius: 100, padding: '6px 12px', 
               color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: 5, marginLeft: 10
             }}
           >
             <Coins size={14} /> ÇİP AL
           </button>
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             style={{ background: 'none', border: 'none', cursor: 'pointer', color: soundEnabled ? '#ffd700' : '#888', marginLeft: 10, display: 'flex', alignItems: 'center' }}
           >
             {soundEnabled ? '🔊' : '🔇'}
           </button>
        </div>
      </header>

      {/* --- QUICK ACTION CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40, position: 'relative', zIndex: 2 }}>
        <div className="category-card" onClick={() => handleQuickPlay(1000)}>
           <div className="cat-icon" style={{ background: '#4cd137' }}><Users size={24} /></div>
           <div>
             <h3>Çaylaklar</h3>
             <p>1.000 - 2.500 ₺ Bahis</p>
           </div>
           <div className="cat-action">HEMEN OYNA</div>
        </div>
        <div className="category-card" onClick={() => handleQuickPlay(5000)}>
           <div className="cat-icon" style={{ background: '#00a8ff' }}><Trophy size={24} /></div>
           <div>
             <h3>Usta Masası</h3>
             <p>5.000 - 10.000 ₺ Bahis</p>
           </div>
           <div className="cat-action">HEMEN OYNA</div>
        </div>
        <div className="category-card" onClick={() => handleQuickPlay(25000)}>
           <div className="cat-icon" style={{ background: '#ffd700' }}><Crown size={24} /></div>
           <div>
             <h3>VIP Kral Odası</h3>
             <p>25.000+ ₺ Bahis</p>
           </div>
           <div className="cat-action">HEMEN OYNA</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 40, position: 'relative', zIndex: 2 }}>
        
        {/* --- LEFT SIDE: CREATE --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <button onClick={() => handleQuickPlay()} className="action-button quick-play-btn">
            <Zap size={24} />
            HIZLI EŞLEŞME
            <span className="btn-shine" />
          </button>

          <button onClick={onOpenRewardedAd} className="action-button reward-btn">
             <PlayCircle size={24} />
             HEDİYE ÇİP (REKLAM)
          </button>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 30, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
             <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 25, display: 'flex', alignItems: 'center', gap: 10 }}>
               <Trophy size={20} color="#ffd700" /> Özel Masa
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="input-group">
                  <label style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, display: 'block' }}>MASA ADI</label>
                  <input 
                    className="custom-input"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    placeholder="Masa ismi girin..."
                  />
                </div>
                <div>
                   <label style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, display: 'block' }}>BAHİS MİKTARI</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[1000, 2500, 5000, 10000, 25000, 50000].map(val => (
                        <button 
                          key={val}
                          onClick={() => setNewRoomBet(val)}
                          style={{
                             padding: '12px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 900,
                             background: newRoomBet === val ? '#ffd700' : 'rgba(255,255,255,0.05)',
                             color: newRoomBet === val ? '#000' : '#fff', cursor: 'pointer', transition: '0.2s'
                          }}
                        >
                          {val.toLocaleString()}₺
                        </button>
                      ))}
                   </div>
                </div>
                <button onClick={() => handleCreateRoom()} className="action-button create-btn">MASAYI AÇ</button>
             </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 30, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', flex: 1, display: 'flex', flexDirection: 'column' }}>
             <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
               <Users size={20} color="#4cd137" /> Arkadaşlarım
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {friends.length === 0 ? (
                  <p style={{ opacity: 0.3, fontSize: 12, textAlign: 'center', padding: 20 }}>Henüz arkadaşın yok.</p>
                ) : (
                  friends.map((f: any) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', padding: '10px 15px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                       <div style={{ position: 'relative' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4cd137, #00897b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{f.name[0]}</div>
                          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', border: '2px solid #000', background: f.status === 'online' ? '#4cd137' : f.status === 'playing' ? '#ffd700' : '#888' }} />
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{f.name}</div>
                          <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase' }}>{f.status === 'playing' ? 'OYUNDA' : f.status.toUpperCase()} • LVL {f.level}</div>
                       </div>
                       {f.status === 'playing' ? (
                          <button 
                            onClick={() => onJoinRoom(f.roomId)}
                            style={{ background: '#ffd700', border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: '#000', fontWeight: 900, cursor: 'pointer' }}
                          >KATIL</button>
                       ) : (
                          <button 
                            onClick={() => alert(`Davet ${f.name} isimli arkadaşınıza gönderildi!`)}
                            style={{ background: 'rgba(76, 209, 55, 0.1)', border: '1px solid rgba(76, 209, 55, 0.2)', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: '#4cd137', fontWeight: 900, cursor: 'pointer' }}
                          >DAVET ET</button>
                       )}
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* --- RIGHT SIDE: ROOM LIST --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 20 }}>
             {['all', 'standard', 'vip'].map(t => (
               <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                style={{
                  background: activeTab === t ? '#fff' : 'transparent',
                  color: activeTab === t ? '#000' : '#fff',
                  border: activeTab === t ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  padding: '10px 25px', borderRadius: 100, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: '0.3s',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
               >
                 {t === 'vip' && <Crown size={14} />} {t === 'all' ? 'Tüm Masalar' : t === 'vip' ? 'VIP Masalar' : 'Standart Masalar'}
               </button>
             ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filteredRooms.length === 0 ? (
               <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1.5px dashed rgba(255,255,255,0.1)' }}>
                  <Users size={48} style={{ opacity: 0.1, marginBottom: 20 }} />
                  <p style={{ opacity: 0.3 }}>Henüz uygun masa bulunamadı...</p>
               </div>
            ) : (
              filteredRooms.map(r => (
                <div 
                  key={r.id} 
                  onClick={() => onJoinRoom(r.id)}
                  className="room-card"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    borderRadius: 24, padding: 25, border: '1.5px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: '0.3s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{r.name}</h4>
                      <p style={{ fontSize: 12, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Masa #{r.id.split('-')[1]?.substring(0,4)}</p>
                    </div>
                    {r.roundBet >= 5000 && <div style={{ background: '#ffd700', color: '#000', padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 900 }}>VIP</div>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: r.roundBet >= 5000 ? '#ffd700' : '#4cd137', marginBottom: 2 }}>{r.roundBet.toLocaleString()}₺</div>
                        <div style={{ fontSize: 11, opacity: 0.4 }}>BAHİS TUTARI</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={14} color={r.playerCount >= 4 ? '#e84118' : '#4cd137'} />
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{r.playerCount}/4</span>
                       </div>
                    </div>
                  </div>
                  {r.gameState === 'playing' ? (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(232, 65, 24, 0.8)', color: '#fff', fontSize: 10, fontStyle: 'italic', fontWeight: 900, textAlign: 'center', padding: '4px', textTransform: 'uppercase' }}>
                       OYUN DEVAM EDİYOR... <button onClick={(e) => { e.stopPropagation(); onJoinRoom(r.id); }} style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '1px 6px', marginLeft: 10, fontSize: 10, fontWeight: 900, cursor: 'pointer', color: '#000' }}>İZLE</button>
                    </div>
                  ) : r.playerCount >= 4 ? (
                    <div className="playing-pulse" style={{ background: 'rgba(255,255,255,0.1)', color: '#888' }}>Masa Dolu</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .glass-overlay {
          position: fixed; inset: 0; 
          background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png');
          opacity: 0.05; pointer-events: none;
        }
        .action-button {
          padding: 20px; border-radius: 20px; border: none;
          font-weight: 900; font-size: 18px; cursor: pointer; transition: 0.3s;
          display: flex; alignItems: center; justifyContent: center; gap: 15;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .quick-play-btn {
          background: #4cd137; color: #fff;
          box-shadow: 0 10px 30px rgba(76, 209, 55, 0.4);
          position: relative; overflow: hidden;
        }
        .quick-play-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(76, 209, 55, 0.6); }
        
        .create-btn {
          background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
          color: #000;
          box-shadow: 0 8px 25px rgba(218, 165, 32, 0.3);
        }
        .create-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 12px 35px rgba(218, 165, 32, 0.5); }
        
        .custom-input {
          background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 15px; color: #fff; width: 100%; outline: none;
          transition: 0.3s;
        }
        .custom-input:focus { border-color: #ffd700; background: rgba(255,255,255,0.08); }
        
        .room-card:hover {
          transform: translateY(-5px); border-color: rgba(255,215,0,0.5) !important;
          background: rgba(255,255,255,0.08) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        .btn-shine {
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s infinite;
        }
        .playing-pulse {
          position: absolute; bottom: 0; left: 0; width: 100%;
          background: rgba(232, 65, 24, 0.2); color: #e84118;
          font-size: 10px; font-weight: 900; text-align: center;
          padding: 4px; text-transform: uppercase;
        }

        .reward-btn {
          background: #00a8ff; color: #fff;
          box-shadow: 0 10px 30px rgba(0, 168, 255, 0.4);
          margin-top: -10px;
        }
        .reward-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(0, 168, 255, 0.6); }

        .category-card {
           background: rgba(255,255,255,0.05);
           border: 1px solid rgba(255,255,255,0.1);
           border-radius: 24px; padding: 25px;
           display: flex; align-items: center; gap: 20px;
           cursor: pointer; transition: 0.3s;
           position: relative; overflow: hidden;
        }
        .category-card:hover {
           background: rgba(255,255,255,0.08);
           transform: translateY(-5px);
           border-color: rgba(255,255,255,0.2);
           box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .cat-icon {
           width: 50px; height: 50px; border-radius: 15px;
           display: flex; align-items: center; justify-content: center;
           color: #fff;
        }
        .category-card h3 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .category-card p { font-size: 12px; opacity: 0.5; margin: 0; }
        
        .cat-action {
           margin-left: auto;
           background: rgba(255,255,255,0.1);
           padding: 8px 15px; border-radius: 10px;
           font-size: 10px; font-weight: 900;
           transition: 0.3s;
        }
        .category-card:hover .cat-action {
           background: #fff; color: #000;
        }
      `}</style>
    </div>
  );
};
