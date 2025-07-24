'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Heart, Upload, Youtube, Settings, Database, MessageSquare, Sparkles, Menu, X, Crown, Store } from 'lucide-react'

// Dynamic imports to prevent SSR issues
const WeddingPodcastUpload = dynamic(() => import('@/components/WeddingPodcastUpload').then(mod => ({ default: mod.WeddingPodcastUpload })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-pulse text-rose-500">Loading wedding planner...</div>
    </div>
  )
})

import { UnifiedChatInterface } from '@/components/UnifiedChatInterface'
import { DocumentManager } from '@/components/DocumentManager'
import { YouTubeUpload } from '@/components/YouTubeUpload'
import { DatabaseView } from '@/components/DatabaseView'
import { CSVVendorUpload } from '@/components/CSVVendorUpload'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'smart' | 'vendors' | 'youtube' | 'manage' | 'database'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationItems = [
    { 
      id: 'chat', 
      label: 'Wedding Assistant', 
      icon: Heart, 
      description: 'AI Wedding Advice',
      color: 'rose',
      gradient: 'from-rose-500 to-pink-500'
    },
    { 
      id: 'smart', 
      label: 'Upload Content', 
      icon: Upload, 
      description: 'Add Wedding Resources',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500'
    },
    { 
      id: 'vendors', 
      label: 'Wedding Vendors', 
      icon: Store, 
      description: 'Upload Vendor Lists',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'youtube', 
      label: 'Video Content', 
      icon: Youtube, 
      description: 'Wedding Video Guides',
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-500'
    },
    { 
      id: 'manage', 
      label: 'My Planning Hub', 
      icon: Settings, 
      description: 'Organize Resources',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500'
    },
    { 
      id: 'database', 
      label: 'Knowledge Base', 
      icon: Database, 
      description: 'Browse All Content',
      color: 'slate',
      gradient: 'from-slate-500 to-gray-500'
    },
  ]

  const getPageTitle = () => {
    const item = navigationItems.find(item => item.id === activeTab)
    return item ? item.label : 'Shapash'
  }

  const getPageDescription = () => {
    const descriptions = {
      chat: 'Get personalized wedding planning advice from your AI assistant. Ask about venues, vendors, timelines, and more.',
      smart: 'Upload wedding podcasts, vendor lists, and planning resources to build your personalized knowledge base.',
      vendors: 'Upload CSV files containing wedding vendor information - florists, venues, photographers, and more. AI-powered processing for easy vendor discovery.',
      youtube: 'Process wedding planning videos and extract valuable advice to enhance your planning journey.',
      manage: 'Organize your wedding planning resources, vendor contacts, and planning materials in one beautiful space.',
      database: 'Explore all your wedding planning content, from vendor contacts to expert advice and planning tips.'
    }
    return descriptions[activeTab as keyof typeof descriptions] || ''
  }

  const getTabColorClasses = (item: any, isActive: boolean) => {
    if (!isActive) return 'text-gray-600 hover:text-gray-900 hover:bg-rose-50'
    
    const activeClasses = {
      rose: 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border-rose-200',
      emerald: 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200',
      green: 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200',
      purple: 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200',
      amber: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200',
      slate: 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-200'
    }
    
    return activeClasses[item.color as keyof typeof activeClasses] || activeClasses.rose
  }

  const getIconColorClasses = (item: any, isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 text-gray-500'
    
    const iconClasses = {
      rose: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-600',
      emerald: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600',
      green: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600',
      purple: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-600',
      amber: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-600',
      slate: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600'
    }
    
    return iconClasses[item.color as keyof typeof iconClasses] || iconClasses.rose
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md border-r border-rose-200/50 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-rose-200/50 bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
              <Crown className="w-6 h-6 text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Shapash
              </h1>
              <p className="text-xs text-rose-600/80 font-medium">Your Wedding Planning Expert</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-3">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeTab === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-medium text-sm transition-all duration-300 border ${getTabColorClasses(item, isActive)}`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${getIconColorClasses(item, isActive)}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-rose-200/50 bg-gradient-to-r from-rose-50/50 to-pink-50/50">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-rose-600">AI-Powered Wedding Planning</span>
            </div>
            <div className="text-xs text-rose-500/70">
              Making your perfect day possible
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header for Mobile */}
        <header className="lg:hidden bg-white/90 backdrop-blur-md border-b border-rose-200/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Header */}
        <div className="hidden lg:block border-b border-rose-200/50 bg-white/60 backdrop-blur-md shadow-sm">
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
            </div>
            <p className="text-rose-700/80 max-w-4xl text-lg leading-relaxed">{getPageDescription()}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'chat' && (
              <div className="h-full">
                <UnifiedChatInterface />
              </div>
            )}
            
            {activeTab === 'smart' && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-rose-200/50 p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-100 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
                <div className="relative z-10">
                  <WeddingPodcastUpload />
                </div>
              </div>
            )}

            {activeTab === 'vendors' && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-green-200/50 p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
                <div className="relative z-10">
                  <CSVVendorUpload />
                </div>
              </div>
            )}
            
            {activeTab === 'youtube' && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-purple-200/50 p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <YouTubeUpload />
                </div>
              </div>
            )}
            
            {activeTab === 'manage' && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-amber-200/50 p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <DocumentManager />
                </div>
              </div>
            )}
            
            {activeTab === 'database' && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/50 p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <DatabaseView />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
} 