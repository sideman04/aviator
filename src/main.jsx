import React, { Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Sparkles } from '@react-three/drei'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Copy, Download, Gauge, History, Info, KeyRound, LogOut, Plane, ShieldCheck, Sparkles as SparkleIcon, UserRound, X, Zap } from 'lucide-react'
import './styles.css'

const user = { name: 'Alex Morgan', email: 'alex.morgan@gmail.com', initials: 'AM' }

const AUTH_KEY = 'aviator:access-granted'
const readAccess = () => { try { return localStorage.getItem(AUTH_KEY) === 'granted' } catch { return false } }
const AuthContext = React.createContext(null)

function AuthProvider({ children }) {
  const [unlocked, setUnlocked] = useState(readAccess)
  const unlock = React.useCallback(() => {
    setUnlocked(true)
    try { localStorage.setItem(AUTH_KEY, 'granted') } catch { /* storage may be unavailable */ }
  }, [])
  const lock = React.useCallback(() => {
    setUnlocked(false)
    try { localStorage.removeItem(AUTH_KEY) } catch { /* storage may be unavailable */ }
  }, [])
  const value = React.useMemo(() => ({ unlocked, unlock, lock }), [unlocked, unlock, lock])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const useAuth = () => React.useContext(AuthContext)

const ToastContext = React.createContext(() => {})

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = React.useCallback(id => setToasts(current => current.filter(item => item.id !== id)), [])
  const toast = React.useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(current => [...current.slice(-2), { id, message, type }])
    setTimeout(() => dismiss(id), 3600)
  }, [dismiss])
  return <ToastContext.Provider value={toast}>{children}
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map(item => <motion.div key={item.id} className={`toast toast-${item.type}`} initial={{ opacity: 0, y: 14, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .96 }} transition={{ duration: .2 }}>
          <span className="toast-icon">{item.type === 'success' ? <Check size={15} /> : item.type === 'error' ? <X size={15} /> : <Info size={15} />}</span>
          <span className="toast-message">{item.message}</span>
          <button className="toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={13} /></button>
        </motion.div>)}
      </AnimatePresence>
    </div>
  </ToastContext.Provider>
}

const useToast = () => React.useContext(ToastContext)

function Protected({ children }) {
  const { unlocked } = useAuth()
  if (!unlocked) return <Navigate to="/activate" replace state={{ reason: 'auth' }} />
  return children
}

const formatDuration = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(error => {
      console.error('Unable to register the service worker:', error)
    })
  })
}

function Brand({ compact = false }) { return <Link className="brand" to="/prediction"><span className="brand-mark"><Plane size={compact ? 15 : 17} fill="currentColor" /></span><span>Aviator <b>Prediction</b></span></Link> }

const DISMISS_KEY = 'aviator:install-dismissed'

function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const dismiss = () => {
    setDismissed(true)
    setShowInstructions(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* storage may be unavailable */ }
  }

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIos(Boolean(iosDevice && !standalone))

    const handleInstallPrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setShowInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions(true)
      return
    }

    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } catch (error) {
      console.error('Unable to start the app installation prompt:', error)
    }
  }

  if (dismissed || (!installPrompt && !isIos)) return null

  return <div className="pwa-install">
    <button className="pwa-dismiss" aria-label="Dismiss install prompt" onClick={dismiss}><X size={14} /></button>
    <button className="pwa-install-button" onClick={install}><Download size={16} /> Install app</button>
    {showInstructions && <div className="pwa-help-backdrop" onClick={() => setShowInstructions(false)}>
      <section className="pwa-help-card" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" onClick={event => event.stopPropagation()}>
        <button className="pwa-help-close" aria-label="Close install instructions" onClick={() => setShowInstructions(false)}><X size={18} /></button>
        <div className="eyebrow">INSTALL ON IOS</div>
        <h2 id="pwa-help-title">Add Aviator to your Home Screen</h2>
        <p>In Safari, tap the Share button, choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</p>
      </section>
    </div>}
  </div>
}

function PlaneModel({ small = false }) {
  const group = React.useRef()
  useFrame((_, delta) => { if (group.current) { group.current.rotation.y += delta * .14; group.current.rotation.z = Math.sin(Date.now() / 1500) * .035 } })
  return <group ref={group} scale={small ? .72 : 1} rotation={[0, -.45, .16]}>
    <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[.17, 2.3, 8, 16]} /><meshStandardMaterial color="#dadde4" metalness={.85} roughness={.2} /></mesh>
    <mesh position={[0, .05, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.1, 2.8, .055]} /><meshStandardMaterial color="#b8bdc8" metalness={.8} roughness={.18} /></mesh>
    <mesh position={[0, .1, .92]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.07, .92, .04]} /><meshStandardMaterial color="#b8bdc8" metalness={.8} roughness={.18} /></mesh>
    <mesh position={[0, .18, -.72]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.07, .55, .05]} /><meshStandardMaterial color="#b8bdc8" metalness={.8} roughness={.18} /></mesh>
    <mesh position={[0, .18, -1.02]}><boxGeometry args={[.06, .45, .06]} /><meshStandardMaterial color="#ff1028" emissive="#b80019" emissiveIntensity={3} /></mesh>
    <mesh position={[.18, -.08, .28]}><boxGeometry args={[.12, .08, .42]} /><meshStandardMaterial color="#16181e" /></mesh>
    <mesh position={[-.18, -.08, .28]}><boxGeometry args={[.12, .08, .42]} /><meshStandardMaterial color="#16181e" /></mesh>
  </group>
}

class SceneBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Unable to render the 3D scene:', error) }
  render() {
    if (this.state.failed) return <div className="scene-fallback" aria-hidden="true"><Plane size={62} /></div>
    return this.props.children
  }
}

function AviationScene({ small = false, quiet = false }) { const reduceMotion = useReducedMotion(); return <div className={`aviation-scene ${small ? 'scene-small' : ''}`}><SceneBoundary><Canvas camera={{ position: [0, .45, 3.3], fov: 38 }} dpr={[1, 1.5]} frameloop={reduceMotion ? 'demand' : 'always'}><ambientLight intensity={1.5} /><hemisphereLight intensity={1.1} color="#cfd5e6" groundColor="#3a0c13" /><pointLight position={[2, 1, 2]} color="#ff1028" intensity={8} distance={5} /><pointLight position={[-2, 1, 1]} color="#9da7c5" intensity={4} distance={5} /><Suspense fallback={null}><Float speed={quiet ? .35 : .8} rotationIntensity={quiet ? .08 : .2} floatIntensity={quiet ? .18 : .5}><PlaneModel small={small} /></Float>{!quiet && !reduceMotion && <Sparkles count={28} scale={4} size={1.4} color="#ff4050" speed={.25} />}</Suspense></Canvas></SceneBoundary></div> }

function Shell({ children }) {
  const [open, setOpen] = useState(false); const nav = useNavigate(); const loc = useLocation(); const menuRef = useRef(null); const { lock } = useAuth(); const toast = useToast()
  const logout = () => { setOpen(false); lock(); nav('/'); toast('Signed out of Aviator.', 'info') }

  useEffect(() => { setOpen(false) }, [loc.pathname])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = event => { if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false) }
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar"><Brand /><div className="header-right"><span className="status-pill"><i /> System operational</span><div className="account-menu" ref={menuRef}><button className="avatar-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><span className="avatar">{user.initials}</span><ChevronDown size={15} /></button>{open && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="profile-menu" role="menu"><div className="menu-user"><span className="avatar">{user.initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><button role="menuitem" onClick={() => { setOpen(false); nav('/account') }}><UserRound size={15} /> My account</button><button role="menuitem" onClick={logout}><LogOut size={15} /> Log out</button></motion.div>}</div></div></header>
    <main id="main-content" className={loc.pathname === '/prediction' ? 'main-area prediction-area' : 'main-area'}>{children}</main>
  </div>
}

function Welcome() { const nav = useNavigate(); const { unlocked } = useAuth(); return <div className="welcome-page"><div className="welcome-visual"><div className="visual-top"><Brand /></div><div className="visual-copy"><div className="eyebrow"><span /> PREDICTION, REFINED</div><h1>See beyond<br /><em>the moment.</em></h1><p>A calmer, smarter way to read the skies. Receive clear signals when every second matters.</p><div className="feature-row"><Feature icon={<SparkleIcon />} text="Premium experience" /><Feature icon={<ShieldCheck />} text="Secure access" /><Feature icon={<Zap />} text="Intelligent signals" /></div></div><div className="welcome-plane"><AviationScene /></div><div className="visual-footer"><span>AVIATOR / 01</span><span>EST. 2026</span></div></div><div className="welcome-form"><div className="mobile-brand"><Brand /></div><div className="form-content"><div className="eyebrow">WELCOME ABOARD</div><h2>Your next signal<br /><span>starts here.</span></h2><p className="form-lead">Sign in to access your private prediction workspace.</p><button className="google-button" onClick={() => nav(unlocked ? '/prediction' : '/activate')}><span className="google-g">G</span> Continue with Google <ArrowRight size={17} /></button><div className="legal">By continuing, you agree to our <a>Terms of Service</a><br />and <a>Privacy Policy</a>.</div></div><div className="form-bottom"><CircleHelp size={15} /> Need help? <a>Contact support</a></div></div></div> }
function Feature({ icon, text }) { return <div className="feature"><span>{React.cloneElement(icon, { size: 16 })}</span><small>{text}</small></div> }

function Activate() {
  const nav = useNavigate(); const loc = useLocation(); const { unlocked, unlock } = useAuth(); const toast = useToast(); const [key, setKey] = useState(''); const [state, setState] = useState('idle'); const hasError = state === 'empty' || state === 'invalid'
  useEffect(() => { if (unlocked) nav('/prediction', { replace: true }) }, [unlocked, nav])
  useEffect(() => { if (loc.state?.reason === 'auth') toast('Activate your key to enter the flight deck.', 'info') }, [loc.state, toast])
  const submit = event => { event.preventDefault(); if (!key.trim()) return setState('empty'); setState('loading'); setTimeout(() => { if (key.trim().toUpperCase() === 'AVIATOR-2026') { setState('success'); toast('Key accepted — welcome aboard.', 'success'); setTimeout(unlock, 650) } else setState('invalid') }, 900) }
  return <div className="center-page"><div className="center-orbit" /><div className="auth-brand"><Brand /></div><motion.div className="activate-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}><div className="card-icon"><KeyRound /></div><div className="eyebrow">PRIVATE ACCESS</div><h2>Unlock your<br /><span>flight path.</span></h2><p>Enter your activation key to unlock your private prediction workspace.</p><form onSubmit={submit} noValidate><label htmlFor="activation-key">ACTIVATION KEY<div className={`input-wrap ${hasError ? 'input-error' : ''}`}><KeyRound size={16} /><input id="activation-key" autoFocus value={key} onChange={e => { setKey(e.target.value.toUpperCase()); setState('idle') }} placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={hasError} aria-describedby="activation-feedback" /></div></label><div id="activation-feedback" aria-live="polite">{hasError && <div className="error-message">{state === 'empty' ? 'Please enter your activation key.' : 'That key is invalid or has expired.'}</div>}{state === 'success' && <div className="success-message"><Check size={14} /> Key activated successfully</div>}</div><button type="submit" className="primary-button" disabled={state === 'loading' || state === 'success'}>{state === 'loading' ? <><span className="spinner" /> Verifying key...</> : state === 'success' ? 'Access granted' : <>Activate key <ArrowRight size={17} /></>}</button></form><button className="text-button" onClick={() => nav('/')}><span>←</span> Back to sign in</button></motion.div><div className="contact-line">Having trouble? <a>Contact your administrator</a></div></div>
}

const SIGNAL_STEPS = ['Scanning the runway...', 'Reading the wind...', 'Locking the signal...']
const HISTORY_KEY = 'aviator:signal-history'
const COOLDOWN_MS = 8000
const PLAY_WINDOW_MIN = 18000
const PLAY_WINDOW_MAX = 42000

function Prediction() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(HISTORY_KEY))
      return Array.isArray(stored) ? stored.slice(0, 5) : []
    } catch { return [] }
  })
  const [now, setNow] = useState(() => Date.now())
  const [readyAt, setReadyAt] = useState(0)
  const [playAt, setPlayAt] = useState(0)
  const [playDuration, setPlayDuration] = useState(0)
  const timer = useRef(null)
  const toast = useToast()

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch { /* storage may be unavailable */ } }, [history])

  useEffect(() => {
    if (!loading) return
    setStep(0)
    const interval = setInterval(() => setStep(current => Math.min(current + 1, SIGNAL_STEPS.length - 1)), 520)
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    if (!readyAt && !playAt) return
    const interval = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if ((!readyAt || readyAt <= time) && (!playAt || playAt <= time)) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [readyAt, playAt])

  const cooldown = readyAt ? Math.max(0, Math.ceil((readyAt - now) / 1000)) : 0
  const playIn = playAt ? Math.max(0, Math.ceil((playAt - now) / 1000)) : 0
  const playProgress = playAt && playDuration ? Math.max(0, Math.min(1, (playAt - now) / playDuration)) : 0
  const playTime = playAt ? new Date(playAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  const generate = () => {
    if (loading || cooldown > 0) return
    setLoading(true)
    setResult(null)
    setCopied(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const signal = (1.1 + Math.random() * 4.7).toFixed(2)
      const generatedAt = Date.now()
      const duration = PLAY_WINDOW_MIN + Math.random() * (PLAY_WINDOW_MAX - PLAY_WINDOW_MIN)
      setNow(generatedAt)
      setLoading(false)
      setResult(signal)
      setReadyAt(generatedAt + COOLDOWN_MS)
      setPlayAt(generatedAt + duration)
      setPlayDuration(duration)
      setHistory(previous => [{ value: signal, at: generatedAt }, ...previous].slice(0, 5))
    }, 1600)
  }

  const copy = async () => {
    if (!result) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(`${result}x`)
      else {
        const field = document.createElement('textarea')
        field.value = `${result}x`
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        field.remove()
      }
      setCopied(true)
      toast(`Signal ${result}x copied to clipboard.`)
      setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error('Unable to copy the signal:', error)
    }
  }

  return <div className="prediction-content">
    <div className="prediction-kicker"><span className="live-dot" /> LIVE ENGINE <span className="slash">/</span> {loading ? 'READING THE SKIES' : 'READY TO GENERATE'}</div>
    <AnimatePresence mode="wait">
      {!result ? <motion.div key="idle" className="prediction-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <AviationScene />
        <div className="hero-copy"><div className="eyebrow">FLIGHT DECK</div><h1>Aviator<br /><em>Prediction</em></h1><p>One clear signal. A better decision.</p></div>
        <button className={`generate-button ${loading ? 'is-loading' : ''}`} onClick={generate} disabled={loading} aria-busy={loading}>{loading ? <><span className="spinner" /> {SIGNAL_STEPS[step]}</> : <>Generate prediction <ArrowRight size={18} /></>}</button>
        <div className="disclaimer">Signals are for insight only. Always play responsibly.</div>
      </motion.div> : <motion.div key="result" className="result-view" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="result-orbit"><AviationScene small quiet /><span className="result-label">SIGNAL RECEIVED</span><strong>{result}<small>x</small></strong></div>
        <div className="eyebrow">YOUR NEXT SIGNAL</div>
        <h2>Clear skies<br /><em>ahead.</em></h2>
        <p>Generated just now · Engine confidence high</p>
        <div className={`play-window ${playIn === 0 ? 'is-open' : ''}`}>
          <div className="play-window-top"><span className="play-label"><Clock3 size={13} /> TIME TO PLAY</span><strong className="play-clock">{playIn > 0 ? formatDuration(playIn) : 'OPEN NOW'}</strong></div>
          <div className="play-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playProgress * 100)} aria-label="Time until the play window"><span style={{ width: `${Math.max(3, playProgress * 100)}%` }} /></div>
          <p className="play-note">{playIn > 0 ? <>Play <b>{result}x</b> at <b>{playTime}</b> · in {formatDuration(playIn)}</> : <>Play window open now · <b>{result}x</b></>}</p>
        </div>
        <div className="result-actions">
          <button className="generate-button another" onClick={generate} disabled={cooldown > 0 || loading}>{cooldown > 0 ? <>Next signal in {cooldown}s</> : <>Generate another <ArrowRight size={18} /></>}</button>
          <button className="copy-button" onClick={copy} aria-label={copied ? 'Signal copied' : 'Copy signal'}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button>
        </div>
        {history.length > 1 && <div className="signal-history" aria-label="Recent signals"><span className="history-label"><History size={13} /> RECENT</span>{history.slice(1).map((item, index) => <span className="history-chip" key={`${item.at}-${index}`}>{item.value}x</span>)}</div>}
        <div className="disclaimer">Signals are for insight only. Always play responsibly.</div>
        <div className="sr-only" aria-live="polite">Signal received: {result} times. Play {playAt ? `at ${playTime}` : 'now'}.</div>
      </motion.div>}
    </AnimatePresence>
  </div>
}

const ACCESS_KEY = 'AVIATOR-2026'
const DAYS_REMAINING = 24
const BILLING_DAYS = 30

function Account() {
  const nav = useNavigate(); const { lock } = useAuth(); const toast = useToast(); const [keyCopied, setKeyCopied] = useState(false)
  const copyKey = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(ACCESS_KEY)
      setKeyCopied(true)
      toast('Access key copied to clipboard.')
      setTimeout(() => setKeyCopied(false), 1600)
    } catch (error) {
      console.error('Unable to copy the access key:', error)
    }
  }
  return <div className="account-page">
    <div className="account-heading"><div><div className="eyebrow">PERSONAL SPACE</div><h1>My account</h1><p>Manage your profile and access.</p></div><Link className="outline-button" to="/prediction">Back to prediction <ArrowRight size={16} /></Link></div>
    <div className="account-grid">
      <section className="account-card profile-card"><div className="section-title"><span className="icon-square"><UserRound size={17} /></span><div><b>Profile</b><small>Your Google account</small></div></div><div className="profile-large"><span className="avatar large">AM</span><div><h3>{user.name}</h3><p>{user.email}</p></div></div><div className="profile-row"><span>Account status</span><b className="active"><i /> Active</b></div></section>
      <section className="account-card subscription-card"><div className="section-title"><span className="icon-square red"><Gauge size={17} /></span><div><b>Subscription</b><small>Your active access</small></div><span className="active-tag">ACTIVE</span></div><div className="plan-name">Monthly Access</div><div className="countdown"><div><strong>{DAYS_REMAINING}</strong><span>days remaining</span></div><Clock3 size={25} /></div><div className="plan-progress" role="progressbar" aria-valuemin={0} aria-valuemax={BILLING_DAYS} aria-valuenow={DAYS_REMAINING} aria-label={`${DAYS_REMAINING} of ${BILLING_DAYS} days remaining`}><span style={{ width: `${(DAYS_REMAINING / BILLING_DAYS) * 100}%` }} /></div><div className="detail-list"><div><span>Activated on</span><b>01 Nov 2026</b></div><div><span>Expires on</span><b>01 Dec 2026</b></div><div><span>Access key</span><span className="key-value"><b className="key-mask">••••-••••-7K2M</b><button className="key-copy" onClick={copyKey} aria-label={keyCopied ? 'Access key copied' : 'Copy access key'}>{keyCopied ? <Check size={12} /> : <Copy size={12} />}</button></span></div></div></section>
    </div>
    <button className="logout-link" onClick={() => { lock(); nav('/'); toast('Signed out of Aviator.', 'info') }}><LogOut size={16} /> Log out of Aviator</button>
  </div>
}

function App() { return <ToastProvider><AuthProvider><Routes><Route path="/" element={<Welcome />} /><Route path="/activate" element={<Activate />} /><Route path="/prediction" element={<Protected><Shell><Prediction /></Shell></Protected>} /><Route path="/account" element={<Protected><Shell><Account /></Shell></Protected>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes><PWAInstall /></AuthProvider></ToastProvider> }
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)
