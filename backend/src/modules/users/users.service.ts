import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../database/database.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(agencyId?:string|null) {
    const rows = await this.db.query<RowDataPacket[]>(`SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.job_title,u.agency_id,a.name agency_name,u.is_active,GROUP_CONCAT(r.code ORDER BY r.code) roles FROM users u LEFT JOIN agencies a ON a.id=u.agency_id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE (? IS NULL OR u.agency_id=?) GROUP BY u.id ORDER BY u.last_name,u.first_name`,[agencyId??null,agencyId??null]);
    return rows.map((r) => ({ id:r.id,firstName:r.first_name,lastName:r.last_name,name:`${r.first_name} ${r.last_name}`,email:r.email,phone:r.phone,jobTitle:r.job_title,agencyId:r.agency_id,agencyName:r.agency_name,isActive:Boolean(r.is_active),roles:r.roles?String(r.roles).split(','):[] }));
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.db.transaction(async (connection) => {
        const [roles] = await connection.execute<RowDataPacket[]>('SELECT id FROM roles WHERE code=?', [dto.roleCode]);
        if (!roles[0]) throw new NotFoundException('Rôle inconnu');
        const hash = await argon2.hash(dto.password);
        const [result] = await connection.execute<any>('INSERT INTO users(agency_id,first_name,last_name,email,phone,password_hash,job_title) VALUES(?,?,?,?,?,?,?)', [dto.agencyId||null,dto.firstName.trim(),dto.lastName.trim(),dto.email.trim().toLowerCase(),dto.phone||null,hash,dto.jobTitle||null]);
        await connection.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [result.insertId,roles[0].id]);
        return { id:String(result.insertId),email:dto.email };
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') throw new ConflictException('Cette adresse email existe déjà');
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    const exists = await this.db.transaction(async (connection) => {
      const fields: string[] = [];
      const values: any[] = [];
      for (const [key,value] of Object.entries({first_name:dto.firstName,last_name:dto.lastName,phone:dto.phone,job_title:dto.jobTitle,agency_id:dto.agencyId,is_active:dto.isActive})) {
        if (value !== undefined) { fields.push(`${key}=?`); values.push(value); }
      }
      if (fields.length) await connection.execute(`UPDATE users SET ${fields.join(',')} WHERE id=?`, [...values,id]);
      if (dto.roles) {
        const placeholders = dto.roles.map(() => '?').join(',');
        const [roles] = await connection.execute<RowDataPacket[]>(`SELECT id FROM roles WHERE code IN (${placeholders || "''"})`, dto.roles);
        if (roles.length !== dto.roles.length) throw new NotFoundException('Un rôle est inconnu');
        await connection.execute('DELETE FROM user_roles WHERE user_id=?', [id]);
        for (const role of roles) await connection.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [id,role.id]);
      }
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM users WHERE id=?', [id]);
      return rows.length;
    });
    if (!exists) throw new NotFoundException('Utilisateur introuvable');
    return { success:true };
  }
}
