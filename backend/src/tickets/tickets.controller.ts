import { Controller, Get ,Post, Body, Param, Delete } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {CreateTicketDto } from './dto/create-ticket.dto';

@Controller('tickets')
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) {}

    @Get()
    findAll() {
        return this.ticketsService.findAll();
    } 

    @Get(':id')
    findOne(@Param('id') id: string){
        return this.ticketsService.findOne(id);
    }

    @Post()
    create (@Body() body: CreateTicketDto){
        return this.ticketsService.createAndAnalyze(body);
    }

@Post('bulk-analyze')
analyzeBulk(@Body() body?: { tickets?: CreateTicketDto[] }) {
  return this.ticketsService.analyzeBulk(body?.tickets);
}

@Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
