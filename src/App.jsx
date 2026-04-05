import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Building2, Map, ChevronRight, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import { CustomCursor, Field, LS, pageVariants } from './components';
import HostDashboard from './HostDashboard';
import UserDashboard from './UserDashboard';
import './index.css';

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
const AuthPage = ({ onLogin }) => {
  const [role, setRole] = useState('user');
  const [isLogin, setIsLogin] = useState(false);
  const [data, setData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const upd = k => e => setData(d => ({ ...d, [k]: e.target.value }));

  const switchRole = r => { setRole(r); setData({ username:'', email:'', password:'', confirmPassword:'' }); };
  const switchTab = login => { setIsLogin(login); setData({ username:'', email:'', password:'', confirmPassword:'' }); };

  const submit = async () => {
    setLoading(true);
    if (isLogin) {
      if (!data.email || !data.password) { alert('Fill all fields'); setLoading(false); return; }

      // Try backend first
      const res = await api.login({ email: data.email, password: data.password, role });

      if (res && res.token && res.user) {
        // Backend login success
        const u = { ...res.user, id: res.user._id || res.user.id, role };
        LS.set('tg_token', res.token);
        LS.set('tg_user', u);
        onLogin(u, res.token);
      } else {
        // Backend offline — use localStorage accounts
        const localUsers = LS.get('tg_local_users', []);
        const found = localUsers.find(
          u => (u.email.toLowerCase() === data.email.toLowerCase()) && u.role === role
        );
        if (found && found.password === data.password) {
          const fakeToken = `local_${found.id}`;
          LS.set('tg_token', fakeToken);
          LS.set('tg_user', found);
          onLogin(found, fakeToken);
        } else if (res?.error && res.error !== 'backend_offline') {
          alert(res.error);
        } else if (!found) {
          alert(res?.error === 'backend_offline'
            ? 'Backend is offline. Register once to create a local account first.'
            : 'Account not found. Please register first.');
        } else {
          alert('Incorrect password.');
        }
      }
    } else {
      if (!data.username || !data.email || !data.password || data.password !== data.confirmPassword) {
        alert('Check all fields & passwords must match'); setLoading(false); return;
      }

      // Try backend register first
      const res = await api.register({ username: data.username, email: data.email, password: data.password, role });

      if (res && !res.error) {
        alert('Account created! Log in now.');
        switchTab(true);
      } else {
        // Backend offline — save locally
        const localUsers = LS.get('tg_local_users', []);
        const exists = localUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase() && u.role === role);
        if (exists) { alert('Email already registered locally. Log in instead.'); setLoading(false); return; }
        const newUser = {
          id: `${role}_${Date.now()}`,
          role,
          username: data.username,
          email: data.email,
          password: data.password,
          kyc: { submitted: false },
        };
        LS.set('tg_local_users', [...localUsers, newUser]);
        alert(res?.error === 'backend_offline'
          ? '✅ Account saved locally (backend offline). Log in now!'
          : '✅ Account created! Log in now.');
        switchTab(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-grid" />
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>
      <motion.div className="auth-card" initial={{ opacity:0, scale:0.94, y:30 }} animate={{ opacity:1, scale:1, y:0 }} transition={{ type:'spring', stiffness:100, damping:20, delay:0.1 }}>
        <motion.div key={role} className="auth-logo-wrap" initial={{ scale:0.6, rotate:-20, opacity:0 }} animate={{ scale:1, rotate:0, opacity:1 }} transition={{ type:'spring', stiffness:200, damping:18 }}>
          {role === 'host' ? <Building2 size={30} color="#fff" strokeWidth={2} /> : <Map size={30} color="#fff" strokeWidth={2} />}
        </motion.div>
        <div className="text-center mb-6">
          <h1 style={{ fontSize:'1.75rem', fontWeight:800, marginBottom:6 }}>Trip-Genie</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', fontWeight:500 }}>Your smart travel ecosystem</p>
        </div>
        <div className="role-toggle">
          <button className={`role-btn ${role==='user'?'active':''}`} onClick={() => switchRole('user')}><Map size={15} /> Traveler</button>
          <button className={`role-btn ${role==='host'?'active':''}`} onClick={() => switchRole('host')}><Building2 size={15} /> Host</button>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${!isLogin?'active':''}`} onClick={() => switchTab(false)}>Register</button>
          <button className={`auth-tab ${isLogin?'active':''}`} onClick={() => switchTab(true)}>Log In</button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={`${role}-${isLogin}`} variants={pageVariants} initial="hidden" animate="visible" exit="exit">
            {!isLogin && <Field label="Username" value={data.username} onChange={upd('username')} placeholder="johnsmith" />}
            <Field label="Email Address" type="email" value={data.email} onChange={upd('email')} placeholder="hello@example.com" />
            <Field label="Password" type="password" value={data.password} onChange={upd('password')} placeholder="••••••••" />
            {!isLogin && <Field label="Confirm Password" type="password" value={data.confirmPassword} onChange={upd('confirmPassword')} placeholder="••••••••" />}
            <motion.button className="btn-auth" onClick={submit} disabled={loading} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
              {loading ? 'Please wait…' : isLogin ? `Enter ${role==='host'?'Host':'Traveler'} Dashboard` : `Create ${role==='host'?'Host':'Traveler'} Account`}
              <ChevronRight size={18} />
            </motion.button>
            <p style={{ textAlign:'center', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'1.25rem' }}>
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <button onClick={() => switchTab(!isLogin)} style={{ color:'var(--cyan)', fontWeight:700, background:'none', padding:0 }}>
                {isLogin ? 'Register' : 'Log in'}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page load
  useEffect(() => {
    const savedToken = LS.get('tg_token', null);
    const savedUser = LS.get('tg_user', null);
    if (savedToken && savedUser) {
      // If local token, restore immediately without hitting backend
      if (savedToken.startsWith('local_')) {
        setToken(savedToken);
        setCurrentUser({ ...savedUser, id: savedUser.id });
        setLoading(false);
        return;
      }
      // Try to verify JWT token with backend (with 3s timeout from api.js)
      api.me(savedToken).then(res => {
        if (res && (res._id || res.id)) {
          setToken(savedToken);
          setCurrentUser({ ...savedUser, id: res._id || res.id, kyc: res.kyc });
        } else if (res?.error === 'backend_offline') {
          // Backend offline but we have saved session — restore it
          setToken(savedToken);
          setCurrentUser(savedUser);
        } else {
          LS.del('tg_token'); LS.del('tg_user');
        }
        setLoading(false);
      }).catch(() => {
        // Restore from localStorage anyway
        setToken(savedToken);
        setCurrentUser(savedUser);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (user, t) => {
    const u = { ...user, id: user._id || user.id };
    setCurrentUser(u);
    setToken(t);
    LS.set('tg_token', t);
    LS.set('tg_user', u);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    LS.del('tg_token');
    LS.del('tg_user');
  };

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-950)' }}>
      <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
        <Sprout size={36} color="var(--cyan)" />
      </motion.div>
    </div>
  );

  return (
    <>
      <CustomCursor />
      <Router>
        <Routes>
          <Route path="/" element={!currentUser
            ? <AuthPage onLogin={handleLogin} />
            : <Navigate to={`/${currentUser.role}`} />} />
          <Route path="/host" element={currentUser?.role === 'host'
            ? <HostDashboard user={currentUser} token={token} onLogout={handleLogout} />
            : <Navigate to="/" />} />
          <Route path="/user" element={currentUser?.role === 'user'
            ? <UserDashboard user={currentUser} token={token} onLogout={handleLogout} />
            : <Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}
