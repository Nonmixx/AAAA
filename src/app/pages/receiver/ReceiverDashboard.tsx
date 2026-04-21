import Link from 'next/link';
import { Package, AlertCircle, TrendingUp, Plus, Inbox } from 'lucide-react';

export function ReceiverDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Dashboard</h1>
        <p className="text-gray-600">Overview of your organization's needs and incoming support</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#edf2f4] rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">5</div>
          <div className="text-sm text-gray-600">Active Needs</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#edf2f4] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">8</div>
          <div className="text-sm text-gray-600">Incoming Donations</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">2</div>
          <div className="text-sm text-gray-600">Urgent Alerts</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Link href="/receiver/create-needs">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-8 text-white hover:shadow-xl transition-all cursor-pointer group">
            <Plus className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl mb-2 font-bold">Create New Need</h2>
            <p className="text-white opacity-80">Post your organization's requirements</p>
          </div>
        </Link>

        <Link href="/receiver/incoming">
          <div className="bg-gradient-to-br from-[#000000] to-[#000000] rounded-2xl p-8 text-white hover:shadow-xl transition-all cursor-pointer group">
            <Inbox className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl mb-2 font-bold">Incoming Donations</h2>
            <p className="text-white opacity-80">Review and manage donation offers</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm mb-6">
        <h3 className="text-xl mb-4 text-[#000000] font-bold">Urgent Needs</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#000000]">Food Packs - 100 units</div>
              <div className="text-sm text-gray-600">Posted 2 days ago • High Priority</div>
            </div>
            <div className="text-sm text-red-600 font-medium">40% matched</div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#000000]">Medical Supplies - 30 units</div>
              <div className="text-sm text-gray-600">Posted 5 days ago • High Priority</div>
            </div>
            <div className="text-sm text-red-600 font-medium">0% matched</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
        <h3 className="text-xl mb-4 text-[#000000] font-bold">Recent Donations</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
            <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#000000]">60 Food Packs from Sarah Johnson</div>
              <div className="text-sm text-gray-600">2 hours ago</div>
            </div>
            <div className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-100 font-medium">Accepted</div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
            <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#000000]">40 School Supplies from Michael Chen</div>
              <div className="text-sm text-gray-600">1 day ago</div>
            </div>
            <div className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs rounded-full border border-yellow-100 font-medium">Pending</div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
            <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#000000]">25 Blankets from Lisa Wong</div>
              <div className="text-sm text-gray-600">3 days ago</div>
            </div>
            <div className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-100 font-medium">Delivered</div>
          </div>
        </div>
      </div>
    </div>
  );
}
