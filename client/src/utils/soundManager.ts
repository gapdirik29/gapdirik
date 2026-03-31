import { Haptics, ImpactStyle } from '@capacitor/haptics';

class SoundManager {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;

  constructor() {
    // High-quality UI sounds specifically chosen for "Premium" Okey experience
    const base = 'https://assets.mixkit.co/active_storage/sfx';
    this.sounds = {
      // Tok bir ses (Stone on wood)
      discard: new Audio(`${base}/2572/2572-preview.mp3`), 
      // Hafif sürükleme (Slide)
      draw: new Audio(`${base}/2571/2571-preview.mp3`),
      // Zafer sesi (Win)
      win: new Audio(`${base}/1435/1435-preview.mp3`),
      // Mesaj bildirimi (Bubble pop)
      chat: new Audio(`${base}/2358/2358-preview.mp3`),
      // Hediye sesi (Magic)
      gift: new Audio(`${base}/2019/2019-preview.mp3`),
      // Sıra geldi dıngıltısı (Notification)
      turn: new Audio(`${base}/2568/2568-preview.mp3`),
      // Ceza veya hata sesi (Buzz)
      error: new Audio(`${base}/2580/2580-preview.mp3`),
      // Rakip Okey attığında çalacak özel dramatik ses
      okey: new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3'),
    };

    // Preload
    Object.values(this.sounds).forEach(s => {
      s.load();
      s.volume = 0.5;
    });
  }

  async play(name: keyof typeof this.sounds) {
    if (!this.enabled || !this.sounds[name]) return;
    
    const sound = this.sounds[name];
    sound.currentTime = 0;
    try {
      await sound.play();
    } catch (e) {
      console.warn('Sound play failed:', e);
    }

    // NATIVE PLATFORM OPTIMIZATION (Haptics)
    try {
      if (name === 'error' || name === 'okey') {
        // Red alert style
        await Haptics.vibrate();
      } else if (name === 'turn') {
        // Signal player turn
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (name === 'discard' || name === 'draw') {
        // Subtle feedback for actions
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch (err) {
      // Fallback for non-native platforms
      if ('vibrate' in navigator) {
        if (name === 'error') navigator.vibrate([100, 50, 100]);
        else if (name === 'turn') navigator.vibrate(50);
      }
    }
  }

  toggle(state?: boolean) {
    this.enabled = state !== undefined ? state : !this.enabled;
  }
}

export const soundManager = new SoundManager();
