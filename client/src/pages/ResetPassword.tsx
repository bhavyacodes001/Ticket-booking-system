import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ color: '#e50914', marginBottom: 12 }}>Invalid Reset Link</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>This password reset link is invalid or missing a token. Please request a new one.</p>
        <button onClick={() => navigate('/login')} style={btnStyle}>Go to Login</button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#28a745', marginBottom: 12 }}>Password Reset Successful!</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>Your password has been changed. You can now login with your new password.</p>
        <button onClick={() => navigate('/login')} style={btnStyle}>Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: '80px auto', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }}>Reset Your Password</h2>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Enter your new password below</p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...btnStyle, width: '100%', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: '#e50914', fontSize: 14, textDecoration: 'none' }}>← Back to Login</a>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
};

const btnStyle: React.CSSProperties = {
  padding: '12px 24px', background: 'linear-gradient(135deg, #e50914, #b20710)',
  color: '#fff', border: 'none', borderRadius: 8, fontSize: 16,
  fontWeight: 600, cursor: 'pointer'
};

export default ResetPassword;
