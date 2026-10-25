import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import { auth, db, storage } from './firebase.js'

export function watchAuth(callback, onError) {
  return auth ? onAuthStateChanged(auth, callback, onError) : () => {}
}

export async function createAccount({ email, password, displayName }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  return credential.user
}

export async function signInAccount(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signOutAccount() {
  if (auth) await signOut(auth)
}

export async function saveUserProfile(user) {
  if (!db || !user) return
  const profileRef = doc(db, 'users', user.uid)
  const existing = await getDoc(profileRef)
  const profile = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Zap user',
    email: user.email || '',
    photoURL: user.photoURL || '',
    updatedAt: serverTimestamp(),
  }
  if (!existing.exists()) profile.createdAt = serverTimestamp()
  await setDoc(profileRef, profile, { merge: true })
}

export function subscribeToPublishedReels(callback, onError) {
  if (!db) return () => {}
  const feedQuery = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(80))
  return onSnapshot(feedQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const reel = item.data()
      const createdAt = reel.createdAt?.toDate?.()
      return {
        ...reel,
        id: item.id,
        tags: Array.isArray(reel.tags) ? reel.tags : ['Raw'],
        handle: reel.handle || 'zap.creator',
        name: reel.displayName || 'Zap creator',
        avatar: reel.avatarUrl || '',
        video: reel.videoUrl,
        poster: reel.poster || '',
        likes: reel.likes || 0,
        comments: reel.comments || 0,
        reposts: reel.reposts || 0,
        views: reel.views || 0,
        score: reel.score || 50,
        postedAt: createdAt?.toISOString() || reel.postedAt || new Date().toISOString(),
        commentsSeed: [],
      }
    }))
  }, onError)
}

export function subscribeToComments(reelId, callback, onError) {
  if (!db) return () => {}
  const commentsQuery = query(collection(db, 'reels', reelId, 'comments'), orderBy('createdAt', 'asc'), limit(100))
  return onSnapshot(commentsQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const comment = item.data()
      return {
        id: item.id,
        user: comment.displayName || 'Zap user',
        userId: comment.uid,
        avatarUrl: comment.avatarUrl || '',
        text: comment.text || '',
        time: comment.createdAt?.toDate ? formatAge(comment.createdAt.toDate()) : 'now',
      }
    }))
  }, onError)
}

function formatAge(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export async function createComment({ reelId, user, text }) {
  if (!db || !user) throw new Error('Sign in is required to comment.')
  return addDoc(collection(db, 'reels', reelId, 'comments'), {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Zap user',
    avatarUrl: user.photoURL || '',
    text: text.trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  })
}

const allowedMarkers = new Set(['savedReels', 'likedReels', 'repostedReels', 'following'])

export function subscribeToUserMarkers(userId, markerCollection, callback, onError) {
  if (!db || !allowedMarkers.has(markerCollection)) return () => {}
  return onSnapshot(collection(db, 'users', userId, markerCollection), (snapshot) => {
    callback(snapshot.docs.map((item) => item.id))
  }, onError)
}

export async function setUserMarker({ userId, markerCollection, markerId, enabled, data = {} }) {
  if (!db || !userId || !allowedMarkers.has(markerCollection)) throw new Error('Firebase is not ready.')
  const markerRef = doc(db, 'users', userId, markerCollection, markerId)
  const batch = writeBatch(db)
  if (enabled) {
    batch.set(markerRef, { id: markerId, ...data, createdAt: serverTimestamp() }, { merge: true })
  } else {
    batch.delete(markerRef)
  }

  if (markerCollection === 'likedReels' || markerCollection === 'repostedReels') {
    const reelCollection = markerCollection === 'likedReels' ? 'likes' : 'reposts'
    const engagementRef = doc(db, 'reels', markerId, reelCollection, userId)
    if (enabled) batch.set(engagementRef, { uid: userId, createdAt: serverTimestamp() }, { merge: true })
    else batch.delete(engagementRef)
  }
  await batch.commit()
}

export function subscribeToReelCounts(reelId, callback, onError) {
  if (!db) return () => {}
  let likes = 0
  let reposts = 0
  const stopLikes = onSnapshot(collection(db, 'reels', reelId, 'likes'), (snapshot) => {
    likes = snapshot.size
    callback({ likes, reposts })
  }, onError)
  const stopReposts = onSnapshot(collection(db, 'reels', reelId, 'reposts'), (snapshot) => {
    reposts = snapshot.size
    callback({ likes, reposts })
  }, onError)
  return () => { stopLikes(); stopReposts() }
}

export async function publishReel({ file, preset, caption, user, onProgress }) {
  if (!db || !storage || !user) throw new Error('Firebase sign in and Storage are required to publish.')
  const reelRef = doc(collection(db, 'reels'))
  let videoUrl = preset?.video || ''
  if (file) {
    const fileRef = ref(storage, `reels/${user.uid}/${reelRef.id}.mp4`)
    const uploadTask = uploadBytesResumable(fileRef, file, { contentType: 'video/mp4' })
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', (snapshot) => {
        onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100))
      }, reject, resolve)
    })
    videoUrl = await getDownloadURL(uploadTask.snapshot.ref)
  }
  if (!videoUrl) throw new Error('Choose a video or preset before publishing.')

  const createdAt = serverTimestamp()
  const record = {
    id: reelRef.id,
    ownerId: user.uid,
    handle: user.displayName?.trim().toLowerCase().replace(/\s+/g, '.') || user.email?.split('@')[0] || 'zap.creator',
    displayName: user.displayName || user.email?.split('@')[0] || 'Zap creator',
    avatarUrl: user.photoURL || '',
    caption: caption.trim() || 'A little moment, straight from me. #Raw',
    tags: ['Raw'],
    videoUrl,
    ...(preset?.poster ? { poster: preset.poster } : {}),
    audio: preset?.audio || 'original audio · you',
    track: preset?.track || 'YOUR NEW REEL',
    description: caption.trim() || 'New post from your camera roll.',
    likes: 0,
    comments: 0,
    reposts: 0,
    views: 1,
    score: 100,
    createdAt,
    postedAt: new Date().toISOString(),
  }
  await setDoc(reelRef, record)
  return {
    ...record,
    video: videoUrl,
    name: record.displayName,
    avatar: record.avatarUrl,
    commentsSeed: [],
  }
}
