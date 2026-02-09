import { useState } from 'react';
import './ControlChecklist.css';

/**
 * Control Checklist Component
 * Editable checklist for pre-work, during-work, post-work controls
 */

const ControlChecklist = ({ 
  controls = [], 
  category = 'pre_work',
  editable = false, 
  onComplete, 
  onUncomplete 
}) => {
  const filteredControls = controls.filter((c) => c.category === category);
  const completedCount = filteredControls.filter((c) => c.isCompleted).length;
  const totalCount = filteredControls.length;

  const categoryLabels = {
    pre_work: 'Pre-Work Controls',
    during_work: 'During-Work Controls',
    post_work: 'Post-Work Controls'
  };

  if (totalCount === 0) {
    return (
      <div className="control-checklist">
        <div className="control-checklist-header">
          <h4>{categoryLabels[category]}</h4>
        </div>
        <p className="muted">No controls defined for this category.</p>
      </div>
    );
  }

  return (
    <div className="control-checklist">
      <div className="control-checklist-header">
        <h4>{categoryLabels[category]}</h4>
        <span className="control-progress">
          {completedCount}/{totalCount} Complete
        </span>
      </div>
      <div className="control-checklist-items">
        {filteredControls.map((control) => (
          <ControlChecklistItem
            key={control.id}
            control={control}
            editable={editable}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
          />
        ))}
      </div>
    </div>
  );
};

const ControlChecklistItem = ({ control, editable, onComplete, onUncomplete }) => {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const handleComplete = () => {
    if (control.requiresNotes && !notes.trim()) {
      setShowNotes(true);
      return;
    }
    onComplete(control.id, notes);
    setShowNotes(false);
    setNotes('');
  };

  const handleUncomplete = () => {
    onUncomplete(control.id);
  };

  const formatCompletedInfo = () => {
    if (!control.isCompleted) return null;
    const completedBy = control.completedBy?.firstName || 'Unknown';
    const completedAt = control.completedAt 
      ? new Date(control.completedAt).toLocaleString() 
      : '';
    return `Completed by ${completedBy} at ${completedAt}`;
  };

  return (
    <div className={`control-item ${control.isCompleted ? 'completed' : ''}`}>
      <div className="control-item-main">
        {editable && !control.isCompleted ? (
          <button
            className="control-checkbox"
            onClick={handleComplete}
            title="Mark as complete"
          >
            ☐
          </button>
        ) : (
          <span className={`control-checkbox ${control.isCompleted ? 'checked' : ''}`}>
            {control.isCompleted ? '☑' : '☐'}
          </span>
        )}
        
        <div className="control-content">
          <div className="control-text">
            {control.controlText}
            {control.isRequired && <span className="required-marker">*</span>}
          </div>
          
          {control.isCompleted && (
            <div className="control-completed-info">
              {formatCompletedInfo()}
              {control.completionNotes && (
                <div className="control-notes">Notes: {control.completionNotes}</div>
              )}
            </div>
          )}
        </div>
        
        {editable && !control.isCompleted && (
          <button className="btn primary small" onClick={handleComplete}>
            Complete
          </button>
        )}
        
        {editable && control.isCompleted && (
          <button className="btn ghost small" onClick={handleUncomplete}>
            Undo
          </button>
        )}
      </div>
      
      {showNotes && (
        <div className="control-notes-input">
          <input
            type="text"
            placeholder="Enter notes (required for this control)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn primary small" onClick={handleComplete}>
            Save
          </button>
          <button className="btn ghost small" onClick={() => setShowNotes(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export const ControlChecklistTabs = ({ 
  controls = [], 
  editable = false, 
  onComplete, 
  onUncomplete 
}) => {
  const [activeTab, setActiveTab] = useState('pre_work');

  const tabs = [
    { id: 'pre_work', label: 'Pre-Work' },
    { id: 'during_work', label: 'During-Work' },
    { id: 'post_work', label: 'Post-Work' }
  ];

  const getTabCount = (category) => {
    const filtered = controls.filter((c) => c.category === category);
    const completed = filtered.filter((c) => c.isCompleted).length;
    return `${completed}/${filtered.length}`;
  };

  return (
    <div className="control-checklist-tabs">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{getTabCount(tab.id)}</span>
          </button>
        ))}
      </div>
      <div className="tabs-content">
        <ControlChecklist
          controls={controls}
          category={activeTab}
          editable={editable}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
        />
      </div>
    </div>
  );
};

export default ControlChecklist;
