import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Package, AlertCircle, Heart } from 'lucide-react';

export function ReceiverDetail() {
  const { id } = useParams();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/donor/needs" className="text-[#da1a32] hover:text-[#b01528] mb-6 inline-block font-medium">
        ← Back to Needs List
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-[#da1a32] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl mb-2 text-[#000000] font-bold">Hope Orphanage</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  Kuala Lumpur • 2.5 km away
                </div>
              </div>
            </div>

            <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4 mb-6">
              <h3 className="font-medium mb-2 text-[#000000]">About Organization</h3>
              <p className="text-sm text-gray-600">
                Hope Orphanage is a registered non-profit organization dedicated to providing care,
                education, and support to underprivileged children in Kuala Lumpur. We currently
                house 80 children aged 3-17 and provide them with shelter, food, education, and healthcare.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Phone className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Phone</div>
                  <div className="font-medium text-[#000000]">+60 3-1234 5678</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Mail className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Email</div>
                  <div className="font-medium text-[#000000]">contact@hopeorphanage.org</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Current Needs</h2>
            <div className="space-y-4">
              <div className="p-4 border-2 border-red-100 bg-red-50 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-red-600 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg text-[#000000]">Food Packs</h3>
                      <p className="text-sm text-gray-600">Essential food supplies for daily meals</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-full border border-red-200 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    High Priority
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl text-red-600 font-bold">100 units needed</div>
                  <div className="text-sm text-gray-600">Requested 2 days ago</div>
                </div>
              </div>

              <div className="p-4 border-2 border-yellow-100 bg-yellow-50 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-yellow-600 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg text-[#000000]">School Supplies</h3>
                      <p className="text-sm text-gray-600">Books, stationery, and learning materials</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full border border-yellow-200 font-medium">
                    Medium Priority
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl text-yellow-600 font-bold">50 units needed</div>
                  <div className="text-sm text-gray-600">Requested 1 week ago</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Location Map</h2>
            <div className="bg-gradient-to-br from-[#edf2f4] to-[#e5e5e5] rounded-xl h-64 flex items-center justify-center border-2 border-[#e5e5e5]">
              <div className="text-center text-gray-600">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-[#da1a32]" />
                <p className="text-[#000000] font-medium">Map showing Hope Orphanage</p>
                <p className="text-sm">No. 123, Jalan Bukit Bintang, Kuala Lumpur</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white sticky top-24 shadow-lg">
            <Heart className="w-12 h-12 mb-4" fill="white" />
            <h3 className="text-xl mb-3 font-bold">Support This Organization</h3>
            <p className="text-white opacity-80 text-sm mb-6">
              Your donation will directly help 80 children in need
            </p>
            <Link href="/donor/donate">
              <button className="w-full bg-white text-[#da1a32] py-3 rounded-xl hover:bg-[#edf2f4] transition-all mb-3 shadow-sm font-medium">
                Donate Now
              </button>
            </Link>
            <div className="text-center text-sm text-white opacity-80">
              Or browse other organizations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
