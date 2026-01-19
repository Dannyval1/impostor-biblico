import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import AppNavigator from './src/navigation/AppNavigator';
import { GameProvider } from './src/context/GameContext';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

async function loadResourcesAsync() {
  // Preload avatar images (1-20) - must be explicit for Metro bundler
  const avatarImages = [
    require('./assets/avatar_1.png'),
    require('./assets/avatar_2.png'),
    require('./assets/avatar_3.png'),
    require('./assets/avatar_4.png'),
    require('./assets/avatar_5.png'),
    require('./assets/avatar_6.png'),
    require('./assets/avatar_7.png'),
    require('./assets/avatar_8.png'),
    require('./assets/avatar_9.png'),
    require('./assets/avatar_10.png'),
    require('./assets/avatar_11.png'),
    require('./assets/avatar_12.png'),
    require('./assets/avatar_13.png'),
    require('./assets/avatar_14.png'),
    require('./assets/avatar_15.png'),
    require('./assets/avatar_16.png'),
    require('./assets/avatar_17.png'),
    require('./assets/avatar_18.png'),
    require('./assets/avatar_19.png'),
    require('./assets/avatar_20.png'),
  ];

  // Preload category images
  const categoryImages = [
    require('./assets/cat_personajes_biblicos.png'),
    require('./assets/cat_libros_biblicos.png'),
    require('./assets/cat_objetos_biblicos.png'),
    require('./assets/cat_oficios_biblicos.png'),
    require('./assets/cat_lugares_biblicos.png'),
    require('./assets/cat_conceptos_teologicos.png'),
    require('./assets/impostor_home_x.webp'),
    require('./assets/logo_es.png'),
    require('./assets/logo_en.png'),
  ];

  await Asset.loadAsync([...avatarImages, ...categoryImages]);
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
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
      <GameProvider>
        <AppNavigator />
      </GameProvider>
    </SafeAreaProvider>
  );
}