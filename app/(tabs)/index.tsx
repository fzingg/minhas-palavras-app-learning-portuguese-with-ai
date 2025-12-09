import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVocabulary } from '../../contexts/VocabularyContext';
import WordCard from '../../components/WordCard';

type SortOption = 'newest' | 'oldest' | 'alphabetical';

export default function WordListScreen() {
  const router = useRouter();
  const { state } = useVocabulary();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const sortOptions: { key: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'newest', label: 'Récent', icon: 'arrow-down' },
    { key: 'oldest', label: 'Ancien', icon: 'arrow-up' },
    { key: 'alphabetical', label: 'A-Z', icon: 'text' },
  ];

  const currentSortOption = sortOptions.find(opt => opt.key === sortBy)!;

  const cycleSortOption = () => {
    const currentIndex = sortOptions.findIndex(opt => opt.key === sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex].key);
  };

  const filteredAndSortedWords = state.words
    .filter(
      word =>
        word.portuguese.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.french.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'alphabetical':
          return a.portuguese.localeCompare(b.portuguese);
        default:
          return 0;
      }
    });

  if (state.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#86af50" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.sortButton} onPress={cycleSortOption}>
            <Ionicons name={currentSortOption.icon} size={18} color="#1e3d60" />
            <Text style={styles.sortButtonText}>{currentSortOption.label}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {state.words.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun mot pour l'instant !</Text>
          <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter votre premier mot</Text>
        </View>
      ) : filteredAndSortedWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun résultat</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedWords}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WordCard
              word={item}
              onPress={() => router.push(`/word/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/word/add')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3d60',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e3d60',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#86af50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
