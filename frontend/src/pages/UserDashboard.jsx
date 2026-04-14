import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Calendar, Dumbbell, Clock, Info } from 'lucide-react';
import './Dashboard.css';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('facilities'); // 'facilities', 'equipment', 'myactivity'
  
  // Data States
  const [facilities, setFacilities] = useState([]);
  const [slots, setSlots] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [myRentals, setMyRentals] = useState([]);

  // Selection States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedRentalSlotId, setSelectedRentalSlotId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/auth');
    } else {
      setUser(JSON.parse(userData));
      fetchFacilities();
      fetchEquipment();
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMyActivity();
    }
  }, [user]);

  const fetchFacilities = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/facilities');
      setFacilities(res.data);
    } catch (e) { setError('Failed to load facilities')}
  };

  const fetchEquipment = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/equipment');
      setEquipment(res.data);
    } catch (e) { setError('Failed to load equipment')}
  };

  const fetchSlots = async (facilityId, date) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/slots/${facilityId}?date=${date}`);
      setSlots(res.data);
    } catch (e) { setError('Failed to load slots')}
  };

  const fetchMyActivity = async () => {
    try {
      const bkRes = await axios.get(`http://localhost:5000/api/user/${user.user_id}/bookings`);
      setMyBookings(bkRes.data);
      const rtRes = await axios.get(`http://localhost:5000/api/user/${user.user_id}/rentals`);
      setMyRentals(rtRes.data);
    } catch (e) { setError('Failed to load your activity')}
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    fetchSlots(facility.facility_id, selectedDate);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    if (selectedFacility) {
      fetchSlots(selectedFacility.facility_id, e.target.value);
    }
  };

  const handleBookSlot = async (slotId) => {
    try {
      await axios.post('http://localhost:5000/api/bookings', {
        slot_id: slotId,
        user_id: user.user_id,
        date: new Date().toISOString().split('T')[0]
      });
      setSuccess('Slot successfully booked!');
      fetchSlots(selectedFacility.facility_id, selectedDate);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error booking slot');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.delete(`http://localhost:5000/api/bookings/${bookingId}`);
      setSuccess('Booking cancelled.');
      fetchMyActivity();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Cancellation Policy restricts this action.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleRentEquipment = async (eq) => {
     if (!selectedRentalSlotId) {
        setError('Please select a booked slot to attach the equipment to.');
        setTimeout(() => setError(''), 3000);
        return;
     }
     
     try {
       await axios.post('http://localhost:5000/api/rentals', {
         user_id: user.user_id,
         equipment_id: eq.equipment_id,
         rental_date: new Date().toISOString().split('T')[0],
         quantity: 1,
         slot_id: selectedRentalSlotId
       });
       setSuccess(`Rented 1 ${eq.equipment_name} successfully!`);
       fetchEquipment(); // refresh quantity
       fetchMyActivity();
       setTimeout(() => setSuccess(''), 3000);
     } catch(e) {
        setError(e.response?.data?.message || 'Failed to rent equipment');
        setTimeout(() => setError(''), 3000);
     }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="container">
      <nav className="glass-panel nav-bar">
        <h2 className="text-gradient">Sports Complex</h2>
        <div className="nav-profile">
           <span>Welcome, {user.name}</span>
           <button className="btn-danger flex-btn" onClick={logout}><LogOut size={16}/> Logout</button>
        </div>
      </nav>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'facilities' ? 'active' : ''}`} onClick={() => setActiveTab('facilities')}>
           <Calendar size={18}/> Book Facility
        </button>
        <button className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>
           <Dumbbell size={18}/> Rent Equipment
        </button>
        <button className={`tab-btn ${activeTab === 'myactivity' ? 'active' : ''}`} onClick={() => setActiveTab('myactivity')}>
           <Clock size={18}/> My Activity
        </button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-success">{success}</div>}

      <div className="dashboard-content">
        {activeTab === 'facilities' && (
          <div className="grid-split">
            <div className="list-panel glass-panel">
               <h3>Facilities</h3>
               <div className="card-grid col-1">
                 {facilities.map(f => (
                   <div key={f.facility_id} 
                        className={`card ${selectedFacility?.facility_id === f.facility_id ? 'selected' : ''}`}
                        onClick={() => handleFacilitySelect(f)}>
                     <h4>{f.facility_name}</h4>
                     <span className="price-tag">₹{f.price_per_hour}/hr</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="details-panel glass-panel">
               {selectedFacility ? (
                 <>
                   <div className="panel-header">
                     <h3>{selectedFacility.facility_name} Slots</h3>
                     <input type="date" className="input-field date-picker" value={selectedDate} onChange={handleDateChange} />
                   </div>
                   {slots.length === 0 ? (
                     <p className="text-muted text-center mt-2">No available slots for this date.</p>
                   ) : (
                     <div className="slot-grid mt-2">
                       {slots.map(s => (
                         <div key={s.slot_id} className="slot-card">
                            <span className="slot-time">{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</span>
                            <button className="btn-primary" onClick={() => handleBookSlot(s.slot_id)}>Book</button>
                         </div>
                       ))}
                     </div>
                   )}
                 </>
               ) : (
                 <div className="placeholder-text"><Info size={40}/><p>Select a facility to view availability</p></div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="glass-panel p-2">
            <div className="panel-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem'}}>
               <h3>Available Equipment</h3>
               <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                 <label>Attach to Slot:</label>
                 <select className="input-field" value={selectedRentalSlotId} onChange={(e) => setSelectedRentalSlotId(e.target.value)}>
                   <option value="">-- Choose your booking --</option>
                   {myBookings.filter(b => b.booking_status !== 'cancelled').map(b => (
                     <option key={b.booking_id} value={b.slot_id}>
                       {b.facility_name} ({b.date.substring(0,10)} at {b.start_time.substring(0,5)})
                     </option>
                   ))}
                 </select>
               </div>
            </div>
            <div className="card-grid">
               {equipment.map(eq => (
                 <div key={eq.equipment_id} className="card equipment-card">
                   <h4>{eq.equipment_name}</h4>
                   <p className="text-muted">Available: {eq.quantity}</p>
                   <div className="action-row">
                     <span className="price-tag">₹{eq.rental_price}/day</span>
                     <button className="btn-primary" 
                             disabled={eq.quantity <= 0}
                             onClick={() => handleRentEquipment(eq)}>
                       Rent
                     </button>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'myactivity' && (
          <div className="grid-split">
            <div className="glass-panel p-2">
               <h3>My Bookings</h3>
               {myBookings.length === 0 ? <p className="text-muted mt-1">No bookings found.</p> : (
                 <div className="list-stack mt-2">
                   {myBookings.map(b => (
                     <div key={b.booking_id} className="activity-card">
                       <div>
                         <h4>{b.facility_name}</h4>
                         <p className="text-muted">{b.date.substring(0,10)} | {b.start_time.substring(0,5)}</p>
                         <p className="status text-gradient">{b.booking_status}</p>
                       </div>
                       {b.booking_status !== 'cancelled' && (
                         <button className="btn-danger" onClick={() => handleCancelBooking(b.booking_id)}>Cancel</button>
                       )}
                     </div>
                   ))}
                 </div>
               )}
            </div>
            
            <div className="glass-panel p-2">
               <h3>My Rentals</h3>
               {myRentals.length === 0 ? <p className="text-muted mt-1">No rentals found.</p> : (
                 <div className="list-stack mt-2">
                   {myRentals.map(r => (
                     <div key={r.rental_id} className="activity-card">
                       <div>
                         <h4>{r.equipment_name} (x{r.quantity})</h4>
                         <p className="text-muted">
                           Rented on: {r.rental_date.substring(0,10)}
                           <br/>Slot: {r.slot_date?.substring(0,10)} at {r.start_time?.substring(0,5)}
                         </p>
                         <p className={`status ${r.status === 'returned' ? 'text-muted' : 'text-gradient'}`}>
                           {r.status?.toUpperCase() || 'ACTIVE'}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
