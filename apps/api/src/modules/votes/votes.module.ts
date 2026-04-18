import { Module } from '@nestjs/common';
import { VotesController } from './votes.controller';
import { VotesRepository } from './votes.repository';
import { VotesService } from './votes.service';

@Module({
  controllers: [VotesController],
  providers: [VotesService, VotesRepository],
  exports: [VotesService, VotesRepository],
})
export class VotesModule {}
