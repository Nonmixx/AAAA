# Notification Integration Guide

## Overview

This guide shows where and how to integrate the notification system with donation workflows.

## Files Created

1. **[src/lib/supabase/notifications.ts](src/lib/supabase/notifications.ts)** - Core notification functions
2. **[src/lib/supabase/notifications-triggers.ts](src/lib/supabase/notifications-triggers.ts)** - Helper to trigger notifications on events

## Integration Points

### 1. When Receiver Updates Donation Allocation Status

**File:** `src/app/pages/receiver/IncomingDonations.tsx`

**Current Code (Line ~180):**
```typescript
const updateStatus = async (id: string, status: DonationStatus) => {
  // ... existing code ...
  
  const { error: updateError } = await supabase
    .from('donation_allocations')
    .update({ status })
    .eq('id', id);

  if (updateError) throw updateError;
  
  // INSERT NOTIFICATION HERE
};
```

**Updated Code:**
```typescript
import { notifyDonorOfAllocationChange } from '@/lib/supabase/notifications-triggers';

const updateStatus = async (id: string, status: DonationStatus) => {
  setErrorMessage(null);

  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get current allocation details
    const { data: previous, error: previousError } = await supabase
      .from('donation_allocations')
      .select('donation_id, status, need_id')
      .eq('id', id)
      .single();

    if (previousError) throw previousError;

    // Update status
    const { error: updateError } = await supabase
      .from('donation_allocations')
      .update({ status })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log event
    await supabase.from('donation_events').insert({
      donation_id: previous.donation_id,
      allocation_id: id,
      event_type: 'allocation_status_changed',
      from_status: previous.status,
      to_status: status,
      actor_profile_id: user?.id ?? null,
    });

    // 🔔 SEND NOTIFICATION TO DONOR
    const { data: donation } = await supabase
      .from('donations')
      .select('item_name')
      .eq('id', previous.donation_id)
      .single();

    const { data: need } = await supabase
      .from('needs')
      .select('organizations(name)')
      .eq('id', previous.need_id)
      .single();

    if (donation && need) {
      await notifyDonorOfAllocationChange(
        previous.donation_id,
        id,
        previous.status,
        status,
        need.organizations?.name || 'Organization',
        donation.item_name
      );
    }

    setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : 'Unable to update status.');
  }
};
```

### 2. When Donor Submits a New Donation (After Allocation)

**File:** `src/app/pages/donor/AIDonation.tsx` or wherever donations are finalized

**Example:**
```typescript
import { notifyReceiverOfIncomingDonation } from '@/lib/supabase/notifications-triggers';

// After creating donation_allocations, notify receivers
const allocationData = [
  { need_id: 'need-1', org_id: 'org-1' },
  { need_id: 'need-2', org_id: 'org-2' },
];

for (const allocation of allocationData) {
  // Create allocation...
  
  // Notify receiver org members
  await notifyReceiverOfIncomingDonation(
    allocation.org_id,
    donorName,
    itemName,
    quantity,
    allocationId
  );
}
```

### 3. Display Notifications in Donor UI

**Create:** `src/app/components/donor/DonorNotificationBell.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { fetchDonorNotifications, markNotificationRead, fetchUnreadNotificationCount } from '@/lib/supabase/notifications';

export function DonorNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const count = await fetchUnreadNotificationCount();
        setUnreadCount(count);
        
        const notifs = await fetchDonorNotifications(10);
        setNotifications(notifs);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#da1a32] text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => markNotificationRead(notif.id)}
              >
                <h4 className="font-bold text-sm text-[#000000]">{notif.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{notif.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notif.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

## Event Flow

```
Donation Created
    ↓
Receiver receives allocation request
    ↓
Receiver accepts/schedules (updateStatus)
    ↓
🔔 Donor notified: "Allocation Completed"
    ↓
Delivery in transit
    ↓
🔔 Donor notified: "Delivery Scheduled" (if enabled)
    ↓
Delivery confirmed with proof
    ↓
🔔 Donor notified: "Item Delivered" (if enabled)
```

## Key Functions

### For Donors

- `fetchDonorNotifications(limit)` - Fetch notifications
- `markNotificationRead(id)` - Mark one as read
- `markAllNotificationsRead()` - Mark all as read
- `fetchUnreadNotificationCount()` - Get badge count
- `deleteNotification(id)` - Remove notification

### For Triggering

- `notifyDonorOfAllocationChange()` - Send donor notification on status change
- `notifyReceiverOfIncomingDonation()` - Notify receiver org of new allocation

## Settings Integration

Notifications respect user preferences from [src/app/pages/donor/DonorSettings.tsx](src/app/pages/donor/DonorSettings.tsx):

- `allocation_completed` ✓ Enabled/Disabled
- `delivery_scheduled` ✓ Enabled/Disabled
- `item_delivered` ✓ Enabled/Disabled
- `emergency_mode_alerts` ✓ Enabled/Disabled

The notification system automatically checks these preferences before creating notifications.

## Testing

To test notifications:

1. Create a test donor and test receiver account
2. Submit donation allocation
3. As receiver, update allocation status
4. Check: notification should appear in donor's account
5. Verify preferences can disable individual notification types
