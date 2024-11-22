export const IMAGE_SIZES = {
  // Banner images
  BANNER: {
    HOME: {
      width: 640,
      height: 360, // 16:9 aspect ratio
    },
    DETAIL: {
      width: 1920,
      height: 1080, // 16:9 aspect ratio
    },
  },
  // Icon images
  ICON: {
    CARD: {
      width: 64,
      height: 64,
    },
    DETAIL: {
      width: 256,
      height: 256,
    },
  },
} as const;

export const ASPECT_RATIOS = {
  BANNER: '16/9',
  ICON: '1/1',
} as const;