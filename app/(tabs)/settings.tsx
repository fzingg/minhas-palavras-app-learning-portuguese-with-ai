import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVocabulary } from '../../contexts/VocabularyContext';
import { exportToJson, importFromJson } from '../../utils/backup';
import { seedDatabase } from '../../utils/seedData';

export default function SettingsScreen() {
  const { state, importWords, refreshWords } = useVocabulary();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleExport = async () => {
    if (state.words.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a aucun mot à exporter.');
      return;
    }

    setIsExporting(true);
    try {
      await exportToJson(state.words);
    } catch (error: any) {
      if (error.message !== 'Import cancelled') {
        Alert.alert('Échec de l\'export', error.message || 'Échec de l\'export des données');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Importer des données',
      'Cela remplacera tous vos mots actuels par les données importées. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          style: 'destructive',
          onPress: async () => {
            setIsImporting(true);
            try {
              const words = await importFromJson();
              await importWords(words);
              Alert.alert('Succès', `${words.length} mots importés avec succès !`);
            } catch (error: any) {
              if (error.message !== 'Import cancelled') {
                Alert.alert('Échec de l\'import', error.message || 'Échec de l\'import des données');
              }
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleSeed = async () => {
    Alert.alert(
      'Charger les données d\'exemple',
      'Cela ajoutera 285+ mots de vocabulaire portugais-français à votre base de données. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Charger',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const count = await seedDatabase();
              await refreshWords();
              Alert.alert('Succès', `${count} mots de vocabulaire chargés !`);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Échec du chargement des données d\'exemple');
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (state.words.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a aucun mot à supprimer.');
      return;
    }

    Alert.alert(
      'Supprimer toutes les données',
      `Êtes-vous sûr de vouloir supprimer tous les ${state.words.length} mots ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await importWords([]);
              Alert.alert('Succès', 'Tous les mots ont été supprimés.');
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la suppression des données');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestion des données</Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{state.words.length}</Text>
          <Text style={styles.statsLabel}>Total de mots</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.exportButton]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Exporter en JSON</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.importButton]}
          onPress={handleImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <ActivityIndicator color="#1e3d60" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color="#1e3d60" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, styles.importButtonText]}>
                Importer depuis JSON
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.seedButton]}
          onPress={handleSeed}
          disabled={isSeeding}
        >
          {isSeeding ? (
            <ActivityIndicator color="#86af50" />
          ) : (
            <>
              <Ionicons name="library-outline" size={20} color="#86af50" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, styles.seedButtonText]}>
                Charger les données d'exemple (285+ mots)
              </Text>
            </>
          )}
        </TouchableOpacity>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zone de danger</Text>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearAll}
        >
          <Ionicons name="trash-outline" size={20} color="#E74C3C" style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.dangerButtonText]}>
            Supprimer toutes les données
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Vocab PT-FR</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3d60',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: '#1e3d60',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#86af50',
  },
  statsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportButton: {
    backgroundColor: '#e57d3b',
  },
  importButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1e3d60',
  },
  seedButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#86af50',
  },
  seedButtonText: {
    color: '#86af50',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  importButtonText: {
    color: '#1e3d60',
  },
  dangerButtonText: {
    color: '#E74C3C',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3d60',
  },
  versionText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
