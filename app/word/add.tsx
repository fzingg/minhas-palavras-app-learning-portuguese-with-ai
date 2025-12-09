import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVocabulary } from '../../contexts/VocabularyContext';
import { generateExampleSentences } from '../../services/gemini';

export default function AddWordScreen() {
  const router = useRouter();
  const { addWord } = useVocabulary();
  const insets = useSafeAreaInsets();

  const [portuguese, setPortuguese] = useState('');
  const [french, setFrench] = useState('');
  const [examples, setExamples] = useState<string[]>(['']);
  const [isGenerating, setIsGenerating] = useState(false);

  const addExampleField = () => {
    setExamples([...examples, '']);
  };

  const updateExample = (index: number, value: string) => {
    const newExamples = [...examples];
    newExamples[index] = value;
    setExamples(newExamples);
  };

  const removeExample = (index: number) => {
    if (examples.length > 1) {
      const newExamples = examples.filter((_, i) => i !== index);
      setExamples(newExamples);
    } else {
      setExamples(['']);
    }
  };

  const handleGenerateExample = async () => {
    if (!portuguese.trim()) {
      Alert.alert('Mot manquant', 'Veuillez d\'abord entrer le mot en portugais');
      return;
    }
    if (!french.trim()) {
      Alert.alert('Traduction manquante', 'Veuillez d\'abord entrer la traduction en français');
      return;
    }

    setIsGenerating(true);
    try {
      const generatedSentences = await generateExampleSentences(portuguese, french, 4);
      // Replace all examples with the generated ones
      setExamples(generatedSentences);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la génération des exemples');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!portuguese.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le mot en portugais');
      return;
    }
    if (!french.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer la traduction en français');
      return;
    }

    try {
      await addWord(portuguese, french, examples);
      router.back();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'enregistrement du mot');
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.label}>Mot en portugais</Text>
          <TextInput
            style={styles.input}
            value={portuguese}
            onChangeText={setPortuguese}
            placeholder="ex: obrigado"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Traduction en français</Text>
          <TextInput
            style={styles.input}
            value={french}
            onChangeText={setFrench}
            placeholder="ex: merci"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <View style={styles.examplesHeader}>
            <Text style={styles.label}>Phrases d'exemple (portugais)</Text>
            <TouchableOpacity style={styles.addExampleButton} onPress={addExampleField}>
              <Ionicons name="add-circle-outline" size={20} color="#86af50" />
              <Text style={styles.addButton}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateExample}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.generateButtonText}>Générer avec l'IA</Text>
              </>
            )}
          </TouchableOpacity>

          {examples.map((example, index) => (
            <View key={index} style={styles.exampleRow}>
              <TextInput
                style={[styles.input, styles.exampleInput]}
                value={example}
                onChangeText={value => updateExample(index, value)}
                placeholder={`Exemple ${index + 1}`}
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeExample(index)}
              >
                <Ionicons name="close-circle" size={24} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#1e3d60" style={styles.buttonIcon} />
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
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
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3d60',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  examplesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButton: {
    color: '#86af50',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#e57d3b',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  buttonIcon: {
    marginRight: 6,
  },
  generateButtonDisabled: {
    backgroundColor: '#f0b897',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exampleInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  removeButton: {
    padding: 14,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#1e3d60',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#86af50',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
