import { Body,Controller,Get,Put } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { AuthUser,CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('settings') @ApiBearerAuth() @Controller('settings') export class SettingsController{constructor(private readonly s:SettingsService){} @Get()all(){return this.s.get()} @Roles('SUPER_ADMIN','DIRECTOR') @Put()save(@Body()body:Record<string,unknown>,@CurrentUser()user:AuthUser){return this.s.save(body,user.sub)}}
