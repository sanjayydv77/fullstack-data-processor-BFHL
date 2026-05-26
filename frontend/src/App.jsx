import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/tickets';

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ statusCounts: {}, priorityCounts: {}, breachedOpen: 0 });
  const [filters, setFilters] = useState({ priority: '', breached: false });

  const [form, setForm] = useState({ subject: '', description: '', customerEmail: '', priority: 'low' });
  const [formError, setFormError] = useState('');

  const fetchTickets = async () => {
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
      setFormError(err.response?.data?.error || "An error occurred");
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

  const statuses = ['open', 'in_progress', 'resolved', 'closed'];

  // Basic styling setup
  const boardStyle = { display: 'flex', gap: '20px', padding: '20px', overflowX: 'auto' };
  const colStyle = { flex: 1, minWidth: '250px', background: '#f4f4f4', padding: '10px', borderRadius: '5px' };
  const cardStyle = { background: 'white', padding: '15px', marginBottom: '10px', borderRadius: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>DeskFlow Support Board</h1>

      {/* Stats Strip */}
      <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
        <strong>Stats: </strong>
        Open: {stats.statusCounts?.open || 0} |
        In Progress: {stats.statusCounts?.in_progress || 0} |
        Resolved: {stats.statusCounts?.resolved || 0} |
        Closed: {stats.statusCounts?.closed || 0} |
        <span style={{ color: 'red', marginLeft: '10px' }}>Breached (Open): {stats.breachedOpen || 0}</span>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '15px' }}>
          Filter Priority:
          <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} style={{ marginLeft: '5px' }}>
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={filters.breached} onChange={e => setFilters({ ...filters, breached: e.target.checked })} />
          Show SLA Breached Only
        </label>
      </div>

      {/* Board View */}
      <div style={boardStyle}>
        {statuses.map(status => (
          <div key={status} style={colStyle}>
            <h3 style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</h3>
            {tickets.filter(t => t.status === status).map(ticket => (
              <div key={ticket.id} style={cardStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>{ticket.subject}</h4>
                <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                  <span style={{ background: '#ddd', padding: '2px 5px', borderRadius: '3px', marginRight: '5px' }}>{ticket.priority}</span>
                  {ticket.slaBreached && <span style={{ background: 'red', color: 'white', padding: '2px 5px', borderRadius: '3px' }}>SLA BREACHED</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Age: {ticket.ageMinutes} mins</div>

                {/* Status Controls */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {status === 'open' && <button onClick={() => handleMoveStatus(ticket.id, 'in_progress')}>Start Progress</button>}
                  {status === 'in_progress' && (
                    <>
                      <button onClick={() => handleMoveStatus(ticket.id, 'open')}>Back</button>
                      <button onClick={() => handleMoveStatus(ticket.id, 'resolved')}>Resolve</button>
                    </>
                  )}
                  {status === 'resolved' && (
                    <>
                      <button onClick={() => handleMoveStatus(ticket.id, 'in_progress')}>Back</button>
                      <button onClick={() => handleMoveStatus(ticket.id, 'closed')}>Close</button>
                    </>
                  )}
                  {status === 'closed' && <button onClick={() => handleMoveStatus(ticket.id, 'resolved')}>Re-open</button>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <hr style={{ margin: '30px 0' }} />

      {/* Create Form */}
      <div style={{ maxWidth: '400px' }}>
        <h3>Create New Ticket</h3>
        {formError && <div style={{ color: 'red', marginBottom: '10px' }}>{formError}</div>}
        <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input required placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea required placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input required type="email" placeholder="Customer Email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Submit Ticket</button>
        </form>
      </div>
    </div>
  );
}

export default App;