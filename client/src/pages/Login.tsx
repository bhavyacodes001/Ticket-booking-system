import React, { useState } from 'react';
import { api } from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setMessage('✅ If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed to send reset email'}`);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '420px', margin: '60px auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        
        {!showForgot ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #e50914, #b20710)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 28, color: '#fff' }}>🔑</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }}>Welcome Back</h1>
              <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>Sign in to your CinePlex account</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Enter your password"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="button" onClick={() => { setShowForgot(true); setMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#e50914', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit"
                style={{ padding: '12px', background: 'linear-gradient(135deg, #e50914, #b20710)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                Login
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <span style={{ color: '#888', fontSize: 14 }}>Don't have an account? </span>
              <a href="/register" style={{ color: '#e50914', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Sign Up</a>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }}>Forgot Password?</h1>
              <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>Enter your email and we'll send you a reset link</p>
            </div>

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Email</label>
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={forgotLoading}
                style={{ padding: '12px', background: 'linear-gradient(135deg, #e50914, #b20710)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button type="button" onClick={() => { setShowForgot(false); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#e50914', fontSize: 14, cursor: 'pointer' }}>
                ← Back to Login
              </button>
            </div>
          </>
        )}

        {message && (
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: 14,
            background: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
