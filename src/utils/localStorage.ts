/**
 * LocalStorage utilities for persisting user data
 */

import { ScheduleFile } from '../models';

const STORAGE_KEYS = {
  RECENT_FILES: 'youthScheduler_recentFiles',
  RECENT_FILE_PREFIX: 'youthScheduler_recentFile_', // Prefix for storing actual file content
  AUTO_SAVE: 'youthScheduler_autoSave',
  AUTO_SAVE_TIMESTAMP: 'youthScheduler_autoSaveTimestamp',
} as const;

const MAX_RECENT_FILES = 5; // Reduced since we're storing full file content

export interface RecentFile {
  name: string;
  lastOpened: string; // ISO date string
  hasContent: boolean; // Whether we have the file content stored
}

/**
 * Get list of recently opened files
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Get a recent file's content by name
 */
export function getRecentFileContent(name: string): ScheduleFile | null {
  try {
    const key = STORAGE_KEYS.RECENT_FILE_PREFIX + encodeURIComponent(name);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as ScheduleFile;
  } catch {
    return null;
  }
}

/**
 * Add a file to the recent files list (with content)
 */
export function addRecentFile(name: string, content: ScheduleFile): void {
  try {
    console.log('[localStorage] Adding recent file:', name);
    const recent = getRecentFiles();
    
    // Remove existing entry with same name (if any)
    const filtered = recent.filter(f => f.name !== name);
    
    // Add new entry at the beginning
    const newEntry: RecentFile = {
      name,
      lastOpened: new Date().toISOString(),
      hasContent: true,
    };
    
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_FILES);
    
    // Remove content for files that got pushed out
    const removedFiles = filtered.slice(MAX_RECENT_FILES - 1);
    for (const removed of removedFiles) {
      const key = STORAGE_KEYS.RECENT_FILE_PREFIX + encodeURIComponent(removed.name);
      localStorage.removeItem(key);
    }
    
    // Store the file list
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated));
    
    // Store the actual file content
    const contentKey = STORAGE_KEYS.RECENT_FILE_PREFIX + encodeURIComponent(name);
    localStorage.setItem(contentKey, JSON.stringify(content));
    
    console.log('[localStorage] Recent files updated, count:', updated.length);
  } catch (e) {
    console.warn('Failed to save recent file:', e);
  }
}

/**
 * Remove a file from recent files list
 */
export function removeRecentFile(name: string): void {
  try {
    const recent = getRecentFiles();
    const filtered = recent.filter(f => f.name !== name);
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(filtered));
    
    // Also remove the content
    const key = STORAGE_KEYS.RECENT_FILE_PREFIX + encodeURIComponent(name);
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to remove recent file:', e);
  }
}

/**
 * Clear all recent files
 */
export function clearRecentFiles(): void {
  try {
    // Get current files to clean up their content
    const recent = getRecentFiles();
    for (const file of recent) {
      const key = STORAGE_KEYS.RECENT_FILE_PREFIX + encodeURIComponent(file.name);
      localStorage.removeItem(key);
    }
    localStorage.removeItem(STORAGE_KEYS.RECENT_FILES);
  } catch (e) {
    console.warn('Failed to clear recent files:', e);
  }
}

/**
 * Save current session to localStorage (auto-save)
 */
export function saveSession(file: ScheduleFile): void {
  try {
    console.log('[localStorage] Saving session:', file.name);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, JSON.stringify(file));
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_TIMESTAMP, new Date().toISOString());
    console.log('[localStorage] Session saved successfully');
  } catch (e) {
    console.warn('Failed to auto-save session:', e);
  }
}

/**
 * Get auto-saved session if available
 */
export function getAutoSavedSession(): { file: ScheduleFile; timestamp: string } | null {
  try {
    console.log('[localStorage] Checking for auto-saved session...');
    const fileData = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE);
    const timestamp = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_TIMESTAMP);
    
    console.log('[localStorage] fileData exists:', !!fileData, 'timestamp:', timestamp);
    
    if (!fileData || !timestamp) return null;
    
    const file = JSON.parse(fileData) as ScheduleFile;
    console.log('[localStorage] Found auto-saved session:', file.name);
    return { file, timestamp };
  } catch (e) {
    console.warn('[localStorage] Error getting auto-saved session:', e);
    return null;
  }
}

/**
 * Clear auto-saved session
 */
export function clearAutoSavedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTO_SAVE);
    localStorage.removeItem(STORAGE_KEYS.AUTO_SAVE_TIMESTAMP);
  } catch (e) {
    console.warn('Failed to clear auto-save:', e);
  }
}

/**
 * Check if there's an auto-saved session
 */
export function hasAutoSavedSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SAVE) !== null;
  } catch {
    return false;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
}
