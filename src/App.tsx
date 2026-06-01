import { type FormEvent, type SyntheticEvent, useMemo, useState, useEffect } from 'react'
import heroImage from './assets/hero.png'
import AdminDashboard, { initialStaff, type StaffMember } from './AdminDashboard'
import StaffDashboard from './StaffDashboard'
import { fetchOrders, insertOrder, fetchReservations, insertReservation, isSupabaseConfigured } from './lib/supabase'

type MenuCategory = 'All' | 'Coffee' | 'Beverages' | 'Desserts' | 'Meals'

type MenuItem = {
  name: string
  category: Exclude<MenuCategory, 'All'>
  price: string
  description: string
  badge?: string
  image: string
  featured?: boolean
}

type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  size: 'Small' | 'Medium' | 'Large'
  sugar: 'No' | 'Less' | 'Regular' | 'Extra'
  ice: 'No' | 'Less' | 'Regular' | 'Extra'
  addons: string[]
  notes?: string
}

type OrderRecord = {
  id: number
  items: CartItem[]
  subtotal: number
  notes?: string
  timestamp: string
}

type ReservationRecord = {
  id: number
  name: string
  phone: string
  date: string
  time: string
  guests: string
  notes?: string
  timestamp: string
}

type LoginAccount = {
  username: string
  password: string
  staffId: string
}

const loginAccounts: LoginAccount[] = [
  { username: 'jireh', password: 'faith', staffId: 'staff-1' },
  { username: 'mia', password: '123456', staffId: 'staff-2' },
]

const menuCategories: MenuCategory[] = [
  'All',
  'Coffee',
  'Beverages',
  'Desserts',
  'Meals',
]

const menuItems: MenuItem[] = [
  {
    name: 'Signature Espresso',
    category: 'Coffee',
    price: '₱150',
    description:
      'Rich, bold single-origin espresso with a clean finish and deep roasted aroma.',
    badge: 'Bestseller',
    image:
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    name: 'Caramel Cloud Latte',
    category: 'Coffee',
    price: '₱220',
    description:
      'Velvety espresso layered with caramel cream and a soft toasted-sugar top.',
    badge: 'Signature',
    image:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    name: 'Ube Oat Latte',
    category: 'Beverages',
    price: '₱210',
    description:
      'Creamy oat milk, earthy ube notes, and a gentle espresso kick for the finish.',
    badge: 'New',
    image:
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Calamansi Spark',
    category: 'Beverages',
    price: '₱165',
    description:
      'Bright citrus soda with calamansi, mint, and just enough sweetness to keep it crisp.',
    image:
      'https://images.unsplash.com/photo-1542444459-db47a0c2f70d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Basque Cheesecake',
    category: 'Desserts',
    price: '₱280',
    description:
      'Creamy center, caramelized crown, and a buttery crumb that melts on contact.',
    badge: 'House Favorite',
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    name: 'Matcha Tiramisu Jar',
    category: 'Desserts',
    price: '₱245',
    description:
      'Layers of matcha sponge, mascarpone cream, and cocoa dust served in a chilled jar.',
    image:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Truffle Pasta',
    category: 'Meals',
    price: '₱385',
    description:
      'Al dente pasta tossed in a silky truffle cream with parmesan and herb oil.',
    badge: 'Chef Pick',
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Cafe Brunch Plate',
    category: 'Meals',
    price: '₱450',
    description:
      'A warm brunch spread of eggs, sourdough, salad, potatoes, and house jam.',
    image:
      'https://images.unsplash.com/photo-1490418387933-1ee27a5b3a61?auto=format&fit=crop&w=1200&q=80',
  },
]

const signatureFeatures = [
  { label: 'Freshly roasted', value: 'Daily batches' },
  { label: 'Kitchen made', value: 'Desserts & meals' },
  { label: 'Visit ready', value: 'Reserve ahead' },
]

const storyPoints = [
  'A warm espresso bar built for slow mornings and late-night catchups.',
  'House desserts plated with the same care as our drinks.',
  'A cafe experience designed for dine-in, takeout, and events.',
]

const testimonials = [
  {
    name: 'Sofia G.',
    role: 'Weekend regular',
    quote:
      'The Caramel Cloud Latte tastes like the cafe equivalent of a perfect sunset.',
  },
  {
    name: 'Carlo R.',
    role: 'Foodie reviewer',
    quote:
      'The cheesecake is polished, the coffee is balanced, and the space feels intentional.',
  },
  {
    name: 'Anika C.',
    role: 'Remote worker',
    quote:
      'It is the rare cafe that works for meetings, solo work, and dessert runs all at once.',
  },
]

const gallery = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464306076886-da185f6a9e1f?auto=format&fit=crop&w=1200&q=80',
]

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Menu', href: '#menu' },
  { label: 'Story', href: '#story' },
  { label: 'Reserve', href: '#reserve' },
  { label: 'Visit', href: '#contact' },
]

function App() {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('All')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reservationSent, setReservationSent] = useState(false)
  const [newsletterSent, setNewsletterSent] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loggedInStaff, setLoggedInStaff] = useState<StaffMember | null>(null)
  const [loginUsername, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]')
    } catch {
      return []
    }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [customSize, setCustomSize] = useState<CartItem['size']>('Medium')
  const [customSugar, setCustomSugar] = useState<CartItem['sugar']>('Regular')
  const [customIce, setCustomIce] = useState<CartItem['ice']>('Regular')
  const [customAddons, setCustomAddons] = useState<Record<string, boolean>>({ 'Extra shot': false, 'Whipped cream': false, 'Syrup': false })
  const [orderNotes, setOrderNotes] = useState('')
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [reservationsOpen, setReservationsOpen] = useState(false)
  const [remoteOrders, setRemoteOrders] = useState<OrderRecord[] | null>(null)
  const [remoteReservations, setRemoteReservations] = useState<ReservationRecord[] | null>(null)
  const [cartNotes, setCartNotes] = useState('')

  async function loadRemoteReservations(): Promise<ReservationRecord[] | null> {
    try {
      const data = await fetchReservations<ReservationRecord>()
      if (data !== null) return data
    } catch { /* fall through */ }
    return null
  }

  function loadLocalReservations(): ReservationRecord[] {
    try {
      return JSON.parse(localStorage.getItem('reservations') || '[]')
    } catch {
      return []
    }
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget
    img.onerror = null
    img.src = heroImage
  }

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') {
      return menuItems
    }

    return menuItems.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  async function handleReservationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const reservation: ReservationRecord = {
      id: Date.now(),
      name: String(data.get('res-name') || ''),
      phone: String(data.get('res-phone') || ''),
      date: String(data.get('res-date') || ''),
      time: String(data.get('res-time') || ''),
      guests: String(data.get('res-guests') || ''),
      notes: String(data.get('res-notes') || ''),
      timestamp: new Date().toISOString(),
    }
    if (isSupabaseConfigured) {
      try {
        await insertReservation(reservation)
      } catch { /* fall through */ }
    }
    const existing = JSON.parse(localStorage.getItem('reservations') || '[]')
    existing.push(reservation)
    localStorage.setItem('reservations', JSON.stringify(existing))
    form.reset()
    setReservationSent(true)
    loadRemoteReservations().then(setRemoteReservations)
  }

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNewsletterSent(true)
    event.currentTarget.reset()
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = loginUsername.trim().toLowerCase()
    const account = loginAccounts.find((item) => item.username.toLowerCase() === username)

    if (!account) {
      setLoginError('No staff account found for that username.')
      return
    }

    const storedPasswords: Record<string, string> = JSON.parse(localStorage.getItem('staffPasswords') || '{}')
    const expectedPassword = storedPasswords[account.staffId] ?? account.password

    if (loginPassword !== expectedPassword) {
      setLoginError('Password is incorrect.')
      return
    }

    const staffMember = initialStaff.find((member) => member.id === account.staffId) ?? initialStaff[0]
    setLoggedInStaff(staffMember)
    setLoginOpen(false)
    setLoginEmail('')
    setLoginPassword('')
    setLoginError(null)
  }

  useEffect(() => {
    if (selectedMenuItem) {
      setOrderQty(1)
      setOrderMessage(null)
    }
  }, [selectedMenuItem])

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  useEffect(() => {
    if (isSupabaseConfigured) {
      loadRemoteOrders().then(setRemoteOrders)
      loadRemoteReservations().then(setRemoteReservations)
    }
  }, [])

  function parsePrice(price: string) {
    const num = Number(String(price).replace(/[^0-9.]/g, ''))
    return Number.isFinite(num) ? num : 0
  }

  function handlePlaceOrder() {
    if (!selectedMenuItem) return
    const qty = Math.max(1, orderQty)
    const order = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: selectedMenuItem.name,
      qty,
      price: parsePrice(selectedMenuItem.price),
      size: customSize,
      sugar: customSugar,
      ice: customIce,
      addons: Object.entries(customAddons).filter(([, v]) => v).map(([k]) => k),
      notes: orderNotes || undefined,
    } as CartItem

    setCart((c) => [...c, order])
    setOrderMessage(`Added to cart: ${qty} × ${selectedMenuItem.name}`)
  }

  function cartCount() {
    return cart.reduce((s, it) => s + it.qty, 0)
  }

  function cartSubtotal() {
    return cart.reduce((s, it) => s + it.qty * it.price, 0)
  }

  function updateCartQty(id: string, qty: number) {
    setCart((c) => c.map((it) => (it.id === id ? { ...it, qty: Math.max(1, qty) } : it)))
  }

  function removeCartItem(id: string) {
    setCart((c) => c.filter((it) => it.id !== id))
  }

  async function loadRemoteOrders(): Promise<OrderRecord[] | null> {
    try {
      const data = await fetchOrders<OrderRecord>()
      if (data !== null) return data
    } catch { /* fall through */ }
    return null
  }

  function loadLocalOrders(): OrderRecord[] {
    try {
      return JSON.parse(localStorage.getItem('orders') || '[]')
    } catch {
      return []
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setOrderMessage('Cart is empty.')
      return
    }

    const orderRecord = {
      id: Date.now(),
      items: cart,
      subtotal: cartSubtotal(),
      notes: cartNotes || undefined,
      timestamp: new Date().toISOString(),
    }
    if (isSupabaseConfigured) {
      try {
        await insertOrder(orderRecord)
      } catch { /* fall through */ }
    }
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    orders.push(orderRecord)
    localStorage.setItem('orders', JSON.stringify(orders))

    setCart([])
    setCartOpen(false)
    setCartNotes('')
    setOrderMessage('Order placed. Thank you!')
    loadRemoteOrders().then(setRemoteOrders)
  }

  return (
    <div className="relative min-h-screen overflow-auto bg-[#0c0502] text-[#f8f1e5] selection:bg-[#c8860a]/30 selection:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,134,10,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(90,180,229,0.09),transparent_22%),linear-gradient(180deg,rgba(12,5,2,0.96),rgba(12,5,2,0.88))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0c0502]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#e1ab43] to-[#9b6510] text-lg text-[#0c0502] shadow-[0_0_30px_rgba(200,134,10,0.35)]">
              ☕
            </span>
            <span className="leading-none">
              <span className="font-display text-2xl tracking-wide text-white">
                Raseph{' '}
                <span className="text-[#e1ab43]">Cafe</span>
              </span>
              <span className="mt-1 block text-[11px] uppercase tracking-[0.35em] text-[#c7a77a]">
                Espresso • Desserts • Slow moments
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative text-[0.82rem] uppercase tracking-[0.24em] text-[#d9c3a0] transition hover:text-[#f3cf86] after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-[#e1ab43] after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => setOrdersOpen(true)}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#e6d4ba] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e1ab43]/40 hover:text-[#f3cf86] hover:shadow-[0_8px_25px_rgba(200,134,10,0.12)]"
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setReservationsOpen(true)}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#e6d4ba] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e1ab43]/40 hover:text-[#f3cf86] hover:shadow-[0_8px_25px_rgba(200,134,10,0.12)]"
            >
              Reservations
            </button>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full border border-[#f3cf86]/40 bg-[#f3cf86]/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#0c0502] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f3cf86]/15 hover:shadow-[0_8px_25px_rgba(243,207,134,0.2)]"
            >
              Staff login
            </button>
            <a
              href="#reserve"
              className="rounded-full border border-[#e1ab43]/40 bg-[#e1ab43]/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5d99a] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e1ab43]/15 hover:shadow-[0_8px_25px_rgba(200,134,10,0.2)]"
            >
              Reserve Table
            </a>
            <a
              href="#menu"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#e6d4ba] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e1ab43]/40 hover:text-[#f3cf86] hover:shadow-[0_8px_25px_rgba(200,134,10,0.12)]"
            >
              Back to menu
            </a>
            <a
              href="#menu"
              className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#0c0502] shadow-[0_12px_35px_rgba(200,134,10,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(200,134,10,0.4)]"
            >
              See Menu
            </a>
          </div>

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-xl text-[#f7dca0] lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        <div
          className={`border-t border-white/8 bg-[#0f0603]/95 px-4 py-4 lg:hidden ${menuOpen ? 'block' : 'hidden'}`}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[#e6d4ba]"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOrdersOpen(true)
                setMenuOpen(false)
              }}
              className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-[#e6d4ba]"
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => {
                setReservationsOpen(true)
                setMenuOpen(false)
              }}
              className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-[#e6d4ba]"
            >
              Reservations
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginOpen(true)
                setMenuOpen(false)
              }}
              className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-[#e6d4ba]"
            >
              Staff login
            </button>
            <a
              href="#menu"
              onClick={() => setMenuOpen(false)}
              className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-[#e6d4ba]"
            >
              Back to menu
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {loggedInStaff ? (
          loggedInStaff.role === 'admin' || loggedInStaff.role === 'manager' ? (
            <AdminDashboard currentUser={loggedInStaff} onClose={() => setLoggedInStaff(null)} />
          ) : (
            <StaffDashboard currentUser={loggedInStaff} onClose={() => setLoggedInStaff(null)} />
          )
        ) : (
          <>
            <section id="home" className="scroll-mt-28 mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div className="max-w-3xl animate-[fade-in_0.6s_ease-out]">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#e1ab43]/30 bg-[#e1ab43]/10 px-5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#f3cf86]">
              <span className="h-2 w-2 rounded-full bg-[#e1ab43] shadow-[0_0_14px_rgba(200,134,10,0.75)]" />
              Welcome to Raseph Cafe
            </div>

            <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[5.7rem]">
              Coffee that feels{' '}
              <span className="italic text-[#f3cf86]">crafted</span>,
              <br />
              desserts that feel{' '}
              <span className="text-[#e1ab43]">luminous</span>.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#d4c1a5] sm:text-xl">
              Raseph Cafe blends warm espresso, house-made desserts, and slow-table hospitality into a space designed for lingering, meeting, and returning.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#menu"
                className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-7 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] shadow-[0_16px_40px_rgba(200,134,10,0.3)] transition hover:-translate-y-0.5"
              >
                Explore Menu
              </a>
              <a
                href="#reserve"
                className="rounded-full border border-[#e1ab43]/35 bg-white/4 px-7 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#f3cf86] transition hover:-translate-y-0.5 hover:bg-[#e1ab43]/10"
              >
                Reserve a Table
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {signatureFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-3xl border border-white/8 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur"
                >
                  <p className="text-sm uppercase tracking-[0.24em] text-[#c7a77a]">
                    {feature.label}
                  </p>
                  <p className="mt-2 font-display text-2xl text-white">
                    {feature.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[#d6c3a6]">
              <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">4.9 guest rating</span>
              <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">Open daily 8:00 AM - 10:00 PM</span>
              <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">Imus, Cavite</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-10 top-16 h-40 rounded-full bg-[#e1ab43]/20 blur-3xl" />
            <div className="relative w-full max-w-[520px] rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/8">
                <img
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80"
                  alt="Warm coffee and pastries at Raseph Cafe"
                  onError={handleImageError}
                  className="h-[520px] w-full object-cover object-center"
                />
              </div>

              <div className="absolute -left-4 top-10 hidden w-56 rounded-3xl border border-white/10 bg-[#120804]/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] md:block">
                <p className="text-xs uppercase tracking-[0.3em] text-[#c7a77a]">Today’s highlight</p>
                <p className="mt-2 font-display text-2xl text-white">Caramel Cloud Latte</p>
                <p className="mt-2 text-sm leading-6 text-[#d5c1a3]">
                  Espresso, caramel cream, and a toasted finish that lands somewhere between dessert and ritual.
                </p>
              </div>

              <div className="absolute -bottom-6 right-4 hidden rounded-3xl border border-white/10 bg-[#120804]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] md:block">
                <p className="text-xs uppercase tracking-[0.3em] text-[#c7a77a]">Signature experience</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e1ab43]/15 text-2xl text-[#f3cf86]">
                    ✦
                  </div>
                  <div>
                    <p className="font-display text-xl text-white">Table service</p>
                    <p className="text-sm text-[#d5c1a3]">Built for slow moments and repeat visits.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="story" className="scroll-mt-28 border-y border-white/8 bg-[#120804]/80">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Our story</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-5xl">
                Built for guests who want more than a quick cup.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#d4c1a5]">
                The attached concept inspired the mood: dark roast tones, polished plating, and a cafe that feels premium without becoming cold. Raseph Cafe keeps that same warmth, then pairs it with a cleaner React + Tailwind implementation.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {storyPoints.map((point, index) => (
                <article
                  key={point}
                  className="animate-[slide-up_0.5s_ease-out] rounded-[1.75rem] border border-white/8 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className="font-display text-3xl text-[#e1ab43]">
                    0{index + 1}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#d5c1a3]">
                    {point}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="menu" className="scroll-mt-28 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Menu</p>
              <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
                A focused lineup, designed to be memorable.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#d4c1a5]">
                This menu mirrors the attached brand direction, but it is rebuilt in React with category filtering and a cleaner component structure.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {menuCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition ${selectedCategory === category ? 'border-[#e1ab43]/40 bg-[#e1ab43] text-[#0c0502] shadow-[0_12px_30px_rgba(200,134,10,0.24)]' : 'border-white/10 bg-white/4 text-[#e5d2b3] hover:border-[#e1ab43]/40 hover:text-[#f3cf86]'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <article
                key={item.name}
                className="group overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#120804]/95 shadow-[0_20px_70px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-1 hover:border-[#e1ab43]/25 hover:shadow-[0_25px_80px_rgba(200,134,10,0.15)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={handleImageError}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0502] via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {item.badge ? (
                      <span className="rounded-full bg-[#e1ab43] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0c0502]">
                        {item.badge}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/15 bg-[#0c0502]/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f3cf86] backdrop-blur">
                      {item.category}
                    </span>
                  </div>
                  {item.featured ? (
                    <div className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur">
                      Featured
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl text-white">
                      {item.name}
                    </h3>
                    <p className="text-xl font-semibold text-[#f3cf86]">
                      {item.price}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#d4c1a5]">
                    {item.description}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
                    <span className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">
                      Made fresh daily
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMenuItem(item)}
                      className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f3cf86] transition hover:bg-[#e1ab43]/10"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/8 bg-[#120804]/85">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Why Raseph</p>
              <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
                Premium feel, but still easy to live in.
              </h2>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['☕', 'Careful espresso', 'Balanced shots and milk textures with a deep, smooth profile.'],
                  ['🍰', 'Dessert-forward', 'Plated sweets that hold their own next to the coffee.'],
                  ['🪑', 'Reservation ready', 'A layout that can welcome small groups without losing atmosphere.'],
                  ['📍', 'Community cafe', 'Designed to feel local, warm, and easy to come back to.'],
                ].map(([icon, title, copy]) => (
                  <article key={title} className="animate-[slide-up_0.5s_ease-out] rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e1ab43]/12 text-2xl text-[#f3cf86]">
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-display text-2xl text-white">{title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[#d4c1a5]">{copy}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
              <div className="grid gap-4 sm:grid-cols-2">
                {gallery.map((image, index) => (
                  <div
                    key={image}
                    className={`overflow-hidden rounded-[1.4rem] border border-white/8 ${index === 0 ? 'sm:col-span-2' : ''}`}
                  >
                    <img
                      src={image}
                      alt={`Raseph Cafe mood image ${index + 1}`}
                      onError={handleImageError}
                      className={`w-full object-cover ${index === 0 ? 'h-64' : 'h-52'}`}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="reserve" className="scroll-mt-28 mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Reservations</p>
            <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
              Book the table before the rush.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#d4c1a5]">
              The form below is intentionally local-only for now. You said the database will be added after this, so this version keeps the experience polished without any backend dependency.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ['Hours', '8:00 AM - 10:00 PM'],
                ['Address', 'Imus, Cavite, Philippines'],
                ['Seating', 'Indoor / Al fresco'],
                ['Events', 'Small gatherings & meetings'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">{label}</p>
                  <p className="mt-3 font-display text-2xl text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            className="rounded-[2rem] border border-white/10 bg-[#120804]/95 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8"
            onSubmit={handleReservationSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[#d6c3a6]">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Name</span>
                <input
                  name="res-name"
                  type="text"
                  required
                  placeholder="Your full name"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-[#8f7857] focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
              </label>
              <label className="space-y-2 text-sm text-[#d6c3a6]">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Phone</span>
                <input
                  name="res-phone"
                  type="tel"
                  required
                  placeholder="09xx xxx xxxx"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-[#8f7857] focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
              </label>
              <label className="space-y-2 text-sm text-[#d6c3a6]">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Date</span>
                <input
                  name="res-date"
                  type="date"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
              </label>
              <label className="space-y-2 text-sm text-[#d6c3a6]">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Time</span>
                <input
                  name="res-time"
                  type="time"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
              </label>
              <label className="space-y-2 text-sm text-[#d6c3a6] sm:col-span-2">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Guests</span>
                <select name="res-guests" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55 focus:bg-white/8">
                  <option className="bg-[#120804]">2 guests</option>
                  <option className="bg-[#120804]">4 guests</option>
                  <option className="bg-[#120804]">6 guests</option>
                  <option className="bg-[#120804]">8 guests</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-[#d6c3a6] sm:col-span-2">
                <span className="block text-xs uppercase tracking-[0.28em] text-[#a98b64]">Notes</span>
                <textarea
                  name="res-notes"
                  rows={4}
                  placeholder="Dietary notes, celebration details, or seating preference"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-[#8f7857] focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] shadow-[0_16px_40px_rgba(200,134,10,0.28)] transition hover:-translate-y-0.5"
            >
              Request reservation
            </button>

            {reservationSent ? (
              <p className="mt-4 rounded-2xl border border-[#e1ab43]/25 bg-[#e1ab43]/10 px-4 py-3 text-sm text-[#f5d99a]">
                Reservation saved. Data synced to cloud when Supabase is connected.
              </p>
            ) : null}
          </form>
        </section>

        <section className="border-y border-white/8 bg-[#120804]/80">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Guest stories</p>
                <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
                  A cafe people want to come back to.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-[#d4c1a5]">
                The reference site leans heavily into atmosphere. This version keeps that mood, but tightens the layout and content for a modern React build.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((item) => (
                <blockquote
                  key={item.name}
                  className="animate-[slide-up_0.5s_ease-out] rounded-[1.75rem] border border-white/8 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex gap-1 text-[#e1ab43]">★★★★★</div>
                  <p className="mt-5 text-sm leading-8 text-[#e0ceaf]">{item.quote}</p>
                  <footer className="mt-6 border-t border-white/8 pt-5">
                    <p className="font-display text-2xl text-white">{item.name}</p>
                    <p className="text-sm text-[#a98b64]">{item.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-28 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.36em] text-[#f3cf86]">Visit</p>
              <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
                Find us in Imus and stay a while.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#d4c1a5]">
                This contact area is a placeholder for the future Supabase-backed version. For now it gives the site a complete storefront presence without depending on any database setup.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Address', 'Raseph Cafe, Imus, Cavite'],
                  ['Phone', '+63 900 000 0000'],
                  ['Email', 'hello@rasephcafe.com'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/5 p-5"
                  >
                    <span className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">{label}</span>
                    <span className="text-sm text-[#f8f1e5]">{value}</span>
                  </div>
                ))}
              </div>

              <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  required
                  placeholder="Join the newsletter"
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-[#8f7857] focus:border-[#e1ab43]/55 focus:bg-white/8"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5"
                >
                  Sign up
                </button>
              </form>
              {newsletterSent ? (
                <p className="mt-3 text-sm text-[#f5d99a]">
                  You’re on the list. Wire this to a backend to send emails.
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120804]/90 shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
              <div className="grid h-full grid-rows-[1fr_auto]">
                <div className="relative min-h-[320px]">
                  <img
                    src="https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1600&q=80"
                    alt="Cafe interior for Raseph Cafe"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0502] via-[#0c0502]/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 rounded-3xl border border-white/10 bg-[#120804]/90 px-5 py-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">Open daily</p>
                    <p className="mt-2 font-display text-3xl text-white">8:00 AM - 10:00 PM</p>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-white/8 p-6 sm:grid-cols-2">
                  {[
                    ['Morning brew', 'Light, bright coffees for early starts.'],
                    ['Evening dessert', 'Late-night cakes and slow conversations.'],
                  ].map(([title, copy]) => (
                    <div key={title} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-5">
                      <p className="font-display text-2xl text-white">{title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#d4c1a5]">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

            {selectedMenuItem ? (
              <div className="fixed inset-0 z-70 flex items-start sm:items-center justify-center bg-black/80 px-4 py-8 sm:px-6 animate-[fade-in_0.2s_ease-out]">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#120804]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-[#d4c1a5]">Menu details</p>
                      <h2 className="mt-3 text-3xl font-semibold text-white">{selectedMenuItem.name}</h2>
                      <p className="mt-3 text-sm leading-6 text-[#c7a77a]">{selectedMenuItem.category} • {selectedMenuItem.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMenuItem(null)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <img
                        src={selectedMenuItem.image}
                        alt={selectedMenuItem.name}
                        onError={handleImageError}
                        className="h-80 w-full rounded-[1.5rem] object-cover"
                      />
                    </div>
                    <div className="space-y-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                      <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-[#a98b64]">Why it stands out</p>
                        <p className="mt-4 text-sm leading-7 text-[#d4c1a5]">{selectedMenuItem.description}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-[#0c0502]/90 p-5">
                        <p className="text-xs uppercase tracking-[0.28em] text-[#a98b64]">Staff note</p>
                        <p className="mt-3 text-sm leading-7 text-[#d4c1a5]">
                          Freshly prepared and plated with care. Ask your team about pairing it with today’s espresso selection.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="relative z-10 flex flex-col gap-2">
                            <p className="text-xs uppercase text-[#a98b64]">Size</p>
                            <div className="flex gap-2">
                              {(['Small', 'Medium', 'Large'] as CartItem['size'][]).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setCustomSize(s)}
                                  className={`rounded-full px-3 py-2 text-sm ${customSize === s ? 'bg-[#e1ab43] text-[#0c0502]' : 'bg-white/4 text-[#d4c1a5]'}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <p className="text-xs uppercase text-[#a98b64]">Sugar</p>
                            <select value={customSugar} onChange={(e) => setCustomSugar(e.currentTarget.value as any)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-3 py-2 text-white">
                              <option>No</option>
                              <option>Less</option>
                              <option>Regular</option>
                              <option>Extra</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            <p className="text-xs uppercase text-[#a98b64]">Ice</p>
                            <select value={customIce} onChange={(e) => setCustomIce(e.currentTarget.value as any)} className="w-full rounded-2xl border border-white/10 bg-[#0c0502] px-3 py-2 text-white">
                              <option>No</option>
                              <option>Less</option>
                              <option>Regular</option>
                              <option>Extra</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase text-[#a98b64]">Add-ons</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.keys(customAddons).map((addon) => (
                              <label key={addon} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-sm">
                                <input type="checkbox" checked={!!customAddons[addon]} onChange={() => setCustomAddons((s) => ({ ...s, [addon]: !s[addon] }))} />
                                <span className="text-sm">{addon}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <label className="block">
                          <p className="text-xs uppercase text-[#a98b64]">Notes</p>
                          <textarea rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.currentTarget.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-3 py-2 text-white" placeholder="Allergies or special requests" />
                        </label>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setOrderQty((q) => Math.max(1, q - 1))} className="rounded-full border border-white/8 px-3 py-2">-</button>
                            <span className="w-12 text-center">{orderQty}</span>
                            <button type="button" onClick={() => setOrderQty((q) => q + 1)} className="rounded-full border border-white/8 px-3 py-2">+</button>
                          </div>

                          <button
                            type="button"
                            onClick={handlePlaceOrder}
                            className="ml-auto rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] transition hover:-translate-y-0.5"
                          >
                            Add to cart
                          </button>
                        </div>

                        {orderMessage ? (
                          <p className="text-sm text-[#f5d99a]">{orderMessage}</p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setSelectedMenuItem(null)}
                          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                        >
                          Close details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

          {orderMessage ? (
            <div className="fixed bottom-24 right-6 z-50 animate-[toast-in_0.3s_ease-out] rounded-3xl border border-[#e1ab43]/25 bg-[#120804]/95 px-5 py-4 text-sm text-[#f5d99a] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              {orderMessage}
            </div>
          ) : null}
          </>
        )}

        {loginOpen && !loggedInStaff ? (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 px-4 py-6 sm:px-6 animate-[fade-in_0.2s_ease-out]">
            <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#120804]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-[#d4c1a5]">
                    Staff login
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    Access the staff dashboard
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#c7a77a]">
                    Use your staff username and password to sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginOpen(false)
                    setLoginError(null)
                    setLoginEmail('')
                    setLoginPassword('')
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.22em] text-[#d4c1a5] transition hover:bg-[#e1ab43]/10"
                >
                  Close
                </button>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
                <label className="block text-sm text-[#d4c1a5]">
                  <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Username</span>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                    placeholder="jireh"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                  />
                </label>
                <label className="block text-sm text-[#d4c1a5]">
                  <span className="block uppercase tracking-[0.24em] text-[#a98b64]">Password</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                    placeholder="faith"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-4 py-3 text-white outline-none transition focus:border-[#e1ab43]/55"
                  />
                </label>
                {loginError ? (
                  <p className="rounded-2xl border border-[#e1ab43]/30 bg-[#e1ab43]/10 px-4 py-3 text-sm text-[#f5d99a]">
                    {loginError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0c0502] shadow-[0_16px_40px_rgba(200,134,10,0.28)] transition hover:-translate-y-0.5"
                >
                  Sign in
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>

      {/* Floating cart summary */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-[#0c0502]/95 px-4 py-3 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(200,134,10,0.25)]"
      >
        <span className="rounded-full bg-[#e1ab43] px-3 py-2 font-semibold text-[#0c0502] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(200,134,10,0.5)]">{cartCount()}</span>
        <div className="text-sm text-[#f8f1e5]">
          <div>Cart</div>
          <div className="text-xs text-[#c7a77a]">Subtotal ₱{cartSubtotal()}</div>
        </div>
      </button>

      {cartOpen ? (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1" onClick={() => setCartOpen(false)} />
          <aside className="w-full max-w-md bg-[#120804]/95 border-l border-white/8 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Your Cart</h3>
              <button type="button" onClick={() => setCartOpen(false)} className="text-sm text-[#d4c1a5]">Close</button>
            </div>

            <div className="mt-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-[#d4c1a5]">Your cart is empty.</p>
              ) : (
                cart.map((it) => (
                  <div key={it.id} className="rounded-xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{it.name}</p>
                        <p className="text-xs text-[#c7a77a]">{it.size} • Sugar: {it.sugar} • Ice: {it.ice}</p>
                        {it.addons.length ? <p className="text-xs text-[#d4c1a5]">Add-ons: {it.addons.join(', ')}</p> : null}
                        {it.notes ? <p className="text-xs text-[#d4c1a5]">Notes: {it.notes}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#f3cf86]">₱{it.price * it.qty}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => updateCartQty(it.id, it.qty - 1)} className="rounded-full border border-white/8 px-2">-</button>
                          <span>{it.qty}</span>
                          <button type="button" onClick={() => updateCartQty(it.id, it.qty + 1)} className="rounded-full border border-white/8 px-2">+</button>
                        </div>
                        <button type="button" onClick={() => removeCartItem(it.id)} className="mt-2 text-xs text-[#d4c1a5]">Remove</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-white/8 pt-4">
              <label className="block text-sm text-[#d4c1a5]">
                <span className="block text-xs uppercase tracking-[0.24em] text-[#a98b64]">Order notes</span>
                <textarea rows={3} value={cartNotes} onChange={(e) => setCartNotes(e.currentTarget.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c0502] px-3 py-2 text-white" placeholder="Special requests for the whole order" />
              </label>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#c7a77a]">Subtotal</div>
                  <div className="font-semibold text-white">₱{cartSubtotal()}</div>
                </div>
                <div className="space-y-2">
                  <button onClick={handleCheckout} className="rounded-full bg-gradient-to-r from-[#e1ab43] to-[#9b6510] px-6 py-3 text-sm font-semibold">Checkout</button>
                  <button onClick={() => { setCart([]); setCartOpen(false); }} className="w-full text-sm text-[#d4c1a5]">Clear cart</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {ordersOpen ? (
        <div className="fixed inset-0 z-60 flex">
          <div className="flex-1" onClick={() => setOrdersOpen(false)} />
          <aside className="w-full max-w-2xl bg-[#120804]/95 border-l border-white/8 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Order History</h3>
                <p className="text-sm text-[#c7a77a]">Saved from completed checkouts</p>
              </div>
              <button type="button" onClick={() => setOrdersOpen(false)} className="text-sm text-[#d4c1a5]">Close</button>
            </div>

            <div className="mt-6 space-y-6">
              {(remoteOrders ?? loadLocalOrders()).length === 0 ? (
                <p className="text-sm text-[#d4c1a5]">No past orders yet.</p>
              ) : (
                (remoteOrders ?? loadLocalOrders()).map((order) => (
                  <div key={order.id} className="rounded-xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">Order #{order.id}</p>
                        <p className="text-xs text-[#c7a77a]">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="font-semibold text-[#f3cf86]">₱{order.subtotal}</p>
                    </div>
                    {order.notes ? <p className="mt-3 text-sm text-[#d4c1a5]">Order notes: {order.notes}</p> : null}
                    <div className="mt-4 space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-[#0c0502]/90 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium text-white">{item.name} × {item.qty}</p>
                            <p className="text-sm text-[#c7a77a]">₱{item.price * item.qty}</p>
                          </div>
                          <p className="mt-1 text-xs text-[#d4c1a5]">{item.size} • Sugar: {item.sugar} • Ice: {item.ice}</p>
                          {item.addons.length ? <p className="mt-1 text-xs text-[#d4c1a5]">Add-ons: {item.addons.join(', ')}</p> : null}
                          {item.notes ? <p className="mt-1 text-xs text-[#d4c1a5]">Notes: {item.notes}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {reservationsOpen ? (
        <div className="fixed inset-0 z-60 flex">
          <div className="flex-1" onClick={() => setReservationsOpen(false)} />
          <aside className="w-full max-w-2xl bg-[#120804]/95 border-l border-white/8 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Reservations</h3>
                <p className="text-sm text-[#c7a77a]">Saved reservation requests</p>
              </div>
              <button type="button" onClick={() => setReservationsOpen(false)} className="text-sm text-[#d4c1a5]">Close</button>
            </div>

            <div className="mt-6 space-y-6">
              {(remoteReservations ?? loadLocalReservations()).length === 0 ? (
                <p className="text-sm text-[#d4c1a5]">No reservation requests found yet.</p>
              ) : (
                (remoteReservations ?? loadLocalReservations()).map((reservation) => (
                  <div key={reservation.id} className="rounded-xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{reservation.name}</p>
                        <p className="text-xs text-[#c7a77a]">{new Date(reservation.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="font-semibold text-[#f3cf86]">{reservation.guests} Guests</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-[#d4c1a5] sm:grid-cols-2">
                      <p><span className="font-semibold text-white">Phone:</span> {reservation.phone}</p>
                      <p><span className="font-semibold text-white">Date:</span> {reservation.date}</p>
                      <p><span className="font-semibold text-white">Time:</span> {reservation.time}</p>
                      <p><span className="font-semibold text-white">Guests:</span> {reservation.guests}</p>
                    </div>
                    {reservation.notes ? <p className="mt-3 text-sm text-[#d4c1a5]">Notes: {reservation.notes}</p> : null}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <footer className="border-t border-white/8 bg-[#0b0402]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-display text-2xl text-white">
              Raseph <span className="text-[#e1ab43]">Cafe</span>
            </p>
            <p className="mt-2 text-sm text-[#a98b64]">
              Built with React, TypeScript, Vite, and Tailwind CSS.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[#d4c1a5]">
            <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">Instagram</span>
            <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">Facebook</span>
            <span className="rounded-full border border-white/8 bg-white/4 px-4 py-2">Reservations</span>
          </div>
          <p className="text-sm text-[#7f6748]">© {new Date().getFullYear()} Raseph Cafe</p>
        </div>
      </footer>
    </div>
  )
}

export default App
