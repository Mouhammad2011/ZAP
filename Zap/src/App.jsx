import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { auth, isFirebaseConfigured } from './lib/firebase.js'
import {
  createAccount,
  createComment,
  publishReel as publishReelToFirebase,
  saveUserProfile,
  setUserMarker,
  signInAccount,
  signOutAccount,
  subscribeToComments,
  subscribeToPublishedReels,
  subscribeToReelCounts,
  subscribeToUserMarkers,
  watchAuth,
} from './lib/firebaseData.js'

const topics = ['Code', 'Gaming', 'Memes', 'Tech', 'Raw', 'Life']
const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
const initialReels = [
  {
    id: 'r1', handle: 'mira.codes', name: 'Mira Chen', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
    caption: 'POV: you finally delete the 400-line component and everything just… works. #Code #devlife', tags: ['Code', 'Tech'],
    likes: 24800, comments: 438, reposts: 1200, views: 318400, score: 98, postedAt: '2026-10-25T10:20:00',
    video: 'https://videos.pexels.com/video-files/3129595/3129595-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&h=1800&fit=crop',
    audio: 'original audio · mira.codes', track: 'SOFT RESET — MIRA', description: 'A tiny reminder to refactor the thing you keep avoiding. Built this setup from scratch last Sunday.',
    commentsSeed: [{ user: 'noahbuilds', text: 'the relief when the tests pass 😮‍💨', time: '2m' }, { user: 'bytebabe', text: 'deleting code is an underrated skill', time: '8m' }, { user: 'rooted.dev', text: '400 lines down to 80 here, been there', time: '15m' }],
  },
  {
    id: 'r2', handle: 'leo.afterhours', name: 'Leo Park', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
    caption: 'The city sounds different at 2am. No rush. No noise. Just here. #Life #Raw', tags: ['Life', 'Raw'],
    likes: 18200, comments: 204, reposts: 860, views: 192600, score: 84, postedAt: '2026-10-25T10:05:00',
    video: 'https://videos.pexels.com/video-files/3129671/3129671-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1000&h=1800&fit=crop',
    audio: 'lowlight · leo.afterhours', track: 'NIGHT DRIVE — LEO', description: 'A walk back from the studio. Shot on a pocket camera, no edit, no plan.',
    commentsSeed: [{ user: 'elle.jpg', text: 'this feels like a deep breath', time: '4m' }, { user: 'mori', text: 'the lights are unreal', time: '12m' }],
  },
  {
    id: 'r3', handle: 'pixel.sprint', name: 'Sam Rivera', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces',
    caption: 'One more game. Famous last words 🎮 #Gaming', tags: ['Gaming', 'Memes'],
    likes: 96700, comments: 3100, reposts: 8400, views: 1100000, score: 95, postedAt: '2026-10-25T09:50:00',
    video: 'https://videos.pexels.com/video-files/3130284/3130284-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&h=1800&fit=crop',
    audio: 'midnight queue · pixel.sprint', track: 'CONTINUE? — 8BIT', description: 'The crew said “last round” forty minutes ago. We all knew what that meant.',
    commentsSeed: [{ user: 'ggwp', text: 'one more means three more 😂', time: '1m' }, { user: 'koko', text: 'the squad is undefeated', time: '6m' }, { user: 'actuallyoffline', text: 'me opening the game at 1:58am', time: '9m' }],
  },
  {
    id: 'r4', handle: 'tomorrow.tech', name: 'Nia Patel', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop&crop=faces',
    caption: 'This tiny piece of tech made my whole desk feel like the future. #Tech #setup', tags: ['Tech', 'Code'],
    likes: 14300, comments: 187, reposts: 540, views: 147000, score: 79, postedAt: '2026-10-25T09:14:00',
    video: 'https://videos.pexels.com/video-files/3141208/3141208-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1000&h=1800&fit=crop',
    audio: 'desk notes · tomorrow.tech', track: 'SOFT MACHINES — NIA', description: 'A quiet morning setup tour. Everything on this desk earns its spot.',
    commentsSeed: [{ user: 'arthur.jpg', text: 'minimal desk goals', time: '3m' }, { user: 'heyitskim', text: 'where did you get the light?', time: '10m' }],
  },
  {
    id: 'r5', handle: 'jules.unfiltered', name: 'Jules Martin', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces',
    caption: 'Reminder: you can start again on a random Tuesday. #Raw #Life', tags: ['Raw', 'Life'],
    likes: 42900, comments: 905, reposts: 3100, views: 512000, score: 88, postedAt: '2026-10-25T08:57:00',
    video: 'https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000&h=1800&fit=crop',
    audio: 'voice memo · jules.unfiltered', track: 'TUESDAY AGAIN — JULES', description: 'A note I needed to hear a year ago. Maybe you need it today.',
    commentsSeed: [{ user: 'by.ren', text: 'needed this more than you know', time: '7m' }, { user: 'dani', text: 'every day is a fresh start ✨', time: '14m' }],
  },
  {
    id: 'r6', handle: 'meme.archivist', name: 'Kai Okafor', avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=120&h=120&fit=crop&crop=faces',
    caption: 'My brain at 3am replaying one mildly awkward thing I said in 2017. #Memes', tags: ['Memes'],
    likes: 208000, comments: 7200, reposts: 26000, views: 3200000, score: 100, postedAt: '2026-10-25T08:42:00',
    video: 'https://videos.pexels.com/video-files/3255275/3255275-hd_1080_1920_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=1000&h=1800&fit=crop',
    audio: 'original audio · meme.archivist', track: 'WHY DID I SAY THAT — KAI', description: 'An accurate documentary of the 3am brain. Please advise.',
    commentsSeed: [{ user: 'void.exe', text: 'this is way too real', time: '30s' }, { user: 'sarah.zip', text: 'why are we like this', time: '2m' }, { user: 'sleepdeprived', text: '2017? mine was 2009', time: '5m' }],
  },
]

const springs = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }
const fmt = (value) => value >= 1000000 ? `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M` : value >= 1000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K` : `${value}`
const reelUrl = (reelId) => {
  const url = new URL(window.location.href)
  url.searchParams.set('reel', reelId)
  return url.toString()
}

function Icon({ name, size = 22, strokeWidth = 1.8, fill = 'none', className = '' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true }
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    heart: <path d="M20.8 8.8c0 5-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.8a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z"/>,
    comment: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.8-.8L4 20l1.3-3.3A7 7 0 0 1 4 12c0-4.2 3.6-7.5 8-7.5s8 2.8 8 7Z"/>,
    share: <><path d="m12 15 8-8-8-4"/><path d="M20 7H9a5 5 0 0 0-5 5v8"/></>,
    repeat: <><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z"/>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></>,
    play: <path d="m8 5 12 7-12 7V5Z" fill="currentColor" stroke="none"/>,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="3"/></>,
    x: <><path d="m18 6-12 12M6 6l12 12"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 17v3h16v-3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    music: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  }
  return <svg {...common}>{paths[name] || paths.spark}</svg>
}

function Avatar({ src, size = 38, className = '' }) {
  return <img src={src || defaultAvatar} width={size} height={size} className={`avatar ${className}`} alt="" loading="lazy" />
}

function DockButton({ children, label, onClick, className = '' }) {
  return (
    <motion.button type="button" aria-label={label} title={label} className={`dock-action ${className}`} whileTap={{ scale: 0.83 }} transition={springs} onClick={onClick}>
      {children}
    </motion.button>
  )
}

function Sheet({ children, onClose, className = '', backdropClassName = '', placement = 'bottom' }) {
  const variants = placement === 'right'
    ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
  return (
    <motion.div className={`sheet-backdrop ${backdropClassName}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.section className={`sheet ${placement === 'right' ? 'sheet-right' : ''} ${className}`} {...variants} transition={{ type: 'spring', stiffness: 310, damping: 34 }}>
        <button type="button" className="sheet-close glass-button" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        {placement === 'bottom' && <div className="sheet-handle" />}
        {children}
      </motion.section>
    </motion.div>
  )
}

function ReelCard({ reel, index, active, muted, onToggleMute, onTogglePlay, isLiked, isReposted, isSaved, following, likesCount, commentsCount, repostsCount, onFollow, onLike, onSave, onComment, onAnalytics, onShare, onRepost, onMenu, showToast }) {
  const videoRef = useRef(null)
  const tapRef = useRef(0)
  const timerRef = useRef(null)
  const [playing, setPlaying] = useState(true)
  const [burst, setBurst] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (active) {
      const playPromise = video.play()
      if (playPromise?.catch) playPromise.catch(() => {})
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [active])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleStageClick = (event) => {
    if (event.target.closest('button, a')) return
    const now = Date.now()
    if (tapRef.current && now - tapRef.current < 280) {
      clearTimeout(timerRef.current)
      tapRef.current = 0
      setBurst(true)
      onLike(true)
      window.setTimeout(() => setBurst(false), 900)
      return
    }
    tapRef.current = now
    timerRef.current = window.setTimeout(() => {
      onToggleMute()
      tapRef.current = 0
    }, 280)
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      const p = video.play()
      if (p?.catch) p.catch(() => {})
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
    onTogglePlay?.()
  }

  const menuAction = (action) => {
    setMenuOpen(false)
    if (action === 'Copy link') {
      navigator.clipboard?.writeText(reelUrl(reel.id)).catch(() => {})
      showToast('Link copied', 'check')
    } else if (action === 'Mute creator') {
      showToast(`Muted @${reel.handle}`, 'mute')
    } else if (action === 'Not interested') {
      showToast('We’ll show you less like this', 'spark')
    } else {
      showToast('Report received', 'check')
    }
  }

  return (
    <motion.article className="reel-card" data-reel-index={index} initial={{ opacity: 0.88 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      <img className="reel-poster" src={reel.poster} alt="" />
      <video ref={videoRef} className="reel-video" src={reel.video} poster={reel.poster} muted={muted} loop playsInline autoPlay preload="metadata" />
      <div className="reel-scrim" />
      <div className="reel-click-layer" onClick={handleStageClick} aria-label="Double tap to like, tap to toggle sound" />

      <div className="creator-row">
        <Avatar src={reel.avatar} size={39} />
        <div className="creator-copy"><span className="creator-name">{reel.handle}</span><span className="creator-sub">{reel.name}</span></div>
        <motion.button type="button" className={`follow-button ${following ? 'following' : ''}`} whileTap={{ scale: 0.9 }} transition={springs} onClick={onFollow}>
          <AnimatePresence mode="wait" initial={false}><motion.span key={following ? 'following' : 'follow'} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }}>{following ? <><Icon name="check" size={13} /> Following</> : '+ Follow'}</motion.span></AnimatePresence>
        </motion.button>
      </div>

      <div className="reel-tools">
        <motion.button type="button" className="tool-button glass-button" aria-label={playing ? 'Pause video' : 'Play video'} whileTap={{ scale: 0.88 }} onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} size={15} /></motion.button>
        <motion.button type="button" className="tool-button glass-button" aria-label={muted ? 'Unmute' : 'Mute'} whileTap={{ scale: 0.88 }} onClick={onToggleMute}><Icon name={muted ? 'mute' : 'volume'} size={17} /></motion.button>
        <div className="menu-wrap">
          <motion.button type="button" className="tool-button glass-button" aria-label="More options" whileTap={{ scale: 0.88 }} onClick={() => setMenuOpen((v) => !v)}><Icon name="more" size={19} /></motion.button>
          <AnimatePresence>
            {menuOpen && <motion.div className="context-menu" initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -5 }} transition={springs}>
              {['Copy link', 'Not interested', 'Mute creator', 'Report'].map((item) => <button type="button" key={item} onClick={() => menuAction(item)}>{item}</button>)}
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!playing && <motion.button className="play-indicator glass-button" type="button" aria-label="Play video" initial={{ x: '-50%', y: '-50%', scale: 0.6, opacity: 0 }} animate={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }} exit={{ x: '-50%', y: '-50%', scale: 1.3, opacity: 0 }} transition={springs} onClick={togglePlay}><Icon name="play" size={26} /></motion.button>}
        {burst && <motion.div className="heart-burst" initial={{ x: '-50%', y: '-50%', scale: 0.35, opacity: 0, rotate: -12 }} animate={{ x: '-50%', y: '-50%', scale: [0.35, 1.12, 1], opacity: [0, 1, 0], rotate: [0, 4, 0] }} transition={{ duration: 0.82, times: [0, 0.25, 1], ease: 'easeOut' }}><Icon name="heart" size={96} fill="white" strokeWidth={1.2} /></motion.div>}
      </AnimatePresence>

      <div className="reel-bottom">
        <button type="button" className="caption-block" onClick={() => onAnalytics(reel)}>
          <span className="caption-handle">@{reel.handle}</span>
          <span className="caption-text">{reel.caption}</span>
          <span className="caption-meta"><span><Icon name="music" size={13} /> {reel.audio}</span><span className="caption-more">More <span>↗</span></span></span>
        </button>
      </div>

      <div className="action-stack">
        <ActionButton icon="heart" count={fmt(likesCount ?? reel.likes)} active={isLiked} activeColor="liked" label="Like" onClick={() => onLike(false)} />
        <ActionButton icon="comment" count={fmt(commentsCount ?? reel.comments)} label="Comments" onClick={() => onComment(reel)} />
        <ActionButton icon="repeat" count={fmt(repostsCount ?? reel.reposts)} label="Repost" active={isReposted} activeColor="reposted" onClick={onRepost} />
        <ActionButton icon="share" count="Share" label="Share" onClick={() => onShare(reel)} />
        <motion.button type="button" className={`action-button save-action ${isSaved ? 'saved' : ''}`} whileTap={{ scale: 0.8 }} transition={springs} aria-label="Save" onClick={onSave}><span className="action-glass"><Icon name="bookmark" size={22} fill={isSaved ? 'currentColor' : 'none'} /></span><span className="action-count">{isSaved ? 'Saved' : 'Save'}</span></motion.button>
      </div>

      <div className="vinyl-wrap" aria-label={`Now playing ${reel.track}`}><div className="vinyl-disc"><span className="vinyl-label"><Avatar src={reel.avatar} size={23} /></span></div><span className="vinyl-note">♫</span></div>
    </motion.article>
  )
}

function ActionButton({ icon, count, label, active = false, activeColor = 'liked', onClick }) {
  return <motion.button type="button" className={`action-button ${active ? activeColor : ''}`} whileTap={{ scale: 0.82 }} transition={springs} aria-label={label} onClick={onClick}><span className="action-glass"><Icon name={icon} size={23} fill={active && icon === 'heart' ? 'currentColor' : 'none'} /></span><span className="action-count">{count}</span></motion.button>
}

function App() {
  const [reels, setReels] = useState(initialReels)
  const [cloudReels, setCloudReels] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [mode, setMode] = useState('Rot')
  const [islandOpen, setIslandOpen] = useState(false)
  const [brainrot, setBrainrot] = useState(58)
  const [selectedTags, setSelectedTags] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [followed, setFollowed] = useState([])
  const [saved, setSaved] = useState([])
  const [likedIds, setLikedIds] = useState([])
  const [repostedIds, setRepostedIds] = useState([])
  const [engagementCounts, setEngagementCounts] = useState({})
  const [commentReel, setCommentReel] = useState(null)
  const [analyticsReel, setAnalyticsReel] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [toast, setToast] = useState(null)
  const [comments, setComments] = useState(() => Object.fromEntries(initialReels.map((r) => [r.id, r.commentsSeed || []])))
  const [commentDraft, setCommentDraft] = useState('')
  const [creatorDraft, setCreatorDraft] = useState({ caption: '', file: null, preset: null })
  const [uploadPreview, setUploadPreview] = useState('')
  const uploadPreviewRef = useRef('')
  const publishedPreviewURLs = useRef(new Set())
  const feedRef = useRef(null)
  const commentInputRef = useRef(null)
  const toastTimer = useRef(null)

  const allReels = useMemo(() => {
    const cloudIds = new Set(cloudReels.map((reel) => reel.id))
    return [...cloudReels, ...reels.filter((reel) => !cloudIds.has(reel.id))]
  }, [reels, cloudReels])

  const visibleReels = useMemo(() => {
    let result = [...allReels]
    if (selectedTags.length) result = result.filter((r) => selectedTags.some((tag) => r.tags.includes(tag)))
    if (mode === 'Raw') result.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    else result.sort((a, b) => b.score - a.score)
    const densityCount = Math.max(2, Math.ceil(2 + brainrot / 100 * Math.max(0, result.length - 2)))
    return result.slice(0, densityCount)
  }, [allReels, selectedTags, mode, brainrot])

  useEffect(() => {
    const container = feedRef.current
    if (!container) return undefined
    const onScroll = () => {
      const next = Math.round(container.scrollTop / Math.max(container.clientHeight, 1))
      setActiveIndex(next)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (activeIndex >= visibleReels.length && visibleReels.length) {
      setActiveIndex(0)
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [visibleReels.length, activeIndex])

  useEffect(() => {
    const reelId = new URLSearchParams(window.location.search).get('reel')
    if (!reelId) return
    if (mode !== 'Raw') setMode('Raw')
    if (brainrot !== 100) setBrainrot(100)
    if (selectedTags.length) setSelectedTags([])
    const index = visibleReels.findIndex((reel) => reel.id === reelId)
    if (index >= 0) {
      setIslandOpen(true)
      setActiveIndex(index)
      requestAnimationFrame(() => feedRef.current?.scrollTo({ top: index * (feedRef.current?.clientHeight || window.innerHeight), behavior: 'smooth' }))
    }
  }, [visibleReels, mode, brainrot, selectedTags])

  useEffect(() => {
    uploadPreviewRef.current = uploadPreview
  }, [uploadPreview])

  useEffect(() => () => {
    clearTimeout(toastTimer.current)
    const url = uploadPreviewRef.current
    if (url && !publishedPreviewURLs.current.has(url)) URL.revokeObjectURL(url)
  }, [])

  const showToast = useCallback((message, icon = 'spark') => {
    clearTimeout(toastTimer.current)
    setToast({ message, icon, id: Date.now() })
    toastTimer.current = window.setTimeout(() => setToast(null), 2100)
  }, [])

  useEffect(() => {
    if (!auth) return undefined
    return watchAuth((nextUser) => {
      setAuthUser(nextUser)
      if (nextUser) saveUserProfile(nextUser).catch(() => showToast('Could not save your profile yet', 'spark'))
      else {
        setFollowed([])
        setSaved([])
        setLikedIds([])
        setRepostedIds([])
      }
    }, () => showToast('Firebase authentication could not start', 'spark'))
  }, [showToast])

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined
    return subscribeToPublishedReels(setCloudReels, () => showToast('Could not load the live feed', 'spark'))
  }, [showToast])

  useEffect(() => {
    if (!authUser || !isFirebaseConfigured) return undefined
    const onError = () => showToast('Could not sync your account activity', 'spark')
    const stops = [
      subscribeToUserMarkers(authUser.uid, 'following', setFollowed, onError),
      subscribeToUserMarkers(authUser.uid, 'savedReels', setSaved, onError),
      subscribeToUserMarkers(authUser.uid, 'likedReels', setLikedIds, onError),
      subscribeToUserMarkers(authUser.uid, 'repostedReels', setRepostedIds, onError),
    ]
    return () => stops.forEach((stop) => stop())
  }, [authUser?.uid, showToast])

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined
    const stops = visibleReels.map((reel) => subscribeToReelCounts(reel.id, (counts) => {
      setEngagementCounts((current) => ({ ...current, [reel.id]: { ...current[reel.id], ...counts } }))
    }, () => {}))
    return () => stops.forEach((stop) => stop())
  }, [visibleReels])

  useEffect(() => {
    if (!commentReel || !isFirebaseConfigured) return undefined
    return subscribeToComments(commentReel.id, (remoteComments) => {
      setEngagementCounts((current) => ({ ...current, [commentReel.id]: { ...current[commentReel.id], comments: remoteComments.length } }))
      setComments((current) => ({
        ...current,
        [commentReel.id]: [...(commentReel.commentsSeed || []), ...remoteComments],
      }))
    }, () => showToast('Could not load comments', 'comment'))
  }, [commentReel?.id, showToast])

  const switchMode = (next) => {
    setMode(next)
    setIslandOpen(next === 'Raw')
    setActiveIndex(0)
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Alex Morgan'
  const userHandle = authUser?.email ? `@${authUser.email.split('@')[0]}` : '@alexmakes'
  const userAvatar = authUser?.photoURL || defaultAvatar
  const openAuth = (nextMode = 'signup') => {
    setAuthMode(nextMode)
    setAuthError(isFirebaseConfigured ? '' : 'Connect Firebase by filling in the VITE_FIREBASE values before signing in.')
    setAuthOpen(true)
  }
  const requireUser = () => {
    if (!isFirebaseConfigured || authUser) return true
    openAuth('signin')
    showToast('Sign in to sync this action', 'users')
    return false
  }
  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    if (!auth) {
      setAuthError('Firebase is not connected. Add the VITE_FIREBASE values to .env.local first.')
      return
    }
    setAuthBusy(true)
    try {
      if (authMode === 'signup') await createAccount({ email: authEmail.trim(), password: authPassword, displayName: authName.trim() })
      else await signInAccount(authEmail.trim(), authPassword)
      setAuthOpen(false)
      setAuthPassword('')
      showToast(authMode === 'signup' ? 'Your Zap account is ready' : 'Signed in and synced', 'check')
    } catch (error) {
      setAuthError(error.message || 'Could not authenticate. Check your details and try again.')
    } finally {
      setAuthBusy(false)
    }
  }
  const toggleMarker = async ({ collection, id, active, update, data = {} }) => {
    if (!requireUser()) return null
    const enabled = !active
    update((current) => enabled ? (current.includes(id) ? current : [...current, id]) : current.filter((item) => item !== id))
    if (isFirebaseConfigured && authUser) {
      try {
        await setUserMarker({ userId: authUser.uid, markerCollection: collection, markerId: id, enabled, data })
      } catch {
        update((current) => active ? (current.includes(id) ? current : [...current, id]) : current.filter((item) => item !== id))
        showToast('Could not sync that action', 'spark')
        return active
      }
    }
    return enabled
  }
  const toggleTag = (tag) => setSelectedTags((old) => old.includes(tag) ? old.filter((t) => t !== tag) : [...old, tag])
  const changeLike = async (reelId, fromDoubleTap = false) => {
    const reel = allReels.find((item) => item.id === reelId)
    const active = likedIds.includes(reelId) || (!isFirebaseConfigured && !!reel?.liked)
    if (fromDoubleTap && active) return
    if (isFirebaseConfigured) {
      await toggleMarker({ collection: 'likedReels', id: reelId, active, update: setLikedIds })
    } else {
      const enabled = !active
      setLikedIds((current) => enabled ? [...new Set([...current, reelId])] : current.filter((id) => id !== reelId))
      setReels((current) => current.map((item) => item.id === reelId ? { ...item, liked: enabled, likes: item.likes + (enabled ? 1 : -1) } : item))
    }
  }
  const creatorId = (reel) => String(reel.handle || reel.id).replace(/[^a-zA-Z0-9_-]/g, '_')
  const toggleFollow = (reel) => toggleMarker({ collection: 'following', id: creatorId(reel), active: followed.includes(creatorId(reel)), update: setFollowed, data: { creatorHandle: reel.handle } })
  const toggleSaved = async (reel) => {
    const exists = saved.includes(reel.id)
    const result = await toggleMarker({ collection: 'savedReels', id: reel.id, active: exists, update: setSaved })
    if (result !== !exists) return
    showToast(exists ? 'Removed from saved' : 'Saved to your collection', exists ? 'bookmark' : 'check')
  }
  const repost = async (reel) => {
    const active = repostedIds.includes(reel.id) || (!isFirebaseConfigured && !!reel.reposted)
    if (isFirebaseConfigured) {
      const result = await toggleMarker({ collection: 'repostedReels', id: reel.id, active, update: setRepostedIds })
      if (result !== !active) return
    } else {
      const enabled = !active
      setRepostedIds((current) => enabled ? [...new Set([...current, reel.id])] : current.filter((id) => id !== reel.id))
      setReels((current) => current.map((item) => item.id === reel.id ? { ...item, reposted: enabled, reposts: item.reposts + (enabled ? 1 : -1) } : item))
    }
    showToast(active ? 'Repost removed' : 'Reposted to your feed', 'repeat')
  }
  const share = (reel) => {
    navigator.clipboard?.writeText(reelUrl(reel.id)).catch(() => {})
    showToast('Link copied to clipboard', 'share')
  }
  const openComments = (reel) => {
    setCommentReel(reel)
    setCommentDraft('')
  }
  const postComment = async (event) => {
    event.preventDefault()
    const body = commentDraft.trim()
    if (!body || !commentReel) return
    if (isFirebaseConfigured && !requireUser()) return
    if (isFirebaseConfigured && authUser) {
      try {
        await createComment({ reelId: commentReel.id, user: authUser, text: body })
      } catch {
        showToast('Comment could not be posted', 'comment')
        return
      }
    } else {
      setComments((old) => ({ ...old, [commentReel.id]: [...(old[commentReel.id] || []), { user: 'you', text: body, time: 'now', own: true, avatarUrl: userAvatar }] }))
      setReels((old) => old.map((r) => r.id === commentReel.id ? { ...r, comments: r.comments + 1 } : r))
    }
    setCommentDraft('')
    requestAnimationFrame(() => commentInputRef.current?.focus())
  }

  const openCreator = () => {
    if (uploadPreview && !publishedPreviewURLs.current.has(uploadPreview)) URL.revokeObjectURL(uploadPreview)
    setUploadPreview('')
    setCreatorDraft({ caption: '', file: null, preset: null })
    setCreatorOpen(true)
  }
  const chooseFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) { showToast('Choose an MP4 video file', 'upload'); return }
    if (file.size >= 100 * 1024 * 1024) { showToast('MP4 files must be under 100 MB', 'upload'); return }
    if (uploadPreview && !publishedPreviewURLs.current.has(uploadPreview)) URL.revokeObjectURL(uploadPreview)
    const preview = URL.createObjectURL(file)
    setUploadPreview(preview)
    setCreatorDraft((old) => ({ ...old, file, preset: null }))
  }
  const choosePreset = (reel) => {
    if (uploadPreview && !publishedPreviewURLs.current.has(uploadPreview)) URL.revokeObjectURL(uploadPreview)
    setUploadPreview('')
    setCreatorDraft((old) => ({ ...old, file: null, preset: reel }))
  }
  const publishReel = async () => {
    const media = creatorDraft.file ? uploadPreview : creatorDraft.preset?.video
    const poster = creatorDraft.file ? undefined : creatorDraft.preset?.poster
    if (!media) { showToast('Pick a video or a preset to publish', 'upload'); return }
    if (isFirebaseConfigured && !requireUser()) return
    let newReel
    if (isFirebaseConfigured) {
      setPublishing(true)
      setUploadProgress(0)
      try {
        newReel = await publishReelToFirebase({
          file: creatorDraft.file,
          preset: creatorDraft.preset,
          caption: creatorDraft.caption,
          user: authUser,
          onProgress: setUploadProgress,
        })
      } catch (error) {
        showToast(error.message || 'Reel upload failed', 'upload')
        setPublishing(false)
        return
      }
      setPublishing(false)
      if (uploadPreview) URL.revokeObjectURL(uploadPreview)
      setUploadPreview('')
    } else {
      if (creatorDraft.file) publishedPreviewURLs.current.add(media)
      newReel = {
        id: `r${Date.now()}`, handle: 'you', name: userName, avatar: userAvatar,
        caption: creatorDraft.caption.trim() || 'A little moment, straight from me. #Raw', tags: ['Raw'], likes: 0, comments: 0, reposts: 0, views: 1, score: 100, postedAt: new Date().toISOString(),
        video: media, poster, audio: 'original audio · you', track: 'YOUR NEW REEL', description: creatorDraft.caption.trim() || 'New post from your camera roll.', commentsSeed: [],
      }
    }
    setReels((old) => [newReel, ...old])
    setComments((old) => ({ ...old, [newReel.id]: [] }))
    setMode('Raw')
    setIslandOpen(true)
    setSelectedTags([])
    setCreatorOpen(false)
    setActiveIndex(0)
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
    showToast('Your reel is live in Raw', 'check')
  }

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveIndex(0)
  }

  const toggleMute = () => { showToast(muted ? 'Sound on' : 'Sound off', muted ? 'volume' : 'mute'); setMuted((old) => !old) }
  const openProfile = () => setProfileOpen(true)

  return (
    <main className="zap-app">
      <div className="ambient-orb orb-one" /><div className="ambient-orb orb-two" />

      <aside className="left-rail">
        <button type="button" className="brand-lockup" onClick={scrollToTop}><img src="/zap-logo.png" alt="Zap" /><span>zap</span><small>YOUR SIGNAL, AMPLIFIED</small></button>
        <nav className="side-nav" aria-label="Main navigation">
          <button className="nav-item active" type="button" onClick={scrollToTop}><Icon name="home" size={20} /><span>For you</span><i /></button>
          <button className="nav-item" type="button" onClick={() => showToast('Following feed is coming into focus', 'users')}><Icon name="users" size={20} /><span>Following</span></button>
          <button className="nav-item" type="button" onClick={() => showToast('Explore is tuned to your interests', 'compass')}><Icon name="compass" size={20} /><span>Explore</span></button>
          <button className="nav-item" type="button" onClick={() => setProfileOpen(true)}><Icon name="bookmark" size={20} /><span>Saved</span></button>
        </nav>
        <div className="rail-divider" />
        <div className="rail-label">YOUR SPACE</div>
        <button type="button" className="profile-mini" onClick={openProfile}><Avatar src={userAvatar} size={38} /><span><b>{userName}</b><small>{userHandle}</small></span><Icon name="spark" size={16} /></button>
        <div className="rail-foot"><span className="status-dot" /> The signal is yours <span>·</span> v2.0</div>
      </aside>

      <aside className="right-rail">
        <div className="right-rail-top"><span className="live-dot" /> LIVE NOW <span className="right-rail-count">12.8k</span></div>
        <div className="rail-feature">
          <div className="feature-eyebrow"><Icon name="spark" size={14} /> SIGNAL CHECK</div>
          <h2>Good stuff.<br /><span>No filler.</span></h2>
          <p>Your feed, your frequency. Raw mode keeps everything in the order it happened.</p>
          <button type="button" className="feature-link" onClick={() => switchMode('Raw')}>Try Raw <span>↗</span></button>
        </div>
        <div className="trend-heading"><span>RISING SIGNALS</span><Icon name="chart" size={15} /></div>
        {[['# buildinpublic', '2.4M zaps'], ['# analoglife', '841K zaps'], ['# tinywins', '623K zaps']].map(([tag, count], i) => <button className="trend-row" type="button" key={tag} onClick={() => { toggleTag(topics[i === 0 ? 0 : i === 1 ? 5 : 2]); showToast(`Filtering ${tag}`, 'search') }}><span className="trend-number">0{i + 1}</span><span><b>{tag}</b><small>{count}</small></span><span className="trend-arrow">↗</span></button>)}
        <div className="right-rail-foot"><span>Made for real people</span><span>© Zap 2026</span></div>
      </aside>

      <section className="feed-stage" aria-label="Video feed">
        <div className="feed-scroll" ref={feedRef}>
          {visibleReels.map((reel, index) => {
            const counts = engagementCounts[reel.id] || {}
            return <ReelCard key={reel.id} reel={reel} index={index} active={index === activeIndex} muted={muted}
              onToggleMute={toggleMute} isLiked={likedIds.includes(reel.id) || (!isFirebaseConfigured && !!reel.liked)}
              isReposted={repostedIds.includes(reel.id) || (!isFirebaseConfigured && !!reel.reposted)} isSaved={saved.includes(reel.id)}
              following={followed.includes(creatorId(reel))} likesCount={reel.likes + (counts.likes || 0)} commentsCount={reel.comments + (counts.comments || 0)} repostsCount={reel.reposts + (counts.reposts || 0)}
              onFollow={() => toggleFollow(reel)} onLike={(doubleTap) => changeLike(reel.id, doubleTap)} onSave={() => toggleSaved(reel)} onComment={openComments}
              onAnalytics={() => setAnalyticsReel({ ...reel, likes: reel.likes + (counts.likes || 0), comments: reel.comments + (counts.comments || 0), reposts: reel.reposts + (counts.reposts || 0) })}
              onShare={share} onRepost={() => repost(reel)} showToast={showToast} />
          })}
          {!visibleReels.length && <div className="empty-feed"><Icon name="search" size={30} /><h2>No signal in this channel.</h2><p>Try another topic tag or clear your filters.</p><button className="feature-link" type="button" onClick={() => setSelectedTags([])}>Clear filters ↗</button></div>}
        </div>
        <div className="feed-pagination"><span>{String(Math.min(activeIndex + 1, visibleReels.length)).padStart(2, '0')}</span><i />{String(visibleReels.length).padStart(2, '0')}</div>
      </section>

      <motion.div className="dynamic-island" layout transition={springs} animate={{ width: islandOpen ? 518 : 386, height: islandOpen ? 232 : 66, borderRadius: islandOpen ? 34 : 999 }}>
        <div className="island-topline">
          <div className="island-brand"><span className="island-logo"><img src="/zap-logo.png" alt="" /></span><span className="island-title">YOUR FEED</span></div>
          <div className="feed-switch" role="tablist" aria-label="Feed mode">
            <motion.span className="switch-highlight" layoutId="switch-highlight" transition={{ type: 'spring', stiffness: 480, damping: 36 }} style={{ left: mode === 'Rot' ? 3 : 'calc(50% + 1px)' }} />
            {['Rot', 'Raw'].map((item) => <button type="button" role="tab" aria-selected={mode === item} key={item} className={`switch-option ${mode === item ? 'selected' : ''}`} onClick={() => item === 'Raw' && mode === 'Raw' ? setIslandOpen((v) => !v) : switchMode(item)}>{item === 'Rot' ? 'Rot' : 'Raw'}{item === 'Raw' && <span className="raw-live-dot" />}</button>)}
          </div>
          <button className="island-toggle" type="button" aria-label={islandOpen ? 'Collapse feed settings' : 'Expand feed settings'} onClick={() => setIslandOpen((v) => !v)}><motion.span animate={{ rotate: islandOpen ? 180 : 0 }} transition={springs}>⌄</motion.span></button>
        </div>
        <AnimatePresence initial={false}>
          {islandOpen && <motion.div className="island-expanded" initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
            <div className="settings-rule" />
            <div className="brainrot-row"><div><span className="settings-label">BRAINROT LEVEL</span><span className="settings-sub">{brainrot < 30 ? 'PURE SIGNAL' : brainrot > 78 ? 'FULL CHAOS' : 'YOUR FREQUENCY'}</span></div><span className="brainrot-value">{brainrot}<small>%</small></span></div>
            <div className="range-wrap"><span className="range-end">SIGNAL</span><input aria-label="Brainrot level" type="range" min="0" max="100" value={brainrot} style={{ '--range': `${brainrot}%` }} onChange={(e) => setBrainrot(Number(e.target.value))} /><span className="range-end">CHAOS</span></div>
            <div className="tag-row"><span className="settings-label">TOPICS</span><div className="tag-list">{topics.map((tag) => <motion.button type="button" key={tag} whileTap={{ scale: 0.91 }} transition={springs} className={`topic-chip ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => toggleTag(tag)}>#{tag}</motion.button>)}</div></div>
          </motion.div>}
        </AnimatePresence>
      </motion.div>

      <motion.div className="floating-dock" initial={{ y: 35, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springs, delay: 0.18 }}>
        <DockButton label="Open your profile" onClick={openProfile}><Avatar src={userAvatar} size={34} /></DockButton>
        <span className="dock-separator" />
        <DockButton label="Back to top" className="zap-dock-button" onClick={scrollToTop}><img src="/zap-logo.png" alt="Zap" /></DockButton>
        <span className="dock-separator" />
        <DockButton label="Create a reel" className="create-dock-button" onClick={openCreator}><Icon name="plus" size={23} /></DockButton>
        <div className="dock-reflection" />
      </motion.div>

      <AnimatePresence>
        {toast && <motion.div key={toast.id} className="toast-pill" initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={springs}><Icon name={toast.icon} size={16} /><span>{toast.message}</span></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {commentReel && <Sheet placement="right" onClose={() => setCommentReel(null)} className="comments-sheet">
          <div className="sheet-heading"><span className="eyebrow">THE CONVERSATION</span><h2>Comments <span>{fmt(commentReel.comments + (engagementCounts[commentReel.id]?.comments || 0))}</span></h2><p>Good energy only. Keep it real.</p></div>
          <div className="comments-list">{(comments[commentReel.id] || []).map((item, i) => <motion.div className="comment-row" key={`${item.id || item.user}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Avatar src={item.avatarUrl || (item.userId === authUser?.uid ? userAvatar : commentReel.avatar)} size={35} /><div className="comment-content"><div><b>{item.user}</b><time>{item.time}</time></div><p>{item.text}</p><button type="button" onClick={() => setCommentDraft(`@${item.user} `)}>Reply</button></div><button className="comment-like" type="button" aria-label="Like comment"><Icon name="heart" size={15} /></button></motion.div>)}
            {!(comments[commentReel.id] || []).length && <div className="no-comments"><span>✳</span><h3>Start the conversation.</h3><p>Your take could be the one that makes someone's day.</p></div>}
          </div>
          <form className="comment-composer" onSubmit={postComment}><Avatar src={userAvatar} size={34} /><input ref={commentInputRef} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder={isFirebaseConfigured && !authUser ? 'Sign in to join the conversation…' : 'Add a thoughtful comment…'} /><motion.button type="submit" aria-label="Post comment" whileTap={{ scale: 0.86 }} disabled={!commentDraft.trim()}><Icon name="send" size={18} /></motion.button></form>
        </Sheet>}
      </AnimatePresence>

      <AnimatePresence>
        {analyticsReel && <Sheet onClose={() => setAnalyticsReel(null)} className="analytics-sheet">
          <div className="analytics-top"><div><span className="eyebrow">THE REEL IN NUMBERS</span><h2>Signal report</h2></div><div className="analytics-date"><Icon name="clock" size={14} /> {new Date(analyticsReel.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
          <p className="analytics-description">{analyticsReel.description}</p>
          <div className="analytics-grid"><div className="analytics-stat"><Icon name="heart" size={17} /><b>{fmt(analyticsReel.likes)}</b><span>Likes</span></div><div className="analytics-stat"><Icon name="repeat" size={17} /><b>{fmt(analyticsReel.reposts)}</b><span>Reposts</span></div><div className="analytics-stat"><Icon name="chart" size={17} /><b>{fmt(analyticsReel.views)}</b><span>Views</span></div></div>
          <div className="analytics-footer"><Avatar src={analyticsReel.avatar} size={34} /><span><b>@{analyticsReel.handle}</b><small>{analyticsReel.track}</small></span><div className="analytics-tag">#{analyticsReel.tags?.[0]}</div></div>
        </Sheet>}
      </AnimatePresence>

      <AnimatePresence>
        {creatorOpen && <Sheet onClose={() => setCreatorOpen(false)} className="creator-sheet">
          <div className="creator-modal-heading"><span className="eyebrow">MAKE SOMETHING REAL</span><h2>New reel<span className="heading-dot">.</span></h2><p>Drop a moment into the feed.</p></div>
          <label className={`upload-drop ${creatorDraft.file || creatorDraft.preset ? 'has-media' : ''}`}>
            {creatorDraft.file || creatorDraft.preset ? <><div className="upload-preview"><video src={uploadPreview || creatorDraft.preset?.video} poster={creatorDraft.preset?.poster} muted playsInline autoPlay loop /><div className="preview-play"><Icon name="play" size={20} /></div></div><span><b>{creatorDraft.file?.name || 'Preset clip selected'}</b><small>Ready to add to Raw</small></span><Icon name="check" size={19} /></> : <><span className="upload-icon"><Icon name="upload" size={21} /></span><span><b>Drop your video here</b><small>MP4 · up to 100 MB</small></span><span className="upload-choose">Choose file</span></>}
            <input type="file" accept="video/mp4" onChange={chooseFile} />
          </label>
          <div className="preset-heading"><span>OR START WITH A PRESET</span><small>QUICK START</small></div>
          <div className="preset-row">{initialReels.slice(0, 3).map((item) => <button type="button" key={item.id} className={`preset-card ${creatorDraft.preset?.id === item.id ? 'selected' : ''}`} onClick={() => choosePreset(item)}><img src={item.poster} alt="" /><span>{item.tags[0]}</span><i>{creatorDraft.preset?.id === item.id ? <Icon name="check" size={13} /> : '↗'}</i></button>)}</div>
          <label className="caption-input-wrap"><span className="settings-label">YOUR CAPTION</span><textarea value={creatorDraft.caption} onChange={(e) => setCreatorDraft((old) => ({ ...old, caption: e.target.value }))} placeholder="What’s the story behind this one?" maxLength={220} /><span className="character-count">{creatorDraft.caption.length}/220</span></label>
          <div className="creator-modal-footer"><span><span className="raw-live-dot" /> Publishing to <b>Raw</b></span><motion.button type="button" whileTap={{ scale: 0.96 }} transition={springs} className="publish-button" disabled={publishing} onClick={publishReel}>{publishing ? `Uploading ${uploadProgress}%` : 'Publish reel'} <Icon name="arrow" size={17} /></motion.button></div>
        </Sheet>}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && <motion.div className="profile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="profile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 32 }}>
            <button type="button" className="profile-close glass-button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><Icon name="x" size={19} /></button>
            <div className="profile-cover"><img src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1400&h=600&fit=crop" alt="" /><div /></div>
            <div className="profile-details"><Avatar src={userAvatar} size={96} className="profile-avatar" /><button type="button" className="edit-profile" onClick={async () => { if (authUser) { await signOutAccount(); showToast('Signed out', 'check') } else openAuth('signup') }}>{authUser ? 'Sign out' : 'Create account'}</button><span className="eyebrow">CREATOR / DAYDREAMER</span><h1>{userName}</h1><span className="profile-handle">{userHandle} <i>✳</i> {authUser?.email || 'since 2024'}</span><p>{authUser ? 'Your Zap profile is ready. Follow creators, save reels, and join conversations.' : 'Making small things with a little bit of electricity. Usually building, sometimes wandering.'}</p>
              <div className="profile-stats"><div><b>128</b><span>reels</span></div><div><b>24.8K</b><span>followers</span></div><div><b>08.2K</b><span>following</span></div></div>
              <div className="profile-content"><div className="profile-tab active">Your signal <span>128</span></div><div className="profile-tab">Saved <span>{saved.length}</span></div></div>
              <div className="profile-reels">{allReels.slice(0, 3).map((item) => <div className="profile-reel-tile" key={item.id}><img src={item.poster || defaultAvatar} alt="" /><span><Icon name="play" size={12} /> {fmt(item.views)}</span></div>)}</div>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {authOpen && <Sheet onClose={() => setAuthOpen(false)} className="auth-sheet" backdropClassName="auth-backdrop">
          <div className="auth-heading"><span className="eyebrow">YOUR SIGNAL, YOURS</span><h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}<span className="heading-dot">.</span></h2><p>One account for your follows, saves, and conversations.</p></div>
          {!isFirebaseConfigured && <div className="auth-config-note">Firebase is not connected yet. Add your project values in <code>.env.local</code> to enable accounts and cloud sync.</div>}
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'signup' && <label><span>DISPLAY NAME</span><input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
            <label><span>EMAIL</span><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label><span>PASSWORD</span><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required /></label>
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            <motion.button type="submit" className="publish-button auth-submit" disabled={authBusy || !isFirebaseConfigured} whileTap={{ scale: 0.97 }}>{authBusy ? 'Connecting…' : authMode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="arrow" size={17} /></motion.button>
          </form>
          <div className="auth-switch">{authMode === 'signup' ? 'Already have an account?' : 'New to Zap?'} <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthError('') }}>{authMode === 'signup' ? 'Sign in' : 'Create account'}</button></div>
          <p className="auth-footnote">Email and password are managed securely by Firebase Authentication.</p>
        </Sheet>}
      </AnimatePresence>
    </main>
  )
}

export default App
