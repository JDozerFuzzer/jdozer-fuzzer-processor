import { NestFactory } from '@nestjs/core';
import { ProcessModule } from './jdozer/fuzzer/processor/ProcessModule';

async function bootstrap() {

  try {
    
  } catch (e) {
    console.error('Error setting up configuration:', e);
    process.exit(1);
  }

  const app = await NestFactory.create(ProcessModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

}
bootstrap();
