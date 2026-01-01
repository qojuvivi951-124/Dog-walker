import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Dog, 
  X, 
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  MapPinned,
  Bell,
  BellOff,
  Timer as TimerIcon,
  LocateFixed,
  CalendarDays,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

// --- Конфигурация Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyAqFUGdI52_-QgzvtxZ1Ivd2CEVM3dUjCE",
  authDomain: "dogwalker-production-a6748.firebaseapp.com",
  projectId: "dogwalker-production-a6748",
  storageBucket: "dogwalker-production-a6748.firebasestorage.app",
  messagingSenderId: "1075541843836",
  appId: "1:1075541843836:web:ede249883d17b6b78e8ef9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "dogwalker-production-a6748";

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Buddy', 'Max', 'Luna', 'Shadow', 'Milo', 'Oscar'];
const DEFAULT_CENTER = [55.751574, 37.573856];
const YANDEX_MAPS_API_KEY = "c1a55bd9-3bb5-45c3-8cf9-cd650a0191f1";

const theme = {
  primary: '#f97316',
  primaryLight: '#fff7ed',
  success: '#22c55e',
  danger: '#ef4444',
  gray: '#9ca3af',
  text: '#111827',
  bg: '#f9fafb',
  card: '#ffffff',
  shadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
};

const formatTimerLabel = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- Типы ---
interface DogProfile { name: string; breed: string; }
interface UserProfile { name: string; avatarSeed: string; schedule: string[]; district: string; }
interface WalkStatus { 
  id: string; 
  userName: string; 
  avatarSeed: string; 
  dogName: string; 
  dogBreed: string; 
  lat: number; 
  lng: number; 
  path?: number[][]; 
  schedule?: string[]; 
  district?: string; 
  walkStartTime?: number; 
}

// --- Личный кабинет ---
const ProfileOverlay = ({ 
  isOpen, onClose, userProfile, setUserProfile, dogProfile, setDogProfile, 
  onSave, onLogout, friends, onRemoveFriend, userId 
}: any) => {
  const [timeInput, setTimeInput] = useState('');

  if (!isOpen) return null;

  const handleAddTime = async () => {
    const time = timeInput.trim();
    if (!time) return;
    const newSchedule = [...(userProfile.schedule || []), time];
    
    // Обновляем локально
    setUserProfile((prev: UserProfile) => ({ ...prev, schedule: newSchedule }));
    setTimeInput('');

    // Сохраняем сразу в базу для надежности
    if (userId) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), {
          'userProfile.schedule': newSchedule
        });
      } catch (e) {
        console.error("Ошибка авто-сохранения графика", e);
      }
    }
  };

  const handleRemoveTime = async (index: number) => {
    const newSchedule = userProfile.schedule.filter((_:any, i:number) => i !== index);
    setUserProfile((prev: UserProfile) => ({ ...prev, schedule: newSchedule }));
    
    if (userId) {
      await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), {
        'userProfile.schedule': newSchedule
      });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'white', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900 }}>Профиль</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '14px' }}><X size={24} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' }}>
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваши друзья</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '16px' }}>
            {friends.length > 0 ? friends.map((f: any) => (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatarSeed}`} style={{ width: '36px', borderRadius: '10px' }} alt="" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 900 }}>{f.dogName}</div>
                      <div style={{ fontSize: '11px', color: theme.gray }}>{f.userName}</div>
                    </div>
                  </div>
                  <button onClick={() => onRemoveFriend(f.id)} style={{ background: 'none', border: 'none', color: theme.danger }}><Trash2 size={16} /></button>
                </div>
                <div style={{ marginTop: '8px', borderTop: '1px solid #f3f4f6', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: theme.gray }}>
                    <Clock size={12} color={theme.primary} />
                    График: <span style={{ color: theme.text, fontWeight: 600 }}>{f.schedule?.join(', ') || 'не указан'}</span>
                  </div>
                  <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: theme.gray }}>
                    <CalendarDays size={12} color={theme.primary} />
                    Активность: <span style={{ color: theme.text, fontWeight: 600 }}>{f.lastWalkDate || 'недавно'}</span>
                  </div>
                </div>
              </div>
            )) : <div style={{ fontSize: '12px', color: theme.gray, textAlign: 'center', padding: '10px' }}>Пока пусто</div>}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase' }}>Информация</label>
          <input placeholder="Ваше имя" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6' }} value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} />
          <div style={{ position: 'relative' }}>
            <MapPinned size={18} color={theme.primary} style={{ position: 'absolute', left: '14px', top: '15px' }} />
            <input placeholder="Район прогулок" style={{ padding: '14px 14px 14px 44px', borderRadius: '12px', border: '2px solid #f3f4f6', width: '100%' }} value={userProfile.district} onChange={e => setUserProfile({...userProfile, district: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="Имя собаки" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6' }} value={dogProfile.name} onChange={e => setDogProfile({...dogProfile, name: e.target.value})} />
            <input placeholder="Порода" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6' }} value={dogProfile.breed} onChange={e => setDogProfile({...dogProfile, breed: e.target.value})} />
          </div>
        </section>

        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваш график прогулок</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {(userProfile.schedule || []).map((time: string, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: theme.primaryLight, borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{time}</span>
                <Trash2 size={16} color={theme.danger} onClick={() => handleRemoveTime(i)} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Напр: 08:30" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #f3f4f6' }} value={timeInput} onChange={e => setTimeInput(e.target.value)} />
            <button onClick={handleAddTime} style={{ background: theme.primary, color: 'white', border: 'none', borderRadius: '10px', width: '48px' }}><Plus size={20} /></button>
          </div>
        </section>

        <button onClick={onLogout} style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', background: '#fff1f1', color: theme.danger, fontWeight: 900, border: 'none' }}><LogOut size={18} style={{ marginRight: '8px' }} /> Выйти</button>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px', backgroundColor: 'white', borderTop: '1px solid #eee' }}>
        <button onClick={onSave} disabled={!userProfile.name || !dogProfile.name} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: theme.primary, color: 'white', fontWeight: 900, fontSize: '18px', opacity: (!userProfile.name || !dogProfile.name) ? 0.4 : 1 }}>Сохранить изменения</button>
      </div>
    </div>
  );
};

// --- Основное приложение ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'onboarding' | 'map'>('splash');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', avatarSeed: AVATAR_SEEDS[0], schedule: [], district: '' });
  const [dogProfile, setDogProfile] = useState<DogProfile>({ name: '', breed: '' });
  const [friends, setFriends] = useState<any[]>([]);
  const [activeWalks, setActiveWalks] = useState<WalkStatus[]>([]);
  const [myStatus, setMyStatus] = useState<'idle' | 'walking'>('idle');
  const [walkStartTime, setWalkStartTime] = useState<number | null>(null);
  const [timerText, setTimerText] = useState('00:00:00');
  const [myPosition, setMyPosition] = useState<number[]>(DEFAULT_CENTER);
  const [myPath, setMyPath] = useState<number[][]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [inAppToast, setInAppToast] = useState<{message: string, avatar: string} | null>(null);
  const [selectedWalker, setSelectedWalker] = useState<WalkStatus | null>(null);

  const mainMapRef = useRef<HTMLDivElement>(null);
  const yMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const polylines = useRef<Map<string, any>>(new Map());
  const prevActiveIds = useRef<Set<string>>(new Set());

  // 1. Инициализация
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${YANDEX_MAPS_API_KEY}`;
    script.onload = () => setIsMapLoaded(true);
    document.body.appendChild(script);

    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'data'));
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile(d.userProfile);
          setDogProfile(d.dogProfile);
          setCurrentScreen('map');
        } else {
          setCurrentScreen('onboarding');
        }
      }
    });

    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // 2. Слушатель Друзей
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'friends'), (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // 3. УВЕДОМЛЕНИЯ (Улучшенная логика)
  useEffect(() => {
    if (!user || friends.length === 0) return;
    
    const friendIds = new Set(friends.map(f => f.id));
    const currentActiveIds = new Set(activeWalks.map(w => w.id));

    activeWalks.forEach(walker => {
      // Условие: это друг И его не было в списке в прошлый раз
      if (friendIds.has(walker.id) && !prevActiveIds.current.has(walker.id)) {
        const msg = `${walker.userName} и ${walker.dogName} только что вышли гулять!`;
        
        // Внутреннее уведомление
        setInAppToast({ message: msg, avatar: walker.avatarSeed });
        setTimeout(() => setInAppToast(null), 7000);

        // Системное уведомление
        if (notificationsEnabled && document.hidden) {
          try {
            new Notification("DogWalker", { body: msg, icon: `https://api.dicebear.com/7.x/avataaars/svg?seed=${walker.avatarSeed}` });
          } catch (e) { console.warn("Системное уведомление заблокировано", e); }
        }
      }
    });

    // Сохраняем текущее состояние для следующего сравнения
    prevActiveIds.current = currentActiveIds;
  }, [activeWalks, friends, notificationsEnabled, user]);

  // 4. Таймер
  useEffect(() => {
    let interval: any;
    if (myStatus === 'walking' && walkStartTime) {
      interval = setInterval(() => {
        setTimerText(formatTimerLabel(Math.floor((Date.now() - walkStartTime) / 1000)));
      }, 1000);
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(interval);
  }, [myStatus, walkStartTime]);

  // 5. GPS и Карта
  useEffect(() => {
    if (currentScreen === 'map' && isMapLoaded && mainMapRef.current && !yMap.current) {
      const win = window as any;
      win.ymaps.ready(() => {
        yMap.current = new win.ymaps.Map(mainMapRef.current, { center: myPosition, zoom: 15, controls: ['zoomControl'] }, { suppressMapOpenBlock: true });
      });
    }
  }, [currentScreen, isMapLoaded, myPosition]);

  useEffect(() => {
    let watchId: number;
    if (myStatus === 'walking') {
      watchId = navigator.geolocation.watchPosition((p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setMyPosition(pos);
        setMyPath(prev => [...prev, pos].slice(-50));
        
        if (user) {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid), {
            id: user.uid, userName: userProfile.name, avatarSeed: userProfile.avatarSeed,
            dogName: dogProfile.name, dogBreed: dogProfile.breed, lat: pos[0], lng: pos[1],
            path: [...myPath, pos].slice(-50),
            schedule: userProfile.schedule, district: userProfile.district,
            walkStartTime, timestamp: serverTimestamp()
          }).catch(console.error);
        }
      }, () => {}, { enableHighAccuracy: true });
    } else if (user) {
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid));
      setMyPath([]);
    }
    return () => { if(watchId) navigator.geolocation.clearWatch(watchId); };
  }, [myStatus, user, userProfile, dogProfile, walkStartTime, myPath]);

  // 6. Синхронизация активных прогулок
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'active_walks'), (snap) => {
      setActiveWalks(snap.docs.map(d => d.data() as WalkStatus).filter(x => x.id !== user.uid));
    });
  }, [user]);

  // 7. Отрисовка маркеров и треков
  useEffect(() => {
    if (!yMap.current) return;
    const win = window as any;

    activeWalks.forEach(w => {
      const scheduleStr = (w.schedule || []).join(', ') || 'не указан';
      const hint = `<b>${w.dogName}</b> (${w.dogBreed})<br/>🕒 ${scheduleStr}`;

      if (markers.current.has(w.id)) {
        markers.current.get(w.id).geometry.setCoordinates([w.lat, w.lng]);
        markers.current.get(w.id).properties.set('hintContent', hint);
      } else {
        const p = new win.ymaps.Placemark([w.lat, w.lng], { hintContent: hint }, {
          iconLayout: 'default#image', iconImageHref: `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.avatarSeed}`,
          iconImageSize: [40, 40], iconImageOffset: [-20, -20]
        });
        p.events.add('click', () => setSelectedWalker(w));
        yMap.current.geoObjects.add(p);
        markers.current.set(w.id, p);
      }

      if (w.path && w.path.length > 1) {
        if (polylines.current.has(w.id)) {
          polylines.current.get(w.id).geometry.setCoordinates(w.path);
        } else {
          const poly = new win.ymaps.Polyline(w.path, {}, { strokeColor: theme.primary, strokeWidth: 4, strokeOpacity: 0.5, strokeStyle: 'shortdash' });
          yMap.current.geoObjects.add(poly);
          polylines.current.set(w.id, poly);
        }
      }
    });

    markers.current.forEach((m, id) => {
      if (id !== 'me' && !activeWalks.find(x => x.id === id)) {
        yMap.current.geoObjects.remove(m); markers.current.delete(id);
        if (polylines.current.has(id)) { yMap.current.geoObjects.remove(polylines.current.get(id)); polylines.current.delete(id); }
      }
    });

    if (myStatus === 'walking') {
      if (!markers.current.has('me')) {
        const m = new win.ymaps.Placemark(myPosition, { iconCaption: 'Вы' }, { preset: 'islands#orangeDotIconWithCaption', iconColor: theme.primary });
        yMap.current.geoObjects.add(m); markers.current.set('me', m);
      } else { markers.current.get('me').geometry.setCoordinates(myPosition); }
      if (myPath.length > 1) {
        if (polylines.current.has('me')) { polylines.current.get('me').geometry.setCoordinates(myPath); }
        else {
          const myPoly = new win.ymaps.Polyline(myPath, {}, { strokeColor: '#3b82f6', strokeWidth: 4, strokeOpacity: 0.4 });
          yMap.current.geoObjects.add(myPoly); polylines.current.set('me', myPoly);
        }
      }
    }
  }, [activeWalks, myPosition, myStatus, myPath]);

  // --- Хендлеры ---
  const toggleWalk = () => {
    if (myStatus === 'idle') { 
      const start = Date.now();
      setWalkStartTime(start); 
      setMyStatus('walking'); 
      setMyPath([myPosition]);
      if (yMap.current) yMap.current.setCenter(myPosition, 15, { duration: 1000 });
    } else { 
      setMyStatus('idle'); 
      setWalkStartTime(null); 
      setMyPath([]); 
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { userProfile, dogProfile });
      setCurrentScreen('map');
      setIsProfileOpen(false);
    } catch (e) { console.error("Ошибка сохранения", e); }
  };

  const addFriend = async (walker: WalkStatus) => {
    if (!user) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', walker.id), {
      userName: walker.userName, dogName: walker.dogName, avatarSeed: walker.avatarSeed,
      schedule: walker.schedule || [], lastWalkDate: dateStr
    });
    setSelectedWalker(null);
    setInAppToast({ message: `Друг ${walker.dogName} добавлен!`, avatar: walker.avatarSeed });
    setTimeout(() => setInAppToast(null), 3000);
  };

  if (currentScreen === 'splash') return <div style={{ height: '100vh', background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Dog size={64} style={{ animation: 'bounce 1s infinite' }} /></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, overflow: 'hidden' }}>
      {(currentScreen === 'onboarding' || isProfileOpen) && (
        <ProfileOverlay 
          isOpen={true} onClose={() => setIsProfileOpen(false)} userId={user?.uid}
          userProfile={userProfile} setUserProfile={setUserProfile} dogProfile={dogProfile} setDogProfile={setDogProfile}
          onSave={handleSave} onLogout={() => signOut(auth)} friends={friends} 
          onRemoveFriend={(id: string) => deleteDoc(doc(db, 'artifacts', appId, 'users', user!.uid, 'friends', id))}
        />
      )}

      {inAppToast && (
        <div style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '20px', zIndex: 10000, boxShadow: '0 15px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px', border: `2px solid ${theme.primary}`, animation: 'slideDown 0.4s ease-out forwards' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: theme.primaryLight }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inAppToast.avatar}`} alt="" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '13px', color: theme.text, lineHeight: '1.2' }}>{inAppToast.message}</span>
          <CheckCircle2 size={20} color={theme.success} style={{ marginLeft: 'auto' }} />
        </div>
      )}

      <header style={{ padding: '12px 20px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => setIsProfileOpen(true)} style={{ width: 40, height: 40, borderRadius: '12px', border: `2px solid ${theme.primary}`, overflow: 'hidden', cursor: 'pointer' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.avatarSeed}`} alt="" />
          </div>
          <span style={{ fontWeight: 900, fontSize: '18px' }}>DogWalker</span>
        </div>
        <button onClick={() => Notification.requestPermission().then(p => setNotificationsEnabled(p === "granted"))} style={{ background: 'none', border: 'none', color: notificationsEnabled ? theme.success : theme.gray }}>
          {notificationsEnabled ? <Bell size={22} /> : <BellOff size={22} />}
        </button>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <div ref={mainMapRef} style={{ width: '100%', height: '100%' }} />
        <button onClick={() => yMap.current && yMap.current.setCenter(myPosition, 15, { duration: 500 })} style={{ position: 'absolute', right: '20px', top: '20px', background: 'white', padding: '12px', borderRadius: '14px', border: 'none', boxShadow: theme.shadow, color: theme.primary, zIndex: 20 }}>
          <LocateFixed size={24} />
        </button>

        {selectedWalker && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '24px', boxShadow: theme.shadow, zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedWalker.avatarSeed}`} style={{ width: '56px', borderRadius: '14px' }} alt="" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>{selectedWalker.dogName}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: theme.gray }}>{selectedWalker.userName}</p>
            </div>
            <button onClick={() => addFriend(selectedWalker)} style={{ padding: '10px', borderRadius: '12px', background: theme.primaryLight, border: 'none', color: theme.primary }}><UserPlus size={22} /></button>
            <button onClick={() => setSelectedWalker(null)} style={{ background: 'none', border: 'none', color: theme.gray }}><X size={24} /></button>
          </div>
        )}
      </main>

      <footer style={{ padding: '24px', backgroundColor: 'white', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', boxShadow: '0 -10px 40px rgba(0,0,0,0.05)' }}>
        {myStatus === 'walking' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', color: theme.primary, fontWeight: 900 }}>
            <TimerIcon size={20} />
            <span style={{ fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>{timerText}</span>
          </div>
        )}
        <button onClick={toggleWalk} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: myStatus === 'walking' ? '#fff1f1' : theme.primary, color: myStatus === 'walking' ? theme.danger : 'white', fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {myStatus === 'walking' ? <><X size={22} /> ЗАВЕРШИТЬ ПРОГУЛКУ</> : <><MapPin size={22} /> ПОШЛИ ГУЛЯТЬ, ПЕС</>}
        </button>
      </footer>

      <style>{`
        @keyframes slideDown { from { transform: translateY(-100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}