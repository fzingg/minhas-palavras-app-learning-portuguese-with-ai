import * as SQLite from 'expo-sqlite';
import { Word } from '../types';

const DB_NAME = 'vocabulary.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY NOT NULL,
      portuguese TEXT NOT NULL,
      french TEXT NOT NULL,
      examples TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

export async function getAllWords(): Promise<Word[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    portuguese: string;
    french: string;
    examples: string;
    createdAt: number;
    updatedAt: number;
  }>('SELECT * FROM words ORDER BY updatedAt DESC');

  return rows.map(row => ({
    ...row,
    examples: JSON.parse(row.examples),
  }));
}

export async function getWordById(id: string): Promise<Word | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    portuguese: string;
    french: string;
    examples: string;
    createdAt: number;
    updatedAt: number;
  }>('SELECT * FROM words WHERE id = ?', [id]);

  if (!row) return null;

  return {
    ...row,
    examples: JSON.parse(row.examples),
  };
}

export async function insertWord(word: Word): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO words (id, portuguese, french, examples, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [word.id, word.portuguese, word.french, JSON.stringify(word.examples), word.createdAt, word.updatedAt]
  );
}

export async function updateWord(word: Word): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE words SET portuguese = ?, french = ?, examples = ?, updatedAt = ? WHERE id = ?',
    [word.portuguese, word.french, JSON.stringify(word.examples), word.updatedAt, word.id]
  );
}

export async function deleteWord(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM words WHERE id = ?', [id]);
}

export async function deleteAllWords(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM words');
}

export async function importWords(words: Word[]): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM words');

  for (const word of words) {
    await database.runAsync(
      'INSERT INTO words (id, portuguese, french, examples, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [word.id, word.portuguese, word.french, JSON.stringify(word.examples), word.createdAt, word.updatedAt]
    );
  }
}
