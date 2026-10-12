import { pool } from '../config/database.js';
import {adminProvisioningConfig,provisionAdmin} from './admin-provisioning.js';

try {
  const config=adminProvisioningConfig(process.env),result=await provisionAdmin(pool,config);
  console.log(result.action==='created'?'Super Admin créé':result.action==='password_rotated'?'Mot de passe Super Admin renouvelé explicitement':'Super Admin déjà provisionné; aucun changement');
} catch (error) {
  throw error;
} finally {
  await pool.end();
}
