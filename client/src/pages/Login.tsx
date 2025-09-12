import React, { useState } from 'react';
import { api } from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      setMessage('✅ Login successful!');
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error: any) {
      setMessage(`❌ Error: ${error.response?.data?.message || 'Login failed'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '30px' }}>
        <h1 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>🔑 Login</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <button 
          type="submit" 
          style={{ 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </form>

        {message && (
          <div className="message" style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Don't have an account? Register here</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
