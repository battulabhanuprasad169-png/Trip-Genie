import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, UploadCloud, Inbox, Upload, Check, CheckCircle2, MessageCircle,
  MapPin, Camera, File, AlertTriangle, Utensils, Eye, PlusCircle, Trash2,
  CloudLightning
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import { Sidebar, Field, FileUpload, ChatModal, LS, pageVariants, cardVariants } from './components';

export default function HostDashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [chats, setChats] = useState([]);
  const [places, setPlaces] = useState([]);
  const [openChatId, setOpenChatId] = useState(null);
  const [uploadData, setUploadData] = useState({ name: '', area: '', price: '', slots: '1', images: [], hostPhone: '' });
  const [foodItems, setFoodItems] = useState([]);
  const [newFood, setNewFood] = useState({ name: '', price: '', category: 'Main Course', description: '' });
  const [mustVisit, setMustVisit] = useState([]);
  const [newMv, setNewMv] = useState({ name: '', description: '', distance: '' });
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [emergencies, setEmergencies] = useState([]);

  const loadChats = useCallback(async () => {
    const data = await api.getHostChats(user.id);
    if (Array.isArray(data)) {
      setChats(data);
      setEmergencies(data.filter(c => c.emergencyAlert));
    }
  }, [user.id]);

  const loadPlaces = useCallback(async () => {
    const data = await api.getHostPlaces(user.id);
    if (Array.isArray(data)) setPlaces(data);
  }, [user.id]);

  useEffect(() => {
    loadChats();
    loadPlaces();
    const iv = setInterval(loadChats, 5000);
    return () => clearInterval(iv);
  }, [loadChats, loadPlaces]);

  useEffect(() => {
    if (selectedPlaceId) {
      const p = places.find(p => p._id === selectedPlaceId);
      if (p) { setFoodItems(p.foodMenu || []); setMustVisit(p.mustVisit || []); }
    }
  }, [selectedPlaceId, places]);

  const upd = k => e => setUploadData(d => ({ ...d, [k]: e.target.value }));

  const handlePublish = async () => {
    if (!uploadData.name || !uploadData.area || !uploadData.price || !uploadData.slots) {
      alert('Fill all fields'); return;
    }
    await api.createPlace(token, { ...uploadData, hostPhone: uploadData.hostPhone || user.phone });
    alert('Published!');
    setUploadData({ name: '', area: '', price: '', slots: '1', images: [], hostPhone: '' });
    loadPlaces();
  };

  const addFood = () => {
    if (!newFood.name || !newFood.price) return;
    setFoodItems(prev => [...prev, { id: `f_${Date.now()}`, ...newFood, price: Number(newFood.price) }]);
    setNewFood({ name: '', price: '', category: 'Main Course', description: '' });
  };
  const removeFood = id => setFoodItems(prev => prev.filter(f => f.id !== id));
  const saveFood = async () => {
    if (!selectedPlaceId) { alert('Select a place first'); return; }
    await api.updateFood(token, selectedPlaceId, foodItems);
    alert('Food menu saved!'); loadPlaces();
  };

  const addMv = () => {
    if (!newMv.name) return;
    setMustVisit(prev => [...prev, newMv]);
    setNewMv({ name: '', description: '', distance: '' });
  };
  const removeMv = i => setMustVisit(prev => prev.filter((_, idx) => idx !== i));
  const saveMv = async () => {
    if (!selectedPlaceId) { alert('Select a place first'); return; }
    await api.updateMustVisit(token, selectedPlaceId, mustVisit);
    alert('Must-visit list saved!'); loadPlaces();
  };

  const sendMessage = async (chatId, text) => {
    await api.sendMessage(token, chatId, text, user.username || 'Host');
    loadChats();
  };
  const confirmChat = async (chatId, isGroup, finalPrice) => {
    await api.confirmChat(token, chatId, isGroup, finalPrice);
    loadChats();
  };

  const openChat = chats.find(c => c._id === openChatId) || null;
  const pendingCount = chats.filter(c => !c.confirmed).length;

  const navItems = [
    { key: 'upload', label: 'Upload Property', icon: Upload },
    { key: 'menu', label: 'Food & Must-Visit', icon: Utensils },
    { key: 'inbox', label: 'Inbox & Bookings', icon: Inbox, badge: pendingCount },
    { key: 'emergency', label: 'Emergency Alerts', icon: AlertTriangle, badge: emergencies.length },
  ];

  const foodCategories = ['Breakfast', 'Main Course', 'Snacks', 'Beverages', 'Desserts'];

  return (
    <div className="dashboard-layout">
      <Sidebar title="Host Portal" icon={Building2} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} user={user} />
      {openChat && <ChatModal chat={openChat} currentUser={user} onSend={sendMessage} onClose={() => setOpenChatId(null)} onAcceptOffer={() => {}} onConfirm={confirmChat} />}

      <main className="dashboard-main">
        <AnimatePresence mode="wait">

          {/* ── UPLOAD ── */}
          {activeTab === 'upload' && (
            <motion.div key="upload" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
              <div className="page-header"><h2 className="page-title">List a Property</h2></div>
              <motion.div className="content-card" variants={cardVariants} initial="hidden" animate="visible">
                <div className="card-section-title"><div className="icon-badge"><MapPin size={16} color="#fff" /></div>Location & Details</div>
                <div className="form-grid form-grid-2">
                  <Field label="Property Name" value={uploadData.name} onChange={upd('name')} placeholder="e.g. Goa Beach Villa" />
                  <Field label="Location / Area" value={uploadData.area} onChange={upd('area')} placeholder="e.g. Baga, Goa" />
                  <Field label="Available Slots" type="number" min="1" value={uploadData.slots} onChange={upd('slots')} />
                  <Field label="Price (INR / night)" type="number" value={uploadData.price} onChange={upd('price')} placeholder="2000" />
                  <Field label="Host Phone" type="tel" value={uploadData.hostPhone} onChange={upd('hostPhone')} placeholder="+91 98000 00000" />
                </div>
                <div className="divider" />
                <div className="card-section-title"><div className="icon-badge"><Camera size={16} color="#fff" /></div>Photos</div>
                <FileUpload label="Upload Photos (Max 5)" icon={UploadCloud} isBox onFilesSelected={(urls) => setUploadData(d => ({ ...d, images: urls }))} />
                <motion.button className="btn-submit" onClick={handlePublish} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <UploadCloud size={18} /> Publish Listing
                </motion.button>

                {places.length > 0 && (
                  <>
                    <div className="divider" />
                    <div className="card-section-title"><div className="icon-badge"><Eye size={16} color="#fff" /></div>Your Published Places</div>
                    {places.map(p => (
                      <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-800)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--glass-border)' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.location} · {p.slots} slots · ₹{p.price}/night</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 700 }}>✓ Live</span>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── FOOD & MUST-VISIT ── */}
          {activeTab === 'menu' && (
            <motion.div key="menu" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
              <div className="page-header"><h2 className="page-title">Food Menu & Must-Visit</h2></div>
              <motion.div className="content-card" variants={cardVariants} initial="hidden" animate="visible">
                <div className="form-field">
                  <label className="form-label">Select Your Property</label>
                  <select className="form-input" value={selectedPlaceId} onChange={e => setSelectedPlaceId(e.target.value)}>
                    <option value="">-- Choose a property --</option>
                    {places.map(p => <option key={p._id} value={p._id}>{p.name} – {p.location}</option>)}
                  </select>
                </div>
                {selectedPlaceId && (
                  <>
                    <div className="divider" />
                    <div className="card-section-title"><div className="icon-badge"><Utensils size={16} color="#fff" /></div>Food Menu</div>
                    <div className="form-grid form-grid-2">
                      <Field label="Item Name" value={newFood.name} onChange={e => setNewFood(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Masala Dosa" />
                      <Field label="Price (₹)" type="number" value={newFood.price} onChange={e => setNewFood(d => ({ ...d, price: e.target.value }))} placeholder="120" />
                      <div className="form-field">
                        <label className="form-label">Category</label>
                        <select className="form-input" value={newFood.category} onChange={e => setNewFood(d => ({ ...d, category: e.target.value }))}>
                          {foodCategories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <Field label="Description" value={newFood.description} onChange={e => setNewFood(d => ({ ...d, description: e.target.value }))} placeholder="Short description" />
                    </div>
                    <motion.button className="btn-primary" onClick={addFood} whileTap={{ scale: 0.97 }} style={{ marginBottom: 12 }}>
                      <PlusCircle size={15} /> Add Item
                    </motion.button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {foodItems.map(f => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                          <div>
                            <span style={{ fontWeight: 700 }}>{f.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{f.category}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>₹{f.price}</span>
                            <button onClick={() => removeFood(f.id)} style={{ background: 'none', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <motion.button className="btn-submit" onClick={saveFood} whileTap={{ scale: 0.97 }} style={{ marginTop: 12 }}>Save Food Menu</motion.button>

                    <div className="divider" />
                    <div className="card-section-title"><div className="icon-badge"><MapPin size={16} color="#fff" /></div>Must-Visit Places Nearby</div>
                    <div className="form-grid form-grid-2">
                      <Field label="Place Name" value={newMv.name} onChange={e => setNewMv(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Dudhsagar Falls" />
                      <Field label="Distance" value={newMv.distance} onChange={e => setNewMv(d => ({ ...d, distance: e.target.value }))} placeholder="e.g. 12 km" />
                      <Field label="Description" value={newMv.description} onChange={e => setNewMv(d => ({ ...d, description: e.target.value }))} placeholder="Why visit?" />
                    </div>
                    <motion.button className="btn-primary" onClick={addMv} whileTap={{ scale: 0.97 }} style={{ marginBottom: 12 }}>
                      <PlusCircle size={15} /> Add Place
                    </motion.button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mustVisit.map((mv, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                          <div>
                            <span style={{ fontWeight: 700 }}>{mv.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{mv.distance}</span>
                          </div>
                          <button onClick={() => removeMv(i)} style={{ background: 'none', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                    <motion.button className="btn-submit" onClick={saveMv} whileTap={{ scale: 0.97 }} style={{ marginTop: 12 }}>Save Must-Visit List</motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── INBOX ── */}
          {activeTab === 'inbox' && (
            <motion.div key="inbox" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
              <div className="page-header">
                <h2 className="page-title">Traveler Inquiries</h2>
                <p className="page-subtitle">{pendingCount > 0 ? `${pendingCount} pending` : 'All caught up!'}</p>
              </div>
              {chats.length === 0
                ? <div className="content-card"><div className="empty-state"><div className="empty-icon"><Inbox size={52} /></div><div className="empty-title">No inquiries yet</div></div></div>
                : <div className="space-y-4">
                    {chats.map((chat, i) => (
                      <motion.div key={chat._id} className="booking-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="sidebar-avatar" style={{ background: chat.isGroup ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : undefined }}>
                              {chat.isGroup ? '👥' : (chat.userDetails?.name?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>
                                {chat.isGroup ? `Group: ${chat.groupMembers?.map(m => m.userName).join(', ')}` : (chat.userDetails?.name || 'Traveler')}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {chat.isGroup ? `${chat.groupMembers?.length} members • ` : ''}
                                <span style={{ color: 'var(--cyan)' }}>{chat.placeName}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`status-badge ${chat.confirmed ? 'confirmed' : 'pending'}`}>
                            {chat.confirmed ? <><CheckCircle2 size={12} /> Confirmed</> : '⏳ Pending'}
                          </span>
                        </div>
                        {chat.isGroup && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(124,58,237,0.1)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--violet)' }}>
                            👥 Group Offer: {chat.offerAcceptedBy?.length || 0}/{chat.groupMembers?.length} members accepted
                            {chat.groupMembers?.every(m => m.accepted) && !chat.confirmed && ' — Ready to confirm 10% off!'}
                          </div>
                        )}
                        {chat.emergencyAlert && (
                          <div className="alert" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', marginTop: 8, padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem' }}>
                            🚨 Emergency: {chat.emergencyMsg}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <motion.button className="btn-primary flex-1" onClick={() => setOpenChatId(chat._id)} whileTap={{ scale: 0.97 }}>
                            <MessageCircle size={15} /> Open Chat
                          </motion.button>
                          {!chat.confirmed && !chat.isGroup && (
                            <motion.button className="btn-secondary" onClick={() => confirmChat(chat._id, false)} whileTap={{ scale: 0.97 }}>
                              <Check size={15} /> Confirm
                            </motion.button>
                          )}
                          {chat.isGroup && chat.groupMembers?.every(m => m.accepted) && !chat.confirmed && (
                            <motion.button className="btn-secondary" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(6,182,212,0.3))' }}
                              onClick={() => confirmChat(chat._id, true, Math.round(chat.placePrice * 0.9))} whileTap={{ scale: 0.97 }}>
                              🏷️ Confirm 10% Off
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
              }
            </motion.div>
          )}

          {/* ── EMERGENCY ── */}
          {activeTab === 'emergency' && (
            <motion.div key="emergency" variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
              <div className="page-header"><h2 className="page-title">🚨 Emergency Alerts</h2></div>
              {emergencies.length === 0
                ? <div className="content-card"><div className="empty-state"><div className="empty-icon"><AlertTriangle size={52} /></div><div className="empty-title">No active emergencies</div></div></div>
                : <div className="space-y-4">
                    {emergencies.map((chat, i) => (
                      <motion.div key={chat._id} className="booking-card" style={{ border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.05)' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: '1.5rem' }}>🚨</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f87171' }}>Emergency from {chat.userDetails?.name || 'traveler'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{chat.placeName}</div>
                          </div>
                        </div>
                        <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 12 }}>{chat.emergencyMsg}</div>
                        <motion.button className="btn-primary" onClick={() => setOpenChatId(chat._id)} whileTap={{ scale: 0.97 }}>
                          <MessageCircle size={15} /> Respond to Emergency
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
              }
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
