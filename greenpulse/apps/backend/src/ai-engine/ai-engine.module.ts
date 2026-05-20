import { Module } from '@nestjs/common';
import { AiEngineService } from './ai-engine.service';
import { AiEngineController } from './ai-engine.controller';

@Module({
  providers: [AiEngineService],
  controllers: [AiEngineController],
  exports: [AiEngineService],
})
export class AiEngineModule {}
