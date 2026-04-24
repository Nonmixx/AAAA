# Disaster Relief Platform - Complete Implementation Plan
## Stages 1-8 with Mock Data & Step-by-Step Execution

---

## 🎯 OVERALL SYSTEM ARCHITECTURE

```
Frontend (React/Next.js)
    ↓
Backend API (Node.js/Python FastAPI)
    ↓
Z.AI GLM Integration (Reasoning Engine)
    ↓
Database (PostgreSQL/MongoDB)
    ↓
External Services (WhatsApp API, Maps API, News API)
```

---

## 📋 STAGE 1: DISASTER DETECTION (100% Automated)

### Implementation Steps

#### Step 1.1: Set up News Monitoring System
**Duration:** 4 hours

**What to build:**
```javascript
// services/disasterDetection.js

const NEWS_SOURCES = [
  { 
    name: "Mock Bernama",
    url: "https://newsapi.org/v2/everything?q=flood+Malaysia&apiKey=YOUR_KEY",
    keywords: ["banjir", "flood", "disaster", "PPS"]
  },
  {
    name: "Mock Social Media Feed",
    url: "MOCK_ENDPOINT", // We'll create this
    keywords: ["flood", "help needed", "evacuate"]
  }
];

async function monitorNews() {
  // Poll every 15 minutes
  setInterval(async () => {
    for (const source of NEWS_SOURCES) {
      const articles = await fetchNews(source.url);
      const disasterSignals = analyzeWithGLM(articles, source.keywords);
      
      if (disasterSignals.confidence > 0.7) {
        await triggerCrisisMode(disasterSignals);
      }
    }
  }, 15 * 60 * 1000);
}

async function analyzeWithGLM(articles, keywords) {
  const prompt = `
    Analyze these news articles and determine if there's an active disaster in Malaysia.
    Articles: ${JSON.stringify(articles)}
    Keywords to watch: ${keywords.join(', ')}
    
    Return JSON:
    {
      "isDisaster": boolean,
      "confidence": 0.0-1.0,
      "location": "city/state",
      "disasterType": "flood/fire/earthquake",
      "severity": "low/medium/high",
      "affectedAreas": ["area1", "area2"]
    }
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

**Mock Data for Testing:**
```json
// mock_news_feed.json
[
  {
    "title": "Heavy Floods Hit Shah Alam, 500 Families Evacuated",
    "content": "Continuous rain since yesterday has caused severe flooding in Shah Alam. District officer confirms 500 families evacuated to 3 temporary relief centers (PPS).",
    "timestamp": "2024-04-25T08:30:00Z",
    "source": "Mock Bernama"
  },
  {
    "title": "Multiple PPS Opened in Selangor",
    "content": "Selangor state government activates disaster response. PPS opened at Sek Keb Shah Alam, Dewan Seksyen 7, and Masjid Seksyen 9.",
    "timestamp": "2024-04-25T09:15:00Z",
    "source": "Mock News"
  }
]
```

#### Step 1.2: Create Crisis Mode Toggle
**Duration:** 2 hours

**Database Schema:**
```sql
CREATE TABLE system_status (
  id SERIAL PRIMARY KEY,
  mode VARCHAR(20) DEFAULT 'peacetime', -- 'peacetime' or 'crisis'
  crisis_type VARCHAR(50),
  affected_location TEXT,
  activated_at TIMESTAMP,
  activated_by VARCHAR(50), -- 'auto' or admin_id
  metadata JSONB
);

CREATE TABLE crisis_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(200),
  disaster_type VARCHAR(50),
  location TEXT,
  severity VARCHAR(20),
  detected_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'monitoring', 'resolved'
  confidence_score DECIMAL(3,2)
);
```

**API Endpoint:**
```javascript
// routes/crisis.js
router.post('/api/crisis/activate', async (req, res) => {
  const { location, disasterType, severity, activatedBy } = req.body;
  
  // Update system mode
  await db.query(`
    INSERT INTO system_status (mode, crisis_type, affected_location, activated_by)
    VALUES ('crisis', $1, $2, $3)
  `, [disasterType, location, activatedBy]);
  
  // Log crisis event
  await db.query(`
    INSERT INTO crisis_events (event_name, disaster_type, location, severity, detected_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [`${disasterType} - ${location}`, disasterType, location, severity]);
  
  // Send alert to admin
  await sendAdminAlert({
    title: "🚨 Crisis Mode Activated",
    message: `${disasterType} detected in ${location}. Severity: ${severity}`,
    action: "Review and confirm at /admin/crisis"
  });
  
  res.json({ success: true, message: "Crisis mode activated" });
});
```

#### Step 1.3: Admin Alert System
**Duration:** 2 hours

**Mock WhatsApp Numbers for Testing:**
```javascript
// config/contacts.js
const MOCK_CONTACTS = {
  admins: [
    { name: "Admin 1 (You)", phone: "+60123456789" },
    { name: "Admin 2 (Teammate)", phone: "+60198765432" }
  ],
  shelters: [
    { 
      name: "PPS Sek Keb Shah Alam",
      phone: "+60111111111",
      location: { lat: 3.0733, lng: 101.5185 },
      capacity: 200
    },
    {
      name: "PPS Dewan Seksyen 7",
      phone: "+60122222222", 
      location: { lat: 3.0800, lng: 101.5200 },
      capacity: 150
    },
    {
      name: "PPS Masjid Seksyen 9",
      phone: "+60133333333",
      location: { lat: 3.0650, lng: 101.5100 },
      capacity: 300
    }
  ],
  volunteers: [
    { name: "Volunteer Ali", phone: "+60144444444", area: "Shah Alam" },
    { name: "Volunteer Siti", phone: "+60155555555", area: "Petaling Jaya" },
    { name: "Volunteer Kumar", phone: "+60166666666", area: "Subang Jaya" }
  ]
};
```

**WhatsApp Integration (using Twilio for development):**
```javascript
// services/whatsapp.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsApp(to, message) {
  try {
    const response = await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio Sandbox number
      to: `whatsapp:${to}`,
      body: message
    });
    console.log(`WhatsApp sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    // Fallback: log to database
    await logFailedMessage(to, message, error);
  }
}

async function sendAdminAlert(alert) {
  const message = `
🚨 *CRISIS ALERT*

${alert.title}

${alert.message}

Action needed: ${alert.action}

Reply CONFIRM to proceed or REVIEW to check details.
  `;
  
  for (const admin of MOCK_CONTACTS.admins) {
    await sendWhatsApp(admin.phone, message);
  }
}
```

---

## 📋 STAGE 2: NEEDS MAPPING (95% Automated)

### Implementation Steps

#### Step 2.1: Shelter Database Setup
**Duration:** 3 hours

**Database Schema:**
```sql
CREATE TABLE shelters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  phone VARCHAR(20),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  capacity INTEGER,
  current_occupancy INTEGER DEFAULT 0,
  contact_person VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shelter_needs (
  id SERIAL PRIMARY KEY,
  shelter_id INTEGER REFERENCES shelters(id),
  item_category VARCHAR(50), -- 'food', 'clothing', 'medicine', 'hygiene'
  item_name VARCHAR(100),
  quantity_needed INTEGER,
  urgency VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'needed' -- 'needed', 'partial', 'fulfilled'
);
```

**Seed Mock Data:**
```javascript
// seeds/shelters.js
const MOCK_SHELTERS = [
  {
    name: "PPS Sek Keb Shah Alam",
    phone: "+60111111111",
    location_lat: 3.0733,
    location_lng: 101.5185,
    address: "Jalan Seksyen 1, Shah Alam, Selangor",
    capacity: 200,
    current_occupancy: 150,
    contact_person: "Encik Ahmad"
  },
  {
    name: "PPS Dewan Seksyen 7",
    phone: "+60122222222",
    location_lat: 3.0800,
    location_lng: 101.5200,
    address: "Seksyen 7, Shah Alam, Selangor",
    capacity: 150,
    current_occupancy: 80,
    contact_person: "Puan Fatimah"
  },
  {
    name: "PPS Masjid Seksyen 9",
    phone: "+60133333333",
    location_lat: 3.0650,
    location_lng: 101.5100,
    address: "Seksyen 9, Shah Alam, Selangor",
    capacity: 300,
    current_occupancy: 250,
    contact_person: "Ustaz Yusof"
  }
];

async function seedShelters() {
  for (const shelter of MOCK_SHELTERS) {
    await db.query(`
      INSERT INTO shelters (name, phone, location_lat, location_lng, address, capacity, current_occupancy, contact_person)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [shelter.name, shelter.phone, shelter.location_lat, shelter.location_lng, 
        shelter.address, shelter.capacity, shelter.current_occupancy, shelter.contact_person]);
  }
}
```

#### Step 2.2: Automated Needs Collection
**Duration:** 4 hours

**WhatsApp Outreach System:**
```javascript
// services/needsCollection.js

async function collectShelterNeeds(crisisEventId) {
  const shelters = await db.query(`
    SELECT * FROM shelters WHERE status = 'active'
  `);
  
  for (const shelter of shelters.rows) {
    const message = `
Assalamualaikum ${shelter.contact_person},

Sistem bantuan banjir kami telah diaktifkan.

Sila beritahu keperluan semasa PPS ${shelter.name}:
- Makanan (jenis & kuantiti)
- Pakaian (saiz & kuantiti)  
- Ubat-ubatan
- Keperluan lain

Anda boleh:
1. Hantar voice note
2. Taip mesej
3. Hantar gambar

Contoh: "Kami perlukan 200 paket nasi, 100 selimut, 50 ubat demam"

Terima kasih.
    `;
    
    await sendWhatsApp(shelter.phone, message);
    
    // Log outreach
    await db.query(`
      INSERT INTO needs_collection_log (shelter_id, crisis_event_id, sent_at, status)
      VALUES ($1, $2, NOW(), 'sent')
    `, [shelter.id, crisisEventId]);
  }
}
```

#### Step 2.3: GLM Response Processing
**Duration:** 5 hours

**Webhook to Receive WhatsApp Responses:**
```javascript
// routes/webhooks.js
router.post('/webhook/whatsapp', async (req, res) => {
  const { From, Body, MediaUrl0 } = req.body;
  
  // Find shelter by phone
  const shelter = await db.query(`
    SELECT * FROM shelters WHERE phone = $1
  `, [From]);
  
  if (!shelter.rows[0]) {
    return res.status(200).send('OK'); // Ignore unknown numbers
  }
  
  // Process with GLM
  const extractedNeeds = await extractNeedsWithGLM(Body, MediaUrl0);
  
  // Store in database
  for (const need of extractedNeeds) {
    await db.query(`
      INSERT INTO shelter_needs (shelter_id, item_category, item_name, quantity_needed, urgency)
      VALUES ($1, $2, $3, $4, $5)
    `, [shelter.rows[0].id, need.category, need.item, need.quantity, need.urgency]);
  }
  
  // Send confirmation
  await sendWhatsApp(From, `
Terima kasih! Keperluan anda telah diterima:

${extractedNeeds.map(n => `✓ ${n.item}: ${n.quantity} (${n.urgency})`).join('\n')}

Kami akan mengatur bantuan segera.
  `);
  
  res.status(200).send('OK');
});

async function extractNeedsWithGLM(message, imageUrl) {
  const prompt = `
Extract shelter needs from this message. The message may be in Bahasa Malaysia or English, and may include voice transcription or image description.

Message: "${message}"
${imageUrl ? `Image URL: ${imageUrl}` : ''}

Extract and return JSON array:
[
  {
    "category": "food/clothing/medicine/hygiene/other",
    "item": "specific item name",
    "quantity": number,
    "urgency": "critical/high/medium/low"
  }
]

Rules:
- If quantity not specified, estimate based on context
- Classify urgency based on keywords: "urgent", "segera", "kritikal" = critical
- Categorize items logically
- If message mentions people count, estimate needs accordingly

Example:
Input: "Kami ada 200 orang, perlukan nasi, selimut, ubat demam segera"
Output: [
  {"category": "food", "item": "rice packets", "quantity": 200, "urgency": "high"},
  {"category": "clothing", "item": "blankets", "quantity": 200, "urgency": "high"},
  {"category": "medicine", "item": "fever medication", "quantity": 50, "urgency": "critical"}
]
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

**Mock WhatsApp Responses for Testing:**
```javascript
// test_data/mock_shelter_responses.js
const MOCK_SHELTER_RESPONSES = [
  {
    from: "+60111111111", // PPS Sek Keb Shah Alam
    body: "Kami perlukan 150 paket nasi segera, 100 botol air, 50 selimut. Ada 150 orang.",
    timestamp: "2024-04-25T10:00:00Z"
  },
  {
    from: "+60122222222", // PPS Dewan Seksyen 7
    body: "Need urgently: 80 food packs, baby diapers 30 packs, women hygiene products",
    timestamp: "2024-04-25T10:15:00Z"
  },
  {
    from: "+60133333333", // PPS Masjid Seksyen 9
    body: "Ada 250 mangsa. Perlukan makanan, pakaian kanak-kanak, ubat batuk dan demam",
    timestamp: "2024-04-25T10:30:00Z"
  }
];

// Function to simulate shelter responses for testing
async function simulateShelterResponses() {
  for (const response of MOCK_SHELTER_RESPONSES) {
    await fetch('http://localhost:3000/webhook/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: response.from,
        Body: response.body,
        MessageSid: `mock_${Date.now()}`
      })
    });
    
    await sleep(2000); // Wait 2 seconds between messages
  }
}
```

---

## 📋 STAGE 3: DONATION INTAKE (100% Automated)

### Implementation Steps

#### Step 3.1: Donor Registration & Donation Posting
**Duration:** 4 hours

**Database Schema:**
```sql
CREATE TABLE donors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE donations (
  id SERIAL PRIMARY KEY,
  donor_id INTEGER REFERENCES donors(id),
  item_category VARCHAR(50),
  item_name VARCHAR(100),
  quantity INTEGER,
  condition VARCHAR(20), -- 'new', 'good', 'acceptable'
  expiry_date DATE,
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'allocated', 'picked_up', 'delivered'
  created_at TIMESTAMP DEFAULT NOW(),
  urgency_score DECIMAL(3,2), -- GLM-calculated urgency
  notes TEXT
);
```

**WhatsApp Bot for Donation Intake:**
```javascript
// services/donationIntake.js

async function handleDonorMessage(from, body, mediaUrl) {
  // Check if donor exists
  let donor = await db.query(`SELECT * FROM donors WHERE phone = $1`, [from]);
  
  if (!donor.rows[0]) {
    // New donor - ask for basic info
    await sendWhatsApp(from, `
Terima kasih kerana ingin menderma! 🙏

Sila kongsi lokasi anda:
1. Share location (WhatsApp feature)
2. Atau taip alamat

Contoh: "Seksyen 7, Shah Alam"
    `);
    
    // Create pending donor
    await db.query(`
      INSERT INTO donors (phone, name) VALUES ($1, 'Pending Registration')
    `, [from]);
    
    return;
  }
  
  donor = donor.rows[0];
  
  // If donor has no location yet, this message should be location
  if (!donor.location_lat) {
    const location = await extractLocationWithGLM(body);
    await db.query(`
      UPDATE donors SET location_lat = $1, location_lng = $2, address = $3 WHERE id = $4
    `, [location.lat, location.lng, location.address, donor.id]);
    
    await sendWhatsApp(from, `
Lokasi diterima! Sekarang sila beritahu apa yang anda ingin derma:

Anda boleh:
📸 Hantar foto item
🎤 Hantar voice note
💬 Taip mesej

Contoh: "20 tin sardin, best before Jun 2024"
    `);
    return;
  }
  
  // Process donation
  const donationData = await processDonationWithGLM(body, mediaUrl);
  
  const result = await db.query(`
    INSERT INTO donations (donor_id, item_category, item_name, quantity, condition, expiry_date, photo_url, urgency_score, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [donor.id, donationData.category, donationData.item, donationData.quantity, 
      donationData.condition, donationData.expiryDate, mediaUrl, 
      donationData.urgencyScore, donationData.notes]);
  
  await sendWhatsApp(from, `
✅ Derma anda diterima!

${donationData.item}: ${donationData.quantity}
Keadaan: ${donationData.condition}
${donationData.expiryDate ? `Luput: ${donationData.expiryDate}` : ''}

Kami sedang cari penerima yang sesuai. Anda akan terima notifikasi bila sudah dipadankan.

Terima kasih! 🙏
  `);
  
  // Trigger matching process
  await triggerDonationMatching(result.rows[0].id);
}

async function processDonationWithGLM(message, imageUrl) {
  const prompt = `
Analyze this donation and extract structured data. Message may be in Bahasa Malaysia or English.

Message: "${message}"
${imageUrl ? `Image: Analyze this image to identify items and quantity` : ''}

Return JSON:
{
  "category": "food/clothing/medicine/hygiene/other",
  "item": "specific item name",
  "quantity": number,
  "condition": "new/good/acceptable/unsuitable",
  "expiryDate": "YYYY-MM-DD or null",
  "urgencyScore": 0.0-1.0 (higher if expiring soon),
  "notes": "any quality concerns or special notes"
}

Rules:
- If image shows damaged/dirty items, mark as "unsuitable" and explain in notes
- Calculate urgency: expiring in <30 days = 0.9, <60 days = 0.6, >60 days = 0.3
- For non-food: urgency based on condition and demand
- Extract expiry date from packaging if visible in image

Examples:
Input: "20 tin sardin, best before Jun 2024"
Output: {"category": "food", "item": "canned sardines", "quantity": 20, "condition": "good", "expiryDate": "2024-06-30", "urgencyScore": 0.9, "notes": ""}

Input: Image shows torn, dirty clothes
Output: {"category": "clothing", "item": "assorted clothing", "quantity": 0, "condition": "unsuitable", "expiryDate": null, "urgencyScore": 0.0, "notes": "Items appear damaged and unsanitary. Not suitable for donation."}
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

**Mock Donor Data for Testing:**
```javascript
// test_data/mock_donors.js
const MOCK_DONORS = [
  {
    name: "Ahmad Ibrahim",
    phone: "+60171111111",
    location: { lat: 3.0700, lng: 101.5180 },
    address: "Seksyen 2, Shah Alam",
    donation: {
      message: "20 tin sardin, best before 30 May 2024",
      photo: null
    }
  },
  {
    name: "Siti Nurhaliza",
    phone: "+60172222222",
    location: { lat: 3.0950, lng: 101.5300 },
    address: "Seksyen 13, Shah Alam",
    donation: {
      message: "50 paket mi segera, 30 botol air mineral",
      photo: "mock_photo_instant_noodles.jpg"
    }
  },
  {
    name: "Kumar Suppiah",
    phone: "+60173333333",
    location: { lat: 3.0600, lng: 101.5050 },
    address: "Subang Jaya",
    donation: {
      message: "Baby diapers 15 packs, baby formula 5 tins",
      photo: null
    }
  }
];
```

---

## 📋 STAGE 4: INTELLIGENT ROUTING & COLLECTION POINT ASSIGNMENT

### Implementation Steps

#### Step 4.1: Collection Points Setup
**Duration:** 3 hours

**Database Schema:**
```sql
CREATE TABLE collection_points (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  phone VARCHAR(20),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  opening_hours TEXT,
  capacity INTEGER,
  current_stock_level INTEGER DEFAULT 0,
  manager_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE collection_assignments (
  id SERIAL PRIMARY KEY,
  donation_id INTEGER REFERENCES donations(id),
  collection_point_id INTEGER REFERENCES collection_points(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'dropped_off', 'picked_up'
  dropoff_proof_url TEXT,
  dropoff_timestamp TIMESTAMP
);
```

**Mock Collection Points:**
```javascript
const MOCK_COLLECTION_POINTS = [
  {
    name: "Masjid Al-Huda",
    phone: "+60181111111",
    location_lat: 3.0720,
    location_lng: 101.5170,
    address: "Jalan 14/23, Seksyen 14, Shah Alam",
    opening_hours: "24 hours during crisis",
    capacity: 5000,
    manager_name: "Ustaz Hafiz"
  },
  {
    name: "Dewan Orang Ramai Seksyen 7",
    phone: "+60182222222",
    location_lat: 3.0810,
    location_lng: 101.5210,
    address: "Seksyen 7, Shah Alam",
    opening_hours: "8am - 10pm",
    capacity: 3000,
    manager_name: "Encik Rahman"
  }
];
```

#### Step 4.2: Smart Collection Point Assignment
**Duration:** 4 hours

```javascript
// services/collectionAssignment.js

async function assignCollectionPoint(donationId) {
  const donation = await db.query(`
    SELECT d.*, don.location_lat, don.location_lng, don.address
    FROM donations d
    JOIN donors don ON d.donor_id = don.id
    WHERE d.id = $1
  `, [donationId]);
  
  const donationData = donation.rows[0];
  
  // Get all active collection points
  const collectionPoints = await db.query(`
    SELECT * FROM collection_points WHERE status = 'active'
  `);
  
  // Use GLM to decide best collection point
  const assignment = await selectCollectionPointWithGLM(donationData, collectionPoints.rows);
  
  // Create assignment
  await db.query(`
    INSERT INTO collection_assignments (donation_id, collection_point_id)
    VALUES ($1, $2)
  `, [donationId, assignment.collectionPointId]);
  
  // Get donor phone
  const donor = await db.query(`
    SELECT phone FROM donors WHERE id = $1
  `, [donationData.donor_id]);
  
  // Send instructions to donor
  const collectionPoint = collectionPoints.rows.find(cp => cp.id === assignment.collectionPointId);
  
  await sendWhatsApp(donor.rows[0].phone, `
📍 *Tempat Pengumpulan*

${collectionPoint.name}
${collectionPoint.address}

Waktu: ${collectionPoint.opening_hours}

Google Maps: https://maps.google.com/?q=${collectionPoint.location_lat},${collectionPoint.location_lng}

Sila hantar foto bila sudah drop off. Terima kasih! 🙏
  `);
}

async function selectCollectionPointWithGLM(donation, collectionPoints) {
  const prompt = `
Select the best collection point for this donation.

Donation:
- Item: ${donation.item_name}
- Quantity: ${donation.quantity}
- Donor location: ${donation.location_lat}, ${donation.location_lng}
- Urgency: ${donation.urgency_score}

Collection Points:
${collectionPoints.map((cp, i) => `
${i+1}. ${cp.name}
   Location: ${cp.location_lat}, ${cp.location_lng}
   Capacity: ${cp.capacity}
   Current stock: ${cp.current_stock_level}
   Distance from donor: ${calculateDistance(donation.location_lat, donation.location_lng, cp.location_lat, cp.location_lng)} km
`).join('\n')}

Return JSON:
{
  "collectionPointId": number,
  "reason": "brief explanation of why this is the best choice"
}

Consider:
1. Distance (prefer closer for donor convenience)
2. Capacity (avoid overfilled points)
3. Urgency (high urgency items should go to points closer to shelters)
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

---

## 📋 STAGE 5: SMART MATCHING & ALLOCATION

### Implementation Steps

#### Step 5.1: Matching Algorithm
**Duration:** 6 hours

**Database Schema:**
```sql
CREATE TABLE allocations (
  id SERIAL PRIMARY KEY,
  donation_id INTEGER REFERENCES donations(id),
  shelter_id INTEGER REFERENCES shelters(id),
  shelter_need_id INTEGER REFERENCES shelter_needs(id),
  quantity_allocated INTEGER,
  match_score DECIMAL(3,2),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'delivered'
  created_at TIMESTAMP DEFAULT NOW()
);
```

```javascript
// services/matching.js

async function performMatching() {
  // Get all unallocated donations
  const donations = await db.query(`
    SELECT d.*, don.location_lat AS donor_lat, don.location_lng AS donor_lng
    FROM donations d
    JOIN donors don ON d.donor_id = don.id
    WHERE d.status = 'pending'
  `);
  
  // Get all unfulfilled needs
  const needs = await db.query(`
    SELECT sn.*, s.location_lat, s.location_lng, s.name AS shelter_name
    FROM shelter_needs sn
    JOIN shelters s ON sn.shelter_id = s.id
    WHERE sn.status IN ('needed', 'partial')
  `);
  
  if (donations.rows.length === 0 || needs.rows.length === 0) {
    return;
  }
  
  // Use GLM for intelligent matching
  const matches = await matchWithGLM(donations.rows, needs.rows);
  
  // Create allocations
  for (const match of matches) {
    await db.query(`
      INSERT INTO allocations (donation_id, shelter_id, shelter_need_id, quantity_allocated, match_score, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [match.donationId, match.shelterId, match.needId, match.quantity, match.score, match.reason]);
    
    // Update donation status
    await db.query(`
      UPDATE donations SET status = 'allocated' WHERE id = $1
    `, [match.donationId]);
    
    // Update need status
    const need = needs.rows.find(n => n.id === match.needId);
    const newQuantityNeeded = need.quantity_needed - match.quantity;
    
    await db.query(`
      UPDATE shelter_needs 
      SET quantity_needed = $1, 
          status = CASE WHEN $1 <= 0 THEN 'fulfilled' ELSE 'partial' END,
          updated_at = NOW()
      WHERE id = $2
    `, [newQuantityNeeded, match.needId]);
  }
  
  // Send notifications
  await sendAllocationNotifications(matches);
}

async function matchWithGLM(donations, needs) {
  const prompt = `
You are a disaster relief logistics coordinator. Match donations to shelter needs optimally.

DONATIONS:
${JSON.stringify(donations.map(d => ({
  id: d.id,
  item: d.item_name,
  quantity: d.quantity,
  category: d.item_category,
  urgency: d.urgency_score,
  donorLocation: { lat: d.donor_lat, lng: d.donor_lng }
})))}

SHELTER NEEDS:
${JSON.stringify(needs.map(n => ({
  id: n.id,
  shelterId: n.shelter_id,
  shelterName: n.shelter_name,
  item: n.item_name,
  quantityNeeded: n.quantity_needed,
  category: n.item_category,
  urgency: n.urgency,
  shelterLocation: { lat: n.location_lat, lng: n.location_lng }
})))}

MATCHING RULES:
1. Match by category and item similarity
2. Prioritize critical urgency needs
3. Consider distance (closer is better for logistics)
4. Prevent over-allocation to single shelter (fairness)
5. Can split one donation across multiple shelters
6. Match as many items as possible

Return JSON array of matches:
[
  {
    "donationId": number,
    "shelterId": number,
    "needId": number,
    "quantity": number,
    "score": 0.0-1.0,
    "reason": "brief explanation"
  }
]
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

---

## 📋 STAGE 6: VOLUNTEER ROUTING & DELIVERY COORDINATION

### Implementation Steps

#### Step 6.1: Volunteer Assignment
**Duration:** 5 hours

**Database Schema:**
```sql
CREATE TABLE volunteers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  vehicle_type VARCHAR(50), -- 'car', 'motorcycle', 'van'
  capacity INTEGER, -- in kg or cubic meters
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  availability VARCHAR(20) DEFAULT 'available', -- 'available', 'on_delivery', 'offline'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE delivery_routes (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER REFERENCES volunteers(id),
  status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE delivery_stops (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES delivery_routes(id),
  stop_type VARCHAR(20), -- 'pickup_collection_point', 'delivery_shelter'
  location_id INTEGER, -- collection_point_id or shelter_id
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  stop_order INTEGER,
  allocation_ids INTEGER[], -- array of allocation IDs being delivered
  status VARCHAR(20) DEFAULT 'pending',
  arrival_time TIMESTAMP,
  completion_time TIMESTAMP,
  proof_photo_url TEXT
);
```

**Mock Volunteers:**
```javascript
const MOCK_VOLUNTEERS = [
  {
    name: "Ali Rahman",
    phone: "+60191111111",
    vehicle_type: "van",
    capacity: 500,
    current_location: { lat: 3.0750, lng: 101.5190 }
  },
  {
    name: "Siti Aminah",
    phone: "+60192222222",
    vehicle_type: "car",
    capacity: 200,
    current_location: { lat: 3.0820, lng: 101.5220 }
  },
  {
    name: "Kumar Singh",
    phone: "+60193333333",
    vehicle_type: "motorcycle",
    capacity: 50,
    current_location: { lat: 3.0680, lng: 101.5140 }
  }
];
```

#### Step 6.2: Route Generation
**Duration:** 6 hours

```javascript
// services/routing.js

async function generateRoutes() {
  // Get all pending allocations
  const allocations = await db.query(`
    SELECT a.*, d.item_name, d.quantity, 
           cp.id AS collection_point_id, cp.name AS cp_name, 
           cp.location_lat AS cp_lat, cp.location_lng AS cp_lng,
           s.id AS shelter_id, s.name AS shelter_name,
           s.location_lat AS shelter_lat, s.location_lng AS shelter_lng
    FROM allocations a
    JOIN donations d ON a.donation_id = d.id
    JOIN collection_assignments ca ON d.id = ca.donation_id
    JOIN collection_points cp ON ca.collection_point_id = cp.id
    JOIN shelters s ON a.shelter_id = s.id
    WHERE a.status = 'pending'
  `);
  
  // Get available volunteers
  const volunteers = await db.query(`
    SELECT * FROM volunteers WHERE availability = 'available'
  `);
  
  if (allocations.rows.length === 0 || volunteers.rows.length === 0) {
    return;
  }
  
  // Use GLM to create optimal routes
  const routes = await planRoutesWithGLM(allocations.rows, volunteers.rows);
  
  for (const route of routes) {
    // Create route
    const routeResult = await db.query(`
      INSERT INTO delivery_routes (volunteer_id, status)
      VALUES ($1, 'planned')
      RETURNING id
    `, [route.volunteerId]);
    
    const routeId = routeResult.rows[0].id;
    
    // Create stops
    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];
      await db.query(`
        INSERT INTO delivery_stops 
        (route_id, stop_type, location_id, location_lat, location_lng, address, stop_order, allocation_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [routeId, stop.type, stop.locationId, stop.lat, stop.lng, stop.address, i + 1, stop.allocationIds]);
    }
    
    // Send route to volunteer
    await sendRouteToVolunteer(route.volunteerId, routeId);
  }
}

async function planRoutesWithGLM(allocations, volunteers) {
  const prompt = `
Create optimal delivery routes for volunteers to pick up donations and deliver to shelters.

ALLOCATIONS TO DELIVER:
${JSON.stringify(allocations.map(a => ({
  id: a.id,
  item: a.item_name,
  quantity: a.quantity,
  collectionPoint: {
    id: a.collection_point_id,
    name: a.cp_name,
    location: { lat: a.cp_lat, lng: a.cp_lng }
  },
  shelter: {
    id: a.shelter_id,
    name: a.shelter_name,
    location: { lat: a.shelter_lat, lng: a.shelter_lng }
  }
})))}

AVAILABLE VOLUNTEERS:
${JSON.stringify(volunteers.map(v => ({
  id: v.id,
  name: v.name,
  vehicle: v.vehicle_type,
  capacity: v.capacity,
  currentLocation: { lat: v.current_location_lat, lng: v.current_location_lng }
})))}

ROUTING RULES:
1. Minimize total distance traveled
2. Group pickups from same collection point
3. Deliver to multiple shelters in one trip if efficient
4. Respect vehicle capacity
5. Assign urgent deliveries to closest volunteers
6. Balance workload across volunteers

Return JSON array:
[
  {
    "volunteerId": number,
    "stops": [
      {
        "type": "pickup_collection_point" or "delivery_shelter",
        "locationId": number,
        "lat": number,
        "lng": number,
        "address": string,
        "allocationIds": [numbers]
      }
    ],
    "estimatedDistance": number (km),
    "estimatedDuration": number (minutes)
  }
]
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}

async function sendRouteToVolunteer(volunteerId, routeId) {
  const volunteer = await db.query(`SELECT * FROM volunteers WHERE id = $1`, [volunteerId]);
  
  const stops = await db.query(`
    SELECT * FROM delivery_stops WHERE route_id = $1 ORDER BY stop_order
  `, [routeId]);
  
  const message = `
🚗 *ROUTE ASSIGNMENT*

${stops.rows.map((stop, i) => `
${i + 1}. ${stop.stop_type === 'pickup_collection_point' ? '📦 PICKUP' : '🏠 DELIVER'}
   ${stop.address}
   Maps: https://maps.google.com/?q=${stop.location_lat},${stop.location_lng}
`).join('\n')}

Reply *START* to begin route
Reply *UNAVAILABLE* if you cannot take this route
  `;
  
  await sendWhatsApp(volunteer.rows[0].phone, message);
}
```

---

## 📋 STAGE 7: REAL-TIME EXCEPTION HANDLING

### Implementation Steps

#### Step 7.1: Exception Detection
**Duration:** 5 hours

```javascript
// services/exceptionHandling.js

async function handleVolunteerMessage(from, body) {
  const volunteer = await db.query(`SELECT * FROM volunteers WHERE phone = $1`, [from]);
  
  if (!volunteer.rows[0]) return;
  
  // Check if volunteer has active route
  const activeRoute = await db.query(`
    SELECT * FROM delivery_routes 
    WHERE volunteer_id = $1 AND status IN ('planned', 'in_progress')
    ORDER BY created_at DESC LIMIT 1
  `, [volunteer.rows[0].id]);
  
  if (!activeRoute.rows[0]) {
    await sendWhatsApp(from, "You have no active route. Contact admin if you need help.");
    return;
  }
  
  const routeId = activeRoute.rows[0].id;
  
  // Analyze message with GLM
  const analysis = await analyzeVolunteerMessageWithGLM(body, routeId);
  
  switch(analysis.type) {
    case 'exception':
      await handleException(routeId, analysis);
      break;
    case 'status_update':
      await handleStatusUpdate(routeId, analysis);
      break;
    case 'question':
      await handleQuestion(from, analysis);
      break;
  }
}

async function analyzeVolunteerMessageWithGLM(message, routeId) {
  const prompt = `
Analyze this message from a volunteer during a delivery route.

Message: "${message}"

Classify the message type and extract relevant info:

{
  "type": "exception/status_update/question",
  "category": "donor_unavailable/location_unclear/vehicle_breakdown/shelter_full/general",
  "urgency": "critical/high/medium/low",
  "extractedInfo": {
    // relevant details based on type
  },
  "suggestedResponse": "what the system should do"
}

Examples:
Input: "Donor tak ada rumah, tak jawab phone"
Output: {
  "type": "exception",
  "category": "donor_unavailable",
  "urgency": "high",
  "extractedInfo": { "issue": "donor not home, not answering phone" },
  "suggestedResponse": "Skip this pickup and reroute"
}

Input: "Dah sampai collection point"
Output: {
  "type": "status_update",
  "category": "general",
  "urgency": "low",
  "extractedInfo": { "status": "arrived at collection point" },
  "suggestedResponse": "Acknowledge and ask for pickup confirmation"
}
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}

async function handleException(routeId, analysis) {
  console.log('Exception detected:', analysis);
  
  if (analysis.category === 'donor_unavailable') {
    // Get the affected stop
    const stops = await db.query(`
      SELECT * FROM delivery_stops 
      WHERE route_id = $1 AND stop_type = 'pickup_collection_point' AND status = 'pending'
      ORDER BY stop_order LIMIT 1
    `, [routeId]);
    
    if (stops.rows[0]) {
      // Mark as failed
      await db.query(`
        UPDATE delivery_stops SET status = 'failed' WHERE id = $1
      `, [stops.rows[0].id]);
      
      // Get volunteer phone
      const route = await db.query(`
        SELECT v.phone FROM delivery_routes dr
        JOIN volunteers v ON dr.volunteer_id = v.id
        WHERE dr.id = $1
      `, [routeId]);
      
      // Generate new route without this stop
      await sendWhatsApp(route.rows[0].phone, `
⚠️ *ROUTE UPDATE*

Pickup location skipped. Continue to next stop.

Updated route will be sent shortly.
      `);
      
      // Trigger re-routing
      await rerouteDelivery(routeId, stops.rows[0].id);
    }
  }
  
  // Similar handling for other exception types...
}
```

---

## 📋 STAGE 8: PROOF OF DELIVERY & EQUITY MONITORING

### Implementation Steps

#### Step 8.1: Photo Proof System
**Duration:** 4 hours

```javascript
// services/proofOfDelivery.js

async function handleDeliveryPhoto(from, mediaUrl, caption) {
  const volunteer = await db.query(`
    SELECT * FROM volunteers WHERE phone = $1
  `, [from]);
  
  if (!volunteer.rows[0]) return;
  
  // Get current stop
  const currentStop = await db.query(`
    SELECT ds.* FROM delivery_stops ds
    JOIN delivery_routes dr ON ds.route_id = dr.id
    WHERE dr.volunteer_id = $1 
      AND dr.status = 'in_progress'
      AND ds.status = 'in_progress'
    ORDER BY ds.stop_order DESC LIMIT 1
  `, [volunteer.rows[0].id]);
  
  if (!currentStop.rows[0]) {
    await sendWhatsApp(from, "No active delivery found. Start a route first.");
    return;
  }
  
  const stop = currentStop.rows[0];
  
  // Verify photo with GLM
  const verification = await verifyDeliveryPhotoWithGLM(mediaUrl, stop);
  
  if (verification.isValid) {
    // Update stop
    await db.query(`
      UPDATE delivery_stops 
      SET status = 'completed', 
          proof_photo_url = $1,
          completion_time = NOW()
      WHERE id = $2
    `, [mediaUrl, stop.id]);
    
    // Update allocations
    await db.query(`
      UPDATE allocations 
      SET status = 'delivered'
      WHERE id = ANY($1)
    `, [stop.allocation_ids]);
    
    await sendWhatsApp(from, `
✅ Delivery confirmed!

${verification.itemsDetected ? `Items verified: ${verification.itemsDetected}` : ''}

Next stop or done?
    `);
    
    // Check if route complete
    await checkRouteCompletion(stop.route_id);
    
  } else {
    await sendWhatsApp(from, `
❌ Photo unclear. Please retake:
${verification.reason}
    `);
  }
}

async function verifyDeliveryPhotoWithGLM(imageUrl, stop) {
  const prompt = `
Verify this delivery proof photo.

Image URL: ${imageUrl}
Expected delivery type: ${stop.stop_type}
Expected location: ${stop.address}

Analyze the photo and return JSON:
{
  "isValid": boolean,
  "itemsDetected": "description of items visible" or null,
  "reason": "why valid or why invalid",
  "confidence": 0.0-1.0
}

Valid if:
- Items/packages clearly visible
- Photo not blurry
- Appears to be taken at delivery location

Invalid if:
- No items visible
- Photo too dark/blurry
- Appears to be random/fake photo
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

#### Step 8.2: Equity Monitoring Dashboard
**Duration:** 6 hours

```javascript
// services/equityMonitoring.js

async function generateEquityReport() {
  const report = await db.query(`
    SELECT 
      s.id,
      s.name,
      s.current_occupancy,
      COUNT(DISTINCT a.id) AS total_allocations,
      SUM(a.quantity_allocated) AS total_items_received,
      AVG(a.match_score) AS avg_match_score,
      MAX(a.created_at) AS last_allocation_time
    FROM shelters s
    LEFT JOIN allocations a ON s.id = a.shelter_id AND a.status = 'delivered'
    GROUP BY s.id, s.name, s.current_occupancy
    ORDER BY total_items_received ASC NULLS FIRST
  `);
  
  // Calculate equity score with GLM
  const equityAnalysis = await analyzeEquityWithGLM(report.rows);
  
  // Flag underserved shelters
  for (const alert of equityAnalysis.alerts) {
    await db.query(`
      INSERT INTO equity_alerts (shelter_id, alert_type, severity, message)
      VALUES ($1, $2, $3, $4)
    `, [alert.shelterId, alert.type, alert.severity, alert.message]);
    
    // Send to admin
    await sendAdminAlert({
      title: "Equity Alert",
      message: alert.message,
      action: "Review allocation priorities"
    });
  }
  
  return equityAnalysis;
}

async function analyzeEquityWithGLM(shelterData) {
  const prompt = `
Analyze equity of resource distribution across shelters.

SHELTER DATA:
${JSON.stringify(shelterData)}

Analyze and return JSON:
{
  "overallScore": 0.0-1.0 (1.0 = perfectly equitable),
  "alerts": [
    {
      "shelterId": number,
      "type": "underserved/overserved",
      "severity": "critical/high/medium",
      "message": "detailed description"
    }
  ],
  "recommendations": [
    "actionable recommendation"
  ]
}

Equity factors:
- Occupancy vs items received ratio
- Time since last allocation
- Critical needs unfulfilled
- Over-allocation to some shelters
  `;
  
  const response = await callZAI_GLM(prompt);
  return JSON.parse(response);
}
```

---

## 🔧 TESTING PLAN

### Testing Stages 1-8 End-to-End

```javascript
// test/integration/disaster_workflow.test.js

async function testFullWorkflow() {
  console.log("Starting full disaster workflow test...\n");
  
  // STAGE 1: Trigger crisis mode
  console.log("STAGE 1: Activating crisis mode...");
  await fetch('http://localhost:3000/api/crisis/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: "Shah Alam, Selangor",
      disasterType: "flood",
      severity: "high",
      activatedBy: "auto"
    })
  });
  await sleep(3000);
  
  // STAGE 2: Simulate shelter responses
  console.log("\nSTAGE 2: Shelters reporting needs...");
  await simulateShelterResponses();
  await sleep(5000);
  
  // STAGE 3: Simulate donor donations
  console.log("\nSTAGE 3: Donors submitting donations...");
  await simulateDonorDonations();
  await sleep(5000);
  
  // STAGE 4: Check collection point assignments
  console.log("\nSTAGE 4: Checking collection assignments...");
  const assignments = await db.query(`SELECT * FROM collection_assignments`);
  console.log(`${assignments.rows.length} donations assigned to collection points`);
  
  // STAGE 5: Run matching
  console.log("\nSTAGE 5: Running donation matching...");
  await performMatching();
  await sleep(3000);
  const matches = await db.query(`SELECT * FROM allocations`);
  console.log(`${matches.rows.length} allocations created`);
  
  // STAGE 6: Generate routes
  console.log("\nSTAGE 6: Generating volunteer routes...");
  await generateRoutes();
  await sleep(3000);
  const routes = await db.query(`SELECT * FROM delivery_routes`);
  console.log(`${routes.rows.length} routes created`);
  
  // STAGE 7: Simulate volunteer starting route
  console.log("\nSTAGE 7: Volunteer starting delivery...");
  // Simulate volunteer sending "START"
  await handleVolunteerMessage("+60191111111", "START");
  
  // STAGE 8: Simulate delivery completion
  console.log("\nSTAGE 8: Completing delivery with proof...");
  // Simulate photo upload (mock URL)
  await handleDeliveryPhoto("+60191111111", "https://example.com/proof.jpg", "Delivered to PPS");
  
  console.log("\n✅ Full workflow test completed!");
  
  // Generate equity report
  console.log("\nGenerating equity report...");
  const equity = await generateEquityReport();
  console.log("Equity score:", equity.overallScore);
  console.log("Alerts:", equity.alerts.length);
}
```

---

## 📱 DEMO SCRIPT (90 seconds)

```markdown
## Demo Flow

### Setup (before demo)
1. Have crisis mode OFF
2. Have 3 mock shelters with needs already in system
3. Have 2 mock donors ready to send WhatsApp
4. Have 1 mock volunteer ready

### Live Demo

[0:00-0:15] CRISIS ACTIVATION
"A flood has hit Shah Alam. Our system detects it from news sources..."
→ Show crisis mode auto-activating
→ Show map highlighting affected area

[0:15-0:30] NEEDS COLLECTION
"System immediately contacts all shelters via WhatsApp..."
→ Show shelter receiving message
→ Show shelter replying "200 people, need rice, blankets"
→ Show GLM extracting structured needs in real-time

[0:30-0:45] DONATION INTAKE
"A donor sends a photo of 50 rice packets..."
→ Show WhatsApp message arriving
→ Show GLM analyzing photo + extracting data
→ Show donor getting confirmation + collection point assignment

[0:45-1:00] INTELLIGENT MATCHING
"Our GLM matches donations to shelters based on urgency, distance, fairness..."
→ Show allocation dashboard
→ Highlight equity scoring
→ Show one shelter flagged as "underserved - prioritize"

[1:00-1:15] VOLUNTEER ROUTING
"Volunteer gets optimized route: pickup from 2 points, deliver to 2 shelters"
→ Show route on map
→ Show WhatsApp message to volunteer with route

[1:15-1:30] REAL-TIME EXCEPTION
"Volunteer reports: Donor not home. System auto-reroutes..."
→ Show volunteer message arriving
→ Show GLM detecting exception
→ Show new route generated in 3 seconds
→ Show updated route sent to volunteer

[Done!]
"This is disaster relief orchestration. Remove the GLM, this collapses to manual chaos."
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Environment Setup
```bash
# Required API Keys
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
ZAI_API_KEY=your_zai_key
GOOGLE_MAPS_API_KEY=your_maps_key
DATABASE_URL=postgresql://...

# Optional
NEWS_API_KEY=your_news_key
```

### Database Setup
```bash
# Create database
createdb disaster_relief

# Run migrations
psql disaster_relief < schema.sql

# Seed mock data
node seeds/run_all_seeds.js
```

### Start Services
```bash
# Backend
npm run dev

# Frontend
cd frontend && npm run dev

# Background workers
node workers/disaster_monitor.js
node workers/matching_engine.js
```

---

## 📊 SUCCESS METRICS

After implementation, you should be able to demonstrate:

✅ Crisis mode activates within 30 seconds of disaster detection
✅ Shelters receive outreach WhatsApp within 2 minutes
✅ Donation intake processed in <10 seconds
✅ Matching completes in <5 seconds for 100 donations
✅ Volunteer routes generated in <10 seconds
✅ Exception handling response time <30 seconds
✅ Equity score above 0.7 maintained

---

END OF IMPLEMENTATION PLAN