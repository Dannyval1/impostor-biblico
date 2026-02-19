import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as NavigationBar from 'expo-navigation-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { GameProvider } from './src/context/GameContext';
import { PurchaseProvider } from './src/context/PurchaseContext';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

async function loadResourcesAsync() {
  // Preload avatar images (1-20) - must be explicit for Metro bundler
  const avatarImages = [
    require('./assets/avatars/avatar_1.png'),
    require('./assets/avatars/avatar_2.png'),
    require('./assets/avatars/avatar_3.png'),
    require('./assets/avatars/avatar_4.png'),
    require('./assets/avatars/avatar_5.png'),
    require('./assets/avatars/avatar_6.png'),
    require('./assets/avatars/avatar_7.png'),
    require('./assets/avatars/avatar_8.png'),
    require('./assets/avatars/avatar_9.png'),
    require('./assets/avatars/avatar_10.png'),
    require('./assets/avatars/avatar_11.png'),
    require('./assets/avatars/avatar_12.png'),
    require('./assets/avatars/avatar_13.png'),
    require('./assets/avatars/avatar_14.png'),
    require('./assets/avatars/avatar_15.png'),
    require('./assets/avatars/avatar_16.png'),
    require('./assets/avatars/avatar_17.png'),
    require('./assets/avatars/avatar_18.png'),
    require('./assets/avatars/avatar_19.png'),
    require('./assets/avatars/avatar_20.png'),
  ];

  // Preload category images
  const categoryImages = [
    require('./assets/biblical_categories/cat_personajes_biblicos.png'),
    require('./assets/biblical_categories/cat_libros_biblicos.png'),
    require('./assets/biblical_categories/cat_objetos_biblicos.png'),
    require('./assets/biblical_categories/cat_oficios_biblicos.png'),
    require('./assets/biblical_categories/cat_lugares_biblicos.png'),
    require('./assets/biblical_categories/cat_conceptos_teologicos.png'),
    require('./assets/impostor_home_x.webp'),
    require('./assets/logo_es.png'),
    require('./assets/logo_en.png'),
    require('./assets/general_categories/cat_gen_animales.png'),
    require('./assets/general_categories/cat_gen_deportes.png'),
    require('./assets/general_categories/cat_gen_comida.png'),
    require('./assets/general_categories/cat_gen_profesiones.png'),
    require('./assets/general_categories/cat_gen_herramientas.png'),
    require('./assets/general_categories/cat_gen_acciones.png'),
    require('./assets/general_categories/cat_gen_objetos.png'),
  ];

  await Asset.loadAsync([...avatarImages, ...categoryImages]);
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("overlay-swipe");
        }
        await loadResourcesAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PurchaseProvider>
        <GameProvider>
          <AppNavigator />
        </GameProvider>
      </PurchaseProvider>
    </SafeAreaProvider>
  );
}