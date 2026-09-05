import { Body,Controller,Get,Param,Post,Query } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { AuthUser,CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePartDto,PartMovementDto } from './parts.dto';
import { PartsService } from './parts.service';
@ApiTags('parts') @ApiBearerAuth() @Controller('parts') export class PartsController{constructor(private readonly s:PartsService,private readonly n:NotificationsService){}@Get()all(@Query('agencyId')a:string){return this.s.list(a)}@Get(':id')detail(@Param('id')id:string,@Query('agencyId')a:string){return this.s.detail(id,a)}@Roles('SUPER_ADMIN','DIRECTOR','PARTS_MANAGER','WAREHOUSE_CLERK')@Post()create(@Body()d:CreatePartDto,@CurrentUser()u:AuthUser){return this.s.create(d,u.sub)}@Get(':id/movements')movements(@Param('id')id:string,@Query('agencyId')a:string){return this.s.movements(id,a)}@Roles('SUPER_ADMIN','DIRECTOR','PARTS_MANAGER','WAREHOUSE_CLERK')@Post(':id/movements')async move(@Param('id')id:string,@Body()d:PartMovementDto,@CurrentUser()u:AuthUser){const result:any=await this.s.move(id,d,u.sub);if(result.lowStock)await this.n.create({roleCodes:['PARTS_MANAGER','WAREHOUSE_CLERK'],agencyId:d.agencyId,subject:'Stock faible',message:`La pièce #${id} a atteint son seuil disponible (${result.availableStock}).`,referenceType:'part',referenceId:id});return result}}
