import React, { useEffect, useState } from 'react';
import NotificationToast from '../../components/NotificationToast';
import Papa from 'papaparse';
// Mock currentUser for RBAC
const currentUser = {
  name: 'Jane Doe',
  roles: ['admin'] // Change to [] to test non-admin view
};
import api from '../../api/client';
import SafetyMomentModal from '../../components/admin/SafetyMomentModal';
import HistoryModal from '../../components/admin/HistoryModal';
import TableSkeleton from '../../components/admin/TableSkeleton';
import { useRef } from 'react';

const SafetyMoments = () => {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [editingMoment, setEditingMoment] = useState(null);
  const [undoMoment, setUndoMoment] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
    // Mock fetch for audit/history data
    const handleViewHistory = async (moment) => {
      setHistoryTitle(moment.title);
      // TODO: Replace with real API call
      setHistoryData([
        { action: 'Created', user: 'admin', date: moment.startDate, details: 'Initial creation' },
        { action: 'Updated', user: 'jane.doe', date: moment.endDate, details: 'Changed end date' },
      ]);
      setHistoryOpen(true);
    };
  const [filterSite, setFilterSite] = useState('All Sites');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selected, setSelected] = useState([]);
  const undoTimeout = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/safety-moments');
        setMoments(res.data);
      } catch (err) {
        setError('Failed to load safety moments.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = () => {
    setEditingMoment(null);
    setModalOpen(true);
  };

  const handleEdit = (moment) => {
    setEditingMoment(moment);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingMoment) {
        await api.put(`/admin/safety-moments/${editingMoment.id}`, data);
        setSuccess('Safety moment updated successfully.');
      } else {
        await api.post('/admin/safety-moments', data);
        setSuccess('Safety moment created successfully.');
      }
      const res = await api.get('/admin/safety-moments');
      setMoments(res.data);
      setModalOpen(false);
      setEditingMoment(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save safety moment.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
    if (!error) {
      setToastType('success');
      setShowToast(true);
    }
  };

  const handleArchive = async (moment) => {
    if (!window.confirm('Are you sure you want to archive this safety moment?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/safety-moments/${moment.id}`);
      setUndoMoment(moment);
      setSuccess('Safety moment archived. Undo?');
      undoTimeout.current = setTimeout(() => setUndoMoment(null), 8000);
      const res = await api.get('/admin/safety-moments');
      setMoments(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to archive safety moment.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
    if (!error) {
      setToastType('success');
      setShowToast(true);
    }
  };

  const handleUndo = async () => {
    if (!undoMoment) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/admin/safety-moments', undoMoment);
      setSuccess('Archive undone.');
      setUndoMoment(null);
      const res = await api.get('/admin/safety-moments');
      setMoments(res.data);
    } catch (err) {
      setError('Failed to undo archive.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
    if (!error) {
      setToastType('success');
      setShowToast(true);
    }
  };

  // Filtering, searching, and pagination logic
  const filtered = moments.filter(m => {
    if (filterSite !== 'All Sites' && !(m.sites || []).includes(filterSite)) return false;
    if (filterRole !== 'All Roles' && !(m.roles || []).includes(filterRole)) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (search && !(
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allSites = Array.from(new Set(moments.flatMap(m => m.sites || [])));
  const allRoles = Array.from(new Set(moments.flatMap(m => m.roles || [])));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(paged.map(m => m.id));
    } else {
      setSelected([]);
    }
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleBulkArchive = async () => {
    if (!window.confirm('Archive selected safety moments?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Promise.all(selected.map(id => api.delete(`/admin/safety-moments/${id}`)));
      setSuccess('Selected safety moments archived.');
      setSelected([]);
      const res = await api.get('/admin/safety-moments');
      setMoments(res.data);
    } catch (err) {
      setError('Bulk archive failed.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
    if (!error) {
      setToastType('success');
      setShowToast(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(moments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `safety_moments_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('Exported safety moments as CSV.');
  };

  // Import CSV
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
          await Promise.all(results.data.map(row => api.post('/admin/safety-moments', row)));
          setSuccess('Imported safety moments from CSV.');
          const res = await api.get('/admin/safety-moments');
          setMoments(res.data);
        } catch (err) {
          setError('Import failed. Please check your CSV format.');
        } finally {
          setLoading(false);
        }
      },
      error: () => setError('Failed to parse CSV file.')
    });
  };

  const isAdmin = currentUser.roles.includes('admin') || currentUser.roles.includes('safety_manager');
  return (
    <div className="page admin-safety-moments" aria-labelledby="safety-moments-heading">
      <h2 id="safety-moments-heading">Safety Moments</h2>
      <div className="admin-desc">Create and schedule safety messages to display on dashboards and task pages.</div>
      <div className="admin-toolbar" role="region" aria-label="Safety Moments Filters and Actions">
        <label htmlFor="filter-site" className="sr-only">Filter by Site</label>
        <select id="filter-site" className="admin-filter-site" value={filterSite} onChange={e => { setFilterSite(e.target.value); setPage(1); }} aria-label="Filter by site">
          <option>All Sites</option>
          {allSites.map(site => <option key={site}>{site}</option>)}
        </select>
        <label htmlFor="filter-role" className="sr-only">Filter by Role</label>
        <select id="filter-role" className="admin-filter-role" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }} aria-label="Filter by role">
          <option>All Roles</option>
          {allRoles.map(role => <option key={role}>{role}</option>)}
        </select>
        <label htmlFor="filter-status" className="sr-only">Filter by Status</label>
        <select id="filter-status" className="admin-filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option>Active</option>
          <option>Scheduled</option>
          <option>Expired</option>
        </select>
        <label htmlFor="search-moments" className="sr-only">Search Safety Moments</label>
        <input
          id="search-moments"
          className="admin-search"
          placeholder="Search title or category..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search safety moments"
        />
        <button type="button" onClick={handleExportCSV} className="admin-export-btn" aria-label="Export CSV">Export CSV</button>
        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="admin-import-btn" aria-label="Import CSV">Import CSV</button>
        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} aria-label="Import CSV file" />
        {isAdmin && (
          <button className="admin-create-btn" onClick={handleCreate} aria-label="Create Safety Moment">Create Safety Moment</button>
        )}
        {isAdmin && selected.length > 0 && (
          <button className="admin-bulk-archive-btn" onClick={handleBulkArchive} aria-label="Archive Selected Safety Moments">Archive Selected</button>
        )}
      </div>
      {/* Notification Toast */}
      <NotificationToast
        message={success || error}
        type={toastType}
        onClose={() => { setSuccess(''); setError(''); setShowToast(false); }}
        duration={3500}
      />
      <table className="admin-table" aria-label="Safety Moments Table">
        <thead>
          <tr>
            <th scope="col"><input type="checkbox" checked={paged.length > 0 && selected.length === paged.length} onChange={handleSelectAll} aria-label="Select all" tabIndex={0} disabled={!isAdmin} /></th>
            <th scope="col">Title</th>
            <th scope="col">Category</th>
            <th scope="col">Applies To</th>
            <th scope="col">Roles</th>
            <th scope="col">Start date</th>
            <th scope="col">End date</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        {loading ? <TableSkeleton columns={9} rows={6} /> : (
          <tbody>
            {paged.map((m, idx) => (
              <tr key={m.id} tabIndex={0} aria-rowindex={idx + 2}>
                <td><input type="checkbox" checked={selected.includes(m.id)} onChange={() => handleSelect(m.id)} aria-label={`Select ${m.title}`} tabIndex={0} disabled={!isAdmin} /></td>
                <td>{m.title}</td>
                <td>{m.category}</td>
                <td>{m.sites?.join(', ') || 'All sites'}</td>
                <td>{m.roles?.join(', ') || 'All roles'}</td>
                <td>{m.startDate}</td>
                <td>{m.endDate}</td>
                <td>{m.status}</td>
                <td>
                  {isAdmin && <button onClick={() => handleEdit(m)} aria-label={`Edit ${m.title}`}>Edit</button>}
                  {isAdmin && <button onClick={() => handleArchive(m)} aria-label={`Archive ${m.title}`}>Archive</button>}
                  <button onClick={() => handleViewHistory(m)} aria-label={`View history for ${m.title}`}>View History</button>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
      {!loading && (
        <div className="admin-pagination" role="navigation" aria-label="Pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">Prev</button>
          <span>Page {page} of {totalPages || 1}</span>
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)} aria-label="Next page">Next</button>
        </div>
      )}
      <SafetyMomentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        moment={editingMoment}
      />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={historyData}
        title={historyTitle}
      />
    </div>
  );
};

export default SafetyMoments;
