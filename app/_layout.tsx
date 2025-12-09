import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VocabularyProvider } from '../contexts/VocabularyContext';

export default function RootLayout() {
  return (
    <VocabularyProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="word/add"
          options={{
            headerShown: true,
            title: 'Ajouter un mot',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="word/[id]"
          options={{
            headerShown: true,
            title: 'Editer un mot',
            presentation: 'modal',
          }}
        />
      </Stack>
    </VocabularyProvider>
  );
}
