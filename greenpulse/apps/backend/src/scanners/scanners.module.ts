import { Module } from '@nestjs/common';
import { ScannerRegistry } from './scanner.registry';
import { FrontendScanner } from './frontend/frontend.scanner';
import { BackendScanner } from './backend/backend.scanner';
import { DatabaseScanner } from './database/database.scanner';
import { InfrastructureScanner } from './infrastructure/infrastructure.scanner';
import { AiUsageScanner } from './ai-usage/ai-usage.scanner';
import { NetworkScanner } from './network/network.scanner';

@Module({
  providers: [
    ScannerRegistry,
    FrontendScanner,
    BackendScanner,
    DatabaseScanner,
    InfrastructureScanner,
    AiUsageScanner,
    NetworkScanner,
  ],
  exports: [ScannerRegistry],
})
export class ScannersModule {}
