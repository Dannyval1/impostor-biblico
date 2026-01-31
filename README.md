<div align="center">

# 🕵️ Impostor Bíblico

### A Biblical Party Game for Churches, Youth Groups & Families

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_53-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)]()

[![App Store](https://img.shields.io/badge/App_Store-Available-0D96F6?style=for-the-badge&logo=app-store&logoColor=white)](https://apps.apple.com/app/id6758225650)
[![Google Play](https://img.shields.io/badge/Google_Play-Coming_Soon-34A853?style=for-the-badge&logo=google-play&logoColor=white)]()

[English](#english) • [Español](#español)

<img src="./assets/icon.png" alt="Impostor Bíblico Logo" width="150"/>

</div>

---

<a name="english"></a>
## 🇺🇸 English

### 📖 About

**Impostor Bíblico** is a social deduction party game inspired by popular games like "Among Us" and "Werewolf", but with a biblical twist! Perfect for church gatherings, youth groups, family game nights, and Christian community events.

Players receive a secret biblical word, except for the impostor(s) who must blend in without knowing the word. Through discussion and deduction, players must identify who the impostor is before it's too late!

### 📱 Screenshots

<div align="center">
<table>
  <tr>
    <td align="center"><img src="./screenshots/home.png" width="200"/><br/><b>Home</b></td>
    <td align="center"><img src="./screenshots/setup.png" width="200"/><br/><b>Setup</b></td>
    <td align="center"><img src="./screenshots/reveal.png" width="200"/><br/><b>Secret Word</b></td>
    <td align="center"><img src="./screenshots/voting.png" width="200"/><br/><b>Voting</b></td>
  </tr>
</table>
</div>

### ✨ Features

- 🎮 **Local Multiplayer** - Play with 3-20 players on a single device
- 📚 **450+ Biblical Words** - Across 6 categories (Characters, Books, Objects, Jobs, Places, Theological Concepts)
- 🌍 **Bilingual** - Full support for English and Spanish
- 🎨 **Custom Categories** - Create your own word lists
- ⏱️ **Configurable Timer** - Set discussion time from 1-10 minutes or unlimited
- 🎵 **Sound Effects & Music** - Immersive audio experience
- 👥 **Multiple Impostors** - Support for 1+ impostors for larger groups
- 💎 **Premium Features** - Additional categories and unlimited custom words

### 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile development |
| **Expo SDK 53** | Development framework & tooling |
| **TypeScript** | Type-safe JavaScript |
| **React Navigation** | Screen navigation |
| **Context API** | Global state management |
| **AsyncStorage** | Local data persistence |
| **RevenueCat** | In-app purchases |
| **Google AdMob** | Monetization |
| **Expo Audio** | Sound effects & music |
| **EAS Build** | Cloud builds for Android/iOS |

### 📁 Project Structure

```
impostor-biblico/
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context providers
│   │   ├── GameContext.tsx
│   │   └── PurchaseContext.tsx
│   ├── data/              # Word databases (JSON)
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Translations (ES/EN)
│   ├── navigation/        # React Navigation setup
│   ├── screens/           # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   ├── RevealScreen.tsx
│   │   ├── VotingScreen.tsx
│   │   └── PaywallScreen.tsx
│   └── utils/             # Helper functions
├── assets/                # Images, fonts, sounds
├── screenshots/           # App screenshots
└── app.json               # Expo configuration
```

### 🚀 Getting Started

#### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

#### Installation

```bash
# Clone the repository
git clone https://github.com/Dannyval1/impostor-biblico.git

# Navigate to project
cd impostor-biblico

# Install dependencies
npm install

# Start development server
npx expo start
```

#### Building for Production

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 🎯 How to Play

1. **Setup** - Add players (3-20), choose categories, set the number of impostors and discussion time
2. **Reveal** - Pass the phone to each player to see their secret word (impostors don't see the word!)
3. **Discussion** - Each player gives a clue about the word. Impostors must bluff!
4. **Voting** - Vote to eliminate who you think is the impostor
5. **Win Condition** - Civilians win by finding all impostors. Impostors win by not getting caught!

### 🗺️ Roadmap

- [x] Core gameplay mechanics
- [x] 6 Biblical categories (450+ words)
- [x] Custom categories
- [x] Bilingual support (ES/EN)
- [x] Premium version with IAP
- [x] Ad integration
- [ ] Online multiplayer mode
- [ ] More languages (Portuguese, French)
- [ ] Achievement system
- [ ] Daily challenges

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<a name="español"></a>
## 🇪🇸 Español

### 📖 Acerca de

**Impostor Bíblico** es un juego de deducción social inspirado en juegos populares como "Among Us" y "Hombre Lobo", ¡pero con un toque bíblico! Perfecto para reuniones de iglesia, grupos de jóvenes, noches de juegos en familia y eventos de la comunidad cristiana.

Los jugadores reciben una palabra bíblica secreta, excepto el/los impostor(es) que deben pasar desapercibidos sin conocer la palabra. ¡A través de la discusión y deducción, los jugadores deben identificar quién es el impostor antes de que sea demasiado tarde!

### 📱 Capturas de Pantalla

<div align="center">
<table>
  <tr>
    <td align="center"><img src="./screenshots/home.png" width="200"/><br/><b>Inicio</b></td>
    <td align="center"><img src="./screenshots/setup.png" width="200"/><br/><b>Configuración</b></td>
    <td align="center"><img src="./screenshots/reveal.png" width="200"/><br/><b>Palabra Secreta</b></td>
    <td align="center"><img src="./screenshots/voting.png" width="200"/><br/><b>Votación</b></td>
  </tr>
</table>
</div>

### ✨ Características

- 🎮 **Multijugador Local** - Juega con 3-20 jugadores en un solo dispositivo
- 📚 **450+ Palabras Bíblicas** - En 6 categorías (Personajes, Libros, Objetos, Oficios, Lugares, Conceptos Teológicos)
- 🌍 **Bilingüe** - Soporte completo para Español e Inglés
- 🎨 **Categorías Personalizadas** - Crea tus propias listas de palabras
- ⏱️ **Temporizador Configurable** - Tiempo de discusión de 1-10 minutos o ilimitado
- 🎵 **Efectos de Sonido y Música** - Experiencia de audio inmersiva
- 👥 **Múltiples Impostores** - Soporte para 1+ impostores en grupos grandes
- 💎 **Funciones Premium** - Categorías adicionales y palabras personalizadas ilimitadas

### 🛠️ Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| **React Native** | Desarrollo móvil multiplataforma |
| **Expo SDK 53** | Framework de desarrollo y herramientas |
| **TypeScript** | JavaScript con tipado seguro |
| **React Navigation** | Navegación entre pantallas |
| **Context API** | Gestión de estado global |
| **AsyncStorage** | Persistencia de datos local |
| **RevenueCat** | Compras dentro de la app |
| **Google AdMob** | Monetización |
| **Expo Audio** | Efectos de sonido y música |
| **EAS Build** | Compilación en la nube para Android/iOS |

### 📁 Estructura del Proyecto

```
impostor-biblico/
├── src/
│   ├── components/        # Componentes UI reutilizables
│   ├── context/           # Proveedores de Context
│   │   ├── GameContext.tsx
│   │   └── PurchaseContext.tsx
│   ├── data/              # Base de datos de palabras (JSON)
│   ├── hooks/             # Hooks personalizados
│   ├── i18n/              # Traducciones (ES/EN)
│   ├── navigation/        # Configuración de navegación
│   ├── screens/           # Pantallas de la app
│   │   ├── HomeScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   ├── RevealScreen.tsx
│   │   ├── VotingScreen.tsx
│   │   └── PaywallScreen.tsx
│   └── utils/             # Funciones auxiliares
├── assets/                # Imágenes, fuentes, sonidos
├── screenshots/           # Capturas de pantalla
└── app.json               # Configuración de Expo
```

### 🚀 Comenzando

#### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

#### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Dannyval1/impostor-biblico.git

# Navegar al proyecto
cd impostor-biblico

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npx expo start
```

#### Compilar para Producción

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 🎯 Cómo Jugar

1. **Configuración** - Añade jugadores (3-20), elige categorías, establece el número de impostores y tiempo de discusión
2. **Revelar** - Pasa el teléfono a cada jugador para ver su palabra secreta (¡los impostores no ven la palabra!)
3. **Discusión** - Cada jugador da una pista sobre la palabra. ¡Los impostores deben mentir!
4. **Votación** - Vota para eliminar a quien creas que es el impostor
5. **Condición de Victoria** - Los civiles ganan encontrando a todos los impostores. ¡Los impostores ganan si no son descubiertos!

### 🗺️ Hoja de Ruta

- [x] Mecánicas principales del juego
- [x] 6 Categorías bíblicas (450+ palabras)
- [x] Categorías personalizadas
- [x] Soporte bilingüe (ES/EN)
- [x] Versión premium con IAP
- [x] Integración de anuncios
- [ ] Modo multijugador en línea
- [ ] Más idiomas (Portugués, Francés)
- [ ] Sistema de logros
- [ ] Desafíos diarios

### 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

### 👨‍💻 Developer

Made with ❤️ by **Danny Valencia**

[![GitHub](https://img.shields.io/badge/GitHub-Dannyval1-181717?style=for-the-badge&logo=github)](https://github.com/Dannyval1)

---

⭐ **If you like this project, please give it a star!** ⭐

</div>
