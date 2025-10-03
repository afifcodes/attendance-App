import { Animated, Easing } from 'react-native';

export class AnimationService {
  static createSlideInAnimation(direction: 'left' | 'right' | 'up' | 'down' = 'right') {
    const slideValue = new Animated.Value(
      direction === 'right' ? 300 : 
      direction === 'left' ? -300 : 
      direction === 'up' ? -300 : 300
    );

    const slideIn = () => {
      Animated.timing(slideValue, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const slideOut = () => {
      Animated.timing(slideValue, {
        toValue: direction === 'right' ? 300 : 
                direction === 'left' ? -300 : 
                direction === 'up' ? -300 : 300,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const getTransform = () => {
      if (direction === 'left' || direction === 'right') {
        return { translateX: slideValue };
      } else {
        return { translateY: slideValue };
      }
    };

    return {
      slideValue,
      slideIn,
      slideOut,
      getTransform,
    };
  }

  static createFadeAnimation() {
    const fadeValue = new Animated.Value(0);

    const fadeIn = () => {
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const fadeOut = () => {
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    return {
      fadeValue,
      fadeIn,
      fadeOut,
    };
  }

  static createScaleAnimation() {
    const scaleValue = new Animated.Value(0);

    const scaleIn = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    const scaleOut = () => {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const pulse = () => {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return {
      scaleValue,
      scaleIn,
      scaleOut,
      pulse,
    };
  }

  static createRippleAnimation() {
    const rippleScale = new Animated.Value(0);
    const rippleOpacity = new Animated.Value(1);

    const startRipple = () => {
      rippleScale.setValue(0);
      rippleOpacity.setValue(1);

      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    return {
      rippleScale,
      rippleOpacity,
      startRipple,
    };
  }

  static createBounceAnimation() {
    const bounceValue = new Animated.Value(0);

    const bounce = () => {
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -10,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    const continuousBounce = () => {
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: -8,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoop.start();
      return bounceLoop;
    };

    return {
      bounceValue,
      bounce,
      continuousBounce,
    };
  }

  static createProgressAnimation() {
    const progressValue = new Animated.Value(0);

    const animateTo = (toValue: number, duration: number = 1000) => {
      Animated.timing(progressValue, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Progress animations don't support native driver
      }).start();
    };

    const animateFromTo = (fromValue: number, toValue: number, duration: number = 1000) => {
      progressValue.setValue(fromValue);
      animateTo(toValue, duration);
    };

    return {
      progressValue,
      animateTo,
      animateFromTo,
    };
  }

  static createStaggerAnimation(items: any[], delay: number = 100) {
    const animations = items.map((item, index) => {
      return Animated.delay(index * delay);
    });

    return Animated.stagger(delay, animations);
  }

  static createShakeAnimation() {
    const shakeValue = new Animated.Value(0);

    const shake = () => {
      Animated.sequence([
        Animated.timing(shakeValue, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeValue, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeValue, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeValue, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    };

    return {
      shakeValue,
      shake,
    };
  }

  static createLoadingDots() {
    const dot1 = new Animated.Value(0);
    const dot2 = new Animated.Value(0);
    const dot3 = new Animated.Value(0);

    const startLoading = () => {
      const createDotAnimation = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.delay(400),
          ])
        );
      };

      Animated.parallel([
        createDotAnimation(dot1, 0),
        createDotAnimation(dot2, 200),
        createDotAnimation(dot3, 400),
      ]).start();
    };

    const stopLoading = () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };

    return {
      dot1,
      dot2,
      dot3,
      startLoading,
      stopLoading,
    };
  }
}

// Animation presets for common use cases
export const AnimationPresets = {
  pageTransition: AnimationService.createSlideInAnimation('right'),
  modalTransition: AnimationService.createScaleAnimation(),
  buttonPress: AnimationService.createRippleAnimation(),
  successFeedback: AnimationService.createBounceAnimation(),
  errorFeedback: AnimationService.createShakeAnimation(),
  loadingIndicator: AnimationService.createLoadingDots(),
};
