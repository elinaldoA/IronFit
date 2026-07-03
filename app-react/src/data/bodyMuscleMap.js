// Coordenadas dos hotspots de músculo sobre a imagem body-anatomy.jpg (368x885 por
// vista). Centralizado aqui pra BodyAvatar (SVG) e shareCard (canvas) desenharem
// exatamente os mesmos grupos musculares sem duplicar os paths.
export const BODY_VIEW_SIZE = { width: 368, height: 885 };

export const MUSCLE_LABELS = {
  chest: 'Peitoral',
  shoulders: 'Ombros',
  triceps: 'Tríceps',
  back: 'Costas',
  biceps: 'Bíceps',
  abs: 'Abdômen',
  quads: 'Quadríceps',
  calves: 'Panturrilhas',
  hamstrings: 'Posterior de coxa',
  glutes: 'Glúteos',
};

export const FRONT_MUSCLE_PATHS = [
  { muscle: 'shoulders', d: 'M 125,165 C 105,170 95,190 98,225 C 103,240 120,240 130,225 C 135,210 135,175 125,165 Z' },
  { muscle: 'shoulders', d: 'M 243,165 C 263,170 273,190 270,225 C 265,240 248,240 238,225 C 233,210 233,175 243,165 Z' },
  { muscle: 'chest', d: 'M 184,175 C 170,173 140,175 130,190 C 128,210 135,235 184,235 Z' },
  { muscle: 'chest', d: 'M 184,175 C 198,173 228,175 238,190 C 240,210 233,235 184,235 Z' },
  { muscle: 'biceps', d: 'M 98,225 C 90,240 85,280 95,305 C 105,310 115,310 120,290 C125,270 125,240 120,225 Z' },
  { muscle: 'biceps', d: 'M 270,225 C 278,240 283,280 273,305 C 263,310 253,310 248,290 C243,270 243,240 248,225 Z' },
  { muscle: 'abs', d: 'M 130,235 L 238,235 C 235,320 220,380 184,420 C 148,380 133,320 130,235 Z' },
  { muscle: 'quads', d: 'M 132,430 C 115,460 115,550 148,635 C 158,635 170,625 182,590 C 184,540 184,460 184,430 Z' },
  { muscle: 'quads', d: 'M 236,430 C 253,460 253,550 220,635 C 210,635 198,625 186,590 C 184,540 184,460 184,430 Z' },
  { muscle: 'calves', d: 'M 148,645 C 128,670 128,750 145,820 L 165,820 C 172,780 172,670 162,645 Z' },
  { muscle: 'calves', d: 'M 220,645 C 240,670 240,750 223,820 L 203,820 C 196,780 196,670 206,645 Z' },
];

export const BACK_MUSCLE_PATHS = [
  { muscle: 'shoulders', d: 'M 125,165 C 105,170 95,190 98,225 C 103,240 120,240 130,225 C 135,210 135,175 125,165 Z' },
  { muscle: 'shoulders', d: 'M 243,165 C 263,170 273,190 270,225 C 265,240 248,240 238,225 C 233,210 233,175 243,165 Z' },
  { muscle: 'triceps', d: 'M 98,225 C 90,240 85,280 95,305 C 105,310 115,310 120,290 C125,270 125,240 120,225 Z' },
  { muscle: 'triceps', d: 'M 270,225 C 278,240 283,280 273,305 C 263,310 253,310 248,290 C243,270 243,240 248,225 Z' },
  { muscle: 'back', d: 'M 130,175 L 238,175 C 240,240 235,320 184,395 C 133,320 128,240 130,175 Z' },
  { muscle: 'glutes', d: 'M 130,395 C 122,410 122,460 184,475 L 184,395 Z' },
  { muscle: 'glutes', d: 'M 238,395 C 246,410 246,460 184,475 L 184,395 Z' },
  { muscle: 'hamstrings', d: 'M 130,475 C 122,500 128,570 152,635 L 184,635 L 184,475 Z' },
  { muscle: 'hamstrings', d: 'M 238,475 C 246,500 238,570 216,635 L 184,635 L 184,475 Z' },
  { muscle: 'calves', d: 'M 148,645 C 128,670 128,750 145,820 L 165,820 C 172,780 172,670 162,645 Z' },
  { muscle: 'calves', d: 'M 220,645 C 240,670 240,750 223,820 L 203,820 C 196,780 196,670 206,645 Z' },
];
