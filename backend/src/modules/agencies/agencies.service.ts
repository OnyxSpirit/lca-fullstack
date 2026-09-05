import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
@Injectable()
export class AgenciesService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(agencyId?:string|null) {
    const rows = await this.db.query<RowDataPacket[]>('SELECT id, concession_id, name, code, address, city, phone, email, is_active FROM agencies WHERE (? IS NULL OR id=?) ORDER BY name',[agencyId??null,agencyId??null]);
    return rows.map((r) => ({ id: r.id, concessionId: r.concession_id, name: r.name, code: r.code, address: r.address, city: r.city, phone: r.phone, email: r.email, isActive: Boolean(r.is_active) }));
  }
}
