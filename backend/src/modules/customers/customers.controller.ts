import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';
import { CustomersService } from './customers.service';
@ApiTags('customers') @ApiBearerAuth() @Controller('customers')
export class CustomersController { constructor(private readonly service: CustomersService) {} @Get() findAll(@Query('search') s='',@Query('limit') l='50',@Query('offset') o='0'){return this.service.findAll(s,Number(l),Number(o));} @Get(':id/timeline') timeline(@Param('id')id:string){return this.service.timeline(id)} @Get(':id') findOne(@Param('id') id:string){return this.service.findOne(id);} @Post() create(@Body() dto:CreateCustomerDto){return this.service.create(dto);} @Patch(':id') update(@Param('id') id:string,@Body() dto:UpdateCustomerDto){return this.service.update(id,dto);} }
