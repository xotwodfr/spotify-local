import type { CardItem, Rail } from "@/types";

const tracks: CardItem[] = [
  { id: "t1", title: "OM DU FRÅGAR NOOSHI", subtitle: "Rasmus Gozzi, FRÖKEN SNUSK, Louise Andersson Bodin", image: "/images/tracks/track-01.jpg", href: "/album/5UiTWDQHVevbAPnOwjT8Ku?highlight=spotify:track:7wKrYt6EUpRLhWQVNNjjsn", kind: "track", explicit: true },
  { id: "t2", title: "Vem du än är", subtitle: "Keisha", image: "/images/tracks/track-02.jpg", href: "/album/5ErLUOWuqlTFRPMeYx9FCF?highlight=spotify:track:1q0wUKp7z4PahhgYe1Db5P", kind: "track" },
  { id: "t3", title: "Arsenal", subtitle: "Slipknot", image: "/images/tracks/track-03.jpg", href: "/album/7rbRBzaKbxyp4HnJOSgBvP?highlight=spotify:track:3QEglzrnBHZg2yVGlo3G5j", kind: "track", explicit: true },
  { id: "t4", title: "7 MANN", subtitle: "HARDWICK", image: "/images/tracks/track-04.jpg", href: "/album/4RULv7kU6if3YjointQNP8?highlight=spotify:track:1KGQmd5UoLQ8ami2RyNFJJ", kind: "track", explicit: true },
  { id: "t5", title: "Ain't In LA", subtitle: "ADÉLA", image: "/images/tracks/track-05.jpg", href: "/album/2yDFVH9CeOHt0sc9eI0aBs?highlight=spotify:track:6U9VpmP3dEinuezxCJ2Zg9", kind: "track", explicit: true },
  { id: "t6", title: "Sure Thing", subtitle: "Miguel", image: "/images/tracks/track-06.jpg", href: "/album/493HYe7N5pleudEZRyhE7R?highlight=spotify:track:0JXXNGljqupsJaZsgSbMZV", kind: "track" },
  { id: "t7", title: "Vibin", subtitle: "Wxoda", image: "/images/tracks/track-07.jpg", href: "/album/3Gm7PcJD5anUXqQt1K10Jx?highlight=spotify:track:6eMVI1rdG5VBXHovMAbIvs", kind: "track", explicit: true },
  { id: "t8", title: "Talking Body", subtitle: "Tove Lo", image: "/images/tracks/track-08.jpg", href: "/album/5Z5O36p7BivXzkucc0PAfw?highlight=spotify:track:7cgu4JBW3hq1GwTM1ilkKQ", kind: "track", explicit: true },
  { id: "t9", title: "Azalea", subtitle: "Victor Leksell", image: "/images/tracks/track-09.jpg", href: "/album/1eTgGT1hadTFKHsAIF2g7W?highlight=spotify:track:0Dkp8CfJx2xSEaIuX8F2hx", kind: "track" },
  { id: "t10", title: "Låtsas som det regnar - Jarly Remix", subtitle: "Veronica Maggio, Jarly", image: "/images/tracks/track-10.jpg", href: "/album/7Jb0WZWDEMANtvfckwGoXE?highlight=spotify:track:73YWlw3iqd0BHHH38udVT6", kind: "track" },
  { id: "t11", title: "Homecoming", subtitle: "Kanye West, Chris Martin", image: "/images/tracks/track-11.jpg", href: "/album/4SZko61aMnmgvNhfhgTuD3?highlight=spotify:track:4iz9lGMjU1lXS51oPmUmTe", kind: "track", explicit: true },
  { id: "t12", title: "Är det här det är party", subtitle: "Korslagda", image: "/images/tracks/track-12.jpg", href: "/album/5f6dKBzjWA6S1anxk4wW58?highlight=spotify:track:3LUv3ZP70kKfDx9ui4mF2f", kind: "track" },
  { id: "t13", title: "Höjer Våra Glas", subtitle: "Hasselyra", image: "/images/tracks/track-13.jpg", href: "/album/76v9qXmEgMLvoy4Zlqq5iI?highlight=spotify:track:0pA3CEVNAowtMSIkzkDFAn", kind: "track" },
  { id: "t14", title: "RAKET", subtitle: "25, Greekazo, NBLNATION", image: "/images/tracks/track-14.jpg", href: "/album/3pJeaqxhd9G3RC2QHTOXji?highlight=spotify:track:43oV0kwsqxyfR1psOUR6QK", kind: "track", explicit: true },
  { id: "t15", title: "Nuclear God", subtitle: "Orbit Culture", image: "/images/tracks/track-15.jpg", href: "/album/7bn7r3oX9Suu3KtKsUhXJH?highlight=spotify:track:478SPzkDZBYwvrq9N3N9Xj", kind: "track" },
  { id: "t16", title: "Interpol", subtitle: "RB, Nummeruno", image: "/images/tracks/track-16.jpg", href: "/album/2doU4oYKRo1qLjbjkUygc3?highlight=spotify:track:6MLzrzvx4eQ6PYLbJE5WN6", kind: "track", explicit: true },
  { id: "t17", title: "SNÄLLA STELLA - UPTEMPO REMIX", subtitle: "Rök Liza, KLNH", image: "/images/tracks/track-17.jpg", href: "/album/12syxAlClReL2QdUoJrvpI?highlight=spotify:track:5SK98gb3V4Y7duCfYUzOgf", kind: "track" },
];

const artists: CardItem[] = [
  { id: "a1", title: "Veronica Maggio", subtitle: "Artist", image: "/images/artists/artist-01.jpg", href: "/artist/2OIWxN9xUhgUHkeUCWCaNs", kind: "artist" },
  { id: "a2", title: "Ed Sheeran", subtitle: "Artist", image: "/images/artists/artist-02.jpg", href: "/artist/6eUKZXaKkcviH0Ku9w2n3V", kind: "artist" },
  { id: "a3", title: "Lady Gaga", subtitle: "Artist", image: "/images/artists/artist-03.jpg", href: "/artist/1HY2Jd0NmPuamShAr6KMms", kind: "artist" },
  { id: "a4", title: "KAJ", subtitle: "Artist", image: "/images/artists/artist-04.jpg", href: "/artist/4blbIMKwfzTxHGvN0Est1t", kind: "artist" },
  { id: "a5", title: "Hov1", subtitle: "Artist", image: "/images/artists/artist-05.jpg", href: "/artist/68dW5BU6sdVNf099EylxEt", kind: "artist" },
  { id: "a6", title: "Bolaget", subtitle: "Artist", image: "/images/artists/artist-06.jpg", href: "/artist/55ZGFvikpNjQHvtTWS5aZF", kind: "artist" },
  { id: "a7", title: "David Guetta", subtitle: "Artist", image: "/images/artists/artist-07.jpg", href: "/artist/1Cs0zKBU1kc0i8ypK3B9ai", kind: "artist" },
  { id: "a8", title: "Avicii", subtitle: "Artist", image: "/images/artists/artist-08.jpg", href: "/artist/1vCWHaC5f2uS3yhpwWbIA6", kind: "artist" },
  { id: "a9", title: "Miriam Bryant", subtitle: "Artist", image: "/images/artists/artist-09.jpg", href: "/artist/2zd9YxlsQvA5mkZ1NarYVQ", kind: "artist" },
  { id: "a10", title: "Rihanna", subtitle: "Artist", image: "/images/artists/artist-10.jpg", href: "/artist/5pKCCKE2ajJHZ9KAiaK11H", kind: "artist" },
];

const albums: CardItem[] = [
  { id: "al1", title: "Somna med Humlan Djojj", subtitle: "Humlan Djojj, Josefine Götestam", image: "/images/albums/album-01.jpg", href: "/album/4WNif9l3tnCtgdyLO3hTaG", kind: "album" },
  { id: "al2", title: "You'll Be Alright, Kid (Chapter 1)", subtitle: "Victor Leksell", image: "/images/albums/album-02.jpg", href: "/album/1eCGY9WJpYgtaFh1Lk2KNo", kind: "album" },
  { id: "al3", title: "Handen i fickan fast jag bryr mig", subtitle: "Veronica Maggio", image: "/images/albums/album-03.jpg", href: "/album/6FDDd5kzWGXVm1qbKRGqEg", kind: "album" },
  { id: "al4", title: "Jag önskar jag brydde mig mer... men det gör jag egentligen", subtitle: "Miriam Bryant", image: "/images/albums/album-04.jpg", href: "/album/5hugldJAwORdDcefCzMLuf", kind: "album" },
  { id: "al5", title: "Satan i gatan (Bonus Version)", subtitle: "Veronica Maggio", image: "/images/albums/album-05.jpg", href: "/album/2fOs6I0CgvaZj9agU8EAlH", kind: "album" },
  { id: "al6", title: "Förstår om du inte förstår", subtitle: "Victor Leksell", image: "/images/albums/album-06.jpg", href: "/album/3LWrSMN9jOXgiy5Xl4vmCz", kind: "album" },
  { id: "al7", title: "Tusen spänn", subtitle: "Korslagda", image: "/images/albums/album-07.jpg", href: "/album/65IQow1xXrvDc5j1H0DJiL", kind: "album" },
  { id: "al8", title: "HIT ME HARD AND SOFT", subtitle: "Billie Eilish", image: "/images/albums/album-08.jpg", href: "/album/7aJuG4TFXa2hmE4z1yxc3n", kind: "album" },
  { id: "al9", title: "Skeletá", subtitle: "Rihanna", image: "/images/albums/album-09.jpg", href: "/album/37a1ehu3HGYPA07QFvWIsL", kind: "album" },
  { id: "al10", title: "Svagare än jag", subtitle: "Miss Li", image: "/images/albums/album-10.jpg", href: "/album/1G4oPYw6MmSYJH04bBIdtr", kind: "album" },
];

const radio: CardItem[] = [
  { id: "r1", title: "Avicii Radio", subtitle: "With Calvin Harris, Axwell /\\ Ingrosso, Otto Knows", image: "/images/radio/radio-01.jpg", href: "/playlist/37i9dQZF1E4kUE8oxyvqI9", kind: "radio" },
  { id: "r2", title: "Veronica Maggio Radio", subtitle: "With Miriam Bryant, Zara Larsson, Molly Sandén", image: "/images/radio/radio-02.jpg", href: "/playlist/37i9dQZF1E4piQOL9NNrbH", kind: "radio" },
  { id: "r3", title: "Teddy Swims Radio", subtitle: "With Rag'n'Bone Man, Lewis Capaldi, Dean Lewis", image: "/images/radio/radio-03.jpg", href: "/playlist/37i9dQZF1E4jVwymj8azOX", kind: "radio" },
  { id: "r4", title: "Hov1 Radio", subtitle: "With Bolaget, Miss Li, Victor Leksell", image: "/images/radio/radio-04.jpg", href: "/playlist/37i9dQZF1E4k2w18yxM2o8", kind: "radio" },
  { id: "r5", title: "Bolaget Radio", subtitle: "With Hov1, Rasmus Gozzi, Fröken Snusk", image: "/images/radio/radio-05.jpg", href: "/playlist/37i9dQZF1E4oUNPkBpZPOc", kind: "radio" },
  { id: "r6", title: "Miss Li Radio", subtitle: "With Veronica Maggio, Molly Sandén, Miriam Bryant", image: "/images/radio/radio-06.jpg", href: "/playlist/37i9dQZF1E4p2HPnvdzDW0", kind: "radio" },
  { id: "r7", title: "Molly Sandén Radio", subtitle: "With Veronica Maggio, Miriam Bryant, Theoz", image: "/images/radio/radio-07.jpg", href: "/playlist/37i9dQZF1E4yyTpm6pvawT", kind: "radio" },
  { id: "r8", title: "Håkan Hellström Radio", subtitle: "With Veronica Maggio, Tripp Trapp, Ulf Lundell", image: "/images/radio/radio-08.jpg", href: "/playlist/37i9dQZF1E4uzQRCNPLJuF", kind: "radio" },
  { id: "r9", title: "Fleetwood Mac Radio", subtitle: "With Stevie Nicks, Eagles, The Eagles", image: "/images/radio/radio-09.jpg", href: "/playlist/37i9dQZF1E4tZxYcBZfDn9", kind: "radio" },
  { id: "r10", title: "Benjamin Ingrosso Radio", subtitle: "With Veronica Maggio, Hov1, Victor Leksell", image: "/images/radio/radio-10.jpg", href: "/playlist/37i9dQZF1E4AjdEPrJ65uM", kind: "radio" },
];

const charts: CardItem[] = [
  { id: "c1", title: "Top Songs - Global", subtitle: "Your weekly update of the most played tracks right now", image: "/images/charts/chart-global-weekly.jpg", href: "/playlist/37i9dQZEVXbNG2KDcFcKOF", kind: "chart" },
  { id: "c2", title: "Top Songs - Sweden", subtitle: "Your weekly update of the most played tracks right now", image: "/images/charts/chart-se-weekly.jpg", href: "/playlist/37i9dQZEVXbKVvfnL1Us06", kind: "chart" },
  { id: "c3", title: "Top 50 - Global", subtitle: "Your daily update of the most played tracks right now", image: "/images/charts/chart-global-daily.jpg", href: "/playlist/37i9dQZEVXbMDoHDwVN2tF", kind: "chart" },
  { id: "c4", title: "Top 50 - Sweden", subtitle: "Your daily update of the most played tracks right now", image: "/images/charts/chart-se-daily.jpg", href: "/playlist/37i9dQZEVXbLoATJ81JYXz", kind: "chart" },
];

export const rails: Rail[] = [
  { id: "trending", title: "Trending songs", kind: "track", items: tracks, showAllHref: "/search/trending" },
  { id: "artists", title: "Popular artists", kind: "artist", items: artists, showAllHref: "/search/artists" },
  { id: "albums", title: "Popular albums and singles", kind: "album", items: albums, showAllHref: "/search/albums" },
  { id: "radio", title: "Popular radio", kind: "radio", items: radio, showAllHref: "/search/radio" },
  { id: "charts", title: "Featured Charts", kind: "chart", items: charts, showAllHref: "/search/charts" },
];

export const footerCompany = ["About", "Jobs", "For the Record"];
export const footerCommunities = ["For Artists", "For Creators", "For Authors", "Developers", "Advertising", "Investors", "Vendors"];
export const footerUseful = ["Support", "Free Mobile App", "Popular by Country", "Top Song Lyrics", "Import your music"];
export const footerPlans = ["Premium Individual", "Premium Duo", "Premium Family", "Premium Student", "Spotify Free"];

export const CONTENT_PADDING = 40; // desktop .contentSpacing padding-inline