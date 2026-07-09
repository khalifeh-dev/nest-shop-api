import { DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Shop')
  .setDescription('Api Documentation')
  .addServer(process.env.APP_URL!, 'Main Server')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();

export default config;
