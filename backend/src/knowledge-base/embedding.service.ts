import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-embedding-2',
    });

    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  prepareTicketText(
    title: string,
    description: string,
    logs: string[]
  ): string {
    return `
      Title: ${title}
      Description: ${description}
      Logs: ${logs.join(' ')}
    `.trim();
  }
}
