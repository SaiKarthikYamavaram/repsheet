export const colors = {
  ink: '#07070b',
  screen: '#0c0c12',
  glass: 'rgba(255,255,255,0.065)',
  glass2: 'rgba(255,255,255,0.11)',
  line: 'rgba(255,255,255,0.11)',
  text: '#f6f5f8',
  muted: '#a3a1b0',
  amber: '#ffb020',
  coral: '#ff5c35',
  rose: '#ff2d78',
  onHeat: '#190803',
  sheet: '#1c1b24',
  ok: '#6fe39b',
  hintText: '#ffe0a6',
  link: '#ff9a7c',
};

export const heat = [colors.amber, colors.coral, colors.rose] as const;
export const heatStart = { x: 0, y: 0.3 };
export const heatEnd = { x: 1, y: 0.7 };

export const fonts = {
  display: 'ArchivoExpanded-ExtraBoldItalic',
  black: 'ArchivoExpanded-BlackItalic',
  number: 'ArchivoExpanded-ExtraBold',
  body: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  semibold: 'DMSans-SemiBold',
  bold: 'DMSans-Bold',
};

export const fontFiles = {
  [fonts.display]: require('../assets/fonts/ArchivoExpanded-ExtraBoldItalic.ttf'),
  [fonts.black]: require('../assets/fonts/ArchivoExpanded-BlackItalic.ttf'),
  [fonts.number]: require('../assets/fonts/ArchivoExpanded-ExtraBold.ttf'),
  [fonts.body]: require('../assets/fonts/DMSans-Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/DMSans-Medium.ttf'),
  [fonts.semibold]: require('../assets/fonts/DMSans-SemiBold.ttf'),
  [fonts.bold]: require('../assets/fonts/DMSans-Bold.ttf'),
};
