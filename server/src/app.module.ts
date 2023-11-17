import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { RestrictedMiddleware } from './common/restricted.middleware';

@Module({
  imports: [ChatModule, PrismaModule, GameModule, AuthModule, ProfileModule],
  controllers: [],
  providers: [],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RestrictedMiddleware)
      .forRoutes('auth');
  }
}
