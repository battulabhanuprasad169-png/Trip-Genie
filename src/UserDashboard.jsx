import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Map, Shield, FileBadge, CalendarDays, CalendarCheck, MessageCircle, AlertTriangle,
  Check, CheckCircle2, ChevronRight, ArrowLeft, MapPin, Search, Star, Hotel, Tent,
  Globe, UserCircle, Camera, Send, CloudLightning, Car, Train, Plane, Utensils,
  Navigation, Thermometer, Wind, Sun, CloudRain, Snowflake, X, PlusCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import { Sidebar, Field, FileUpload, ChatModal, LS, pageVariants, cardVariants } from './components';

const INITIAL_PLACES = [
  { _id: 'p1', name: 'Taj Mahal', type: 'Famous Landmark', location: 'Agra, Uttar Pradesh', isHost: false, price: null, rating: 4.9, images: [] },
  { _id: 'p2', name: 'Royal Rajasthan Palace', type: 'Famous Landmark', location: 'Jaipur, Rajasthan', isHost: false, price: null, rating: 4.8, images: [] },
  { _id: 'p3', name: 'Serene Tea Garden Stay', type: 'Host Property', location: 'Munnar, Kerala', isHost: true, hostId: 'host_demo', hostPhone: '+91 98450 12340', price: 2500, rating: 4.7, slots: 5, images: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop'], foodMenu: [], mustVisit: [] },
  { _id: 'p4', name: 'Riverside Camping', type: 'Host Experience', location: 'Rishikesh, Uttarakhand', isHost: true, hostId: 'host_demo', hostPhone: '+91 98450 12340', price: 1800, rating: 4.9, slots: 8, images: ['https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=400&h=300&fit=crop'], foodMenu: [], mustVisit: [] },
  { _id: 'p5', name: 'Goa Beach Villa', type: 'Host Property', location: 'Baga, Goa', isHost: true, hostId: 'host_demo2', hostPhone: '+91 90001 99900', price: 5000, rating: 4.6, slots: 2, images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop'], foodMenu: [], mustVisit: [] },
];

export default function UserDashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('book');
  const [places, setPlaces] = useState(INITIAL_PLACES);
  const [chats, setChats] = useState([]);
  const [openChatId, setOpenChatId] = useState(null);
  const [bookStep, setBookStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [transport, setTransport] = useState(null);
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [emergencySent, setEmergencySent] = useState(false);
  const [foodSelections, setFoodSelections] = useState({});

  const profile = user.kyc || {};
  // Use a persistent per-user flag — KYC asked ONLY on very first login
  const kycDoneKey = `kyc_done_${user.id}`;
  const kycAlreadyDone = !!LS.get(kycDoneKey, false) || !!profile.submitted;
  const isNewUser = !kycAlreadyDone;

  // Redirect to KYC only if this user has never submitted it before
  useEffect(() => {
    if (isNewUser) setActiveTab('profile');
    // else always open on book tab
  }, []);

  const loadPlaces = useCallback(async () => {
    const data = await api.getPlaces();
    if (Array.isArray(data) && data.length > 0) setPlaces([...INITIAL_PLACES.filter(p => !p.isHost), ...data]);
    else setPlaces(INITIAL_PLACES);
  }, []);

  const loadChats = useCallback(async () => {
    const data = await api.getUserChats(user.id);
    if (Array.isArray(data)) setChats(data);
  }, [user.id]);

  useEffect(() => {
    loadPlaces();
    loadChats();
    const iv = setInterval(loadChats, 5000);
    return () => clearInterval(iv);
  }, [loadPlaces, loadChats]);

  // Load weather when a place is selected
  useEffect(() => {
    if (selectedPlace?.location) {
      api.getWeather(selectedPlace.location).then(setWeather);
    }
  }, [selectedPlace]);

  // KYC
  const [kycForm, setKycForm] = useState({ name: profile.name || user.username || '', area: profile.area || '', work: profile.work || '', phone: profile.phone || '', email: profile.email || '', profilePhoto: '', aadhaar: '' });
  const updK = k => e => setKycForm(d => ({ ...d, [k]: e.target.value }));
  const submitKyc = async () => {
    if (!kycForm.name || !kycForm.phone) { alert('Name and phone required'); return; }
    await api.saveKyc(token, kycForm);
    // Persist KYC done flag so it's never asked again for this user
    LS.set(kycDoneKey, true);
    user.kyc = { ...kycForm, submitted: true };
    LS.set('tg_user', { ...LS.get('tg_user'), kyc: { ...kycForm, submitted: true } });
    alert('KYC saved! Welcome aboard.');
    setActiveTab('book');
  };

  const sendMessage = async (chatId, text) => {
    await api.sendMessage(token, chatId, text, user.username);
    loadChats();
  };

  const acceptOffer = async (chatId) => {
    const chat = chats.find(c => c._id === chatId);
    const me = chat?.groupMembers?.find(m => m.userId === user.id);
    await api.acceptOffer(token, chatId, me?.userName || user.username);
    loadChats();
  };

  const startBooking = async () => {
    if (isNewUser) { alert('Complete your profile & KYC first!'); setActiveTab('profile'); return; }
    const bookingId = `TG-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
    const today = new Date();
    const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const scheduleDates = `${fmt(new Date(today.getTime() + 7*86400000))} – ${fmt(new Date(today.getTime() + 10*86400000))}`;
    const result = await api.createChat(token, {
      placeId: selectedPlace._id,
      placeName: selectedPlace.name,
      placeLocation: selectedPlace.location,
      placePrice: selectedPlace.price,
      hostId: selectedPlace.hostId,
      userDetails: { ...profile, userId: user.id },
      scheduleDates,
    });
    if (result.error) { alert(result.error); return; }
    if (result.grouped) alert('🎉 You\'ve been added to a GROUP chat with 2 other travelers! Accept the offer for 10% off.');
    else alert('Inquiry sent! Host will confirm shortly.');
    setBookStep(1); setSearch(''); loadChats();
  };

  const sendEmergency = async () => {
    if (!emergencyMsg.trim()) return;
    const activeChat = chats.find(c => c.confirmed) || chats[0];
    if (!activeChat) { alert('No active booking found'); return; }
    await api.sendEmergency(token, activeChat._id, emergencyMsg);
    setEmergencySent(true);
  };

  const saveFoodSelection = async (chatId) => {
    const sel = foodSelections[chatId] || {};
    const items = Object.values(sel).filter(v => v.qty > 0);
    const total = items.reduce((a, v) => a + v.price * v.qty, 0);
    await api.saveFoodSelection(token, chatId, items, total);
    loadChats();
    alert('Food selection saved!');
  };

  const filteredPlaces = useMemo(() => {
    if (!search) return places;
    const q = search.toLowerCase();
    return places.filter(p => p.location.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [places, search]);

  const confirmedBookings = chats.filter(c => c.confirmed);

  const navItems = [
    { key: 'profile', label: 'My Profile & KYC', icon: Shield },
    { key: 'book', label: 'Plan & Book', icon: CalendarDays },
    { key: 'bookings', label: 'My Bookings', icon: CalendarCheck, badge: confirmedBookings.length },
    { key: 'chats', label: 'Messages', icon: MessageCircle, badge: chats.filter(c => !c.confirmed).length },
    { key: 'emergency', label: 'Emergency', icon: AlertTriangle },
  ];

  const openChat = chats.find(c => c._id === openChatId) || null;

  // Weather icon helper
  const WeatherIcon = ({ condition }) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('snow')) return <Snowflake size={32} color="#60a5fa" />;
    if (c.includes('rain') || c.includes('storm')) return <CloudRain size={32} color="#60a5fa" />;
    if (c.includes('cloud') || c.includes('fog') || c.includes('haz')) return <Wind size={32} color="#94a3b8" />;
    return <Sun size={32} color="#fbbf24" />;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar title="Traveler Portal" icon={Map} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} user={user} />
      {openChat && <ChatModal chat={openChat} currentUser={user} onSend={sendMessage} onClose={() => setOpenChatId(null)} onAcceptOffer={acceptOffer} onConfirm={() => {}} />}

      <main className="dashboard-main">
        <AnimatePresence mode="wait">

          {/* ── PROFILE / KYC ── */}
          {activeTab === 'profile' && (
            <motion.div key="profile" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
              <div className="page-header"><h2 className="page-title">Identity & KYC</h2><p className="page-subtitle">Submit once. Always active.</p></div>
              <motion.div className="content-card" variants={cardVariants} initial="hidden" animate="visible">
                {profile.submitted ? (
                  <div className="alert alert-success flex items-center gap-4" style={{ padding: '1.5rem' }}>
                    <CheckCircle2 size={28} />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>Profile Verified!</div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>KYC is active. Name: {profile.name} | Phone: {profile.phone}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-section-title"><div className="icon-badge"><UserCircle size={16} color="#fff" /></div>Personal Details</div>
                    <div className="form-grid form-grid-2">
                      <Field label="Full Name" value={kycForm.name} onChange={updK('name')} />
                      <Field label="Locality / Area" value={kycForm.area} onChange={updK('area')} placeholder="Your city" />
                      <Field label="Profession" value={kycForm.work} onChange={updK('work')} />
                      <Field label="Phone Number" type="tel" value={kycForm.phone} onChange={updK('phone')} />
                      <Field label="Email" type="email" value={kycForm.email} onChange={updK('email')} />
                    </div>
                    <div className="divider" />
                    <div className="card-section-title"><div className="icon-badge"><FileBadge size={16} color="#fff" /></div>KYC Documents</div>
                    <div className="space-y-4">
                      <FileUpload label="Profile Photo" icon={Camera} onFilesSelected={([url]) => setKycForm(d => ({ ...d, profilePhoto: url }))} />
                      <FileUpload label="Aadhaar Card" icon={FileBadge} onFilesSelected={([url]) => setKycForm(d => ({ ...d, aadhaar: url }))} />
                    </div>
                    <motion.button className="btn-submit" onClick={submitKyc} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Shield size={18} /> Submit Profile & KYC
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── BOOK ── */}
          {activeTab === 'book' && (
            <motion.div key={`book-${bookStep}`} variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
              <div className="page-header">
                <h2 className="page-title">{bookStep === 1 ? 'Find Your Escape' : bookStep === 2 ? 'Discover Places' : 'Place Details'}</h2>
                <div className="step-indicator mt-3">
                  {['Search','Discover','Book'].map((s, i) => {
                    const n = i+1, cls = n < bookStep ? 'done' : n === bookStep ? 'current' : 'future';
                    return (
                      <React.Fragment key={s}>
                        {i > 0 && <div className={`step-line ${bookStep > n-1 ? 'done':''}`} />}
                        <div className={`step-dot ${cls}`}>{n < bookStep ? <Check size={14} /> : n}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {isNewUser && !profile.submitted ? (
                <div className="alert alert-warning flex items-center gap-3">
                  <FileBadge size={20} />
                  <div><div style={{ fontWeight: 700 }}>Profile Incomplete</div><div style={{ fontSize: '0.875rem' }}>Complete KYC first.</div></div>
                </div>
              ) : bookStep === 1 ? (
                <motion.div className="search-panel" variants={cardVariants} initial="hidden" animate="visible">
                  <div className="card-section-title"><div className="icon-badge"><Search size={16} color="#fff" /></div>Where to?</div>
                  <div className="form-field">
                    <label className="form-label">Search location</label>
                    <div className="relative">
                      <input type="text" className="form-input" style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Goa, Kerala, Rishikesh…" />
                      <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <motion.button className="btn-submit" onClick={() => setBookStep(2)} whileTap={{ scale: 0.98 }}>Explore Now</motion.button>
                </motion.div>
              ) : bookStep === 2 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button className="btn-back" onClick={() => setBookStep(1)}><ArrowLeft size={16} /> Back</button>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{filteredPlaces.length} results</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {filteredPlaces.map((p, i) => (
                      <motion.div key={p._id} className="place-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}
                        onClick={() => { setSelectedPlace(p); setBookStep(3); }}>
                        {p.images?.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                            {p.images.slice(0,3).map((img, idx) => <img key={idx} src={img} alt="" style={{ width: 44, height: 44, objectFit:'cover', borderRadius: 6, border:'1px solid var(--glass-border)' }} />)}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`place-badge ${p.isHost ? 'host' : 'map'}`}>{p.type}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 700 }}><Star size={11} fill="currentColor" style={{ display: 'inline' }} /> {p.rating}</div>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {p.location}</div>
                        <div className="flex items-center justify-between mt-2">
                          {p.isHost
                            ? <div><div style={{ fontWeight: 800, color: 'var(--cyan)', fontSize: '1rem' }}>₹{p.price?.toLocaleString('en-IN')}</div><div style={{ fontSize: '0.7rem', color: p.slots > 0 ? 'var(--emerald)':'var(--danger)', fontWeight: 600 }}>{p.slots > 0 ? `${p.slots} slots`:'Sold Out'}</div></div>
                            : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle:'italic' }}>Public Landmark</div>
                          }
                          <span style={{ fontSize: '0.75rem', color: 'var(--violet)', fontWeight: 700 }}>View →</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : bookStep === 3 && selectedPlace ? (
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                  <button className="btn-back" onClick={() => setBookStep(2)} style={{ marginBottom: 16 }}><ArrowLeft size={16} /> Back</button>
                  <div className="detail-hero">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <span className={`place-badge ${selectedPlace.isHost ? 'host':'map'}`}>{selectedPlace.type}</span>
                      {selectedPlace.isHost && <span className="place-badge" style={{ background: selectedPlace.slots > 0 ? 'rgba(52,211,153,0.1)':'rgba(248,113,113,0.1)', color: selectedPlace.slots > 0 ? 'var(--emerald)':'var(--danger)', boxShadow: 'none' }}>{selectedPlace.slots > 0 ? `${selectedPlace.slots} Slots`:'Sold Out'}</span>}
                    </div>
                    <div className="detail-name">{selectedPlace.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, color: 'var(--text-muted)' }}><MapPin size={16} color="var(--cyan)" /> {selectedPlace.location}</div>
                    {selectedPlace.images?.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                        {selectedPlace.images.map((img, idx) => <img key={idx} src={img} alt="" style={{ width: 60, height: 60, objectFit:'cover', borderRadius: 8, border:'1px solid var(--glass-border)' }} />)}
                      </div>
                    )}
                    {selectedPlace.isHost && <div className="price-tag" style={{ marginTop: 16 }}>₹{selectedPlace.price?.toLocaleString('en-IN')}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}> / night</span></div>}
                  </div>

                  {/* Weather card */}
                  {weather && (
                    <div className="content-card mt-4" style={{ background: weather.safe ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${weather.safe ? 'rgba(52,211,153,0.2)':'rgba(248,113,113,0.2)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: '2.5rem' }}>{weather.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{weather.condition} · {weather.temp}°C</div>
                          <div style={{ fontSize: '0.85rem', color: weather.safe ? 'var(--emerald)':'var(--danger)', fontWeight: 600, marginTop: 2 }}>{weather.safe ? '✅ Safe to Travel' : '⚠️ Not Recommended to Travel'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{weather.desc}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transport */}
                  {profile.area && selectedPlace.isHost && (
                    <TransportWidget from={profile.area} to={selectedPlace.location} />
                  )}

                  {/* Must-visit */}
                  {selectedPlace.mustVisit?.length > 0 && (
                    <div className="content-card mt-4">
                      <div className="card-section-title"><div className="icon-badge"><MapPin size={16} color="#fff" /></div>Must-Visit Nearby</div>
                      {selectedPlace.mustVisit.map((mv, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-800)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--glass-border)' }}>
                          <div style={{ fontWeight: 700 }}>{mv.name} <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 400 }}>{mv.distance}</span></div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{mv.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="content-card mt-4">
                    {selectedPlace.isHost ? (
                      <motion.button className="btn-primary" style={{ width: '100%' }} onClick={startBooking}
                        disabled={selectedPlace.slots <= 0} whileHover={selectedPlace.slots > 0 ? { scale: 1.02 } : {}}>
                        <MessageCircle size={16} /> {selectedPlace.slots > 0 ? 'Send Inquiry & Hold Slot' : 'No Slots Available'}
                      </motion.button>
                    ) : (
                      <button className="btn-outline" style={{ width: '100%', opacity: 0.5 }} disabled>Public Landmark – No Booking</button>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}

          {/* ── BOOKINGS ── */}
          {activeTab === 'bookings' && (
            <motion.div key="bookings" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
              <div className="page-header"><h2 className="page-title">My Bookings</h2><p className="page-subtitle">{confirmedBookings.length} confirmed</p></div>
              {confirmedBookings.length === 0
                ? <div className="content-card"><div className="empty-state"><div className="empty-icon"><CalendarCheck size={52} /></div><div className="empty-title">No confirmed bookings yet</div></div></div>
                : <div className="space-y-4">
                    {confirmedBookings.map((booking, i) => (
                      <motion.div key={booking._id} className="booking-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.07 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{booking.placeName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><MapPin size={13} color="var(--cyan)" /> {booking.placeLocation}</div>
                          </div>
                          <span className="status-badge confirmed"><CheckCircle2 size={12} /> Confirmed</span>
                        </div>
                        <div className="info-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 12 }}>
                          <div><div className="info-item-label">Booking ID</div><div className="info-item-value" style={{ color: 'var(--cyan)', fontFamily: 'monospace', fontWeight: 700 }}>{booking.bookingId}</div></div>
                          <div><div className="info-item-label">Schedule</div><div className="info-item-value">{booking.scheduleDates}</div></div>
                          <div><div className="info-item-label">Price/night</div><div className="info-item-value" style={{ color: 'var(--cyan)' }}>₹{booking.placePrice?.toLocaleString('en-IN')}{booking.discountApplied && <span style={{ color: 'var(--emerald)', marginLeft: 6, fontSize: '0.7rem' }}>10% OFF ✓</span>}</div></div>
                          <div><div className="info-item-label">Total Food</div><div className="info-item-value">₹{booking.totalFoodCost || 0}</div></div>
                        </div>

                        {/* Food selection */}
                        {booking.place?.foodMenu?.length > 0 || true ? (
                          <FoodSelector booking={booking} token={token} userId={user.id} onSave={() => loadChats()} />
                        ) : null}

                        {/* Transport */}
                        {profile.area && <TransportWidget from={profile.area} to={booking.placeLocation} compact />}

                        <div style={{ marginTop: 12, borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
                          <motion.button className="btn-primary" style={{ padding: '8px 18px' }} onClick={() => setOpenChatId(booking._id)} whileTap={{ scale: 0.97 }}>
                            <MessageCircle size={15} /> Message Host
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
              }
            </motion.div>
          )}

          {/* ── CHATS ── */}
          {activeTab === 'chats' && (
            <motion.div key="chats" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
              <div className="page-header"><h2 className="page-title">Messages</h2></div>
              {chats.length === 0
                ? <div className="content-card"><div className="empty-state"><div className="empty-icon"><MessageCircle size={52} /></div><div className="empty-title">No messages yet</div></div></div>
                : <div className="space-y-3">
                    {chats.map((chat, i) => (
                      <motion.div key={chat._id} className="booking-card" style={{ cursor: 'pointer' }} onClick={() => setOpenChatId(chat._id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }} whileHover={{ scale: 1.01 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="sidebar-avatar" style={{ background: chat.isGroup ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : undefined }}>{chat.isGroup ? '👥' : 'H'}</div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{chat.isGroup ? `Group – ${chat.placeName}` : `Host – ${chat.placeName}`}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {chat.messages?.length > 0 ? chat.messages[chat.messages.length-1].text?.substring(0,50) : 'No messages yet'}
                              </div>
                            </div>
                          </div>
                          <span className={`status-badge ${chat.confirmed ? 'confirmed':'pending'}`}>{chat.confirmed ? 'Confirmed':'Pending'}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
              }
            </motion.div>
          )}

          {/* ── EMERGENCY ── */}
          {activeTab === 'emergency' && (
            <motion.div key="emergency" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
              <div className="page-header"><h2 className="page-title">🚨 Emergency & Safety</h2><p className="page-subtitle">Risk management & live weather</p></div>

              {/* Weather for active booking location */}
              {confirmedBookings.length > 0 && (
                <WeatherPanel location={confirmedBookings[0].placeLocation} />
              )}

              <motion.div className="content-card" variants={cardVariants} initial="hidden" animate="visible" style={{ border: '1px solid rgba(248,113,113,0.3)' }}>
                <div className="card-section-title" style={{ color: '#f87171' }}><div className="icon-badge" style={{ background: 'rgba(248,113,113,0.3)' }}><AlertTriangle size={16} color="#f87171" /></div>Send SOS to Host</div>
                {emergencySent ? (
                  <div className="alert" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--emerald)', padding: '1rem' }}>
                    <CheckCircle2 size={20} /> SOS sent! Your host has been notified. Stay calm, help is on the way.
                  </div>
                ) : (
                  <>
                    <Field label="Describe your emergency" type="textarea" value={emergencyMsg} onChange={e => setEmergencyMsg(e.target.value)} placeholder="e.g. Heavy flooding near property, road blocked…" />
                    <motion.button className="btn-submit" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', marginTop: 12 }}
                      onClick={sendEmergency} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      🚨 Send Emergency SOS
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Transport Widget ─────────────────────────────────────────────────────────
function TransportWidget({ from, to, compact }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.getTransport(from, to).then(setData);
  }, [from, to]);
  if (!data) return null;
  return (
    <div className="content-card mt-4" style={{ padding: compact ? '12px' : undefined }}>
      <div className="card-section-title" style={{ marginBottom: 12 }}><div className="icon-badge"><Navigation size={16} color="#fff" /></div>Transport: {from} → {to.split(',')[0]}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: 12 }}>📍 {data.km} km away</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {data.flight > 0 && (
          <div style={{ padding: '10px', background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <Plane size={20} color="var(--cyan)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Flight</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.flight}h · ₹{data.flightCost?.toLocaleString('en-IN')}</div>
          </div>
        )}
        {data.train > 0 && (
          <div style={{ padding: '10px', background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <Train size={20} color="var(--violet)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Train</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.train}h · ₹{data.trainCost?.toLocaleString('en-IN')}</div>
          </div>
        )}
        <div style={{ padding: '10px', background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <Car size={20} color="var(--emerald)" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Cab</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.cab}h · ₹{data.cabCost?.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Weather Panel ────────────────────────────────────────────────────────────
function WeatherPanel({ location }) {
  const [weather, setWeather] = useState(null);
  useEffect(() => { api.getWeather(location).then(setWeather); }, [location]);
  if (!weather) return null;
  return (
    <div className="content-card mb-4" style={{ background: weather.safe ? 'rgba(52,211,153,0.06)':'rgba(248,113,113,0.06)', border: `1px solid ${weather.safe ? 'rgba(52,211,153,0.2)':'rgba(248,113,113,0.3)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>{weather.icon}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{location.split(',')[0]}: {weather.condition}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: weather.safe ? 'var(--emerald)':'var(--danger)', marginTop: 4 }}>
            {weather.safe ? '✅ Safe to Travel' : '⚠️ DO NOT TRAVEL – Unsafe Conditions'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{weather.temp}°C · {weather.desc}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Food Selector ────────────────────────────────────────────────────────────
function FoodSelector({ booking, token, onSave }) {
  const [qty, setQty] = useState({});
  const menu = booking.foodSelection?.length > 0 ? booking.foodSelection : [];
  const total = Object.entries(qty).reduce((a, [k, v]) => a + (Number(v)||0) * (menu.find(m=>m.name===k)?.price||0), 0);
  if (menu.length === 0) return null;
  return (
    <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-800)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--cyan)' }}>🍽️ Food Selection (Already Booked)</div>
      {menu.map(f => <div key={f.name} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}><span>{f.name} x{f.qty}</span><span style={{ color: 'var(--cyan)' }}>₹{f.price * f.qty}</span></div>)}
      <div style={{ fontWeight: 700, marginTop: 6 }}>Total: ₹{booking.totalFoodCost}</div>
    </div>
  );
}
