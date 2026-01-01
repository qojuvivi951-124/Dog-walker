import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Navigation, MessageCircle, User, Settings, Dog, 
  X, Map as MapIcon, AlertTriangle, Smile, Zap, Loader2,
  CheckCircle2, LogOut, Plus, Trash2, Clock, Timer,
  MapPinned, History, Calendar, Footprints, Search
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
// Используем import type для предотвращения ошибок сборки в Vite
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
  addDoc
} from 'firebase/firestore';

// --- Конфигурация Firebase ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dogwalker-production-a6748';

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

// --- Форматирование ---
const formatDuration = (ms: number) => {
  const diff = Math.floor(ms / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${hours > 0 ? hours + 'ч ' : ''}${minutes}м ${seconds}с`;
};

const formatTimerLabel = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- Интерфейсы ---
interface DogProfile {
  name: string;
  breed: string; // Порода
  temperament: 'friendly' | 'active' | 'shy' | 'aggressive';
}

interface UserProfile {
  name: string;
  avatarSeed: string;
  schedule: string[];
  district: string;
}

interface WalkHistoryItem {
  id: string;
  date: any;
  duration: string;
  startTime: number;
}

interface WalkStatus {
  id: string;
  userName: string;
  avatarSeed: string;
  dogName: string;
  dogBreed: string; // Порода для отображения на карте
  temperament: string;
  lat: number;
  lng: number;
  schedule?: string[];
  district?: string;
  walkStartTime?: number;
}

// --- Компонент формы Личного Кабинета ---
const ProfileOverlay = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  setUserProfile, 
  dogProfile, 
  setDogProfile, 
  onSave, 
  onLogout,
  currentScreen,
  walkHistory 
}: any) => {
  const [timeInput, setTimeInput] = useState('');

  if (!isOpen) return null;

  const handleAddTime = () => {
    if (!timeInput.trim()) return;
    setUserProfile({ ...userProfile, schedule: [...(userProfile.schedule || []), timeInput.trim()] });
    setTimeInput('');
  };

  const handleRemoveTime = (idx: number) => {
    setUserProfile({ ...userProfile, schedule: userProfile.schedule.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'white', 
      display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: theme.text }}>Личный кабинет</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
        
        {/* Аватар */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Ваш аватар</label>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
            {AVATAR_SEEDS.map(seed => (
              <div 
                key={seed}
                onClick={() => setUserProfile({ ...userProfile, avatarSeed: seed })}
                style={{ 
                  flexShrink: 0, width: '56px', height: '56px', borderRadius: '14px', cursor: 'pointer',
                  border: `3px solid ${userProfile.avatarSeed === seed ? theme.primary : '#f3f4f6'}`,
                  backgroundColor: '#fafafa', padding: '3px'
                }}
              >
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} style={{ width: '100%' }} alt="avatar" />
              </div>
            ))}
          </div>
        </section>

        {/* История прогулок */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <History size={16} color={theme.primary} />
            <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase' }}>История прогулок</label>
          </div>
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '8px', 
            maxHeight: '180px', overflowY: 'auto', padding: '10px', 
            backgroundColor: '#f9fafb', borderRadius: '16px', border: '1px solid #eee' 
          }}>
            {walkHistory && walkHistory.length > 0 ? (
              walkHistory.map((walk: WalkHistoryItem) => {
                const dateObj = walk.date?.toDate ? walk.date.toDate() : new Date(walk.startTime);
                return (
                  <div key={walk.id} style={{ 
                    padding: '10px', background: 'white', borderRadius: '12px', 
                    border: '1px solid #f3f4f6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Footprints size={14} color={theme.primary} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{dateObj.toLocaleDateString()}</div>
                        <div style={{ fontSize: '10px', color: theme.gray }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div style={{ color: theme.success, fontWeight: 900, fontSize: '12px' }}>{walk.duration}</div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: theme.gray, fontSize: '12px' }}>История пуста</div>
            )}
          </div>
        </section>

        {/* Данные владельца */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Данные владельца</label>
          <input 
            placeholder="Ваше имя" 
            style={{ padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none', fontSize: '15px', width: '100%' }}
            value={userProfile.name} onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
          />
          <div style={{ position: 'relative' }}>
            <MapPinned size={18} color={theme.primary} style={{ position: 'absolute', left: '14px', top: '14px' }} />
            <input 
              placeholder="Район прогулок" 
              style={{ padding: '14px 14px 14px 44px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none', fontSize: '15px', width: '100%' }}
              value={userProfile.district} onChange={e => setUserProfile({ ...userProfile, district: e.target.value })}
            />
          </div>
        </section>

        {/* Данные собаки */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>О питомце</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              placeholder="Имя собаки" 
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none', fontSize: '15px' }}
              value={dogProfile.name} onChange={e => setDogProfile({ ...dogProfile, name: e.target.value })}
            />
            <div style={{ flex: 1, position: 'relative' }}>
               <Search size={16} color={theme.gray} style={{ position: 'absolute', right: '14px', top: '14px' }} />
               <input 
                placeholder="Порода" 
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f3f4f6', outline: 'none', fontSize: '15px' }}
                value={dogProfile.breed} onChange={e => setDogProfile({ ...dogProfile, breed: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* График */}
        <section>
          <label style={{ fontSize: '11px', fontWeight: 900, color: theme.gray, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>График прогулок</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {(userProfile.schedule || []).map((time: string, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: theme.primaryLight, borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{time}</span>
                <Trash2 size={16} color={theme.danger} onClick={() => handleRemoveTime(i)} style={{ cursor: 'pointer' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              placeholder="08:30" 
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #f3f4f6', outline: 'none' }}
              value={timeInput} onChange={e => setTimeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTime()}
            />
            <button onClick={handleAddTime} style={{ background: theme.primary, color: 'white', border: 'none', borderRadius: '10px', width: '48px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} />
            </button>
          </div>
        </section>

        <button onClick={onLogout} style={{ marginTop: '10px', padding: '14px', borderRadius: '12px', border: 'none', background: '#fff1f1', color: theme.danger, fontWeight: 900, cursor: 'pointer' }}>
          <LogOut size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Сменить аккаунт
        </button>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', backgroundColor: 'white', borderTop: '1px solid #f3f4f6' }}>
        <button 
          onClick={onSave} 
          disabled={!userProfile.name || !dogProfile.name}
          style={{ 
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
            background: theme.primary, color: 'white', fontWeight: 900, fontSize: '16px',
            opacity: (!userProfile.name || !dogProfile.name) ? 0.4 : 1, cursor: 'pointer'
          }}
        >
          {currentScreen === 'map' ? 'Сохранить изменения' : 'Начать приключение'}
        </button>
      </div>
    </div>
  );
};

// --- Основной компонент App ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'onboarding' | 'map'>('splash');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', avatarSeed: AVATAR_SEEDS[0], schedule: [], district: '' });
  const [dogProfile, setDogProfile] = useState<DogProfile>({ name: '', breed: '', temperament: 'friendly' });
  const [walkHistory, setWalkHistory] = useState<WalkHistoryItem[]>([]);
  
  const [activeWalks, setActiveWalks] = useState<WalkStatus[]>([]);
  const [myStatus, setMyStatus] = useState<'idle' | 'walking'>('idle');
  const [walkStartTime, setWalkStartTime] = useState<number | null>(null);
  const [timerText, setTimerText] = useState('00:00:00');
  const [selectedWalker, setSelectedWalker] = useState<WalkStatus | null>(null);
  
  const [myPosition, setMyPosition] = useState<number[]>(DEFAULT_CENTER);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mainMapRef = useRef<HTMLDivElement>(null);
  const yMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());

  // 1. Инициализация (Auth + Script)
  useEffect(() => {
    if (!document.getElementById('yandex-maps-script')) {
      const script = document.createElement('script');
      script.id = 'yandex-maps-script';
      script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${YANDEX_MAPS_API_KEY}`;
      script.onload = () => setIsMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsMapLoaded(true);
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Firebase auth error", e); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'data'));
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile(data.userProfile);
            setDogProfile(data.dogProfile);
            setCurrentScreen('map');
          } else {
            setCurrentScreen('onboarding');
          }
        } catch (e) { setCurrentScreen('onboarding'); }
      } else {
        setCurrentScreen('onboarding');
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Подписка на историю прогулок
  useEffect(() => {
    if (!user) return;
    const qHistory = collection(db, 'artifacts', appId, 'users', user.uid, 'walks_history');
    const unsubscribe = onSnapshot(qHistory, (snap) => {
      const list: WalkHistoryItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as WalkHistoryItem));
      setWalkHistory(list.sort((a, b) => b.startTime - a.startTime));
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Основная карта
  useEffect(() => {
    if (currentScreen === 'map' && isMapLoaded && mainMapRef.current && !yMap.current) {
      const win = window as any;
      if (win.ymaps) {
        win.ymaps.ready(() => {
          yMap.current = new win.ymaps.Map(mainMapRef.current, {
            center: myPosition, zoom: 15, controls: ['zoomControl', 'geolocationControl']
          }, { suppressMapOpenBlock: true, autoFitToViewport: 'always' });
        });
      }
    }
  }, [currentScreen, isMapLoaded]);

  // 4. GPS и трансляция
  useEffect(() => {
    let watchId: number;
    if (myStatus === 'walking') {
      if (!navigator.geolocation) {
        setLocationError("GPS не поддерживается браузером");
      } else {
        watchId = navigator.geolocation.watchPosition((p) => {
          setLocationError(null);
          const pos = [p.coords.latitude, p.coords.longitude];
          setMyPosition(pos);
          if (yMap.current) yMap.current.setCenter(pos, 15, { duration: 1000 });
          if (user) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid), {
              id: user.uid, 
              userName: userProfile.name, 
              avatarSeed: userProfile.avatarSeed,
              dogName: dogProfile.name, 
              dogBreed: dogProfile.breed, // Добавляем породу в трансляцию
              lat: pos[0], 
              lng: pos[1], 
              schedule: userProfile.schedule, 
              district: userProfile.district,
              walkStartTime, 
              timestamp: serverTimestamp()
            });
          }
        }, (err) => {
           console.error(err);
           setLocationError("Нажмите 'Разрешить' для GPS в настройках");
        }, { enableHighAccuracy: true });
      }
    } else {
      if (user) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_walks', user.uid)).catch(() => {});
      setLocationError(null);
    }
    return () => { if(watchId) navigator.geolocation.clearWatch(watchId); };
  }, [myStatus, user, userProfile, dogProfile, walkStartTime]);

  // 5. Таймер
  useEffect(() => {
    let interval: any;
    if (myStatus === 'walking' && walkStartTime) {
      interval = setInterval(() => {
        const diff = Date.now() - walkStartTime;
        setTimerText(formatTimerLabel(Math.floor(diff / 1000)));
      }, 1000);
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(interval);
  }, [myStatus, walkStartTime]);

  // 6. Соседи
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'active_walks');
    return onSnapshot(q, (snap) => {
      const list: WalkStatus[] = [];
      snap.forEach(d => list.push(d.data() as WalkStatus));
      setActiveWalks(list.filter(x => x.id !== user.uid));
    }, (error) => console.error("Firestore error", error));
  }, [user]);

  // 7. Обновление маркеров на карте
  useEffect(() => {
    if (!yMap.current) return;
    const win = window as any;

    activeWalks.forEach(w => {
      const scheduleStr = (w.schedule || []).join(', ') || 'Не задан';
      const districtStr = w.district ? `📍 ${w.district}` : 'Район не указан';
      const breedStr = w.dogBreed ? `[${w.dogBreed}]` : '';
      
      let walkTimeStr = "Прогулка начата";
      if (w.walkStartTime) {
        walkTimeStr = `Гуляет уже: ${formatDuration(Date.now() - w.walkStartTime)}`;
      }

      // Собираем подсказку с породой
      const hint = `<b>${w.dogName} ${breedStr}</b><br/>${districtStr}<br/>🕒 ${scheduleStr}<br/>🐕 ${walkTimeStr}`;

      if (markers.current.has(w.id)) {
        const marker = markers.current.get(w.id);
        marker.geometry.setCoordinates([w.lat, w.lng]);
        marker.properties.set('hintContent', hint);
      } else {
        const p = new win.ymaps.Placemark([w.lat, w.lng], { 
          hintContent: hint,
          balloonContent: `<b>${w.dogName}</b><br/>${w.dogBreed || 'Порода не указана'}`
        }, {
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
    } else if (markers.current.has('me')) {
      yMap.current.geoObjects.remove(markers.current.get('me'));
      markers.current.delete('me');
    }
  }, [activeWalks, myPosition, myStatus]);

  // --- Хендлеры ---
  const toggleWalk = async () => {
    if (myStatus === 'idle') {
      setWalkStartTime(Date.now());
      setMyStatus('walking');
    } else {
      if (user && walkStartTime) {
        const endTime = Date.now();
        const durationStr = formatDuration(endTime - walkStartTime);
        try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'walks_history'), {
            startTime: walkStartTime,
            endTime: endTime,
            duration: durationStr,
            date: serverTimestamp()
          });
        } catch (e) { console.error("History save error", e); }
      }
      setMyStatus('idle');
      setWalkStartTime(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { userProfile, dogProfile });
    setIsProfileOpen(false);
    setCurrentScreen('map');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsProfileOpen(false);
  };

  // --- Рендеринг ---
  if (currentScreen === 'splash') {
    return (
      <div style={{ height: '100vh', width: '100vw', background: theme.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Dog size={70} style={{ animation: 'bounce 1s infinite' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>DogWalker</h1>
      </div>
    );
  }

  if (currentScreen === 'onboarding') {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'white', display: 'flex', flexDirection: 'column', padding: '30px', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: '100px', height: '100px', background: theme.primaryLight, borderRadius: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' }}>
          <MapIcon size={50} color={theme.primary} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '15px', color: theme.text }}>Найдите компанию рядом</h2>
        <p style={{ color: theme.gray, marginBottom: '40px', fontSize: '15px' }}>Смотри кто гуляет рядом и находи компанию для своего питомца через GPS.</p>
        <button onClick={() => setIsProfileOpen(true)} style={{ background: theme.primary, color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}>Начать приключение</button>
        <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userProfile={userProfile} setUserProfile={setUserProfile} dogProfile={dogProfile} setDogProfile={setDogProfile} onSave={handleSave} onLogout={handleLogout} currentScreen={currentScreen} walkHistory={walkHistory} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, overflow: 'hidden' }}>
      <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userProfile={userProfile} setUserProfile={setUserProfile} dogProfile={dogProfile} setDogProfile={setDogProfile} onSave={handleSave} onLogout={handleLogout} currentScreen={currentScreen} walkHistory={walkHistory} />
      
      <header style={{ padding: '12px 15px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => setIsProfileOpen(true)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: `2px solid ${theme.primary}`, overflow: 'hidden', cursor: 'pointer' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.avatarSeed}`} alt="me" style={{ width: '100%' }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '16px' }}>DogWalker</span>
        </div>
        <div style={{ background: '#f0fdf4', color: theme.success, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>{activeWalks.length} РЯДОМ</div>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        {locationError && (
          <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(239, 68, 68, 0.95)', color: 'white', padding: '12px', borderRadius: '12px', zIndex: 100, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {locationError}
          </div>
        )}
        <div ref={mainMapRef} style={{ width: '100%', height: '100%' }} />
        
        {selectedWalker && (
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', right: '15px', background: 'white', padding: '15px', borderRadius: '20px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: theme.shadow, zIndex: 50, border: '1px solid #f3f4f6' }}>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedWalker.avatarSeed}`} style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#f9fafb' }} alt="walker" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: '16px' }}>{selectedWalker.dogName}</div>
              <div style={{ fontSize: '12px', color: theme.gray }}>{selectedWalker.dogBreed || 'Порода не указана'}</div>
              <div style={{ fontSize: '11px', color: theme.text, marginTop: '2px' }}>Хозяин: <span style={{ fontWeight: 600 }}>{selectedWalker.userName}</span></div>
            </div>
            <button onClick={() => setSelectedWalker(null)} style={{ background: 'none', border: 'none', color: theme.gray, cursor: 'pointer' }}><X size={20}/></button>
          </div>
        )}
      </main>

      <footer style={{ padding: '20px', background: 'white', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)', zIndex: 10 }}>
        {myStatus === 'walking' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px', color: theme.primary, fontWeight: 900 }}>
            <Timer size={18} />
            <span style={{ fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>{timerText}</span>
          </div>
        )}
        <button 
          onClick={toggleWalk}
          style={{ 
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
            background: myStatus === 'walking' ? '#fff1f1' : theme.primary,
            color: myStatus === 'walking' ? theme.danger : 'white',
            fontWeight: 900, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer'
          }}
        >
          {myStatus === 'walking' ? <><X size={22} /> ЗАВЕРШИТЬ</> : <><MapPin size={22} /> Пошли гулять, Пес</>}
        </button>
      </footer>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; overflow: hidden; }
      `}</style>
    </div>
  );
}