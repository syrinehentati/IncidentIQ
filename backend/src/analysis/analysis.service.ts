import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';


@Injectable()
export class AnalysisService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  async analyzeTicket(
    title: string,
    description: string,
    logs: string[],
    temperature: number = 0.3
  ) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { temperature },
    });

    const similarTickets = await this.knowledgeBaseService.findSimilar(
      title,
      description,
      logs,
    );

 const context = similarTickets.length > 0
      ? `
SIMILAR PAST INCIDENTS FROM KNOWLEDGE BASE:
${similarTickets.map((s, i) => `
Incident ${i + 1} (${Math.round(s.similarity * 100)}% similar):
Title: ${s.entry.title}
Category: ${s.entry.category}
Resolution that worked: ${s.entry.resolution.join(' | ')}
`).join('\n')}

Use these past incidents as context when analyzing the new ticket.
`
      : '';

    const prompt = `
You are a senior support engineer at an automotive software company.
Analyze this support ticket and respond in English only.
${context}
New ticket to analyze:
Title: ${title}
Description: ${description}
Logs: ${logs.join('\n')}

Return only a raw JSON object with no markdown, no backticks, no explanation.
Just the JSON with these fields:
- summary: one paragraph explaining the issue in plain English
- detected_language: what language was the input
- root_cause: your best technical assessment
- resolution: 3 to 5 step by step actions to fix this
- category: one of [authentication, performance, network, crash, configuration, other]
- severity: low / medium / high / critical
- similar_incidents_used: array of ticket titles that influenced this analysis (empty array if none)
    `;

    const result = await model.generateContent(prompt);
        const text = result.response.text();
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException(
        'The model returned a malformed response. Please retry.',
      );
    }

    return {
      ...analysis,
      similar_tickets: similarTickets.map((s) => ({
        ticket_id: s.entry.ticket_id,
        title: s.entry.title,
        similarity: Math.round(s.similarity * 100),
        category: s.entry.category,
      })),
    };
  }
}