const { useState, useEffect } = React;

// Icon Shim for Vanilla Lucide
const LucideIcon = ({ name, className = "" }) => {
  const iconRef = React.useRef(null);

  useEffect(() => {
    if (typeof lucide !== 'undefined' && iconRef.current) {
      // Try to find the icon: check the name as-is, then try PascalCase
      const pascalName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      const iconData = lucide.icons[name] || lucide.icons[pascalName];

      if (iconData) {
        lucide.createIcons({
          attrs: { class: className },
          nameAttr: 'data-lucide',
          icons: { [name]: iconData }
        });
      } else {
        // Fallback: just try a generic createIcons if specific data isn't found
        lucide.createIcons();
      }
    }
  }, [name, className]);

  return <i ref={iconRef} data-lucide={name} className={className} style={{ display: 'inline-block' }}></i>;
};

const CalendarIcon = (props) => <LucideIcon name="calendar" {...props} />;
const UsersIcon = (props) => <LucideIcon name="users" {...props} />;
const HomeIcon = (props) => <LucideIcon name="home" {...props} />;
const SettingsIcon = (props) => <LucideIcon name="settings" {...props} />;
const LogOutIcon = (props) => <LucideIcon name="log-out" {...props} />;
const ChevronLeftIcon = (props) => <LucideIcon name="chevron-left" {...props} />;
const ChevronRightIcon = (props) => <LucideIcon name="chevron-right" {...props} />;
const ChevronDownIcon = (props) => <LucideIcon name="chevron-down" {...props} />;
const AlertCircleIcon = (props) => <LucideIcon name="alert-circle" {...props} />;
const CheckIcon = (props) => <LucideIcon name="check" {...props} />;
const XIcon = (props) => <LucideIcon name="x" {...props} />;

// Initial room inventory
const INITIAL_INVENTORY = {
  'Farm House': [
    { id: 'fh1', name: 'Farmhouse #1', displayName: 'Farmhouse #1', bathroom: true, beds: '1 Queen Bed', price: 150 },
    { id: 'fh2', name: 'Farmhouse #2', displayName: 'Farmhouse #2', bathroom: true, beds: '2 Single Beds', price: 150 },
    { id: 'fh3', name: 'Farmhouse #3', displayName: 'Farmhouse #3', bathroom: true, beds: '1 Queen Bed', price: 150 },
    { id: 'fh4', name: 'Farmhouse #4', displayName: 'Farmhouse #4', bathroom: false, beds: '2 Single Beds', price: 100 },
    { id: 'fh5', name: 'Farmhouse #5', displayName: 'Farmhouse #5', bathroom: false, beds: '1 Queen Bed', price: 100 },
    { id: 'fh6', name: 'Farmhouse #6', displayName: 'Farmhouse #6', bathroom: false, beds: '2 Single Beds', price: 100 },
  ],
  'Club House': [
    { id: 'ch1', name: 'Clubhouse #1', displayName: 'Clubhouse #1', bathroom: true, beds: '1 Queen Bed', price: 150 },
    { id: 'ch2', name: 'Clubhouse #2', displayName: 'Clubhouse #2', bathroom: true, beds: '2 Single Beds', price: 150 },
    { id: 'ch3', name: 'Clubhouse #3', displayName: 'Clubhouse #3', bathroom: true, beds: '1 Queen Bed', price: 150 },
    { id: 'ch4', name: 'Clubhouse #4', displayName: 'Clubhouse #4', bathroom: false, beds: '2 Single Beds', price: 100 },
    { id: 'ch5', name: 'Clubhouse #5', displayName: 'Clubhouse #5', bathroom: false, beds: '1 Queen Bed', price: 100 },
    { id: 'ch6', name: 'Clubhouse #6', displayName: 'Clubhouse #6', bathroom: false, beds: '2 Single Beds', price: 100 },
  ],
  'Lazy Lodge': [
    { id: 'll1', name: 'Lazy Lodge #1', displayName: 'Lazy Lodge #1', bathroom: true, beds: '1 Queen Bed', price: 200 },
    { id: 'll2', name: 'Lazy Lodge #2', displayName: 'Lazy Lodge #2', bathroom: true, beds: '1 Queen Bed', price: 200 },
  ]
};

// Flatten inventory for booking selection
const getAllRooms = (inventory) => {
  const rooms = [];
  Object.entries(inventory).forEach(([building, buildingRooms]) => {
    buildingRooms.forEach(room => {
      rooms.push({ ...room, building });
    });
  });
  return rooms;
};

const MEAL_TIMES = {
  breakfast: '8:00 AM',
  lunch: '1:30 PM',
  barSupper: '6:00 PM'
};
const IS_MEAL_AVAILABLE = (dateStr, mealType) => {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth(); // 0-11
  const dayOfWeek = date.getDay(); // 0-6

  // Monday: No Meal Service
  if (dayOfWeek === 1) return false;

  const isSeasonA = month >= 3 && month <= 8;

  if (isSeasonA) {
    // Season A: April-September (Sunday Bar Supper, Tuesday Breakfast)
    if (dayOfWeek === 0 && (mealType === 'breakfast' || mealType === 'lunch')) return false;
    if (dayOfWeek === 2 && (mealType === 'lunch' || mealType === 'barSupper')) return false;
  } else {
    // Season B: October-March (Standard: Sunday Breakfast, Tuesday Bar Supper)
    if (dayOfWeek === 0 && (mealType === 'lunch' || mealType === 'barSupper')) return false;
    if (dayOfWeek === 2 && (mealType === 'breakfast' || mealType === 'lunch')) return false;
  }
  return true;
};
const calculateBookingTotal = (roomBookings, getRoomById) => {
  let total = 0;
  roomBookings.forEach(rb => {
    const room = getRoomById(rb.roomId);
    if (room && room.price) {
      total += room.price * rb.dates.length;
    }
  });
  return total;
};

// Payment Modal
const PaymentModal = ({ isOpen, onClose, booking, currentUser, onPaymentSuccess }) => {
  const [paymentData, setPaymentData] = useState({
    cardholder: currentUser || '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !booking) return null;

  const handlePay = () => {
    if (!paymentData.cardholder || !paymentData.cardNumber || !paymentData.expiry || !paymentData.cvv) {
      alert("Please fill in all payment details");
      return;
    }
    setIsProcessing(true);
    // Mock processing delay
    setTimeout(() => {
      const refId = 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      onPaymentSuccess(booking.id, booking.paymentAmount || 150, refId);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="bg-emerald-900 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 hover:rotate-90 transition-transform">
            <LucideIcon name="x" className="w-6 h-6 opacity-60 hover:opacity-100" />
          </button>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-light">Secure Checkout</h3>
            <div className="flex gap-2">
              <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                <span className="text-[8px] font-black italic">VISA</span>
              </div>
              <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                <span className="text-[8px] font-black italic">MC</span>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Room Total</p>
            <p className="text-4xl font-light tracking-tight">${(booking.paymentAmount || 0).toFixed(2)}</p>
            <p className="text-[9px] text-emerald-400 mt-2 font-medium">Processing for {booking.roomName}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Cardholder Name</label>
              <input 
                type="text" 
                value={paymentData.cardholder} 
                onChange={(e) => setPaymentData({...paymentData, cardholder: e.target.value})}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Card Number</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="0000 0000 0000 0000" 
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800" 
                />
                <LucideIcon name="credit-card" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Expiry Date</label>
                <input 
                  type="text" 
                  placeholder="MM / YY" 
                  value={paymentData.expiry}
                  onChange={(e) => setPaymentData({...paymentData, expiry: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800 text-center" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">CVV</label>
                <input 
                  type="text" 
                  placeholder="•••" 
                  value={paymentData.cvv}
                  onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800 text-center" 
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-4 bg-emerald-900 text-white rounded-2xl hover:bg-emerald-950 transition-all font-black text-lg shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Complete Payment'}
            {!isProcessing && <LucideIcon name="shield-check" className="w-6 h-6 text-amber-300" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings Modal for Password Change
const SettingsModal = ({ isOpen, onClose, currentUser }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: currentUser, oldPassword, newPassword })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.error) {
          setError(data.error);
        } else {
          setSuccess("Password updated successfully!");
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(onClose, 2000);
        }
      })
      .catch(err => {
        setLoading(false);
        setError("Connection failed");
      });
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-8 bg-emerald-900 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 hover:rotate-90 transition-transform">
            <LucideIcon name="x" className="w-6 h-6 opacity-60 hover:opacity-100" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <LucideIcon name="shield-check" className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Security Settings</h2>
              <p className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest">Update Your Credentials</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 animate-pulse">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">{success}</div>}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-stone-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-stone-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-stone-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-950 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};


// Confirmation Modal Component
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">{message}</h3>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Export Modal Component


// Login View
const LoginView = ({ username, setUsername, password, setPassword, handleLogin }) => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-96 bg-emerald-900 -skew-y-6 -translate-y-48 z-0"></div>

      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-12 border border-stone-100 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-12">
          <div className="w-32 h-32 mx-auto mb-8 p-6 bg-stone-50 rounded-full shadow-inner border border-stone-100 flex items-center justify-center">
            <img src="logo.png" alt="Tuscarora Club" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-light text-stone-900 tracking-tight leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            The Tuscarora Club
          </h1>
          <div className="w-20 h-0.5 bg-amber-400 mx-auto my-6"></div>
          <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-[10px]">Reservation Portal</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Member Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full h-16 pl-14 pr-6 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-stone-800 outline-none"
                placeholder="ChrisP, VS1, admin..."
              />
              <LucideIcon name="user" className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-300" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full h-16 pl-14 pr-6 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-stone-800 outline-none"
                placeholder="••••••••"
              />
              <LucideIcon name="lock" className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-300" />
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-emerald-900 text-white h-16 rounded-2xl hover:bg-emerald-950 transition-all font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-900/10 active:scale-95 flex items-center justify-center gap-3 transition-all duration-300 mt-4"
          >
            Access Portal
            <LucideIcon name="chevron-right" className="w-5 h-5" />
          </button>

          <div className="pt-8 text-center border-t border-stone-100">
            <p className="text-[9px] text-stone-300 font-black uppercase tracking-[0.2em] mb-4">Authorized Members</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['ChrisP', 'VS1', 'VS2', 'VS3', 'VS4', 'admin'].map(name => (
                <button
                  key={name}
                  onClick={() => setUsername(name)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${username === name ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-400 border-stone-100 hover:text-emerald-700 hover:bg-emerald-50'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-8 text-stone-400 text-[10px] font-bold uppercase tracking-widest z-10 opacity-50">Tuscarora Club 2026 • Private Members Only</p>
    </div>
  );
};

// Calendar View
const CalendarView = ({
  currentDate,
  calendarView,
  setCalendarView,
  navigateCalendar,
  setCurrentDate,
  startBooking,
  inventory,
  isRoomAvailable,
  bookings,
  selectedCells,
  setSelectedCells,
  setBookingMode,
  currentUser,
  hasRentedLazyLodge,
  onEditBooking
}) => {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getThreeWeeks = (date) => {
    const startOfCentralWeek = new Date(date);
    startOfCentralWeek.setDate(date.getDate() - date.getDay());

    const startOfThreeWeeks = new Date(startOfCentralWeek);
    startOfThreeWeeks.setDate(startOfCentralWeek.getDate() - 7);

    const days = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(startOfThreeWeeks);
      d.setDate(startOfThreeWeeks.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const monthHeaderDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthDays = calendarView === 'month' ? getDaysInMonth(currentDate) : [];
  const threeWeeks = calendarView === 'week' ? getThreeWeeks(currentDate) : [];
  const displayDays = calendarView === 'month' ? monthDays : threeWeeks;

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const exportCalendarPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [
      'Date', 'Day', 'Member', 'Room', 'Building',
      'Occupant', 'Arrival',
      'Brk', 'Lun', 'Sup', 'P-Brk', 'P-Lun', 'P-Sup'
    ];

    const rows = [];
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    bookings.forEach(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);

      if (bookingStart <= endDate && bookingEnd >= startDate) {
        let currentDay = new Date(Math.max(bookingStart, startDate));
        const lastDay = new Date(Math.min(bookingEnd, endDate));

        const guestsCount = booking.guests || 1;
        const isMemberRoom = booking.isGuest === 'GUEST' ? false : (booking.isGuest === 'MEMBER' || booking.isGuest === false);
        const isCottageStay = booking.stayingInCottage;

        const occupants = [];
        if (isMemberRoom || isCottageStay) {
          occupants.push({ name: booking.member, type: 'Member' });
          for (let i = 1; i < guestsCount; i++) {
            occupants.push({ name: `Guest of ${booking.member}`, type: 'Guest' });
          }
        } else {
          const label = booking.guestName || `Guest of ${booking.member}`;
          for (let i = 0; i < guestsCount; i++) {
            occupants.push({ name: label, type: 'Guest' });
          }
        }

        while (currentDay < lastDay) {
          const dateStr = formatDate(currentDay);
          const dayOfWeek = currentDay.toLocaleDateString('en-US', { weekday: 'short' });
          const formattedDate = currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const meals = booking.dailyMeals?.[dateStr] || {};

          occupants.forEach(occ => {
            rows.push([
              formattedDate,
              dayOfWeek,
              booking.member,
              booking.roomName,
              booking.building,
              occ.name,
              booking.memberArrival || '',
              meals.breakfast ? '1' : '0',
              meals.lunch ? '1' : '0',
              meals.barSupper ? '1' : '0',
              meals.packedBreakfast ? '1' : '0',
              meals.packedLunch ? '1' : '0',
              meals.packedBarSupper ? '1' : '0'
            ]);
          });

          currentDay.setDate(currentDay.getDate() + 1);
        }
      }
    });

    rows.sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      if (dateA - dateB !== 0) return dateA - dateB;
      return a[2].localeCompare(b[2]);
    });

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    doc.text(`Calendar Export: ${monthName}`, 14, 15);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 10 },
        7: { cellWidth: 7 },
        8: { cellWidth: 7 },
        9: { cellWidth: 7 },
        10: { cellWidth: 10 },
        11: { cellWidth: 10 },
        12: { cellWidth: 10 }
      }
    });

    doc.save(`calendar-${monthName.replace(' ', '-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 mb-1">
            <LucideIcon name="calendar" className="w-5 h-5" />
            <h2 className="text-3xl font-light tracking-tight">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          {calendarView === 'week' ? (
            <p className="text-sm text-stone-500">
              Select available white cells to start your booking.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              Click any day to view details and check availability.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-sm">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${calendarView === 'month' ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-stone-900/5' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Month View
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${calendarView === 'week' ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-stone-900/5' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Grid View
            </button>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-sm">
            <button
              onClick={() => navigateCalendar(-1)}
              className="px-4 py-1.5 hover:bg-white rounded-lg transition-all text-stone-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
            >
              <LucideIcon name="chevron-left" className="w-4 h-4" />
              <span>{calendarView === 'month' ? 'Prev Month' : 'Prev Week'}</span>
            </button>
            <div className="w-px h-4 bg-stone-200 mx-1"></div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-1.5 hover:bg-white rounded-lg text-[10px] font-black uppercase tracking-widest text-stone-700 transition-all active:scale-95"
            >
              Today
            </button>
            <div className="w-px h-4 bg-stone-200 mx-1"></div>
            <button
              onClick={() => navigateCalendar(1)}
              className="px-4 py-1.5 hover:bg-white rounded-lg transition-all text-stone-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
            >
              <span>{calendarView === 'month' ? 'Next Month' : 'Next Week'}</span>
              <LucideIcon name="chevron-right" className="w-4 h-4" />
            </button>
          </div>

          {calendarView === 'month' && (
            <button
              onClick={exportCalendarPDF}
              className="px-4 py-2 bg-emerald-100/50 border border-emerald-200 text-emerald-900 rounded-xl hover:bg-emerald-200/50 transition-colors shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <LucideIcon name="download" className="w-4 h-4 text-emerald-600" />
              <span>Download Monthly Report</span>
            </button>
          )}
        </div>
      </div>

      {calendarView === 'week' && selectedCells.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
            <LucideIcon name="info" className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">How to Book</h4>
            <p className="text-sm text-emerald-800/80 leading-relaxed">
              Click on the empty cells in the grid below to select the dates and rooms you want. You can select multiple rooms and dates at once.
            </p>
          </div>
        </div>
      )}

      {/* Calendar content */}
      {calendarView === 'month' ? (
        <div className="bg-white border border-stone-200 rounded-[2rem] p-6 shadow-sm">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {monthHeaderDays.map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4">
            {displayDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="aspect-square opacity-0"></div>;

              const dateStr = formatDate(day);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const isToday = formatDate(now) === dateStr;
              const isPast = day < now;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isPast) return;
                    setCurrentDate(day);
                    setCalendarView('week');
                  }}
                  className={`min-h-[140px] border-2 rounded-2xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${isToday ? 'border-emerald-500 bg-emerald-50 shadow-emerald-900/5' : 'border-stone-100 hover:border-emerald-200 bg-white'
                    } ${isPast ? 'opacity-40 cursor-not-allowed bg-stone-50 grayscale' : ''}`}
                >
                  <div className="text-sm font-bold text-stone-400 mb-3 flex justify-between items-center">
                    <span className={isToday ? 'text-emerald-700' : ''}>{day.getDate()}</span>
                    {isToday && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {getAllRooms(inventory).map(room => {
                      const booking = bookings.find(b =>
                        b.roomId === room.id &&
                        dateStr >= b.startDate &&
                        dateStr < b.endDate
                      );
                      if (!booking) return null;

                      const isOwn = booking.member === currentUser;
                      return (
                        <div
                          key={room.id}
                          className={`text-[9px] px-2 py-0.5 rounded-md truncate font-medium flex items-center gap-1 shadow-sm ${isOwn ? 'bg-blue-600 text-white' : 'bg-red-50 text-red-800'
                            }`}
                        >
                          <span className="opacity-70">{room.id.toUpperCase()}</span>
                          <span className="truncate">
                            {booking.isGuest ? (booking.guestName || `${booking.member} (G)`) : (booking.member === currentUser ? 'You' : booking.member)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-stone-200 shadow-sm bg-stone-50/50 backdrop-blur-sm">
          <div className="min-w-[1200px] p-2">
            <div className="grid rounded-2xl overflow-hidden shadow-sm border border-stone-200" style={{ gridTemplateColumns: '150px repeat(21, minmax(0, 1fr))' }}>
              {/* Header Row */}
              <div className="bg-stone-100/80 p-2 border-r border-b border-stone-200 sticky left-0 z-20 backdrop-blur-md flex flex-col justify-center items-center gap-1.5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 text-center leading-tight whitespace-nowrap">
                  Room Selection
                </span>
              </div>
              {threeWeeks.map((day, idx) => {
                const dateStr = formatDate(day);
                const isToday = formatDate(new Date()) === dateStr;
                const dayOfWeek = day.getDay();
                const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
                const isMon = dayOfWeek === 1;

                return (
                  <div
                    key={`header-${idx}`}
                    className={`p-3 text-center border-r border-b border-stone-200 transition-colors
                      ${isToday ? 'bg-emerald-600 text-white border-emerald-500 z-10 scale-y-105 shadow-lg' : isWeekend ? 'bg-amber-50/50 text-stone-900 font-medium' : 'bg-stone-50 text-stone-500'}
                      ${isMon ? 'border-l-2 border-stone-400' : ''}`}
                  >
                    <div className="text-[10px] uppercase tracking-tighter opacity-70 leading-none mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-bold leading-none">{day.getDate()}</div>
                  </div>
                );
              })}

              {/* Body Rows */}
              {getAllRooms(inventory).map(room => (
                <React.Fragment key={room.id}>
                  <div className="bg-white p-3 text-xs font-bold text-stone-700 truncate border-r border-b border-stone-200 sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col">
                      <span className="truncate">{room.name}</span>
                      <span className="text-[9px] text-stone-400 font-normal uppercase tracking-wide">{room.beds}</span>
                    </div>
                  </div>
                  {threeWeeks.map((day, idx) => {
                    const dateStr = formatDate(day);
                    const booking = bookings.find(b =>
                      b.roomId === room.id &&
                      dateStr >= b.startDate &&
                      dateStr < b.endDate
                    );
                    const dayOfWeek = day.getDay();
                    const isMon = dayOfWeek === 1;
                    const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
                    const isSelected = selectedCells.some(cell => cell.roomId === room.id && cell.date === dateStr);

                    // Lazy Lodge logic
                    const isLazyLodge = room.id === 'll1' || room.id === 'll2';
                    const year = new Date(dateStr).getFullYear();
                    const userHasUsedLL = hasRentedLazyLodge(currentUser, dateStr);
                    const showProvisionalIndicator = !booking && isLazyLodge && userHasUsedLL;
                    const isProvisionalBooking = booking && booking.provisional;
                    const canOverrideProvisional = isProvisionalBooking && isLazyLodge && !userHasUsedLL;
                    const willBeProvisional = isSelected && isLazyLodge && userHasUsedLL;

                    const isOwnBooking = booking && !booking.provisional && (booking.member === currentUser || currentUser === 'admin');

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = day < today;

                    // Identify the Master Range Room
                    const uniqueSelectedRooms = [...new Set(selectedCells.map(c => c.roomId))];
                    const primaryRoomId = uniqueSelectedRooms.length > 0 ? selectedCells[0].roomId : room.id;
                    const isPrimaryRoom = room.id === primaryRoomId;
                    const primaryRoomSelections = selectedCells.filter(c => c.roomId === primaryRoomId);

                    const roomSelections = selectedCells.filter(cell => cell.roomId === room.id);
                    const otherRooms = selectedCells.filter(cell => cell.roomId !== room.id);

                    const handleCellClick = () => {
                      if (isOwnBooking) {
                        onEditBooking(booking);
                        return;
                      }
                      if (isPast) return;
                      if (booking && !canOverrideProvisional) return;

                      if (isPrimaryRoom) {
                        // Logic for the Master Range (Primary Room)
                        if (roomSelections.length === 0) {
                          setSelectedCells([{ roomId: room.id, date: dateStr }]);
                        } else {
                          const isAlreadySelected = roomSelections.some(c => c.date === dateStr);
                          if (isAlreadySelected) {
                            // Deselect date, but warn if it shrinks below what guest rooms need? 
                            // For simplicity, let them deselect and we'll auto-shrink guest rooms.
                            const newPrimarySelections = roomSelections.filter(c => c.date !== dateStr);

                            // Auto-sync guest rooms: remove this dropped date from ALL guest rooms
                            const newOtherRooms = otherRooms.filter(c => c.date !== dateStr);
                            setSelectedCells([...newOtherRooms, ...newPrimarySelections]);
                          } else {
                            // Add/Fill Range logic for Primary Room
                            const clickedTime = new Date(dateStr).getTime();
                            let closestDate = roomSelections[0].date;
                            let minDiff = Math.abs(new Date(closestDate).getTime() - clickedTime);

                            roomSelections.forEach(c => {
                              const diff = Math.abs(new Date(c.date).getTime() - clickedTime);
                              if (diff < minDiff) {
                                minDiff = diff;
                                closestDate = c.date;
                              }
                            });

                            const start = closestDate < dateStr ? closestDate : dateStr;
                            const end = closestDate > dateStr ? closestDate : dateStr;

                            let hasConflict = false;
                            let current = new Date(start + 'T00:00:00');
                            const endDate = new Date(end + 'T00:00:00');
                            const newCells = [];

                            while (current <= endDate) {
                              const dStr = current.toISOString().split('T')[0];
                              if (!roomSelections.some(c => c.date === dStr)) {
                                const conflict = bookings.find(b =>
                                  b.roomId === room.id &&
                                  dStr >= b.startDate && dStr < b.endDate &&
                                  !(b.provisional && canOverrideProvisional)
                                );
                                if (conflict) {
                                  hasConflict = true;
                                  break;
                                }
                                newCells.push({ roomId: room.id, date: dStr });
                              }
                              current.setDate(current.getDate() + 1);
                            }

                            if (hasConflict) {
                              alert("Cannot extend Master Range: Primary room overlaps with an existing booking.");
                            } else {
                              // Gather the new full list of Primary Dates
                              const updatedPrimaryDates = [...roomSelections, ...newCells].map(c => c.date);

                              // Auto-Expand all currently ACTIVE guest rooms to match the new Master Range
                              // (Skip guest rooms that aren't selected at all yet)
                              const activeGuestRoomIds = [...new Set(otherRooms.map(c => c.roomId))];
                              let guestConflictFound = false;
                              const syncedGuestCells = [];

                              activeGuestRoomIds.forEach(gRoomId => {
                                updatedPrimaryDates.forEach(dStr => {
                                  const gConflict = bookings.find(b => b.roomId === gRoomId && dStr >= b.startDate && dStr < b.endDate);
                                  if (gConflict) guestConflictFound = true;
                                  syncedGuestCells.push({ roomId: gRoomId, date: dStr });
                                });
                              });

                              if (guestConflictFound) {
                                alert("Cannot extend Master Range: One of your selected Guest Rooms is already booked on these new dates.");
                              } else {
                                setSelectedCells([...roomSelections, ...newCells, ...syncedGuestCells]);
                              }
                            }
                          }
                        }
                      } else {
                        // Logic for Guest Rooms (Auto-Snap to Master Range)
                        if (primaryRoomSelections.length === 0) return; // Failsafe (should never hit this)

                        // If this guest room is already selected, click toggles it completely OFF
                        if (roomSelections.length > 0) {
                          setSelectedCells(otherRooms);
                          return;
                        }

                        // Otherwise, snap this entire room ON to exactly perfectly match the Master Range
                        let hasConflict = false;
                        const newGuestCells = [];

                        primaryRoomSelections.forEach(pCell => {
                          const conflict = bookings.find(b => b.roomId === room.id && pCell.date >= b.startDate && pCell.date < b.endDate);
                          if (conflict) hasConflict = true;
                          newGuestCells.push({ roomId: room.id, date: pCell.date });
                        });

                        if (hasConflict) {
                          alert("Cannot add room: This room is unfortunately booked during your Master Range dates.");
                        } else {
                          setSelectedCells([...selectedCells, ...newGuestCells]);
                        }
                      }
                    };

                    return (
                      <div
                        key={`${room.id}-${idx}`}
                        onClick={handleCellClick}
                        className={`h-14 transition-all duration-150 cursor-pointer flex items-center justify-center p-1 border-r border-b border-stone-200 group
                        ${isPast ? 'bg-stone-100/50 cursor-not-allowed opacity-30 grayscale' :
                            booking && !canOverrideProvisional ? (isOwnBooking ? 'bg-blue-50/50 hover:bg-blue-100' : 'bg-red-50/30 cursor-not-allowed') :
                              isProvisionalBooking ? 'bg-amber-100/50 hover:bg-amber-200' :
                                willBeProvisional ? 'bg-amber-500 shadow-inner' :
                                  isSelected ? (isPrimaryRoom ? 'bg-emerald-600 shadow-inner z-10 scale-105 rounded-sm ring-1 ring-emerald-400' : 'bg-amber-600 shadow-inner z-10 scale-105 rounded-sm ring-1 ring-amber-400') :
                                    isWeekend ? 'bg-amber-50/20 hover:bg-emerald-50/50' :
                                      'bg-white hover:bg-emerald-50/50'}
                        ${isMon ? 'border-l-2 border-stone-400' : ''}`}
                      >
                        {booking && !canOverrideProvisional ? (
                          <div className={`w-full h-full rounded-lg text-[9px] flex flex-col items-center justify-center px-1 truncate font-medium shadow-sm leading-tight transition-transform scale-95 group-hover:scale-100
                            ${isProvisionalBooking ? 'bg-amber-600 text-white' : booking.member === currentUser ? 'bg-blue-600 text-white ring-2 ring-blue-500/20' : 'bg-red-600/90 text-white'}`}>
                            <div className="truncate w-full text-center">
                              {isProvisionalBooking ? 'Provisional' : (booking.isGuest && booking.guestName) ? booking.guestName : (booking.member === currentUser ? 'You' : booking.member)}
                            </div>
                            {booking.isGuest && !isProvisionalBooking && <div className="text-[8px] opacity-70 font-bold uppercase tracking-wider mt-0.5">Guest</div>}
                          </div>
                        ) : isProvisionalBooking && canOverrideProvisional ? (
                          <div className="w-full h-full bg-amber-600/90 text-white rounded-lg text-[9px] flex flex-col items-center justify-center px-1 truncate font-medium shadow-sm leading-tight transition-all hover:scale-105 active:scale-95">
                            <div className="truncate w-full text-center">Provisional</div>
                            <div className="text-[7px] opacity-90 uppercase tracking-tighter">Override</div>
                          </div>
                        ) : willBeProvisional ? (
                          <div className="flex flex-col items-center justify-center gap-0.5 animate-in zoom-in-50 duration-200">
                            <LucideIcon name="check" className="w-4 h-4 text-white" />
                            <div className="text-[7px] text-white font-bold uppercase tracking-widest">Prov.</div>
                          </div>
                        ) : isSelected ? (
                          <div className="flex flex-col items-center justify-center gap-0.5 animate-in zoom-in-75 duration-200">
                            {(() => {
                              const roomSelectedDates = selectedCells.filter(c => c.roomId === room.id).map(c => c.date);
                              roomSelectedDates.sort((a, b) => new Date(a) - new Date(b));

                              // Check if cell is the start or end of ANY contiguous block
                              let isBlockStart = false;
                              let isBlockEnd = false;

                              const currTime = new Date(dateStr).getTime();
                              const prevTime = currTime - (24 * 60 * 60 * 1000);
                              const nextTime = currTime + (24 * 60 * 60 * 1000);

                              const prevDateStr = new Date(prevTime).toISOString().split('T')[0];
                              const nextDateStr = new Date(nextTime).toISOString().split('T')[0];

                              if (!roomSelectedDates.includes(prevDateStr)) isBlockStart = true;
                              if (!roomSelectedDates.includes(nextDateStr)) isBlockEnd = true;

                              if (isBlockStart && isBlockEnd && roomSelectedDates.length === 1) {
                                return (
                                  <>
                                    <LucideIcon name="log-in" className="w-4 h-4 text-white" />
                                    <div className="text-[7px] text-white font-bold uppercase tracking-widest opacity-90">{isPrimaryRoom ? 'Primary' : 'Guest'}</div>
                                    <div className="text-[10px] text-white font-bold leading-none">Start</div>
                                  </>
                                );
                              } else if (isBlockStart) {
                                return (
                                  <>
                                    <LucideIcon name="check" className="w-4 h-4 text-white" />
                                    <div className="text-[7px] text-white font-bold uppercase tracking-widest">{isPrimaryRoom ? 'Primary' : 'Guest'}</div>
                                  </>
                                );
                              } else if (isBlockEnd) {
                                return (
                                  <>
                                    <LucideIcon name="log-out" className="w-4 h-4 text-white" />
                                    <div className="text-[7px] text-white font-bold uppercase tracking-widest">{isPrimaryRoom ? 'Primary' : 'Guest'}</div>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <div className="flex items-center justify-center gap-1 opacity-50">
                                      <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <div className="text-[7px] text-white font-bold uppercase tracking-widest">{isPrimaryRoom ? 'Primary' : 'Guest'}</div>
                                  </>
                                );
                              }
                            })()}
                          </div>
                        ) : showProvisionalIndicator ? (
                          <div className="text-2xl font-black text-stone-200 select-none group-hover:text-emerald-500/20 transition-colors">P</div>
                        ) : (
                          <div className="w-1 h-1 bg-stone-100 rounded-full group-hover:w-2 group-hover:h-2 group-hover:bg-emerald-200 transition-all"></div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend and Actions */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-8 gap-y-3">
            <LegendItem color="bg-emerald-100" ring="ring-emerald-500" label="Current Day" />
            <LegendItem color="bg-blue-600" label="Selected" />
            <LegendItem color="bg-white border-2 border-stone-100" label="Available" />
            <LegendItem color="bg-blue-600" label="My Stays" />
            <LegendItem color="bg-red-600" label="Booked" />
            <LegendItem color="bg-amber-600" text="P" label="Lazy Lodge Prov." />
          </div>

          {/* Selection Actions */}
          {calendarView === 'week' && selectedCells.length > 0 && (
            <div className="flex items-center gap-4 bg-emerald-900 text-white p-2 pl-6 rounded-2xl shadow-xl shadow-emerald-900/20 animate-in slide-in-from-right-4">
              <div className="text-sm">
                <span className="font-black text-amber-300 mr-1">{selectedCells.length}</span>
                {selectedCells.length === 1 ? 'cell' : 'cells'} selected
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedCells([])}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/10 rounded-xl transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setBookingMode('details')}
                  className="px-8 py-3 bg-amber-200 text-emerald-950 rounded-xl hover:bg-white transition-all font-bold text-sm shadow-lg active:scale-95"
                >
                  Confirm Selection →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, ring, text, label }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 ${color} rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-offset-2 ${ring ? `ring-2 ${ring}` : ''}`}>
      {text}
    </div>
    <span className="text-xs font-medium text-stone-500">{label}</span>
  </div>
);




// Multi-Room Booking Details Page
const MultiRoomBookingDetails = ({
  selectedCells,
  setSelectedCells,
  setBookingMode,
  getRoomById,
  confirmMultiRoomBooking,
  mealTimesConfig,
  currentUser,
  isPayFlow = false
}) => {
  const [step, setStep] = React.useState(1); // 1: Occupancy, 2: Meals, 3: Review, 4: Payment (if payflow)
  const [adminBookingMember, setAdminBookingMember] = React.useState('');
  const [paymentData, setPaymentData] = React.useState({
    cardholder: effectiveMember,
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  const effectiveMember = currentUser === 'admin' ? (adminBookingMember || 'Admin Booking') : currentUser;
  const bookingTotal = calculateBookingTotal(roomBookings, getRoomById);

  // Group selected cells by room into continuous date ranges
  const groupSelectionsByRoom = () => {
    const roomGroups = {};

    selectedCells.forEach(cell => {
      if (!roomGroups[cell.roomId]) {
        roomGroups[cell.roomId] = [];
      }
      roomGroups[cell.roomId].push(cell.date);
    });

    // Sort dates for each room and create continuous ranges
    const roomBookings = [];
    Object.entries(roomGroups).forEach(([roomId, dates]) => {
      dates.sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00'));

      // Group into continuous date ranges
      let currentRange = [dates[0]];
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1] + 'T00:00:00');
        const currDate = new Date(dates[i] + 'T00:00:00');
        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          currentRange.push(dates[i]);
        } else {
          // Start new range
          const room = getRoomById(roomId);
          roomBookings.push({
            roomId,
            roomName: room?.name || roomId,
            building: room?.building || '',
            startDate: currentRange[0],
            endDate: getNextDay(currentRange[currentRange.length - 1]),
            dates: [...currentRange],
            guestNames: [''],
            guests: 1,
            dietary: '',
            dailyMeals: {}
          });
          currentRange = [dates[i]];
        }
      }

      // Add final range
      if (currentRange.length > 0) {
        const room = getRoomById(roomId);
        roomBookings.push({
          roomId,
          roomName: room?.name || roomId,
          building: room?.building || '',
          startDate: currentRange[0],
          endDate: getNextDay(currentRange[currentRange.length - 1]),
          dates: [...currentRange],
          guestNames: [''],
          guests: 1,
          dietary: '',
          dailyMeals: {}
        });
      }
    });

    return roomBookings;
  };

  const getNextDay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const isMealAvailable = (dateStr, mealType) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.getMonth();
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 1) return false;

    const isSeasonA = month >= 3 && month <= 8;

    if (isSeasonA) {
      if (dayOfWeek === 0 && (mealType === 'breakfast' || mealType === 'lunch')) return false;
      if (dayOfWeek === 2 && (mealType === 'lunch' || mealType === 'barSupper')) return false;
    } else {
      if (dayOfWeek === 0 && (mealType === 'lunch' || mealType === 'barSupper')) return false;
      if (dayOfWeek === 2 && (mealType === 'breakfast' || mealType === 'lunch')) return false;
    }
    return true;
  };

  const initializeDefaultMeals = (dates) => {
    const meals = {};
    dates.forEach((date, index) => {
      const isFirstDay = index === 0;
      const isLastDay = index === dates.length - 1;
      const isSingleDay = dates.length === 1;

      meals[date] = {
        breakfast: false,
        lunch: false,
        barSupper: false,
        packedBreakfast: false,
        packedLunch: false,
        packedBarSupper: false
      };

      // Default: Start with bar supper on first day, end with lunch on last day
      if (isSingleDay) {
        // Single day: Lunch + Dinner (Supper) by default
        meals[date].lunch = isMealAvailable(date, 'lunch');
        meals[date].barSupper = isMealAvailable(date, 'barSupper');
      } else if (isFirstDay) {
        // First day: Lunch + Dinner (Supper) by default
        meals[date].lunch = isMealAvailable(date, 'lunch');
        meals[date].barSupper = isMealAvailable(date, 'barSupper');
      } else if (isLastDay) {
        // Last day: Breakfast + Lunch by default
        meals[date].breakfast = isMealAvailable(date, 'breakfast');
        meals[date].lunch = isMealAvailable(date, 'lunch');
      } else {
        // Middle days: All available meals by default
        meals[date].breakfast = isMealAvailable(date, 'breakfast');
        meals[date].lunch = isMealAvailable(date, 'lunch');
        meals[date].barSupper = isMealAvailable(date, 'barSupper');
      }
    });

    return meals;
  };

  const [roomBookings, setRoomBookings] = React.useState(() => {
    const initial = groupSelectionsByRoom();
    return initial.map((rb, idx) => ({
      ...rb,
      isGuest: idx !== 0, // First room is member-occupied by default
      guestNames: [idx === 0 ? effectiveMember : ''],
      dietary: '',
      dailyMeals: initializeDefaultMeals(rb.dates)
    }));
  });

  const [partyArrivalTime, setPartyArrivalTime] = React.useState('14:00');
  const [stayingInCottage, setStayingInCottage] = React.useState(false);


  const updateRoomBooking = (index, field, value) => {
    const updated = [...roomBookings];
    updated[index] = { ...updated[index], [field]: value };

    // If we just marked a room as guest and it was the only member room,
    // or if we just marked a room as member stay, update cottage state
    if (field === 'isGuest') {
      if (value === false) {
        setStayingInCottage(false);
        // Unmark others
        updated.forEach((rb, i) => {
          if (i !== index) rb.isGuest = true;
        });
        // If switching to member, ensure first name is effective user
        if (!updated[index].guestNames[0] || updated[index].guestNames[0] === 'Guest') {
          updated[index].guestNames[0] = effectiveMember;
        }
      } else {
        const anyMemberStay = updated.some(rb => !rb.isGuest);
        if (!anyMemberStay) setStayingInCottage(true);
      }
    }

    setRoomBookings(updated);
  };


  const setMemberOccupied = (index) => {
    setStayingInCottage(false);
    setRoomBookings(roomBookings.map((rb, i) => ({
      ...rb,
      isGuest: i !== index,
      guestNames: i === index ? (rb.guestNames[0] === currentUser || rb.guestNames[0] === effectiveMember ? rb.guestNames : [effectiveMember, ...rb.guestNames.slice(1)]) : rb.guestNames
    })));
  };


  const updateGuestName = (roomIdx, guestIdx, name) => {
    const updated = [...roomBookings];
    const names = [...updated[roomIdx].guestNames];
    names[guestIdx] = name;
    updated[roomIdx].guestNames = names;
    setRoomBookings(updated);
  };

  const addGuest = (roomIdx) => {
    const updated = [...roomBookings];
    updated[roomIdx].guestNames = [...updated[roomIdx].guestNames, ''];
    updated[roomIdx].guests = updated[roomIdx].guestNames.length;
    setRoomBookings(updated);
  };

  const removeGuest = (roomIdx, guestIdx) => {
    const updated = [...roomBookings];
    if (updated[roomIdx].guestNames.length > 1) {
      updated[roomIdx].guestNames = updated[roomIdx].guestNames.filter((_, i) => i !== guestIdx);
      updated[roomIdx].guests = updated[roomIdx].guestNames.length;
      setRoomBookings(updated);
    }
  };


  const updateMeal = (roomIndex, dateStr, mealField, value) => {
    const updated = [...roomBookings];
    updated[roomIndex].dailyMeals[dateStr] = {
      ...updated[roomIndex].dailyMeals[dateStr],
      [mealField]: value
    };
    setRoomBookings(updated);
  };

  const handleConfirm = () => {
    // Validate guest dates against member dates
    let memberMinDate = null;
    let memberMaxDate = null;
    const hasGuests = roomBookings.some(rb => rb.isGuest === 'GUEST' || rb.isGuest === true);
    const hasMembers = roomBookings.some(rb => rb.isGuest === 'MEMBER' || rb.isGuest === false);

    if (hasGuests) {
      if (!hasMembers) {
        alert("Guests are only allowed when a member is also staying at the property. Please assign at least one room to a member.");
        return;
      }

      // Find member overall stay dates
      roomBookings.filter(rb => rb.isGuest === 'MEMBER' || rb.isGuest === false).forEach(rb => {
        const rbStart = new Date(rb.startDate);
        const rbEnd = new Date(rb.endDate);
        if (!memberMinDate || rbStart < memberMinDate) memberMinDate = rbStart;
        if (!memberMaxDate || rbEnd > memberMaxDate) memberMaxDate = rbEnd;
      });

      // Check if any guest dates fall outside member dates
      const invalidGuestRooms = roomBookings.filter(rb => {
        if (rb.isGuest === 'MEMBER' || rb.isGuest === false) return false;
        const guestStart = new Date(rb.startDate);
        const guestEnd = new Date(rb.endDate);
        return guestStart < memberMinDate || guestEnd > memberMaxDate;
      });

      if (invalidGuestRooms.length > 0) {
        // If admin is booking, we allow booking for a member overriding standard dates based on verbal approval
        if (currentUser !== 'admin') {
          alert("Guest(s) are only allowed at the property during the same time as the member stays there. Please adjust the guest dates to fall within your stay.");
          return;
        }
      }
    }

    // Propagate dietary/allergies to all rooms so they show up on reports for all guests in party
    const sharedDietary = roomBookings[0]?.dietary || '';
    const finalizedRoomBookings = roomBookings.map(rb => ({
      ...rb,
      dietary: sharedDietary
    }));

    if (isPayFlow && step === 3) {
      setStep(4);
      return;
    }

    const paymentDetails = isPayFlow ? {
      paymentAmount: bookingTotal,
      paymentStatus: 'PAID',
      paymentMethod: 'CREDIT_CARD',
      paymentReference: `REF-${Date.now()}`
    } : {
      paymentAmount: 0,
      paymentStatus: 'PENDING'
    };

    confirmMultiRoomBooking(finalizedRoomBookings, partyArrivalTime, stayingInCottage, effectiveMember, paymentDetails);
  };


  const getOverallDates = () => {
    let minDate = null;
    let maxDate = null;
    roomBookings.forEach(rb => {
      if (!minDate || rb.startDate < minDate) minDate = rb.startDate;
      if (!maxDate || rb.endDate > maxDate) maxDate = rb.endDate;
    });
    return {
      start: minDate ? new Date(minDate + 'T00:00:00') : new Date(),
      end: maxDate ? new Date(maxDate + 'T00:00:00') : new Date()
    };
  };
  const { start: overallStart, end: overallEnd } = getOverallDates();

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-10">
      <div className="flex items-center gap-6 bg-transparent border-b border-stone-100 pb-4 w-full justify-center">
        <StepIcon num={1} label="Occupants" active={step === 1} completed={step > 1} onClick={() => setStep(1)} />
        <div className="w-12 h-px bg-stone-200"></div>
        <StepIcon num={2} label="Meals" active={step === 2} completed={step > 2} onClick={() => setStep(2)} />
        <div className="w-12 h-px bg-stone-200"></div>
        <StepIcon num={3} label="Review" active={step === 3} completed={step > 3} onClick={() => setStep(3)} />
        {isPayFlow && (
          <>
            <div className="w-12 h-px bg-stone-200"></div>
            <StepIcon num={4} label="Payment" active={step === 4} completed={step > 4} onClick={() => step >= 4 && setStep(4)} />
          </>
        )}
      </div>
    </div>
  );

  const StepIcon = ({ num, label, active, completed, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${active ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300'}`}>
        {completed ? <LucideIcon name="check" className="w-3.5 h-3.5" /> : num}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : setBookingMode('calendar')}
          className="flex items-center gap-2 text-stone-500 hover:text-emerald-700 transition-colors font-medium px-4 py-2 rounded-xl hover:bg-emerald-50"
        >
          <LucideIcon name="chevron-left" className="w-4 h-4" />
          <span>{step === 1 ? 'Back to Calendar' : 'Previous Step'}</span>
        </button>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => setBookingMode('calendar')}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-2 text-sm"
            >
              <LucideIcon name="plus" className="w-4 h-4" />
              Add Room
            </button>
            <h2 className="text-3xl font-light text-stone-900 tracking-tight">Complete Your Booking</h2>
          </div>
          <div className="flex bg-amber-50 text-amber-900 px-4 py-2 rounded-xl font-bold items-center gap-2.5 text-xs lg:text-sm border border-amber-200 shadow-sm">
            <LucideIcon name="calendar" className="w-4 h-4 text-amber-600" />
            <span>{overallStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {overallEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <div className="w-px h-4 bg-amber-300 mx-1"></div>
            <div className="flex items-center gap-1.5 text-amber-800">
              <LucideIcon name="log-in" className="w-3.5 h-3.5 opacity-60" />
              <span>{partyArrivalTime || '4:00 PM'} Move In</span>
            </div>
            <div className="w-px h-3 bg-amber-300 mx-1"></div>
            <div className="flex items-center gap-1.5 text-amber-800">
              <LucideIcon name="log-out" className="w-3.5 h-3.5 opacity-60" />
              <span>11:00 AM Move Out</span>
            </div>
          </div>
        </div>
      </div>

      <StepIndicator />

      {/* STEP 1: Occupancy & Basics */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:border-emerald-200 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <LucideIcon name="clock" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Arrival Details</h3>
                  <p className="text-xs text-stone-500">When should we expect your party?</p>
                </div>
              </div>

              {currentUser === 'admin' && (
                <div className="mb-6 space-y-2 pb-4 border-b border-stone-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Admin: Booking For Which Member?</label>
                  <select
                    value={adminBookingMember}
                    onChange={(e) => {
                      setAdminBookingMember(e.target.value);
                      // Auto update the first room name if it was empty or matched the old admin name
                      setRoomBookings(prev => prev.map((rb, i) => {
                        if (!rb.isGuest && (rb.guestNames[0] === 'Admin Booking' || rb.guestNames[0] === adminBookingMember)) {
                          return { ...rb, guestNames: [e.target.value || 'Admin Booking', ...rb.guestNames.slice(1)] };
                        }
                        return rb;
                      }));
                    }}
                    className="w-full h-12 px-4 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm text-emerald-900 placeholder:text-emerald-300"
                  >
                    <option value="">Select a member...</option>
                    {memberList.map(m => (
                      <option key={m.id} value={m.full_name}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Party Arrival Time</label>
                <select
                  value={partyArrivalTime}
                  onChange={(e) => setPartyArrivalTime(e.target.value)}
                  className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium appearance-none text-sm"
                >
                  <option value="07:00">07:00 AM</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="19:00">07:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
            </div>

            <div className={`rounded-3xl p-6 border-2 transition-all flex flex-col justify-center cursor-pointer ${stayingInCottage ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-stone-200 hover:border-emerald-200'}`} onClick={() => {
              const val = !stayingInCottage;
              setStayingInCottage(val);
              if (val) {
                setRoomBookings(roomBookings.map(rb => ({ ...rb, isGuest: true })));
              } else if (roomBookings.every(r => r.isGuest)) {
                setMemberOccupied(0);
              }
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-all ${stayingInCottage ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-50 text-stone-400'}`}>
                    <LucideIcon name="home" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Staying in your cottage?</h3>
                    <p className="text-xs text-stone-500">Check this if you are not using club rooms.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${stayingInCottage ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300'}`}>
                  {stayingInCottage && <LucideIcon name="check" className="w-4 h-4" />}
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-stone-400">
                Note: Members must stay at the club (either in a room or cottage) while guests are occupying club rooms.
              </p>
            </div>
          </div>


          <div className="space-y-6">
            <h3 className="text-lg font-bold text-stone-900 px-2 flex items-center gap-2">
              <LucideIcon name="bed-double" className="w-5 h-5 text-emerald-600" />
              Room Assignment
            </h3>
            {roomBookings.map((booking, idx) => (
              <div key={idx} className={`bg-white rounded-2xl border transition-all overflow-hidden ${!booking.isGuest ? 'border-emerald-300 shadow-sm' : 'border-stone-200'}`}>
                <div className="bg-stone-50/50 px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center border border-stone-100">
                      <span className="font-bold text-xs text-emerald-700">{booking.building.charAt(0)}{booking.roomId.slice(-1)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">{booking.roomName}</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{getRoomById(booking.roomId)?.beds}</p>
                    </div>
                  </div>
                  <div className="flex bg-stone-100/80 p-0.5 rounded-lg">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMemberOccupied(idx); }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${!booking.isGuest ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      <LucideIcon name="user-check" className="w-3 h-3" />
                      Member
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoomBooking(idx, 'isGuest', true); }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${booking.isGuest ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      <LucideIcon name="users" className="w-3 h-3" />
                      Guest
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-2">Occupants</label>
                  <div className="space-y-2">
                    {booking.guestNames.map((name, gIdx) => (
                      <div key={gIdx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-300 w-3">{gIdx + 1}.</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateGuestName(idx, gIdx, e.target.value)}
                          placeholder={gIdx === 0 && !booking.isGuest ? effectiveMember : `Guest ${gIdx + 1}`}
                          className="flex-1 px-2 py-1.5 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                        {booking.guestNames.length > 1 && (
                          <button
                            onClick={() => removeGuest(idx, gIdx)}
                            className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <LucideIcon name="x" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addGuest(idx)}
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-[10px] font-bold mt-2 ml-5 transition-all outline-none"
                    >
                      <LucideIcon name="plus" className="w-3 h-3" />
                      Add Guest
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:border-emerald-200 transition-colors">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-3 flex items-center gap-2">
                <LucideIcon name="apple" className="w-3.5 h-3.5" />
                Dietary Preferences / Allergies
              </label>
              <textarea
                value={roomBookings[0]?.dietary || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoomBookings(roomBookings.map(rb => ({ ...rb, dietary: val })));
                }}
                placeholder="List any dietary requirements for you or your guests..."
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-all font-semibold shadow-sm active:scale-95 group"
            >
              <span>Continue to Meals</span>
              <LucideIcon name="arrow-right" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Meals */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
            <div className="p-2 bg-amber-100/50 rounded-xl text-amber-700">
              <LucideIcon name="utensils" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Meal Planning</h3>
              <p className="text-xs text-stone-600 leading-relaxed mt-1">
                We've selected standard arrival/departure meals. Adjust as needed. Strikethrough meals aren't available.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {roomBookings.map((room, roomIdx) => (
              <div key={roomIdx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="bg-stone-50/50 px-5 py-3 border-b border-stone-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-700 text-xs font-bold border border-emerald-100">
                    {room.building.charAt(0)}{room.roomId.slice(-1)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{room.roomName}</h4>
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">{room.guestNames[0] || 'Guest'}</p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-4">
                    {room.dates.map((date) => {
                      const meals = room.dailyMeals[date];
                      const dateObj = new Date(date);

                      return (
                        <div key={date} className="flex flex-col md:flex-row md:items-center gap-4 py-3 border-b border-stone-100 last:border-0 last:pb-0">
                          <div className="w-32 shrink-0">
                            <span className="text-xs font-bold text-stone-800">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            {dateObj.getDay() === 1 && <span className="block mt-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 w-fit rounded text-[8px] font-black uppercase">No Service</span>}
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <MealCheckbox
                              id={`br-${roomIdx}-${date}`}
                              label="Breakfast"
                              time="8:00 AM"
                              checked={meals.breakfast}
                              disabled={!isMealAvailable(date, 'breakfast')}
                              onChange={(val) => updateMeal(roomIdx, date, 'breakfast', val)}
                              packed={meals.packedBreakfast}
                              onPackedChange={(val) => updateMeal(roomIdx, date, 'packedBreakfast', val)}
                            />
                            <MealCheckbox
                              id={`lu-${roomIdx}-${date}`}
                              label="Lunch"
                              time="1:30 PM"
                              checked={meals.lunch}
                              disabled={!isMealAvailable(date, 'lunch')}
                              onChange={(val) => updateMeal(roomIdx, date, 'lunch', val)}
                              packed={meals.packedLunch}
                              onPackedChange={(val) => updateMeal(roomIdx, date, 'packedLunch', val)}
                            />
                            <MealCheckbox
                              id={`su-${roomIdx}-${date}`}
                              label="Bar Supper"
                              time="6:00 PM"
                              checked={meals.barSupper}
                              disabled={!isMealAvailable(date, 'barSupper')}
                              onChange={(val) => updateMeal(roomIdx, date, 'barSupper', val)}
                              packed={meals.packedBarSupper}
                              onPackedChange={(val) => updateMeal(roomIdx, date, 'packedBarSupper', val)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-stone-400 hover:text-stone-700 font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-all font-semibold shadow-sm active:scale-95 group"
            >
              <span>Review Booking</span>
              <LucideIcon name="arrow-right" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto">
          <div className="text-center py-4">
            <h3 className="text-2xl font-bold text-stone-900">Final Review</h3>
            <p className="text-sm text-stone-500 mt-1">Please double check your details before confirming.</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="bg-stone-50/50 p-6 border-b border-stone-100 flex flex-col md:flex-row gap-6 md:gap-12 justify-between">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 block mb-1">Member Account</label>
                <p className="text-sm font-bold text-stone-900">{effectiveMember}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 block mb-1">Expected Arrival</label>
                <p className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <LucideIcon name="clock" className="w-4 h-4 text-emerald-600" />
                  {partyArrivalTime}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-400 block">Room Reservations</label>
              {roomBookings.map((room, idx) => (
                <div key={idx} className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex flex-col md:flex-row justify-between gap-4 md:items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{room.building}</span>
                      <h4 className="font-bold text-sm text-stone-900">{room.roomName}</h4>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">{room.dates.length} Nights • {room.dates[0]} to {room.endDate}</p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold text-emerald-800 mb-1">
                      {room.guestNames && Array.from(room.guestNames).filter(n => typeof n === 'string' && n.trim()).length > 0
                        ? Array.from(room.guestNames).filter(n => typeof n === 'string' && n.trim()).join(', ')
                        : (room.isGuest === true ? 'Guest Entry Pending' : 'Member Only')}
                    </p>
                    <div className="flex items-center md:justify-end gap-1.5">
                      {!room.isGuest && room.guests === 1 ? (
                        <>
                          <LucideIcon name="user-check" className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">You staying here</span>
                        </>
                      ) : (
                        <span className="text-xs text-stone-500">
                          Total: {room.guests} {room.guests === 1 ? 'Person' : 'People'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-stone-900 border-t border-stone-200 p-6 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <LucideIcon name="utensils" className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Meal Summary</h4>
                  <p className="text-emerald-300 text-[10px] uppercase tracking-widest">Total ordered items</p>
                </div>
              </div>

              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-lg font-bold">{roomBookings.reduce((acc, r) => acc + Object.values(r.dailyMeals).filter(m => m.breakfast).length, 0)}</p>
                  <p className="text-[9px] uppercase font-black tracking-widest text-emerald-400">Breakfasts</p>
                </div>
                <div className="border-l border-white/20 pl-6">
                  <p className="text-lg font-bold">{roomBookings.reduce((acc, r) => acc + Object.values(r.dailyMeals).filter(m => m.lunch).length, 0)}</p>
                  <p className="text-[9px] uppercase font-black tracking-widest text-emerald-400">Lunches</p>
                </div>
                <div className="border-l border-white/20 pl-6">
                  <p className="text-lg font-bold">{roomBookings.reduce((acc, r) => acc + Object.values(r.dailyMeals).filter(m => m.barSupper).length, 0)}</p>
                  <p className="text-[9px] uppercase font-black tracking-widest text-emerald-400">Suppers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-8 mb-12">
            <button
              onClick={() => setStep(2)}
              className="px-8 py-4 bg-white border-2 border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-all font-bold"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="px-16 py-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-xl shadow-2xl shadow-emerald-900/20 active:scale-95 flex items-center gap-3"
            >
              {isPayFlow ? 'Continue to Payment' : 'Finalize Booking'}
              <LucideIcon name={isPayFlow ? "credit-card" : "check-circle"} className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      
      {/* STEP 4: Payment */}
      {isPayFlow && step === 4 && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
          <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-xl">
            <div className="bg-emerald-900 p-8 text-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-light">Payment Details</h3>
                <div className="flex gap-2">
                  <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-[8px] font-black italic">VISA</span>
                  </div>
                  <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-[8px] font-black italic">MC</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Estimated Total</p>
                <p className="text-4xl font-light tracking-tight">${bookingTotal.toFixed(2)}</p>
                <p className="text-[9px] text-emerald-400 mt-2 font-medium">Payment will be processed securely.</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Cardholder Name</label>
                  <input 
                    type="text" 
                    value={paymentData.cardholder} 
                    onChange={(e) => setPaymentData({...paymentData, cardholder: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Card Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000" 
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800" 
                    />
                    <LucideIcon name="credit-card" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Expiry Date</label>
                    <input 
                      type="text" 
                      placeholder="MM / YY" 
                      value={paymentData.expiry}
                      onChange={(e) => setPaymentData({...paymentData, expiry: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800 text-center" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">CVV</label>
                    <input 
                      type="text" 
                      placeholder="•••" 
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-bold text-stone-800 text-center" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 items-start">
                <LucideIcon name="shield-check" className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  This is a secure 256-bit encrypted payment. Final charges will be adjusted based on meal consumption and club policies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-12">
            <button
              onClick={() => setStep(3)}
              className="px-8 py-4 bg-white border-2 border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-all font-bold"
            >
              Back to Review
            </button>
            <button
              onClick={handleConfirm}
              className="px-16 py-5 bg-emerald-900 text-white rounded-2xl hover:bg-emerald-950 transition-all font-black text-xl shadow-2xl shadow-emerald-900/40 active:scale-95 flex items-center gap-3"
            >
              Pay & Confirm
              <LucideIcon name="check-circle" className="w-6 h-6 text-amber-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MealCheckbox = ({ id, label, time, checked, disabled, onChange, packed, onPackedChange }) => (
  <div className={`p-2 rounded-xl transition-all flex flex-col gap-1.5 ${disabled ? 'opacity-40 grayscale' : checked ? 'bg-emerald-50/50' : 'hover:bg-stone-50'}`}>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
      />
      <div className="flex-1 flex items-baseline justify-between truncate">
        <label htmlFor={id} className={`text-xs font-bold cursor-pointer select-none truncate ${disabled ? 'line-through text-stone-400' : 'text-stone-700'}`}>
          {label}
        </label>
        <span className="text-[9px] text-stone-400 font-bold ml-2 shrink-0">{time}</span>
      </div>
    </div>

    {checked && !disabled && (
      <div className="flex items-center gap-2 pl-6 animate-in slide-in-from-top-1 fade-in mt-1">
        <input
          id={`packed-${id}`}
          type="checkbox"
          checked={packed}
          onChange={(e) => onPackedChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded-sm border-stone-300 text-amber-500 focus:ring-amber-500 transition-all cursor-pointer"
        />
        <label htmlFor={`packed-${id}`} className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors ${packed ? 'text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}>
          To-go box
        </label>
      </div>
    )}
  </div>
);


// Edit Booking View
const EditBookingDetails = ({ booking, onSave, onCancel, onDelete, currentUser }) => {
  const getDatesInRange = (start, end) => {
    const dates = [];
    let current = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    while (current < endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const isMealAvailable = (dateStr, mealType) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 && (mealType === 'lunch' || mealType === 'barSupper')) return false;
    if (dayOfWeek === 1) return false;
    if (dayOfWeek === 2 && (mealType === 'breakfast' || mealType === 'lunch')) return false;
    return true;
  };

  const dates = getDatesInRange(booking.startDate, booking.endDate);
  const nights = dates.length;

  const [guests, setGuests] = React.useState(booking.guests || 1);
  const [isGuest, setIsGuest] = React.useState(booking.isGuest === 'GUEST' || booking.isGuest === true);
  const [guestNames, setGuestNames] = React.useState(() => {
    if (booking.guestNames && Array.from(booking.guestNames).length > 0) return [...booking.guestNames];
    return [booking.guestName || (booking.isGuest === 'MEMBER' || booking.isGuest === false ? (booking.member || currentUser) : '')];
  });
  const [dietary, setDietary] = React.useState(booking.dietary || '');
  const [arrivalTime, setArrivalTime] = React.useState(booking.memberArrival || '');
  const [stayingInCottage, setStayingInCottage] = React.useState(booking.stayingInCottage || false);

  const [dailyMeals, setDailyMeals] = React.useState(
    JSON.parse(JSON.stringify(booking.dailyMeals || {}))
  );

  const handleMemberOccupiedToggle = (val) => {
    setIsGuest(!val);
    const updatedNames = [...guestNames];
    if (val) {
      updatedNames[0] = currentUser || booking.member;
      setStayingInCottage(false);
    } else {
      if (updatedNames[0] === (currentUser || booking.member)) {
        updatedNames[0] = '';
      }
      setStayingInCottage(true);
    }
    setGuestNames(updatedNames);
  };


  const updateMeal = (dateStr, mealField, value) => {
    setDailyMeals(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [mealField]: value }
    }));
  };

  const handleSave = () => {
    onSave({
      ...booking,
      guests: guestNames.length,
      isGuest: isGuest ? 'GUEST' : 'MEMBER',
      isGuestRoom: isGuest ? 'GUEST' : 'MEMBER',
      guestNames,
      guestName: guestNames[0], // Keep for backward compatibility
      dietary,
      memberArrival: arrivalTime,
      guestArrival: arrivalTime,
      dailyMeals,
      stayingInCottage
    });
  };


  return (
    <div className="max-w-4xl mx-auto py-6 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-light text-stone-900 tracking-tight">Modify Reservation</h2>
          <p className="text-stone-500 text-xs mt-1">Review and update details for your stay.</p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-stone-400 hover:text-emerald-700 font-bold transition-all group p-2 hover:bg-emerald-50 rounded-xl"
        >
          <LucideIcon name="arrow-left" className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest">Discard</span>
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-24">
        {/* Summary & Basics */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="bg-emerald-900 rounded-2xl p-5 text-white shadow-lg flex-1">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80 mb-1">{booking.building}</div>
                <h3 className="text-xl font-light leading-tight">{booking.roomName}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-100 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/10 block mb-1">
                  {new Date(booking.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(booking.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[10px] font-bold text-emerald-300">
                  {nights} night stay
                </span>
              </div>
            </div>

            {booking.provisional && (
              <div className="mt-3 bg-amber-400/10 text-amber-100 p-2.5 rounded-xl border border-amber-400/20 text-[10px] leading-relaxed flex items-center gap-2">
                <LucideIcon name="alert-triangle" className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p><strong>Provisional:</strong> Subject to priority policy.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel this entire reservation? This action cannot be undone.')) {
                onDelete(booking.id);
              }
            }}
            className="flex flex-col items-center justify-center gap-2 p-5 text-red-600 bg-red-50 hover:bg-red-100 transition-all rounded-2xl font-bold border border-red-100 sm:w-32 shrink-0 group"
          >
            <LucideIcon name="trash-2" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] uppercase tracking-widest text-center leading-tight">Cancel<br />Stay</span>
          </button>
        </div>

        {/* Forms Container */}
        <div className="space-y-6">
          {/* Occupancy Section */}
          <section className="bg-white rounded-2xl p-6 border border-stone-200">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-800 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Party & Arrival
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-400 ml-1">Arrival Time</label>
                <div className="relative">
                  <select
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all outline-none font-bold text-sm text-stone-800 appearance-none"
                  >
                    <option value="">Select time...</option>
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                      <option key={t} value={t}>{new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>
                    ))}
                  </select>
                  <LucideIcon name="clock" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-400 ml-1">Guests</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all outline-none font-bold text-sm text-stone-800"
                  />
                  <LucideIcon name="users" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-6 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm text-stone-800">Room Occupant</h5>
                  <p className="text-[10px] text-stone-400 mt-0.5">Member or guest stay?</p>
                </div>
                <div className="flex bg-stone-100 p-1 rounded-lg">
                  <button
                    onClick={() => handleMemberOccupiedToggle(true)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${!isGuest ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    Member
                  </button>
                  <button
                    onClick={() => handleMemberOccupiedToggle(false)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${isGuest ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    Guest
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${stayingInCottage ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${stayingInCottage ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-400'}`}>
                    <LucideIcon name="home" className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Staying in Cottage?</p>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Check if member has own cottage</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={stayingInCottage}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setStayingInCottage(val);
                    if (val) {
                      setIsGuest(true);
                    } else if (isGuest) {
                      handleMemberOccupiedToggle(true);
                    }
                  }}
                  className="w-5 h-5 rounded border-2 border-stone-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-400 block">Occupant Names</label>
                <div className="space-y-2.5 flex flex-col items-start w-full">
                  {guestNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2 w-full">
                      <span className="text-[10px] font-bold text-stone-300 w-3">{idx + 1}.</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          const updated = [...guestNames];
                          updated[idx] = e.target.value;
                          setGuestNames(updated);
                        }}
                        placeholder={idx === 0 && !isGuest ? "Your name" : `Guest ${idx + 1} name`}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 hover:border-stone-300 focus:bg-white rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                      />
                      {guestNames.length > 1 && (
                        <button
                          onClick={() => setGuestNames(guestNames.filter((_, i) => i !== idx))}
                          className="p-1.5 text-stone-400 hover:text-red-500 transition-colors bg-stone-100 rounded-md hover:bg-red-50"
                        >
                          <LucideIcon name="x" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setGuestNames([...guestNames, ''])}
                    className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-[10px] font-bold mt-1 ml-5 px-2 py-1 bg-emerald-50 rounded-md transition-colors"
                  >
                    <LucideIcon name="plus" className="w-3 h-3" />
                    Add guest
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-5 border-t border-stone-100">
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-400 block ml-1">Dietary Preferences</label>
                <textarea
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Notes, allergies, etc..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all outline-none font-medium text-sm text-stone-800 min-h-[60px] resize-none"
                />
              </div>
            </div>
          </section>

          {/* Meals Section */}
          <section className="bg-white rounded-2xl p-6 border border-stone-200">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-800 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Meal Plan
            </h4>

            <div className="space-y-3">
              {dates.map((date) => {
                const dayMeals = dailyMeals[date] || {};
                const dateObj = new Date(date + 'T00:00:00');
                const isBreakfastAvailable = isMealAvailable(date, 'breakfast');
                const isLunchAvailable = isMealAvailable(date, 'lunch');
                const isSupperAvailable = isMealAvailable(date, 'barSupper');

                return (
                  <div key={date} className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-stone-50/50 border border-stone-100">
                    <div className="w-full sm:w-24 shrink-0 px-1">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-bold text-stone-800">
                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
                        <MealCheckbox
                          id={`break-${date}`}
                          label="Breakfast"
                          time="8:00 AM"
                          checked={dayMeals.breakfast || false}
                          disabled={!isBreakfastAvailable}
                          onChange={(val) => updateMeal(date, 'breakfast', val)}
                          packed={dayMeals.packedBreakfast || false}
                          onPackedChange={(val) => updateMeal(date, 'packedBreakfast', val)}
                        />
                      </div>
                      <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
                        <MealCheckbox
                          id={`lunch-${date}`}
                          label="Lunch"
                          time="1:30 PM"
                          checked={dayMeals.lunch || false}
                          disabled={!isLunchAvailable}
                          onChange={(val) => updateMeal(date, 'lunch', val)}
                          packed={dayMeals.packedLunch || false}
                          onPackedChange={(val) => updateMeal(date, 'packedLunch', val)}
                        />
                      </div>
                      <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
                        <MealCheckbox
                          id={`supper-${date}`}
                          label="Supper"
                          time="6:00 PM"
                          checked={dayMeals.barSupper || false}
                          disabled={!isSupperAvailable}
                          onChange={(val) => updateMeal(date, 'barSupper', val)}
                          packed={dayMeals.packedBarSupper || false}
                          onPackedChange={(val) => updateMeal(date, 'packedBarSupper', val)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sticky Actions */}
          <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 bg-white/90 backdrop-blur-md sm:rounded-2xl p-4 sm:p-3 border-t sm:border border-stone-200 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] sm:shadow-xl flex justify-between items-center gap-4 z-20 max-w-2xl w-full">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-stone-500 hover:bg-stone-100 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest shrink-0"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl hover:bg-emerald-800 transition-all font-bold text-sm shadow-md active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// My Reservations View
const MyReservationsView = ({ bookings, currentUser, getRoomById, cancelBooking, setView, onEditBooking, approveBooking, setPaymentBooking, setShowPaymentModal }) => {
  const isAdmin = currentUser === 'admin';
  const userBookings = isAdmin ? bookings : bookings.filter(b => b.member === currentUser);

  const staysMap = userBookings.reduce((acc, booking) => {
    // If admin, group by member as well so different members' stays on the same dates don't merge
    const stayId = isAdmin ? `${booking.member}_${booking.startDate}_${booking.endDate}` : `${booking.startDate}_${booking.endDate}`;
    if (!acc[stayId]) {
      acc[stayId] = { member: booking.member, startDate: booking.startDate, endDate: booking.endDate, bookings: [], provisional: false, stayingInCottage: false };
    }
    acc[stayId].bookings.push(booking);
    if (booking.provisional) acc[stayId].provisional = true;
    if (booking.stayingInCottage) acc[stayId].stayingInCottage = true;
    return acc;
  }, {});

  const stays = Object.values(staysMap).sort((a, b) => new Date(a.startDate + 'T00:00:00') - new Date(b.startDate + 'T00:00:00'));
  const today = new Date().toISOString().split('T')[0];

  const getDates = (start, end) => {
    const dates = []; let cur = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    while (cur < e) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
    return dates;
  };

  const fmtTime = (t) => { try { return new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return t; } };

  const MealDot = ({ date, type, ordered, packed }) => {
    if (!IS_MEAL_AVAILABLE(date, type)) return <span className="text-stone-300 text-[9px]">―</span>;
    if (!ordered) return <span className="text-stone-300 text-[9px]">·</span>;
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${packed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
        {packed ? '📦 Packed' : '✓'}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-8 border-b border-stone-100">
        <div>
          <h2 className="text-4xl font-light text-stone-900 tracking-tight">{isAdmin ? 'All Reservations' : 'Your Reservations'}</h2>
          <p className="text-stone-500 mt-2">{isAdmin ? 'Manage all member and guest bookings across the system.' : 'A crisp summary of your upcoming visits and accommodations.'}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button onClick={() => setView('calendar')}
            className="flex items-center gap-2 bg-emerald-900 text-white px-6 py-3 rounded-2xl hover:bg-emerald-950 transition-all font-bold shadow-md hover:shadow-lg active:scale-95 group">
            <LucideIcon name="plus" className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Reservation
          </button>
          {stays.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel ALL reservations? This action cannot be undone.')) {
                  userBookings.forEach(b => cancelBooking(b.id));
                }
              }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl hover:bg-red-100 transition-all font-bold shadow-sm hover:shadow-md active:scale-95 group"
            >
              <LucideIcon name="trash-2" className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Cancel All
            </button>
          )}
        </div>
      </div>

      {stays.length === 0 ? (
        <div className="text-center py-20 bg-stone-50/50 outline-dashed outline-2 outline-stone-200 rounded-3xl">
          <div className="w-16 h-16 bg-white shadow-sm border border-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LucideIcon name="calendar-days" className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="text-2xl font-light text-stone-900">{isAdmin ? 'No Reservations' : 'No Upcoming Stays'}</h3>
          <p className="text-stone-500 mt-2 mb-8">{isAdmin ? 'No bookings have been made yet.' : 'You haven\'t made any reservations yet.'}</p>
          <button onClick={() => setView('calendar')} className="px-8 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 transition-all font-bold shadow-sm">Browse Calendar</button>
        </div>
      ) : (
        <div className="space-y-12">
          {stays.map((stay) => {
            const nights = Math.ceil((new Date(stay.endDate) - new Date(stay.startDate)) / 86400000);
            const isActive = today >= stay.startDate && today < stay.endDate;
            const dates = getDates(stay.startDate, stay.endDate);
            const buildings = [...new Set(stay.bookings.map(b => b.building))].join(', ');

            return (
              <div key={isAdmin ? `${stay.member}_${stay.startDate}_${stay.endDate}` : `${stay.startDate}_${stay.endDate}`}
                className={`bg-white rounded-3xl overflow-hidden border transition-all ${isActive ? 'border-emerald-300 shadow-xl shadow-emerald-500/5' : 'border-stone-200 shadow-sm'}`}>

                {/* ── STAY HEADER ── */}
                <div className={`px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4 ${isActive ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-stone-100'}`}>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <div className="flex flex-col mr-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Member</span>
                          <span className="text-lg font-semibold text-stone-800">{stay.member}</span>
                        </div>
                      )}

                      {isAdmin && <div className="h-8 w-px bg-stone-200 hidden md:block mr-2"></div>}

                      <div className="text-3xl font-light text-stone-900 tracking-tight">
                        {new Date(stay.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <span className="text-stone-300 mx-2 text-2xl font-normal">→</span>
                        {new Date(stay.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {isActive && <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse">Live</span>}
                    </div>

                    <div className="h-6 w-px bg-stone-200 hidden md:block"></div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                        <LucideIcon name="moon" className="w-3.5 h-3.5" />
                        <span className="font-medium">{nights} Night{nights !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                        <LucideIcon name="building-2" className="w-3.5 h-3.5" />
                        <span className="font-medium">{stay.bookings.length} Room{stay.bookings.length !== 1 ? 's' : ''} ({buildings})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {stay.stayingInCottage && (
                      <span className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide">
                        <LucideIcon name="home" className="w-3.5 h-3.5 text-stone-400" /> Cottage Stay
                      </span>
                    )}
                    {stay.provisional && (
                      <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide">
                        <LucideIcon name="alert-triangle" className="w-3.5 h-3.5 text-amber-500" /> Provisional
                      </span>
                    )}
                    {stay.bookings.some(b => b.paymentStatus === 'PAID') && (
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide">
                        <LucideIcon name="credit-card" className="w-3.5 h-3.5 text-blue-500" /> Paid: ${stay.bookings.reduce((sum, b) => sum + (b.paymentAmount || 0), 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* ── ROOM CARDS ── */}
                  <div className={`grid gap-4 mb-8 items-start ${stay.bookings.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
                    {stay.bookings.map(room => {
                      const names = (room.guestNames && room.guestNames.length > 0)
                        ? room.guestNames
                        : [room.guestName || (room.isGuest === 'GUEST' || room.isGuest === true ? 'Guest' : currentUser)];
                      return (
                        <div key={room.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:border-emerald-200 hover:shadow-md transition-all">
                          {/* Room Title */}
                          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] font-bold text-stone-500 tracking-wide">{room.building}</p>
                                {(room.isGuest === 'GUEST' || room.isGuest === true)
                                  ? <span className="bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Guest</span>
                                  : <span className="bg-emerald-100/50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Member</span>
                                }
                              </div>
                              <h4 className="font-semibold text-stone-900">{room.roomName}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && room.provisional && (
                                <button onClick={() => approveBooking(room)} title="Accept"
                                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                                  <LucideIcon name="check-circle" className="w-3.5 h-3.5" />
                                  Accept
                                </button>
                              )}
                              {isAdmin && room.provisional && (
                                <button onClick={() => { if (confirm(`Reject provisional booking for ${room.roomName}?`)) cancelBooking(room.id); }} title="Reject"
                                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">
                                  <LucideIcon name="x-circle" className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              )}
                              <button onClick={() => onEditBooking(room)} title="Edit"
                                className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-lg transition-colors border border-emerald-200/50">
                                <LucideIcon name="edit-3" className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button onClick={() => { if (confirm(`Cancel ${room.roomName}?`)) cancelBooking(room.id); }} title="Cancel"
                                className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-100/80 hover:bg-red-200/80 rounded-lg transition-colors border border-red-200/50">
                                <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </div>
                            {room.paymentStatus === 'PENDING' && (
                              <button onClick={() => { setPaymentBooking(room); setShowPaymentModal(true); }}
                                className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm mt-2 w-full justify-center">
                                <LucideIcon name="credit-card" className="w-3.5 h-3.5" />
                                Pay Now
                              </button>
                            )}
                          </div>

                          {/* Minimalist Info Grid */}
                          <div className="p-5">
                            <ul className="space-y-4 text-sm">
                              {/* Arrival Time */}
                              <li className="flex items-start gap-3">
                                <LucideIcon name="clock" className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Arrival</p>
                                  <p className="font-medium text-stone-800">
                                    {room.memberArrival ? fmtTime(room.memberArrival) : <span className="text-stone-300 italic font-normal">Not specified</span>}
                                  </p>
                                </div>
                              </li>

                              {/* Occupants */}
                              <li className="flex items-start gap-3 pt-4 border-t border-stone-100">
                                <LucideIcon name="users" className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Occupants ({names.length})</p>
                                  <ul className="space-y-1.5">
                                    {names.map((name, i) => (
                                      <li key={i} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0"></div>
                                        <span className="font-medium text-stone-800">
                                          {name || <span className="text-stone-300 italic font-normal">Unnamed</span>}
                                        </span>
                                        {name === currentUser && !room.isGuest && (
                                          <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest">(Member)</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </li>

                              {/* Dietary */}
                              {room.dietary && (
                                <li className="flex items-start gap-3 pt-4 border-t border-stone-100">
                                  <LucideIcon name="leaf" className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Dietary Notes</p>
                                    <p className="text-stone-700 leading-snug">{room.dietary}</p>
                                  </div>
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── MEAL PLAN TABLE ── */}
                  <div className="mt-8 border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-stone-50 border-b border-stone-200 px-5 py-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-700 flex items-center gap-2">
                        <LucideIcon name="utensils" className="w-4 h-4 text-stone-400" /> Meal Schedule
                      </h4>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] text-stone-500"><span className="bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded text-[8px] font-black">✓</span>Reserved</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-stone-500"><span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] font-black">📦</span>Packed</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white">
                        <thead>
                          <tr className="border-b border-stone-100 bg-white">
                            <th className="px-5 py-3 font-semibold text-stone-500 w-32 border-r border-stone-100">Date</th>
                            {stay.bookings.map(room => (
                              <th key={room.id} className="px-5 py-3 font-semibold text-stone-700 text-center border-r border-stone-100 last:border-0 min-w-[200px]">
                                <div>{room.roomName}</div>
                                <div className="grid grid-cols-3 gap-1 mt-1 font-normal text-stone-400 text-[10px] uppercase tracking-wider">
                                  <span>Brkfast</span><span>Lunch</span><span>Supper</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dates.map((date) => {
                            const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const isMonday = new Date(date + 'T00:00:00').getDay() === 1;
                            return (
                              <tr key={date} className={`border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors ${isMonday ? 'bg-stone-50/50' : ''}`}>
                                <td className="px-5 py-4 border-r border-stone-100">
                                  <div className="font-semibold text-stone-800">{dayName}</div>
                                  <div className="text-stone-500">{dayNum}</div>
                                  {isMonday && <div className="text-[9px] font-medium text-stone-400 mt-1">No Service</div>}
                                </td>
                                {stay.bookings.map(room => {
                                  const m = (room.dailyMeals && room.dailyMeals[date]) || {};
                                  return (
                                    <td key={room.id} className="px-5 py-4 border-r border-stone-100 last:border-0">
                                      <div className="grid grid-cols-3 gap-1 place-items-center">
                                        <MealDot date={date} type="breakfast" ordered={m.breakfast} packed={m.packedBreakfast} />
                                        <MealDot date={date} type="lunch" ordered={m.lunch} packed={m.packedLunch} />
                                        <MealDot date={date} type="barSupper" ordered={m.barSupper} packed={m.packedBarSupper} />
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {stay.provisional && (
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <LucideIcon name="info" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 leading-snug">
                        <strong>Provisional Lazy Lodge Booking:</strong> This reservation may be bumped by a priority member who hasn't used Lazy Lodge this year.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};









// Admin Inventory View
const AdminInventoryView = ({
  maxRoomThreshold,
  setMaxRoomThreshold,
  mealTimes,
  setMealTimes,
  inventory
}) => {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="mb-10 border-b border-stone-100 pb-8">
        <h2 className="text-4xl font-light text-stone-900 tracking-tight">Management Dashboard</h2>
        <p className="text-stone-500 mt-2">Configure system thresholds, meal schedules, and room details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Global Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-6 flex items-center gap-2">
              <LucideIcon name="utensils" className="w-3 h-3" />
              Seasonal Meal Schedule
            </h3>
            <div className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-stone-100">
                <table className="w-full text-[10px] text-left">
                  <thead>
                    <tr className="bg-stone-50 text-stone-400 uppercase font-black tracking-tighter">
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Apr-Sep</th>
                      <th className="px-3 py-2">Oct-Mar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    <tr>
                      <td className="px-3 py-2 font-bold text-stone-600">Sun</td>
                      <td className="px-3 py-2 text-stone-500 italic">Supper only</td>
                      <td className="px-3 py-2 text-stone-500 italic">Brkfast only</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-stone-600">Mon</td>
                      <td className="px-3 py-2 text-red-400 font-bold">No Service</td>
                      <td className="px-3 py-2 text-red-400 font-bold">No Service</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-stone-600">Tue</td>
                      <td className="px-3 py-2 text-stone-500 italic">Brkfast only</td>
                      <td className="px-3 py-2 text-stone-500 italic">Supper only</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-stone-600">Wed-Sat</td>
                      <td className="px-3 py-2 text-stone-500 italic">Full Service</td>
                      <td className="px-3 py-2 text-stone-500 italic">Full Service</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-stone-400 italic px-1">
                Packed options available for all scheduled meals.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-6 flex items-center gap-2">
              <LucideIcon name="settings" className="w-3 h-3" />
              System Config
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Booking Threshold</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={maxRoomThreshold}
                    onChange={(e) => setMaxRoomThreshold(parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-stone-800"
                  />
                  <LucideIcon name="alert-circle" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                </div>
                <p className="text-[9px] text-stone-400 mt-2 leading-relaxed px-1">
                  Alert House Committee Chairman for bookings exceeding this number of rooms.
                </p>
              </div>

              <div className="pt-6 border-t border-stone-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-4 px-1">Meal Service Hours</label>
                <div className="space-y-4">
                  {Object.entries(mealTimes).map(([meal, time]) => (
                    <div key={meal}>
                      <label className="text-[10px] font-bold text-stone-500 mb-1.5 block capitalize">
                        {meal === 'barSupper' ? 'Bar Supper' : meal}
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setMealTimes({ ...mealTimes, [meal]: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-stone-800 text-sm"
                        />
                        <LucideIcon name="clock" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main: Room Inventory */}
        <div className="lg:col-span-3 space-y-8">
          {Object.entries(inventory).map(([building, rooms]) => (
            <div key={building} className="bg-white rounded-[3rem] border border-stone-100 overflow-hidden shadow-sm">
              <div className="bg-stone-50/50 px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
                    <LucideIcon name="home" className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-light text-stone-900 leading-tight">{building}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-0.5">{rooms.length} Rooms Available</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map(room => (
                    <div key={room.id} className="group p-6 bg-white hover:bg-stone-50 rounded-[2rem] border border-transparent hover:border-emerald-100 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-white group-hover:text-emerald-600 transition-all shadow-sm">
                          <LucideIcon name="door-open" className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-stone-800">{room.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <LucideIcon name="bed" className="w-3 h-3" />
                              {room.beds}
                            </span>
                            {room.bathroom && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <LucideIcon name="check-circle" className="w-3 h-3" />
                                Private Bath
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-light text-stone-900">${room.price}</div>
                        <div className="text-[9px] font-black uppercase tracking-tighter text-stone-400">Per Night</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// Reporting View
// Dashboard View (Admin Only)
const DashboardView = ({ bookings, inventory, maxRoomThreshold, setMaxRoomThreshold, mealTimes, setMealTimes }) => {
  const [activeTab, setActiveTab] = React.useState('reports');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl shadow-emerald-900/5">
        <h2 className="text-2xl font-light text-emerald-900 px-2">Admin Dashboard</h2>
        <div className="flex bg-stone-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <LucideIcon name="bar-chart" className="w-4 h-4" />
            <span>Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <LucideIcon name="settings" className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'reports' ? (
          <ReportingView bookings={bookings} />
        ) : (
          <AdminInventoryView
            inventory={inventory}
            maxRoomThreshold={maxRoomThreshold}
            setMaxRoomThreshold={setMaxRoomThreshold}
            mealTimes={mealTimes}
            setMealTimes={setMealTimes}
          />
        )}
      </div>
    </div>
  );
};


const ReportingView = ({ bookings }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mealDataByDate = {};

  bookings.forEach(booking => {
    if (booking.dailyMeals) {
      Object.entries(booking.dailyMeals).forEach(([dateStr, meals]) => {
        const bookingDate = new Date(dateStr + 'T00:00:00');
        if (bookingDate >= today) {
          if (!mealDataByDate[dateStr]) {
            mealDataByDate[dateStr] = {
              breakfast: [], packedBreakfast: [],
              lunch: [], packedLunch: [],
              barSupper: [], packedBarSupper: [],
              membersCounted: { breakfast: new Set(), lunch: new Set(), barSupper: new Set() }
            };
          }

          const guestCount = booking.guests || 1;
          const isMemberRoom = (booking.isGuest === 'MEMBER' || booking.isGuest === false);
          const isCottageStay = booking.stayingInCottage;

          ['breakfast', 'lunch', 'barSupper'].forEach(m => {
            if (meals[m]) {
              const packedField = `packed${m.charAt(0).toUpperCase() + m.slice(1)}`;
              const isPacked = meals[packedField];
              const targetList = isPacked ? mealDataByDate[dateStr][packedField] : mealDataByDate[dateStr][m];
              const countedSet = mealDataByDate[dateStr].membersCounted[m];

              // 1. Handle Member Counting (if they occupy this room OR stay in cottage)
              if ((isMemberRoom || isCottageStay) && !countedSet.has(booking.member)) {
                targetList.push(booking.member);
                countedSet.add(booking.member);
              }

              // 2. Handle Guest Counting
              if (isMemberRoom) {
                // If it's the member's room, add their additional guests
                for (let i = 1; i < guestCount; i++) {
                  targetList.push(`Guest of ${booking.member}`);
                }
              } else {
                // If it's a guest room, add all occupants by guestName
                const label = booking.guestName || `Guest of ${booking.member}`;
                for (let i = 0; i < guestCount; i++) {
                  targetList.push(label);
                }
              }
            }
          });
        }
      });
    }
  });

  const sortedDates = Object.keys(mealDataByDate).sort((a, b) => new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00'));

  const renderMealRow = (dateStr, mealType, label, members, packedMembers = []) => {
    const totalCount = members.length + packedMembers.length;
    const isServiceAvailable = IS_MEAL_AVAILABLE(dateStr, mealType);
    const displayCount = isServiceAvailable ? totalCount : 0;

    return (
      <div className="py-6 border-b border-stone-100 last:border-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isServiceAvailable && totalCount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <div>
              <span className="text-lg font-bold text-stone-900">{label}</span>
              {!isServiceAvailable && <span className="ml-3 text-[9px] bg-red-50 text-red-500 px-2.5 py-1 rounded-md font-black uppercase tracking-widest border border-red-100">No Service</span>}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right flex flex-col items-end justify-center">
              <span className="text-2xl font-light text-stone-900 leading-none">{displayCount}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Total</span>
            </div>
          </div>
        </div>

        {totalCount > 0 && IS_MEAL_AVAILABLE(dateStr, mealType) && (
          <div className="pl-5 space-y-4">
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {members.map((m, i) => <span key={i} className="px-3 py-1.5 bg-white text-emerald-900 text-[11px] font-bold rounded-xl border border-stone-200/60 shadow-sm">{m}</span>)}
              </div>
            )}
            {packedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {packedMembers.map((m, i) => <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-900 text-[11px] font-bold rounded-xl border border-amber-200/60 shadow-sm flex items-center gap-2">
                  <LucideIcon name="package" className="w-3.5 h-3.5 text-amber-600" />
                  {m}
                  <span className="text-[9px] bg-amber-200 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">To-Go</span>
                </span>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const downloadMealReportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const headers = ['Date', 'Day', 'Meal Service', 'Count', 'Attendees'];
    const rows = [];

    sortedDates.forEach(dateStr => {
      const data = mealDataByDate[dateStr];
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const services = [
        { label: 'Breakfast', normal: data.breakfast, packed: data.packedBreakfast },
        { label: 'Lunch', normal: data.lunch, packed: data.packedLunch },
        { label: 'Bar Supper', normal: data.barSupper, packed: data.packedBarSupper }
      ];

      services.forEach(s => {
        const mealType = s.label === 'Bar Supper' ? 'barSupper' : s.label.toLowerCase();
        if (IS_MEAL_AVAILABLE(dateStr, mealType)) {
          const allNames = [...s.normal, ...s.packed.map(p => `${p} (Packed)`)];
          rows.push([
            dateStr,
            dayName,
            s.label,
            allNames.length,
            allNames.join(', ')
          ]);
        }
      });
    });

    doc.text('Monthly Meal Report', 14, 15);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [6, 78, 59] },
      columnStyles: {
        4: { cellWidth: 'auto' }
      }
    });

    doc.save(`meal-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-stone-100">
        <div>
          <h2 className="text-4xl font-light text-stone-900 tracking-tight">Reporting & Logistics</h2>
          <p className="text-stone-500 mt-2">Aggregated daily meal counts and rosters for kitchen planning.</p>
        </div>
        <button onClick={downloadMealReportPDF} className="flex items-center gap-2 bg-emerald-900 text-white px-6 py-3 rounded-2xl hover:bg-emerald-950 transition-all font-bold shadow-md hover:shadow-lg active:scale-95 text-sm">
          <LucideIcon name="download" className="w-4 h-4" />
          Export PDF Report
        </button>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-24 bg-stone-50/50 outline-dashed outline-2 outline-stone-200 rounded-3xl">
          <div className="w-16 h-16 bg-white shadow-sm border border-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LucideIcon name="bar-chart-3" className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="text-2xl font-light text-stone-900">No Data Available</h3>
          <p className="text-stone-500 mt-2 mb-8">No future meal reservations have been recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(dateStr => {
            const data = mealDataByDate[dateStr];
            const dateObj = new Date(dateStr + 'T00:00:00');
            return (
              <div key={dateStr} className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                {/* Clean, Elegant Header */}
                <div className="bg-stone-50/50 px-8 py-5 border-b border-stone-100 flex items-center gap-5">
                  <div className="flex-shrink-0 w-14 h-14 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">{dateObj.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-xl font-light text-stone-900 leading-none">{dateObj.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-light text-stone-900 tracking-tight">{dateObj.toLocaleDateString('en-US', { weekday: 'long' })}</h3>
                  </div>
                </div>

                {/* Meal Rows Container */}
                <div className="px-8 pb-4">
                  {renderMealRow(dateStr, 'breakfast', 'Breakfast Service', data.breakfast, data.packedBreakfast)}
                  {renderMealRow(dateStr, 'lunch', 'Lunch Service', data.lunch, data.packedLunch)}
                  {renderMealRow(dateStr, 'barSupper', 'Bar Supper', data.barSupper, data.packedBarSupper)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


// Messages View
const MessagesView = ({ messages, currentUser, validUsers, sendMessage }) => {
  const [isComposing, setIsComposing] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');

  const userMessages = messages.filter(m => m.recipient === currentUser);

  const handleSend = () => {
    if (!newRecipient || !newSubject || !newBody) {
      alert("Please fill out all fields before sending.");
      return;
    }
    sendMessage(newRecipient, newSubject, newBody);
    setIsComposing(false);
    setNewRecipient('');
    setNewSubject('');
    setNewBody('');
    // A subtle visual cue could be added here later
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-stone-100 pb-8">
        <div>
          <h2 className="text-4xl font-light text-stone-900 tracking-tight">Your Inbox</h2>
          <p className="text-stone-500 mt-2">Personal notifications and club announcements.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
            <LucideIcon name="mail" className="w-4 h-4" />
            {userMessages.filter(m => !m.read).length} New Messages
          </div>
          <button
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-2 bg-emerald-900 text-white px-5 py-2 rounded-2xl hover:bg-emerald-950 transition-all font-bold shadow-md hover:shadow-lg active:scale-95 group text-sm"
          >
            <LucideIcon name="pen-square" className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Compose
          </button>
        </div>
      </div>

      {userMessages.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-stone-100">
          <LucideIcon name="mailbox" className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-400 font-medium">No messages in your inbox.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {userMessages.map(message => (
            <div
              key={message.id}
              className={`rounded-[2.5rem] p-8 border transition-all hover:shadow-lg ${message.read ? 'bg-white border-stone-100' : 'bg-emerald-50/30 border-emerald-200 ring-1 ring-emerald-500/5'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${message.read ? 'bg-stone-50 text-stone-400' : 'bg-emerald-900 text-amber-300 shadow-xl shadow-emerald-900/10'}`}>
                    <LucideIcon name={message.read ? "mail-open" : "mail"} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">{message.subject}</h3>
                    <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                      <span className="text-emerald-700 font-black">From: {message.sender}</span>
                      <span>•</span>
                      <LucideIcon name="clock" className="w-3 h-3" />
                      {new Date(message.timestamp).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                {!message.read && (
                  <span className="px-4 py-1.5 bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-sm">
                    New
                  </span>
                )}
              </div>
              <div className="text-stone-600 leading-relaxed pl-16">
                {message.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={() => setIsComposing(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-2xl mx-auto border border-stone-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div>
                <h3 className="text-3xl font-light text-stone-900 tracking-tight">Compose Message</h3>
                <p className="text-stone-500 text-sm mt-1">Send a notification or update to another member.</p>
              </div>
              <button onClick={() => setIsComposing(false)} className="p-3 hover:bg-stone-50 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
                <LucideIcon name="x" className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 pb-4 flex-1">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Recipient</label>
                <div className="relative">
                  <select
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-stone-800 appearance-none text-sm"
                  >
                    <option value="" disabled>Select a member...</option>
                    {validUsers.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <LucideIcon name="user" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  <LucideIcon name="chevron-down" className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Subject</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Brief subject line"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-stone-800 text-sm"
                  />
                  <LucideIcon name="type" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 px-1">Message Body</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-stone-700 text-sm min-h-[200px] resize-y"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-stone-100 shrink-0">
              <button
                onClick={() => setIsComposing(false)}
                className="flex-1 px-8 py-3.5 bg-white border-2 border-stone-100 text-stone-600 rounded-2xl hover:bg-stone-50 transition-all font-bold text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!newRecipient || !newSubject || !newBody}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-900 text-white rounded-2xl hover:bg-emerald-950 transition-all font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LucideIcon name="send" className="w-4 h-4" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Navigation
const Navigation = ({ currentUser, view, setView, setCurrentUser, downloadCSV, onLogoutClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!currentUser) return null;

  const NavButton = ({ id, label, icon, active }) => (
    <button
      onClick={() => setView(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${active
        ? 'bg-emerald-800 text-amber-200 shadow-inner scale-[0.98]'
        : 'text-emerald-100 hover:bg-emerald-800/50 hover:text-white'
        }`}
    >
      <LucideIcon name={icon} className={`w-5 h-5 ${active ? 'text-amber-300' : 'text-emerald-300'}`} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <nav className="bg-emerald-900 border-b border-emerald-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('calendar')}>
              <div className="w-10 h-10 bg-white rounded-xl p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                <img src="logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden lg:block">
                <span className="text-white text-lg font-light tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Tuscarora</span>
                <p className="text-[8px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-0.5">Reservation Hub</p>
              </div>
            </div>

            <div className="h-8 w-px bg-emerald-800"></div>

            <div className="flex items-center gap-1">
              <NavButton id="calendar" label="Make Reservation" icon="calendar" active={view === 'calendar'} />
              <NavButton id="reserve-pay" label="Reserve and pay" icon="credit-card" active={view === 'reserve-pay'} />
              <NavButton id="my-reservations" label="My Reservations" icon="user" active={view === 'my-reservations'} />
              <NavButton id="messages" label="Inbox" icon="mail" active={view === 'messages'} />
              {currentUser === 'admin' ? (
                <NavButton id="dashboard" label="Dashboard" icon="layout" active={view === 'dashboard'} />
              ) : (
                <NavButton id="reporting" label="Reports" icon="bar-chart" active={view === 'reporting'} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 relative">
            {currentUser === 'admin' && (
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 text-emerald-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <LucideIcon name="download" className="w-4 h-4" />
                Export CSV
              </button>
            )}

            <button
              className="flex items-center gap-3 group"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-none group-hover:text-amber-200 transition-colors">{currentUser}</p>
                <p className="text-[9px] text-emerald-400 mt-1 uppercase tracking-tighter">Member</p>
              </div>
              <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-100 font-bold border border-emerald-700/50 group-hover:border-amber-500/30 transition-all shadow-sm">
                {currentUser[0].toUpperCase()}
              </div>
              <LucideIcon name="chevron-down" className={`w-3 h-3 text-emerald-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute top-16 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-stone-100 py-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-5 py-2 border-b border-stone-100 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Settings</p>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); onSettingsClick(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <LucideIcon name="lock" className="w-4 h-4" />
                  Update Password
                </button>
                <button
                  onClick={() => { setShowDropdown(false); onLogoutClick(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LucideIcon name="log-out" className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};


function ClubReservationSystem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);

  // Trigger Lucide to replace <i> tags with SVGs - only on initial mount
  useEffect(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, []); // Empty array = run only once on mount

  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [bookings, setBookings] = useState([]);

  // Load bookings from backend
  useEffect(() => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setBookings(data);
        } else {
          console.error("Error loading bookings:", data.error);
        }
      })
      .catch(err => console.error("Failed to fetch bookings from server:", err));
  }, []);

  const [messages, setMessages] = useState([]); // System messages for users
  const [maxRoomThreshold, setMaxRoomThreshold] = useState(5);
  const [mealTimes, setMealTimes] = useState(MEAL_TIMES);

  const [memberList, setMemberList] = useState([]);

  useEffect(() => {
    fetch('/api/members')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMemberList(data);
      })
      .catch(err => console.error("Failed to fetch members:", err));
  }, []);

  // Calendar state
  const [calendarView, setCalendarView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date()); // Current date
  const [selectedDate, setSelectedDate] = useState(null);

  // Multi-selection booking state
  const [selectedCells, setSelectedCells] = useState([]); // Array of {roomId, date}
  const [bookingMode, setBookingMode] = useState('calendar'); // 'calendar', 'selection', 'details'
  const [multiRoomBookings, setMultiRoomBookings] = useState([]); // Array of room booking details

  // Global UI state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [editingBooking, setEditingBooking] = useState(null);

  // Helper functions
  const hasRentedLazyLodge = (member, dateStr) => {
    if (member === 'admin') return false;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const period = date.getMonth() < 6 ? 'H1' : 'H2';

    return bookings.some(b => {
      if (b.member !== member || b.provisional || b.building !== 'Lazy Lodge') return false;
      const bDate = new Date(b.startDate);
      const bYear = bDate.getFullYear();
      const bPeriod = bDate.getMonth() < 6 ? 'H1' : 'H2';
      return bYear === year && bPeriod === period;
    });
  };

  const isRoomAvailable = (roomId, startDate, endDate) => {
    return !bookings.some(booking => {
      if (booking.roomId !== roomId) return false;
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const checkStart = new Date(startDate);
      const checkEnd = new Date(endDate);
      return checkStart < bookingEnd && checkEnd > bookingStart;
    });
  };

  const getRoomById = (roomId) => {
    for (const building in inventory) {
      const room = inventory[building].find(r => r.id === roomId);
      if (room) return { ...room, building };
    }
    return null;
  };

  const handlePaymentSuccess = (bookingId, paymentAmount, paymentReference) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updated = {
      ...booking,
      paymentStatus: 'PAID',
      paymentAmount: paymentAmount,
      paymentReference: paymentReference,
      paymentMethod: 'CARD'
    };

    fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setBookings(bookings.map(b => b.id === bookingId ? updated : b));
          setShowPaymentModal(false);
          setPaymentBooking(null);
        } else {
          alert("Error updating payment: " + data.error);
        }
      })
      .catch(err => console.error("Payment update failed:", err));
  };

  const countSimultaneousRooms = (startDate, endDate) => {
    const userBookings = bookings.filter(b => b.member === currentUser);
    let maxOverlap = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    userBookings.forEach(booking => {
      const bStart = new Date(booking.startDate);
      const bEnd = new Date(booking.endDate);
      if (start < bEnd && end > bStart) {
        maxOverlap++;
      }
    });
    return maxOverlap + 1;
  };

  const handleLogin = () => {
    if (!loginUsername || !loginPassword) {
      alert("Please enter both username and password");
      return;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          setView('calendar');
          setLoginPassword(''); // Clear password on success
        } else {
          alert(data.error || "Invalid login credentials");
        }
      })
      .catch(err => {
        console.error("Login error:", err);
        alert("Server connection failed. Please ensure the backend is running.");
      });
  };

  const handlePasswordReset = () => {
    alert("Password reset requested. Please contact the administrator (admin) to reset your credentials manually.");
  };

  const navigateCalendar = (direction) => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setCurrentDate(newDate);
  };

  const confirmMultiRoomBooking = (roomBookings, partyArrivalTime, stayingInCottage, bookingMember = currentUser, paymentDetails = {}) => {

    const newBookings = [];
    const bookingsToRemove = [];
    const bumpedMembers = new Set();

    roomBookings.forEach(roomBooking => {
      const isProvisional = roomBooking.building === 'Lazy Lodge' &&
        hasRentedLazyLodge(currentUser, roomBooking.startDate);

      // Check for provisional bookings in this room/date range
      const startDate = new Date(roomBooking.startDate);
      const endDate = new Date(roomBooking.endDate);

      bookings.forEach(existingBooking => {
        if (existingBooking.provisional &&
          existingBooking.roomId === roomBooking.roomId) {
          const existingStart = new Date(existingBooking.startDate);
          const existingEnd = new Date(existingBooking.endDate);

          // Check for date overlap
          if (existingStart < endDate && existingEnd > startDate) {
            bookingsToRemove.push(existingBooking.id);
            bumpedMembers.add(existingBooking.member);
          }
        }
      });

      const booking = {
        id: `b${bookings.length + newBookings.length + 1}`,
        member: bookingMember,
        adminBooked: currentUser === 'admin',
        building: roomBooking.building,
        roomId: roomBooking.roomId,
        roomName: roomBooking.roomName,
        startDate: roomBooking.startDate,
        endDate: roomBooking.endDate,
        guests: roomBooking.guestNames ? roomBooking.guestNames.length : (roomBooking.guests || 1),
        dailyMeals: roomBooking.dailyMeals,
        memberArrival: partyArrivalTime,
        guestArrival: partyArrivalTime,
        guestNames: roomBooking.guestNames && roomBooking.guestNames.length > 0
          ? roomBooking.guestNames
          : [roomBooking.guestName || ''],
        guestName: roomBooking.guestNames ? roomBooking.guestNames.join(', ') : (roomBooking.guestName || ''),
        dietary: roomBooking.dietary || '',
        isGuest: roomBooking.isGuest === 'MEMBER' || roomBooking.isGuest === false ? 'MEMBER' : 'GUEST',
        isGuestRoom: roomBooking.isGuest === 'MEMBER' || roomBooking.isGuest === false ? 'MEMBER' : 'GUEST',
        memberStayRoom: stayingInCottage ? 'Cottage' : null,
        stayingInCottage: stayingInCottage || false,
        provisional: isProvisional,
        paymentAmount: paymentDetails.paymentAmount || 0,
        paymentStatus: paymentDetails.paymentStatus || 'PENDING',
        paymentMethod: paymentDetails.paymentMethod || null,
        paymentReference: paymentDetails.paymentReference || null
      };

      newBookings.push(booking);

    });

    // Refactored to save to SQLite backend
    Promise.all(newBookings.map(booking =>
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      })
    ))
      .then(() => {
        // Remove provisional bookings that were bumped
        if (bookingsToRemove.length > 0) {
          Promise.all(bookingsToRemove.map(id =>
            fetch(`/api/bookings/${id}`, { method: 'DELETE' })
          )).catch(err => console.error("Error deleting bumped bookings:", err));
        }

        const updatedBookings = bookings.filter(b => !bookingsToRemove.includes(b.id));

        // Create messages for bumped members (in a real app, this would also POST to the backend)
        const newMessages = [];
        bumpedMembers.forEach(member => {
          const message = {
            id: `msg${messages.length + newMessages.length + 1}`,
            recipient: member,
            subject: 'Lazy Lodge Provisional Booking Bumped',
            body: `Your provisional Lazy Lodge booking has been replaced by ${currentUser}, who has priority for Lazy Lodge this calendar year. Please make an alternative reservation.`,
            timestamp: new Date().toISOString(),
            read: false
          };
          newMessages.push(message);

          fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'System',
              to: member,
              text: message.body,
            })
          }).catch(err => console.error("Error sending message:", err));
        });

        setBookings([...updatedBookings, ...newBookings]);
        setMessages([...messages, ...newMessages]);
        setBookingMode('calendar');
        setSelectedCells([]);
        setView('my-reservations');
      })
      .catch(err => {
        console.error("Error saving multi-room booking:", err);
        // Fallback to local state if server fails
        const updatedBookings = bookings.filter(b => !bookingsToRemove.includes(b.id));
        setBookings([...updatedBookings, ...newBookings]);
        setBookingMode('calendar');
        setSelectedCells([]);
        setView('my-reservations');
      });
  };

  const approveBooking = (booking) => {
    if (!confirm(`Accept provisional Lazy Lodge booking for ${booking.member}?`)) return;
    const updated = { ...booking, provisional: false };
    fetch(`/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then(res => res.json())
      .then(() => {
        setBookings(prev => prev.map(b => b.id === booking.id ? updated : b));
      })
      .catch(err => console.error('Error approving booking:', err));
  };

  const cancelBooking = (bookingId) => {
    fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
    })
      .then(() => {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
      })
      .catch(err => {
        console.error("Error canceling booking:", err);
        // Fallback
        setBookings(prev => prev.filter(b => b.id !== bookingId));
      });
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(JSON.parse(JSON.stringify(booking)));
    setSelectedCells([]);
  };

  const saveBookingEdits = (updatedBooking) => {
    fetch(`/api/bookings/${updatedBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBooking)
    })
      .then(() => {
        setBookings(bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        setEditingBooking(null);
      })
      .catch(err => {
        console.error("Error editing booking:", err);
        // Fallback
        setBookings(bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        setEditingBooking(null);
      });
  };

  const downloadBookingsPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [
      'Date', 'Day', 'Member', 'Building', 'Room',
      'Occupant Name', 'Occupant Type',
      'Brk', 'Lun', 'Sup', 'P-Brk', 'P-Lun', 'P-Sup'
    ];

    const getLocalISO = (date) => {
      const offset = date.getTimezoneOffset();
      const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
      return adjusted.toISOString().split('T')[0];
    };

    const rows = [];
    bookings.forEach(b => {
      const start = new Date(b.startDate + 'T00:00:00');
      const end = new Date(b.endDate + 'T00:00:00');

      const guestsCount = b.guests || 1;
      const isMemberRoom = b.isGuest === 'GUEST' ? false : (b.isGuest === 'MEMBER' || b.isGuest === false);
      const isCottageStay = b.stayingInCottage;

      const occupants = [];
      if (isMemberRoom || isCottageStay) {
        occupants.push({ name: b.member, type: 'Member' });
        for (let i = 1; i < guestsCount; i++) {
          occupants.push({ name: `Guest of ${b.member}`, type: 'Guest' });
        }
      } else {
        const label = b.guestName || `Guest of ${b.member}`;
        for (let i = 0; i < guestsCount; i++) {
          occupants.push({ name: label, type: 'Guest' });
        }
      }

      let current = new Date(start);
      while (current < end) {
        const dStr = getLocalISO(current);
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        const meals = b.dailyMeals?.[dStr] || {};

        occupants.forEach(occ => {
          rows.push([
            dStr,
            dayName,
            b.member,
            b.building,
            b.roomName,
            occ.name,
            occ.type,
            meals.breakfast ? 1 : 0,
            meals.lunch ? 1 : 0,
            meals.barSupper ? 1 : 0,
            meals.packedBreakfast ? 1 : 0,
            meals.packedLunch ? 1 : 0,
            meals.packedBarSupper ? 1 : 0
          ]);
        });
        current.setDate(current.getDate() + 1);
      }
    });

    rows.sort((a, b) => {
      if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
      if (a[4] !== b[4]) return a[4].localeCompare(b[4]);
      return String(a[5]).localeCompare(String(b[5]));
    });

    doc.text('Bookings Export', 14, 15);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [6, 78, 59] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 10 },
        7: { cellWidth: 7 },
        8: { cellWidth: 7 },
        9: { cellWidth: 7 }
      }
    });

    doc.save(`bookings-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Main render
  if (!currentUser) {
    return <LoginView
      username={loginUsername}
      setUsername={setLoginUsername}
      password={loginPassword}
      setPassword={setLoginPassword}
      handleLogin={handleLogin}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-stone-100">
      <Navigation
        currentUser={currentUser}
        view={view}
        setView={(v) => { setEditingBooking(null); setView(v); }}
        setCurrentUser={setCurrentUser}
        downloadPDF={downloadBookingsPDF}
        onLogoutClick={() => setShowLogoutConfirm(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        {editingBooking ? (
          <EditBookingDetails
            booking={editingBooking}
            onSave={saveBookingEdits}
            onCancel={() => setEditingBooking(null)}
            onDelete={(bookingId) => {
              cancelBooking(bookingId);
              setEditingBooking(null);
            }}
            currentUser={currentUser}
          />
        ) : (<>
          {(view === 'calendar' || view === 'reserve-pay') && bookingMode !== 'details' && <CalendarView
            currentDate={currentDate}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            setCurrentDate={setCurrentDate}
            bookings={bookings}
            inventory={inventory}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedCells={selectedCells}
            setSelectedCells={setSelectedCells}
            setBookingMode={setBookingMode}
            onEditBooking={setEditingBooking}
            currentUser={currentUser}
            hasRentedLazyLodge={hasRentedLazyLodge}
          />}

          {(view === 'calendar' || view === 'reserve-pay') && bookingMode === 'details' && (
            <MultiRoomBookingDetails
              selectedCells={selectedCells}
              setSelectedCells={setSelectedCells}
              setBookingMode={setBookingMode}
              getRoomById={getRoomById}
              confirmMultiRoomBooking={confirmMultiRoomBooking}
              mealTimesConfig={mealTimes}
              currentUser={currentUser}
              isPayFlow={view === 'reserve-pay'}
            />
          )}



          {view === 'my-reservations' && (
            <MyReservationsView
              bookings={bookings}
              currentUser={currentUser}
              getRoomById={getRoomById}
              cancelBooking={cancelBooking}
              setView={setView}
              onEditBooking={setEditingBooking}
              approveBooking={approveBooking}
              setPaymentBooking={setPaymentBooking}
              setShowPaymentModal={setShowPaymentModal}
            />
          )}

          {view === 'dashboard' && currentUser === 'admin' && (
            <AdminDashboard bookings={bookings} members={memberList} />
          )}

          {view === 'messages' && <MessagesView
            messages={messages}
            currentUser={currentUser}
            validUsers={['admin', 'ChrisP', 'VS1', 'VS2', 'VS3', 'VS4', 'VS5'].filter(u => u !== currentUser)}
            sendMessage={(recipient, subject, body) => {
              const newMessage = {
                id: `m${Date.now()}`,
                sender: currentUser,
                recipient,
                subject,
                text: body,
                timestamp: new Date().toISOString(),
                read: false
              };
              setMessages([newMessage, ...messages]);

              fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from_user: currentUser,
                  to_user: recipient,
                  subject,
                  text: body,
                  timestamp: newMessage.timestamp
                })
              }).catch(err => console.error("Error sending message:", err));
            }}
          />}
          {view === 'reporting' && currentUser !== 'admin' && <ReportingView
            bookings={bookings}
          />}
        </>)}
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        message="Are you sure you want to sign out?"
        onConfirm={() => {
          setCurrentUser(null);
          setShowLogoutConfirm(false);
          setLoginUsername('');
          setLoginPassword('');
          setView('login');
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={currentUser}
      />


      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        booking={paymentBooking}
        currentUser={currentUser}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ClubReservationSystem />);