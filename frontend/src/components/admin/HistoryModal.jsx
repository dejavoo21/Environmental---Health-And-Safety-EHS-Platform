import React from 'react';

const HistoryModal = ({ open, onClose, history, title }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
      <div className="modal">
        <h3 id="history-modal-title">{title} - Change History</h3>
        <button className="modal-close" onClick={onClose} aria-label="Close history modal">&times;</button>
        <table className="history-table" aria-label="Change history">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {history && history.length > 0 ? history.map((h, i) => (
              <tr key={i}>
                <td>{h.action}</td>
                <td>{h.user}</td>
                <td>{h.date}</td>
                <td>{h.details}</td>
              </tr>
            )) : (
              <tr><td colSpan="4">No history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryModal;
