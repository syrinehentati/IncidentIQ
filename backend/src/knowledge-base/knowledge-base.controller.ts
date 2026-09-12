import { Controller, Post, Get, Body, Delete, Param } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { AddEntryDto } from './dto/add-entry.dto';
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService
  ) {}

  @Post()
  addEntry(@Body() dto: AddEntryDto) {
    return this.knowledgeBaseService.addEntry(
      dto.ticket_id,
      dto.title,
      dto.description,
      dto.logs,
      dto.resolution,
      dto.category,
      dto.severity,
      dto.detected_language,
    );
  }

  @Get()
  getAll() {
    return this.knowledgeBaseService.getAll();
  }

  @Get('count')
  getCount() {
    return { count: this.knowledgeBaseService.getCount() };
  }
    @Delete(':ticket_id')
  remove(@Param('ticket_id') ticket_id: string) {
    return this.knowledgeBaseService.remove(ticket_id);
  }
}