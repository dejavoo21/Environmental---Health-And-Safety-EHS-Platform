// Mock currentUser for RBAC
const currentUser = {
  name: 'Jane Doe',
  roles: ['admin'] // Change to [] to test non-admin view
};
import React, { useEffect, useState } from 'react';
import NotificationToast from '../../components/NotificationToast';
import Papa from 'papaparse';
import api from '../../api/client';
import PPERuleModal from '../../components/admin/PPERuleModal';
import HistoryModal from '../../components/admin/HistoryModal';
import TableSkeleton from '../../components/admin/TableSkeleton';
import { useRef } from 'react';

const PPERules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [editingRule, setEditingRule] = useState(null);
  const [undoRule, setUndoRule] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
    // Mock fetch for audit/history data
    const handleViewHistory = async (rule) => {
      setHistoryTitle(rule.taskType);
      // TODO: Replace with real API call
      setHistoryData([
        { action: 'Created', user: 'admin', date: rule.createdAt || '2026-01-01', details: 'Initial creation' },
        { action: 'Updated', user: 'jane.doe', date: rule.updatedAt || '2026-02-01', details: 'Changed weather category' },
      ]);
      setHistoryOpen(true);
    };
  const [filterSite, setFilterSite] = useState('All Sites');
  const [filterTask, setFilterTask] = useState('All Tasks');
  const [filterWeather, setFilterWeather] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selected, setSelected] = useState([]);
  const undoTimeout = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/safety-admin/ppe-rules');
        setRules(res.data);
      } catch (err) {
        setError('Failed to load PPE rules.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingRule) {
        await api.put(`/safety-admin/ppe-rules/${editingRule.id}`, data);
        setSuccess('PPE rule updated successfully.');
      } else {
        await api.post('/safety-admin/ppe-rules', data);
        setSuccess('PPE rule created successfully.');
      }
      const res = await api.get('/safety-admin/ppe-rules');
      setRules(res.data);
      setModalOpen(false);
      setEditingRule(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save PPE rule.');
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

  const handleArchive = async (rule) => {
    if (!window.confirm('Are you sure you want to archive this PPE rule?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/safety-admin/ppe-rules/${rule.id}`);
      setUndoRule(rule);
      setSuccess('PPE rule archived. Undo?');
      undoTimeout.current = setTimeout(() => setUndoRule(null), 8000);
      const res = await api.get('/safety-admin/ppe-rules');
      setRules(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to archive PPE rule.');
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
    if (!undoRule) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/safety-admin/ppe-rules', undoRule);
      setSuccess('Archive undone.');
      setUndoRule(null);
      const res = await api.get('/safety-admin/ppe-rules');
      setRules(res.data);
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
  const allSites = Array.from(new Set(rules.map(r => r.site).filter(Boolean)));
  const allTasks = Array.from(new Set(rules.map(r => r.taskType).filter(Boolean)));
  const allWeather = Array.from(new Set(rules.map(r => r.weatherCategory).filter(Boolean)));
  const filtered = rules.filter(r => {
    if (filterSite !== 'All Sites' && r.site !== filterSite) return false;
    if (filterTask !== 'All Tasks' && r.taskType !== filterTask) return false;
    if (filterWeather && r.weatherCategory !== filterWeather) return false;
    if (search && !(
      r.taskType?.toLowerCase().includes(search.toLowerCase()) ||
      r.site?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(paged.map(r => r.id));
    } else {
      setSelected([]);
    }
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleBulkArchive = async () => {
    if (!window.confirm('Archive selected PPE rules?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Promise.all(selected.map(id => api.delete(`/safety-admin/ppe-rules/${id}`)));
      setSuccess('Selected PPE rules archived.');
      setSelected([]);
      const res = await api.get('/safety-admin/ppe-rules');
      setRules(res.data);
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
    const csv = Papa.unparse(rules);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ppe_rules_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('Exported PPE rules as CSV.');
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
          await Promise.all(results.data.map(row => api.post('/safety-admin/ppe-rules', row)));
          setSuccess('Imported PPE rules from CSV.');
          const res = await api.get('/safety-admin/ppe-rules');
          setRules(res.data);
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
    <div className="page admin-ppe-rules" aria-labelledby="ppe-rules-heading">
      <h2 id="ppe-rules-heading">PPE Rules</h2>
      <div className="admin-toolbar" role="region" aria-label="PPE Rules Filters and Actions">
        <label htmlFor="filter-site-ppe" className="sr-only">Filter by Site</label>
        <select id="filter-site-ppe" className="admin-filter-site" value={filterSite} onChange={e => { setFilterSite(e.target.value); setPage(1); }} aria-label="Filter by site">
          <option>All Sites</option>
          {allSites.map(site => <option key={site}>{site}</option>)}
        </select>
        <label htmlFor="filter-task-ppe" className="sr-only">Filter by Task</label>
        <select id="filter-task-ppe" className="admin-filter-task" value={filterTask} onChange={e => { setFilterTask(e.target.value); setPage(1); }} aria-label="Filter by task">
          <option>All Tasks</option>
          {allTasks.map(task => <option key={task}>{task}</option>)}
        </select>
        <label htmlFor="filter-weather-ppe" className="sr-only">Filter by Weather</label>
        <select id="filter-weather-ppe" className="admin-filter-weather" value={filterWeather} onChange={e => { setFilterWeather(e.target.value); setPage(1); }} aria-label="Filter by weather">
          <option value="">Any</option>
          {allWeather.map(w => <option key={w}>{w}</option>)}
        </select>
        <label htmlFor="search-ppe" className="sr-only">Search PPE Rules</label>
        <input
          id="search-ppe"
          className="admin-search"
          placeholder="Search site or task..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search PPE rules"
        />
        <button type="button" onClick={handleExportCSV} className="admin-export-btn" aria-label="Export CSV">Export CSV</button>
        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="admin-import-btn" aria-label="Import CSV">Import CSV</button>
        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} aria-label="Import CSV file" />
        {isAdmin && (
          <button className="admin-add-btn" onClick={handleAdd} aria-label="Add PPE Rule">Add PPE Rule</button>
        )}
        {isAdmin && selected.length > 0 && (
          <button className="admin-bulk-archive-btn" onClick={handleBulkArchive} aria-label="Archive Selected PPE Rules">Archive Selected</button>
        )}
      </div>
      {/* Notification Toast */}
      <NotificationToast
        message={success || error}
        type={toastType}
        onClose={() => { setSuccess(''); setError(''); setShowToast(false); }}
        duration={3500}
      />
      <table className="admin-table" aria-label="PPE Rules Table">
        <thead>
          <tr>
            <th scope="col"><input type="checkbox" checked={paged.length > 0 && selected.length === paged.length} onChange={handleSelectAll} aria-label="Select all" tabIndex={0} disabled={!isAdmin} /></th>
            <th scope="col">Site</th>
            <th scope="col">Task type</th>
            <th scope="col">Weather</th>
            <th scope="col">Priority</th>
            <th scope="col">Active?</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        {loading ? <TableSkeleton columns={7} rows={6} /> : (
          <tbody>
            {paged.map((r, idx) => (
              <tr key={r.id} tabIndex={0} aria-rowindex={idx + 2}>
                <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => handleSelect(r.id)} aria-label={`Select ${r.taskType}`} tabIndex={0} disabled={!isAdmin} /></td>
                <td>{r.site}</td>
                <td>{r.taskType}</td>
                <td>{r.weatherCategory}</td>
                <td>{r.priority}</td>
                <td>{r.active ? 'Yes' : 'No'}</td>
                <td>
                  {isAdmin && <button onClick={() => handleEdit(r)} aria-label={`Edit ${r.taskType}`}>Edit</button>}
                  {isAdmin && <button onClick={() => handleArchive(r)} aria-label={`Archive ${r.taskType}`}>Archive</button>}
                  <button onClick={() => handleViewHistory(r)} aria-label={`View history for ${r.taskType}`}>View History</button>
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
      <PPERuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        rule={editingRule}
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

export default PPERules;
