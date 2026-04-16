import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import './App.css';

const API_URL = 'http://localhost:3000';
const COURSES = ['B.Sc', 'B.Com', 'BCA', 'B.Tech', 'MBA', 'MCA', 'M.Sc', 'M.Tech'];
const initialForm = { name: '', email: '', course: '', fee: '' };
const PIE_COLORS = ['#4f8ef7', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#38bdf8', '#facc15', '#f87171'];

const ChartTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        {label && <div className="ct-label">{label}</div>}
        {payload.map((p, i) => (
          <div key={i} className="ct-row">
            <span className="ct-dot" style={{ background: p.color }} />
            <span>{p.name}: </span>
            <span className="ct-val">{prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function App() {
  const [students,      setStudents]      = useState([]);
  const [payments,      setPayments]      = useState([]);
  const [stats,         setStats]         = useState({ totalStudents: 0, totalRevenue: 0, courseBreakdown: [], totalCollected: 0 });
  const [form,          setForm]          = useState(initialForm);
  const [editId,        setEditId]        = useState(null);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [toast,         setToast]         = useState(null);
  const [activeTab,     setActiveTab]     = useState('dashboard');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errors,        setErrors]        = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/students`, { params: { search } });
      setStudents(res.data.data || []);
    } catch { showToast('Failed to fetch students', 'error'); }
    finally { setLoading(false); }
  }, [search]);

  const fetchStats = useCallback(async () => {
    try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data.data || {}); } catch {}
  }, []);

  const fetchPayments = useCallback(async () => {
    try { const res = await axios.get(`${API_URL}/payments`); setPayments(res.data.data || []); } catch {}
  }, []);

  useEffect(() => { fetchStudents(); fetchStats(); fetchPayments(); }, [fetchStudents, fetchStats, fetchPayments]);

  // Build monthly chart data from students array
  const monthlyData = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts  = Array(12).fill(0);
    const revenue = Array(12).fill(0);
    students.forEach(s => {
      const m = new Date(s.createdAt).getMonth();
      counts[m]++;
      revenue[m] += s.fee || 0;
    });
    return months.map((month, i) => ({ month, students: counts[i], revenue: revenue[i] }));
  })();

  const pieData = (stats.courseBreakdown || []).map(c => ({ name: c._id, value: c.count }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name   = 'Name is required';
    if (!form.email.trim()) e.email  = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.course)       e.course = 'Course is required';
    if (!form.fee)          e.fee    = 'Fee is required';
    else if (Number(form.fee) <= 0) e.fee = 'Fee must be positive';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      if (editId) {
        await axios.put(`${API_URL}/students/${editId}`, form);
        showToast('Student updated!');
        setEditId(null);
      } else {
        await axios.post(`${API_URL}/students`, form);
        showToast('Student registered!');
      }
      setForm(initialForm); setErrors({});
      fetchStudents(); fetchStats(); setActiveTab('students');
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong', 'error');
    } finally { setLoading(false); }
  };

  const handleEdit = (s) => {
    setForm({ name: s.name, email: s.email, course: s.course, fee: s.fee });
    setEditId(s._id); setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/students/${id}`);
      showToast('Student removed'); setDeleteConfirm(null);
      fetchStudents(); fetchStats();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const cancelEdit = () => { setEditId(null); setForm(initialForm); setErrors({}); };

  const inp = (field, type = 'text') => ({
    type, value: form[field],
    onChange: e => { setForm({ ...form, [field]: e.target.value }); if (errors[field]) setErrors({ ...errors, [field]: '' }); },
    className: `input-field ${errors[field] ? 'input-error' : ''}`,
  });

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'register',  label: editId ? '✏️ Edit' : '➕ Register' },
    { id: 'students',  label: '👥 Students' },
    { id: 'payments',  label: '💳 Payments' },
  ];

  return (
    <div className="app">

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">⚠️</div>
            <h3>Delete Student?</h3>
            <p>This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger"    onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-brand">
          <div className="header-logo">🎓</div>
          <div>
            <h1 className="header-title">EduTrack</h1>
            <p className="header-sub">College Registration System</p>
          </div>
        </div>
        <nav className="header-nav">
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn ${activeTab === t.id ? 'nav-btn-active' : ''}`}
              onClick={() => { setActiveTab(t.id); if (t.id !== 'register') cancelEdit(); }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="page-header">
              <h2>Dashboard Overview</h2>
              <p>Real-time summary of your college registrations</p>
            </div>

            <div className="stats-grid">
              {[
                { icon: '👥', value: stats.totalStudents,              label: 'Total Students',       cls: 'stat-blue',   prefix: '' },
                { icon: '💰', value: stats.totalRevenue,               label: 'Total Revenue',         cls: 'stat-green',  prefix: '₹' },
                { icon: '📚', value: stats.courseBreakdown?.length||0, label: 'Active Courses',        cls: 'stat-purple', prefix: '' },
                { icon: '💳', value: stats.totalCollected||0,          label: 'Payments Collected',    cls: 'stat-orange', prefix: '₹' },
              ].map((s, i) => (
                <div key={i} className={`stat-card ${s.cls}`}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-info">
                    <div className="stat-value">{s.prefix}{typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="charts-grid">
              <div className="chart-card chart-wide">
                <h3 className="card-title">📈 Monthly Registrations</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2435" />
                    <XAxis dataKey="month" tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="students" name="Students" stroke="#4f8ef7" strokeWidth={2} fill="url(#gradBlue)" dot={{ fill:'#4f8ef7', r:3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="card-title">🥧 Course Split</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {pieData.map((d, i) => (
                        <div key={i} className="pie-legend-item">
                          <span className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span>{d.name}</span>
                          <span className="pie-count">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="empty-state">No data yet</div>}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">💰 Monthly Revenue (₹)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#34d399" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2435" />
                  <XAxis dataKey="month" tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip prefix="₹" />} />
                  <Bar dataKey="revenue" name="Revenue" fill="url(#gradGreen)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🕐 Recent Registrations</h3>
                <button className="btn-link" onClick={() => setActiveTab('students')}>View All →</button>
              </div>
              <div className="recent-list">
                {students.slice(0, 5).map(s => (
                  <div key={s._id} className="recent-item">
                    <div className="student-avatar">{s.name[0].toUpperCase()}</div>
                    <div className="recent-info">
                      <div className="recent-name">{s.name}</div>
                      <div className="recent-course">{s.course}</div>
                    </div>
                    <div className="recent-fee">₹{Number(s.fee).toLocaleString('en-IN')}</div>
                  </div>
                ))}
                {students.length === 0 && <div className="empty-state">No students yet.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── REGISTER ── */}
        {activeTab === 'register' && (
          <div className="tab-content">
            <div className="page-header">
              <h2>{editId ? '✏️ Edit Student' : '➕ Register New Student'}</h2>
              <p>{editId ? 'Update student information' : 'Fill in the details to register'}</p>
            </div>
            <div className="form-card">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input {...inp('name')} placeholder="e.g. Arjun Kumar" />
                    {errors.name && <span className="error-msg">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email <span className="required">*</span></label>
                    <input {...inp('email','email')} placeholder="e.g. arjun@example.com" />
                    {errors.email && <span className="error-msg">{errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course <span className="required">*</span></label>
                    <select value={form.course} className={`input-field ${errors.course ? 'input-error' : ''}`}
                      onChange={e => { setForm({...form, course: e.target.value}); if(errors.course) setErrors({...errors, course:''}); }}>
                      <option value="">Select a course</option>
                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.course && <span className="error-msg">{errors.course}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee (₹) <span className="required">*</span></label>
                    <input {...inp('fee','number')} placeholder="e.g. 50000" />
                    {errors.fee && <span className="error-msg">{errors.fee}</span>}
                  </div>
                </div>
                <div className="form-actions">
                  {editId && <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>}
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading && <span className="spinner" />}
                    {editId ? 'Update Student' : 'Register Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {activeTab === 'students' && (
          <div className="tab-content">
            <div className="page-header-row">
              <div>
                <h2>👥 All Students</h2>
                <p>{students.length} student{students.length !== 1 ? 's' : ''} found</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('register')}>+ Add Student</button>
            </div>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search by name or email..." value={search}
                onChange={e => setSearch(e.target.value)} className="search-input" />
              {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>
            {loading ? (
              <div className="loading-state"><div className="loader" /><p>Loading...</p></div>
            ) : students.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">🎓</div>
                <h3>No students found</h3>
                <p>{search ? 'Try a different search.' : 'Register your first student.'}</p>
                {!search && <button className="btn-primary" onClick={() => setActiveTab('register')}>Register Now</button>}
              </div>
            ) : (
              <div className="table-card">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Student</th><th>Email</th><th>Course</th><th>Fee</th><th>Status</th><th>Enrolled</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => (
                        <tr key={s._id} className="table-row">
                          <td className="td-num">{idx+1}</td>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar-sm">{s.name[0].toUpperCase()}</div>
                              <span>{s.name}</span>
                            </div>
                          </td>
                          <td className="td-email">{s.email}</td>
                          <td><span className="badge-course">{s.course}</span></td>
                          <td className="td-fee">₹{Number(s.fee).toLocaleString('en-IN')}</td>
                          <td><span className={`badge-status badge-${s.status?.toLowerCase()}`}>{s.status}</span></td>
                          <td className="td-date">{new Date(s.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                          <td>
                            <div className="action-btns">
                              <button className="action-edit"   onClick={() => handleEdit(s)}           title="Edit">✏️</button>
                              <button className="action-delete" onClick={() => setDeleteConfirm(s._id)} title="Delete">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab === 'payments' && (
          <div className="tab-content">
            <div className="page-header">
              <h2>💳 Payment History</h2>
              <p>
                {payments.length} payment{payments.length !== 1 ? 's' : ''} · Total collected:{' '}
                <strong className="green-text">₹{payments.reduce((s,p) => s+p.amount, 0).toLocaleString('en-IN')}</strong>
              </p>
            </div>
            {payments.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">💳</div>
                <h3>No payments yet</h3>
                <p>Payments appear here after students pay via Stripe.</p>
              </div>
            ) : (
              <div className="table-card">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Student</th><th>Course</th><th>Amount</th><th>Transaction ID</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={p._id} className="table-row">
                          <td className="td-num">{i+1}</td>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar-sm">{p.studentName?.[0]?.toUpperCase()||'?'}</div>
                              <div>
                                <div>{p.studentName}</div>
                                <div className="td-email">{p.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge-course">{p.course}</span></td>
                          <td className="td-fee">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                          <td><span className="txn-id">#{p.stripePaymentIntentId?.slice(-10).toUpperCase()}</span></td>
                          <td><span className="badge-status badge-active">✓ Paid</span></td>
                          <td className="td-date">{new Date(p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      <footer className="footer">
        <p>© 2025 EduTrack · Built with React, Node.js, Express & MongoDB</p>
      </footer>
    </div>
  );
}