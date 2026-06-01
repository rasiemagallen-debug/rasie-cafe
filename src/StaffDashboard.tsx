import { useState, useEffect } from 'react'
import type { StaffMember, OrderRecord, ReservationRecord } from './AdminDashboard'
import { fetchOrders, fetchReservations, isSupabaseConfigured } from './lib/supabase'

function loadOrders(): OrderRecord[] {
  try { return JSON.parse(localStorage.getItem('orders') || '[]') } catch { return [] }
}

function loadReservations(): ReservationRecord[] {
  try { return JSON.parse(localStorage.getItem('reservations') || '[]') } catch { return [] }
}

function loadStaffPasswords(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('staffPasswords') || '{}') } catch { return {} }
}

function saveStaffPasswords(map: Record<string, string>) {
  localStorage.setItem('staffPasswords', JSON.stringify(map))
}

type TabKey = 'dashboard' | 'site' | 'password'

function StaffDashboard({ currentUser, onClose }: { currentUser: StaffMember; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    setOrders(loadOrders())
    setReservations(loadReservations())

    if (isSupabaseConfigured) {
      fetchOrders<OrderRecord>().then((d) => { if (d && d.length > 0) setOrders(d) }).catch(() => {})
      fetchReservations<ReservationRecord>().then((d) => { if (d && d.length > 0) setReservations(d) }).catch(() => {})
    }
  }, [])

  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.timestamp).toDateString() === today)
  const todayReservations = reservations.filter((r) => new Date(r.timestamp).toDateString() === today)
  const todayRevenue = todayOrders.reduce((s, o) => s + o.subtotal, 0)

  function handleChangePassword(event: React.FormEvent) {
    event.preventDefault()

    const stored = loadStaffPasswords()
    const defaultPasswords: Record<string, string> = { 'staff-1': 'faith', 'staff-2': '123456' }
    const actualCurrent = stored[currentUser.id] ?? defaultPasswords[currentUser.id] ?? ''

    if (currentPw !== actualCurrent) {
      setToastMessage('Current password is incorrect.')
      return
    }

    if (newPw.length < 4) {
      setToastMessage('New password must be at least 4 characters.')
      return
    }

    if (newPw !== confirmPw) {
      setToastMessage('Passwords do not match.')
      return
    }

    stored[currentUser.id] = newPw
    saveStaffPasswords(stored)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setToastMessage('Password changed successfully.')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-[#120804]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.4s_ease-out]">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#d4c1a5]">Staff dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Welcome, {currentUser.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7a77a]">
            Signed in as {currentUser.role.toUpperCase()} — {currentUser.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition-all duration-300 hover:-translate-y-0.5 ${activeTab === 'dashboard' ? 'bg-[#e1ab43] text-[#0c0502] shadow-[0_8px_25px_rgba(200,134,10,0.3)]' : 'border border-white/10 bg-white/5 text-[#d4c1a5] hover:border-[#e1ab43]/40 hover:text-[#f3cf86]'}`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => { onClose() }}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e1ab43]/40 hover:text-[#f3cf86]"
          >
            View Cafe Site
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition-all duration-300 hover:-translate-y-0.5 ${activeTab === 'password' ? 'bg-[#e1ab43] text-[#0c0502] shadow-[0_8px_25px_rgba(200,134,10,0.3)]' : 'border border-white/10 bg-white/5 text-[#d4c1a5] hover:border-[#e1ab43]/40 hover:text-[#f3cf86]'}`}
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setLogoutConfirm(true)}
            className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-red-400 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500/20"
          >
            Log out
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <section className="space-y-8 animate-[fade-in_0.3s_ease-out]">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Today's Revenue", value: `₱${todayRevenue.toLocaleString()}`, icon: '₱' },
              { label: "Today's Orders", value: `${todayOrders.length}`, icon: '📋' },
              { label: 'Reservations Today', value: `${todayReservations.length}`, icon: '📅' },
              { label: 'Your Role', value: currentUser.role.toUpperCase(), icon: '👤' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">{stat.label}</p>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="mt-4 text-4xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <h3 className="text-xl font-semibold text-white">Recent Orders</h3>
              <p className="mt-1 text-sm text-[#c7a77a]">Latest 5 orders</p>
              <div className="mt-5 space-y-3">
                {orders.length === 0 ? (
                  <p className="text-sm text-[#d4c1a5]">No orders yet.</p>
                ) : (
                  orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0c0502]/80 p-4">
                      <div>
                        <p className="text-sm text-white">Order #{o.id}</p>
                        <p className="mt-1 text-xs text-[#d4c1a5]">{new Date(o.timestamp).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-[#c7a77a]">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-lg font-semibold text-[#f3cf86]">₱{o.subtotal.toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <h3 className="text-xl font-semibold text-white">Reservations</h3>
              <p className="mt-1 text-sm text-[#c7a77a]">Latest 5 reservations</p>
              <div className="mt-5 space-y-3">
                {reservations.length === 0 ? (
                  <p className="text-sm text-[#d4c1a5]">No reservations yet.</p>
                ) : (
                  reservations.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#0c0502]/80 p-4">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{r.name}</p>
                        <p className="mt-1 truncate text-xs text-[#d4c1a5]">{r.date} at {r.time} — {r.guests}</p>
                      </div>
                      <p className="shrink-0 text-sm text-[#f3cf86]">{r.guests}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
            <div className="mt-5 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5"
              >
                View Cafe Site
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setLogoutConfirm(true)}
                className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-red-400 transition hover:bg-red-500/20"
              >
                Log out
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'password' ? (
        <section className="animate-[fade-in_0.3s_ease-out]">
          <div className="mx-auto max-w-lg rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <h2 className="text-2xl font-semibold text-white">Change Password</h2>
            <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
              Update your account password. Must be at least 4 characters.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleChangePassword}>
              <label className="block text-sm text-[#d4c1a5]">
                <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Current Password</span>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                />
              </label>

              <label className="block text-sm text-[#d4c1a5]">
                <span className="block uppercase tracking-[0.24em] text-[#a98b64]">New Password</span>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={4}
                  placeholder="At least 4 characters"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                />
              </label>

              <label className="block text-sm text-[#d4c1a5]">
                <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Confirm New Password</span>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={4}
                  placeholder="Repeat new password"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] shadow-[0_16px_40px_rgba(200,134,10,0.28)] transition hover:-translate-y-0.5"
              >
                Update Password
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {logoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#120804]/95 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <p className="text-lg font-semibold text-white">Log out</p>
            <p className="mt-3 text-sm leading-6 text-[#c7a77a]">Are you sure you want to log out of the staff dashboard?</p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setLogoutConfirm(false); onClose() }}
                className="flex-1 rounded-full bg-red-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_8px_25px_rgba(200,50,10,0.25)] transition hover:-translate-y-0.5"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 animate-[toast-in_0.3s_ease-out] rounded-3xl border border-[#e1ab43]/25 bg-[#120804]/95 px-5 py-4 text-sm text-[#f3cf86] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {toastMessage}
          <button type="button" onClick={() => setToastMessage(null)} className="ml-4 text-xs uppercase tracking-[0.28em] text-[#d4c1a5] hover:text-[#f3cf86]">Dismiss</button>
        </div>
      ) : null}
    </div>
  )
}

export default StaffDashboard
