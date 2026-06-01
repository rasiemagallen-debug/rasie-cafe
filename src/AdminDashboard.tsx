import { type FormEvent, useMemo, useState, useEffect } from 'react'
import { fetchStaff, insertStaff, updateStaff, removeStaff, isSupabaseConfigured } from './lib/supabase'

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

type LogEntry = {
  id: string
  user: string
  action: string
  when: string
  details: string
}

export const initialStaff: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Raseph Admin',
    email: 'admin@rasephcafe.com',
    role: 'admin',
    status: 'Active',
    lastSeen: 'Just now',
    requiresPasswordReset: false,
  },
  {
    id: 'staff-2',
    name: 'Mia Santos',
    email: 'mia@rasephcafe.com',
    role: 'manager',
    status: 'Active',
    lastSeen: '10 min ago',
    requiresPasswordReset: false,
  },
  {
    id: 'staff-3',
    name: 'Jonah Cruz',
    email: 'jonah@rasephcafe.com',
    role: 'barista',
    status: 'Active',
    lastSeen: '18 min ago',
    requiresPasswordReset: false,
  },
  {
    id: 'staff-4',
    name: 'Leah Reyes',
    email: 'leah@rasephcafe.com',
    role: 'host',
    status: 'Inactive',
    lastSeen: 'Yesterday',
    requiresPasswordReset: false,
  },
]

const initialLogs: LogEntry[] = [
  {
    id: 'log-1',
    user: 'Raseph Admin',
    action: 'Signed in',
    when: '2 min ago',
    details: 'Successful admin login from 192.168.1.24',
  },
  {
    id: 'log-2',
    user: 'Mia Santos',
    action: 'Added staff member',
    when: '12 min ago',
    details: 'Created user Jonah Cruz with role barista',
  },
  {
    id: 'log-3',
    user: 'Jonah Cruz',
    action: 'Viewed orders',
    when: '18 min ago',
    details: 'Previewed today’s order summary',
  },
  {
    id: 'log-4',
    user: 'Leah Reyes',
    action: 'Updated reservation',
    when: 'Yesterday',
    details: 'Changed party size for reservation #RES-042',
  },
]

function createId() {
  return crypto?.randomUUID?.() ?? `staff-${Date.now()}`
}

function AdminDashboard({ onClose, currentUser }: { onClose: () => void; currentUser?: StaffMember | null }) {
  const [activeTab, setActiveTab] = useState<'summary' | 'staff' | 'logs' | 'preview'>('summary')
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'barista' as StaffRole,
    status: 'Active' as StaffMember['status'],
  })

  useEffect(() => {
    fetchStaff<StaffMember>().then((data) => {
      if (data && data.length > 0) setStaff(data)
    }).catch(() => {})
  }, [])

  const metrics = useMemo(
    () => ({
      staffCount: staff.length,
      activeStaff: staff.filter((item) => item.status === 'Active').length,
      pendingResets: staff.filter((item) => item.requiresPasswordReset).length,
      logsCount: initialLogs.length,
    }),
    [staff],
  )

  const selectedPreview = selectedStaff ?? staff.find((member) => member.role !== 'admin') ?? staff[0]

  const handleInputChange = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    setFormState((prev) => ({ ...prev, [target.name]: target.value }))
  }

  const handleSaveStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.name.trim() || !formState.email.trim()) {
      setToastMessage('Please fill in both name and email.')
      return
    }

    if (selectedStaff) {
      const updates = { name: formState.name, email: formState.email, role: formState.role, status: formState.status }
      if (isSupabaseConfigured) {
        updateStaff(selectedStaff.id, updates).catch(() => {})
      }
      setStaff((current) =>
        current.map((member) =>
          member.id === selectedStaff.id
            ? { ...member, ...updates }
            : member,
        ),
      )
      setSelectedStaff(null)
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
      if (isSupabaseConfigured) {
        insertStaff(member).catch(() => {})
      }
      setStaff((current) => [member, ...current])
      setToastMessage('New staff added. Default password is 123456.')
    }

    setFormState({ name: '', email: '', role: 'barista', status: 'Active' })
  }

  const editStaff = (member: StaffMember) => {
    setSelectedStaff(member)
    setFormState({ name: member.name, email: member.email, role: member.role, status: member.status })
    setActiveTab('staff')
  }

  const deleteStaff = (id: string) => {
    if (isSupabaseConfigured) {
      removeStaff(id).catch(() => {})
    }
    setStaff((current) => current.filter((member) => member.id !== id))
    setToastMessage('Staff deleted successfully.')
  }

  const resetPassword = (id: string) => {
    if (isSupabaseConfigured) {
      updateStaff(id, { requiresPasswordReset: true, lastSeen: 'Password reset to default 123456' }).catch(() => {})
    }
    setStaff((current) =>
      current.map((member) =>
        member.id === id
          ? { ...member, requiresPasswordReset: true, lastSeen: 'Password reset to default 123456' }
          : member,
      ),
    )
    const member = staff.find((item) => item.id === id)
    setToastMessage(`${member?.name ?? 'Staff'} password reset to 123456.`)
  }

  const undoSelectStaff = () => {
    setSelectedStaff(null)
    setFormState({ name: '', email: '', role: 'barista', status: 'Active' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-[#120804]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#d4c1a5]">Admin panel</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {currentUser ? `Welcome back, ${currentUser.name}` : 'Raseph Cafe Admin Dashboard'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7a77a]">
            {currentUser ? `Signed in as ${currentUser.role.toUpperCase()} — ${currentUser.email}. Manage staff, review access and history logs, and preview the staff dashboard in admin mode.` : 'Manage staff, review access and history logs, and preview the staff dashboard in admin mode.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'summary' ? 'bg-[#e1ab43] text-[#0c0502]' : 'border border-white/10 bg-white/5 text-[#d4c1a5]'}`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'staff' ? 'bg-[#e1ab43] text-[#0c0502]' : 'border border-white/10 bg-white/5 text-[#d4c1a5]'}`}
          >
            Staff Management
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'logs' ? 'bg-[#e1ab43] text-[#0c0502]' : 'border border-white/10 bg-white/5 text-[#d4c1a5]'}`}
          >
            Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'preview' ? 'bg-[#e1ab43] text-[#0c0502]' : 'border border-white/10 bg-white/5 text-[#d4c1a5]'}`}
          >
            Staff Preview
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          {activeTab === 'summary' ? (
            <section className="grid gap-6 lg:grid-cols-3">
              {[
                { label: 'Staff members', value: `${metrics.staffCount}` },
                { label: 'Active staff', value: `${metrics.activeStaff}` },
                { label: 'Access logs', value: `${metrics.logsCount}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                >
                  <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">{stat.label}</p>
                  <p className="mt-4 text-4xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </section>
          ) : null}

          {activeTab === 'staff' ? (
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Staff Management</h2>
                    <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                      Add, edit, and remove staff accounts. The admin account cannot be deleted and password resets are simulated locally.
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
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} className="border-t border-white/10">
                          <td className="px-6 py-4 text-white">{member.name}</td>
                          <td className="px-6 py-4">{member.email}</td>
                          <td className="px-6 py-4 uppercase tracking-[0.18em] text-[#a98b64]">{member.role}</td>
                          <td className="px-6 py-4">{member.status}</td>
                          <td className="px-6 py-4 space-x-2">
                            <button
                              type="button"
                              onClick={() => editStaff(member)}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => resetPassword(member.id)}
                              disabled={member.role === 'admin'}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Reset PW
                            </button>
                            <button
                              type="button"
                              onClick={() => member.role !== 'admin' && deleteStaff(member.id)}
                              disabled={member.role === 'admin'}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h3 className="text-xl font-semibold text-white">Add / Edit Staff</h3>
                <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                  Resetting a staff password will set it to <strong>123456</strong> and flag them to choose a new password on next login.
                </p>
                <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSaveStaff}>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Name</span>
                    <input
                      name="name"
                      value={formState.name}
                      onChange={handleInputChange}
                      placeholder="Staff name"
                      className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Email</span>
                    <input
                      name="email"
                      type="email"
                      value={formState.email}
                      onChange={handleInputChange}
                      placeholder="staff@rasephcafe.com"
                      className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Role</span>
                    <select
                      name="role"
                      value={formState.role}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                    >
                      <option value="manager">Manager</option>
                      <option value="barista">Barista</option>
                      <option value="host">Host</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-[#d4c1a5]">
                    <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Status</span>
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5"
                    >
                      {selectedStaff ? 'Save changes' : 'Add staff'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {activeTab === 'logs' ? (
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <h2 className="text-2xl font-semibold text-white">Access & History Logs</h2>
                <p className="mt-2 text-sm leading-6 text-[#c7a77a]">
                  Log entries show recent staff activity and admin-level access events.
                </p>
                <div className="mt-6 space-y-4">
                  {initialLogs.map((log) => (
                    <div key={log.id} className="rounded-3xl border border-white/10 bg-[#0c0502]/80 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm text-[#c7a77a]">
                        <span>{log.user}</span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-[#f3cf86]">{log.action}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#d4c1a5]">{log.details}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.28em] text-[#9b7a4f]">{log.when}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'preview' ? (
            <section className="space-y-6">
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
                      {selectedPreview.requiresPasswordReset
                        ? 'Requires new password on next login'
                        : 'Password healthy'}
                    </div>
                  </div>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">Quick actions</p>
                      <ul className="mt-4 space-y-2 text-sm text-[#d4c1a5]">
                        <li>• View assigned orders</li>
                        <li>• Check today’s schedule</li>
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
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
              >
                Return site
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-[#c7a77a]">
              <p>• Admin dashboard shows all staff activity and access logs in one place.</p>
              <p>• Reset passwords to <strong>123456</strong> for staff, then have them change it after login.</p>
              <p>• Admin account cannot be deleted; manager, barista, and host accounts can be managed freely.</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Recent activity</p>
            <div className="mt-5 space-y-4">
              {initialLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="rounded-3xl border border-white/10 bg-[#0c0502]/90 p-4">
                  <p className="text-sm text-[#d4c1a5]">{log.action}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#9b7a4f]">{log.when}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-3xl border border-white/10 bg-[#120804]/95 px-5 py-4 text-sm text-[#f3cf86] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {toastMessage}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-4 text-xs uppercase tracking-[0.28em] text-[#d4c1a5]"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default AdminDashboard
