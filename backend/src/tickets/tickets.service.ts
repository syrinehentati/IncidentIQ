import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisService } from '../analysis/analysis.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketEntity } from './entites/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
    private readonly analysisService: AnalysisService
  ) {}

  findAll(): Promise<TicketEntity[]> {
    return this.ticketRepository.find({
      order: { analyzed_at: 'DESC' },
    });
  }

  findOne(id: string): Promise<TicketEntity | null> {
    return this.ticketRepository.findOne({
      where: { ticket_id: id },
    });
  }

  async createAndAnalyze(dto: CreateTicketDto): Promise<TicketEntity> {
    // check for duplicate
    const existing = await this.ticketRepository.findOne({
      where: { ticket_id: dto.ticket_id.trim().toUpperCase() },
    });
    if (existing) return existing;

    const analysis = await this.analysisService.analyzeTicket(
      dto.title,
      dto.description,
      dto.logs,
      dto.temperature
    );

    const ticket = this.ticketRepository.create({
      ...dto,
      analysis,
    });

    return this.ticketRepository.save(ticket);
  }

  async analyzeBulk(tickets?: CreateTicketDto[]): Promise<TicketEntity[]> {
    let mockTickets: CreateTicketDto[];

    if (tickets && tickets.length > 0) {
      // use tickets passed from the frontend
      mockTickets = tickets;
    } else {
      // fall back to the hardcoded mock file
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../', 'mock_tickets.json');
      const raw = fs.readFileSync(filePath, 'utf8');
      mockTickets = JSON.parse(raw) as CreateTicketDto[];
    }

    const results: TicketEntity[] = [];

    for (const ticket of mockTickets) {
      const existing = await this.ticketRepository.findOne({
        where: { ticket_id: ticket.ticket_id },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const analysis = await this.analysisService.analyzeTicket(
        ticket.title,
        ticket.description,
        ticket.logs
      );

      const entity = this.ticketRepository.create({ ...ticket, analysis });
      const saved = await this.ticketRepository.save(entity);
      results.push(saved);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }


     async remove(id: string): Promise<{ deleted: boolean }> {
    const normalised = id.trim().toUpperCase();

    let result = await this.ticketRepository.delete({ ticket_id: normalised });

    // fall back to the raw id for rows stored before ids were normalised
    if (!result.affected) {
      result = await this.ticketRepository.delete({ ticket_id: id });
    }

    if (!result.affected) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return { deleted: true };
  }
}
