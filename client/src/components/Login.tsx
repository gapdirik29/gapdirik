import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight, Ghost, Zap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [step, setStep] = useState<'form' | 'verify' | 'email' | 'reset'>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userCode, setUserCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetStates = (newTab: 'login' | 'register' | 'forgot') => {
    setTab(newTab);
    setStep(newTab === 'forgot' ? 'email' : 'form');
    setError('');
    setMessage('');
    setUserCode('');
  };

  const handleLogin = async () => {
    if (!email || !password) return setError('Lütfen tüm alanları doldurun.');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://gapdirik-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı.');
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCall = async () => {
    if (!username || !email || !password) return setError('Tüm alanları doldurun!');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://gapdirik-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/register-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: email.toLowerCase().trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem sırasında bir hata oluştu');
      setStep('verify');
      setMessage('E-posta adresinize 6 haneli kod gönderildi.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async () => {
    if (!userCode || userCode.length < 6) return setError('Kodu eksiksiz girin.');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://gapdirik-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/register-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code: userCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız.');
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root" style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      {/* --- PREMİUM ARKA PLAN (Lüks Derinlik) --- */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--accent-gold-glow) 0%, transparent 70%)', opacity: 0.3 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(0, 210, 255, 0.1) 0%, transparent 70%)', opacity: 0.3 }} />
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: 440, padding: '40px 30px', textAlign: 'center', position: 'relative' }}
      >
        {/* LOGO BÖLÜMÜ */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #ffcc00, #ff9500)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', boxShadow: '0 8px 20px var(--accent-gold-glow)' }}>
             <Zap size={32} color="#000" fill="#000" />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 950, letterSpacing: -1, color: 'var(--accent-gold)', margin: 0 }}>GAPDİRİK</h1>
          <p style={{ fontSize: 13, opacity: 0.5, fontWeight: 600 }}>TÜRKİYE'NİN EN PREMİUM 101 DENEYİMİ</p>
        </div>

        {/* SEKME SEÇİCİ (GİRİŞ / KAYIT) */}
        {(tab === 'login' || tab === 'register') && step === 'form' && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 5, borderRadius: 18, marginBottom: 25, border: '1px solid var(--glass-border)' }}>
             <button onClick={() => resetStates('login')} style={tabStyle(tab === 'login')}>GİRİŞ</button>
             <button onClick={() => resetStates('register')} style={tabStyle(tab === 'register')}>KAYIT</button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); tab === 'login' ? handleLogin() : step === 'form' ? handleRegisterCall() : handleRegisterVerify(); }} style={{ textAlign: 'left' }}>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              {error && <div className="dynamic-toast" style={{ position: 'relative', width: '100%', top: 0, padding: 12, marginBottom: 10, background: 'rgba(255,50,50,0.2)', color: '#ff4444', borderRadius: 14 }}>{error}</div>}
              {message && <div className="dynamic-toast" style={{ position: 'relative', width: '100%', top: 0, padding: 12, marginBottom: 10, background: 'rgba(76,209,55,0.2)', color: '#4cd137', borderRadius: 14 }}>{message}</div>}

              {tab === 'register' && step === 'form' && (
                <div className="input-group">
                   <label style={labelStyle}><UserIcon size={14} /> KULLANICI ADI</label>
                   <input type="text" className="premium-input-custom" value={username} onChange={e => setUsername(e.target.value)} placeholder="Örn: MasterKing" required />
                </div>
              )}

              {step === 'form' && (
                <div className="input-group">
                   <label style={labelStyle}><Mail size={14} /> E-POSTA ADRESİ</label>
                   <input type="email" className="premium-input-custom" value={email} onChange={e => setEmail(e.target.value)} placeholder="isminiz@mail.com" required />
                </div>
              )}

              {step === 'form' && (
                <div className="input-group">
                   <label style={labelStyle}><Lock size={14} /> ŞİFRE</label>
                   <input type="password" className="premium-input-custom" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
              )}

              {step === 'verify' && (
                <div className="input-group">
                   <label style={labelStyle}><ShieldCheck size={14} /> DOĞRULAMA KODU</label>
                   <input type="text" className="premium-input-custom" maxLength={6} value={userCode} onChange={e => setUserCode(e.target.value)} placeholder="123456" style={{ textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 900 }} required />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <button type="submit" className="btn-premium" disabled={loading} style={{ width: '100%', marginTop: 25, height: 55, fontSize: 16 }}>
             {loading ? 'HAZIRLANIYOR...' : step === 'verify' ? 'HESABI ONAYLA' : tab === 'login' ? 'GİRİŞ YAP' : 'ÜYELİĞİ TAMAMLA'}
             {!loading && <ArrowRight size={20} />}
          </button>

          {tab === 'login' && (
            <button type="button" onClick={() => onLogin({ username: `Misafir-${Math.floor(1000 + Math.random() * 9000)}`, chips: 50000, isGuest: true })} className="btn-premium" style={{ width: '100%', marginTop: 12, background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
               <Ghost size={18} /> MİSAFİR OLARAK GİR
            </button>
          )}

          {tab === 'login' && (
             <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, opacity: 0.5 }}>
               Şifreni mi unuttun? <span style={{ color: 'var(--accent-gold)', fontWeight: 800, cursor: 'pointer' }} onClick={() => resetStates('forgot')}>YARDIM AL</span>
             </p>
          )}
        </form>
      </motion.div>

      <style>{`
        .premium-input-custom {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid var(--glass-border);
          border-radius: 16px;
          padding: 16px 20px;
          color: #fff;
          font-size: 15px;
          transition: 0.3s;
        }
        .premium-input-custom:focus {
          border-color: var(--accent-gold);
          background: rgba(255,215,0,0.05);
          box-shadow: 0 0 15px var(--accent-gold-glow);
        }
      `}</style>
    </div>
  );
}

const tabStyle = (active: boolean) => ({
  flex: 1, padding: '12px 0', borderRadius: 14, border: 'none',
  background: active ? 'var(--accent-gold)' : 'transparent',
  color: active ? '#000' : '#888',
  fontWeight: 900, fontSize: 13, cursor: 'pointer', transition: '0.3s'
});

const labelStyle = { 
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 10, fontWeight: 950, color: 'var(--accent-gold)', 
  marginBottom: 8, marginLeft: 5, letterSpacing: 1 
};
