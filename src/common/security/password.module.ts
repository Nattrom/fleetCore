import { Module } from '@nestjs/common';
import { PasswordHasherService } from './password-hasher.service.js';

@Module({
  providers: [PasswordHasherService],
  exports: [PasswordHasherService],
})
export class PasswordModule {}
