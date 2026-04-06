import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import UserDashboard from './pages/UserDashboard';
import ManagerDashboard from './pages/ManagerDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/auth" />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
