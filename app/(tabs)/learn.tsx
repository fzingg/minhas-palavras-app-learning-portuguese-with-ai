import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useVocabulary } from '../../contexts/VocabularyContext';
import { Word } from '../../types';

// Helper to find European Portuguese voice
let ptPTVoiceId: string | null = null;

async function findPtPTVoice(): Promise<string | null> {
  if (ptPTVoiceId !== null) return ptPTVoiceId;

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    // First try to find exact pt-PT match
    let voice = voices.find(v =>
      v.language === 'pt-PT' ||
      v.language === 'pt_PT' ||
      v.identifier.includes('pt-PT') ||
      v.identifier.includes('pt_PT')
    );

    // If not found, try to find Portugal-specific voice by name
    if (!voice) {
      voice = voices.find(v =>
        v.language.startsWith('pt') &&
        (v.name.toLowerCase().includes('portugal') ||
         v.name.toLowerCase().includes('european'))
      );
    }

    ptPTVoiceId = voice?.identifier || '';
    return ptPTVoiceId || null;
  } catch (e) {
    console.log('Could not get voices:', e);
    return null;
  }
}

type LearnMode = 'select' | 'quiz' | 'listen';

// Articles to ignore when comparing answers
const ARTICLES = [
  // Portuguese
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  // French
  'le', 'la', 'les', "l'", 'un', 'une', 'des', 'du', 'de la', "de l'",
];

// Remove accents from text for lenient comparison
function removeAccents(text: string): string {
  // First try Unicode normalization
  let result = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Fallback: manually replace common accented characters
  const accentMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ñ': 'n', 'ç': 'c', 'ý': 'y', 'ÿ': 'y',
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
    'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
    'Ñ': 'N', 'Ç': 'C', 'Ý': 'Y',
  };

  for (const [accented, plain] of Object.entries(accentMap)) {
    result = result.split(accented).join(plain);
  }

  return result;
}

function normalizeForComparison(text: string): string {
  let normalized = text.trim().toLowerCase();

  // Sort articles by length (longest first) to match "de la" before "de"
  const sortedArticles = [...ARTICLES].sort((a, b) => b.length - a.length);

  for (const article of sortedArticles) {
    // Remove article at the beginning followed by space or apostrophe
    const patterns = [
      new RegExp(`^${article}\\s+`, 'i'),  // "le " at start
      new RegExp(`^${article}$`, 'i'),      // just the article alone
    ];
    for (const pattern of patterns) {
      normalized = normalized.replace(pattern, '');
    }
  }

  // Also handle apostrophes attached to words (l'obligation -> obligation)
  normalized = normalized.replace(/^l'/i, '');

  return normalized.trim();
}

function singleAnswerMatches(userAnswer: string, correctAnswer: string): boolean {
  const userTrimmed = userAnswer.trim().toLowerCase();
  const correctTrimmed = correctAnswer.trim().toLowerCase();

  // Exact match
  if (userTrimmed === correctTrimmed) {
    return true;
  }

  // Match ignoring accents (é -> e, à -> a, etc.)
  if (removeAccents(userTrimmed) === removeAccents(correctTrimmed)) {
    return true;
  }

  // Match ignoring articles
  const normalizedUser = normalizeForComparison(userAnswer);
  const normalizedCorrect = normalizeForComparison(correctAnswer);

  if (normalizedUser === normalizedCorrect) {
    return true;
  }

  // Match ignoring both articles AND accents
  if (removeAccents(normalizedUser) === removeAccents(normalizedCorrect)) {
    return true;
  }

  return false;
}

function answersMatch(userAnswer: string, correctAnswer: string): boolean {
  // Split correct answer by "/" to handle multiple valid translations
  // e.g., "maison / casa" or "le chien / un chien"
  const validAnswers = correctAnswer.split('/').map(a => a.trim());

  // Check if user answer matches any of the valid translations
  for (const valid of validAnswers) {
    if (singleAnswerMatches(userAnswer, valid)) {
      return true;
    }
  }

  return false;
}

export default function LearnScreen() {
  const { state, getRandomWord } = useVocabulary();

  // Mode selection
  const [mode, setMode] = useState<LearnMode>('select');

  // Quiz mode state
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [showPortuguese, setShowPortuguese] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Listen mode state
  const [listenWord, setListenWord] = useState<Word | null>(null);
  const [listenPhase, setListenPhase] = useState<'portuguese' | 'waiting' | 'french'>('portuguese');
  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers on unmount or mode change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      Speech.stop();
    };
  }, []);

  const startQuiz = useCallback(() => {
    const word = getRandomWord();
    setCurrentWord(word);
    setShowPortuguese(Math.random() > 0.5);
    setUserAnswer('');
    setIsAnswered(false);
    setIsCorrect(false);
  }, [getRandomWord]);

  const checkAnswer = () => {
    if (!currentWord || !userAnswer.trim()) return;

    const correctAnswer = showPortuguese ? currentWord.french : currentWord.portuguese;
    const isAnswerCorrect = answersMatch(userAnswer, correctAnswer);

    setIsCorrect(isAnswerCorrect);
    setIsAnswered(true);
  };

  const nextWord = () => {
    startQuiz();
  };

  // Listen mode functions
  const startListenMode = useCallback(() => {
    setMode('listen');
    setIsListening(true);
    playNextListenWord();
  }, []);

  const playNextListenWord = useCallback(async () => {
    const word = getRandomWord();
    if (!word) return;

    setListenWord(word);
    setListenPhase('portuguese');
    setCountdown(5);

    // Find European Portuguese voice
    const ptVoice = await findPtPTVoice();

    // Speak Portuguese word with pt-PT voice if available
    Speech.speak(word.portuguese, {
      language: 'pt-PT',
      voice: ptVoice || undefined,
      rate: 1.0,
      onDone: () => {
        // Start countdown after Portuguese is spoken
        setListenPhase('waiting');
        let count = 5;
        setCountdown(count);

        countdownRef.current = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
          }
        }, 1000);

        // After 5 seconds, speak French
        timerRef.current = setTimeout(() => {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setListenPhase('french');
          Speech.speak(word.french, {
            language: 'fr-FR',
            rate: 0.9,
            onDone: () => {
              // Wait 2 seconds then move to next word
              timerRef.current = setTimeout(() => {
                if (isListening) {
                  playNextListenWord();
                }
              }, 2000);
            },
          });
        }, 5000);
      },
    });
  }, [getRandomWord, isListening]);

  const stopListenMode = useCallback(() => {
    setIsListening(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    Speech.stop();
    setMode('select');
    setListenWord(null);
  }, []);

  const skipToNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    Speech.stop();
    playNextListenWord();
  }, [playNextListenWord]);

  const goBackToSelect = () => {
    if (mode === 'listen') {
      stopListenMode();
    } else {
      setMode('select');
      setCurrentWord(null);
    }
  };

  if (state.words.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Aucun mot à apprendre</Text>
        <Text style={styles.emptyText}>
          Ajoutez des mots dans l'onglet Mots pour commencer !
        </Text>
      </View>
    );
  }

  // Mode selection screen
  if (mode === 'select') {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.startTitle}>Apprendre</Text>
        <Text style={styles.startSubtitle}>
          Choisissez votre mode d'apprentissage
        </Text>
        <Text style={styles.wordCount}>{state.words.length} mots disponibles</Text>

        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => {
              setMode('quiz');
              startQuiz();
            }}
          >
            <Ionicons name="school" size={32} color="#1e3d60" />
            <Text style={styles.modeButtonTitle}>Mode Quiz</Text>
            <Text style={styles.modeButtonDesc}>
              Testez vos connaissances en écrivant les traductions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, styles.modeButtonListen]}
            onPress={startListenMode}
          >
            <Ionicons name="headset" size={32} color="#1e3d60" />
            <Text style={styles.modeButtonTitle}>Mode Écoute</Text>
            <Text style={styles.modeButtonDesc}>
              Écoutez les mots en portugais puis leur traduction en français
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Listen mode screen
  if (mode === 'listen' && listenWord) {
    return (
      <View style={styles.container}>
        <View style={styles.listenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToSelect}>
            <Ionicons name="arrow-back" size={24} color="#1e3d60" />
          </TouchableOpacity>
          <Text style={styles.listenHeaderTitle}>Mode Écoute</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.listenContent}>
          <View style={styles.listenCard}>
            {listenPhase === 'portuguese' && (
              <>
                <View style={styles.listenPhaseIndicator}>
                  <Ionicons name="volume-high" size={24} color="#e57d3b" />
                  <Text style={styles.listenPhaseText}>Portugais</Text>
                </View>
                <Text style={styles.listenWord}>{listenWord.portuguese}</Text>
              </>
            )}

            {listenPhase === 'waiting' && (
              <>
                <View style={styles.listenPhaseIndicator}>
                  <Ionicons name="time" size={24} color="#86af50" />
                  <Text style={styles.listenPhaseText}>Pensez à la traduction...</Text>
                </View>
                <Text style={styles.listenWord}>{listenWord.portuguese}</Text>
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              </>
            )}

            {listenPhase === 'french' && (
              <>
                <View style={styles.listenPhaseIndicator}>
                  <Ionicons name="volume-high" size={24} color="#1e3d60" />
                  <Text style={styles.listenPhaseText}>Français</Text>
                </View>
                <Text style={styles.listenWordPortuguese}>{listenWord.portuguese}</Text>
                <Ionicons name="arrow-down" size={24} color="#ccc" style={{ marginVertical: 8 }} />
                <Text style={styles.listenWordFrench}>{listenWord.french}</Text>
              </>
            )}
          </View>

          <View style={styles.listenControls}>
            <TouchableOpacity style={styles.skipButton} onPress={skipToNext}>
              <Ionicons name="play-skip-forward" size={20} color="#1e3d60" style={styles.buttonIcon} />
              <Text style={styles.skipButtonText}>Suivant</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stopButton} onPress={stopListenMode}>
              <Ionicons name="stop" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.stopButtonText}>Arrêter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Quiz mode - guard against null currentWord
  if (!currentWord) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.quizBackButton} onPress={goBackToSelect}>
          <Ionicons name="arrow-back" size={20} color="#1e3d60" />
          <Text style={styles.quizBackButtonText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.questionCard}>
          <Text style={styles.languageLabel}>
            {showPortuguese ? 'Portugais' : 'Français'}
          </Text>
          <Text style={styles.questionWord}>
            {showPortuguese ? currentWord.portuguese : currentWord.french}
          </Text>
          <Text style={styles.promptText}>
            Traduire en {showPortuguese ? 'français' : 'portugais'} :
          </Text>
        </View>

        <TextInput
          style={[
            styles.answerInput,
            isAnswered && (isCorrect ? styles.correctInput : styles.incorrectInput),
          ]}
          value={userAnswer}
          onChangeText={setUserAnswer}
          placeholder="Votre réponse..."
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isAnswered}
          onSubmitEditing={!isAnswered ? checkAnswer : undefined}
        />

        {!isAnswered ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.checkButton, !userAnswer.trim() && styles.disabledButton]}
              onPress={checkAnswer}
              disabled={!userAnswer.trim()}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.checkButtonText}>Vérifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={nextWord}>
              <Ionicons name="play-skip-forward" size={20} color="#1e3d60" style={styles.buttonIcon} />
              <Text style={styles.skipButtonText}>Passer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View
              style={[
                styles.resultBadge,
                isCorrect ? styles.correctBadge : styles.incorrectBadge,
              ]}
            >
              <Text style={styles.resultText}>
                {isCorrect ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#2ECC71" /> Correct !
                  </>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#E74C3C" /> Incorrect
                  </>
                )}
              </Text>
            </View>

            <View style={styles.answerCard}>
              <Text style={styles.answerLabel}>Bonne réponse :</Text>
              <Text style={styles.correctAnswerText}>
                {showPortuguese ? currentWord.french : currentWord.portuguese}
              </Text>

              {currentWord.examples.length > 0 && (
                <View style={styles.examplesSection}>
                  <Text style={styles.examplesTitle}>Exemples :</Text>
                  {currentWord.examples.map((example, index) => (
                    <Text key={index} style={styles.exampleText}>
                      • {example}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={nextWord}>
              <Text style={styles.nextButtonText}>Mot suivant</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIconRight} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F6FA',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3d60',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F6FA',
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e3d60',
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  wordCount: {
    fontSize: 14,
    color: '#86af50',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#86af50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonIconRight: {
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageLabel: {
    fontSize: 14,
    color: '#e57d3b',
    fontWeight: '600',
    marginBottom: 8,
  },
  questionWord: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e3d60',
    marginBottom: 16,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 14,
    color: '#666',
  },
  answerInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    textAlign: 'center',
  },
  correctInput: {
    borderColor: '#2ECC71',
    backgroundColor: '#E8F8F0',
  },
  incorrectInput: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDEDEC',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkButton: {
    flex: 2,
    backgroundColor: '#86af50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#c3d4a8',
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e3d60',
  },
  skipButtonText: {
    color: '#1e3d60',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
  },
  correctBadge: {
    backgroundColor: '#E8F8F0',
  },
  incorrectBadge: {
    backgroundColor: '#FDEDEC',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  answerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#86af50',
  },
  examplesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3d60',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#86af50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Mode selection styles
  modeButtons: {
    width: '100%',
    gap: 16,
  },
  modeButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonListen: {
    backgroundColor: '#f8f9ff',
  },
  modeButtonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3d60',
    marginTop: 12,
    marginBottom: 8,
  },
  modeButtonDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Listen mode styles
  listenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  listenHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3d60',
  },
  listenContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  listenCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  listenPhaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  listenPhaseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  listenWord: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1e3d60',
    textAlign: 'center',
  },
  listenWordPortuguese: {
    fontSize: 28,
    fontWeight: '600',
    color: '#e57d3b',
    textAlign: 'center',
  },
  listenWordFrench: {
    fontSize: 32,
    fontWeight: '700',
    color: '#86af50',
    textAlign: 'center',
  },
  countdownContainer: {
    marginTop: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#86af50',
  },
  listenControls: {
    flexDirection: 'row',
    gap: 12,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quizBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  quizBackButtonText: {
    fontSize: 16,
    color: '#1e3d60',
    fontWeight: '500',
  },
});
