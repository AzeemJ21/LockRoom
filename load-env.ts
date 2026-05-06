/**
 * Load `.env.local` before any other app code so `process.env` is complete for the custom Node server.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
