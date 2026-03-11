import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────
// 🎨 CONFIGURATION DES COULEURS NÉON
// ─────────────────────────────────────────────────────────────
const DEFAULT_NEON_THEME = {
  tube: '#FFFFFF',
  glow: '#FFFFFF',
  title: '#FFFFFF',
  titleShadow: 'rgba(255, 255, 255, 0.85)',
  background: '#000000',
};

const NEON_EVENTS = [
  {
    name: 'Rouge Feu',
    tube: '#FF3B30',
    glow: '#FF453A',
    title: '#FFE4E1',
    titleShadow: 'rgba(255, 69, 58, 0.92)',
    background: '#0a0000',
  },
  {
    name: 'Bleu Électrique',
    tube: '#00E5FF',
    glow: '#66F3FF',
    title: '#DFFBFF',
    titleShadow: 'rgba(102, 243, 255, 0.9)',
    background: '#000a0a',
  },
  {
    name: 'Or Futuriste',
    tube: '#FFD166',
    glow: '#FFE29A',
    title: '#FFF7E0',
    titleShadow: 'rgba(255, 209, 102, 0.9)',
    background: '#0a0a00',
  },
  {
    name: 'Vert Radioactif',
    tube: '#C5FF3D',
    glow: '#DDFF80',
    title: '#F4FFDC',
    titleShadow: 'rgba(197, 255, 61, 0.9)',
    background: '#000a00',
  },
  {
    name: 'Violet Cyber',
    tube: '#BF5AF2',
    glow: '#D494FF',
    title: '#F5E6FF',
    titleShadow: 'rgba(191, 90, 242, 0.9)',
    background: '#0a000a',
  },
];

// ─────────────────────────────────────────────────────────────
// ⚙️ CONFIGURATION DES ANIMATIONS
// ─────────────────────────────────────────────────────────────
const ANIMATION_SPEED = {
  flicker: 1,
  dropChance: 0.3,
  colorChangeMin: 5000,
  colorChangeMax: 14000,
};

// ─────────────────────────────────────────────────────────────
// 🏠 COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
type HomeScreenProps = {
  onNewInterventionPress?: () => void;
  onViewInterventionsPress?: () => void;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onNewInterventionPress, onViewInterventionsPress }) => {
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const dropAnim = useRef(new Animated.Value(0)).current;

  
  const [neonTheme, setNeonTheme] = useState(DEFAULT_NEON_THEME);
  const [eventName, setEventName] = useState('');
  
  const dropTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // ─── FLICKER ANIMATION ───
  useEffect(() => {
    const createFlickerAnimation = () => {
      const speed = ANIMATION_SPEED.flicker;
      
      return Animated.sequence([
        Animated.timing(flickerAnim, { toValue: 1, duration: 40 * speed, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 0.72, duration: 24 * speed, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 1, duration: 34 * speed, useNativeDriver: true }),
        Animated.delay(900 * speed),
        Animated.timing(flickerAnim, { toValue: 0.18, duration: 18 * speed, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 0.84, duration: 24 * speed, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 0.42, duration: 16 * speed, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 1, duration: 42 * speed, useNativeDriver: true }),
        Animated.delay(1400 * speed),
      ]);
    };

    const loopAnimation = Animated.loop(createFlickerAnimation());
    loopAnimation.start();

    return () => { loopAnimation.stop(); };
  }, [flickerAnim]);

  // ─── DROP ANIMATION ───
  useEffect(() => {
    let active = true;

    const runSingleDrop = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(dropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(dropAnim, { toValue: 0.93, duration: 90, useNativeDriver: true }),
        Animated.timing(dropAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
      const nextDropDelay = 3000 + Math.floor(Math.random() * 5000);
      dropTimeoutRef.current = setTimeout(runSingleDrop, nextDropDelay);
    };

    const initialDelay = 2400 + Math.floor(Math.random() * 2000);
    dropTimeoutRef.current = setTimeout(runSingleDrop, initialDelay);

    return () => {
      active = false;
      if (dropTimeoutRef.current) clearTimeout(dropTimeoutRef.current);
      dropAnim.stopAnimation();
    };
  }, [dropAnim]);

  // ─── COLOR CHANGE ANIMATION ───
  useEffect(() => {
    let active = true;

    const scheduleColorEvent = () => {
      if (!active) return;
      const nextEventDelay = ANIMATION_SPEED.colorChangeMin + Math.floor(Math.random() * ANIMATION_SPEED.colorChangeMax);
      
      colorEventTimeoutRef.current = setTimeout(() => {
        if (!active) return;
        const shouldTriggerEvent = Math.random() < 0.7;
        if (!shouldTriggerEvent) { scheduleColorEvent(); return; }

        const randomEvent = NEON_EVENTS[Math.floor(Math.random() * NEON_EVENTS.length)];
        setNeonTheme(randomEvent);
        setEventName(randomEvent.name);

        const holdDuration = 3000 + Math.floor(Math.random() * 5000);
        colorResetTimeoutRef.current = setTimeout(() => {
          if (!active) return;
          setNeonTheme(DEFAULT_NEON_THEME);
          setEventName('');
          scheduleColorEvent();
        }, holdDuration);
      }, nextEventDelay);
    };

    scheduleColorEvent();

    return () => {
      active = false;
      if (colorEventTimeoutRef.current) clearTimeout(colorEventTimeoutRef.current);
      if (colorResetTimeoutRef.current) clearTimeout(colorResetTimeoutRef.current);
    };
  }, []);


  const handleNewInterventionPress = () => {
    Vibration.vibrate(10);
    onNewInterventionPress?.();
  };

  const handleViewInterventionsPress = () => {
    Vibration.vibrate(10);
    onViewInterventionsPress?.();
  };

  const glowOpacity = flickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.7] });
  const titleOpacity = flickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const dropTranslateY = dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  const dropRotate = dropAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '4deg'] });

  // ─────────────────────────────────────────────────────────────
  // ✅ RENDU CORRIGÉ (1 seule racine JSX)
  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: neonTheme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={neonTheme.background} />

      {/* SECTION DU HAUT */}
      <View style={styles.topSection}>
        <View style={styles.neonContainer}>
          
          {/* NÉON */}
          <Animated.View
            style={[
              styles.neonRig,
              { transform: [{ translateY: dropTranslateY }, { rotate: dropRotate }] },
            ]}
          >
            <Animated.View
              style={[styles.neonGlow, { opacity: glowOpacity, backgroundColor: neonTheme.glow }]}
            />
            <Animated.View
              style={[
                styles.neonTube,
                {
                  opacity: flickerAnim,
                  backgroundColor: neonTheme.tube,
                  borderColor: neonTheme.tube,
                  shadowColor: neonTheme.tube,
                },
              ]}
            >
              <View style={[styles.neonCore, { backgroundColor: neonTheme.tube, shadowColor: neonTheme.tube }]} />
            </Animated.View>
          </Animated.View>

          {/* TITRE */}
          <Animated.Text
            style={[
              styles.title,
              { opacity: titleOpacity, color: neonTheme.title, textShadowColor: neonTheme.titleShadow },
            ]}
          >
            MaintJojo
          </Animated.Text>

          {/* INDICATEUR */}
          {eventName && <Text style={styles.eventIndicator}>⚡ {eventName}</Text>}

          {/* BOUTON */}
        
            <Pressable
              onPress={handleNewInterventionPress}
              accessibilityLabel="Créer une nouvelle intervention"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.interventionButton,
                { shadowColor: neonTheme.tube },
                pressed && styles.interventionButtonPressed,
              ]}
            >
              <MaterialIcons name="build" size={20} color="#FFFFFF" />
              <Text style={styles.interventionButtonText}>Nouvelle intervention</Text>
            </Pressable>

            <Pressable
              onPress={handleViewInterventionsPress}
              accessibilityLabel="Voir les interventions enregistrées"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.viewButton,
                pressed && styles.viewButtonPressed,
              ]}
            >
              <MaterialIcons name="list-alt" size={20} color="#DCE4F2" />
              <Text style={styles.viewButtonText}>Voir les interventions</Text>
            </Pressable>


        </View>
      </View>

      {/* SECTION DU BAS (maintenant à l'intérieur du SafeAreaView) */}
      <View style={styles.bottomSection} />
    </SafeAreaView> // ✅ FERMETURE UNIQUE ICI
  );
};

// ─────────────────────────────────────────────────────────────
// 🎨 STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { paddingTop: 80, alignItems: 'center', justifyContent: 'flex-start' },
  neonContainer: { alignItems: 'center', justifyContent: 'center' },
  neonRig: { width: 240, height: 32, alignItems: 'center', justifyContent: 'center' },
  neonGlow: { position: 'absolute', top: 2, width: 240, height: 28, borderRadius: 14 },
  neonTube: {
    width: 200, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20, shadowOpacity: 1, elevation: 20,
    borderWidth: 1, overflow: 'hidden',
  },
  neonCore: { flex: 1, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, shadowOpacity: 1 },
  title: {
    marginTop: 24, fontSize: 36, fontWeight: '800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15, letterSpacing: 3,
  },
  eventIndicator: { marginTop: 8, fontSize: 12, color: '#888888', letterSpacing: 1 },
  interventionButton: {
    marginTop: 32, minWidth: 260, paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: 14, backgroundColor: '#0D6EFD',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  interventionButtonPressed: { backgroundColor: '#0A58CA', transform: [{ scale: 0.96 }] },
  interventionButtonText: { marginLeft: 10, color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  viewButton: {
    marginTop: 14, minWidth: 260, paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: 14, backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#2A364D',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  viewButtonPressed: { backgroundColor: '#182236', transform: [{ scale: 0.96 }] },
  viewButtonText: { marginLeft: 10, color: '#DCE4F2', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  bottomSection: { flex: 1 },
});

export default HomeScreen;