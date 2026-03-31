import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = tab === 'login' ? { email, password } : { username, email, password };

    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      localStorage.setItem('gapdirik_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #022b22 0%, #01140f 100%)',
      fontFamily: '"Outfit", sans-serif'
    }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          padding: '40px 50px',
          borderRadius: 32,
          border: '1.5px solid rgba(255,215,0,0.2)',
          textAlign: 'center',
          width: 400,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <h1 style={{ color: '#ffcc00', fontSize: 42, fontWeight: 950, marginBottom: 8, letterSpacing: -1 }}>GAPDİRİK</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20, fontWeight: 500 }}>Türkiye'nin En Premium Gapdirik Deneyimi</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 25, background: 'rgba(0,0,0,0.2)', padding: 5, borderRadius: 15 }}>
           <button 
             onClick={() => { setTab('login'); setError(''); }} 
             style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: tab === 'login' ? '#ffd700' : 'transparent', color: tab === 'login' ? '#000' : '#fff', fontWeight: 800, cursor: 'pointer', transition: '0.3s' }}
           >GİRİŞ YAP</button>
           <button 
             onClick={() => { setTab('register'); setError(''); }} 
             style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: tab === 'register' ? '#ffd700' : 'transparent', color: tab === 'register' ? '#000' : '#fff', fontWeight: 800, cursor: 'pointer', transition: '0.3s' }}
           >KAYIT OL</button>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
          {error && <div style={{ background: 'rgba(232, 65, 24, 0.2)', color: '#e84118', padding: 10, borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          
          <AnimatePresence mode="popLayout">
            {tab === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <label style={{ color: '#ffcc00', fontSize: 12, fontWeight: 800, marginLeft: 12, marginBottom: 6, display: 'block' }}>KULLANICI ADI</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required={tab==='register'} style={inputStyle} placeholder="EfsaneOyuncu" />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
             <label style={{ color: '#ffcc00', fontSize: 12, fontWeight: 800, marginLeft: 12, marginBottom: 6, display: 'block' }}>E-POSTA</label>
             <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="ornek@mail.com" />
          </div>

          <div>
             <label style={{ color: '#ffcc00', fontSize: 12, fontWeight: 800, marginLeft: 12, marginBottom: 6, display: 'block' }}>ŞİFRE</label>
             <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>

          <button
            type="submit"
            className="gold-button"
            disabled={loading}
            style={{ width: '100%', padding: '16px 0', fontSize: 18, marginTop: 10, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'YÜKLENİYOR...' : (tab === 'login' ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR VE OYNA')}
          </button>

          <button
            type="button"
            onClick={() => {
               const guestId = Math.floor(1000 + Math.random() * 9000);
               onLogin({ username: `Misafir-${guestId}`, chips: 50000, isGuest: true });
            }}
            style={{ 
              width: '100%', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)', 
              borderRadius: 15, padding: '12px 0', color: '#fff', fontWeight: 800, 
              fontSize: 14, cursor: 'pointer', transition: '0.3s', marginTop: 5 
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
             HESAPSIZ (MİSAFİR) DEVAM ET
          </button>
        </form>

        <div style={{ marginTop: 25, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>G</div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>f</div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}></div>
        </div>
        
        <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Bu oyunu oynayarak kullanım koşullarını kabul etmiş sayılırsınız.</p>
      </motion.div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'rgba(0,0,0,0.3)',
  border: '2px solid rgba(255,215,0,0.1)',
  borderRadius: 15,
  padding: '14px 20px',
  color: '#fff',
  fontSize: 16,
  outline: 'none',
  transition: 'border 0.3s'
};
