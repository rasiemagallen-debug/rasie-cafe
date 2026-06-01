import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

export async function fetchOrders<T = any>(): Promise<T[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false })
  if (error) throw error
  return (data ?? []) as T[]
}

export async function insertOrder(order: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('orders').insert(order)
  if (error) throw error
}

export async function fetchReservations<T = any>(): Promise<T[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('reservations').select('*').order('timestamp', { ascending: false })
  if (error) throw error
  return (data ?? []) as T[]
}

export async function insertReservation(reservation: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('reservations').insert(reservation)
  if (error) throw error
}

export async function fetchStaff<T = any>(): Promise<T[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('staff').select('*')
  if (error) throw error
  return (data ?? []) as T[]
}

export async function insertStaff(member: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('staff').insert(member)
  if (error) throw error
}

export async function updateStaff(id: string, updates: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('staff').update(updates).eq('id', id)
  if (error) throw error
}

export async function removeStaff(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw error
}

export type StoreSettings = {
  cafeName: string
  tagline: string
  openingHours: string
  closingHours: string
  address: string
  phone: string
  email: string
  instagram: string
  facebook: string
  currency: string
}

export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('store_settings').select('*').single()
  if (error) throw error
  return data as StoreSettings | null
}

export async function upsertStoreSettings(settings: StoreSettings): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('store_settings').upsert(settings, { onConflict: 'id' })
  if (error) throw error
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

export async function fetchUsers<T = any>(): Promise<T[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('users').select('*')
  if (error) throw error
  return (data ?? []) as T[]
}

export async function insertUser(user: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('users').insert(user)
  if (error) throw error
}

export async function updateUser(id: string, updates: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('users').update(updates).eq('id', id)
  if (error) throw error
}

export async function removeUser(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export type LogEntry = {
  id: string
  user: string
  action: string
  when: string
  details: string
}

export async function insertLog(log: LogEntry): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('logs').insert(log)
  if (error) throw error
}

export async function fetchLogs<T = any>(): Promise<T[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('logs').select('*').order('when', { ascending: false })
  if (error) throw error
  return (data ?? []) as T[]
}
