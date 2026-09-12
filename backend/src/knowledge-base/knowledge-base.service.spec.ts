import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeBaseService } from './knowledge-base.service';
import { EmbeddingService } from './embedding.service';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';

const entry = (id: string, embedding: number[]) => ({
  id,
  ticket_id: id,
  title: `Ticket ${id}`,
  description: 'd',
  logs: [],
  resolution: [],
  category: 'other',
  severity: 'low',
  detected_language: 'en',
  embedding,
  created_at: new Date(),
});

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let repo: any;
  let embeddings: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      count: jest.fn(),
    };

    embeddings = {
      generateEmbedding: jest.fn(),
      prepareTicketText: jest.fn(() => 'prepared text'),
      cosineSimilarity: new EmbeddingService().cosineSimilarity,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: getRepositoryToken(KnowledgeBaseEntity), useValue: repo },
        { provide: EmbeddingService, useValue: embeddings },
      ],
    }).compile();

    service = module.get(KnowledgeBaseService);
  });

  describe('findSimilar', () => {
    it('returns empty when the knowledge base is empty', async () => {
      repo.find.mockResolvedValue([]);
      expect(await service.findSimilar('t', 'd', [])).toEqual([]);
      expect(embeddings.generateEmbedding).not.toHaveBeenCalled();
    });

    it('orders results by similarity, best first', async () => {
      repo.find.mockResolvedValue([
        entry('far', [0, 1]),
        entry('near', [0.9, 0.3]),
        entry('mid', [0.8, 0.6]),
      ]);
      embeddings.generateEmbedding.mockResolvedValue([1, 0]);

      const results = await service.findSimilar('t', 'd', [], 3, 0);
      expect(results.map((r) => r.entry.ticket_id)).toEqual([
        'near',
        'mid',
        'far',
      ]);
    });

    it('drops entries below the similarity threshold', async () => {
      repo.find.mockResolvedValue([
        entry('match', [0.9,0.3]),
        entry('unrelated', [0, 1]),
      ]);
      embeddings.generateEmbedding.mockResolvedValue([1, 0]);

      const results = await service.findSimilar('t', 'd', [], 3, 0.6);
      expect(results).toHaveLength(1);
      expect(results[0].entry.ticket_id).toBe('match');
    });

    it('caps results at topK', async () => {
      repo.find.mockResolvedValue([
        entry('a', [0.9, 0.3]),
        entry('b', [0.9, 0.3]),
        entry('c', [0.9, 0.3]),
        entry('d', [0.9, 0.3]),
      ]);
      embeddings.generateEmbedding.mockResolvedValue([1, 0]);

      expect(await service.findSimilar('t', 'd', [], 2, 0)).toHaveLength(2);
    });

    it('excludes near-identical entries as unhelpful context', async () => {
      repo.find.mockResolvedValue([
        entry('duplicate', [1, 0]),
        entry('related', [0.8, 0.6]),
      ]);
      embeddings.generateEmbedding.mockResolvedValue([1, 0]);

      const results = await service.findSimilar('t', 'd', [], 3, 0);
      expect(results.map((r) => r.entry.ticket_id)).toEqual(['related']);
    });
  });

  describe('addEntry', () => {
    it('does not duplicate an existing ticket_id', async () => {
      const existing = entry('T-1', [1, 0]);
      repo.findOne.mockResolvedValue(existing);

      const result = await service.addEntry(
        'T-1',
        't',
        'd',
        [],
        [],
        'c',
        's',
        'en'
      );

      expect(result).toBe(existing);
      expect(embeddings.generateEmbedding).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('embeds and saves a new entry', async () => {
      repo.findOne.mockResolvedValue(null);
      embeddings.generateEmbedding.mockResolvedValue([0.1, 0.2]);

      const result = await service.addEntry(
        'T-2',
        'title',
        'desc',
        ['log'],
        ['fix'],
        'network',
        'high',
        'en'
      );

      expect(embeddings.generateEmbedding).toHaveBeenCalledWith(
        'prepared text'
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.embedding).toEqual([0.1, 0.2]);
    });

        it('normalises the ticket id before storing', async () => {
      repo.findOne.mockResolvedValue(null);
      embeddings.generateEmbedding.mockResolvedValue([0.1, 0.2]);

      const result = await service.addEntry('  tkt-099 ', 't', 'd', [], [], 'c', 's', 'en');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { ticket_id: 'TKT-099' } });
      expect(result.ticket_id).toBe('TKT-099');
    });
  });
});
