import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Step } from './cadence.types';
import { CadencesService } from './cadences.service';

interface UpsertCadenceDto {
  name: string;
  steps: Step[];
}

@Controller('cadences')
export class CadencesController {
  constructor(private readonly cadencesService: CadencesService) {}

  @Post()
  create(@Body() body: UpsertCadenceDto) {
    return this.cadencesService.create(body.name, body.steps);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.cadencesService.getById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpsertCadenceDto) {
    return this.cadencesService.update(id, body.name, body.steps);
  }
}
