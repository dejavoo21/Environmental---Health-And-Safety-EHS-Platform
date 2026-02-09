/**
 * Risk API Tests - Phase 9
 * Tests for the risks API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as risksApi from '../../api/risks';

// Mock axios
vi.mock('axios');

describe('Risks API Client', () => {
  const mockAxiosResponse = (data) => ({ data });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Risk CRUD Operations', () => {
    it('TC-P9-API-01: listRisks fetches risks with filters', async () => {
      const mockData = { data: [], meta: { total: 0 } };
      axios.get.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await risksApi.listRisks({ status: 'active', page: 1 });

      expect(axios.get).toHaveBeenCalledWith('/api/risks', {
        params: { status: 'active', page: 1 }
      });
      expect(result).toEqual(mockData);
    });

    it('TC-P9-API-02: getRisk fetches single risk', async () => {
      const mockRisk = { id: 1, title: 'Test Risk' };
      axios.get.mockResolvedValue(mockAxiosResponse(mockRisk));

      const result = await risksApi.getRisk(1);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/1');
      expect(result).toEqual(mockRisk);
    });

    it('TC-P9-API-03: createRisk posts new risk', async () => {
      const newRisk = { title: 'New Risk', description: 'Description' };
      const createdRisk = { id: 1, ...newRisk };
      axios.post.mockResolvedValue(mockAxiosResponse(createdRisk));

      const result = await risksApi.createRisk(newRisk);

      expect(axios.post).toHaveBeenCalledWith('/api/risks', newRisk);
      expect(result).toEqual(createdRisk);
    });

    it('TC-P9-API-04: updateRisk patches existing risk', async () => {
      const updates = { title: 'Updated Title' };
      const updatedRisk = { id: 1, ...updates };
      axios.patch.mockResolvedValue(mockAxiosResponse(updatedRisk));

      const result = await risksApi.updateRisk(1, updates);

      expect(axios.patch).toHaveBeenCalledWith('/api/risks/1', updates);
      expect(result).toEqual(updatedRisk);
    });

    it('TC-P9-API-05: changeRiskStatus updates status', async () => {
      const statusData = { status: 'closed', reason: 'Mitigated' };
      axios.patch.mockResolvedValue(mockAxiosResponse({ id: 1, status: 'closed' }));

      const result = await risksApi.changeRiskStatus(1, statusData);

      expect(axios.patch).toHaveBeenCalledWith('/api/risks/1/status', statusData);
    });

    it('TC-P9-API-06: deleteRisk deletes risk', async () => {
      axios.delete.mockResolvedValue(mockAxiosResponse({ success: true }));

      await risksApi.deleteRisk(1);

      expect(axios.delete).toHaveBeenCalledWith('/api/risks/1');
    });
  });

  describe('Category Operations', () => {
    it('TC-P9-API-07: listCategories fetches categories', async () => {
      const mockCategories = [{ id: 1, name: 'Operational' }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockCategories }));

      const result = await risksApi.listCategories();

      expect(axios.get).toHaveBeenCalledWith('/api/risk-categories');
    });

    it('TC-P9-API-08: getCategory fetches single category', async () => {
      const mockCategory = { id: 1, name: 'Operational' };
      axios.get.mockResolvedValue(mockAxiosResponse(mockCategory));

      const result = await risksApi.getCategory(1);

      expect(axios.get).toHaveBeenCalledWith('/api/risk-categories/1');
    });

    it('TC-P9-API-09: createCategory posts new category', async () => {
      const newCategory = { name: 'New Category' };
      axios.post.mockResolvedValue(mockAxiosResponse({ id: 1, ...newCategory }));

      await risksApi.createCategory(newCategory);

      expect(axios.post).toHaveBeenCalledWith('/api/risk-categories', newCategory);
    });

    it('TC-P9-API-10: updateCategory patches category', async () => {
      const updates = { name: 'Updated Category' };
      axios.patch.mockResolvedValue(mockAxiosResponse({ id: 1, ...updates }));

      await risksApi.updateCategory(1, updates);

      expect(axios.patch).toHaveBeenCalledWith('/api/risk-categories/1', updates);
    });

    it('TC-P9-API-11: deleteCategory deletes category', async () => {
      axios.delete.mockResolvedValue(mockAxiosResponse({ success: true }));

      await risksApi.deleteCategory(1);

      expect(axios.delete).toHaveBeenCalledWith('/api/risk-categories/1');
    });
  });

  describe('Control Operations', () => {
    it('TC-P9-API-12: listControls fetches risk controls', async () => {
      const mockControls = [{ id: 1, description: 'Control 1' }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockControls }));

      const result = await risksApi.listControls(1);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/1/controls');
    });

    it('TC-P9-API-13: addControl posts new control', async () => {
      const newControl = { description: 'New Control', type: 'prevention' };
      axios.post.mockResolvedValue(mockAxiosResponse({ id: 1, ...newControl }));

      await risksApi.addControl(1, newControl);

      expect(axios.post).toHaveBeenCalledWith('/api/risks/1/controls', newControl);
    });

    it('TC-P9-API-14: updateControl patches control', async () => {
      const updates = { effectiveness: 'effective' };
      axios.patch.mockResolvedValue(mockAxiosResponse({ id: 1, ...updates }));

      await risksApi.updateControl(1, 1, updates);

      expect(axios.patch).toHaveBeenCalledWith('/api/risks/1/controls/1', updates);
    });

    it('TC-P9-API-15: deleteControl deletes control', async () => {
      axios.delete.mockResolvedValue(mockAxiosResponse({ success: true }));

      await risksApi.deleteControl(1, 1);

      expect(axios.delete).toHaveBeenCalledWith('/api/risks/1/controls/1');
    });

    it('TC-P9-API-16: verifyControl posts verification', async () => {
      const verification = { effectiveness: 'effective', notes: 'Verified' };
      axios.post.mockResolvedValue(mockAxiosResponse({ id: 1 }));

      await risksApi.verifyControl(1, 1, verification);

      expect(axios.post).toHaveBeenCalledWith('/api/risks/1/controls/1/verify', verification);
    });
  });

  describe('Link Operations', () => {
    it('TC-P9-API-17: listLinks fetches risk links', async () => {
      const mockLinks = [{ id: 1, entity_type: 'incident', entity_id: 123 }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockLinks }));

      const result = await risksApi.listLinks(1);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/1/links');
    });

    it('TC-P9-API-18: createLink posts new link', async () => {
      const newLink = { entity_type: 'incident', entity_id: 123 };
      axios.post.mockResolvedValue(mockAxiosResponse({ id: 1, ...newLink }));

      await risksApi.createLink(1, newLink);

      expect(axios.post).toHaveBeenCalledWith('/api/risks/1/links', newLink);
    });

    it('TC-P9-API-19: deleteLink deletes link', async () => {
      axios.delete.mockResolvedValue(mockAxiosResponse({ success: true }));

      await risksApi.deleteLink(1, 1);

      expect(axios.delete).toHaveBeenCalledWith('/api/risks/1/links/1');
    });
  });

  describe('Review Operations', () => {
    it('TC-P9-API-20: listReviews fetches risk reviews', async () => {
      const mockReviews = [{ id: 1, outcome: 'unchanged' }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockReviews }));

      const result = await risksApi.listReviews(1);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/1/reviews');
    });

    it('TC-P9-API-21: recordReview posts new review', async () => {
      const newReview = { outcome: 'improved', notes: 'Better' };
      axios.post.mockResolvedValue(mockAxiosResponse({ id: 1, ...newReview }));

      await risksApi.recordReview(1, newReview);

      expect(axios.post).toHaveBeenCalledWith('/api/risks/1/reviews', newReview);
    });
  });

  describe('Analytics Operations', () => {
    it('TC-P9-API-22: getHeatmap fetches heatmap data', async () => {
      const mockHeatmap = { cells: [], total_risks: 0 };
      axios.get.mockResolvedValue(mockAxiosResponse(mockHeatmap));

      const result = await risksApi.getHeatmap({ category_id: 1 });

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/heatmap', {
        params: { category_id: 1 }
      });
    });

    it('TC-P9-API-23: getTopRisks fetches top risks', async () => {
      const mockRisks = [{ id: 1, score: 25 }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockRisks }));

      const result = await risksApi.getTopRisks(5);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/top-risks', {
        params: { limit: 5 }
      });
    });

    it('TC-P9-API-24: getUpcomingReviews fetches upcoming reviews', async () => {
      const mockReviews = [{ id: 1, next_review_date: '2024-03-01' }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockReviews }));

      const result = await risksApi.getUpcomingReviews(7);

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/upcoming-reviews', {
        params: { days: 7 }
      });
    });

    it('TC-P9-API-25: getOverdueReviews fetches overdue reviews', async () => {
      const mockReviews = [{ id: 1, next_review_date: '2024-01-01' }];
      axios.get.mockResolvedValue(mockAxiosResponse({ data: mockReviews }));

      const result = await risksApi.getOverdueReviews();

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/overdue-reviews');
    });

    it('TC-P9-API-26: getReviewCompliance fetches compliance data', async () => {
      const mockCompliance = { onTime: 80, overdue: 20 };
      axios.get.mockResolvedValue(mockAxiosResponse(mockCompliance));

      const result = await risksApi.getReviewCompliance();

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/review-compliance');
    });

    it('TC-P9-API-27: getControlEffectiveness fetches effectiveness data', async () => {
      const mockEffectiveness = { effective: 60, partial: 30, ineffective: 10 };
      axios.get.mockResolvedValue(mockAxiosResponse(mockEffectiveness));

      const result = await risksApi.getControlEffectiveness();

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/control-effectiveness');
    });

    it('TC-P9-API-28: getRiskTrends fetches trend data', async () => {
      const mockTrends = { months: [], counts: [] };
      axios.get.mockResolvedValue(mockAxiosResponse(mockTrends));

      const result = await risksApi.getRiskTrends({ period: '6m' });

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/trends', {
        params: { period: '6m' }
      });
    });

    it('TC-P9-API-29: getRisksByDimension fetches dimensional data', async () => {
      const mockData = { labels: [], values: [] };
      axios.get.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await risksApi.getRisksByDimension('category');

      expect(axios.get).toHaveBeenCalledWith('/api/risks/analytics/by-dimension', {
        params: { dimension: 'category' }
      });
    });
  });

  describe('Settings Operations', () => {
    it('TC-P9-API-30: getScoringMatrix fetches matrix', async () => {
      const mockMatrix = { levels: [] };
      axios.get.mockResolvedValue(mockAxiosResponse(mockMatrix));

      const result = await risksApi.getScoringMatrix();

      expect(axios.get).toHaveBeenCalledWith('/api/risk-settings/scoring-matrix');
    });

    it('TC-P9-API-31: updateScoringMatrix updates matrix', async () => {
      const matrix = { levels: [] };
      axios.put.mockResolvedValue(mockAxiosResponse(matrix));

      await risksApi.updateScoringMatrix(matrix);

      expect(axios.put).toHaveBeenCalledWith('/api/risk-settings/scoring-matrix', matrix);
    });

    it('TC-P9-API-32: getTolerances fetches tolerances', async () => {
      const mockTolerances = { acceptable: 4, tolerable: 12 };
      axios.get.mockResolvedValue(mockAxiosResponse(mockTolerances));

      const result = await risksApi.getTolerances();

      expect(axios.get).toHaveBeenCalledWith('/api/risk-settings/tolerances');
    });

    it('TC-P9-API-33: updateTolerances updates tolerances', async () => {
      const tolerances = { acceptable: 4, tolerable: 12 };
      axios.put.mockResolvedValue(mockAxiosResponse(tolerances));

      await risksApi.updateTolerances(tolerances);

      expect(axios.put).toHaveBeenCalledWith('/api/risk-settings/tolerances', tolerances);
    });

    it('TC-P9-API-34: getRiskConfig fetches config', async () => {
      const mockConfig = { enableReviews: true };
      axios.get.mockResolvedValue(mockAxiosResponse(mockConfig));

      const result = await risksApi.getRiskConfig();

      expect(axios.get).toHaveBeenCalledWith('/api/risk-settings/config');
    });

    it('TC-P9-API-35: updateRiskConfig updates config', async () => {
      const config = { enableReviews: true };
      axios.put.mockResolvedValue(mockAxiosResponse(config));

      await risksApi.updateRiskConfig(config);

      expect(axios.put).toHaveBeenCalledWith('/api/risk-settings/config', config);
    });
  });

  describe('Helper Functions', () => {
    it('TC-P9-HELPER-01: calculateLevel returns correct levels', () => {
      expect(risksApi.calculateLevel(1)).toBe('low');
      expect(risksApi.calculateLevel(4)).toBe('low');
      expect(risksApi.calculateLevel(5)).toBe('medium');
      expect(risksApi.calculateLevel(9)).toBe('medium');
      expect(risksApi.calculateLevel(10)).toBe('high');
      expect(risksApi.calculateLevel(16)).toBe('high');
      expect(risksApi.calculateLevel(17)).toBe('extreme');
      expect(risksApi.calculateLevel(25)).toBe('extreme');
    });

    it('TC-P9-HELPER-02: getLevelColor returns correct colors', () => {
      expect(risksApi.getLevelColor('low')).toBe('#4CAF50');
      expect(risksApi.getLevelColor('medium')).toBe('#FFEB3B');
      expect(risksApi.getLevelColor('high')).toBe('#FF9800');
      expect(risksApi.getLevelColor('extreme')).toBe('#F44336');
    });

    it('TC-P9-HELPER-03: getLikelihoodLabel returns correct labels', () => {
      expect(risksApi.getLikelihoodLabel(1)).toBe('Rare');
      expect(risksApi.getLikelihoodLabel(2)).toBe('Unlikely');
      expect(risksApi.getLikelihoodLabel(3)).toBe('Possible');
      expect(risksApi.getLikelihoodLabel(4)).toBe('Likely');
      expect(risksApi.getLikelihoodLabel(5)).toBe('Almost Certain');
    });

    it('TC-P9-HELPER-04: getImpactLabel returns correct labels', () => {
      expect(risksApi.getImpactLabel(1)).toBe('Negligible');
      expect(risksApi.getImpactLabel(2)).toBe('Minor');
      expect(risksApi.getImpactLabel(3)).toBe('Moderate');
      expect(risksApi.getImpactLabel(4)).toBe('Major');
      expect(risksApi.getImpactLabel(5)).toBe('Catastrophic');
    });

    it('TC-P9-HELPER-05: getStatusLabel returns correct labels', () => {
      expect(risksApi.getStatusLabel('emerging')).toBe('Emerging');
      expect(risksApi.getStatusLabel('active')).toBe('Active');
      expect(risksApi.getStatusLabel('under_review')).toBe('Under Review');
      expect(risksApi.getStatusLabel('closed')).toBe('Closed');
      expect(risksApi.getStatusLabel('accepted')).toBe('Accepted');
    });

    it('TC-P9-HELPER-06: getFrequencyLabel returns correct labels', () => {
      expect(risksApi.getFrequencyLabel('monthly')).toBe('Monthly');
      expect(risksApi.getFrequencyLabel('quarterly')).toBe('Quarterly');
      expect(risksApi.getFrequencyLabel('semi_annually')).toBe('Semi-Annually');
      expect(risksApi.getFrequencyLabel('annually')).toBe('Annually');
    });
  });
});
