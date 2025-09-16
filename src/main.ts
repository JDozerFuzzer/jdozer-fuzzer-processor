import { NestFactory } from '@nestjs/core';
import { ProcessModule } from './jdozer/fuzzer/processor/ProcessModule';
import { ConfigModule } from '@nestjs/config';
import { LoggerConfig } from './LoggerConfig';

async function bootstrap() {

  try {
    await ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true
    });
  } catch (e) {
    console.error('Error setting up configuration:', e);
    process.exit(1);
  }

  const app = await NestFactory.create(ProcessModule, {
    logger: LoggerConfig.logLevels('JDozerFuzzer-Seeder')
  });

}
bootstrap();
