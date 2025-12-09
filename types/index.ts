export interface Word {
  id: string;
  portuguese: string;
  french: string;
  examples: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyState {
  words: Word[];
  isLoading: boolean;
  error: string | null;
}

export type VocabularyAction =
  | { type: 'SET_WORDS'; payload: Word[] }
  | { type: 'ADD_WORD'; payload: Word }
  | { type: 'UPDATE_WORD'; payload: Word }
  | { type: 'DELETE_WORD'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface QuizState {
  currentWord: Word | null;
  showPortuguese: boolean;
  userAnswer: string;
  isAnswered: boolean;
  isCorrect: boolean | null;
}
