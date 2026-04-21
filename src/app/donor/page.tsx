'use client';

import Link from 'next/link';
import { Heart, Package, MapPin, Sparkles, TrendingUp, Users, Zap, Shield } from 'lucide-react';
import { DonorLayout } from '../components/layouts/DonorLayout';

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

export default function DonorHomePage() {
  return (
    <DonorLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#000000] to-[#1a1a1a] text-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Give Smart,<br />Make Impact
              </h1>
              <p className="text-xl text-white opacity-80 mb-8 leading-relaxed">
                Our AI-powered platform ensures your donations reach the right organizations at the right time.
              </p>
              <div className="flex gap-4">
                <Link href="/signup/donor">
                  <button className="px-8 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-xl text-lg">
                    Start Donating
                  </button>
                </Link>
                <Link href="/donor/needs">
                  <button className="px-8 py-4 bg-white text-[#000000] rounded-lg hover:bg-gray-100 transition-all font-medium shadow-xl text-lg">
                    Browse Needs
                  </button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} className="text-center">
                        <Icon className="w-8 h-8 mx-auto mb-2 text-[#da1a32]" />
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm text-white opacity-70">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#000000] mb-4">Why Choose DonateAI?</h2>
            <p className="text-xl text-gray-600">Powered by cutting-edge AI to maximize your impact</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white rounded-xl p-8 border-2 border-[#edf2f4] hover:border-[#da1a32] hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-[#da1a32] rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#000000] mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Needs */}
      <section className="py-20 bg-[#edf2f4]/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-bold text-[#000000] mb-2">Urgent Needs</h2>
              <p className="text-xl text-gray-600">Organizations that need your help right now</p>
            </div>
            <Link href="/donor/needs">
              <button className="px-6 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg">
                View All
              </button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredNeeds.map((need) => (
              <Link key={need.id} href={`/donor/needs/${need.id}`}>
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer">
                  <div className="relative h-48">
                    <img src={need.image} alt={need.need} className="w-full h-full object-cover" />
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
                      need.urgency === 'high' ? 'bg-[#da1a32] text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {need.urgency === 'high' ? '🔴 Urgent' : '⚠️ High Priority'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#000000] mb-2">{need.organization}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{need.location}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Need: {need.need}</div>
                        <div className="text-sm font-bold text-[#da1a32]">{need.matched}/{need.quantity} Matched</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Progress</div>
                        <div className="text-lg font-bold text-[#000000]">{Math.round((need.matched/need.quantity)*100)}%</div>
                      </div>
                    </div>
                    <div className="mt-3 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#da1a32] h-2 rounded-full"
                        style={{ width: `${(need.matched/need.quantity)*100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#000000] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Heart className="w-16 h-16 mx-auto mb-6 text-[#da1a32]" fill="#da1a32" />
          <h2 className="text-4xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-xl text-white opacity-80 mb-8">
            Join thousands of donors who are changing lives with AI-powered giving
          </p>
          <Link href="/signup/donor">
            <button className="px-10 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-xl text-lg">
              Create Your Account
            </button>
          </Link>
        </div>
      </section>
    </DonorLayout>
  );
}
