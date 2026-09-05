import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { LoginDto } from './auth.dto';

interface UserRow extends RowDataPacket { id: string; agency_id: string | null; first_name: string; last_name: string; email: string; password_hash: string; is_active: number; }
interface RoleRow extends RowDataPacket { code: string }

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  private async issueTokens(user: UserRow, roles: string[]) {
    const payload = { sub: user.id, email: user.email, roles, agencyId: user.agency_id };
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: accessTtl as any });
    const tokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync({ ...payload, jti: tokenId, type: 'refresh' }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: refreshTtl as any });
    await this.db.execute('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))', [tokenId, user.id, this.hashToken(refreshToken)]);
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const [user] = await this.db.query<UserRow[]>('SELECT id, agency_id, first_name, last_name, email, password_hash, is_active FROM users WHERE email = ? LIMIT 1', [dto.email.trim().toLowerCase()]);
    if (!user || !user.is_active || !(await argon2.verify(user.password_hash, dto.password))) throw new UnauthorizedException('Identifiants invalides');
    const roleRows = await this.db.query<RoleRow[]>('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?', [user.id]);
    const roles = roleRows.map((role) => role.code);
    const tokens = await this.issueTokens(user, roles);
    await this.db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    return { ...tokens, user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, agencyId: user.agency_id, roles } };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; jti: string; type: string }>(refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      if (payload.type !== 'refresh') throw new Error();
      const result = await this.db.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()', [payload.jti, this.hashToken(refreshToken)]);
      if (!result.affectedRows) throw new Error();
      const [user] = await this.db.query<UserRow[]>('SELECT id, agency_id, first_name, last_name, email, password_hash, is_active FROM users WHERE id = ? AND is_active = TRUE', [payload.sub]);
      if (!user) throw new Error();
      const roles = (await this.db.query<RoleRow[]>('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?', [user.id])).map((r) => r.code);
      return this.issueTokens(user, roles);
    } catch { throw new UnauthorizedException('Refresh token invalide'); }
  }

  async logout(refreshToken: string) {
    await this.db.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL', [this.hashToken(refreshToken)]);
  }
}
