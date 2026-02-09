// Mock currentUser for RBAC
const currentUser = {
  name: 'Jane Doe',
  roles: ['admin'] // Change to [] to test non-admin view
};
import React, { useEffect, useState } from 'react';
import NotificationToast from '../../components/NotificationToast';
import Papa from 'papaparse';
import api from '../../api/client';
import SiteLegislationModal from '../../components/admin/SiteLegislationModal';
import HistoryModal from '../../components/admin/HistoryModal';
import TableSkeleton from '../../components/admin/TableSkeleton';
import { useRef } from 'react';

const SiteLegislation = () => {
  const [legislation, setLegislation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [editingLegislation, setEditingLegislation] = useState(null);
  const [undoLegislation, setUndoLegislation] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
    // Mock fetch for audit/history data
    const handleViewHistory = async (legislation) => {
      setHistoryTitle(legislation.title);
      // TODO: Replace with real API call
      setHistoryData([
        { action: 'Created', user: 'admin', date: legislation.createdAt || '2026-01-01', details: 'Initial creation' },
        { action: 'Updated', user: 'john.smith', date: legislation.updatedAt || '2026-02-01', details: 'Changed category' },
      ]);
      setHistoryOpen(true);
    };
  const [filterSite, setFilterSite] = useState('All Sites');
  const [filterJurisdiction, setFilterJurisdiction] = useState('All Jurisdictions');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selected, setSelected] = useState([]);
  const undoTimeout = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/safety-admin/legislation');
        setLegislation(res.data.data || res.data || []);
      } catch (err) {
        setError('Failed to load site legislation.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = () => {
    setEditingLegislation(null);
    setModalOpen(true);
  };

  const handleEdit = (legislation) => {
    setEditingLegislation(legislation);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingLegislation) {
        await api.put(`/safety-admin/legislation/${editingLegislation.id}`, data);
        setSuccess('Legislation updated successfully.');
      } else {
        await api.post('/safety-admin/legislation', data);
        setSuccess('Legislation created successfully.');
      }
      const res = await api.get('/safety-admin/legislation');
      setLegislation(res.data.data || res.data || []);
      setModalOpen(false);
      setEditingLegislation(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save legislation.');
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

  const handleArchive = async (legislation) => {
    if (!window.confirm('Are you sure you want to archive this legislation?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/safety-admin/legislation/${legislation.id}`);
      setUndoLegislation(legislation);
      setSuccess('Legislation archived. Undo?');
      undoTimeout.current = setTimeout(() => setUndoLegislation(null), 8000);
      const res = await api.get('/safety-admin/legislation');
      setLegislation(res.data.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to archive legislation.');
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
    if (!undoLegislation) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/safety-admin/legislation', undoLegislation);
      setSuccess('Archive undone.');
      setUndoLegislation(null);
      const res = await api.get('/safety-admin/legislation');
      setLegislation(res.data.data || res.data || []);
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
  const allSites = Array.from(new Set(legislation.map(l => l.site).filter(Boolean)));
  const allJurisdictions = Array.from(new Set(legislation.map(l => l.jurisdiction).filter(Boolean)));
  const allCategories = Array.from(new Set(legislation.map(l => l.category).filter(Boolean)));
  const filtered = legislation.filter(l => {
    if (filterSite !== 'All Sites' && l.site !== filterSite) return false;
    if (filterJurisdiction !== 'All Jurisdictions' && l.jurisdiction !== filterJurisdiction) return false;
    if (filterCategory && l.category !== filterCategory) return false;
    if (search && !(
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.category?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(paged.map(l => l.id));
    } else {
      setSelected([]);
    }
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleBulkArchive = async () => {
    if (!window.confirm('Archive selected legislation?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Promise.all(selected.map(id => api.delete(`/safety-admin/legislation/${id}`)));
      setSuccess('Selected legislation archived.');
      setSelected([]);
      const res = await api.get('/safety-admin/legislation');
      setLegislation(res.data.data || res.data || []);
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
    const csv = Papa.unparse(legislation);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `site_legislation_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('Exported site legislation as CSV.');
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
          await Promise.all(results.data.map(row => api.post('/safety-admin/legislation', row)));
          setSuccess('Imported site legislation from CSV.');
          const res = await api.get('/safety-admin/legislation');
          setLegislation(res.data.data || res.data || []);
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
    <div className="page admin-site-legislation" aria-labelledby="site-legislation-heading">
      <h2 id="site-legislation-heading">Site Legislation</h2>
      <div className="admin-toolbar" role="region" aria-label="Site Legislation Filters and Actions">
        <label htmlFor="filter-site-leg" className="sr-only">Filter by Site</label>
        <select id="filter-site-leg" className="admin-filter-site" value={filterSite} onChange={e => { setFilterSite(e.target.value); setPage(1); }} aria-label="Filter by site">
          <option>All Sites</option>
          {allSites.map(site => <option key={site}>{site}</option>)}
        </select>
        <label htmlFor="filter-jurisdiction" className="sr-only">Filter by Jurisdiction</label>
        <select id="filter-jurisdiction" className="admin-filter-jurisdiction" value={filterJurisdiction} onChange={e => { setFilterJurisdiction(e.target.value); setPage(1); }} aria-label="Filter by jurisdiction">
          <option>All Jurisdictions</option>
          {allJurisdictions.map(j => <option key={j}>{j}</option>)}
        </select>
        <label htmlFor="filter-category-leg" className="sr-only">Filter by Category</label>
        <select id="filter-category-leg" className="admin-filter-category" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} aria-label="Filter by category">
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="search-legislation" className="sr-only">Search Legislation</label>
        <input
          id="search-legislation"
          className="admin-search"
          placeholder="Search title or category..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search legislation"
        />
        <button type="button" onClick={handleExportCSV} className="admin-export-btn" aria-label="Export CSV">Export CSV</button>
        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="admin-import-btn" aria-label="Import CSV">Import CSV</button>
        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} aria-label="Import CSV file" />
        {isAdmin && (
          <button className="admin-add-btn" onClick={handleAdd} aria-label="Add Legislation">Add Legislation</button>
        )}
        {isAdmin && selected.length > 0 && (
          <button className="admin-bulk-archive-btn" onClick={handleBulkArchive} aria-label="Archive Selected Legislation">Archive Selected</button>
        )}
      </div>
      {/* Notification Toast */}
      <NotificationToast
        message={success || error}
        type={toastType}
        onClose={() => { setSuccess(''); setError(''); setShowToast(false); }}
        duration={3500}
      />
      <table className="admin-table" aria-label="Site Legislation Table">
        <thead>
          <tr>
            <th scope="col"><input type="checkbox" checked={paged.length > 0 && selected.length === paged.length} onChange={handleSelectAll} aria-label="Select all" tabIndex={0} disabled={!isAdmin} /></th>
            <th scope="col">Site</th>
            <th scope="col">Title</th>
            <th scope="col">Jurisdiction</th>
            <th scope="col">Category</th>
            <th scope="col">Reference URL</th>
            <th scope="col">Is Primary?</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        {loading ? <TableSkeleton columns={8} rows={6} /> : (
          <tbody>
            {paged.map((l, idx) => (
              <tr key={l.id} tabIndex={0} aria-rowindex={idx + 2}>
                <td><input type="checkbox" checked={selected.includes(l.id)} onChange={() => handleSelect(l.id)} aria-label={`Select ${l.title}`} tabIndex={0} disabled={!isAdmin} /></td>
                <td>{l.site}</td>
                <td>{l.title}</td>
                <td>{l.jurisdiction}</td>
                <td>{l.category}</td>
                <td><a href={l.referenceUrl} target="_blank" rel="noopener" aria-label={`View reference for ${l.title}`}>View</a></td>
                <td>{l.isPrimary ? 'Yes' : 'No'}</td>
                <td>
                  {isAdmin && <button onClick={() => handleEdit(l)} aria-label={`Edit ${l.title}`}>Edit</button>}
                  {isAdmin && <button onClick={() => handleArchive(l)} aria-label={`Archive ${l.title}`}>Archive</button>}
                  <button onClick={() => handleViewHistory(l)} aria-label={`View history for ${l.title}`}>View History</button>
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
      <SiteLegislationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        legislation={editingLegislation}
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

export default SiteLegislation;
