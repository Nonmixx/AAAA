import { Building2, Mail, Phone, MapPin, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';

export function ReceiverProfile() {
  const verificationStatus = 'approved'; // 'pending', 'approved', 'rejected'

  const statusConfig = {
    pending: {
      color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      icon: Clock,
      label: 'Pending Review',
      message: 'Your application is under review. We will notify you within 24-48 hours.',
    },
    approved: {
      color: 'bg-green-50 text-green-600 border-green-100',
      icon: CheckCircle2,
      label: 'Approved',
      message: 'Your organization has been verified and approved.',
    },
    rejected: {
      color: 'bg-red-50 text-red-600 border-red-100',
      icon: XCircle,
      label: 'Rejected',
      message: 'Your application was not approved. Please contact support for more information.',
    },
  };

  const StatusIcon = statusConfig[verificationStatus].icon;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Organization Profile</h1>
        <p className="text-gray-600">Manage your organization information and verification status</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Organization Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    defaultValue="Hope Orphanage"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Registration Number</label>
                <input
                  type="text"
                  defaultValue="REG-2024-001234"
                  className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      defaultValue="contact@hopeorphanage.org"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      defaultValue="+60 3-1234 5678"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    rows={3}
                    defaultValue="No. 123, Jalan Bukit Bintang, Kuala Lumpur, 50250"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Description</label>
                <textarea
                  rows={4}
                  defaultValue="Hope Orphanage is a registered non-profit organization dedicated to providing care, education, and support to underprivileged children in Kuala Lumpur. We currently house 80 children aged 3-17."
                  className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>

              <button className="bg-[#da1a32] text-white px-6 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium">
                Save Changes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Verification Documents</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">Registration Certificate</div>
                  <div className="text-sm text-gray-600">registration-cert.pdf • 2.4 MB</div>
                </div>
                <button className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium">View</button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">Tax Exemption Letter</div>
                  <div className="text-sm text-gray-600">tax-exemption.pdf • 1.8 MB</div>
                </div>
                <button className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium">View</button>
              </div>

              <button className="w-full border-2 border-dashed border-[#e5e5e5] rounded-xl p-6 text-center hover:border-[#da1a32] transition-colors">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">Upload Additional Documents</div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className={`rounded-2xl p-6 border-2 shadow-sm ${statusConfig[verificationStatus].color}`}>
            <div className="flex items-center gap-3 mb-4">
              <StatusIcon className="w-8 h-8" />
              <div>
                <h3 className="text-lg">Verification Status</h3>
                <div className="text-sm opacity-80">{statusConfig[verificationStatus].label}</div>
              </div>
            </div>
            <p className="text-sm">{statusConfig[verificationStatus].message}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg mb-4 text-[#000000] font-bold">Organization Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Needs</span>
                <span className="font-medium text-[#000000]">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Donations Received</span>
                <span className="font-medium text-[#000000]">42</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Items Received</span>
                <span className="font-medium text-[#000000]">850</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="font-medium text-[#000000]">Jan 2026</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
            <Building2 className="w-10 h-10 mb-3" />
            <h3 className="text-lg mb-2 font-bold">Need Help?</h3>
            <p className="text-sm text-white opacity-80 mb-4">
              Contact our support team for assistance with your account
            </p>
            <button className="w-full bg-white text-[#da1a32] py-2 rounded-xl hover:bg-[#edf2f4] transition-all text-sm shadow-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
