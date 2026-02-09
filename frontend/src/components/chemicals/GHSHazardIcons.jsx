import { GHS_HAZARD_CLASSES } from '../../api/chemicals';
import './GHSHazardIcons.css';

/**
 * GHS Hazard Icons Component
 * Displays GHS pictograms for hazard classes
 */

const GHSHazardIcons = ({ hazardClasses = [], showLabels = false, size = 'medium' }) => {
  if (!hazardClasses || hazardClasses.length === 0) {
    return <span className="ghs-empty">No hazards</span>;
  }

  const getHazardInfo = (hazardClass) => {
    // Handle both string and object format
    const classId = typeof hazardClass === 'string' ? hazardClass : hazardClass.class || hazardClass.id;
    return GHS_HAZARD_CLASSES.find((h) => h.id === classId) || {
      id: classId,
      name: classId,
      pictogram: '⚠️',
      color: '#6C757D'
    };
  };

  return (
    <div className={`ghs-hazard-icons ghs-size-${size}`}>
      {hazardClasses.map((hazardClass, index) => {
        const info = getHazardInfo(hazardClass);
        return (
          <div
            key={info.id || index}
            className="ghs-hazard-icon"
            title={info.name}
            style={{ borderColor: info.color }}
          >
            <span className="ghs-pictogram">{info.pictogram}</span>
            {showLabels && <span className="ghs-label">{info.name}</span>}
          </div>
        );
      })}
    </div>
  );
};

export const GHSHazardPanel = ({ hazardClasses = [] }) => {
  if (!hazardClasses || hazardClasses.length === 0) {
    return (
      <div className="ghs-hazard-panel">
        <h4>GHS Hazards</h4>
        <p className="muted">No hazard classifications assigned.</p>
      </div>
    );
  }

  const getHazardInfo = (hazardClass) => {
    const classId = typeof hazardClass === 'string' ? hazardClass : hazardClass.class || hazardClass.id;
    return GHS_HAZARD_CLASSES.find((h) => h.id === classId) || {
      id: classId,
      name: classId,
      pictogram: '⚠️',
      color: '#6C757D'
    };
  };

  return (
    <div className="ghs-hazard-panel">
      <h4>GHS Hazards</h4>
      <div className="ghs-hazard-list">
        {hazardClasses.map((hazardClass, index) => {
          const info = getHazardInfo(hazardClass);
          const category = typeof hazardClass === 'object' ? hazardClass.category : null;
          return (
            <div
              key={info.id || index}
              className="ghs-hazard-item"
              style={{ borderLeftColor: info.color }}
            >
              <span className="ghs-pictogram-large">{info.pictogram}</span>
              <div className="ghs-hazard-info">
                <div className="ghs-hazard-name">{info.name}</div>
                {category && <div className="ghs-hazard-category">{category}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const GHSClassificationSelector = ({ selected = [], onChange }) => {
  const handleToggle = (classId) => {
    if (selected.includes(classId)) {
      onChange(selected.filter((id) => id !== classId));
    } else {
      onChange([...selected, classId]);
    }
  };

  return (
    <div className="ghs-classification-selector">
      <div className="ghs-selector-grid">
        {GHS_HAZARD_CLASSES.map((hazard) => (
          <label
            key={hazard.id}
            className={`ghs-selector-item ${selected.includes(hazard.id) ? 'selected' : ''}`}
            style={{ borderColor: selected.includes(hazard.id) ? hazard.color : undefined }}
          >
            <input
              type="checkbox"
              checked={selected.includes(hazard.id)}
              onChange={() => handleToggle(hazard.id)}
            />
            <span className="ghs-selector-pictogram">{hazard.pictogram}</span>
            <span className="ghs-selector-label">{hazard.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default GHSHazardIcons;
