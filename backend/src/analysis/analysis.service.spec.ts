const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

const geminiReturns = (obj: object) =>
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify(obj) },
  });

const validAnalysis = {
  summary: 'Auth token expired',
  detected_language: 'en',
  root_cause: 'JWT expiry too short',
  resolution: ['extend expiry', 'add refresh'],
  category: 'authentication',
  severity: 'high',
  similar_incidents_used: [],
};

describe('AnalysisService', () => {
  let service: AnalysisService;
  let kb: any;

  beforeEach(async () => {
    mockGenerateContent.mockReset();
    kb = { findSimilar: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: KnowledgeBaseService, useValue: kb },
      ],
    }).compile();

    service = module.get(AnalysisService);
  });

  it('returns the parsed analysis', async () => {
    geminiReturns(validAnalysis);
    const result = await service.analyzeTicket('Login fails', 'blocked', [
      'ERR 401',
    ]);
    expect(result.category).toBe('authentication');
    expect(result.resolution).toHaveLength(2);
  });

  it('puts the ticket details in the prompt', async () => {
    geminiReturns(validAnalysis);
    await service.analyzeTicket('Login fails', 'users blocked', ['ERR 401']);

    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('Login fails');
    expect(prompt).toContain('users blocked');
    expect(prompt).toContain('ERR 401');
  });

  it('injects similar past incidents as context', async () => {
    kb.findSimilar.mockResolvedValue([
      {
        similarity: 0.87,
        entry: {
          ticket_id: 'T-9',
          title: 'Token expiry bug',
          category: 'authentication',
          resolution: ['bumped TTL'],
        },
      },
    ]);
    geminiReturns(validAnalysis);

    const result = await service.analyzeTicket('Login fails', 'blocked', []);

    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('SIMILAR PAST INCIDENTS');
    expect(prompt).toContain('Token expiry bug');
    expect(prompt).toContain('87% similar');

    expect(result.similar_tickets).toEqual([
      {
        ticket_id: 'T-9',
        title: 'Token expiry bug',
        similarity: 87,
        category: 'authentication',
      },
    ]);
  });

  it('omits the context block when nothing is similar', async () => {
    geminiReturns(validAnalysis);
    await service.analyzeTicket('t', 'd', []);
    expect(mockGenerateContent.mock.calls[0][0]).not.toContain(
      'SIMILAR PAST INCIDENTS'
    );
  });

  it('throws when the model returns non-JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Sure! Here is your analysis:' },
    });
    await expect(service.analyzeTicket('t', 'd', [])).rejects.toThrow();
  });

  it('strips markdown fences the model adds anyway', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '```json\n' + JSON.stringify(validAnalysis) + '\n```',
      },
    });
    const result = await service.analyzeTicket('t', 'd', []);
    expect(result.category).toBe('authentication');
  });
});
