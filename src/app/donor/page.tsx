'use client';

import Link from 'next/link';
import { Heart, Package, MapPin, Sparkles, TrendingUp, Users, Zap, Shield } from 'lucide-react';
import { DonorLayout } from '../components/layouts/DonorLayout';
import { impactDeliveryCards } from './data/impactDeliveryCards';

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
  { label: 'Donations', value: '15K+', icon: Package },
  { label: 'Active Donors', value: '3K+', icon: Users },
  { label: 'Organizations', value: '120+', icon: Heart },
  { label: 'Trusted & Verified Deliveries', value: 'Trusted', icon: TrendingUp },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    description: 'AI matches donations to real needs instantly.',
  },
  {
    icon: Zap,
    title: 'Real-Time Tracking',
    description: 'Track every donation in real time.',
  },
  {
    icon: Shield,
    title: 'Verified Organizations',
    description: 'All organizations are verified before approval.',
  },
];

export default function DonorHomePage() {
  const liveNotifications = [
    'New emergency request in Selangor',
    'Donation delivered successfully',
    'A new verified organization joined in Klang Valley',
  ];

  return (
    <DonorLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#000000] to-[#1a1a1a] text-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Give Smart,<br /> Make Impact
              </h1>
              <p className="text-xl text-white opacity-80 mb-8 leading-relaxed">
                Let AI match your donation to the right organizations instantly - fast, transparent, and trusted.
              </p>
              <div className="flex gap-4">
                <Link href="/signup/donor">
                  <button className="px-8 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.02] transition-all duration-200 font-medium shadow-xl text-lg">
                    Start Donating
                  </button>
                </Link>
                <Link href="/corporate/pricing">
                  <button className="px-8 py-4 bg-white text-[#000000] rounded-lg hover:bg-gray-100 hover:scale-[1.02] transition-all duration-200 font-medium shadow-xl text-lg">
                    For Enterprise
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

      {/* Live Activity Ticker */}
      <section className="bg-gradient-to-r from-[#050505] via-[#0b0b0b] to-[#050505] border-t border-white/10 border-b border-[#da1a32]/60 shadow-[inset_0_-1px_0_0_rgba(218,26,50,0.35)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative flex items-center gap-4 overflow-hidden py-2.5">
            <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#da1a32]/40 bg-[#da1a32]/10">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#da1a32] animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white">Live</span>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div className="ticker-fade-left absolute left-0 top-0 h-full w-12 z-10" />
              <div className="ticker-fade-right absolute right-0 top-0 h-full w-12 z-10" />
              <div className="flex w-max whitespace-nowrap ticker-track text-sm text-white/85">
                {[...liveNotifications, ...liveNotifications].map((message, index) => (
                  <span key={`${message}-${index}`} className="inline-flex items-center">
                    <span>{message}</span>
                    <span className="mx-6 text-[#da1a32]/80">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#edf2f4]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#000000] mb-4">Why Choose DonateAI?</h2>
            <p className="text-xl text-gray-600">Powered by cutting-edge AI to maximize your impact</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white rounded-xl p-8 border-2 border-[#edf2f4] hover:border-[#da1a32] hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
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

      {/* Trust Block */}
      <section className="py-16 bg-[#edf2f4]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h3 className="text-4xl font-bold text-[#000000] mb-4">Trust & verification</h3>
            <p className="text-gray-600 text-lg">
              Fear of scams stops giving. We designed the platform so legitimacy is visible, not assumed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-[#dbe2e8] p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#000000] flex items-center justify-center mb-5">
                <Shield className="w-5 h-5 text-[#da1a32]" />
              </div>
              <h4 className="text-2xl font-bold text-[#000000] mb-3">Verified organizations</h4>
              <p className="text-gray-600 leading-relaxed">
                Every NGO completes identity, mission, and contact checks before they can receive matches.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#dbe2e8] p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#000000] flex items-center justify-center mb-5">
                <Sparkles className="w-5 h-5 text-[#da1a32]" />
              </div>
              <h4 className="text-2xl font-bold text-[#000000] mb-3">Documents reviewed</h4>
              <p className="text-gray-600 leading-relaxed">
                Registration papers and authorization evidence are reviewed by our team before approval.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#dbe2e8] p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#000000] flex items-center justify-center mb-5">
                <TrendingUp className="w-5 h-5 text-[#da1a32]" />
              </div>
              <h4 className="text-2xl font-bold text-[#000000] mb-3">Transparent tracking</h4>
              <p className="text-gray-600 leading-relaxed">
                Milestones, handoffs, and proof of delivery are stored with each donation for accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Impact Board */}
      <section className="py-24 bg-[#edf2f4]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end gap-4 mb-10">
            <div className="flex-1 min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#da1a32] mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#da1a32] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#da1a32]" />
                </span>
                <span className="animate-pulse">Live Donations Waiting for Delivery</span>
              </p>
              <h2 className="text-4xl font-bold text-[#000000] mb-3">Community Impact Board</h2>
              <p className="text-lg text-gray-600 max-w-none xl:whitespace-nowrap">
                These matched donations are ready to go, but they need a ride. Sponsor a delivery to make an instant impact.
              </p>
            </div>
            <Link href="/donor/community-impact">
              <button className="px-6 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shrink-0 whitespace-nowrap">
                View All
              </button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {impactDeliveryCards.slice(0, 3).map((card) => (
              <div key={card.title} className="bg-white border-2 border-[#edf2f4] rounded-2xl shadow-lg p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <h3 className="text-xl font-bold text-[#000000] mb-5">{card.title}</h3>

                <div className="space-y-4 mb-6">
                  <p className="text-base text-[#000000] font-normal">Item: {card.item}</p>
                  <p className="text-sm text-gray-500">From {card.route}</p>
                </div>

                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-6 ${card.badgeClass}`}>
                  {card.status}
                </div>

                <div className="border-t border-[#edf2f4] pt-4 space-y-2 mb-7 text-[#000000]">
                  <p className="text-sm text-gray-600">Delivery Cost: {card.deliveryCost}</p>
                  <p className="text-sm text-gray-600">Platform Fee: {card.platformFee}</p>
                </div>

                <Link href="/login?redirect=%2Fdonor%2Fcheckout">
                  <button className="w-full px-5 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.01] transition-all duration-200 font-semibold shadow-lg">
                    {card.payText}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Needs */}
      <section className="py-24 bg-[#edf2f4]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-bold text-[#000000] mb-2">Urgent Needs</h2>
              <p className="text-xl text-gray-600">High-priority requests that need immediate support</p>
            </div>
            <Link href="/donor/needs">
              <button className="px-6 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg">
                View All
              </button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredNeeds.map((need) => (
              <Link key={need.id} href={`/donor/needs/${need.id}`}>
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer">
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
      <section className="py-24 bg-[#000000] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Heart className="w-16 h-16 mx-auto mb-6 text-[#da1a32]" fill="#da1a32" />
          <h2 className="text-4xl font-bold mb-4">Ready to Make a Real Impact?</h2>
          <p className="text-xl text-white opacity-80 mb-8">
            Start donating smarter with AI-powered matching and transparent delivery.
          </p>
          <Link href="/signup/donor">
            <button className="px-10 py-4 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.02] transition-all duration-200 font-medium shadow-xl text-lg">
              Create Your Account
            </button>
          </Link>
        </div>
      </section>
      <style jsx>{`
        .ticker-track {
          animation: liveTicker 22s linear infinite;
        }

        .ticker-fade-left {
          background: linear-gradient(to right, #0a0a0a 5%, rgba(10, 10, 10, 0));
        }

        .ticker-fade-right {
          background: linear-gradient(to left, #0a0a0a 5%, rgba(10, 10, 10, 0));
        }

        @keyframes liveTicker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </DonorLayout>
  );
}
