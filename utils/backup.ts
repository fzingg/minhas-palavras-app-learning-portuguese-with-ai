import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { Word } from '../types';

const BACKUP_FILENAME = 'vocabulary_backup.json';

export interface BackupData {
  version: number;
  exportedAt: string;
  words: Word[];
}

export async function exportToJson(words: Word[]): Promise<void> {
  const backupData: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    words,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const file = new File(Paths.cache, BACKUP_FILENAME);

  await file.write(jsonString);

  const canShare = await isAvailableAsync();
  if (canShare) {
    await shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Vocabulary',
      UTI: 'public.json',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function importFromJson(): Promise<Word[]> {
  const result = await getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    throw new Error('Import cancelled');
  }

  const fileUri = result.assets[0].uri;
  const file = new File(fileUri);
  const jsonString = await file.text();

  const data = JSON.parse(jsonString);

  // Validate the imported data
  if (!data.words || !Array.isArray(data.words)) {
    throw new Error('Invalid backup file format');
  }

  // Validate each word has required fields
  for (const word of data.words) {
    if (!word.id || !word.portuguese || !word.french) {
      throw new Error('Invalid word data in backup file');
    }
    // Ensure examples is an array
    if (!Array.isArray(word.examples)) {
      word.examples = [];
    }
    // Ensure timestamps exist
    if (!word.createdAt) word.createdAt = Date.now();
    if (!word.updatedAt) word.updatedAt = Date.now();
  }

  return data.words as Word[];
}
