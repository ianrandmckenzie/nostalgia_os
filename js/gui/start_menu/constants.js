export const DEFAULT_START_MENU_ITEMS = [
  {
    id: 'mycomp',
    text: 'My Computer',
    icon: 'image/computer.webp',
    type: 'item'
  },
  {
    id: 'mailboxapp',
    text: 'Mail Box',
    icon: 'image/mail.webp',
    type: 'item'
  },
  {
    id: 'mediaapp',
    text: 'Media Player',
    icon: 'image/video.webp',
    type: 'item'
  },
  {
    id: 'tubestreamapp',
    text: 'TubeStream',
    icon: 'image/youtube.webp',
    type: 'item'
  },
  {
    id: 'watercolourapp',
    text: 'Watercolour',
    icon: 'image/watercolour.webp',
    type: 'item'
  },
  {
    id: 'utilities-group',
    text: 'Utilities',
    type: 'group',
    items: [
      { id: 'letterpad', text: 'LetterPad', icon: 'image/file.webp' },
      { id: 'calcapp', text: 'Calculator', icon: 'image/calculator.webp' },
      { id: 'keyboard', text: 'Keyboard', icon: 'image/keyboard.webp' },
      { id: 'sysset', text: 'Desktop Settings', icon: 'image/gears.webp' },
      { id: 'storageapp', text: 'Storage Manager', icon: 'image/drive_c.webp' },
      { id: 'osupdateapp', text: 'OS Update', icon: 'image/power.webp' },
      { id: 'abtcomp', text: 'About This Computer', icon: 'image/info.webp' }
    ]
  },
  {
    id: 'games-group',
    text: 'Games',
    type: 'group',
    items: [
      { id: 'solapp', text: 'Solitaire', icon: 'image/solitaire.webp' },
      { id: 'chessapp', text: 'Guillotine Chess', icon: 'image/guillotine_chess.webp' },
      { id: 'bombapp', text: 'Bombbroomer', icon: 'image/bombbroomer.webp' },
      { id: 'pongapp', text: 'Pong', icon: 'image/pong.webp' },
      { id: 'snakeapp', text: 'Snake', icon: 'image/snake.webp' },
      { id: 'happyturdapp', text: 'Happy Turd', icon: 'image/happyturd.webp' }
    ]
  },
  {
    id: 'rstrtcomp',
    text: 'Restart',
    icon: 'image/power.webp',
    type: 'item',
    fixed: true // This item should always be last and not draggable
  }
];
