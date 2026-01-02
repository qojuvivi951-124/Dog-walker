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
  Clock,
  ShieldCheck
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

// --- Интерфейсы ---
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
  schedule?: string[]; 
  walkStartTime?: number; 
  timestamp?: any;
}

// --- Компонент Личного Кабинета ---
const ProfileOverlay = ({ 
  isOpen, onClose, userProfile, setUserProfile, dogProfile, setDogProfile, 
  onSave, onLogout, friends, onRemoveFriend, userId, allActiveWalks, onDeleteUser 
}: any) => {
  const [timeInput, setTimeInput] = useState('');

  if (!isOpen) return null;

  const handleAddTime = async () => {
    const time = timeInput.trim();
    if (!time) return;
    const newSchedule = [...(userProfile.schedule || []), time];
    setUserProfile((prev: UserProfile) => ({ ...prev, schedule: newSchedule }));
    setTimeInput('');
    if (userId) {
      await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), {
        'userProfile.schedule': newSchedule
      }).catch(console.error);
    }
  };

  const handleRemoveTime = async (index: number) => {
    const newSchedule = (userProfile.schedule || []).filter((_: any, i: number) => i !== index);
    setUserProfile((prev: UserProfile) => ({ ...prev, schedule: newSchedule }));
    if (userId) {
      await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), {
        'userProfile.schedule': newSchedule
      }).catch(console.error);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'white', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900 }}>Профиль</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '14px', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' }}>
        
        {/* АДМИН-ПАНЕЛЬ */}
        <section style={{ background: '#fff7ed', padding: '16px', borderRadius: '20px', border: '1px solid #ffedd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: theme.primary }}>
            <ShieldCheck size={20} />
            <label style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Управление картой (Админ)</label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allActiveWalks.length > 0 ? allActiveWalks.map((w: any) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${w.avatarSeed}`} style={{ width: '28px', borderRadius: '6px' }} alt="" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{w.dogName || 'Собака'}</div>
                    <div style={{ fontSize: '10px', color: theme.gray }}>{w.userName || '2'} (id:{w.id.substring(0,4)})</div>
                  </div>
                </div>
                <button onClick={() => onDeleteUser(w.id)} style={{ background: '#fff1f1', border: 'none', color: theme.danger, padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )) : <div style={{ fontSize: '12px', color: theme.gray, textAlign: 'center', padding: '10px' }}>Активных прогулок нет</div>}
          </div>
        </section>

        {/* АВАТАР */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваш аватар</label>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: '10px' }}>
            {AVATAR_SEEDS.map(seed => (
              <div key={seed} onClick={() => setUserProfile((p: any) => ({ ...p, avatarSeed: seed }))}
                style={{ flexShrink: 0, width: '64px', height: '64px', borderRadius: '18px', border: `4px solid ${userProfile.avatarSeed === seed ? theme.primary : '#f3f4f6'}`, padding: '4px', cursor: 'pointer', backgroundColor: '#fff' }}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="" style={{ width: '100%' }} />
              </div>
            ))}
          </div>
        </section>

        {/* ДРУЗЬЯ */}
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
                  <button onClick={() => onRemoveFriend(f.id)} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer' }}><Trash2 size={16} /></button>
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
            )) : <div style={{ fontSize: '12px', color: theme.gray, textAlign: 'center', padding: '10px' }}>Друзей пока нет</div>}
          </div>
        </section>

        {/* ИНФОРМАЦИЯ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase' }}>Информация</label>
          <input placeholder="Ваше имя" style={{ padding: '16px', borderRadius: '14px', border: '2px solid #f3f4f6', outline: 'none' }} value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} />
          <div style={{ position: 'relative' }}>
            <MapPinned size={18} color={theme.primary} style={{ position: 'absolute', left: '14px', top: '18px' }} />
            <input placeholder="Район прогулок" style={{ padding: '16px 16px 16px 44px', borderRadius: '14px', border: '2px solid #f3f4f6', outline: 'none', width: '100%' }} value={userProfile.district} onChange={e => setUserProfile({...userProfile, district: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="Имя собаки" style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '2px solid #f3f4f6', outline: 'none' }} value={dogProfile.name} onChange={e => setDogProfile({...dogProfile, name: e.target.value})} />
            <input placeholder="Порода" style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '2px solid #f3f4f6', outline: 'none' }} value={dogProfile.breed} onChange={e => setDogProfile({...dogProfile, breed: e.target.value})} />
          </div>
        </section>

        {/* ГРАФИК */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваш график</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {(userProfile.schedule || []).map((time: string, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: theme.primaryLight, borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{time}</span>
                <Trash2 size={16} color={theme.danger} onClick={() => handleRemoveTime(i)} style={{ cursor: 'pointer' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Напр: 08:30" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none' }} value={timeInput} onChange={e => setTimeInput(e.target.value)} />
            <button onClick={handleAddTime} style={{ background: theme.primary, color: 'white', border: 'none', borderRadius: '12px', width: '52px', cursor: 'pointer' }}><Plus size={24} /></button>
          </div>
        </section>

        <button onClick={onLogout} style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', background: theme.primaryLight, color: theme.primary, fontWeight: 900, border: 'none', cursor: 'pointer' }}>
          <LogOut size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Выйти из аккаунта
        </button>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px', backgroundColor: 'white', borderTop: '1px solid #eee', zIndex: 10000 }}>
        <button onClick={onSave} disabled={!userProfile.name || !dogProfile.name} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: theme.primary, color: 'white', fontWeight: 900, fontSize: '18px', opacity: (!userProfile.name || !dogProfile.name) ? 0.4 : 1, cursor: 'pointer' }}>
          Сохранить изменения
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'map'>('splash');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', avatarSeed: AVATAR_SEEDS[0], schedule: [], district: '' });
  const [dogProfile, setDogProfile] = useState<DogProfile>({ name: '', breed: '' });
  const [friends, setFriends] = useState<any[]>([]);
  const [activeWalks, setActiveWalks] = useState<WalkStatus[]>([]);
  const [myStatus, setMyStatus] = useState<'idle' | 'walking'>('idle');
  const [walkStartTime, setWalkStartTime] = useState<number | null>(null);
  const [timerText, setTimerText] = useState('00:00:00');
  const [myPosition, setMyPosition] = useState<number[]>(DEFAULT_CENTER);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [inAppToast, setInAppToast] = useState<{message: string, avatar: string} | null>(null);
  const [selectedWalker, setSelectedWalker] = useState<WalkStatus | null>(null);

  const mainMapRef = useRef<HTMLDivElement>(null);
  const yMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const prevActiveIds = useRef<Set<string>>(new Set());

  // 1. Инициализация и Real-time профиль
  useEffect(() => {
    if (!document.getElementById('ymaps-script')) {
      const script = document.createElement('script');
      script.id = 'ymaps-script';
      script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${YANDEX_MAPS_API_KEY}`;
      script.onload = () => setIsMapLoaded(true);
      document.body.appendChild(script);
    } else { setIsMapLoaded(true); }

    signInAnonymously(auth).catch(console.error);
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Real-time слушатель профиля
        const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'data'), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setUserProfile(d.userProfile);
            setDogProfile(d.dogProfile);
            // Если профиль заполнен - закрываем окно
            if (d.userProfile?.name) setIsProfileOpen(false);
          } else {
            setIsProfileOpen(true);
          }
          setCurrentScreen('map');
        });
        return () => unsubProfile();
      }
    });

    const savedNotifs = localStorage.getItem('dogwalker_notifs');
    if (savedNotifs === 'true') setNotificationsEnabled(true);

    return () => unsubAuth();
  }, []);

  // 2. Отрисовка карты при закрытии профиля
  useEffect(() => {
    if (!isProfileOpen && mapReady && yMap.current) {
      setTimeout(() => { yMap.current.container.fitToViewport(); }, 300);
    }
  }, [isProfileOpen, mapReady]);

  // 3. Синхронизация Друзей и Соседей
  useEffect(() => {
    if (!user) return;
    const unsubFriends = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'friends'), (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubWalks = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'active_walks'), (snap) => {
      const now = Date.now();
      const walks = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as WalkStatus))
        // Фильтр: только те, кто обновился за последний час
        .filter(w => w.timestamp && (now - w.timestamp.toMillis()) < 3600000);
      setActiveWalks(walks);
    });
    return () => { unsubFriends(); unsubWalks(); };
  }, [user]);

  // 4. Логика уведомлений
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const friendIds = new Set(friends.map(f => f.id));
    activeWalks.forEach(walker => {
      if (walker.id !== user.uid && friendIds.has(walker.id) && !prevActiveIds.current.has(walker.id)) {
        const msg = `${walker.userName} и ${walker.dogName} вышли гулять!`;
        setInAppToast({ message: msg, avatar: walker.avatarSeed });
        setTimeout(() => setInAppToast(null), 7000);
        if (notificationsEnabled && document.hidden) {
          try { new Notification("DogWalker", { body: msg, icon: `https://api.dicebear.com/7.x/avataaars/svg?seed=${walker.avatarSeed}` }); } catch(e){}
        }
      }
    });
    prevActiveIds.current = new Set(activeWalks.map(w => w.id));
  }, [activeWalks, friends, notificationsEnabled, user]);

  // 5. GPS и Таймер
  useEffect(() => {
    let timerInt: any;
    if (myStatus === 'walking' && walkStartTime) {
      timerInt = setInterval(() => { setTimerText(formatTimerLabel(Math.floor((Date.now() - walkStartTime) / 1000))); }, 1000);
    } else { setTimerText('00:00:00'); }
    return () => clearInterval(timerInt);
  }, [myStatus, walkStartTime]);

  useEffect(() => {
    let watchId: number;
    if (isMapLoaded) {
      watchId = navigator.geolocation.watchPosition((p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setMyPosition(pos);
        if (myStatus === 'walking' && user) {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid), {
            id: user.uid, userName: userProfile.name, avatarSeed: userProfile.avatarSeed,
            dogName: dogProfile.name, dogBreed: dogProfile.breed, lat: pos[0], lng: pos[1],
            schedule: userProfile.schedule, walkStartTime, timestamp: serverTimestamp()
          }, { merge: true }).catch(console.error);
        }
      }, () => {}, { enableHighAccuracy: true });
    }
    return () => { if(watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isMapLoaded, myStatus, user, userProfile, dogProfile, walkStartTime]);

  // 6. Отрисовка маркеров
  useEffect(() => {
    if (!mapReady || !yMap.current || !user) return;
    const win = window as any;

    const othersOnly = activeWalks.filter(w => w.id !== user.uid);

    // Обновляем маркеры
    othersOnly.forEach(w => {
      const hint = `<b>${w.dogName}</b><br/>🕒 ${(w.schedule || []).join(', ') || 'не указан'}`;
      if (markers.current.has(w.id)) {
        const m = markers.current.get(w.id);
        m.geometry.setCoordinates([w.lat, w.lng]);
        m.properties.set('hintContent', hint);
      } else {
        const p = new win.ymaps.Placemark([w.lat, w.lng], { hintContent: hint }, {
          iconLayout: 'default#image', 
          iconImageHref: `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.avatarSeed}`,
          iconImageSize: [44, 44], 
          iconImageOffset: [-22, -22]
        });
        p.events.add('click', () => setSelectedWalker(w));
        yMap.current.geoObjects.add(p);
        markers.current.set(w.id, p);
      }
    });

    // Удаляем ушедших
    markers.current.forEach((m, id) => {
      if (id !== 'me' && !othersOnly.find(x => x.id === id)) {
        yMap.current.geoObjects.remove(m);
        markers.current.delete(id);
      }
    });

    // Себя на карте
    if (myPosition) {
      if (!markers.current.has('me')) {
        const m = new win.ymaps.Placemark(myPosition, { iconCaption: 'Вы' }, { preset: 'islands#blueCircleDotIconWithCaption', iconColor: '#3b82f6' });
        yMap.current.geoObjects.add(m);
        markers.current.set('me', m);
      } else {
        markers.current.get('me').geometry.setCoordinates(myPosition);
      }
    }
  }, [activeWalks, myPosition, mapReady, user]);

  // 7. Карта Init
  useEffect(() => {
    if (currentScreen === 'map' && isMapLoaded && mainMapRef.current && !yMap.current) {
      const win = window as any;
      win.ymaps.ready(() => {
        yMap.current = new win.ymaps.Map(mainMapRef.current, { center: myPosition, zoom: 15, controls: ['zoomControl'] }, { suppressMapOpenBlock: true });
        setMapReady(true);
      });
    }
  }, [currentScreen, isMapLoaded]);

  // --- Хендлеры ---
  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { userProfile, dogProfile }, { merge: true });
      setIsProfileOpen(false);
      setInAppToast({ message: "Изменения сохранены!", avatar: userProfile.avatarSeed });
      setTimeout(() => setInAppToast(null), 3000);
    } catch (e) { console.error(e); }
  };

  const handleDeleteUser = async (targetId: string) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', targetId));
      setInAppToast({ message: "Метка удалена навсегда", avatar: 'Shadow' });
      setTimeout(() => setInAppToast(null), 3000);
    } catch (e) { console.error(e); }
  };

  const handleAddFriend = async (walker: WalkStatus) => {
    if (!user) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', walker.id), {
      userName: walker.userName, dogName: walker.dogName, avatarSeed: walker.avatarSeed,
      schedule: walker.schedule || [], lastWalkDate: dateStr
    });
    setInAppToast({ message: `Друг ${walker.dogName} добавлен!`, avatar: walker.avatarSeed });
    setTimeout(() => setInAppToast(null), 4000);
    setSelectedWalker(null);
  };

  const toggleNotifications = () => {
    if (!("Notification" in window)) {
      setInAppToast({ message: "Уведомления не поддерживаются", avatar: userProfile.avatarSeed });
      return;
    }
    Notification.requestPermission().then(p => {
      const isGranted = p === "granted";
      setNotificationsEnabled(isGranted);
      localStorage.setItem('dogwalker_notifs', isGranted ? 'true' : 'false');
      setInAppToast({ message: isGranted ? "Уведомления включены" : "Уведомления отклонены", avatar: userProfile.avatarSeed });
      setTimeout(() => setInAppToast(null), 3000);
    });
  };

  if (currentScreen === 'splash') return <div style={{ height: '100vh', background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Dog size={64} style={{ animation: 'bounce 1s infinite' }} /></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, overflow: 'hidden' }}>
      
      <ProfileOverlay isOpen={isProfileOpen} userId={user?.uid} friends={friends}
        allActiveWalks={activeWalks} onDeleteUser={handleDeleteUser}
        onClose={() => { if (userProfile.name && dogProfile.name) setIsProfileOpen(false); }} 
        userProfile={userProfile} setUserProfile={setUserProfile} dogProfile={dogProfile} setDogProfile={setDogProfile}
        onSave={handleSave} onLogout={async () => { await signOut(auth); setIsProfileOpen(false); }} 
        onRemoveFriend={(id: string) => deleteDoc(doc(db, 'artifacts', appId, 'users', user!.uid, 'friends', id))}
      />

      {inAppToast && (
        <div style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '20px', zIndex: 10000, boxShadow: '0 15px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px', border: `2px solid ${theme.primary}`, animation: 'slideDown 0.4s ease-out forwards' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', backgroundColor: theme.primaryLight }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inAppToast.avatar}`} alt="" style={{ width: '100%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '13px', color: theme.text }}>{inAppToast.message}</span>
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
        <button onClick={toggleNotifications} style={{ background: 'none', border: 'none', color: notificationsEnabled ? theme.primary : theme.gray, cursor: 'pointer' }}>
          {notificationsEnabled ? <Bell size={22} /> : <BellOff size={22} />}
        </button>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mainMapRef} style={{ width: '100%', height: '100%' }} />
        <button onClick={() => yMap.current && yMap.current.setCenter(myPosition, 15, { duration: 500 })} style={{ position: 'absolute', right: '20px', top: '20px', background: 'white', padding: '12px', borderRadius: '14px', border: 'none', boxShadow: theme.shadow, color: theme.primary, zIndex: 20, cursor: 'pointer' }}>
          <LocateFixed size={24} />
        </button>
        {selectedWalker && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '24px', boxShadow: theme.shadow, zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedWalker.avatarSeed}`} style={{ width: '56px', borderRadius: '14px', backgroundColor: theme.primaryLight }} alt="" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>{selectedWalker.dogName}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: theme.gray }}>{selectedWalker.userName}</p>
            </div>
            <button onClick={() => handleAddFriend(selectedWalker)} style={{ padding: '10px', borderRadius: '12px', background: theme.primaryLight, border: 'none', color: theme.primary, cursor: 'pointer' }}><UserPlus size={22} /></button>
            <button onClick={() => setSelectedWalker(null)} style={{ background: 'none', border: 'none', color: theme.gray, cursor: 'pointer' }}><X size={24} /></button>
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
        <button onClick={() => {
          if (myStatus === 'idle') {
            setWalkStartTime(Date.now()); setMyStatus('walking'); 
            if (yMap.current) yMap.current.setCenter(myPosition, 15, { duration: 1000 });
          } else { 
            setMyStatus('idle'); setWalkStartTime(null); 
            if (user) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid)); 
          }
        }} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: myStatus === 'walking' ? '#fff1f1' : theme.primary, color: myStatus === 'walking' ? theme.danger : 'white', fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
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