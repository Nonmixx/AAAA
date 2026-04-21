import Link from 'next/link';
import { Heart, Package, MapPin, Sparkles, TrendingUp, Users, Zap, Shield } from 'lucide-react';

const featuredNeeds = [
  {
    id: 1,
    organization: 'Hope Orphanage',
    location: 'Kuala Lumpur',
    image: 'https://images.unsplash.com/photo-1771765767087-ce71e4a7916a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    need: 'Food Packs',
    quantity: 100,
    matched: 40,
    urgency: 'high',
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
  },
];

const stats = [
  { label: 'Total Donations', value: '15,234', icon: Package },
  { label: 'Active Donors', value: '3,421', icon: Users },
  { label: 'Organizations Helped', value: '127', icon: Heart },
  { label: 'Success Rate', value: '94%', icon: TrendingUp },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    description: 'Our intelligent system matches your donations with the organizations that need them most.',
  },
  {
    icon: Zap,
    title: 'Real-Time Tracking',
    description: 'Track your donations from allocation to delivery with live updates.',
  },
  {
    icon: Shield,
    title: 'Verified Organizations',
    description: 'All organizations are thoroughly verified to ensure your donations reach those in need.',
  },
];

export function DonorHome() {
  const scrollToNeeds = () => {
    document.getElementById('urgent-needs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1593113616828-6f22bca04804?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
          alt="Volunteers helping community"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-[#000000] bg-opacity-85 z-10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 z-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-[#edf2f4] rounded-full text-[#000000] text-sm mb-6 font-medium">
                🤖 Powered by AI Technology
              </div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">
                Make Every Donation Count with
                <span className="text-[#da1a32]"> AI Intelligence</span>
              </h1>
              <p className="text-xl text-white opacity-80 mb-8">
                Connect with verified organizations, track your impact, and ensure your donations reach those who need them most.
              </p>
              <div className="flex gap-4">
                <Link href="/login">
                  <button className="px-8 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium text-lg shadow-xl">
                    Start Donating
                  </button>
                </Link>
                <button
                  onClick={scrollToNeeds}
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white hover:text-[#000000] transition-all font-medium text-lg"
                >
                  Browse Needs
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 border-2 border-[#edf2f4] shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-8 h-8 text-[#da1a32]" />
                  <h3 className="text-2xl font-bold text-[#000000]">AI Donation Preview</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#edf2f4] rounded-lg p-4 border border-[#e5e5e5]">
                    <div className="text-sm text-gray-600 mb-1">Your Input</div>
                    <div className="text-[#000000]">I want to donate 50 blankets in Kuala Lumpur</div>
                  </div>
                  <div className="flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[#da1a32] animate-pulse" />
                  </div>
                  <div className="bg-[#da1a32] bg-opacity-10 rounded-lg p-4 border border-[#da1a32]">
                    <div className="text-sm text-[#000000] mb-2">✓ AI Matched</div>
                    <div className="text-[#000000] font-medium">Youth Shelter (30) + Hope Orphanage (20)</div>
                    <div className="text-sm text-gray-600 mt-1">Optimized for urgency & location</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#edf2f4] bg-opacity-20 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#000000] rounded-lg mb-4">
                    <Icon className="w-8 h-8 text-[#da1a32]" />
                  </div>
                  <div className="text-3xl font-bold text-[#000000] mb-1">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Needs */}
      <section id="urgent-needs" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#000000] mb-4">Urgent Needs Today</h2>
            <p className="text-xl text-gray-600">Organizations that need your support right now</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredNeeds.map((need) => (
              <div key={need.id} className="bg-white border-2 border-[#e5e5e5] rounded-lg overflow-hidden hover:border-[#da1a32] transition-all hover:shadow-xl">
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

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-[#000000] font-medium">{need.matched}/{need.quantity}</span>
                    </div>
                    <div className="w-full bg-[#e5e5e5] rounded-full h-2">
                      <div
                        className="bg-[#da1a32] h-2 rounded-full"
                        style={{ width: `${(need.matched / need.quantity) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link href="/login">
                    <button className="w-full py-3 bg-[#000000] text-white rounded-lg hover:bg-[#000000] transition-all font-medium">
                      Donate Now
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/needs">
              <button className="px-8 py-4 bg-white border-2 border-[#000000] text-[#000000] rounded-lg hover:bg-[#000000] hover:text-white transition-all font-medium">
                View All Needs
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#edf2f4] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-[#000000]">Why Choose DonateAI?</h2>
            <p className="text-xl text-gray-600">Experience the future of charitable giving</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white rounded-lg p-8 border-2 border-[#e5e5e5] hover:border-[#da1a32] transition-all hover:shadow-lg">
                  <div className="w-16 h-16 bg-[#da1a32] rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-[#000000]">{feature.title}</h3>
                  <p className="text-[#000000]">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#da1a32] to-[#b01528]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-white text-opacity-90 mb-8">
            Join thousands of donors who are changing lives with AI-powered giving
          </p>
          <Link href="/login">
            <button className="px-12 py-5 bg-white text-[#da1a32] rounded-lg hover:bg-[#edf2f4] hover:text-[#000000] transition-all font-medium text-xl shadow-xl">
              Start Your Journey
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}