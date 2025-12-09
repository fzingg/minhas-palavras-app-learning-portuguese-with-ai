import { Tabs } from 'expo-router';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function HeaderTitle({ title }: { title: string }) {
  return (
    <View style={styles.headerTitle}>
      <Image source={require('../../assets/icon.png')} style={styles.headerIcon} />
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#86af50',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#1e3d60' },
        headerTintColor: '#fff',
        tabBarStyle: {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <HeaderTitle title="Minhas palavras" />,
          tabBarLabel: 'Mots',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          headerTitle: () => <HeaderTitle title="Apprendre" />,
          tabBarLabel: 'Apprendre',
          tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          headerTitle: () => <HeaderTitle title="Lire" />,
          tabBarLabel: 'Lire',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: () => <HeaderTitle title="Paramètres" />,
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
