/**
 * Ee-Revisor Design Tokens (Apple Liquid Glass + Premium Business + AI Dashboard)
 * This file serves as the unified design system config for colors, gradients, typography, and borders.
 */

export const DESIGN_TOKENS = {
  // Brand Typography
  fonts: {
    sans: 'Manrope, Inter, "SF Pro Display", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // Layout Spacing, Sizes & Elevations
  radius: {
    card: '24px',
    button: '18px',
    bottomSheet: '32px',
    input: '18px',
    dropdown: '20px',
  },

  // Elevations and Shadows
  shadows: {
    dark: '0 10px 40px rgba(0,0,0,0.35)',
    light: '0 12px 40px rgba(0,0,0,0.08)',
    goldGlow: '0 0 25px rgba(212,175,55,0.18)',
    hoverGlow: '0 0 20px rgba(212,175,55,0.3)',
  },

  // Blur effects
  blur: {
    glass: '22px',
    modal: '30px',
    header: '20px',
  },

  // Color Tokens
  colors: {
    // Primary gold colors
    gold: {
      primary: '#D4AF37',
      hover: '#E7C45A',
      pressed: '#B88A14',
      glow: 'rgba(212,175,55,0.25)',
    },

    // Accents
    accent: {
      success: '#2BB673',
      warning: '#F4A623',
      danger: '#D94B4B',
      info: '#D4AF37',
      purple: '#E7C768',
    },

    // Theme-specific configurations
    dark: {
      background: '#070707',
      secondaryBg: '#101010',
      surface: '#161616',
      glassSurface: 'rgba(255,255,255,0.05)',
      card: '#1A1A1A',
      border: 'rgba(255,255,255,0.08)',
      divider: 'rgba(255,255,255,0.06)',
      textPrimary: '#FFFFFF',
      textSecondary: '#BDBDBD',
      textMuted: '#888888',
      textPlaceholder: '#666666',
    },

    light: {
      background: '#F7F7F5',
      secondaryBg: '#F2F2EE',
      surface: '#FFFFFF',
      glassSurface: 'rgba(255,255,255,0.65)',
      card: '#FFFFFF',
      border: 'rgba(0,0,0,0.08)',
      divider: 'rgba(0,0,0,0.05)',
      textPrimary: '#1C1C1C',
      textSecondary: '#666666',
      textMuted: '#9A9A9A',
      textPlaceholder: '#888888',
    },
  },

  // Reusable CSS gradients (formatted for styled-components, inline style or tailwind gradients style)
  gradients: {
    darkBg: 'linear-gradient(180deg, #0B0B0B 0%, #131313 50%, #090909 100%)',
    gold: 'linear-gradient(135deg, #F4D06F 0%, #D4AF37 50%, #9F7B12 100%)',
    lightBg: 'linear-gradient(180deg, #FFFFFF 0%, #F8F8F6 100%)',
    glass: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
  },
};
