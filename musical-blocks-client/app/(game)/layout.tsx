import { SettingsMenu } from '@/src/components/ui/SettingsMenu';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="game-app">
      <SettingsMenu />
      {children}
    </main>
  );
}
