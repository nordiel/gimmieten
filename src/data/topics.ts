import type { CategoryId, Topic } from '../types';

/** Display order. Labels live in the i18n dictionaries. */
export const CATEGORIES: CategoryId[] = [
  'science',
  'psychology',
  'technology',
  'history',
  'business',
  'art',
  'gaming',
  'philosophy',
  'mysteries',
];

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORIES as string[]).includes(value);
}

/** [English title, English hint, Spanish title, Spanish hint] */
type TopicSeed = [title: string, hint: string, titleEs: string, hintEs: string];

const SEEDS: Record<CategoryId, TopicSeed[]> = {
  science: [
    ['How photosynthesis works', 'Follow the energy from sunlight to sugar.', 'Cómo funciona la fotosíntesis', 'Sigue la energía desde la luz solar hasta el azúcar.'],
    ['Why the sky is blue', 'Look up Rayleigh scattering.', 'Por qué el cielo es azul', 'Busca la dispersión de Rayleigh.'],
    ['How vaccines train the immune system', 'Think about memory cells.', 'Cómo las vacunas entrenan al sistema inmune', 'Piensa en las células de memoria.'],
    ['Plate tectonics', 'Why continents drift and mountains rise.', 'La tectónica de placas', 'Por qué los continentes se mueven y las montañas se elevan.'],
    ['How black holes form', 'Start with the death of a massive star.', 'Cómo se forman los agujeros negros', 'Empieza por la muerte de una estrella masiva.'],
    ['CRISPR gene editing', 'It started as a bacterial defense system.', 'La edición genética con CRISPR', 'Empezó como un sistema de defensa de las bacterias.'],
    ['The tardigrade', 'The near-indestructible "water bear."', 'El tardígrado', 'El casi indestructible "oso de agua".'],
    ['How bees communicate', 'Research the waggle dance.', 'Cómo se comunican las abejas', 'Investiga la danza del meneo.'],
    ['Bioluminescence', 'Why some living things glow, and how.', 'La bioluminiscencia', 'Por qué algunos seres vivos brillan, y cómo lo hacen.'],
    ['The nitrogen cycle', 'How nitrogen moves between air, soil, and life.', 'El ciclo del nitrógeno', 'Cómo se mueve el nitrógeno entre el aire, el suelo y los seres vivos.'],
    ['How tides work', 'The Moon is only part of the story.', 'Cómo funcionan las mareas', 'La Luna es solo parte de la historia.'],
    ['Antibiotic resistance', 'Evolution happening in real time.', 'La resistencia a los antibióticos', 'Evolución ocurriendo en tiempo real.'],
  ],
  psychology: [
    ['The Dunning–Kruger effect', 'Why the least skilled can be the most confident.', 'El efecto Dunning-Kruger', 'Por qué los menos hábiles pueden ser los más seguros.'],
    ['Cognitive dissonance', 'What happens when beliefs and actions clash.', 'La disonancia cognitiva', 'Qué pasa cuando las creencias y las acciones chocan.'],
    ['The bystander effect', 'Why crowds can make help less likely.', 'El efecto espectador', 'Por qué una multitud puede hacer menos probable que alguien ayude.'],
    ['Confirmation bias', 'How we filter evidence without noticing.', 'El sesgo de confirmación', 'Cómo filtramos la evidencia sin darnos cuenta.'],
    ['How habits form', 'Look into the cue–routine–reward loop.', 'Cómo se forman los hábitos', 'Investiga el ciclo señal–rutina–recompensa.'],
    ['The placebo effect', 'Belief that produces real, measurable change.', 'El efecto placebo', 'Una creencia que produce cambios reales y medibles.'],
    ['Loss aversion', 'Why losing $10 stings more than winning $10 pleases.', 'La aversión a la pérdida', 'Por qué perder $10 duele más de lo que alegra ganar $10.'],
    ['The spotlight effect', 'Why we think everyone notices us.', 'El efecto foco', 'Por qué creemos que todos se fijan en nosotros.'],
    ['Flow state', 'The psychology of being "in the zone."', 'El estado de flujo', 'La psicología de estar "en la zona".'],
    ['Why we procrastinate', 'It is more about emotion than time.', 'Por qué procrastinamos', 'Tiene más que ver con las emociones que con el tiempo.'],
    ['The Stanford prison experiment', 'Include the criticism it has faced.', 'El experimento de la cárcel de Stanford', 'Incluye las críticas que ha recibido.'],
    ['How memory consolidation works', 'What sleep has to do with remembering.', 'Cómo se consolida la memoria', 'Qué tiene que ver el sueño con recordar.'],
  ],
  technology: [
    ['How the internet routes data', 'Packets, routers, and the TCP/IP model.', 'Cómo internet enruta los datos', 'Paquetes, routers y el modelo TCP/IP.'],
    ['Public-key cryptography', 'How strangers can share secrets safely.', 'La criptografía de clave pública', 'Cómo dos desconocidos pueden compartir secretos de forma segura.'],
    ['How GPS finds your location', 'Satellites, clocks, and trilateration.', 'Cómo el GPS encuentra tu ubicación', 'Satélites, relojes y trilateración.'],
    ['What a blockchain actually is', 'Strip away the hype — what is the data structure?', 'Qué es realmente una blockchain', 'Quítale la publicidad: ¿cuál es la estructura de datos?'],
    ['How compression makes files smaller', 'Compare lossless and lossy.', 'Cómo la compresión hace los archivos más pequeños', 'Compara la compresión con y sin pérdida.'],
    ['How touchscreens detect your finger', 'Capacitance is the keyword.', 'Cómo las pantallas táctiles detectan tu dedo', 'La palabra clave es capacitancia.'],
    ['The Y2K bug', 'What it was and why it mostly fizzled.', 'El error del año 2000 (Y2K)', 'Qué fue y por qué casi no pasó nada.'],
    ['How search engines rank pages', 'Start with PageRank.', 'Cómo los buscadores ordenan las páginas', 'Empieza por PageRank.'],
    ['Moore’s law', 'An observation, not a law of physics.', 'La ley de Moore', 'Una observación, no una ley de la física.'],
    ['How QR codes store information', 'Why they still work when partly damaged.', 'Cómo los códigos QR guardan información', 'Por qué siguen funcionando aunque estén dañados en parte.'],
    ['What DNS does', 'The internet’s phone book.', 'Qué hace el DNS', 'La guía telefónica de internet.'],
    ['How a CPU executes instructions', 'Fetch, decode, execute.', 'Cómo un procesador ejecuta instrucciones', 'Buscar, decodificar, ejecutar.'],
  ],
  history: [
    ['The Rosetta Stone', 'How one slab cracked Egyptian hieroglyphs.', 'La piedra de Rosetta', 'Cómo una sola losa descifró los jeroglíficos egipcios.'],
    ['The Silk Road', 'More than one road, and more than silk.', 'La Ruta de la Seda', 'Más de una ruta, y más que seda.'],
    ['The printing press revolution', 'Gutenberg and what came after.', 'La revolución de la imprenta', 'Gutenberg y lo que vino después.'],
    ['The fall of the Western Roman Empire', 'There is no single cause.', 'La caída del Imperio romano de Occidente', 'No hay una sola causa.'],
    ['The Library of Alexandria', 'Myth vs. what historians actually know.', 'La Biblioteca de Alejandría', 'El mito frente a lo que los historiadores realmente saben.'],
    ['The Black Death', 'How a pandemic reshaped medieval Europe.', 'La peste negra', 'Cómo una pandemia transformó la Europa medieval.'],
    ['The Inca road system', 'An empire connected without the wheel.', 'El sistema de caminos inca', 'Un imperio conectado sin usar la rueda.'],
    ['The Apollo 11 mission', 'Focus on how they got there and back.', 'La misión Apolo 11', 'Concéntrate en cómo llegaron y cómo regresaron.'],
    ['The Code of Hammurabi', 'One of the oldest written law codes.', 'El Código de Hammurabi', 'Uno de los códigos de leyes escritos más antiguos.'],
    ['The Meiji Restoration', 'How Japan transformed in a few decades.', 'La Restauración Meiji', 'Cómo Japón se transformó en pocas décadas.'],
    ['The invention of writing', 'Mesopotamia, accounting, and clay.', 'La invención de la escritura', 'Mesopotamia, contabilidad y arcilla.'],
    ['The Cuban Missile Crisis', 'Thirteen days at the edge.', 'La crisis de los misiles en Cuba', 'Trece días al borde del abismo.'],
  ],
  business: [
    ['How inflation works', 'What makes money lose value over time.', 'Cómo funciona la inflación', 'Qué hace que el dinero pierda valor con el tiempo.'],
    ['Supply and demand', 'The model behind most prices.', 'La oferta y la demanda', 'El modelo detrás de la mayoría de los precios.'],
    ['The tragedy of the commons', 'Shared resources and individual incentives.', 'La tragedia de los comunes', 'Recursos compartidos e incentivos individuales.'],
    ['How compound interest works', 'Why time matters more than amount.', 'Cómo funciona el interés compuesto', 'Por qué el tiempo importa más que la cantidad.'],
    ['The 2008 financial crisis', 'Follow the mortgages.', 'La crisis financiera de 2008', 'Sigue la pista de las hipotecas.'],
    ['What a stock actually is', 'Ownership, dividends, and markets.', 'Qué es realmente una acción', 'Propiedad, dividendos y mercados.'],
    ['Network effects', 'Why some products get better with more users.', 'Los efectos de red', 'Por qué algunos productos mejoran con más usuarios.'],
    ['The tulip mania', 'Was it really the first speculative bubble?', 'La tulipomanía', '¿Fue realmente la primera burbuja especulativa?'],
    ['How central banks set interest rates', 'And why it affects everything.', 'Cómo los bancos centrales fijan las tasas de interés', 'Y por qué eso lo afecta todo.'],
    ['Opportunity cost', 'The price of the option you did not choose.', 'El costo de oportunidad', 'El precio de la opción que no elegiste.'],
    ['The freemium business model', 'How giving it away can make money.', 'El modelo de negocio freemium', 'Cómo regalar algo puede generar dinero.'],
    ['Why airlines overbook flights', 'Probability meets profit.', 'Por qué las aerolíneas sobrevenden vuelos', 'La probabilidad se encuentra con las ganancias.'],
  ],
  art: [
    ['Why the Mona Lisa is famous', 'Hint: a 1911 theft helped.', 'Por qué la Mona Lisa es famosa', 'Pista: un robo en 1911 ayudó.'],
    ['How perspective changed painting', 'The Renaissance and the vanishing point.', 'Cómo la perspectiva cambió la pintura', 'El Renacimiento y el punto de fuga.'],
    ['The origins of hip-hop', 'The Bronx in the 1970s.', 'Los orígenes del hip-hop', 'El Bronx en los años 70.'],
    ['Impressionism', 'Light, color, and a scandalized art world.', 'El impresionismo', 'Luz, color y un mundo del arte escandalizado.'],
    ['How the 12-bar blues works', 'The chord progression behind a century of music.', 'Cómo funciona el blues de 12 compases', 'La progresión de acordes detrás de un siglo de música.'],
    ['The golden ratio in art', 'Separate the evidence from the myth.', 'La proporción áurea en el arte', 'Separa la evidencia del mito.'],
    ['Why minor keys sound sad', 'Is it nature, culture, or both?', 'Por qué las tonalidades menores suenan tristes', '¿Es naturaleza, cultura o ambas?'],
    ['The Bauhaus movement', 'Where modern design began.', 'El movimiento Bauhaus', 'Donde nació el diseño moderno.'],
    ['How a symphony orchestra is organized', 'Sections, seating, and the conductor’s job.', 'Cómo se organiza una orquesta sinfónica', 'Secciones, ubicación y el trabajo del director.'],
    ['Banksy', 'Street art, anonymity, and the art market.', 'Banksy', 'Arte urbano, anonimato y el mercado del arte.'],
    ['The invention of photography', 'Daguerre, Talbot, and long exposures.', 'La invención de la fotografía', 'Daguerre, Talbot y las exposiciones largas.'],
    ['Auto-Tune', 'From pitch correction to a creative instrument.', 'El Auto-Tune', 'De corrector de afinación a instrumento creativo.'],
  ],
  gaming: [
    ['The video game crash of 1983', 'And how the NES revived the industry.', 'La crisis de los videojuegos de 1983', 'Y cómo la NES revivió la industria.'],
    ['How speedrunning works', 'Categories, glitches, and community rules.', 'Cómo funciona el speedrunning', 'Categorías, fallos del juego y reglas de la comunidad.'],
    ['The history of Tetris', 'A Soviet puzzle game and a licensing saga.', 'La historia de Tetris', 'Un rompecabezas soviético y una saga de licencias.'],
    ['Why Minecraft became so popular', 'Creativity, mods, and YouTube.', 'Por qué Minecraft se volvió tan popular', 'Creatividad, mods y YouTube.'],
    ['The hero’s journey in movies', 'Joseph Campbell’s monomyth.', 'El viaje del héroe en el cine', 'El monomito de Joseph Campbell.'],
    ['How esports make money', 'Sponsors, media rights, and franchises.', 'Cómo ganan dinero los esports', 'Patrocinios, derechos de transmisión y franquicias.'],
    ['The origin of emoji', 'Japan, 1999, and a 12×12 grid.', 'El origen de los emojis', 'Japón, 1999 y una cuadrícula de 12×12.'],
    ['How loot boxes work', 'And why some countries regulate them.', 'Cómo funcionan las cajas de botín', 'Y por qué algunos países las regulan.'],
    ['The making of Pokémon', 'Inspired by a childhood hobby of collecting bugs.', 'La creación de Pokémon', 'Inspirado en un pasatiempo de infancia: coleccionar insectos.'],
    ['How memes spread', 'Richard Dawkins coined the word.', 'Cómo se propagan los memes', 'Richard Dawkins acuñó la palabra.'],
    ['The uncanny valley', 'Why almost-human faces feel creepy.', 'El valle inquietante', 'Por qué las caras casi humanas nos dan escalofríos.'],
    ['Procedural generation', 'How games build worlds from algorithms.', 'La generación procedimental', 'Cómo los juegos construyen mundos con algoritmos.'],
  ],
  philosophy: [
    ['The trolley problem', 'What it reveals about moral intuitions.', 'El dilema del tranvía', 'Lo que revela sobre nuestras intuiciones morales.'],
    ['The Ship of Theseus', 'If every part is replaced, is it the same ship?', 'El barco de Teseo', 'Si se reemplazan todas sus piezas, ¿sigue siendo el mismo barco?'],
    ['Utilitarianism', 'The greatest good for the greatest number.', 'El utilitarismo', 'El mayor bien para el mayor número.'],
    ['Stoicism', 'Focus on what you can control.', 'El estoicismo', 'Concéntrate en lo que puedes controlar.'],
    ['Plato’s allegory of the cave', 'Shadows, reality, and enlightenment.', 'La alegoría de la caverna de Platón', 'Sombras, realidad e iluminación.'],
    ['The social contract', 'Hobbes, Locke, and Rousseau.', 'El contrato social', 'Hobbes, Locke y Rousseau.'],
    ['Occam’s razor', 'A rule of thumb, not a proof.', 'La navaja de Ockham', 'Una regla práctica, no una prueba.'],
    ['The prisoner’s dilemma', 'Why cooperation is hard even when it pays.', 'El dilema del prisionero', 'Por qué cooperar es difícil incluso cuando conviene.'],
    ['Existentialism', 'Existence precedes essence.', 'El existencialismo', 'La existencia precede a la esencia.'],
    ['The veil of ignorance', 'John Rawls’ thought experiment on fairness.', 'El velo de la ignorancia', 'El experimento mental de John Rawls sobre la justicia.'],
    ['Pascal’s wager', 'And the main objections to it.', 'La apuesta de Pascal', 'Y las principales objeciones.'],
    ['The philosophy of free will', 'Determinism, compatibilism, and choice.', 'La filosofía del libre albedrío', 'Determinismo, compatibilismo y elección.'],
  ],
  mysteries: [
    ['Why we yawn', 'Contagious yawning is the weirdest part.', 'Por qué bostezamos', 'El bostezo contagioso es lo más extraño.'],
    ['Why onions make you cry', 'There is a chemical reaction involved.', 'Por qué la cebolla te hace llorar', 'Hay una reacción química de por medio.'],
    ['Why cats purr', 'It is not only about being happy.', 'Por qué ronronean los gatos', 'No es solo porque estén contentos.'],
    ['Why we get brain freeze', 'Blood vessels in the roof of your mouth.', 'Por qué se nos congela el cerebro', 'Los vasos sanguíneos del paladar tienen la culpa.'],
    ['Why fingers wrinkle in water', 'It may be an evolved feature.', 'Por qué se arrugan los dedos en el agua', 'Podría ser un rasgo evolutivo.'],
    ['Why we have hiccups', 'A reflex with no clear purpose.', 'Por qué nos da hipo', 'Un reflejo sin un propósito claro.'],
    ['Why bread goes stale', 'It is not just drying out.', 'Por qué el pan se pone duro', 'No es solo que se seque.'],
    ['Why we dream', 'Several competing theories.', 'Por qué soñamos', 'Hay varias teorías en competencia.'],
    ['Why ice is slippery', 'Scientists still debate the details.', 'Por qué el hielo resbala', 'Los científicos aún debaten los detalles.'],
    ['Why the Moon looks bigger near the horizon', 'It is an illusion, not optics.', 'Por qué la Luna se ve más grande cerca del horizonte', 'Es una ilusión, no un efecto óptico.'],
    ['Why popcorn pops', 'Water, pressure, and a hard hull.', 'Por qué explotan las palomitas de maíz', 'Agua, presión y una cáscara dura.'],
    ['Why music gives you chills', 'Dopamine and anticipation.', 'Por qué la música te da escalofríos', 'Dopamina y anticipación.'],
  ],
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export const TOPICS: Topic[] = (Object.entries(SEEDS) as [CategoryId, TopicSeed[]][]).flatMap(
  ([category, seeds]) =>
    seeds.map(([title, hint, titleEs, hintEs]) => ({
      // Ids come from the English title so they never change with translation.
      id: `${category}-${slugify(title)}`,
      title: { en: title, es: titleEs },
      category,
      hint: { en: hint, es: hintEs },
    })),
);

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string): Topic | undefined {
  return TOPIC_BY_ID.get(id);
}

export function topicCount(category: CategoryId): number {
  return TOPICS.filter((t) => t.category === category).length;
}
