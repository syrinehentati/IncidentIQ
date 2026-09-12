import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from './embedding.service';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBaseEntity)
    private kbRepository: Repository<KnowledgeBaseEntity>,
    private readonly embeddingService: EmbeddingService
  ) {}

  async addEntry(
    ticket_id: string,
    title: string,
    description: string,
    logs: string[],
    resolution: string[],
    category: string,
    severity: string,
    detected_language: string
  ): Promise<KnowledgeBaseEntity> {
    const id = ticket_id.trim().toUpperCase();

    const existing = await this.kbRepository.findOne({
      where: { ticket_id: id },
    });
    if (existing) return existing;

    const text = this.embeddingService.prepareTicketText(
      title,
      description,
      logs
    );
    const embedding = await this.embeddingService.generateEmbedding(text);

    const entry = this.kbRepository.create({
      ticket_id: id,
      title,
      description,
      logs,
      resolution,
      category,
      severity,
      detected_language,
      embedding,
    });

    return this.kbRepository.save(entry);
  }

  async findSimilar(
    title: string,
    description: string,
    logs: string[],
    topK: number = 3,
    threshold: number = 0.6,
    maxSimilarity: number = 0.98
  ) {
    const entries = await this.kbRepository.find();
    if (entries.length === 0) return [];

    const text = this.embeddingService.prepareTicketText(
      title,
      description,
      logs
    );
    const queryEmbedding = await this.embeddingService.generateEmbedding(text);

    const similarities = entries.map((entry) => ({
      entry,
      similarity: this.embeddingService.cosineSimilarity(
        queryEmbedding,
        entry.embedding
      ),
    }));

    return similarities
      .filter((s) => s.similarity >= threshold && s.similarity < maxSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  getAll(): Promise<KnowledgeBaseEntity[]> {
    return this.kbRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  getCount(): Promise<number> {
    return this.kbRepository.count();
  }

  async remove(ticket_id: string): Promise<{ deleted: boolean }> {
    const normalised = ticket_id.trim().toUpperCase();

    let result = await this.kbRepository.delete({
      ticket_id: normalised,
    });

    if (!result.affected) {
      result = await this.kbRepository.delete({ ticket_id });
    }
    if (!result.affected) {
      throw new NotFoundException(`Ticket ${ticket_id} not found`);
    }
    return { deleted: true };
  }
}
