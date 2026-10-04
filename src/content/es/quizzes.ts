import type { RiverNumber } from "../../types";
import type { QuestionText } from "./questionText";
import { EXAM_ES_TEXT } from "./exam";
import { INTRO_QUIZ_ES_TEXT } from "./introQuiz";

export type { QuestionText };

export const QUIZZES_ES: Partial<Record<RiverNumber, QuestionText[]>> = {
  1: [
    {
      question:
        "Alex está seguro de que su ingreso viene por completo de su propio trabajo y talento. ¿Cómo le pide el Río 1 que lo vea en cambio?",
      options: [
        "El ingreso es un regalo que se recibe y se administra, no algo producido enteramente por uno solo",
        "Debería trabajar todavía más para demostrar su propio valor",
        "Su empleador merece todo el crédito",
        "El ingreso en realidad no importa espiritualmente",
      ],
    },
    {
      question:
        "Un hogar vive por completo de un solo sueldo de un solo empleador. ¿Cuál es el mayor riesgo para el que el Río 1 quiere que estén preparados?",
      options: [
        "Que sus impuestos aumenten de manera importante",
        "Que una sola interrupción, como un despido o una enfermedad, pueda detener todo su ingreso a la vez",
        "Que nunca les ofrezcan un ascenso",
        "Que su trabajo se vuelva menos interesante",
      ],
    },
    {
      question:
        "Priya quiere una segunda fuente de ingresos, pero solo persigue lo que suena emocionante. ¿Qué debería preguntarse primero?",
      options: [
        "¿Es esta la opción más rentable que existe para cualquiera?",
        "¿Mis amigos quedarán impresionados con esta decisión?",
        "¿Qué desplazará esta nueva fuente, y cuánto me costará en descanso y relaciones?",
        "¿Puedo empezar a ganar con ella para la próxima semana?",
      ],
    },
    {
      question:
        "Un amigo sigue buscando nuevas maneras de ganar porque ninguna cantidad le parece suficiente. En los límites del Río 1, ¿dónde está el verdadero problema?",
      options: [
        "Simplemente todavía no ha encontrado la oportunidad correcta",
        "Necesita cambiar de asesor financiero",
        "Debería renunciar a su trabajo actual de inmediato",
        "El amor al dinero y la prisa por enriquecerse, no el ingreso en sí",
      ],
    },
    {
      question:
        "Dos hogares ganan lo mismo. Uno vive de un solo trabajo, y el otro tiene un trabajo principal, un pequeño negocio y un poco de ingreso por intereses. ¿Qué gana realmente el segundo hogar?",
      options: [
        "Cambia cómo cae una pérdida repentina de empleo, aunque no evite las malas noticias",
        "Les garantiza que se harán más ricos con el tiempo",
        "Reduce automáticamente lo que deben de impuestos",
        "Significa que ya no necesitan presupuestar con cuidado",
      ],
    },
    {
      question:
        "El Río 1 da una prueba sencilla para saber si algo cuenta como fuente de ingresos. ¿Qué pregunta coincide con ella?",
      options: [
        "¿Es la opción que mejor paga en este momento?",
        "¿Podría esto seguir produciendo dinero por un tiempo, aunque otra fuente se detuviera?",
        "¿Mi familia estaría orgullosa de esta decisión en particular?",
        "¿Es algo que también podría hacer gratis?",
      ],
    },
    {
      question:
        "Alguien llama a su ingreso por rentas \"completamente pasivo\" y espera que no necesite ninguna atención. ¿Cómo reformula el Río 1 esa expectativa?",
      options: [
        "Esa expectativa es correcta; el ingreso por rentas realmente no requiere nada",
        "Debería vender la propiedad de inmediato porque es demasiado trabajo",
        "Casi ningún ingreso es realmente sin esfuerzo; es mejor describirlo como trabajo con otra forma",
        "El ingreso pasivo en realidad no existe en ninguna forma",
      ],
    },
    {
      question:
        "Una nueva empleada de tienda por horas siente que su trabajo le importa menos a Dios que el ministerio \"de verdad\". ¿Qué le diría el Río 1 sobre el trabajo?",
      options: [
        "Debería renunciar y buscar un trabajo religioso",
        "A Dios en realidad no le importa su trabajo de una forma u otra",
        "Solo los dueños de negocios hacen un trabajo con sentido",
        "El trabajo ordinario y digno que produce algo útil para otros es en sí mismo parte del diseño original",
      ],
    },
    {
      question:
        "Un hogar quiere más ingresos pero teme renunciar a todas las tardes y fines de semana durante años. ¿Hacia qué equilibrio apunta el Río 1?",
      options: [
        "Construir despacio, y tratar el descanso como parte de un patrón sostenible, no como un premio por terminar",
        "Sacrificar el descanso por completo hasta alcanzar la meta",
        "Buscar solo fuentes de ingresos que no exijan nada de tiempo",
        "Evitar agregar alguna vez una nueva fuente de ingresos",
      ],
    },
    {
      question:
        "¿Por qué el Río 1 comienza su práctica pidiéndote que anotes tus fuentes de ingresos, incluso las pequeñas u olvidadas?",
      options: [
        "Es principalmente un formulario obligatorio para efectos fiscales",
        "Ver con claridad tus fuentes, aun las pequeñas u olvidadas, es el primer acto de fidelidad con lo que tienes",
        "Garantiza ingresos más altos el año siguiente",
        "Solo sirve para quienes ya se sienten atrasados económicamente",
      ],
    },
  ],
  2: [
    {
      question:
        "Un hogar recibe un bono inesperado. Según la imagen de la reserva del Río 2, ¿cuál es el primer paso más sabio?",
      options: [
        "Gastarlo todo de inmediato porque es \"extra\"",
        "Apartar una parte ahora, porque una reserva solo ayuda si se llena durante la buena temporada",
        "Invertirlo todo de inmediato en una sola acción",
        "Regalarlo todo sin pensarlo",
      ],
    },
    {
      question:
        "Alguien dice que no puede empezar a ahorrar porque no gana lo suficiente como para que importe. ¿Cuál es la lección de la hormiga en el Río 2?",
      options: [
        "Necesitas un ingreso importante antes de que ahorrar importe",
        "Prepararse requiere hábito, no gran fuerza ni un ingreso grande",
        "Las hormigas son un mal modelo de conducta financiera",
        "Ahorrar solo importa cuando la emergencia ya ocurrió",
      ],
    },
    {
      question:
        "Después de un gran año financiero, una familia construye una casa mucho más grande y no planea nada para dar ni para un colchón. En la parábola que usa el Río 2, ¿qué salió mal?",
      options: [
        "Construir una casa más grande siempre está mal",
        "Debieron construir una casa todavía más grande",
        "El almacenamiento estaba enteramente centrado en sí mismos, sin lugar para Dios ni para otros, y ofrecía una falsa seguridad",
        "No consultaron primero a un asesor financiero",
      ],
    },
    {
      question:
        "Tus metas de ahorro se desvanecen una tras otra. Según el Río 2, ¿qué cuatro cosas hacen una meta lo bastante concreta como para cumplirla?",
      options: [
        "Nombre del banco, número de cuenta, tasa de interés y comisiones",
        "Nivel de riesgo, liquidez, estatus fiscal y plazo",
        "Una promesa, una oración, un plan y un compañero",
        "Propósito, monto, fecha límite y ritmo",
      ],
    },
    {
      question:
        "Alguien está desanimado porque solo puede ahorrar $5 a la semana y piensa que casi no cuenta. ¿Qué hace realmente por él una cantidad pequeña y regular?",
      options: [
        "Nada importante hasta que llegue a un total grande",
        "Construye el hábito, mantiene visible la meta y sobrevive a los cambios de ánimo, algo que un depósito único no puede hacer",
        "Solo sirve como deducción de impuestos",
        "Debe evitarse a favor de esperar una cantidad mayor",
      ],
    },
    {
      question:
        "Un hogar quiere probar \"págate a ti primero\". ¿Cómo se ve eso día a día?",
      options: [
        "Esperar hasta fin de mes para ahorrar lo que haya sobrado",
        "Ahorrar solo los ingresos extras, nunca los sueldos regulares",
        "Mover una cantidad fija al ahorro en el momento en que llega el ingreso, antes de gastar cualquier otra cosa",
        "Ahorrar solo después de pagar todas las deudas por completo",
      ],
    },
    {
      question:
        "Una persona que va armando ahorros también tiene un saldo de tarjeta de crédito con intereses altos y no sabe en qué enfocarse. ¿Por qué dice el Río 2 que la deuda costosa suele necesitar atención urgente?",
      options: [
        "En realidad no importa cuál va primero",
        "Los intereses pagados por la deuda costosa muchas veces superan lo que los ahorros podrían ganar, anulando el beneficio de ahorrar",
        "La deuda descalifica automáticamente a alguien para ahorrar",
        "Las empresas de tarjetas exigen que el ahorro vaya primero",
      ],
    },
    {
      question:
        "Alguien sigue gastando de más en cosas que no necesita porque se compara con otras personas. ¿Qué hábito sugiere el Río 2 para construir contentamiento?",
      options: [
        "Evitar volver a comprar algo nuevo",
        "Comparar las compras con amigos antes de decidir",
        "Comprar solo cosas que estén en oferta",
        "Dar a las compras no esenciales un período de enfriamiento de unos días antes de comprar",
      ],
    },
    {
      question:
        "Una pareja no puede decidir qué atender primero: un colchón de emergencia, una deuda costosa o una meta a largo plazo como un enganche. ¿Qué orden plantea en general el Río 2?",
      options: [
        "Primero las metas a largo plazo, porque son las que más tardan",
        "Un pequeño colchón inicial, luego la deuda costosa, luego un colchón más completo y después las metas de más largo plazo",
        "Lo que se sienta más urgente emocionalmente en el momento",
        "Todas las metas con cantidades iguales al mismo tiempo",
      ],
    },
    {
      question:
        "La práctica del Río 2 es fijar una meta y anotar un primer depósito. ¿Por qué te empuja a anotar incluso una cantidad inicial diminuta en lugar de esperar a poder dar una \"significativa\"?",
      options: [
        "Las cantidades pequeñas en realidad no cuentan para la meta",
        "Es solo una formalidad que se exige para desbloquear el siguiente río",
        "El hábito de presentarse con honestidad, aun con un número pequeño, es lo que la práctica realmente está construyendo",
        "Anotar no es realmente necesario si lo recuerdas mentalmente",
      ],
    },
  ],
  3: [
    {
      question:
        "Un amigo deja un dinero inesperado en una cuenta que casi no gana nada porque invertir le da miedo. ¿Cómo describe el Río 3 esa decisión, usando la parábola de los talentos?",
      options: [
        "Sabia y completamente segura",
        "No es neutral, porque dejar el dinero ocioso mientras pierde terreno es una forma de fracaso, no de seguridad",
        "La mejor opción posible",
        "Exactamente lo que exigen las Escrituras",
      ],
    },
    {
      question:
        "Una \"oportunidad\" promete rendimientos inusualmente altos con casi ningún riesgo y te presiona para decidir rápido. ¿Qué dice el Río 3 que hagas con eso?",
      options: [
        "Actuar rápido antes de que la oportunidad desaparezca",
        "Invertir una cantidad pequeña solo para probar",
        "Tratar esas mismas características como señales de alerta y frenar",
        "Pedirle al promotor que aumente la presión para confirmar la urgencia",
      ],
    },
    {
      question:
        "El Río 3 dice que hay algo en qué invertir antes de abrir cualquier cuenta. ¿Qué es, y por qué \"rinde por más tiempo\"?",
      options: [
        "Bienes raíces, porque la propiedad siempre se valoriza",
        "Criptomonedas, porque son nuevas y de rápido crecimiento",
        "Nada, porque invertir en uno mismo en realidad no se trata",
        "En ti mismo, porque tus capacidades son activos que pueden desarrollarse o dejarse ociosos, como cualquier otro recurso",
      ],
    },
    {
      question:
        "Un nuevo inversionista está desanimado porque pasaron unos meses con casi ningún crecimiento visible. ¿Qué le dice la imagen del agricultor y la semilla del Río 3?",
      options: [
        "Rendirse e intentar algo distinto de inmediato",
        "El crecimiento real suele darse poco a poco, en un proceso que nadie controla del todo ni puede apurar",
        "Los resultados rápidos son la única señal de una buena inversión",
        "La paciencia es irrelevante para los resultados de la inversión",
      ],
    },
    {
      question:
        "Un inversionista hace preguntas sencillas antes de poner dinero: qué es esto, cómo gana y cuánto cuesta. Otro entrega su dinero porque un amigo se lo recomendó. ¿Qué diferencia marca el Río 3 entre ellos?",
      options: [
        "El entusiasmo es un buen sustituto del entendimiento",
        "Entender a qué te estás comprometiendo antes de hacerlo separa la inversión prudente de la mera esperanza",
        "Hacer preguntas primero es descortés e innecesario",
        "Solo los profesionales con licencia pueden hacer preguntas",
      ],
    },
    {
      question:
        "Una inversionista lo ha puesto todo en la empresa que la emplea. ¿A qué riesgo apunta la enseñanza del Río 3 sobre repartir el riesgo?",
      options: [
        "No hay una preocupación real; concentrar siempre es lo mejor",
        "Una sola decepción ahí podría ser devastadora, porque no hay nada más que la amortigüe",
        "La diversificación garantiza una ganancia de todos modos",
        "Tener una sola inversión principalmente simplifica los impuestos",
      ],
    },
    {
      question:
        "Alguien quiere ganar más pero cree que un curso o un mentor es un gasto inútil. ¿Qué dice el Río 3 sobre invertir en uno mismo?",
      options: [
        "Es una de las primeras inversiones y de las que rinde por más tiempo, porque afila la capacidad que produce otros ingresos",
        "Solo vale la pena para quienes ya son ricos",
        "Superarse siempre compite injustamente con otras metas",
        "Los mentores son opcionales y rara vez marcan una diferencia real",
      ],
    },
    {
      question:
        "Un inversionista puede aceptar un rendimiento menor obtenido con honestidad o uno mayor que depende de engañar a las personas. ¿Qué debe guiar la decisión, según el Río 3?",
      options: [
        "Una ganancia es una ganancia, sin importar cómo se obtenga",
        "Solo las pérdidas del propio inversionista tienen peso moral",
        "Está bien mientras sea técnicamente legal",
        "El origen de una ganancia importa; la ganancia honesta es fundamentalmente distinta de la deshonesta, aun con el mismo monto en dólares",
      ],
    },
    {
      question:
        "Alguien está a punto de tomar una gran decisión de inversión completamente solo y no le ha pedido opinión a nadie. ¿Cómo se aplica la enseñanza del Río 3 sobre el consejo?",
      options: [
        "El consejo es innecesario para las decisiones financieras personales",
        "Proverbios une repetidamente la seguridad y los planes sólidos con buscar el consejo de otros",
        "Pedir consejo es señal de fracaso financiero",
        "Solo las personas ricas realmente necesitan consejo financiero",
      ],
    },
    {
      question:
        "La práctica del Río 3 te pide anotar una aportación de inversión, aun pequeña o planeada. ¿Qué dice a quien todavía no está invirtiendo nada?",
      options: [
        "Que ha fracasado por completo en este río",
        "Que debería pedir dinero prestado para empezar a invertir de inmediato",
        "Que ese puede ser el momento de preguntarse con honestidad por qué, y qué tendría que ser cierto para empezar",
        "Que el registro rechazará una entrada si no se ha invertido nada",
      ],
    },
  ],
  4: [
    {
      question:
        "Alguien se retiene de dar porque \"se siente como una resta\" de lo que es suyo. ¿Qué dice el Río 4 que debería cambiar su manera de verlo?",
      options: [
        "Dar sí es siempre una pérdida pura",
        "Todo ya le pertenece a Dios; dar es devolver una porción de lo que nunca fue del todo nuestro desde el principio",
        "Dar solo tiene sentido si duele económicamente",
        "El dinero le pertenece por completo a quien lo ganó",
      ],
    },
    {
      question:
        "Una persona solo decide qué dar una vez que todo lo demás está pagado cada mes, y por lo general no queda nada. ¿Qué principio del Río 4 habla de eso?",
      options: [
        "Dar siempre debe ir al final, después de cualquier otro gasto",
        "Las primicias: dar primero, antes de gastar el resto, lo protege de ser consumido por gastos que se expanden",
        "Dar cada mes es innecesario para la mayoría de los hogares",
        "Está bien, porque técnicamente no se le debe nada a nadie",
      ],
    },
    {
      question:
        "Dos amigos dan la misma cantidad. Uno da con alegría y reflexión, y el otro da a regañadientes para no sentirse culpable. ¿Cómo sopesa el Río 4 los dos regalos?",
      options: [
        "Igual, porque lo que más importa es el monto en dólares",
        "El regalo a regañadientes es más significativo porque le costó más emocionalmente",
        "Ninguno cuenta si hay la más mínima duda",
        "El corazón y el motivo detrás de un regalo importan más que su tamaño o que un cumplimiento a regañadientes",
      ],
    },
    {
      question:
        "Alguien quiere ayudar a los pobres pero no sabe por dónde empezar. ¿Por dónde sugiere empezar el Río 4?",
      options: [
        "Dar exclusivamente a grandes organizaciones nacionales",
        "Empezar por los más cercanos a ti, como la familia, los vecinos, los compañeros de trabajo y los hermanos de la iglesia",
        "Evitar por completo dar directamente a personas",
        "Esperar a ser rico para empezar a dar a alguien",
      ],
    },
    {
      question:
        "Una familia con dificultades escucha que, si da más, Dios está obligado a devolverle más dinero. ¿Qué tiene de malo esa enseñanza, según el Río 4?",
      options: [
        "Es una fórmula acertada que todo cristiano debería seguir",
        "Solo es un problema para los ricos que dan, no para los que tienen dificultades",
        "Convierte el dar en una transacción y puede presionar a las personas a dar lo que no pueden pagar",
        "Las Escrituras en realidad nunca mencionan sembrar y cosechar",
      ],
    },
    {
      question:
        "Alguien lleva un registro privado de lo que da y teme que choque con la enseñanza de Jesús de dar en secreto. ¿Para qué sirve el registro, según el Río 4?",
      options: [
        "Para mostrarle algún día a otros lo generoso que ha sido",
        "Mayordomía privada, es decir, ver si lo que da coincide con sus intenciones y no ganar crédito público",
        "Es un requisito que todo cristiano debe publicar",
        "Llevar un registro y dar en secreto simplemente son incompatibles",
      ],
    },
    {
      question:
        "Un hombre rico escucha dos cosas: no pongas tu esperanza en las riquezas, y la riqueza no es mala automáticamente. ¿Qué actitud describe el Río 4 que sostiene ambas?",
      options: [
        "Sentir culpa por tener cualquier riqueza",
        "Regalar de inmediato todas las posesiones",
        "Evitar volverse más rico de aquí en adelante",
        "Disfrutar lo que se provee sin anclar la esperanza en ello, y estar listo para compartir, de modo que la riqueza se vuelva un recurso",
      ],
    },
    {
      question:
        "Alguien trata el ganar, ahorrar e invertir como toda la buena mayordomía y no tiene ningún plan para dar. ¿En qué puede convertirlo eso poco a poco, en palabras del Río 4?",
      options: [
        "En un mayordomo ideal, pues dar es crédito extra opcional",
        "En alguien que custodia un montón, en lugar de un canal",
        "En alguien automáticamente rico, sin desventajas reales",
        "Exactamente el modelo que recomienda este curso",
      ],
    },
    {
      question:
        "Un hogar quiere decidir de antemano qué dar y a dónde, en lugar de dar por impulso cada vez que alguien se lo pide. ¿Qué primer paso sugiere el Río 4?",
      options: [
        "Una decisión espontánea tomada de nuevo cada vez que surge una necesidad",
        "Ningún plan, porque planear el dar se siente poco espiritual",
        "Un plan sencillo que decida de antemano la porción, los destinatarios y el momento",
        "Una promesa pública anunciada a toda la congregación",
      ],
    },
    {
      question:
        "La práctica del Río 4 es anotar un regalo que hayas dado o planees dar. ¿Por qué el curso pone la generosidad en cuarto lugar y no en primero?",
      options: [
        "Es la menos importante de las cuatro y fácil de omitir",
        "No tiene ninguna conexión real con los otros tres ríos",
        "En realidad debería ir antes del ahorro y la inversión",
        "Completa el cuadro: el agua que se juntó y se puso a trabajar también necesita fluir de regreso hacia afuera",
      ],
    },
  ],
};

export const EXAM_ES: QuestionText[] | undefined = EXAM_ES_TEXT;
export const INTRO_QUIZ_ES: QuestionText[] | undefined = INTRO_QUIZ_ES_TEXT;
