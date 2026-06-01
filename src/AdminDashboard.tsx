import { type FormEvent, useMemo, useState, useEffect } from 'react'
import { fetchStaff, insertStaff, updateStaff, removeStaff, isSupabaseConfigured, fetchOrders, fetchReservations, fetchUsers, insertUser, updateUser, removeUser, upsertStoreSettings, type StoreSettings, fetchStoreSettings, insertLog } from './lib/supabase'

export type StaffRole = 'admin' | 'manager' | 'barista' | 'host'

export type StaffMember = {
  id: string
  name: string
  email: string
  role: StaffRole
  status: 'Active' | 'Inactive'
  lastSeen: string
  requiresPasswordReset: boolean
}

export type OrderRecord = {
  id: number
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  notes?: string
  timestamp: string
}

export type ReservationRecord = {
  id: number
  name: string
  phone: string
  date: string
  time: string
  guests: string
  notes?: string
  timestamp: string
}

export type CustomerUser = {
  id: string
  name: string
  phone: string
  email: string
  totalOrders: number
  lastVisit: string
  notes: string
}

export type LogEntry = {
  id: string
  user: string
  action: string
  when: string
  details: string
}

export const initialStaff: StaffMember[] = [
  { id: 'staff-1', name: 'Raseph Admin', email: 'admin@rasephcafe.com', role: 'admin', status: 'Active', lastSeen: 'Just now', requiresPasswordReset: false },
  { id: 'staff-2', name: 'Mia Santos', email: 'mia@rasephcafe.com', role: 'manager', status: 'Active', lastSeen: '10 min ago', requiresPasswordReset: false },
  { id: 'staff-3', name: 'Jonah Cruz', email: 'jonah@rasephcafe.com', role: 'barista', status: 'Active', lastSeen: '18 min ago', requiresPasswordReset: false },
  { id: 'staff-4', name: 'Leah Reyes', email: 'leah@rasephcafe.com', role: 'host', status: 'Inactive', lastSeen: 'Yesterday', requiresPasswordReset: false },
]

const initialLogs: LogEntry[] = [
  { id: 'log-1', user: 'Raseph Admin', action: 'Signed in', when: '2 min ago', details: 'Successful admin login from 192.168.1.24' },
  { id: 'log-2', user: 'Mia Santos', action: 'Added staff member', when: '12 min ago', details: 'Created user Jonah Cruz with role barista' },
  { id: 'log-3', user: 'Jonah Cruz', action: 'Viewed orders', when: '18 min ago', details: 'Previewed today\'s order summary' },
  { id: 'log-4', user: 'Leah Reyes', action: 'Updated reservation', when: 'Yesterday', details: 'Changed party size for reservation #RES-042' },
]

const defaultStoreSettings: StoreSettings = {
  cafeName: 'Raseph Cafe',
  tagline: 'Espresso • Desserts • Slow moments',
  openingHours: '8:00 AM',
  closingHours: '10:00 PM',
  address: 'Imus, Cavite, Philippines',
  phone: '+63 900 000 0000',
  email: 'hello@rasephcafe.com',
  instagram: '',
  facebook: '',
  currency: '₱',
}

function createId() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadOrders(): OrderRecord[] {
  try { return JSON.parse(localStorage.getItem('orders') || '[]') } catch { return [] }
}

function loadReservations(): ReservationRecord[] {
  try { return JSON.parse(localStorage.getItem('reservations') || '[]') } catch { return [] }
}

function loadLogs(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem('adminLogs') || '[]') } catch { return [] }
}

function saveLogs(logs: LogEntry[]) {
  localStorage.setItem('adminLogs', JSON.stringify(logs))
}

function loadCustomerUsers(): CustomerUser[] {
  try { return JSON.parse(localStorage.getItem('customerUsers') || '[]') } catch { return [] }
}

function saveCustomerUsers(users: CustomerUser[]) {
  localStorage.setItem('customerUsers', JSON.stringify(users))
}

function loadStoreSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem('storeSettings')
    return saved ? { ...defaultStoreSettings, ...JSON.parse(saved) } : defaultStoreSettings
  } catch { return defaultStoreSettings }
}

function addLogEntry(user: string, action: string, details: string) {
  const entry: LogEntry = {
    id: createId(),
    user,
    action,
    when: new Date().toLocaleString(),
    details,
  }
  const logs = loadLogs()
  logs.unshift(entry)
  saveLogs(logs)
  insertLog(entry).catch(() => {})
}

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'staff', label: 'Staff Management' },
  { key: 'users', label: 'User Management' },
  { key: 'settings', label: 'Store Settings' },
  { key: 'logs', label: 'Logs' },
  { key: 'preview', label: 'Staff Preview' },
] as const

type TabKey = typeof tabs[number]['key']

function AdminDashboard({ onClose, currentUser }: { onClose: () => void; currentUser?: StaffMember | null }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'barista' as StaffRole,
    status: 'Active' as StaffMember['status'],
  })

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([])
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(defaultStoreSettings)

  const [selectedUser, setSelectedUser] = useState<CustomerUser | null>(null)
  const [userForm, setUserForm] = useState({ name: '', phone: '', email: '', notes: '' })

  const [settingsDirty, setSettingsDirty] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    setOrders(loadOrders())
    setReservations(loadReservations())
    setLogs(loadLogs())
    setCustomerUsers(loadCustomerUsers())
    setStoreSettings(loadStoreSettings())

    fetchStaff<StaffMember>().then((data) => {
      if (data && data.length > 0) setStaff(data)
    }).catch(() => {})

    fetchReservations<ReservationRecord>().then((data) => {
      if (data && data.length > 0) setReservations(data)
    }).catch(() => {})

    fetchOrders<OrderRecord>().then((data) => {
      if (data && data.length > 0) setOrders(data)
    }).catch(() => {})

    fetchUsers<CustomerUser>().then((data) => {
      if (data && data.length > 0) setCustomerUsers(data)
    }).catch(() => {})

    fetchStoreSettings().then((data) => {
      if (data) setStoreSettings(data)
    }).catch(() => {})
  }, [])

  const metrics = useMemo(() => {
    const today = new Date().toDateString()
    const todayOrders = orders.filter((o) => new Date(o.timestamp).toDateString() === today)
    const todayReservations = reservations.filter((r) => new Date(r.timestamp).toDateString() === today)
    const totalRevenue = todayOrders.reduce((s, o) => s + o.subtotal, 0)
    return {
      staffCount: staff.length,
      activeStaff: staff.filter((s) => s.status === 'Active').length,
      todayOrders: todayOrders.length,
      todayReservations: todayReservations.length,
      totalRevenue,
      logsCount: logs.length,
      totalUsers: customerUsers.length,
    }
  }, [staff, orders, reservations, logs, customerUsers])

  const selectedPreview = selectedStaff ?? staff.find((m) => m.role !== 'admin') ?? staff[0]

  function handleInputChange(event: FormEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    setFormState((prev) => ({ ...prev, [target.name]: target.value }))
  }

  async function handleSaveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formState.name.trim() || !formState.email.trim()) {
      setToastMessage('Please fill in both name and email.')
      return
    }

    if (selectedStaff) {
      const updates = { name: formState.name, email: formState.email, role: formState.role, status: formState.status }
      if (isSupabaseConfigured) updateStaff(selectedStaff.id, updates).catch(() => {})
      setStaff((c) => c.map((m) => m.id === selectedStaff.id ? { ...m, ...updates } : m))
      setSelectedStaff(null)
      addLogEntry(currentUser?.name ?? 'Admin', 'Updated staff', `Updated ${formState.name}`)
      setToastMessage('Staff profile updated successfully.')
    } else {
      const member: StaffMember = {
        id: createId(),
        name: formState.name,
        email: formState.email,
        role: formState.role,
        status: formState.status,
        lastSeen: 'Never signed in',
        requiresPasswordReset: true,
      }
      if (isSupabaseConfigured) insertStaff(member).catch(() => {})
      setStaff((c) => [member, ...c])
      addLogEntry(currentUser?.name ?? 'Admin', 'Added staff', `Created ${formState.name} as ${formState.role}`)
      setToastMessage('New staff added. Default password is 123456.')
    }

    setFormState({ name: '', email: '', role: 'barista', status: 'Active' })
  }

  function editStaff(member: StaffMember) {
    setSelectedStaff(member)
    setFormState({ name: member.name, email: member.email, role: member.role, status: member.status })
    setActiveTab('staff')
  }

  function deleteStaff(id: string) {
    const member = staff.find((m) => m.id === id)
    if (isSupabaseConfigured) removeStaff(id).catch(() => {})
    setStaff((c) => c.filter((m) => m.id !== id))
    addLogEntry(currentUser?.name ?? 'Admin', 'Deleted staff', `Deleted ${member?.name ?? id}`)
    setToastMessage('Staff deleted successfully.')
  }

  function resetPassword(id: string) {
    if (isSupabaseConfigured) updateStaff(id, { requiresPasswordReset: true }).catch(() => {})
    setStaff((c) => c.map((m) => m.id === id ? { ...m, requiresPasswordReset: true } : m))
    const member = staff.find((m) => m.id === id)
    addLogEntry(currentUser?.name ?? 'Admin', 'Reset password', `Reset password for ${member?.name ?? id}`)
    setToastMessage(`${member?.name ?? 'Staff'} password reset to 123456.`)
  }

  function undoSelectStaff() {
    setSelectedStaff(null)
    setFormState({ name: '', email: '', role: 'barista', status: 'Active' })
  }

  function handleUserInputChange(event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    setUserForm((prev) => ({ ...prev, [target.name]: target.value }))
  }

  function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userForm.name.trim()) {
      setToastMessage('Please enter a name.')
      return
    }

    if (selectedUser) {
      const updates = { ...userForm }
      setCustomerUsers((c) => {
        const next = c.map((u) => u.id === selectedUser.id ? { ...u, ...updates } : u)
        saveCustomerUsers(next)
        return next
      })
      if (isSupabaseConfigured) updateUser(selectedUser.id, updates).catch(() => {})
      setSelectedUser(null)
      addLogEntry(currentUser?.name ?? 'Admin', 'Updated user', `Updated ${userForm.name}`)
      setToastMessage('Customer profile updated.')
    } else {
      const user: CustomerUser = {
        id: createId(),
        ...userForm,
        totalOrders: 0,
        lastVisit: new Date().toISOString(),
      }
      setCustomerUsers((c) => {
        const next = [user, ...c]
        saveCustomerUsers(next)
        return next
      })
      if (isSupabaseConfigured) insertUser(user).catch(() => {})
      addLogEntry(currentUser?.name ?? 'Admin', 'Added user', `Added customer ${userForm.name}`)
      setToastMessage('Customer added.')
    }

    setUserForm({ name: '', phone: '', email: '', notes: '' })
  }

  function editUser(user: CustomerUser) {
    setSelectedUser(user)
    setUserForm({ name: user.name, phone: user.phone, email: user.email, notes: user.notes })
    setActiveTab('users')
  }

  function deleteUser(id: string) {
    const user = customerUsers.find((u) => u.id === id)
    setCustomerUsers((c) => {
      const next = c.filter((u) => u.id !== id)
      saveCustomerUsers(next)
      return next
    })
    if (isSupabaseConfigured) removeUser(id).catch(() => {})
    addLogEntry(currentUser?.name ?? 'Admin', 'Deleted user', `Deleted customer ${user?.name ?? id}`)
    setToastMessage('Customer deleted.')
  }

  function undoSelectUser() {
    setSelectedUser(null)
    setUserForm({ name: '', phone: '', email: '', notes: '' })
  }

  function handleSaveSettings() {
    localStorage.setItem('storeSettings', JSON.stringify(storeSettings))
    addLogEntry(currentUser?.name ?? 'Admin', 'Updated settings', 'Store settings saved')
    if (isSupabaseConfigured) upsertStoreSettings(storeSettings).catch(() => {})
    setSettingsDirty(false)
    setToastMessage('Settings saved successfully.')
  }

  function updateSetting(key: keyof StoreSettings, value: string) {
    setStoreSettings((prev) => ({ ...prev, [key]: value }))
    setSettingsDirty(true)
  }

  function formatCurrency(amount: number) {
    return `${storeSettings.currency}${amount.toLocaleString()}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-[#120804]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.4s_ease-out]">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#d4c1a5]">Admin panel</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {currentUser ? `Welcome back, ${currentUser.name}` : 'Raseph Cafe Admin Dashboard'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7a77a]">
            {currentUser ? `Signed in as ${currentUser.role.toUpperCase()} — ${currentUser.email}.` : 'Manage staff, users, settings, and view operational metrics.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] transition-all duration-300 hover:-translate-y-0.5 ${activeTab === tab.key ? 'bg-[#e1ab43] text-[#0c0502] shadow-[0_8px_25px_rgba(200,134,10,0.3)]' : 'border border-white/10 bg-white/5 text-[#d4c1a5] hover:border-[#e1ab43]/40 hover:text-[#f3cf86]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">

          {activeTab === 'dashboard' ? (
            <section className="space-y-8 animate-[fade-in_0.3s_ease-out]">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Today's Revenue", value: formatCurrency(metrics.totalRevenue), icon: '₱' },
                  { label: "Today's Orders", value: `${metrics.todayOrders}`, icon: '📋' },
                  { label: 'Pending Reservations', value: `${metrics.todayReservations}`, icon: '📅' },
                  { label: 'Active Staff', value: `${metrics.activeStaff} / ${metrics.staffCount}`, icon: '👥' },
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
                  <p className="mt-1 text-sm text-[#c7a77a]">Latest 5 orders placed</p>
                  <div className="mt-5 space-y-3">
                    {orders.length === 0 ? (
                      <p className="text-sm text-[#d4c1a5]">No orders yet.</p>
                    ) : (
                      orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0c0502]/80 p-4">
                          <div>
                            <p className="text-sm text-white">Order #{o.id}</p>
                            <p className="mt-1 text-xs text-[#d4c1a5]">{new Date(o.timestamp).toLocaleString()}</p>
                            <p className="mt-1 text-xs text-[#c7a77a]">{o.items.length} item{o.items.length !== 1 ? 's' : ''}{o.notes ? ` — ${o.notes}` : ''}</p>
                          </div>
                          <p className="text-lg font-semibold text-[#f3cf86]">{formatCurrency(o.subtotal)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  <h3 className="text-xl font-semibold text-white">Recent Reservations</h3>
                  <p className="mt-1 text-sm text-[#c7a77a]">Latest 5 reservation requests</p>
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
                <h3 className="text-xl font-semibold text-white">Quick Overview</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-[#0c0502]/80 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#a98b64]">Total Orders</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-[#0c0502]/80 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#a98b64]">Total Reservations</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{reservations.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-[#0c0502]/80 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#a98b64]">Registered Users</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{metrics.totalUsers}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'staff' ? (
            <section className="space-y-6 animate-[fade-in_0.3s_ease-out]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Staff Management</h2>
                    <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                      Add, edit, and remove staff accounts. Admin accounts are protected.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={undoSelectStaff}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                  >
                    {selectedStaff ? 'Start new staff' : 'Add new staff'}
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0c0502]/80">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-[#d4c1a5]">
                    <thead className="bg-[#0c0502]/90 text-[#c7a77a]">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} className="border-t border-white/10">
                          <td className="px-6 py-4 text-white">{member.name}</td>
                          <td className="px-6 py-4">{member.email}</td>
                          <td className="px-6 py-4 uppercase tracking-[0.18em] text-[#a98b64]">{member.role}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${member.status === 'Active' ? 'bg-[#e1ab43]/15 text-[#f3cf86]' : 'bg-white/5 text-[#a98b64]'}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button type="button" onClick={() => editStaff(member)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10">Edit</button>
                            <button type="button" onClick={() => resetPassword(member.id)} disabled={member.role === 'admin'} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10 disabled:cursor-not-allowed disabled:opacity-40">Reset PW</button>
                            <button type="button" onClick={() => member.role !== 'admin' && deleteStaff(member.id)} disabled={member.role === 'admin'} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-red-400 transition hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h3 className="text-xl font-semibold text-white">{selectedStaff ? 'Edit Staff' : 'Add New Staff'}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                  Fill in the details below. New staff default password is <strong>123456</strong>.
                </p>
                <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSaveStaff}>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Name</span>
                    <input name="name" value={formState.name} onChange={handleInputChange} placeholder="Staff name" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Email</span>
                    <input name="email" type="email" value={formState.email} onChange={handleInputChange} placeholder="staff@rasephcafe.com" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Role</span>
                    <select name="role" value={formState.role} onChange={handleInputChange} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55">
                      <option value="manager">Manager</option>
                      <option value="barista">Barista</option>
                      <option value="host">Host</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Status</span>
                    <select name="status" value={formState.status} onChange={handleInputChange} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5">
                      {selectedStaff ? 'Save changes' : 'Add staff'}
                    </button>
                    {selectedStaff ? (
                      <button type="button" onClick={undoSelectStaff} className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10">Cancel</button>
                    ) : null}
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {activeTab === 'users' ? (
            <section className="space-y-6 animate-[fade-in_0.3s_ease-out]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">User Management</h2>
                    <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                      Track customer profiles, contact info, and order history.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={undoSelectUser}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                  >
                    {selectedUser ? 'Edit user' : 'Add new user'}
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0c0502]/80">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-[#d4c1a5]">
                    <thead className="bg-[#0c0502]/90 text-[#c7a77a]">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4 text-center">Orders</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerUsers.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-[#d4c1a5]">No customer records yet. Add one manually or orders will create entries automatically.</td></tr>
                      ) : (
                        customerUsers.map((u) => (
                          <tr key={u.id} className="border-t border-white/10">
                            <td className="px-6 py-4 text-white">{u.name}</td>
                            <td className="px-6 py-4">{u.phone}</td>
                            <td className="px-6 py-4 text-[#c7a77a]">{u.email || '—'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="rounded-full bg-[#e1ab43]/15 px-3 py-1 text-xs font-semibold text-[#f3cf86]">{u.totalOrders}</span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button type="button" onClick={() => editUser(u)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10">Edit</button>
                              <button type="button" onClick={() => deleteUser(u.id)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-red-400 transition hover:bg-red-900/30">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h3 className="text-xl font-semibold text-white">{selectedUser ? 'Edit Customer' : 'Add New Customer'}</h3>
                <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSaveUser}>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Name</span>
                    <input name="name" value={userForm.name} onChange={handleUserInputChange} placeholder="Customer name" required className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Phone</span>
                    <input name="phone" value={userForm.phone} onChange={handleUserInputChange} placeholder="09xx xxx xxxx" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Email</span>
                    <input name="email" type="email" value={userForm.email} onChange={handleUserInputChange} placeholder="customer@email.com" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Notes</span>
                    <input name="notes" value={userForm.notes} onChange={handleUserInputChange} placeholder="Preferences, notes" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5">
                      {selectedUser ? 'Save changes' : 'Add customer'}
                    </button>
                    {selectedUser ? (
                      <button type="button" onClick={undoSelectUser} className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10">Cancel</button>
                    ) : null}
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {activeTab === 'settings' ? (
            <section className="animate-[fade-in_0.3s_ease-out]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h2 className="text-2xl font-semibold text-white">Store Settings</h2>
                <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                  Configure your cafe information displayed across the site.
                </p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Cafe Name</span>
                    <input value={storeSettings.cafeName} onChange={(e) => updateSetting('cafeName', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Tagline</span>
                    <input value={storeSettings.tagline} onChange={(e) => updateSetting('tagline', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Opening Hours</span>
                    <input value={storeSettings.openingHours} onChange={(e) => updateSetting('openingHours', e.target.value)} placeholder="8:00 AM" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Closing Hours</span>
                    <input value={storeSettings.closingHours} onChange={(e) => updateSetting('closingHours', e.target.value)} placeholder="10:00 PM" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5] sm:col-span-2">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Address</span>
                    <input value={storeSettings.address} onChange={(e) => updateSetting('address', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Phone</span>
                    <input value={storeSettings.phone} onChange={(e) => updateSetting('phone', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Email</span>
                    <input value={storeSettings.email} onChange={(e) => updateSetting('email', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Instagram</span>
                    <input value={storeSettings.instagram} onChange={(e) => updateSetting('instagram', e.target.value)} placeholder="instagram.com/yourcafe" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Facebook</span>
                    <input value={storeSettings.facebook} onChange={(e) => updateSetting('facebook', e.target.value)} placeholder="facebook.com/yourcafe" className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Currency Symbol</span>
                    <input value={storeSettings.currency} onChange={(e) => updateSetting('currency', e.target.value)} placeholder="₱" maxLength={5} className="w-24 rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55" />
                  </label>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-8 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    {settingsDirty ? 'Save Settings' : 'Settings saved'}
                  </button>
                  {settingsDirty ? (
                    <span className="text-xs uppercase tracking-[0.24em] text-[#f3cf86]">Unsaved changes</span>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'logs' ? (
            <section className="space-y-6 animate-[fade-in_0.3s_ease-out]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h2 className="text-2xl font-semibold text-white">Access & History Logs</h2>
                <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                  All admin actions and staff activity are recorded here.
                </p>
                <div className="mt-6 space-y-4">
                  {logs.length === 0 ? (
                    <p className="text-sm text-[#d4c1a5]">No log entries yet.</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="rounded-3xl border border-white/10 bg-[#0c0502]/80 p-4">
                        <div className="flex items-center justify-between gap-4 text-sm text-[#c7a77a]">
                          <span>{log.user}</span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-[#f3cf86]">{log.action}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#d4c1a5]">{log.details}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.28em] text-[#9b7a4f]">{log.when}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'preview' ? (
            <section className="space-y-6 animate-[fade-in_0.3s_ease-out]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Staff Dashboard Preview</h2>
                    <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                      Preview the staff experience while still signed in as admin.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {staff.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedStaff(member)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${selectedPreview?.id === member.id ? 'border-[#e1ab43] bg-[#e1ab43]/15 text-[#f3cf86]' : 'border-white/10 bg-white/5 text-[#d4c1a5]'}`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0c0502]/90 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Previewing as</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{selectedPreview.name}</p>
                      <p className="text-sm text-[#c7a77a]">{selectedPreview.role.toUpperCase()} • {selectedPreview.email}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-[#f3cf86]">
                      {selectedPreview.requiresPasswordReset ? 'Requires new password on next login' : 'Password healthy'}
                    </div>
                  </div>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">Quick actions</p>
                      <ul className="mt-4 space-y-2 text-sm text-[#d4c1a5]">
                        <li>• View assigned orders</li>
                        <li>• Check today's schedule</li>
                        <li>• Review seat assignments</li>
                      </ul>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">Status</p>
                      <div className="mt-4 space-y-3 text-sm text-[#d4c1a5]">
                        <p>Latest activity: {selectedPreview.lastSeen}</p>
                        <p>Total shifts this week: 5</p>
                        <p>Pending tasks: {selectedPreview.requiresPasswordReset ? 2 : 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Admin summary</p>
                <p className="mt-3 text-lg font-semibold text-white">Actions & notes</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                >
                  Return site
                </button>
                <button
                  type="button"
                  onClick={() => setLogoutConfirm(true)}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm uppercase tracking-[0.22em] text-red-400 transition hover:bg-red-500/20"
                >
                  Log out
                </button>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-[#c7a77a]">
              <p>• Dashboard shows daily revenue, orders, reservations at a glance.</p>
              <p>• Manage staff accounts, reset passwords, and track activity via logs.</p>
              <p>• User Management lets you track customer profiles manually.</p>
              <p>• Store Settings controls the cafe info displayed on the public site.</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Quick stats</p>
            <div className="mt-5 space-y-4">
              {[
                { label: 'Total revenue', value: formatCurrency(metrics.totalRevenue) },
                { label: 'Orders today', value: `${metrics.todayOrders}` },
                { label: 'Active staff', value: `${metrics.activeStaff} / ${metrics.staffCount}` },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between rounded-3xl border border-white/10 bg-[#0c0502]/90 px-4 py-3">
                  <p className="text-sm text-[#d4c1a5]">{stat.label}</p>
                  <p className="text-sm font-semibold text-[#f3cf86]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Recent activity</p>
            <div className="mt-5 space-y-4">
              {logs.slice(0, 3).map((log) => (
                <div key={log.id} className="rounded-3xl border border-white/10 bg-[#0c0502]/90 p-4">
                  <p className="text-sm text-[#d4c1a5]">{log.action}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#9b7a4f]">{log.when}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {logoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#120804]/95 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <p className="text-lg font-semibold text-white">Log out</p>
            <p className="mt-3 text-sm leading-6 text-[#c7a77a]">Are you sure you want to log out of the admin panel?</p>
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

export default AdminDashboard
