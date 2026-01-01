import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Dog, 
  X, 
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  MapPinned,
  Bell,
  BellOff
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
  getDoc
} from 'firebase/firestore';

// --- Инициализация Firebase ---
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

// --- Константы Дизайна ---
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
  district?: string; 
  walkStartTime?: number; 
}

// --- Компонент Профиля и Настроек ---
const ProfileOverlay = ({ 
  isOpen, onClose, userProfile, setUserProfile, dogProfile, setDogProfile, 
  onSave, onLogout, friends, onRemoveFriend 
}: any) => {
  const [timeInput, setTimeInput] = useState('');

  if (!isOpen) return null;

  const handleAddTime = () => {
    if (!timeInput.trim()) return;
    setUserProfile({ ...userProfile, schedule: [...(userProfile.schedule || []), timeInput.trim()] });
    setTimeInput('');
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'white', 
      display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900 }}>Профиль</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '14px' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' }}>
        {/* Секция Друзей */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваши друзья</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '16px' }}>
            {friends.length > 0 ? friends.map((f: any) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatarSeed}`} style={{ width: '32px', borderRadius: '8px' }} alt="" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{f.dogName}</div>
                    <div style={{ fontSize: '10px', color: theme.gray }}>{f.userName}</div>
                  </div>
                </div>
                <button onClick={() => onRemoveFriend(f.id)} style={{ background: 'none', border: 'none', color: theme.danger }}><Trash2 size={16} /></button>
              </div>
            )) : <div style={{ fontSize: '12px', color: theme.gray, textAlign: 'center' }}>Пока пусто</div>}
          </div>
        </section>

        {/* Выбор Аватара */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Аватар</label>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
            {AVATAR_SEEDS.map(seed => (
              <div 
                key={seed}
                onClick={() => setUserProfile({ ...userProfile, avatarSeed: seed })}
                style={{ 
                  flexShrink: 0, width: '56px', height: '56px', borderRadius: '14px',
                  border: `3px solid ${userProfile.avatarSeed === seed ? theme.primary : '#f3f4f6'}`,
                  backgroundColor: '#fafafa', padding: '3px', cursor: 'pointer'
                }}
              >
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} style={{ width: '100%' }} alt="" />
              </div>
            ))}
          </div>
        </section>

        {/* Поля Ввода */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase' }}>Информация</label>
          <input 
            placeholder="Ваше имя" 
            style={{ padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none' }}
            value={userProfile.name} onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
          />
          <div style={{ position: 'relative' }}>
            <MapPinned size={18} color={theme.primary} style={{ position: 'absolute', left: '14px', top: '15px' }} />
            <input 
              placeholder="Район прогулок" 
              style={{ padding: '14px 14px 14px 44px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none', width: '100%' }}
              value={userProfile.district} onChange={e => setUserProfile({ ...userProfile, district: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              placeholder="Имя собаки" 
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none' }}
              value={dogProfile.name} onChange={e => setDogProfile({ ...dogProfile, name: e.target.value })}
            />
            <input 
              placeholder="Порода" 
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none' }}
              value={dogProfile.breed} onChange={e => setDogProfile({ ...dogProfile, breed: e.target.value })}
            />
          </div>
        </section>

        {/* График */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Обычный график</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {(userProfile.schedule || []).map((time: string, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: theme.primaryLight, borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{time}</span>
                <Trash2 size={16} color={theme.danger} onClick={() => setUserProfile({ ...userProfile, schedule: userProfile.schedule.filter((_:any, idx:number) => idx !== i)})} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              placeholder="Напр: 08:30" 
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #f3f4f6', outline: 'none' }}
              value={timeInput} onChange={e => setTimeInput(e.target.value)}
            />
            <button onClick={handleAddTime} style={{ background: theme.primary, color: 'white', border: 'none', borderRadius: '10px', width: '48px' }}>
              <Plus size={20} />
            </button>
          </div>
        </section>

        <button onClick={onLogout} style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', border: 'none', background: '#fff1f1', color: theme.danger, fontWeight: 900 }}>
          <LogOut size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Выйти
        </button>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px', backgroundColor: 'white', borderTop: '1px solid #eee' }}>
        <button 
          onClick={onSave} 
          disabled={!userProfile.name || !dogProfile.name}
          style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: theme.primary, color: 'white', fontWeight: 900, fontSize: '18px', opacity: (!userProfile.name || !dogProfile.name) ? 0.4 : 1 }}
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
};

// --- Главный Компонент App ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'onboarding' | 'map'>('splash');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', avatarSeed: AVATAR_SEEDS[0], schedule: [], district: '' });
  const [dogProfile, setDogProfile] = useState<DogProfile>({ name: '', breed: '' });
  const [friends, setFriends] = useState<any[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const [activeWalks, setActiveWalks] = useState<WalkStatus[]>([]);
  const [myStatus, setMyStatus] = useState<'idle' | 'walking'>('idle');
  const [selectedWalker, setSelectedWalker] = useState<WalkStatus | null>(null);
  const [myPosition, setMyPosition] = useState<number[]>(DEFAULT_CENTER);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const mainMapRef = useRef<HTMLDivElement>(null);
  const yMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const prevWalkersRef = useRef<Set<string>>(new Set());

  // 1. Инициализация
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${YANDEX_MAPS_API_KEY}`;
    script.onload = () => setIsMapLoaded(true);
    document.body.appendChild(script);

    signInAnonymously(auth);
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

  // 2. Синхронизация Друзей
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'friends'), (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // 3. Уведомления о друзьях
  useEffect(() => {
    const friendIds = new Set(friends.map(f => f.id));
    const currentlyWalking = new Set(activeWalks.map(w => w.id));

    activeWalks.forEach(walker => {
      if (friendIds.has(walker.id) && !prevWalkersRef.current.has(walker.id)) {
        if (notificationsEnabled) {
          new Notification("DogWalker: Друг на связи!", {
            body: `${walker.userName} и ${walker.dogName} вышли гулять!`,
            icon: `https://api.dicebear.com/7.x/avataaars/svg?seed=${walker.avatarSeed}`
          });
        }
      }
    });
    prevWalkersRef.current = currentlyWalking;
  }, [activeWalks, friends, notificationsEnabled]);

  // 4. GPS и Карта
  useEffect(() => {
    if (currentScreen === 'map' && isMapLoaded && mainMapRef.current && !yMap.current) {
      const win = window as any;
      win.ymaps.ready(() => {
        yMap.current = new win.ymaps.Map(mainMapRef.current, { 
          center: myPosition, zoom: 15, controls: ['zoomControl'] 
        }, { suppressMapOpenBlock: true });
      });
    }
  }, [currentScreen, isMapLoaded]);

  useEffect(() => {
    let watchId: number;
    if (myStatus === 'walking') {
      watchId = navigator.geolocation.watchPosition((p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setMyPosition(pos);
        if (yMap.current) yMap.current.setCenter(pos, 15, { duration: 1000 });
        if (user) {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid), {
            id: user.uid, userName: userProfile.name, avatarSeed: userProfile.avatarSeed,
            dogName: dogProfile.name, dogBreed: dogProfile.breed, lat: pos[0], lng: pos[1],
            schedule: userProfile.schedule, district: userProfile.district,
            walkStartTime: Date.now(), timestamp: serverTimestamp()
          });
        }
      }, () => {}, { enableHighAccuracy: true });
    } else if (user) {
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid));
    }
    return () => { if(watchId) navigator.geolocation.clearWatch(watchId); };
  }, [myStatus, user, userProfile, dogProfile]);

  // 5. Маркеры других пользователей
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'active_walks'), (snap) => {
      setActiveWalks(snap.docs.map(d => d.data() as WalkStatus).filter(x => x.id !== user.uid));
    });
  }, [user]);

  useEffect(() => {
    if (!yMap.current) return;
    const win = window as any;

    activeWalks.forEach(w => {
      const scheduleStr = (w.schedule || []).join(', ') || 'Не указан';
      const districtStr = w.district ? `📍 ${w.district}` : 'Район не указан';
      const hint = `<b>${w.dogName}</b> (${w.dogBreed})<br/>${districtStr}<br/>🕒 ${scheduleStr}`;

      if (markers.current.has(w.id)) {
        const m = markers.current.get(w.id);
        m.geometry.setCoordinates([w.lat, w.lng]);
        m.properties.set('hintContent', hint);
      } else {
        const p = new win.ymaps.Placemark([w.lat, w.lng], { hintContent: hint }, {
          iconLayout: 'default#image',
          iconImageHref: `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.avatarSeed}`,
          iconImageSize: [40, 40], iconImageOffset: [-20, -20]
        });
        p.events.add('click', () => setSelectedWalker(w));
        yMap.current.geoObjects.add(p);
        markers.current.set(w.id, p);
      }
    });

    markers.current.forEach((m, id) => {
      if (id !== 'me' && !activeWalks.find(x => x.id === id)) {
        yMap.current.geoObjects.remove(m);
        markers.current.delete(id);
      }
    });

    if (myStatus === 'walking') {
      if (!markers.current.has('me')) {
        const m = new win.ymaps.Placemark(myPosition, { iconCaption: 'Вы' }, { preset: 'islands#orangeDotIconWithCaption', iconColor: theme.primary });
        yMap.current.geoObjects.add(m);
        markers.current.set('me', m);
      } else {
        markers.current.get('me').geometry.setCoordinates(myPosition);
      }
    }
  }, [activeWalks, myPosition, myStatus]);

  // --- Хендлеры ---
  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { userProfile, dogProfile });
    setCurrentScreen('map');
    setIsProfileOpen(false);
  };

  const addFriend = async (walker: WalkStatus) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', walker.id), {
      userName: walker.userName, dogName: walker.dogName, avatarSeed: walker.avatarSeed
    });
    setSelectedWalker(null);
  };

  const removeFriend = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', id));
  };

  const requestNotifs = () => {
    Notification.requestPermission().then(p => setNotificationsEnabled(p === "granted"));
  };

  // --- Рендеринг Экранов ---
  if (currentScreen === 'splash') return <div style={{ height: '100vh', background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Dog size={64} style={{ animation: 'bounce 1s infinite' }} /></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, overflow: 'hidden' }}>
      {(currentScreen === 'onboarding' || isProfileOpen) && (
        <ProfileOverlay 
          isOpen={true} onClose={() => setIsProfileOpen(false)} 
          userProfile={userProfile} setUserProfile={setUserProfile} 
          dogProfile={dogProfile} setDogProfile={setDogProfile}
          onSave={handleSave} onLogout={() => signOut(auth)}
          friends={friends} onRemoveFriend={removeFriend}
        />
      )}

      <header style={{ padding: '12px 20px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => setIsProfileOpen(true)} style={{ width: 40, height: 40, borderRadius: '12px', border: `2px solid ${theme.primary}`, overflow: 'hidden', cursor: 'pointer' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.avatarSeed}`} alt="" />
          </div>
          <span style={{ fontWeight: 900, fontSize: '18px' }}>DogWalker</span>
        </div>
        <button onClick={requestNotifs} style={{ background: 'none', border: 'none', color: notificationsEnabled ? theme.success : theme.gray }}>
          {notificationsEnabled ? <Bell size={22} /> : <BellOff size={22} />}
        </button>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <div ref={mainMapRef} style={{ width: '100%', height: '100%' }} />
        
        {selectedWalker && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '24px', boxShadow: theme.shadow, zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedWalker.avatarSeed}`} style={{ width: '56px', borderRadius: '14px' }} alt="" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>{selectedWalker.dogName}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: theme.gray }}>{selectedWalker.userName} • {selectedWalker.dogBreed}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {friends.some(f => f.id === selectedWalker.id) ? (
                <button onClick={() => removeFriend(selectedWalker.id)} style={{ padding: '10px', borderRadius: '12px', background: '#fff1f1', border: 'none', color: theme.danger }}><UserMinus size={22} /></button>
              ) : (
                <button onClick={() => addFriend(selectedWalker)} style={{ padding: '10px', borderRadius: '12px', background: theme.primaryLight, border: 'none', color: theme.primary }}><UserPlus size={22} /></button>
              )}
              <button onClick={() => setSelectedWalker(null)} style={{ background: 'none', border: 'none', color: theme.gray }}><X size={24} /></button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ padding: '24px', backgroundColor: 'white', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', boxShadow: '0 -10px 40px rgba(0,0,0,0.05)' }}>
        <button 
          onClick={() => setMyStatus(myStatus === 'idle' ? 'walking' : 'idle')} 
          style={{ 
            width: '100%', padding: '18px', borderRadius: '16px', border: 'none', 
            background: myStatus === 'walking' ? '#fff1f1' : theme.primary, 
            color: myStatus === 'walking' ? theme.danger : 'white', 
            fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' 
          }}
        >
          {myStatus === 'walking' ? <><X size={22} /> ЗАВЕРШИТЬ</> : <><MapPin size={22} /> ВЫЙТИ В ПАРК</>}
        </button>
      </footer>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}