import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LeadsModule } from './modules/leads/leads.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { SalesModule } from './modules/sales/sales.module';
import { WorkshopModule } from './modules/workshop/workshop.module';
import { PartsModule } from './modules/parts/parts.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { BillingModule } from './modules/billing/billing.module';
import { RealtimeModule } from './realtime/realtime.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { ShowroomModule } from './modules/showroom/showroom.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RolesGuard } from './common/guards/roles.guard';
import { AgencyScopeGuard } from './common/guards/agency-scope.guard';
import { ActivitiesModule } from './modules/activities/activities.module';
import { HealthModule } from './modules/health/health.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AgenciesModule,
    CustomersModule,
    LeadsModule,
    VehiclesModule,
    RealtimeModule,
    SalesModule,
    WorkshopModule,
    PartsModule,
    DeliveriesModule,
    BillingModule,
    AuditModule,
    QuotationsModule,
    ShowroomModule,
    NotificationsModule,
    ActivitiesModule,
    HealthModule,
    SettingsModule,
    DocumentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard },{provide:APP_GUARD,useClass:AgencyScopeGuard}, { provide: APP_GUARD, useClass: RolesGuard }, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
