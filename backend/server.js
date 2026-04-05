const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = 'tripgenie_super_secret_2025';
const MONGO_URI = 'mongodb://localhost:27017/tripgenie';

mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(e => console.log('MongoDB error:', e.message));

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'host'], default: 'user' },
  phone: String,
  kyc: {
    submitted: { type: Boolean, default: false },
    name: String,
    area: String,
    work: String,
    phone: String,
    email: String,
    profilePhoto: String,  // base64 or url
    aadhaar: String,       // base64 or url
  },
  currentLocation: String,
  createdAt: { type: Date, default: Date.now }
});

const PlaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, default: 'Host Property' },
  price: Number,
  slots: { type: Number, default: 1 },
  rating: { type: Number, default: 5.0 },
  images: [String],
  hostId: { type: String, required: true },
  hostName: String,
  hostPhone: String,
  isHost: { type: Boolean, default: true },
  foodMenu: [{
    id: String,
    name: String,
    price: Number,
    category: String,
    description: String,
  }],
  mustVisit: [{
    name: String,
    description: String,
    distance: String,
  }],
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  senderId: String,
  senderName: String,
  text: String,
  ts: { type: Date, default: Date.now },
  isSystem: { type: Boolean, default: false },
});

const ChatSchema = new mongoose.Schema({
  placeId: String,
  placeName: String,
  placeLocation: String,
  placePrice: Number,
  hostId: String,
  // Single user chat
  userId: String,
  userDetails: Object,
  // Group chat
  isGroup: { type: Boolean, default: false },
  groupMembers: [{ userId: String, userName: String, userDetails: Object, accepted: Boolean }],
  offerAcceptedBy: [String],
  hostConfirmed: { type: Boolean, default: false },
  discountApplied: { type: Boolean, default: false },
  // Status
  confirmed: { type: Boolean, default: false },
  bookingId: String,
  scheduleDates: String,
  messages: [MessageSchema],
  // Food selection
  foodSelection: [{ name: String, price: Number, qty: Number }],
  totalFoodCost: { type: Number, default: 0 },
  // Emergency
  emergencyAlert: { type: Boolean, default: false },
  emergencyMsg: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Place = mongoose.model('Place', PlaceSchema);
const Chat = mongoose.model('Chat', ChatSchema);

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed, role: role || 'user' });
    await user.save();
    res.json({ message: 'Registered successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role });
    if (!user) return res.status(401).json({ error: 'Account not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        kyc: user.kyc,
        currentLocation: user.currentLocation,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// ─── KYC ROUTES ───────────────────────────────────────────────────────────────
app.post('/api/user/kyc', auth, async (req, res) => {
  try {
    const { name, area, work, phone, email, profilePhoto, aadhaar } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      kyc: { submitted: true, name, area, work, phone, email, profilePhoto, aadhaar }
    });
    res.json({ message: 'KYC saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PLACES ROUTES ────────────────────────────────────────────────────────────
app.get('/api/places', async (req, res) => {
  const places = await Place.find();
  res.json(places);
});

app.get('/api/places/host/:hostId', async (req, res) => {
  const places = await Place.find({ hostId: req.params.hostId });
  res.json(places);
});

app.post('/api/places', auth, async (req, res) => {
  try {
    const { name, location, price, slots, images, hostPhone } = req.body;
    const user = await User.findById(req.user.id);
    const place = new Place({
      name, location, price: Number(price), slots: Number(slots),
      images: images || [], hostId: req.user.id,
      hostName: user.username, hostPhone: hostPhone || user.phone,
    });
    await place.save();
    res.json(place);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Food menu management
app.post('/api/places/:id/food', auth, async (req, res) => {
  try {
    const { foodMenu } = req.body;
    await Place.findByIdAndUpdate(req.params.id, { foodMenu });
    res.json({ message: 'Food menu updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Must-visit management
app.post('/api/places/:id/mustvisit', auth, async (req, res) => {
  try {
    const { mustVisit } = req.body;
    await Place.findByIdAndUpdate(req.params.id, { mustVisit });
    res.json({ message: 'Must-visit updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CHAT / BOOKING ROUTES ────────────────────────────────────────────────────
// Get all chats for a user (as traveler)
app.get('/api/chats/user/:userId', async (req, res) => {
  const chats = await Chat.find({
    $or: [
      { userId: req.params.userId },
      { 'groupMembers.userId': req.params.userId }
    ]
  }).sort('-createdAt');
  res.json(chats);
});

// Get all chats for a host
app.get('/api/chats/host/:hostId', async (req, res) => {
  const chats = await Chat.find({ hostId: req.params.hostId }).sort('-createdAt');
  res.json(chats);
});

// Create new booking inquiry (or join group)
app.post('/api/chats', auth, async (req, res) => {
  try {
    const { placeId, placeName, placeLocation, placePrice, hostId, userDetails, scheduleDates } = req.body;
    const bookingId = `TG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Check for pending (non-group-confirmed) chats for same place to form a group
    const pendingChats = await Chat.find({
      placeId, hostId, confirmed: false, isGroup: false, hostConfirmed: false
    }).sort('createdAt');

    if (pendingChats.length >= 2) {
      // Form a group: upgrade first chat to group and add everyone
      const baseChat = pendingChats[0];
      const allMembers = [
        { userId: baseChat.userId, userName: baseChat.userDetails?.name || 'Traveler 1', userDetails: baseChat.userDetails, accepted: false },
        ...pendingChats.slice(1).map((c, i) => ({ userId: c.userId, userName: c.userDetails?.name || `Traveler ${i + 2}`, userDetails: c.userDetails, accepted: false })),
        { userId: req.user.id, userName: userDetails?.name || `Traveler ${pendingChats.length + 1}`, userDetails, accepted: false },
      ];

      // Delete the individual chats and create a group chat
      const idsToDelete = pendingChats.map(c => c._id);
      await Chat.deleteMany({ _id: { $in: idsToDelete } });

      const groupChat = new Chat({
        placeId, placeName, placeLocation, placePrice, hostId,
        isGroup: true,
        groupMembers: allMembers,
        bookingId,
        scheduleDates,
        messages: [{
          senderId: 'system',
          senderName: 'System',
          text: `🎉 Group formed! ${allMembers.map(m => m.userName).join(', ')} are all interested in ${placeName}. Confirm the group offer to get 10% off!`,
          isSystem: true,
        }],
      });
      await groupChat.save();

      // Update place slots
      await Place.findByIdAndUpdate(placeId, { $inc: { slots: -1 } });

      io.emit('chat_updated', groupChat);
      return res.json({ chat: groupChat, grouped: true });
    }

    // Regular single chat
    const chat = new Chat({
      placeId, placeName, placeLocation, placePrice, hostId,
      userId: req.user.id, userDetails, bookingId, scheduleDates,
      messages: [{
        senderId: req.user.id,
        senderName: userDetails?.name || 'Traveler',
        text: `Hi! I'm interested in booking ${placeName}. Please confirm availability.`,
      }],
    });
    await chat.save();
    await Place.findByIdAndUpdate(placeId, { $inc: { slots: -1 } });

    io.emit('chat_updated', chat);
    res.json({ chat, grouped: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Send a message
app.post('/api/chats/:id/message', auth, async (req, res) => {
  try {
    const { text, senderName } = req.body;
    const msg = { senderId: req.user.id, senderName: senderName || 'User', text };
    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: msg } },
      { new: true }
    );
    io.emit('message_received', { chatId: req.params.id, msg });
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User accepts group offer
app.post('/api/chats/:id/accept-offer', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Mark this user as accepted
    await Chat.findByIdAndUpdate(req.params.id, {
      $addToSet: { offerAcceptedBy: req.user.id },
      $set: { 'groupMembers.$[elem].accepted': true },
      $push: {
        messages: {
          senderId: 'system', senderName: 'System',
          text: `✅ ${req.body.userName} accepted the 10% group discount offer!`,
          isSystem: true
        }
      }
    }, { arrayFilters: [{ 'elem.userId': req.user.id }], new: true });

    const updated = await Chat.findById(req.params.id);
    const allAccepted = updated.groupMembers.every(m => m.accepted);

    if (allAccepted) {
      await Chat.findByIdAndUpdate(req.params.id, {
        $push: {
          messages: {
            senderId: 'system', senderName: 'System',
            text: `🎊 All members accepted! Host can now confirm the group booking with 10% off.`,
            isSystem: true
          }
        }
      });
    }

    const final = await Chat.findById(req.params.id);
    io.emit('chat_updated', final);
    res.json(final);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Host confirms booking (regular or group)
app.post('/api/chats/:id/confirm', auth, async (req, res) => {
  try {
    const discountMsg = req.body.isGroup
      ? `🏷️ Host confirmed the group booking! 10% discount applied. Final price: ₹${req.body.finalPrice}/night`
      : `✅ Booking confirmed by host!`;

    const update = {
      confirmed: true,
      hostConfirmed: true,
      discountApplied: !!req.body.isGroup,
      $push: {
        messages: {
          senderId: req.user.id, senderName: 'Host',
          text: discountMsg
        }
      }
    };
    const chat = await Chat.findByIdAndUpdate(req.params.id, update, { new: true });
    io.emit('chat_updated', chat);
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Save food selection
app.post('/api/chats/:id/food', auth, async (req, res) => {
  try {
    const { foodSelection, totalFoodCost } = req.body;
    const chat = await Chat.findByIdAndUpdate(req.params.id, { foodSelection, totalFoodCost }, { new: true });
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Emergency SOS
app.post('/api/chats/:id/emergency', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findByIdAndUpdate(req.params.id, {
      emergencyAlert: true, emergencyMsg: message,
      $push: {
        messages: {
          senderId: 'system', senderName: '🚨 EMERGENCY',
          text: `🚨 EMERGENCY ALERT: ${message}. User needs immediate assistance!`,
          isSystem: true
        }
      }
    }, { new: true });
    io.emit('emergency', { chatId: req.params.id, hostId: chat.hostId, message });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── WEATHER API (Simulated) ──────────────────────────────────────────────────
const weatherData = {
  'goa': { temp: 32, condition: 'Sunny', desc: 'Perfect beach weather!', safe: true, icon: '☀️' },
  'kerala': { temp: 29, condition: 'Partly Cloudy', desc: 'Mild breeze, great for sightseeing.', safe: true, icon: '⛅' },
  'rishikesh': { temp: 24, condition: 'Clear', desc: 'Ideal for adventure activities.', safe: true, icon: '🌤️' },
  'munnar': { temp: 18, condition: 'Foggy', desc: 'Cool misty mornings. Carry a jacket.', safe: true, icon: '🌫️' },
  'jaipur': { temp: 38, condition: 'Hot & Dry', desc: 'Very hot. Stay hydrated.', safe: true, icon: '🌡️' },
  'agra': { temp: 36, condition: 'Hazy', desc: 'Good visibility. Visit Taj Mahal early morning.', safe: true, icon: '🌤️' },
  'manali': { temp: 5, condition: 'Snowstorm', desc: '⚠️ Heavy snowfall. Roads blocked. NOT SAFE!', safe: false, icon: '❄️' },
  'uttarakhand': { temp: 10, condition: 'Light Rain', desc: 'Carry rain gear. Landslide risk.', safe: false, icon: '🌧️' },
  'default': { temp: 30, condition: 'Clear', desc: 'Good conditions for travel.', safe: true, icon: '🌤️' },
};

app.get('/api/weather/:location', (req, res) => {
  const loc = req.params.location.toLowerCase();
  let weather = weatherData.default;
  for (const key of Object.keys(weatherData)) {
    if (loc.includes(key)) { weather = weatherData[key]; break; }
  }
  res.json({ ...weather, location: req.params.location });
});

// ─── DISTANCE / TRANSPORT (Simulated) ────────────────────────────────────────
const distanceData = {
  'delhi-goa': { km: 1909, train: 36, flight: 2, cab: 28, trainCost: 2200, flightCost: 5500, cabCost: 18000 },
  'delhi-kerala': { km: 2967, train: 48, flight: 3, cab: 45, trainCost: 3500, flightCost: 7500, cabCost: 30000 },
  'delhi-jaipur': { km: 269, train: 4, flight: 1, cab: 5, trainCost: 400, flightCost: 3500, cabCost: 4200 },
  'delhi-agra': { km: 206, train: 2, flight: 0, cab: 3, trainCost: 300, flightCost: 0, cabCost: 3500 },
  'delhi-manali': { km: 568, train: 0, flight: 1.5, cab: 10, trainCost: 0, flightCost: 6000, cabCost: 12000 },
  'mumbai-goa': { km: 593, train: 10, flight: 1, cab: 10, trainCost: 700, flightCost: 3800, cabCost: 9500 },
  'mumbai-kerala': { km: 1222, train: 22, flight: 2, cab: 18, trainCost: 1500, flightCost: 5000, cabCost: 18000 },
  'default': { km: 500, train: 8, flight: 1.5, cab: 8, trainCost: 600, flightCost: 4500, cabCost: 8000 },
};

function getTransport(from, to) {
  const key1 = `${from.toLowerCase().split(',')[0].trim()}-${to.toLowerCase().split(',')[0].trim()}`;
  const key2 = `${to.toLowerCase().split(',')[0].trim()}-${from.toLowerCase().split(',')[0].trim()}`;
  return distanceData[key1] || distanceData[key2] || distanceData.default;
}

app.get('/api/transport', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  const data = getTransport(from, to);
  res.json({ from, to, ...data });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_chat', (chatId) => socket.join(chatId));
  socket.on('leave_chat', (chatId) => socket.leave(chatId));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = 5000;
server.listen(PORT, () => console.log(`Trip-Genie Backend running on port ${PORT}`));
