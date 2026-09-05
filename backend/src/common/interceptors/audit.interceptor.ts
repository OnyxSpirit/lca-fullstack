import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<any>();
    if (!['POST','PATCH','PUT','DELETE'].includes(request.method) || request.path.startsWith('/api/auth')) return next.handle();
    return next.handle().pipe(tap((result:any) => {
      const safeBody = { ...request.body }; delete safeBody.password; delete safeBody.refreshToken; delete safeBody.signatureData;
      void this.db.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?)`, [request.user?.sub??null,request.route?.path?.split('/')[1]??'api',request.route?.path??request.path,request.params?.id??result?.id??null,request.method,JSON.stringify(safeBody),request.ip,request.headers['user-agent']??null]).catch(()=>undefined);
    }));
  }
}
