import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { AnalysisService } from '../analysis/analysis.service';
import { TicketEntity } from './entites/ticket.entity';

const dto = (ticket_id: string) => ({
  ticket_id,
  title: 'Login fails',
  description: 'users blocked',
  severity: 'high',
  logs: ['ERR 401'],
});

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: any;
  let analysis: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    analysis = { analyzeTicket: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(TicketEntity), useValue: repo },
        { provide: AnalysisService, useValue: analysis },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('createAndAnalyze', () => {
    it('returns the existing ticket without re-analyzing', async () => {
      const existing = { ticket_id: 'T-1' };
      repo.findOne.mockResolvedValue(existing);

      const result = await service.createAndAnalyze(dto('T-1') as any);

      expect(result).toBe(existing);
      expect(analysis.analyzeTicket).not.toHaveBeenCalled();
    });

    it('analyzes and saves a new ticket', async () => {
      repo.findOne.mockResolvedValue(null);
      analysis.analyzeTicket.mockResolvedValue({ summary: 'auth issue' });

      const result: any = await service.createAndAnalyze(dto('T-2') as any);

      expect(analysis.analyzeTicket).toHaveBeenCalledWith(
        'Login fails',
        'users blocked',
        ['ERR 401'],
        undefined
      );
      expect(result.analysis).toEqual({ summary: 'auth issue' });
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('orders by analyzed_at descending', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        order: { analyzed_at: 'DESC' },
      });
    });
  });

    describe('analyzeBulk', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const run = async (tickets: any[]) => {
      const promise = service.analyzeBulk(tickets);
      await jest.runAllTimersAsync();
      return promise;
    };

    it('analyzes every ticket passed in', async () => {
      repo.findOne.mockResolvedValue(null);
      analysis.analyzeTicket.mockResolvedValue({ summary: 's' });

      const results = await run([dto('T-1'), dto('T-2')]);

      expect(analysis.analyzeTicket).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it('skips tickets that already exist', async () => {
      repo.findOne
        .mockResolvedValueOnce({ ticket_id: 'T-1' })
        .mockResolvedValueOnce(null);
      analysis.analyzeTicket.mockResolvedValue({ summary: 's' });

      const results = await run([dto('T-1'), dto('T-2')]);

      expect(analysis.analyzeTicket).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
    });

    it('falls back to mock_tickets.json when given an empty array', async () => {
      repo.findOne.mockResolvedValue(null);
      analysis.analyzeTicket.mockResolvedValue({ summary: 's' });

      const results = await run([]);

      expect(analysis.analyzeTicket).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
    });
  });

    describe('remove', () => {
    it('deletes by normalised id', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      const result = await service.remove(' tkt-099 ');
      expect(repo.delete).toHaveBeenCalledWith({ ticket_id: 'TKT-099' });
      expect(result).toEqual({ deleted: true });
    });

    it('throws when the ticket does not exist', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('TKT-999')).rejects.toThrow(NotFoundException);
    });
  });
});
