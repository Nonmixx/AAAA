import Link from 'next/link';
import { MapPin, Heart, Filter, Search } from 'lucide-react';

const urgentNeeds = [
  {
    id: 1,
    organization: 'Hope Orphanage',
    location: 'Kuala Lumpur',
    image: 'https://images.unsplash.com/photo-1771765767087-ce71e4a7916a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Food Packs',
    quantity: 100,
    matched: 40,
    urgency: 'high',
    description: 'Nutritious food packs for children in need. Each pack contains essential food items for a week.',
  },
  {
    id: 2,
    organization: 'Care Foundation',
    location: 'Petaling Jaya',
    image: 'https://images.unsplash.com/photo-1763070282928-fe1135165d6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Medical Supplies',
    quantity: 30,
    matched: 18,
    urgency: 'high',
    description: 'Essential medical supplies including first aid kits, bandages, and basic medications.',
  },
  {
    id: 3,
    organization: 'Elderly Care Center',
    location: 'Shah Alam',
    image: 'https://images.unsplash.com/photo-1608979827489-2b855e79debe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Wheelchairs',
    quantity: 10,
    matched: 3,
    urgency: 'medium',
    description: 'Mobility support for elderly residents who need assistance with movement.',
  },
  {
    id: 4,
    organization: 'Youth Shelter',
    location: 'Subang Jaya',
    image: 'https://images.unsplash.com/photo-1509099652299-30938b0aeb63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Blankets',
    quantity: 50,
    matched: 25,
    urgency: 'high',
    description: 'Warm blankets for homeless youth during the cold season.',
  },
  {
    id: 5,
    organization: 'Community Kitchen',
    location: 'Kuala Lumpur',
    image: 'https://images.unsplash.com/photo-1593113598332-39eca1396e8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Cooking Equipment',
    quantity: 15,
    matched: 7,
    urgency: 'medium',
    description: 'Essential cooking equipment to prepare meals for the community.',
  },
  {
    id: 6,
    organization: 'Education Center',
    location: 'Klang',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'School Supplies',
    quantity: 200,
    matched: 120,
    urgency: 'medium',
    description: 'Books, stationery, and learning materials for underprivileged children.',
  },
];

export function ViewNeeds() {
  return (
    <div className="bg-white min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#000000] text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">
              Urgent Needs <span className="text-[#da1a32]">Today</span>
            </h1>
            <p className="text-xl text-white opacity-80 mb-8">
              Organizations that need your support right now
            </p>
            <div className="flex items-center justify-center gap-4 text-[#edf2f4]">
              <Heart className="w-5 h-5 text-[#da1a32]" />
              <span>Every donation makes a difference</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Bar */}
      <section className="bg-[#edf2f4] py-6 border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for needs, organizations, or locations..."
                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#da1a32]"
              />
            </div>
            <button className="px-6 py-3 bg-white border border-[#e5e5e5] rounded-lg hover:border-[#da1a32] transition-all flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>
        </div>
      </section>

      {/* Needs Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#000000] mb-2">
              {urgentNeeds.length} Active Needs
            </h2>
            <p className="text-gray-600">
              Browse all current urgent needs from verified organizations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {urgentNeeds.map((need) => (
              <div
                key={need.id}
                className="bg-white border-2 border-[#e5e5e5] rounded-lg overflow-hidden hover:border-[#da1a32] transition-all hover:shadow-xl"
              >
                <div className="relative">
                  <img src={need.image} alt={need.need} className="w-full h-48 object-cover" />
                  {need.urgency === 'high' && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-[#da1a32] text-white text-sm font-medium rounded-full">
                      URGENT
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#000000] mb-2">{need.need}</h3>
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    {need.organization} • {need.location}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {need.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-[#000000] font-medium">
                        {need.matched}/{need.quantity}
                      </span>
                    </div>
                    <div className="w-full bg-[#e5e5e5] rounded-full h-2">
                      <div
                        className="bg-[#da1a32] h-2 rounded-full transition-all"
                        style={{ width: `${(need.matched / need.quantity) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round((need.matched / need.quantity) * 100)}% fulfilled
                    </div>
                  </div>

                  <Link href="/login">
                    <button className="w-full py-3 bg-[#000000] text-white rounded-lg hover:bg-[#da1a32] transition-all font-medium">
                      Donate Now
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#edf2f4] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-[#000000] mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Sign up today and start helping organizations in need with AI-powered donation matching
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup">
              <button className="px-8 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium text-lg shadow-lg">
                Create Account
              </button>
            </Link>
            <Link href="/login">
              <button className="px-8 py-4 bg-white border-2 border-[#000000] text-[#000000] rounded-lg hover:bg-[#000000] hover:text-white transition-all font-medium text-lg">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
