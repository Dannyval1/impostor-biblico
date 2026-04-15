import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

const INTRO_MS = 3000;
const SLIDE_MS = 500;

/**
 * Al pasar a eliminado: pantalla de aviso ~3s y luego animación hacia arriba → modo espectador.
 */
export function useEliminationIntro(isEliminated: boolean) {
    const slideY = useRef(new Animated.Value(0)).current;
    const prevElimRef = useRef(false);
    const [introActive, setIntroActive] = useState(() => isEliminated);

    useEffect(() => {
        if (!isEliminated) {
            prevElimRef.current = false;
            setIntroActive(false);
            slideY.setValue(0);
            return;
        }

        const justEliminated = !prevElimRef.current;
        prevElimRef.current = true;

        if (!justEliminated) return;

        setIntroActive(true);
        slideY.setValue(0);

        const h = Dimensions.get('window').height;
        const tid = setTimeout(() => {
            Animated.timing(slideY, {
                toValue: -h,
                duration: SLIDE_MS,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setIntroActive(false);
            });
        }, INTRO_MS);

        return () => clearTimeout(tid);
    }, [isEliminated]);

    return { introActive, slideY };
}
