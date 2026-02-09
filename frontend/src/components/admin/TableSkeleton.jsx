import React from 'react';

const TableSkeleton = ({ columns = 8, rows = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="skeleton-row">
        {Array.from({ length: columns }).map((_, j) => (
          <td key={j}>
            <div className="skeleton-cell" style={{ height: 18, background: '#eee', borderRadius: 4, width: '80%', margin: '0 auto' }} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export default TableSkeleton;
