import { createServer } from 'node:http';
import { createApp } from './app.js';
import { pool } from './config/database.js';
import { env } from './config/env.js';
import { createRealtimeServer } from './realtime/socket.js';
import { cleanupStaleVehicleImageStaging } from './modules/vehicles/vehicle-image-storage.js';
const server = createServer(createApp());
const realtime = createRealtimeServer(server);
cleanupStaleVehicleImageStaging().catch(error => console.error('[VEHICLE_IMAGE] nettoyage staging au démarrage échoué', { code: error.code, message: error instanceof Error ? error.message : String(error) })).finally(() => server.listen(env.port, () => console.log(`LCA Express API en écoute sur le port ${env.port}`)));
async function shutdown(signal) { console.log(`${signal}: arrêt propre`); realtime.io.close(); server.close(async () => { await pool.end(); process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); }
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
