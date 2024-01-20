import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { Connection } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,
    {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
      bodyParser: false, // Disable the default JSON and URL-encoded body parsers
    },
  );

  // const connection = app.get(Connection);
  app.enableCors({
    origin: ['http://localhost:4200', 'https://spectrum.expocitydubai.com', 'https://spectrum.expocitydubai.com/', 'http://localhost:5600',
      , 'http://cp.fastifyapp.com:5600', 'http://cp.fastifyappv2.com:5600', 'http://hr.fastifyapp.com:5600',
      'http://aman.com:5600', // Replace with your Angular app's origin
      'http://cp.fastifyappv4.com:5600', 'http://zubair.com:5600', 'http://marketplace.com:5600', 'http://arfan.com:5600', 'http://designstudio.com:5600', 'http://apex.com:5600', 'http://accounts.com:5600', 'http://sorder.com:5600', 'http://ecommercestore.com:5600', 'http://hasnain.com:5600', 'http://amanv1.com:5600', 'http://fordemo.com:5600', 'http://zubairv1.com:5600'
      , 'http://zubairv.com:5600', 'http://aiappup.com:5600', 'http://agsc.com:5600', 'http://siraz.com:5600','http://apps.org.com:5600',  'http://studentmanagment.com:5600', 'http://spectrum.com:5600', 'http://releasemanagement.com:5600', 'http://rath.com:5600', 'http://test.com:5600', 'http://default_website.com:5600', 'http://defaultapp.com:5600', 'http://ahmad.com:5600', 'http://taskmanager.com:5600', 'http://crm.com:5600'
      , 'http://cloud.com:5600','http://clouds.com:5600' , 'http://governance.expocitydubai.com:5600' , 'http://accounts.abc.com:5600' 
      ], // Replace with your Angular app's origin
    // You can add additional CORS configuration options here if needed
  });


  // Increase payload size limit to 2MB (adjust according to your needs)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  const expressApp = express();
  expressApp.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  // Set the expressApp as the underlying app for NestJS
  app.use(expressApp);


  await app.listen(4600);

}
bootstrap();
