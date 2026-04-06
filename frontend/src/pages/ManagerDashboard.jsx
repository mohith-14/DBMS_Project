import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, Settings, CalendarPlus, Database } from 'lucide-react';
import './Dashboard.css';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Data States
  const [facilities, setFacilities] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', facility_id: ''});
  const [newFacility, setNewFacility] = useState({ facility_name: '', sport_type: '', price_per_hour: '' });
  const [newEq, setNewEq] = useState({ equipment_name: '', quantity: '', rental_price: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData || JSON.parse(userData).role !== 'manager') {
      navigate('/auth');
    } else {
      setUser(JSON.parse(userData));
      fetchFacilities();
      fetchEquipment();
    }
  }, [navigate]);

  const fetchFacilities = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/facilities');
      setFacilities(res.data);
    } catch(e) { setError('Failed to grab facilities'); }
  };

  const fetchEquipment = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/equipment');
      setEquipment(res.data);
    } catch(e) { setError('Failed to grab equipment'); }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/slots', newSlot);
      setSuccess('1-hour Slot created successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setNewSlot({ date: '', start_time: '', facility_id: ''});
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to create slot');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/facilities', { ...newFacility, manager_id: user.manager_id });
      setSuccess('Facility created successfully!');
      fetchFacilities();
      setNewFacility({ facility_name: '', sport_type: '', price_per_hour: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch(err) { setError(err.response?.data?.error || err.response?.statusText || 'Failed to create facility'); setTimeout(() => setError(''), 4000); }
  };

  const handleCreateEquipment = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/equipment', { ...newEq, manager_id: user.manager_id });
      setSuccess('Equipment added successfully!');
      fetchEquipment();
      setNewEq({ equipment_name: '', quantity: '', rental_price: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch(err) { setError(err.response?.data?.error || err.response?.statusText || 'Failed to add equipment'); setTimeout(() => setError(''), 4000); }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="container">
      <nav className="glass-panel nav-bar">
        <h2 className="text-gradient">Manager Area</h2>
        <div className="nav-profile">
           <span>{user.name} ({user.manager_type})</span>
           <button className="btn-danger flex-btn" onClick={logout}><LogOut size={16}/> Logout</button>
        </div>
      </nav>

      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-success">{success}</div>}

      <div className="dashboard-content">
        <div className="grid-split">
           
           <div className="glass-panel p-2">
             <h3 className="flex-btn"><Database size={20}/> Overview</h3>
             <div className="mt-2">
                <p><strong>Total Facilities:</strong> {facilities.length}</p>
                <p><strong>Total Equipment Types:</strong> {equipment.length}</p>
                <p className="text-muted mt-2 mb-2">Use the form below to expand your database inventory:</p>
                {user.manager_type === 'Facility' ? (
                  <form onSubmit={handleCreateFacility} className="auth-form">
                    <input type="text" className="input-field" placeholder="Facility Name" required value={newFacility.facility_name} onChange={e => setNewFacility({...newFacility, facility_name: e.target.value})} />
                    <input type="text" className="input-field" placeholder="Sport Type" required value={newFacility.sport_type} onChange={e => setNewFacility({...newFacility, sport_type: e.target.value})} />
                    <input type="number" step="0.01" className="input-field" placeholder="Price Per Hour ($)" required value={newFacility.price_per_hour} onChange={e => setNewFacility({...newFacility, price_per_hour: e.target.value})} />
                    <button type="submit" className="btn-primary">Add Facility</button>
                  </form>
                ) : (
                  <form onSubmit={handleCreateEquipment} className="auth-form">
                    <input type="text" className="input-field" placeholder="Equipment Name" required value={newEq.equipment_name} onChange={e => setNewEq({...newEq, equipment_name: e.target.value})} />
                    <input type="number" className="input-field" placeholder="Quantity" required value={newEq.quantity} onChange={e => setNewEq({...newEq, quantity: e.target.value})} />
                    <input type="number" step="0.01" className="input-field" placeholder="Rental Price ($)" required value={newEq.rental_price} onChange={e => setNewEq({...newEq, rental_price: e.target.value})} />
                    <button type="submit" className="btn-primary">Add Equipment</button>
                  </form>
                )}
             </div>
           </div>

           <div className="glass-panel p-2">
             <h3 className="flex-btn"><CalendarPlus size={20}/> Create 1-Hour Slot</h3>
             <form onSubmit={handleCreateSlot} className="auth-form mt-2">
                <div className="input-group">
                   <select 
                     className="input-field" 
                     required
                     value={newSlot.facility_id}
                     onChange={e => setNewSlot({...newSlot, facility_id: e.target.value})}
                   >
                     <option value="" disabled>Select Facility</option>
                     {facilities.map(f => (
                       <option value={f.facility_id} key={f.facility_id}>{f.facility_name}</option>
                     ))}
                   </select>
                </div>
                <div className="grid-split" style={{gap: '12px'}}>
                  <input 
                    type="date" 
                    className="input-field" 
                    required 
                    value={newSlot.date}
                    onChange={e => setNewSlot({...newSlot, date: e.target.value})}
                  />
                  <input 
                    type="time" 
                    className="input-field" 
                    required
                    value={newSlot.start_time}
                    onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary">Add Time Slot</button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
}
