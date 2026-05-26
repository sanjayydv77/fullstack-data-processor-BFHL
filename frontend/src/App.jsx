import { useState, useEffect } from 'react';
import axios from 'axios';

// Dynamically determine the backend URL to support local development and live Netlify deployment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/tickets'
  : 'https://fullstack-data-processor-bfhl.onrender.com/tickets';

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ statusCounts: {}, priorityCounts: {}, openSlaBreachedCount: 0 });
  const [filters, setFilters] = useState({ priority: '', breached: false });

  const [form, setForm] = useState({ subject: '', description: '', customerEmail: '', priority: 'low' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = API_URL;
      const params = new URLSearchParams();
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.breached) params.append('breached', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const { data } = await axios.get(url);
      setTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/stats`);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filters]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await axios.post(API_URL, form);
      setForm({ subject: '', description: '', customerEmail: '', priority: 'low' });
      fetchTickets();
      fetchStats();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create ticket. Please check your inputs.");
    }
  };

  const handleMoveStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/${id}`, { status: newStatus });
      fetchTickets();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "Invalid transition");
    }
  };

  // Age formatting helper: e.g. "3h 12m" or "45m"
  const formatAge = (minutes) => {
    if (minutes < 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return `${hours}h ${remainingMinutes}m`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const statuses = ['open', 'in_progress', 'resolved', 'closed'];

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="header-section">
        <div className="logo-group">
          <h1>DeskFlow</h1>
          <p>Real-time Support Ticket Triage Board & SLA Monitor</p>
        </div>
        
        {/* Connected API Status Badge */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', marginRight: '8px' }}></span>
          Gateway: <strong style={{ color: 'var(--text-primary)' }}>{API_URL.replace('/tickets', '')}</strong>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="stats-strip">
        <div className="stat-item">
          <span className="stat-label">Open</span>
          <span className="stat-value">{stats.statusCounts?.open || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">{stats.statusCounts?.in_progress || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{stats.statusCounts?.resolved || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Closed</span>
          <span className="stat-value">{stats.statusCounts?.closed || 0}</span>
        </div>
        <div className="stat-item breached">
          <span className="stat-label">SLA Breached (Open)</span>
          <span className="stat-value">{stats.openSlaBreachedCount || 0}</span>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="controls-bar">
        <div className="filters-group">
          <div className="filter-item">
            <span>Priority:</span>
            <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.breached} onChange={e => setFilters({ ...filters, breached: e.target.checked })} />
              Show SLA Breached Only
            </label>
          </div>
        </div>
        
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{tickets.length}</strong> active tickets
        </div>
      </div>

      {/* Kanban Board View */}
      {loading && tickets.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading support tickets...</span>
        </div>
      ) : (
        <div className="board">
          {statuses.map(status => {
            const statusTickets = tickets.filter(t => t.status === status);
            return (
              <div key={status} className="column">
                <div className="column-header">
                  <h3 style={{ color: status === 'open' ? '#3b82f6' : status === 'in_progress' ? '#f59e0b' : status === 'resolved' ? '#10b981' : '#9ca3af' }}>
                    {status.replace('_', ' ')}
                  </h3>
                  <span className="column-count">{statusTickets.length}</span>
                </div>
                
                <div className="column-cards">
                  {statusTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                      No tickets
                    </div>
                  ) : (
                    statusTickets.map(ticket => (
                      <div key={ticket._id} className={`card ${ticket.slaBreached ? 'breached' : ''}`}>
                        <div className="card-header">
                          <span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span>
                          {ticket.slaBreached && <span className="badge sla-breached">SLA Breach</span>}
                        </div>
                        
                        <div className="card-title">{ticket.subject}</div>
                        <div className="card-desc">{ticket.description}</div>
                        
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          ✉ {ticket.customerEmail}
                        </div>

                        <div className="card-meta">
                          <span>Age: <strong>{formatAge(ticket.ageMinutes)}</strong></span>
                          <span>ID: ...{ticket._id.substring(ticket._id.length - 6)}</span>
                        </div>

                        {/* Status Transition Controls */}
                        <div className="card-controls">
                          {status === 'open' && (
                            <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'in_progress')}>
                              Start Progress →
                            </button>
                          )}
                          {status === 'in_progress' && (
                            <>
                              <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'open')}>
                                ← Put Back
                              </button>
                              <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'resolved')}>
                                Resolve →
                              </button>
                            </>
                          )}
                          {status === 'resolved' && (
                            <>
                              <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'in_progress')}>
                                ← Reopen
                              </button>
                              <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'closed')}>
                                Close Ticket →
                              </button>
                            </>
                          )}
                          {status === 'closed' && (
                            <button className="btn-move" onClick={() => handleMoveStatus(ticket._id, 'resolved')}>
                              ← Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Layout: Create Form & SLA Documentation */}
      <div className="bottom-layout">
        {/* Create Ticket Form */}
        <div className="form-container">
          <h3>Create New Support Ticket</h3>
          
          {formError && (
            <div className="form-error">
              <span>⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateTicket}>
            <div className="form-group">
              <label>Subject</label>
              <input 
                required 
                placeholder="e.g. Cannot log into account" 
                value={form.subject} 
                onChange={e => setForm({ ...form, subject: e.target.value })} 
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                required 
                rows="3" 
                placeholder="Describe the issue in detail..." 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
              />
            </div>
            
            <div className="form-group">
              <label>Customer Email</label>
              <input 
                required 
                type="email" 
                placeholder="customer@domain.com" 
                value={form.customerEmail} 
                onChange={e => setForm({ ...form, customerEmail: e.target.value })} 
              />
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low (72 Hours SLA)</option>
                <option value="medium">Medium (24 Hours SLA)</option>
                <option value="high">High (4 Hours SLA)</option>
                <option value="urgent">Urgent (1 Hour SLA)</option>
              </select>
            </div>

            <button type="submit" className="btn-submit">Submit Ticket</button>
          </form>
        </div>

        {/* SLA & Status Logic Documentation Box */}
        <div className="info-box">
          <h3>SLA & State Transition Matrix</h3>
          
          <ul className="info-list">
            <li>
              <strong>Urgent SLA:</strong> 
              <span>60 Minutes target response time.</span>
            </li>
            <li>
              <strong>High SLA:</strong> 
              <span>240 Minutes (4 Hours) target response time.</span>
            </li>
            <li>
              <strong>Medium SLA:</strong> 
              <span>1440 Minutes (24 Hours) target response time.</span>
            </li>
            <li>
              <strong>Low SLA:</strong> 
              <span>4320 Minutes (72 Hours) target response time.</span>
            </li>
            <li>
              <strong>Transition Path:</strong> 
              <span>Tickets can only move sequentially: <strong>Open ⇄ In Progress ⇄ Resolved ⇄ Closed</strong>. Skipping steps is blocked by the core system rules.</span>
            </li>
            <li>
              <strong>Resolution:</strong> 
              <span>Moving to <em>Resolved</em> locks the response time duration. Reopening resets the resolution mark.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;