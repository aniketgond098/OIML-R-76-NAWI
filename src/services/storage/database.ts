/**
 * OIML R 76 Metrology Database Adapter
 * Backed by storageService with IndexedDB local persistence and Supabase Cloud Synchronization
 */
import { storageService, StorageService } from './storageService';

export const db: StorageService = storageService;
export { storageService, StorageService };
export default storageService;
