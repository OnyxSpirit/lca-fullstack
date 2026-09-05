import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgenciesService } from './agencies.service';
import { AuthUser,CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('agencies') @ApiBearerAuth() @Controller('agencies')
export class AgenciesController { constructor(private readonly service: AgenciesService) {} @Get() findAll(@CurrentUser()u:AuthUser) { return this.service.findAll(u.roles.some(r=>['SUPER_ADMIN','DIRECTOR'].includes(r))?null:u.agencyId); } }
