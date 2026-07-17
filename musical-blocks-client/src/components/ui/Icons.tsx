import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// 1. GearIcon - A blocky retro settings gear
export const GearIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <rect x="9" y="9" width="6" height="6" />
    <rect x="11" y="2" width="2" height="4" />
    <rect x="11" y="18" width="2" height="4" />
    <rect x="2" y="11" width="4" height="2" />
    <rect x="18" y="11" width="4" height="2" />
    <rect x="5" y="5" width="2" height="2" />
    <rect x="17" y="17" width="2" height="2" />
    <rect x="17" y="5" width="2" height="2" />
    <rect x="5" y="17" width="2" height="2" />
  </svg>
);

// 2. JoystickIcon - Classic retro joystick
export const JoystickIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Base */}
    <rect x="4" y="16" width="16" height="5" />
    {/* Stick */}
    <line x1="12" y1="16" x2="12" y2="8" />
    {/* Top Knob (Blocky Circle) */}
    <rect x="9" y="3" width="6" height="5" fill="currentColor" />
    {/* Action buttons on base */}
    <rect x="6" y="18" width="2" height="1" fill="currentColor" />
    <rect x="16" y="18" width="2" height="1" fill="currentColor" />
  </svg>
);

// UserIcon - Single player avatar (blocky)
export const UserIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Head */}
    <rect x="9" y="5" width="6" height="6" />
    {/* Shoulders */}
    <rect x="5" y="14" width="14" height="5" />
    <rect x="7" y="12" width="10" height="2" />
  </svg>
);

// FullscreenIcon - Expand to fullscreen
export const FullscreenIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M4 10V4h6" />
    <path d="M14 4h6v6" />
    <path d="M20 14v6h-6" />
    <path d="M10 20H4v-6" />
  </svg>
);

// 3. ShirtIcon - A voxel shirt silhouette
export const ShirtIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M6 3 L9 3 L10 5 L14 5 L15 3 L18 3 L22 7 L19 10 L17 9 L17 21 L7 21 L7 9 L5 10 L2 7 Z" />
  </svg>
);

// 4. VolumeUpIcon - Speaker with sound waves (voxel style)
export const VolumeUpIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Speaker body */}
    <path d="M4 9 H8 L13 4 V20 L8 15 H4 V9 Z" fill="currentColor" />
    {/* Sound waves (blocky segments) */}
    <path d="M17 8 V16" />
    <path d="M21 5 V19" />
  </svg>
);

// 5. VolumeMuteIcon - Speaker with an X/slash
export const VolumeMuteIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M4 9 H8 L13 4 V20 L8 15 H4 V9 Z" fill="currentColor" />
    {/* Retro 'X' */}
    <path d="M17 10 L21 14 M21 10 L17 14" />
  </svg>
);

// 6. HeartIcon - Red retro 8-bit heart
export const HeartIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={className}
    {...props}
  >
    {/* 8-bit geometric heart */}
    <path d="M3 5 H9 V7 H11 V9 H13 V7 H15 V5 H21 V11 H19 V13 H17 V15 H15 V17 H13 V19 H11 V17 H9 V15 H7 V13 H5 V11 H3 Z" />
  </svg>
);

// 7. SkullIcon - Cybernetic voxel skull
export const SkullIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Cranium */}
    <rect x="5" y="4" width="14" height="12" />
    {/* Jaw */}
    <rect x="8" y="16" width="8" height="4" />
    {/* Teeth vertical lines */}
    <line x1="10" y1="17" x2="10" y2="19" />
    <line x1="12" y1="16" x2="12" y2="20" />
    <line x1="14" y1="17" x2="14" y2="19" />
    {/* Eye sockets (blocky) */}
    <rect x="7" y="7" width="3" height="3" fill="currentColor" />
    <rect x="14" y="7" width="3" height="3" fill="currentColor" />
    {/* Nose cavity */}
    <rect x="11" y="11" width="2" height="2" fill="currentColor" />
  </svg>
);

// 8. EyeIcon - Cyberpunk geometric eye
export const EyeIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Outer diamond/eye shape */}
    <path d="M2 12 L12 4 L22 12 L12 20 Z" />
    {/* Iris (square) */}
    <rect x="10" y="10" width="4" height="4" fill="currentColor" />
  </svg>
);

// 9. HourglassIcon - Retro 8-bit hourglass
export const HourglassIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Top and bottom bars */}
    <line x1="5" y1="4" x2="19" y2="4" />
    <line x1="5" y1="20" x2="19" y2="20" />
    {/* Sides funneling in */}
    <path d="M5 4 L11 11 V13 L5 20" />
    <path d="M19 4 L13 11 V13 L19 20" />
    {/* Sand (top and bottom blocks) */}
    <rect x="9" y="6" width="6" height="3" fill="currentColor" />
    <rect x="9" y="15" width="6" height="3" fill="currentColor" />
  </svg>
);

// 10. CheckIcon - Solid voxel checkmark
export const CheckIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M4 12 L9 17 L20 6" />
  </svg>
);

// 11. SnowflakeIcon - Snowflake for Chill mode (strictly blocky, 8-bit)
export const SnowflakeIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Center block */}
    <rect x="11" y="11" width="2" height="2" fill="currentColor" />
    {/* Axes */}
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
    {/* Blocky cross arms */}
    <path d="M9 6 H15" />
    <path d="M9 18 H15" />
    <path d="M6 9 V15" />
    <path d="M18 9 V15" />
  </svg>
);

// 12. LightningIcon - Retro neon lightning bolt
export const LightningIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Pixel-style lightning bolt */}
    <path d="M13 2 L5 12 H12 L11 22 L19 12 H12 Z" />
  </svg>
);

// 13. StopwatchIcon - Stopwatch for Normal speed (8-bit)
export const StopwatchIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Body */}
    <rect x="5" y="7" width="14" height="14" />
    {/* Top button */}
    <rect x="10" y="3" width="4" height="4" fill="currentColor" />
    {/* Left and Right side decorations */}
    <rect x="3" y="10" width="2" height="2" />
    <rect x="19" y="10" width="2" height="2" />
    {/* Hands inside (blocky L) */}
    <path d="M12 11 V14 H15" />
  </svg>
);

// 14. GlassesIcon - Cyberpunk visor glasses
export const GlassesIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Frame */}
    <rect x="2" y="8" width="8" height="6" fill="currentColor" />
    <rect x="14" y="8" width="8" height="6" fill="currentColor" />
    {/* Bridge */}
    <rect x="10" y="10" width="4" height="2" fill="currentColor" />
    {/* Temples (sides) */}
    <line x1="2" y1="10" x2="0" y2="10" />
    <line x1="22" y1="10" x2="24" y2="10" />
  </svg>
);

// 15. UsersIcon - Group of pixel players (avatars)
export const UsersIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Player 1 (Left) */}
    <rect x="2" y="14" width="8" height="6" />
    <rect x="4" y="8" width="4" height="6" />
    
    {/* Player 2 (Right) */}
    <rect x="14" y="14" width="8" height="6" />
    <rect x="16" y="8" width="4" height="6" />

    {/* Center connector or background details */}
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

// 16. DoveIcon - Stylized pixel dove/wing (representing death/peace/life toggle)
export const DoveIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Pixel wing structure */}
    <path d="M4 12 H10 V14 H16 V12 H20 V10 H14 V8 H8 V10 H4 Z" fill="currentColor" />
    <rect x="6" y="14" width="4" height="4" />
    <rect x="12" y="6" width="4" height="2" />
  </svg>
);

// 17. HeadphonesIcon - Retro gaming headset
export const HeadphonesIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Arch */}
    <path d="M4 12 V7 H20 V12" />
    {/* Earcups */}
    <rect x="2" y="10" width="3" height="6" fill="currentColor" />
    <rect x="19" y="10" width="3" height="6" fill="currentColor" />
    {/* Mic extension */}
    <path d="M5 14 H8 V16" />
  </svg>
);

// 18. BackpackIcon - Voxel booster jetpack/backpack
export const BackpackIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Main body */}
    <rect x="6" y="5" width="12" height="14" />
    {/* Top flap */}
    <rect x="8" y="3" width="8" height="2" fill="currentColor" />
    {/* Straps/Side pockets */}
    <rect x="4" y="8" width="2" height="8" />
    <rect x="18" y="8" width="2" height="8" />
    {/* Thrusters / bottom block */}
    <rect x="8" y="19" width="3" height="2" fill="currentColor" />
    <rect x="13" y="19" width="3" height="2" fill="currentColor" />
  </svg>
);

// 19. CassetteIcon - Vintage cassette tape (8-bit style)
export const CassetteIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Outer Shell */}
    <rect x="3" y="6" width="18" height="12" />
    {/* Label */}
    <rect x="6" y="9" width="12" height="6" />
    {/* Reels */}
    <rect x="8" y="11" width="2" height="2" fill="currentColor" />
    <rect x="14" y="11" width="2" height="2" fill="currentColor" />
  </svg>
);

// 20. FloppyIcon - Retro 3.5" floppy disk
export const FloppyIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Main body with notched top-right corner */}
    <path d="M4 4 H17 L20 7 V20 H4 Z" />
    {/* Write protect / Metal slider area */}
    <rect x="8" y="4" width="6" height="5" />
    <rect x="9" y="5" width="2" height="2" fill="currentColor" />
    {/* Disk label */}
    <rect x="6" y="12" width="12" height="8" />
  </svg>
);

// 21. OrbIcon - Geometric virtual orb pet
export const OrbIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Core block */}
    <rect x="8" y="8" width="8" height="8" fill="currentColor" />
    {/* Diagonal orbit line */}
    <line x1="3" y1="21" x2="21" y2="3" strokeWidth="1" />
    {/* Satellites */}
    <rect x="4" y="18" width="2" height="2" />
    <rect x="18" y="4" width="2" height="2" />
  </svg>
);

// 22. DiamondIcon - Cyber gem/diamond skin
export const DiamondIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M12 2 L21 9 L12 22 L3 9 Z" fill="currentColor" fillOpacity="0.3" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);

// 23. SpinnerIcon - An 8-bit rotating spinner SVG
export const SpinnerIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    {...props}
    style={{ animation: 'spin 1s linear infinite' }}
  >
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    {/* 8 blocks arranged in a circle, varying opacity to look like an 8-bit loading spinner */}
    <rect x="11" y="2" width="2" height="4" fill="currentColor" opacity="1.0" />
    <rect x="17" y="5" width="3" height="3" fill="currentColor" opacity="0.875" />
    <rect x="18" y="11" width="4" height="2" fill="currentColor" opacity="0.75" />
    <rect x="17" y="16" width="3" height="3" fill="currentColor" opacity="0.625" />
    <rect x="11" y="18" width="2" height="4" fill="currentColor" opacity="0.5" />
    <rect x="4" y="16" width="3" height="3" fill="currentColor" opacity="0.375" />
    <rect x="2" y="11" width="4" height="2" fill="currentColor" opacity="0.25" />
    <rect x="4" y="5" width="3" height="3" fill="currentColor" opacity="0.125" />
  </svg>
);

// 24. MusicIcon - Pixel eighth note
export const MusicIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Note stem and flag */}
    <path d="M14 15 V4 H20 V7 H16 V15" />
    {/* Voxel head */}
    <rect x="9" y="13" width="6" height="5" fill="currentColor" />
  </svg>
);

// 25. AlertIcon - Voxel warning triangle
export const AlertIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Triangle */}
    <path d="M12 3 L22 21 H2 Z" />
    {/* Exclamation point (blocky) */}
    <rect x="11" y="8" width="2" height="6" fill="currentColor" />
    <rect x="11" y="16" width="2" height="2" fill="currentColor" />
  </svg>
);

// 26. GlobeIcon - (Bonus/Extra) for Public Rooms
export const GlobeIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <rect x="4" y="4" width="16" height="16" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <rect x="8" y="8" width="8" height="8" />
  </svg>
);

// 27. LockIcon - (Bonus/Extra) for Private Rooms
export const LockIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <rect x="5" y="11" width="14" height="10" />
    <path d="M8 11 V7 H16 V11" />
    <rect x="11" y="14" width="2" height="3" fill="currentColor" />
  </svg>
);

// 28. CrownIcon - (Bonus/Extra) Host badge
export const CrownIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M4 6 L8 11 L12 4 L16 11 L20 6 V19 H4 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

// 29. CopyIcon - (Bonus/Extra) Clipboard copy
export const CopyIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <rect x="8" y="8" width="12" height="12" />
    <path d="M16 8 V4 H4 V16 H8" />
  </svg>
);

// 30. PaletteIcon - Voxel color palette grid
export const PaletteIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" fill="currentColor" />
    <rect x="14" y="3" width="7" height="7" fill="currentColor" opacity="0.8" />
    <rect x="3" y="14" width="7" height="7" fill="currentColor" opacity="0.6" />
    <rect x="14" y="14" width="7" height="7" fill="currentColor" opacity="0.4" />
  </svg>
);

// 31. GhostIcon - Voxel 8-bit ghost
export const GhostIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <path d="M4 12 V7 H20 V12" />
    <rect x="5" y="4" width="14" height="2" fill="currentColor" />
    <path d="M4 12 L6 20 L10 17 L14 20 L18 17 L20 20 L20 12" />
    <rect x="7" y="8" width="2" height="2" fill="currentColor" />
    <rect x="15" y="8" width="2" height="2" fill="currentColor" />
  </svg>
);

// 32. FlagIcon - 8-bit checkered victory flag
export const FlagIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    <line x1="4" y1="2" x2="4" y2="22" strokeWidth="2" />
    <rect x="4" y="4" width="16" height="10" />
    <rect x="4" y="4" width="4" height="5" fill="currentColor" />
    <rect x="12" y="4" width="4" height="5" fill="currentColor" />
    <rect x="8" y="9" width="4" height="5" fill="currentColor" />
    <rect x="16" y="9" width="4" height="5" fill="currentColor" />
  </svg>
);

// 33. CameraMovableIcon - Voxel style camera with movement arrows / free look
export const CameraMovableIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Body */}
    <rect x="3" y="7" width="12" height="10" />
    <path d="M7 7 V5 H11 V7" />
    {/* Lens (blocky circle) */}
    <rect x="6" y="10" width="6" height="4" fill="currentColor" fillOpacity="0.2" />
    {/* Orbit arrows representing movable/orbit */}
    <path d="M17 9 L20 6 L23 9" />
    <path d="M23 15 L20 18 L17 15" />
    <line x1="20" y1="6" x2="20" y2="18" />
  </svg>
);

// 34. CameraStaticIcon - Voxel style camera locked / tripod
export const CameraStaticIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    {...props}
  >
    {/* Body */}
    <rect x="6" y="6" width="12" height="9" />
    <path d="M10 6 V4 H14 V6" />
    {/* Lens (blocky) */}
    <rect x="9" y="8" width="6" height="4" fill="currentColor" fillOpacity="0.2" />
    {/* Tripod legs / locked stand */}
    <line x1="12" y1="15" x2="12" y2="18" />
    <path d="M8 21 L12 18 L16 21" />
  </svg>
);

// 35. BackArrowIcon - Blocky retro back arrow
export const BackArrowIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    {...props}
  >
    <path d="M20 11H8V9H6V11H4V13H6V15H8V13H20V11Z" fill="currentColor" />
  </svg>
);

// 36. TrophyIcon - Blocky retro trophy
export const TrophyIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    {...props}
  >
    <path d="M5 2H19V4H17V6H15V14H9V6H7V4H5V2ZM9 16H15V18H17V20H7V18H9V16ZM3 4H5V8H7V10H5V12H3V4ZM21 4H19V8H17V10H19V12H21V4Z" fill="currentColor" />
  </svg>
);

// 37. PlayArrowIcon - Blocky retro play arrow
export const PlayArrowIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    {...props}
  >
    <path d="M8 5V19L18 12L8 5Z" fill="currentColor" />
  </svg>
);


