import { useState } from 'react';
import { Settings, AlertTriangle, Bell, Zap } from 'lucide-react';
import { useDonorContext } from '../../context/DonorContext';

const NOTIF_PREFS = [
  { label: 'Allocation Completed', desc: 'When your donation has been AI-matched and allocated' },
  { label: 'Delivery Scheduled', desc: 'When delivery is confirmed and scheduled' },
  { label: 'Item Delivered', desc: 'When your donation has been delivered' },
  { label: 'Proof of Delivery', desc: 'When a proof photo is uploaded by receiver' },
  { label: 'Emergency Mode Alerts', desc: 'When the system activates Emergency Mode' },
];

export function DonorSettings() {
  const { emergencyMode, setEmergencyMode } = useDonorContext();
  const [showEmergencyToast, setShowEmergencyToast] = useState(false);
  const [notifStates, setNotifStates] = useState(NOTIF_PREFS.map(() => true));

  const handleEmergencyToggle = () => {
    const newVal = !emergencyMode;
    setEmergencyMode(newVal);
    if (newVal) {
      setShowEmergencyToast(true);
      setTimeout(() => setShowEmergencyToast(false), 4000);
    }
  };

  const toggleNotif = (i: number) => {
    setNotifStates((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <div className="min-h-screen bg-[#edf2f4] bg-opacity-30 relative">
      {/* Toast */}
      {showEmergencyToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#da1a32] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Emergency Mode Activated</p>
            <p className="text-xs opacity-80">System has switched to Emergency Mode due to urgent needs</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center shadow-sm">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#000000]">Settings</h1>
                <p className="text-gray-500 text-sm mt-0.5">Manage your donor portal preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width content */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="space-y-8">

          {/* Emergency Mode Card - Full Width */}
          <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#edf2f4] flex items-center gap-3 bg-[#edf2f4] bg-opacity-50">
              <div className="w-8 h-8 bg-[#da1a32] rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-[#000000] text-lg">Emergency Mode</h2>
            </div>

            <div className="p-8">
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1">
                  <h3 className="font-bold text-[#000000] text-base mb-2">Enable Emergency Mode View</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    When ON, urgent and disaster-affected receiver requests are prioritised and displayed at the top of the needs list. Emergency badges are shown on affected organisations.
                  </p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${emergencyMode ? 'bg-red-50 text-[#da1a32] border-red-100' : 'bg-[#edf2f4] text-gray-500 border-[#e5e5e5]'}`}>
                    <AlertTriangle className="w-4 h-4" />
                    {emergencyMode ? 'Emergency Mode is ACTIVE — receivers are prioritised' : 'Emergency Mode is OFF — showing normal view'}
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={handleEmergencyToggle}
                  className={`relative w-16 h-8 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none shadow-inner ${emergencyMode ? 'bg-[#da1a32]' : 'bg-gray-300'}`}
                  aria-label="Toggle emergency mode"
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${emergencyMode ? 'left-9' : 'left-1'}`}
                  />
                </button>
              </div>

              {emergencyMode && (
                <div className="mt-6 p-5 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#da1a32] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-[#da1a32] mb-2">🚨 Emergency Mode is Active</p>
                      <ul className="text-sm text-red-700 space-y-1.5">
                        <li>• Urgent receivers are highlighted and sorted to the top of the list</li>
                        <li>• Emergency badges are shown on all disaster-affected organisations</li>
                        <li>• AI allocation will prioritise emergency requests first</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences Card - Full Width */}
          <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#edf2f4] flex items-center gap-3 bg-[#edf2f4] bg-opacity-50">
              <div className="w-8 h-8 bg-[#da1a32] rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-[#000000] text-lg">Notification Preferences</h2>
            </div>

            <div className="p-8">
              <p className="text-sm text-gray-500 mb-6">Choose which events trigger notifications to stay informed about your donations.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {NOTIF_PREFS.map((pref, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-xl border-2 border-[#e5e5e5] hover:border-gray-300 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-[#000000] text-sm mb-1">{pref.label}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{pref.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleNotif(i)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 mt-1 ${notifStates[i] ? 'bg-[#da1a32]' : 'bg-gray-300'}`}
                      aria-label={`Toggle ${pref.label}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${notifStates[i] ? 'left-6' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}