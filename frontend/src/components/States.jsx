export const LoadingState = ({ message = 'Loading...' }) => (
  <div className="state-block">{message}</div>
);

export const ErrorState = ({ message = 'Something went wrong.' }) => (
  <div className="state-block error">{message}</div>
);

export const EmptyState = ({ message = 'No data available.' }) => (
  <div className="state-block empty">{message}</div>
);

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="pagination-controls">
      <button 
        className="btn-pagination"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      <button 
        className="btn-pagination"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </div>
  );
};
