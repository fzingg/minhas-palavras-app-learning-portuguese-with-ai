import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Word } from '../types';

interface WordCardProps {
  word: Word;
  onPress: () => void;
}

export default function WordCard({ word, onPress }: WordCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={styles.portuguese}>{word.portuguese}</Text>
        <Text style={styles.french}>{word.french}</Text>
        {word.examples.length > 0 && (
          <Text style={styles.exampleCount}>
            {word.examples.length} exemple{word.examples.length > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  portuguese: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3d60',
    marginBottom: 4,
  },
  french: {
    fontSize: 16,
    color: '#86af50',
  },
  exampleCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
});
