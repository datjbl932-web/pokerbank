
export const RANKS = [
  { name: 'Tập Sự', min: -Infinity, color: 'text-gray-400', icon: '🐣' },
  { name: 'Đồng', min: 0, color: 'text-amber-700', icon: '🥉' },
  { name: 'Bạc', min: 2000000, color: 'text-slate-400', icon: '🥈' },
  { name: 'Vàng', min: 5000000, color: 'text-yellow-500', icon: '🥇' },
  { name: 'Bạch Kim', min: 10000000, color: 'text-cyan-400', icon: '💠' },
  { name: 'Kim Cương', min: 20000000, color: 'text-blue-400', icon: '💎' },
  { name: 'Cao Thủ', min: 50000000, color: 'text-purple-400', icon: '🔮' },
  { name: 'Đại Cao Thủ', min: 100000000, color: 'text-red-500', icon: '👹' },
  { name: 'Thách Đấu', min: 200000000, color: 'text-yellow-300', icon: '👑' },
];

export const getPlayerRank = (profit: number) => {
  // Find the highest rank where profit >= min
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (profit >= RANKS[i].min) {
      return RANKS[i];
    }
  }
  return RANKS[0];
};

export const AVATARS = [
  "😎", "🤠", "🤑", "🤡", "🤖", "👽", "👻", "🐯", "🦁", "🐼", "🦊", "🐶", "🐱", "🦈", "🦅", "🦉"
];

// Generate a consistent color from string
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
