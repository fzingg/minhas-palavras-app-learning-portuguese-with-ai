import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Word, VocabularyState, VocabularyAction } from '../types';
import * as firebaseService from '../services/firebase';

const initialState: VocabularyState = {
  words: [],
  isLoading: true,
  error: null,
};

function vocabularyReducer(state: VocabularyState, action: VocabularyAction): VocabularyState {
  switch (action.type) {
    case 'SET_WORDS':
      return { ...state, words: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

interface VocabularyContextType {
  state: VocabularyState;
  addWord: (portuguese: string, french: string, examples: string[]) => Promise<void>;
  updateWord: (id: string, portuguese: string, french: string, examples: string[]) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  refreshWords: () => Promise<void>;
  importWords: (words: Word[]) => Promise<void>;
  getRandomWord: () => Word | null;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vocabularyReducer, initialState);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });

    const unsubscribe = firebaseService.subscribeToWords(
      (words) => {
        dispatch({ type: 'SET_WORDS', payload: words });
      },
      (error) => {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with database' });
        console.error('Firestore error:', error);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const addWord = async (portuguese: string, french: string, examples: string[]) => {
    await firebaseService.addWord({
      portuguese: portuguese.trim(),
      french: french.trim(),
      examples: examples.filter(e => e.trim() !== ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // No need to dispatch - real-time listener will update state
  };

  const updateWord = async (id: string, portuguese: string, french: string, examples: string[]) => {
    await firebaseService.updateWord(id, {
      portuguese: portuguese.trim(),
      french: french.trim(),
      examples: examples.filter(e => e.trim() !== ''),
    });
    // No need to dispatch - real-time listener will update state
  };

  const deleteWord = async (id: string) => {
    await firebaseService.deleteWord(id);
    // No need to dispatch - real-time listener will update state
  };

  const refreshWords = async () => {
    // With real-time sync, this is essentially a no-op
    // The listener keeps data fresh automatically
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const words = await firebaseService.getAllWords();
      dispatch({ type: 'SET_WORDS', payload: words });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh words' });
    }
  };

  const importWords = async (words: Word[]) => {
    await firebaseService.importWords(words);
    // No need to dispatch - real-time listener will update state
  };

  const getRandomWord = (): Word | null => {
    if (state.words.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * state.words.length);
    return state.words[randomIndex];
  };

  return (
    <VocabularyContext.Provider
      value={{
        state,
        addWord,
        updateWord,
        deleteWord,
        refreshWords,
        importWords,
        getRandomWord,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
}
