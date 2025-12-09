import React, { useState, useMemo, useEffect } from 'react';
import { Paths, File } from 'expo-file-system';
import * as Speech from 'expo-speech';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVocabulary } from '../../contexts/VocabularyContext';
import { generateStory, StoryResult } from '../../services/gemini';

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

interface UsedWord {
  portuguese: string;
  french: string;
}

const getStoryFile = () => new File(Paths.document, 'lastStory.json');

export default function ReadScreen() {
  const { state } = useVocabulary();
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<UsedWord | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load saved story on mount
  useEffect(() => {
    const loadSavedStory = async () => {
      try {
        const file = getStoryFile();
        if (file.exists) {
          const content = await file.text();
          const saved = JSON.parse(content) as StoryResult;
          setStoryResult(saved);
        }
      } catch (err) {
        console.log('No saved story found');
      }
    };
    loadSavedStory();
  }, []);

  // Save story to file
  const saveStory = (result: StoryResult) => {
    try {
      const file = getStoryFile();
      file.write(JSON.stringify(result));
    } catch (err) {
      console.error('Failed to save story:', err);
    }
  };

  const handleCopyStory = () => {
    if (storyResult?.story) {
      Clipboard.setString(storyResult.story);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleListenStory = async () => {
    if (!storyResult?.story) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      // Find European Portuguese voice
      const ptVoice = await findPtPTVoice();
      Speech.speak(storyResult.story, {
        language: 'pt-PT',
        voice: ptVoice || undefined,
        rate: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleGenerateStory = async () => {
    if (state.words.length < 10) {
      setError('Vous avez besoin d\'au moins 10 mots pour générer une histoire.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateStory(
        state.words.map(w => ({ portuguese: w.portuguese, french: w.french }))
      );
      setStoryResult(result);
      saveStory(result);
    } catch (err: any) {
      setError(err.message || 'Échec de la génération de l\'histoire');
    } finally {
      setIsGenerating(false);
    }
  };

  // Build a regex pattern from used words for highlighting
  const highlightPattern = useMemo(() => {
    if (!storyResult?.usedWords.length) return null;

    // Sort by length (longest first) to match longer phrases before shorter ones
    const sortedWords = [...storyResult.usedWords].sort(
      (a, b) => b.portuguese.length - a.portuguese.length
    );

    // Escape special regex characters and create pattern
    const patterns = sortedWords.map(w =>
      w.portuguese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    return new RegExp(`(${patterns.join('|')})`, 'gi');
  }, [storyResult?.usedWords]);

  // Find which word was matched (case-insensitive)
  const findMatchedWord = (text: string): UsedWord | undefined => {
    if (!storyResult?.usedWords) return undefined;
    return storyResult.usedWords.find(
      w => w.portuguese.toLowerCase() === text.toLowerCase()
    );
  };

  // Render story with highlighted words
  const renderStoryWithHighlights = () => {
    if (!storyResult?.story || !highlightPattern) {
      return <Text style={styles.storyText}>{storyResult?.story}</Text>;
    }

    const parts = storyResult.story.split(highlightPattern);

    return (
      <Text style={styles.storyText}>
        {parts.map((part, index) => {
          const matchedWord = findMatchedWord(part);
          if (matchedWord) {
            return (
              <Text
                key={index}
                style={styles.highlightedWord}
                onPress={() => setSelectedWord(matchedWord)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  if (state.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#86af50" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (state.words.length < 10) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="book-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Pas assez de mots</Text>
        <Text style={styles.emptyText}>
          Ajoutez au moins 10 mots à votre vocabulaire pour générer une histoire.
        </Text>
        <Text style={styles.wordCountText}>
          Actuel : {state.words.length} / 10 mots
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!storyResult ? (
        <View style={styles.startContainer}>
          <Ionicons name="book" size={64} color="#1e3d60" />
          <Text style={styles.startTitle}>Pratique de lecture</Text>
          <Text style={styles.startSubtitle}>
            Générez une courte histoire en portugais utilisant les mots de votre vocabulaire
          </Text>
          <Text style={styles.wordCount}>{state.words.length} mots disponibles</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#E74C3C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateStory}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                <Text style={styles.generateButtonText}>Génération en cours...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.generateButtonText}>Générer une histoire</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.storyContainer}
            contentContainerStyle={styles.storyContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.topBar}>
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={styles.legendColor} />
                  <Text style={styles.legendText}>
                    Mots du vocabulaire ({storyResult.usedWords.length}) - appuyez pour voir la traduction
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyStory}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#86af50' : '#1e3d60'} />
                <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                  {copied ? 'Copié !' : 'Copier'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.copyButton, isSpeaking && styles.listenButtonActive]} onPress={handleListenStory}>
                <Ionicons name={isSpeaking ? 'stop' : 'volume-high'} size={18} color={isSpeaking ? '#fff' : '#1e3d60'} />
                <Text style={[styles.copyButtonText, isSpeaking && styles.listenButtonTextActive]}>
                  {isSpeaking ? 'Stop' : 'Écouter'}
                </Text>
              </TouchableOpacity>
            </View>

            {renderStoryWithHighlights()}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.newStoryButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerateStory}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.newStoryButtonText}>Nouvelle histoire</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Translation Modal */}
      <Modal
        visible={selectedWord !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWord(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedWord(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalPortuguese}>{selectedWord?.portuguese}</Text>
            <Text style={styles.modalFrench}>{selectedWord?.french}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  wordCountText: {
    fontSize: 14,
    color: '#e57d3b',
    marginTop: 16,
    fontWeight: '600',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e3d60',
    marginTop: 20,
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  wordCount: {
    fontSize: 14,
    color: '#86af50',
    marginBottom: 30,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#E74C3C',
    marginLeft: 8,
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: '#e57d3b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#f0b897',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
  },
  storyContainer: {
    flex: 1,
  },
  storyContent: {
    padding: 20,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  legendContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },
  copyButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e3d60',
  },
  copyButtonTextCopied: {
    color: '#86af50',
  },
  listenButtonActive: {
    backgroundColor: '#e57d3b',
  },
  listenButtonTextActive: {
    color: '#fff',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    backgroundColor: '#e8f5e0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86af50',
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  storyText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#333',
  },
  highlightedWord: {
    backgroundColor: '#e8f5e0',
    color: '#1e3d60',
    fontWeight: '600',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#F5F6FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  newStoryButton: {
    backgroundColor: '#86af50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newStoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalPortuguese: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3d60',
    marginBottom: 8,
  },
  modalFrench: {
    fontSize: 20,
    color: '#86af50',
    fontWeight: '600',
  },
});
