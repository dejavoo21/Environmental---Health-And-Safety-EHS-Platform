import { useState, useRef, useEffect } from 'react';

const SavedViewsDropdown = ({
  views = [],
  currentViewId,
  onSelectView,
  onSaveView,
  onManageViews,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Separate views into user's own and shared
  const myViews = views.filter(v => v.is_owner);
  const sharedViews = views.filter(v => !v.is_owner && v.is_shared);

  // Filter by search term
  const filterViews = (viewList) => {
    if (!searchTerm) return viewList;
    const term = searchTerm.toLowerCase();
    return viewList.filter(v =>
      v.name.toLowerCase().includes(term) ||
      (v.description && v.description.toLowerCase().includes(term))
    );
  };

  const filteredMyViews = filterViews(myViews);
  const filteredSharedViews = filterViews(sharedViews);

  // Find current view name
  const currentView = views.find(v => v.id === currentViewId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (viewId) => {
    onSelectView(viewId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSave = () => {
    setIsOpen(false);
    onSaveView();
  };

  const handleManage = () => {
    setIsOpen(false);
    onManageViews();
  };

  return (
    <div className="saved-views-dropdown" ref={dropdownRef}>
      <button
        className="saved-views-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={loading}
      >
        <span className="saved-views-label">
          {currentView ? currentView.name : 'Saved Views'}
        </span>
        <span className="saved-views-chevron">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="saved-views-menu" role="listbox">
          {/* Search */}
          <div className="saved-views-search">
            <input
              type="text"
              placeholder="Search views..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="saved-views-search-input"
              autoFocus
            />
          </div>

          {/* My Views */}
          {filteredMyViews.length > 0 && (
            <div className="saved-views-section">
              <div className="saved-views-section-title">MY VIEWS</div>
              {filteredMyViews.map(view => (
                <button
                  key={view.id}
                  className={`saved-views-item ${view.id === currentViewId ? 'active' : ''}`}
                  onClick={() => handleSelect(view.id)}
                  role="option"
                  aria-selected={view.id === currentViewId}
                >
                  {view.is_default && <span className="view-default-star">&#9733;</span>}
                  <span className="view-name">{view.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Shared Views */}
          {filteredSharedViews.length > 0 && (
            <div className="saved-views-section">
              <div className="saved-views-section-title">SHARED VIEWS</div>
              {filteredSharedViews.map(view => (
                <button
                  key={view.id}
                  className={`saved-views-item ${view.id === currentViewId ? 'active' : ''}`}
                  onClick={() => handleSelect(view.id)}
                  role="option"
                  aria-selected={view.id === currentViewId}
                >
                  <span className="view-name">{view.name}</span>
                  <span className="view-owner">{view.owner_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* No views found */}
          {filteredMyViews.length === 0 && filteredSharedViews.length === 0 && (
            <div className="saved-views-empty">
              {searchTerm ? 'No views match your search' : 'No saved views yet'}
            </div>
          )}

          {/* Actions */}
          <div className="saved-views-actions">
            <button
              className="saved-views-action-btn"
              onClick={handleSave}
            >
              + Save Current View
            </button>
            {myViews.length > 0 && (
              <button
                className="saved-views-action-btn"
                onClick={handleManage}
              >
                Manage Views...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedViewsDropdown;
