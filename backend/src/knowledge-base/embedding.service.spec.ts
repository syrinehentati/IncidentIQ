import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = new EmbeddingService();
  });

  describe('cosineSimilarity', () => {
    it('scores identical vectors as 1', () => {
      expect(service.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    });

    it('scores orthogonal vectors as 0', () => {
      expect(service.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('scores opposite vectors as -1', () => {
      expect(service.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    });

    it('ignores magnitude, only direction', () => {
      expect(service.cosineSimilarity([1, 1], [5, 5])).toBeCloseTo(1);
    });

    it('returns 0 for a zero vector instead of NaN', () => {
      expect(service.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('prepareTicketText', () => {
    it('includes title, description and logs', () => {
      const text = service.prepareTicketText('Login fails', 'users blocked', [
        'ERR 401',
        'retry',
      ]);
      expect(text).toContain('Login fails');
      expect(text).toContain('users blocked');
      expect(text).toContain('ERR 401');
    });

    it('handles empty logs', () => {
      expect(() => service.prepareTicketText('t', 'd', [])).not.toThrow();
    });
  });
});
