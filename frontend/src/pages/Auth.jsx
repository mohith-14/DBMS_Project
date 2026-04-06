import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Mail, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import './Auth.css'; // Specific styling for the auth page

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        
        // Store user/manager data
        const userData = response.data;
        localStorage.setItem('user', JSON.stringify(userData));
        
        if (userData.role === 'manager') {
          navigate('/manager');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Register Student/User
        const response = await axios.post('http://localhost:5000/api/auth/register', formData);
        
        // Auto login after test register for UX
        const loginResp = await axios.post('http://localhost:5000/api/auth/login', {
            email: formData.email,
            password: formData.password
        });
        localStorage.setItem('user', JSON.stringify(loginResp.data));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication error occurred.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="logo-container">
             <ShieldCheck size={48} className="text-gradient logo-icon" />
          </div>
          <h1 className="text-gradient">Sports Complex</h1>
          <p className="text-muted">
            {isLogin ? 'Sign in to book your session' : 'Create an account to join us'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <User size={20} className="input-icon" />
              <input
                type="text"
                name="name"
                className="input-field"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="input-group">
              <Phone size={20} className="input-icon" />
              <input
                type="tel"
                name="phone"
                className="input-field"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input
              type="password"
              name="password"
              className="input-field"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit">
            {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              className="toggle-link text-gradient" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Register Here' : 'Log In Here'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
