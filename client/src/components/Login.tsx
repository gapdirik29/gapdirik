import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  // sekmeler: login, register, forgot
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  // adımlar: form (giriş/kayıt formu), verify (kayıt onay kodu), email (şifremi unuttum e-posta sorma), reset (kod ve yeni şifre belirleme)
  const [step, setStep] = useState<'form' | 'verify' | 'email' | 'reset'>('form');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Backend'den gelecek kod doğrulaması için alınan kod
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

  // --- LOGIN FLOW ---
  const handleLogin = async () => {
    if (!email || !password) return setError('Tüm alanları doldurun');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.unverified) {
           setMessage('Lütfen hesabınızı doğrulamak için kayıt ekranından tekrar giriş yapıp kod isteyin.');
        }
        throw new Error(data.error || 'Giriş başarısız');
      }
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER FLOW (GÜVENLİ BACKEND ONAYLI) ---
  const handleRegisterCall = async () => {
    if (!username || !email || !password) return setError('Tüm alanları doldurun');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/register-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kayıt isteği başarısız');

      setStep('verify');
      setMessage('E-posta adresinize 6 haneli bir doğrulama kodu gönderdik.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async () => {
    if (!userCode || userCode.length < 6) return setError('Doğrulama kodunu eksiksiz girin');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/register-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: userCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız');

      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD FLOW (GÜVENLİ BACKEND ONAYLI) ---
  const handleForgotCall = async () => {
    if (!email) return setError('E-posta adresinizi girin');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'E-posta bulunamadı');

      setStep('reset');
      setMessage('Şifre sıfırlama kodunuz e-postanıza gönderildi.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotExecute = async () => {
    if (!userCode || !password) return setError('Kod ve yeni şifre alanlarını doldurun');
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalıdır');
    setError(''); setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: userCode, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şifre sıfırlanamadı');

      resetStates('login');
      setMessage('Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'login') handleLogin();
    else if (tab === 'register') {
      if (step === 'form') handleRegisterCall();
      else if (step === 'verify') handleRegisterVerify();
    } else if (tab === 'forgot') {
      if (step === 'email') handleForgotCall();
      else if (step === 'reset') handleForgotExecute();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at center, #022b22 0%, #01140f 100%)',
      fontFamily: '"Outfit", sans-serif'
    }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', padding: '40px 50px',
          borderRadius: 32, border: '1.5px solid rgba(255,215,0,0.2)', textAlign: 'center',
          width: 400, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative'
        }}
      >
        <h1 style={{ color: '#ffcc00', fontSize: 42, fontWeight: 950, marginBottom: 8, letterSpacing: -1 }}>GAPDİRİK</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20, fontWeight: 500 }}>Türkiye'nin En Premium Gapdirik Deneyimi</p>

        {(tab === 'login' || tab === 'register') && step === 'form' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 25, background: 'rgba(0,0,0,0.2)', padding: 5, borderRadius: 15 }}>
             <button type="button" onClick={() => resetStates('login')} style={{ ...tabStyle(tab === 'login') }}>GİRİŞ YAP</button>
             <button type="button" onClick={() => resetStates('register')} style={{ ...tabStyle(tab === 'register') }}>KAYIT OL</button>
          </div>
        )}

        {tab === 'forgot' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
             <button type="button" onClick={() => resetStates('login')} style={{ ...tabStyle(false), flex: 'none', padding: '10px 20px' }}>GERİ</button>
             <div style={{ ...tabStyle(true), padding: '10px 0', cursor: 'default' }}>ŞİFREMİ UNUTTUM</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
          {error && <div style={{ background: 'rgba(232, 65, 24, 0.2)', color: '#e84118', padding: 10, borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          {message && <div style={{ background: 'rgba(76, 209, 55, 0.2)', color: '#4cd137', padding: 10, borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{message}</div>}
          
          <AnimatePresence mode="popLayout">
            {tab === 'register' && step === 'form' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={labelStyle}>KULLANICI ADI</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} placeholder="EfsaneOyuncu" />
              </motion.div>
            )}

            {(step === 'form' || step === 'email') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={labelStyle}>E-POSTA</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="ornek@mail.com" disabled={step !== 'form' && step !== 'email'} />
              </motion.div>
            )}

            {(step === 'form' && tab !== 'forgot') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={labelStyle}>ŞİFRE</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
              </motion.div>
            )}

            {(step === 'verify' || step === 'reset') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={labelStyle}>DOĞRULAMA KODU (6 HANE)</label>
                <input type="text" value={userCode} onChange={e => setUserCode(e.target.value)} maxLength={6} required style={{ ...inputStyle, textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: 'bold' }} placeholder="123456" />
              </motion.div>
            )}

            {step === 'reset' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={labelStyle}>YENİ ŞİFRE</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="Göndereceğimiz yeni şifre" />
              </motion.div>
            )}
          </AnimatePresence>

          {tab === 'login' && step === 'form' && (
            <div style={{ textAlign: 'right' }}>
              <span onClick={() => resetStates('forgot')} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Şifremi Unuttum</span>
            </div>
          )}

          <button type="submit" className="gold-button" disabled={loading} style={{ width: '100%', padding: '16px 0', fontSize: 18, marginTop: 10, cursor: loading ? 'wait' : 'pointer', border: 'none', borderRadius: 15, background: '#ffd700', color: '#000', fontWeight: 'bold' }}>
            {loading ? 'YÜKLENİYOR...' : 
             step === 'verify' ? 'DOĞRULA' :
             step === 'reset' ? 'YENİ ŞİFREYİ ONAYLA' :
             tab === 'forgot' ? 'KOD GÖNDER' :
             tab === 'login' ? 'GİRİŞ YAP' : 'ONAY KODU GÖNDER VE ÜYE OL'}
          </button>

          {tab === 'login' && step === 'form' && (
            <button
              type="button"
              onClick={() => onLogin({ username: `Misafir-${Math.floor(1000 + Math.random() * 9000)}`, chips: 50000, isGuest: true })}
              style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 15, padding: '12px 0', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: '0.3s', marginTop: 5 }}
            >
               HESAPSIZ (MİSAFİR) DEVAM ET
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}

const tabStyle = (active: boolean) => ({
  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
  background: active ? '#ffd700' : 'transparent', color: active ? '#000' : '#fff',
  fontWeight: 800, cursor: 'pointer', transition: '0.3s' as const
});

const inputStyle = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,215,0,0.1)',
  borderRadius: 15, padding: '14px 20px', color: '#fff', fontSize: 16, outline: 'none', transition: 'border 0.3s'
};

const labelStyle = { color: '#ffcc00', fontSize: 12, fontWeight: 800, marginLeft: 12, marginBottom: 6, display: 'block' };
