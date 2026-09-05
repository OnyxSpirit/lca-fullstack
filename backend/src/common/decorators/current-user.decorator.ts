import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface AuthUser { sub: string; email: string; roles: string[]; agencyId: string | null }
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest<{ user: AuthUser }>().user);
