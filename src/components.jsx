import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  Building2, Map, UploadCloud, MessageCircle, FileBadge, Check, CheckCircle2,
  ChevronRight, CalendarDays, Camera, File, LogOut, MapPin, Tent, Hotel,
  Sprout, ArrowLeft, UserCircle, Search, Upload, Inbox, Star, Shield, Globe,
  Send, X, CalendarCheck, Hash, Phone as PhoneIcon, Utensils, Navigation,
  AlertTriangle, CloudLightning, Thermometer, Car, Train, Plane, Users,
  PlusCircle, Trash2, Eye, Coffee, Wind, Sun, CloudRain, Snowflake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import './index.css';

const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};
const cardVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } },
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ─── CUSTOM CURSOR ───────────────────────────────────────────────────────────
const CustomCursor = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return (
    <>
      <motion.div className="fixed pointer-events-none z-[9999] flex items-center justify-center"
        animate={{ x: pos.x - 14, y: pos.y - 14 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.08 }}
        style={{ top: 0, left: 0, color: '#22d3ee', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }}>
        <Sprout size={22} strokeWidth={2.5} />
      </motion.div>
      <motion.div className="fixed pointer-events-none z-[9998] rounded-full"
        animate={{ x: pos.x - 22, y: pos.y - 22 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        style={{ top: 0, left: 0, width: 44, height: 44, background: 'rgba(34,211,238,0.12)', filter: 'blur(12px)' }} />
    </>
  );
};

// ─── FIELD ───────────────────────────────────────────────────────────────────
const Field = ({ label, type = 'text', value, onChange, placeholder, min }) => (
  <div className="form-field">
    <label className="form-label">{label}</label>
    {type === 'textarea'
      ? <textarea className="form-textarea" value={value} onChange={onChange} placeholder={placeholder} />
      : <input type={type} min={min} className="form-input" value={value} onChange={onChange} placeholder={placeholder} />
    }
  </div>
);

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────
const FileUpload = ({ label, icon: Icon, onFilesSelected, isBox = false }) => {
  const [fileNames, setFileNames] = useState([]);
  const onChange = (e) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files).slice(0, 5);
    setFileNames(files.map(f => f.name));
    const readers = files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => onFilesSelected && onFilesSelected(urls, files.map(f => f.name)));
  };
  const display = fileNames.length > 0 ? `${fileNames.length} file(s) selected` : label;
  if (isBox) return (
    <div className={`upload-box ${fileNames.length > 0 ? 'has-file' : ''} relative`}>
      <input type="file" className="absolute inset-0 opacity-0 z-10" style={{ cursor: 'pointer', width: '100%', height: '100%' }} multiple onChange={onChange} accept="image/*" />
      <div className="upload-box-icon flex justify-center">
        {fileNames.length > 0 ? <CheckCircle2 size={40} color="var(--emerald)" /> : <Icon size={40} />}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: fileNames.length > 0 ? 'var(--emerald)' : 'var(--text-secondary)' }}>
        {fileNames.length > 0 ? `✓ ${display}` : label}
      </div>
      {fileNames.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Click to browse</div>}
    </div>
  );
  return (
    <div className="relative" style={{ width: '100%' }}>
      <input type="file" className="absolute inset-0 opacity-0 z-10 cursor-pointer" multiple onChange={onChange} accept="image/*" />
      <motion.div whileHover={{ scale: 1.01 }} className="form-input flex items-center gap-3"
        style={{ borderStyle: 'dashed', color: fileNames.length > 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
        <Icon size={16} /><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{display}</span>
      </motion.div>
    </div>
  );
};

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const Sidebar = ({ title, icon: Icon, navItems, activeTab, setActiveTab, onLogout, user }) => (
  <aside className="sidebar">
    <div className="sidebar-logo">
      <div className="sidebar-logo-icon"><Icon size={18} color="#fff" strokeWidth={2} /></div>
      <div>
        <div className="sidebar-logo-text">Trip-Genie</div>
        <div className="sidebar-logo-sub">{title}</div>
      </div>
    </div>
    <nav className="sidebar-nav">
      {navItems.map(({ key, label, icon: NavIcon, badge }) => (
        <motion.button key={key} className={`sidebar-nav-item ${activeTab === key ? 'active' : ''}`}
          onClick={() => setActiveTab(key)} whileTap={{ scale: 0.97 }}>
          <NavIcon size={17} /><span>{label}</span>
          {badge > 0 && <span className="sidebar-nav-badge">{badge}</span>}
        </motion.button>
      ))}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-user">
        <div className="sidebar-avatar">{(user?.username?.[0] || '?').toUpperCase()}</div>
        <div>
          <div className="sidebar-user-name">{user?.username || 'User'}</div>
          <div className="sidebar-user-role">{title}</div>
        </div>
      </div>
      <button className="btn-logout" onClick={onLogout}><LogOut size={16} /> Sign Out</button>
    </div>
  </aside>
);

// ─── CHAT MODAL ──────────────────────────────────────────────────────────────
const ChatModal = ({ chat, currentUser, onSend, onClose, onAcceptOffer, onConfirm }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages]);
  if (!chat) return null;

  const isHost = currentUser.role === 'host';
  const isGroupChat = chat.isGroup;
  const myMember = isGroupChat ? chat.groupMembers?.find(m => m.userId === currentUser.id) : null;
  const alreadyAccepted = isGroupChat ? chat.offerAcceptedBy?.includes(currentUser.id) : false;
  const allAccepted = isGroupChat && chat.groupMembers?.every(m => m.accepted);

  const send = () => {
    if (!text.trim()) return;
    onSend(chat._id, text.trim());
    setText('');
  };

  const headerName = isGroupChat
    ? `Group Chat – ${chat.placeName}`
    : isHost ? (chat.userDetails?.name || 'Traveler') : 'Host';

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[1000] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="content-card"
          style={{ width: '100%', maxWidth: 520, margin: '1rem', padding: 0, overflow: 'hidden', height: 580, display: 'flex', flexDirection: 'column' }}
          initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: '0.85rem', background: isGroupChat ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : undefined }}>
                {isGroupChat ? <Users size={16} /> : headerName[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{headerName}</div>
                {isGroupChat && <div style={{ fontSize: '0.7rem', color: 'var(--cyan)' }}>{chat.groupMembers?.length} members • {chat.discountApplied ? '10% OFF Applied ✓' : 'Group Discount Available'}</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>

          {/* Group offer banner */}
          {isGroupChat && !chat.confirmed && (
            <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.2))', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--violet)', fontWeight: 700 }}>
                🎁 Group Offer: 10% Off if all {chat.groupMembers?.length} members confirm!
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Accepted: {chat.offerAcceptedBy?.length || 0}/{chat.groupMembers?.length}
                </div>
              </div>
              {!isHost && !alreadyAccepted && (
                <motion.button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={() => onAcceptOffer(chat._id)} whileTap={{ scale: 0.95 }}>
                  Accept Offer
                </motion.button>
              )}
              {!isHost && alreadyAccepted && <span style={{ color: 'var(--emerald)', fontSize: '0.78rem', fontWeight: 700 }}>✓ You accepted</span>}
              {isHost && allAccepted && !chat.hostConfirmed && (
                <motion.button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={() => onConfirm(chat._id, true, Math.round(chat.placePrice * 0.9))} whileTap={{ scale: 0.95 }}>
                  Confirm 10% Off
                </motion.button>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!chat.messages || chat.messages.length === 0) && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2rem' }}>No messages yet.</div>
            )}
            {(chat.messages || []).map((msg, i) => {
              const mine = msg.senderId === currentUser.id;
              if (msg.isSystem) return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--violet)', fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{msg.text}</span>
                </div>
              );
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {!mine && isGroupChat && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>{msg.senderName}</div>}
                  <div style={{ maxWidth: '72%', padding: '8px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? 'linear-gradient(135deg,var(--cyan),var(--violet))' : 'var(--bg-800)', color: '#fff', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Confirm button for host (single chat) */}
          {isHost && !isGroupChat && !chat.confirmed && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--glass-border)' }}>
              <motion.button className="btn-secondary" style={{ width: '100%', padding: '8px' }}
                onClick={() => onConfirm(chat._id, false)} whileTap={{ scale: 0.97 }}>
                <Check size={15} /> Confirm Booking
              </motion.button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8 }}>
            <input type="text" className="form-input" style={{ flex: 1, margin: 0 }} placeholder="Type a message…"
              value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <motion.button className="btn-primary" style={{ padding: '0 18px' }} onClick={send} whileTap={{ scale: 0.95 }}>
              <Send size={16} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export { CustomCursor, Field, FileUpload, Sidebar, ChatModal, LS, pageVariants, cardVariants };
