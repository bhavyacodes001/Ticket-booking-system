import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

type DashboardStats = {
  totalUsers: number;
  totalMovies: number;
  totalTheaters: number;
  totalBookings: number;
  totalRevenue: number;
  recentBookings: any[];
};

type UserRow = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
};

type MovieRow = {
  _id: string;
  title: string;
  genre: string[];
  status: string;
  releaseDate: string;
  rating: string;
  isActive: boolean;
  description?: string;
  director?: string;
  duration?: number;
  poster?: string;
  trailer?: string;
  basePrice?: number;
  language?: string;
};

type BookingRow = {
  _id: string;
  bookingNumber: string;
  user: { firstName: string; lastName: string; email: string };
  movie: { title: string };
  theater: { name: string };
  totalAmount: number;
  status: string;
  bookingDate: string;
  showDate: string;
  showTime: string;
};

type RevenueData = {
  period: string;
  total: number;
  count: number;
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'movies' | 'bookings' | 'analytics'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [bookingAnalytics, setBookingAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingTotal, setBookingTotal] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Admin role required.');
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const params: any = { page: userPage, limit: 15 };
      if (userSearch) params.search = userSearch;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users);
      setUserTotal(res.data.pagination?.totalUsers || 0);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  }, [userPage, userSearch]);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await api.get('/movies', { params: { limit: 50 } });
      setMovies(res.data.movies || []);
    } catch (err) {
      console.error('Failed to fetch movies');
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/admin/all', { params: { page: bookingPage, limit: 15 } });
      setBookings(res.data.bookings || []);
      setBookingTotal(res.data.pagination?.totalBookings || 0);
    } catch (err) {
      console.error('Failed to fetch bookings');
    }
  }, [bookingPage]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [revRes, bookRes] = await Promise.all([
        api.get('/admin/analytics/revenue', { params: { period: 'monthly' } }),
        api.get('/admin/analytics/bookings')
      ]);
      setRevenueData(revRes.data.revenue || []);
      setBookingAnalytics(bookRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    fetchDashboard();
  }, [navigate, fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'movies') fetchMovies();
    else if (activeTab === 'bookings') fetchBookings();
    else if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchUsers, fetchMovies, fetchBookings, fetchAnalytics]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await api.get('/admin/reports/export', { params: { format, type: 'bookings' } });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export report');
    }
  };

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
        <h2 style={{ color: '#e50914' }}>{error}</h2>
        <button onClick={() => navigate('/')} style={btnStyle('#6c757d')}>Go Home</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'users', label: '👥 Users' },
    { key: 'movies', label: '🎬 Movies' },
    { key: 'bookings', label: '🎫 Bookings' },
    { key: 'analytics', label: '📈 Analytics' }
  ] as const;

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 'bold' }}>Admin Dashboard</h1>
        <button onClick={() => handleExport('json')} style={btnStyle('#28a745')}>📥 Export Report</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              borderBottom: activeTab === tab.key ? '3px solid #e50914' : '3px solid transparent',
              color: activeTab === tab.key ? '#e50914' : '#666',
              background: 'none', transition: 'all 0.2s'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
      {activeTab === 'users' && (
        <UsersTab users={users} search={userSearch} setSearch={setUserSearch}
          page={userPage} setPage={setUserPage} total={userTotal} onRoleChange={handleRoleChange} />
      )}
      {activeTab === 'movies' && <MoviesTab movies={movies} onRefresh={fetchMovies} />}
      {activeTab === 'bookings' && (
        <BookingsTab bookings={bookings} page={bookingPage} setPage={setBookingPage} total={bookingTotal} />
      )}
      {activeTab === 'analytics' && <AnalyticsTab revenue={revenueData} analytics={bookingAnalytics} />}
    </div>
  );
};

function DashboardTab({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;
  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#007bff' },
    { label: 'Total Movies', value: stats.totalMovies, icon: '🎬', color: '#28a745' },
    { label: 'Total Theaters', value: stats.totalTheaters, icon: '🏢', color: '#fd7e14' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: '🎫', color: '#6f42c1' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: '💰', color: '#e50914' }
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Recent Bookings</h3>
        {(stats.recentBookings || []).length === 0 ? (
          <p style={{ color: '#999' }}>No recent bookings</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Booking #', 'User', 'Movie', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {stats.recentBookings.slice(0, 10).map((b: any) => (
                <tr key={b._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: '#e50914' }}>{b.bookingNumber}</span></td>
                  <td style={tdStyle}>{b.user?.firstName} {b.user?.lastName}</td>
                  <td style={tdStyle}>{b.movie?.title}</td>
                  <td style={tdStyle}>₹{b.totalAmount}</td>
                  <td style={tdStyle}><StatusBadge status={b.status} /></td>
                  <td style={tdStyle}>{new Date(b.bookingDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function UsersTab({ users, search, setSearch, page, setPage, total, onRoleChange }: {
  users: UserRow[]; search: string; setSearch: (s: string) => void;
  page: number; setPage: (p: number) => void; total: number;
  onRoleChange: (id: string, role: string) => void;
}) {
  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>User Management ({total})</h3>
        <input type="text" placeholder="Search users..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, width: 250, outline: 'none' }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={tdStyle}>{u.firstName} {u.lastName}</td>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}><RoleBadge role={u.role} /></td>
              <td style={tdStyle}>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <select value={u.role} onChange={e => onRoleChange(u._id, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="theater_owner">Theater Owner</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
    </div>
  );
}

function MoviesTab({ movies, onRefresh }: { movies: MovieRow[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '', genre: '', director: '', duration: '', rating: '', releaseDate: '', poster: '', trailer: '', basePrice: '', language: 'en' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const resetForm = () => {
    setForm({ title: '', description: '', genre: '', director: '', duration: '', rating: '', releaseDate: '', poster: '', trailer: '', basePrice: '', language: 'en' });
    setEditingMovie(null);
    setShowForm(false);
    setMsg('');
  };

  const openEdit = (m: MovieRow) => {
    setEditingMovie(m);
    setForm({
      title: m.title || '', description: m.description || '', genre: (m.genre || []).join(', '),
      director: m.director || '', duration: String(m.duration || ''),
      rating: m.rating || '', releaseDate: m.releaseDate ? m.releaseDate.slice(0, 10) : '',
      poster: m.poster || '', trailer: m.trailer || '',
      basePrice: String(m.basePrice || ''), language: m.language || 'en'
    });
    setShowForm(true);
    setMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const payload = {
      title: form.title, description: form.description,
      genre: form.genre.split(',').map(g => g.trim()).filter(Boolean),
      director: form.director, duration: parseInt(form.duration) || 120,
      rating: form.rating, releaseDate: form.releaseDate,
      poster: form.poster, trailer: form.trailer,
      basePrice: parseFloat(form.basePrice) || 200, language: form.language
    };
    try {
      if (editingMovie) {
        await api.put(`/movies/${editingMovie._id}`, payload);
        setMsg('Movie updated!');
      } else {
        await api.post('/movies', payload);
        setMsg('Movie created!');
      }
      onRefresh();
      setTimeout(resetForm, 1000);
    } catch (err: any) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to save movie'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/movies/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete movie');
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Movie Catalog ({movies.length})</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #e50914, #b20710)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add Movie
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 20, marginBottom: 20, border: '1px solid #e0e0e0' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 16 }}>{editingMovie ? 'Edit Movie' : 'Add New Movie'}</h4>
          {msg && <div style={{ padding: '8px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('Error') ? '#f8d7da' : '#d4edda', color: msg.startsWith('Error') ? '#721c24' : '#155724' }}>{msg}</div>}
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Director</label>
                <input value={form.director} onChange={e => setForm({ ...form, director: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Genre (comma separated)</label>
                <input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder="Action, Thriller, Drama" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Rating</label>
                <input value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} placeholder="PG-13, R, etc." style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Duration (minutes)</label>
                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="120" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Release Date *</label>
                <input type="date" value={form.releaseDate} onChange={e => setForm({ ...form, releaseDate: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Base Price (₹)</label>
                <input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} placeholder="200" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Language</label>
                <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} style={inputStyle}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="ml">Malayalam</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Poster URL</label>
                <input value={form.poster} onChange={e => setForm({ ...form, poster: e.target.value })} placeholder="https://..." style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: '8px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editingMovie ? 'Update Movie' : 'Create Movie'}
              </button>
              <button type="button" onClick={resetForm}
                style={{ padding: '8px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Title', 'Genre', 'Rating', 'Release Date', 'Status', 'Actions'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {movies.map(m => (
            <tr key={m._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{m.title}</td>
              <td style={tdStyle}>{(m.genre || []).join(', ')}</td>
              <td style={tdStyle}>{m.rating || 'N/A'}</td>
              <td style={tdStyle}>{m.releaseDate ? new Date(m.releaseDate).toLocaleDateString() : 'N/A'}</td>
              <td style={tdStyle}>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: m.isActive ? '#d4edda' : '#f8d7da',
                  color: m.isActive ? '#155724' : '#721c24'
                }}>
                  {m.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(m)}
                    style={{ padding: '4px 10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(m._id, m.title)}
                    style={{ padding: '4px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingsTab({ bookings, page, setPage, total }: {
  bookings: BookingRow[]; page: number; setPage: (p: number) => void; total: number;
}) {
  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>All Bookings ({total})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Booking #', 'User', 'Movie', 'Theater', 'Show Date', 'Amount', 'Status'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={tdStyle}><span style={{ fontWeight: 600, color: '#e50914' }}>{b.bookingNumber}</span></td>
              <td style={tdStyle}>{b.user?.firstName} {b.user?.lastName}</td>
              <td style={tdStyle}>{b.movie?.title || 'N/A'}</td>
              <td style={tdStyle}>{b.theater?.name || 'N/A'}</td>
              <td style={tdStyle}>{b.showDate ? new Date(b.showDate).toLocaleDateString() : 'N/A'} {b.showTime}</td>
              <td style={tdStyle}>₹{b.totalAmount}</td>
              <td style={tdStyle}><StatusBadge status={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
    </div>
  );
}

function AnalyticsTab({ revenue, analytics }: { revenue: RevenueData[]; analytics: any }) {
  const maxRevenue = Math.max(...revenue.map(r => r.total), 1);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Revenue Chart */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Revenue Overview</h3>
        {revenue.length === 0 ? (
          <p style={{ color: '#999' }}>No revenue data available yet</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '0 10px' }}>
            {revenue.map((r, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e' }}>₹{r.total.toLocaleString()}</div>
                <div style={{
                  width: '100%', maxWidth: 50, borderRadius: '6px 6px 0 0',
                  background: `linear-gradient(to top, #e50914, #ff6b6b)`,
                  height: `${Math.max((r.total / maxRevenue) * 160, 4)}px`,
                  transition: 'height 0.5s ease'
                }} />
                <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>{r.period}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{r.count} bookings</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Analytics */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Booking Status Distribution</h3>
            {(analytics.statusDistribution || []).map((s: any) => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <StatusBadge status={s._id} />
                <span style={{ fontWeight: 600 }}>{s.count}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Quick Stats</h3>
            {[
              { label: 'Total Bookings', value: analytics.totalBookings || 0 },
              { label: 'Total Revenue', value: `₹${(analytics.totalRevenue || 0).toLocaleString()}` },
              { label: 'Avg Booking Value', value: `₹${((analytics.totalRevenue || 0) / Math.max(analytics.totalBookings || 1, 1)).toFixed(0)}` }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ color: '#666' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    confirmed: { bg: '#d4edda', fg: '#155724' },
    completed: { bg: '#d4edda', fg: '#155724' },
    pending: { bg: '#fff3cd', fg: '#856404' },
    cancelled: { bg: '#f8d7da', fg: '#721c24' },
    expired: { bg: '#e2e3e5', fg: '#383d41' },
    failed: { bg: '#f8d7da', fg: '#721c24' }
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: '#e50914', fg: '#fff' },
    theater_owner: { bg: '#fd7e14', fg: '#fff' },
    user: { bg: '#e9ecef', fg: '#495057' }
  };
  const c = colors[role] || colors.user;
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg }}>
      {role}
    </span>
  );
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}
        style={{ ...paginationBtn, opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
      <span style={{ padding: '8px 16px', color: '#666', fontSize: 14 }}>
        Page {page} of {totalPages}
      </span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
        style={{ ...paginationBtn, opacity: page >= totalPages ? 0.4 : 1 }}>Next →</button>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#999', textTransform: 'uppercase', letterSpacing: 0.5,
  borderBottom: '2px solid #f0f0f0'
};

const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 14, color: '#333' };

const paginationBtn: React.CSSProperties = {
  padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontSize: 13
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '10px 20px', backgroundColor: bg, color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
  };
}

export default AdminDashboard;
