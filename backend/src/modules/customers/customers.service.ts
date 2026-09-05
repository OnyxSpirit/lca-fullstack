import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}
  private map(r: RowDataPacket) { return { id: r.id, customerType: r.customer_type, firstName: r.first_name, lastName: r.last_name, companyName: r.company_name, email: r.email, phone: r.phone, secondaryPhone: r.secondary_phone, address: r.address, city: r.city, country: r.country, assignedUserId: r.assigned_user_id, assignedUserName: r.assigned_user_name, createdAt: r.created_at, updatedAt: r.updated_at }; }
  async findAll(search = '', limit = 50, offset = 0) {
    const term = `%${search}%`;
    const rows = await this.db.query<RowDataPacket[]>(`SELECT c.*, CONCAT_WS(' ',u.first_name,u.last_name) assigned_user_name FROM customers c LEFT JOIN users u ON u.id=c.assigned_user_id WHERE ?='' OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?`, [search, term, term, term, term, term, Math.min(limit, 100), Math.max(offset, 0)]);
    return rows.map((r) => this.map(r));
  }
  async findOne(id: string) { const [row] = await this.db.query<RowDataPacket[]>('SELECT c.*, CONCAT_WS(" ",u.first_name,u.last_name) assigned_user_name FROM customers c LEFT JOIN users u ON u.id=c.assigned_user_id WHERE c.id=?', [id]); if (!row) throw new NotFoundException('Client introuvable'); return this.map(row); }
  async timeline(id:string){await this.findOne(id);return this.db.query<RowDataPacket[]>(`SELECT * FROM (SELECT 'invoice' event_type,i.id reference_id,CONCAT('Facture ',i.invoice_number,' — ',i.status) title,CONCAT(i.total,' XAF') description,i.created_at event_at FROM invoices i WHERE i.customer_id=? UNION ALL SELECT 'sale',s.id,CONCAT('Vente ',s.sale_number,' — ',s.status),CONCAT(s.total,' XAF'),s.created_at FROM sales s WHERE s.customer_id=? UNION ALL SELECT 'repair_order',ro.id,CONCAT('OR ',ro.order_number,' — ',ro.status),ro.complaint,ro.created_at FROM repair_orders ro WHERE ro.customer_id=? UNION ALL SELECT 'activity',a.id,a.subject,a.description,a.created_at FROM activities a WHERE a.customer_id=?) events ORDER BY event_at DESC LIMIT 100`,[id,id,id,id])}
  async create(dto: CreateCustomerDto) { const result = await this.db.execute(`INSERT INTO customers (customer_type,first_name,last_name,company_name,email,phone,secondary_phone,address,city,country,assigned_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [dto.customerType,dto.firstName??null,dto.lastName??null,dto.companyName??null,dto.email??null,dto.phone??null,dto.secondaryPhone??null,dto.address??null,dto.city??null,dto.country??null,dto.assignedUserId??null]); return this.findOne(String(result.insertId)); }
  async update(id: string, dto: UpdateCustomerDto) { const current = await this.findOne(id); await this.db.execute(`UPDATE customers SET customer_type=?,first_name=?,last_name=?,company_name=?,email=?,phone=?,secondary_phone=?,address=?,city=?,country=?,assigned_user_id=? WHERE id=?`, [dto.customerType??current.customerType,dto.firstName??current.firstName,dto.lastName??current.lastName,dto.companyName??current.companyName,dto.email??current.email,dto.phone??current.phone,dto.secondaryPhone??current.secondaryPhone,dto.address??current.address,dto.city??current.city,dto.country??current.country,dto.assignedUserId??current.assignedUserId,id]); return this.findOne(id); }
}
