import villa from './assets/model-villa.webp';
import koi from './assets/model-koi.webp';
import desertCar from './assets/model-desert-car.webp';
import tea from './assets/model-tea.webp';
import portrait from './assets/model-portrait.webp';
import alpine from './assets/model-alpine.webp';
import jellyfish from './assets/model-jellyfish.webp';
import train from './assets/model-train.webp';
import dahlia from './assets/model-dahlia.webp';
import sailboat from './assets/model-sailboat.webp';
import headphones from './assets/model-headphones.webp';
import rainyStreet from './assets/model-rainy-street.webp';
import type { ModelConfig } from '../../constants/model-config';
import { showcaseSelectionKey } from './showcase-models';

// Independent decorative images, not samples from the models they accompany.
const covers = [
  villa,
  koi,
  desertCar,
  tea,
  portrait,
  alpine,
  jellyfish,
  train,
  dahlia,
  sailboat,
  headphones,
  rainyStreet,
];

// Allocate across BOTH rows before rendering. Stable keys keep a model's cover
// unchanged when the list is reordered, and probing resolves hash collisions.
export function assignModelCoverArtwork(models: ModelConfig[]) {
  const keys = [...new Set(models.map(showcaseSelectionKey))].sort();
  const assigned = new Map<string, string>();
  const available = new Set(covers);
  for (const key of keys) {
    const preferred =
      [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      covers.length;
    for (let offset = 0; offset < covers.length; offset++) {
      const cover = covers[(preferred + offset) % covers.length];
      if (!available.delete(cover)) continue;
      assigned.set(key, cover);
      break;
    }
  }
  return assigned;
}
