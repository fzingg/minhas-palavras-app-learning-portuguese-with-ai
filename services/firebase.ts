import firestore from '@react-native-firebase/firestore';
import { Word } from '../types';

const COLLECTION_NAME = 'vocabularies';

// Get Firestore collection reference
const wordsCollection = firestore().collection(COLLECTION_NAME);

// Subscribe to real-time updates
export function subscribeToWords(
  onUpdate: (words: Word[]) => void,
  onError: (error: Error) => void
): () => void {
  const unsubscribe = wordsCollection
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const words: Word[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          portuguese: doc.data().portuguese,
          french: doc.data().french,
          examples: doc.data().examples || [],
          createdAt: doc.data().createdAt?.toMillis() || Date.now(),
          updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
        }));
        onUpdate(words);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        onError(error);
      }
    );

  return unsubscribe;
}

// Get all words (one-time fetch)
export async function getAllWords(): Promise<Word[]> {
  const snapshot = await wordsCollection.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    portuguese: doc.data().portuguese,
    french: doc.data().french,
    examples: doc.data().examples || [],
    createdAt: doc.data().createdAt?.toMillis() || Date.now(),
    updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
  }));
}

// Add a new word
export async function addWord(word: Omit<Word, 'id'>): Promise<string> {
  const docRef = await wordsCollection.add({
    portuguese: word.portuguese,
    french: word.french,
    examples: word.examples,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// Update an existing word
export async function updateWord(
  id: string,
  updates: Partial<Omit<Word, 'id' | 'createdAt'>>
): Promise<void> {
  await wordsCollection.doc(id).update({
    ...updates,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

// Delete a word
export async function deleteWord(id: string): Promise<void> {
  await wordsCollection.doc(id).delete();
}

// Import words (batch write for efficiency)
export async function importWords(words: Word[]): Promise<void> {
  const batch = firestore().batch();

  // First, delete all existing words
  const existingDocs = await wordsCollection.get();
  existingDocs.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Then add all new words
  words.forEach((word) => {
    const docRef = wordsCollection.doc(word.id);
    batch.set(docRef, {
      portuguese: word.portuguese,
      french: word.french,
      examples: word.examples,
      createdAt: firestore.Timestamp.fromMillis(word.createdAt),
      updatedAt: firestore.Timestamp.fromMillis(word.updatedAt),
    });
  });

  await batch.commit();
}

// Seed database with initial data (adds without clearing)
export async function seedWords(words: Omit<Word, 'id'>[]): Promise<number> {
  const batch = firestore().batch();

  words.forEach((word) => {
    const docRef = wordsCollection.doc(); // Auto-generate ID
    batch.set(docRef, {
      portuguese: word.portuguese,
      french: word.french,
      examples: word.examples,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return words.length;
}

