Expected frontend workflow if everything is connected
If the whole flood workflow were fully wired into frontend UX, the flow would feel like this:

Admin detects or creates disaster
Admin opens /admin/disasters
sees incident signals
creates or confirms a flood event
activates crisis mode
Shelter outreach runs
Admin clicks something like “Send shelter outreach”
system messages verified shelter contacts on WhatsApp
shelters reply with urgent needs
Shelter needs appear in system
replies become structured needs
shelters show on the live disaster map
needs become visible in admin and donor-facing matching
Donor flow uses those live needs
donor opens donate flow
donor assistant recommends shelters based on active disaster needs
donor confirms donation
Allocation and routing happen
donation gets allocated to disaster needs
collection point chosen
route-planning job builds delivery plan
volunteer/logistics UI shows route stops
Delivery and proof
volunteer delivers
proof uploaded
proof verified
donor tracking updates with impact
Equity and reporting
admin sees underserved shelters
system prioritizes low-coverage shelters
reporting closes the loop after the crisis
What your frontend does right now
Right now the frontend is only partially connected:

Already visible:

admin disaster console
donor flows
receiver flows
live needs browsing
Not yet fully surfaced in frontend:

shelter outreach trigger UI
shelter reply parsing UI
collection-point management UI
volunteer route UI
proof verification UI
reporting UI