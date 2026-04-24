Stage 1: Disaster Detection (100% Automated)
AI Role:

Monitors news APIs (Bernama, Malaysiakini, NST)
Scans social media for spike in keywords: "banjir", "flood", "evacuate", "PPS" (temporary relief center)
Detects government NADMA alerts
When threshold hit → auto-activates crisis mode
Sends alert to admin: "Flood detected in Shah Alam. Crisis mode activated. Review needed?"
If admin doesn't respond in 30 mins → proceeds anyway

Human Intervention: Optional review, not required to start

Stage 2: Needs Mapping (95% Automated)
AI Role:

Scrapes government PPS (temporary shelter) lists
Extracts shelter locations, capacity, contact info
Sends automated WhatsApp to each shelter: "What do you need urgently? Reply with voice note or text"
Transcribes responses → categorizes needs
Builds real-time needs map

Human Intervention: Shelter staff just replies via WhatsApp (takes 30 seconds)

Stage 3: Donation Intake (100% Automated)
AI Role:

Auto-posts on Facebook/Instagram: "Flood relief activated. Donate via [link]"
Donor sends photo + message: "I have 50 packets of rice"
AI analyzes image, extracts quantity, categorizes item
Asks clarifying question if needed: "Is this ready-to-eat or raw rice?"
Auto-confirms: "Thank you! Your donation is logged. You'll receive pickup details shortly."

Human Intervention: Zero. Donor just sends one message.

Stage 4: Collection Point Assignment (100% Automated)
AI Role:

Based on donor location, assigns nearest collection point
Sends automated message: "Drop off at Masjid Al-Huda, Jalan 14/23, open till 9pm. Here's the map [link]"
If donor can't travel, pings volunteers in area: "Pickup needed at [address]. Can you help?"
First volunteer to reply "yes" gets the task

Human Intervention: Volunteer says "yes" or "no" (1 word)

Stage 5: Intelligent Routing (100% Automated)
AI Role:

Every hour, GLM analyzes:

What's accumulated at each collection point
What each shelter currently needs (from Step 2 + real-time updates)
Which volunteers are available + their vehicle capacity
Current traffic conditions (Google Maps API)


Generates optimized routes: "Volunteer A: Pick up rice + blankets from Collection Point 1 → deliver to Shelter B + Shelter D"
Sends route via WhatsApp with map embed
Volunteer taps "Start Route" → route tracking begins

Human Intervention: Volunteer taps one button

Stage 6: Equity Enforcement (100% Automated)
AI Role:

Tracks allocation across all shelters
Detects imbalance: "Shelter F received 20% of their needs, while Shelter A received 150%"
Automatically adjusts future routing: "Next 3 deliveries prioritize Shelter F"
Flags to admin dashboard: "Equity alert: Shelter F underserved"
Auto-generates appeal: "Urgent: Shelter F still needs [list]. Can you help?"

Human Intervention: Zero. System self-corrects.

Stage 7: Proof & Accountability (90% Automated)
AI Role:

When volunteer arrives, system sends: "Upload delivery photo now"
Volunteer snaps photo
AI verifies: photo shows items + matches expected quantity + GPS location matches shelter
If mismatch detected → sends alert to admin + volunteer
Auto-updates shelter's received inventory
Sends confirmation to original donors: "Your rice reached 45 people at Shelter B [photo]"

Human Intervention: Volunteer takes 1 photo (5 seconds)

Stage 8: Post-Crisis Reporting (100% Automated)
AI Role:

After disaster, generates comprehensive report:

Total donations: items + quantity + donors
Total deliveries: routes + volunteers + time
Shelter coverage: equity metrics
Bottlenecks: where delays happened
Recommendations: "Collection Point 3 was understaffed, add 2 more next time"


Sends thank-you messages to all donors with their impact: "Your 50 packets of rice fed 120 people across 3 shelters"
Archives all data for government audit requirements

Human Intervention: Zero