'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { formatPrice } from '@/lib/helpers'
import { Loader2 } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AnalyticsContent />
    </ProtectedRoute>
  )
}

function AnalyticsContent() {
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [userRoleData, setUserRoleData] = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      // 1. Fetch Orders for Revenue & Status
      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_price, status')

      // Process Orders for Revenue Timeline (Last 30 days approx, or grouped by date)
      if (orders) {
        const revMap = {}
        const statusMap = {}
        
        orders.forEach(o => {
          // Status Map
          statusMap[o.status] = (statusMap[o.status] || 0) + 1

          // Revenue Maps
          if (o.status !== 'cancelled') {
            const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            revMap[date] = (revMap[date] || 0) + Number(o.total_price)
          }
        })

        // Format to array for Recharts
        const sortedDates = Object.keys(revMap).sort((a, b) => new Date(a) - new Date(b))
        setRevenueData(sortedDates.map(date => ({ date, amount: revMap[date] })))

        setOrderStatusData(Object.entries(statusMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })))
      }

      // 2. Fetch Listings for Category Distribution
      const { data: listings } = await supabase
        .from('listings')
        .select(`category_id, animal_categories(name)`)

      if (listings) {
        const catMap = {}
        listings.forEach(l => {
          const catName = l.animal_categories?.name || 'Unknown'
          catMap[catName] = (catMap[catName] || 0) + 1
        })
        setCategoryData(Object.entries(catMap).map(([cat, count]) => ({ name: cat, count })))
      }

      // 3. Fetch Profiles for Growth/Roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role')
      
      if (profiles) {
        const roleMap = {}
        profiles.forEach(p => {
          const r = p.role.charAt(0).toUpperCase() + p.role.slice(1)
          roleMap[r] = (roleMap[r] || 0) + 1
        })
        setUserRoleData(Object.entries(roleMap).map(([name, value]) => ({ name, value })))
      }

      setLoading(false)
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
  }

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-stone-200 p-3 rounded-lg shadow-sm text-sm">
          <p className="font-semibold text-stone-800 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Platform Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Daily Revenue</h2>
          <div className="h-[300px] w-full">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                  <YAxis 
                    axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} 
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip content={<CustomTooltip formatter={(val) => formatPrice(val)} />} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-stone-400 text-sm">No revenue data available</div>
            )}
          </div>
        </div>

        {/* User Roles */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">User Distribution</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            {userRoleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRoleData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {userRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-stone-400 text-sm">No users data available</div>
            )}
          </div>
        </div>

        {/* Category Listings Distribution */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Listings by Category</h2>
          <div className="h-[300px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} width={80} />
                  <Tooltip cursor={{ fill: '#f5f5f5' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-stone-400 text-sm">No listings data available</div>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Order Statuses</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%" cy="50%"
                    outerRadius={100}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-stone-400 text-sm">No order data available</div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
