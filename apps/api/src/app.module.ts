import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnrollmentsController } from './enrollments.controller';
import { CadencesController } from './cadences.controller';
import { CadencesService } from './cadences.service';

@Module({
  imports: [],
  controllers: [AppController, EnrollmentsController, CadencesController],
  providers: [AppService, CadencesService],
})
export class AppModule {}
