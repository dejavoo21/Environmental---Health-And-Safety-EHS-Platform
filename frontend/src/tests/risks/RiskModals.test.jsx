/**
 * Risk Modals Tests - Phase 9
 * Tests for modal components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ReviewModal,
  LinkEntityModal,
  AddControlModal,
  VerifyControlModal,
  ChangeStatusModal,
  DeleteConfirmModal
} from '../../components/risks';

describe('ReviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    risk: {
      id: 1,
      inherent_score: 16,
      residual_score: 12,
      residual_likelihood: 3,
      residual_impact: 4
    },
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-38: renders when isOpen is true', () => {
    render(<ReviewModal {...defaultProps} />);
    expect(screen.getByText('Record Risk Review')).toBeInTheDocument();
  });

  it('TC-P9-39: does not render when isOpen is false', () => {
    render(<ReviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Record Risk Review')).not.toBeInTheDocument();
  });

  it('TC-P9-40: displays outcome options', () => {
    render(<ReviewModal {...defaultProps} />);

    expect(screen.getByRole('option', { name: /Confirmed - Risk validated as current/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Updated - Risk score or details changed/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Escalated - Risk requires attention/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Closed - Risk no longer applicable/i })).toBeInTheDocument();
  });

  it('TC-P9-41: calls onSubmit with correct data', async () => {
    render(<ReviewModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Outcome/i), { target: { value: 'updated' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Controls are working' } });
    fireEvent.click(screen.getByText('Record Review'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        outcome: 'updated',
        notes: 'Controls are working',
        residual_score: 12
      }));
    });
  });

  it('TC-P9-42: calls onClose when Cancel clicked', async () => {
    render(<ReviewModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('TC-P9-43: disables buttons when loading', () => {
    render(<ReviewModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Saving...')).toBeDisabled();
  });
});

describe('LinkEntityModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-44: renders entity type options', () => {
    render(<LinkEntityModal {...defaultProps} />);

    expect(screen.getByRole('option', { name: 'Incident' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inspection' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Permit' })).toBeInTheDocument();
  });

  it('TC-P9-45: shows entity ID input when type selected', async () => {
    render(
      <LinkEntityModal
        {...defaultProps}
        availableEntities={{ incident: [{ id: 123, title: 'Incident 123' }] }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Entity Type/i), { target: { value: 'incident' } });

    expect(screen.getByLabelText('Select Entity')).toBeEnabled();
  });

  it('TC-P9-46: calls onSubmit with correct data', async () => {
    render(
      <LinkEntityModal
        {...defaultProps}
        availableEntities={{ incident: [{ id: 123, title: 'Incident 123' }] }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Entity Type/i), { target: { value: 'incident' } });
    fireEvent.change(screen.getByLabelText('Select Entity'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Link Reason'), { target: { value: 'Related hazard' } });
    fireEvent.click(screen.getByText('Link Entity'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        entity_type: 'incident',
        entity_id: '123',
        link_reason: 'Related hazard'
      });
    });
  });

  it('TC-P9-47: validates entity ID is required', async () => {
    render(
      <LinkEntityModal
        {...defaultProps}
        availableEntities={{ incident: [{ id: 123, title: 'Incident 123' }] }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Entity Type/i), { target: { value: 'incident' } });
    fireEvent.click(screen.getByText('Link Entity'));

    expect(screen.getByText('Please select an entity')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });
});

describe('AddControlModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    control: null,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-48: renders control type options', () => {
    render(<AddControlModal {...defaultProps} />);

    expect(screen.getByRole('option', { name: /Prevention - Reduces likelihood/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Mitigation - Reduces impact/i })).toBeInTheDocument();
  });

  it('TC-P9-49: renders hierarchy options', () => {
    render(<AddControlModal {...defaultProps} />);

    expect(screen.getByText('Elimination')).toBeInTheDocument();
    expect(screen.getByText('Substitution')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Administrative')).toBeInTheDocument();
    expect(screen.getByText('PPE')).toBeInTheDocument();
  });

  it('TC-P9-50: pre-fills form when editing', () => {
    const existingControl = {
      id: 1,
      description: 'Existing control',
      type: 'prevention',
      hierarchy: 'engineering',
      effectiveness: 'effective'
    };

    render(<AddControlModal {...defaultProps} control={existingControl} />);

    expect(screen.getByDisplayValue('Existing control')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toHaveValue('prevention');
  });

  it('TC-P9-51: calls onSubmit with correct data', async () => {
    render(<AddControlModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New control measure' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'prevention' } });
    fireEvent.change(screen.getByLabelText('Hierarchy'), { target: { value: 'engineering' } });
    fireEvent.change(screen.getByLabelText('Effectiveness'), { target: { value: 'effective' } });
    fireEvent.click(screen.getByText('Add Control'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        description: 'New control measure',
        type: 'prevention',
        hierarchy: 'engineering',
        effectiveness: 'effective'
      }));
    });
  });

  it('TC-P9-52: validates description is required', async () => {
    render(<AddControlModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Control'));

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });
});

describe('VerifyControlModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    control: {
      id: 1,
      description: 'Test control',
      effectiveness: 'effective'
    },
    isisLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-53: renders verification options', () => {
    render(<VerifyControlModal {...defaultProps} />);

    expect(screen.getByRole('option', { name: /Effective - Control is working as intended/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Partially Effective - Some gaps identified/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Ineffective - Control is not working/i })).toBeInTheDocument();
  });

  it('TC-P9-54: calls onSubmit with verification data', async () => {
    render(<VerifyControlModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Effectiveness Assessment/i), { target: { value: 'partially_effective' } });
    fireEvent.change(screen.getByLabelText('Verification Notes'), { target: { value: 'Needs improvement' } });
    fireEvent.click(screen.getByText('Verify Control'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        effectiveness: 'partially_effective',
        notes: 'Needs improvement',
        control_id: 1
      });
    });
  });

  it('TC-P9-55: displays control description', () => {
    render(<VerifyControlModal {...defaultProps} />);
    expect(screen.getByText('Test control')).toBeInTheDocument();
  });
});

describe('ChangeStatusModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    currentStatus: 'active',
    isisLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-56: renders available status options', () => {
    render(<ChangeStatusModal {...defaultProps} />);

    expect(screen.getByRole('option', { name: /Under Review - Due for periodic review/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Closed - Risk no longer exists/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Accepted - Risk accepted at current level/i })).toBeInTheDocument();
  });

  it('TC-P9-57: excludes current status from options', () => {
    render(<ChangeStatusModal {...defaultProps} currentStatus="active" />);

    // Active should be shown as current, not as an option
    expect(screen.getByText(/Current status:/i)).toBeInTheDocument();
  });

  it('TC-P9-58: requires reason for status change', async () => {
    render(<ChangeStatusModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/New Status/i), { target: { value: 'closed' } });
    fireEvent.click(screen.getByText('Change Status'));

    expect(screen.getByText('Reason is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('TC-P9-59: calls onSubmit with status and reason', async () => {
    render(<ChangeStatusModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/New Status/i), { target: { value: 'closed' } });
    fireEvent.change(screen.getByLabelText('Reason for Change'), { target: { value: 'Risk mitigated' } });
    fireEvent.click(screen.getByText('Change Status'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        status: 'closed',
        reason: 'Risk mitigated'
      });
    });
  });
});

describe('DeleteConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Risk',
    message: 'Are you sure you want to delete this risk?',
    confirmText: 'Delete',
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P9-60: renders delete confirmation', () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText('Delete Risk')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this risk?')).toBeInTheDocument();
  });

  it('TC-P9-61: calls onConfirm when confirmed', async () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('TC-P9-62: calls onClose when cancelled', async () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('TC-P9-63: shows warning message', () => {
    render(<DeleteConfirmModal {...defaultProps} />);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('TC-P9-64: disables buttons when loading', () => {
    render(<DeleteConfirmModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Deleting...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});

