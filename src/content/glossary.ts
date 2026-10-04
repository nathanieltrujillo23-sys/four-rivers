import type { Lang } from "../i18n/LanguageContext";

/**
 * Plain-language definitions for the money words the course uses. Lessons
 * underline the first appearance of each term (see lib/glossaryText.tsx), and
 * /glossary lists them all. Definitions explain; they never recommend.
 *
 * `patterns` are regular-expression sources matched case-insensitively as
 * whole words in lesson text, one list per language. Put longer phrases first.
 */
export interface GlossaryEntry {
  id: string;
  term: { en: string; es: string };
  definition: { en: string; es: string };
  patterns: { en: string[]; es: string[] };
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "steward",
    term: { en: "Steward", es: "Mayordomo" },
    definition: {
      en: "Someone who manages what belongs to another. In this course, it means managing money and possessions as things entrusted to you by God, and being judged on faithfulness rather than on how much you had.",
      es: "Alguien que administra lo que pertenece a otro. En este curso significa manejar el dinero y las posesiones como cosas confiadas por Dios, y ser juzgado por la fidelidad más que por cuánto se tuvo.",
    },
    patterns: { en: ["stewards?"], es: ["mayordomos?", "administradores?"] },
  },
  {
    id: "stewardship",
    term: { en: "Stewardship", es: "Mayordomía" },
    definition: {
      en: "The practice of managing resources that are not ultimately yours: your income, time, abilities, and possessions, with care, wisdom, and generosity.",
      es: "La práctica de administrar recursos que en última instancia no son tuyos: tus ingresos, tu tiempo, tus capacidades y tus posesiones, con cuidado, sabiduría y generosidad.",
    },
    patterns: { en: ["stewardship"], es: ["mayordomía"] },
  },
  {
    id: "talent",
    term: { en: "Talent (the coin)", es: "Talento (la moneda)" },
    definition: {
      en: "A large unit of money in New Testament times, worth many years of a laborer's wages. In Jesus's parable, servants are given talents to put to work for their master.",
      es: "Una unidad de dinero grande en tiempos del Nuevo Testamento, equivalente a muchos años del salario de un obrero. En la parábola de Jesús, a los siervos se les dan talentos para ponerlos a trabajar para su señor.",
    },
    patterns: { en: ["talents?"], es: ["talentos?"] },
  },
  {
    id: "tithe",
    term: { en: "Tithe", es: "Diezmo" },
    definition: {
      en: "A tenth. In Scripture, giving a tenth of what you earn or harvest to God. Many churches still use the word for regular giving.",
      es: "La décima parte. En las Escrituras, dar a Dios una décima parte de lo que ganas o cosechas. Muchas iglesias todavía usan la palabra para las ofrendas regulares.",
    },
    patterns: { en: ["tithing", "tithes?"], es: ["diezmos?", "diezmar"] },
  },
  {
    id: "firstfruits",
    term: { en: "Firstfruits", es: "Primicias" },
    definition: {
      en: "The first and best part of a harvest, set aside for God before anything else is used. It shows trust that the rest will be provided.",
      es: "La primera y mejor parte de una cosecha, apartada para Dios antes de usar lo demás. Muestra confianza en que lo demás será provisto.",
    },
    patterns: { en: ["firstfruits"], es: ["primicias"] },
  },
  {
    id: "offering",
    term: { en: "Offering", es: "Ofrenda" },
    definition: {
      en: "A gift given freely to God or for the work of the church, over and above any set amount such as a tithe.",
      es: "Un regalo dado libremente a Dios o para la obra de la iglesia, además de cualquier cantidad fija como el diezmo.",
    },
    patterns: { en: ["offerings?"], es: ["ofrendas?"] },
  },
  {
    id: "income-stream",
    term: { en: "Income stream", es: "Fuente de ingresos" },
    definition: {
      en: "One distinct source of money coming in, such as a paycheck, a side job, or rent from a property. Having more than one is what the first river calls multiple streams of income.",
      es: "Una fuente distinta de dinero que entra, como un sueldo, un trabajo extra o la renta de una propiedad. Tener más de una es lo que el primer río llama múltiples fuentes de ingresos.",
    },
    patterns: { en: ["streams? of income", "income streams?"], es: ["fuentes? de ingresos?"] },
  },
  {
    id: "passive-income",
    term: { en: "Passive income", es: "Ingreso pasivo" },
    definition: {
      en: "Money that keeps coming in without you working for it hour by hour, like rent, royalties, or interest. It usually takes work, money, or time to set up first.",
      es: "Dinero que sigue entrando sin que trabajes por él hora tras hora, como rentas, regalías o intereses. Por lo general requiere trabajo, dinero o tiempo para ponerlo en marcha.",
    },
    patterns: { en: ["passive income"], es: ["ingresos? pasivos?"] },
  },
  {
    id: "royalty",
    term: { en: "Royalty", es: "Regalía" },
    definition: {
      en: "A payment you receive each time something you created, such as a book, song, or design, is sold or used.",
      es: "Un pago que recibes cada vez que algo que creaste, como un libro, una canción o un diseño, se vende o se usa.",
    },
    patterns: { en: ["royalt(?:y|ies)"], es: ["regal[ií]as?"] },
  },
  {
    id: "budget",
    term: { en: "Budget", es: "Presupuesto" },
    definition: {
      en: "A plan for your money: what comes in, what has to go out, and where the rest will go, decided before the month spends it for you.",
      es: "Un plan para tu dinero: lo que entra, lo que tiene que salir y a dónde irá el resto, decidido antes de que el mes lo gaste por ti.",
    },
    patterns: { en: ["budgets?", "budgeting"], es: ["presupuestos?", "presupuestar"] },
  },
  {
    id: "needs",
    term: { en: "Needs", es: "Necesidades" },
    definition: {
      en: "Spending you must cover to live and work: housing, food, basic transportation, utilities, insurance, and minimum debt payments.",
      es: "Gastos que debes cubrir para vivir y trabajar: vivienda, comida, transporte básico, servicios, seguros y pagos mínimos de deudas.",
    },
    patterns: { en: [], es: [] },
  },
  {
    id: "discretionary",
    term: { en: "Discretionary money", es: "Dinero opcional" },
    definition: {
      en: "What is left after the bills are paid, and so is yours to decide about: extras, saving, investing, or giving.",
      es: "Lo que queda después de pagar las cuentas, y que por lo tanto tú decides cómo usar: extras, ahorro, inversión o generosidad.",
    },
    patterns: {
      en: ["discretionary (?:money|spending|income)", "discretionary"],
      es: ["dinero opcional", "gastos? opcionales?", "discrecional(?:es)?"],
    },
  },
  {
    id: "gross-net",
    term: { en: "Gross and net pay", es: "Pago bruto y neto" },
    definition: {
      en: "Gross pay is what you earn before anything is taken out. Net pay, or take-home pay, is what actually reaches you after taxes and other deductions.",
      es: "El pago bruto es lo que ganas antes de cualquier descuento. El pago neto es lo que realmente te llega después de impuestos y otras deducciones.",
    },
    patterns: {
      en: ["take-home pay", "gross pay", "net pay"],
      es: ["pago neto", "pago bruto", "sueldo neto"],
    },
  },
  {
    id: "paycheck",
    term: { en: "Paycheck", es: "Sueldo" },
    definition: {
      en: "The regular payment you receive from an employer for your work, usually weekly, every two weeks, or monthly.",
      es: "El pago regular que recibes de un empleador por tu trabajo, normalmente cada semana, cada dos semanas o cada mes.",
    },
    patterns: { en: ["paychecks?"], es: ["sueldos?", "salarios?"] },
  },
  {
    id: "tax",
    term: { en: "Taxes", es: "Impuestos" },
    definition: {
      en: "Money required by the government, usually taken from your pay or added to purchases, to fund public services.",
      es: "Dinero que exige el gobierno, normalmente descontado de tu pago o añadido a las compras, para financiar los servicios públicos.",
    },
    patterns: { en: ["taxes", "tax"], es: ["impuestos?"] },
  },
  {
    id: "emergency-fund",
    term: { en: "Emergency fund", es: "Fondo de emergencia" },
    definition: {
      en: "Money set aside for surprises such as a car repair, a medical bill, or a lost paycheck, kept somewhere easy to reach so you do not have to borrow when trouble comes.",
      es: "Dinero apartado para sorpresas como la reparación de un auto, una cuenta médica o la pérdida de un sueldo, guardado donde sea fácil de alcanzar para no tener que pedir prestado cuando llegue el problema.",
    },
    patterns: { en: ["emergency funds?"], es: ["fondos? de emergencia"] },
  },
  {
    id: "liquidity",
    term: { en: "Liquidity", es: "Liquidez" },
    definition: {
      en: "How quickly and easily something can be turned into cash without losing value. A checking account is very liquid; a house is not.",
      es: "Qué tan rápido y fácil se puede convertir algo en efectivo sin perder valor. Una cuenta corriente es muy líquida; una casa no.",
    },
    patterns: { en: ["liquid(?:ity)?"], es: ["liquidez", "l[ií]quid[oa]s?"] },
  },
  {
    id: "savings-goal",
    term: { en: "Savings goal", es: "Meta de ahorro" },
    definition: {
      en: "A specific purpose and target amount for money you are setting aside, such as a safety cushion, a move, or tuition.",
      es: "Un propósito y una cantidad meta específicos para el dinero que estás apartando, como un colchón de seguridad, una mudanza o la matrícula.",
    },
    patterns: { en: ["savings goals?"], es: ["metas? de ahorro"] },
  },
  {
    id: "hysa",
    term: { en: "High-yield savings account (HYSA)", es: "Cuenta de ahorro de alto rendimiento (HYSA)" },
    definition: {
      en: "A savings account, often at an online bank, that pays noticeably more interest than a standard account. Rates change over time, and the money is usually still easy to withdraw.",
      es: "Una cuenta de ahorro, a menudo en un banco en línea, que paga notablemente más interés que una cuenta normal. Las tasas cambian con el tiempo y el dinero suele seguir siendo fácil de retirar.",
    },
    patterns: {
      en: ["high-yield savings accounts?", "HYSA"],
      es: ["cuentas? de ahorro de alto rendimiento", "HYSA"],
    },
  },
  {
    id: "interest",
    term: { en: "Interest", es: "Interés" },
    definition: {
      en: "The price of using money. When you borrow, interest is what you pay on top of what you borrowed. When you save or invest, it is what you may earn.",
      es: "El precio de usar dinero. Cuando pides prestado, el interés es lo que pagas además de lo prestado. Cuando ahorras o inviertes, es lo que puedes ganar.",
    },
    patterns: { en: ["interest"], es: ["intereses", "interés"] },
  },
  {
    id: "apr-apy",
    term: { en: "APR and APY", es: "APR y APY" },
    definition: {
      en: "APR is the yearly rate you pay to borrow, such as on a credit card. APY is the yearly rate you earn on savings, including the effect of compounding.",
      es: "El APR es la tasa anual que pagas por pedir prestado, por ejemplo en una tarjeta de crédito. El APY es la tasa anual que ganas en el ahorro, incluyendo el efecto del interés compuesto.",
    },
    patterns: { en: ["APR", "APY"], es: ["APR", "APY"] },
  },
  {
    id: "principal",
    term: { en: "Principal", es: "Capital inicial" },
    definition: {
      en: "The original amount of money, before any interest or growth is added. On a loan, it is the amount you borrowed.",
      es: "La cantidad original de dinero, antes de añadir intereses o crecimiento. En un préstamo, es la cantidad que pediste prestada.",
    },
    patterns: { en: ["principal"], es: ["capital inicial", "principal"] },
  },
  {
    id: "compounding",
    term: { en: "Compounding", es: "Interés compuesto" },
    definition: {
      en: "Growth that earns growth. Each period's gains are added to the total, so the next period earns on a bigger amount. The longer money compounds, the faster the curve climbs.",
      es: "Crecimiento que gana crecimiento. Las ganancias de cada período se suman al total, así que el siguiente período gana sobre una cantidad mayor. Mientras más tiempo se compone el dinero, más rápido sube la curva.",
    },
    patterns: {
      en: ["compound interest", "compounding", "compounds?"],
      es: ["inter[eé]s compuesto", "se compone", "componer"],
    },
  },
  {
    id: "tvm",
    term: { en: "Time value of money", es: "Valor del dinero en el tiempo" },
    definition: {
      en: "The idea that money available now is worth more than the same amount later, because money put to work today has time to grow.",
      es: "La idea de que el dinero disponible ahora vale más que la misma cantidad después, porque el dinero puesto a trabajar hoy tiene tiempo de crecer.",
    },
    patterns: { en: ["time value of money"], es: ["valor del dinero en el tiempo"] },
  },
  {
    id: "inflation",
    term: { en: "Inflation", es: "Inflación" },
    definition: {
      en: "The general rise in prices over time. When prices rise, each dollar buys a little less than it used to.",
      es: "El aumento general de los precios con el tiempo. Cuando los precios suben, cada dólar compra un poco menos que antes.",
    },
    patterns: { en: ["inflation"], es: ["inflaci[oó]n"] },
  },
  {
    id: "purchasing-power",
    term: { en: "Purchasing power", es: "Poder de compra" },
    definition: {
      en: "What a sum of money can actually buy. Inflation lowers it over time, even when the number in your account stays the same.",
      es: "Lo que una cantidad de dinero realmente puede comprar. La inflación lo reduce con el tiempo, aunque el número en tu cuenta se mantenga igual.",
    },
    patterns: { en: ["purchasing power", "buying power"], es: ["poder de compra", "poder adquisitivo"] },
  },
  {
    id: "credit",
    term: { en: "Credit", es: "Crédito" },
    definition: {
      en: "The ability to borrow money or buy now and pay later, based on a lender's trust that you will repay. The word comes from the Latin for to believe.",
      es: "La capacidad de pedir dinero prestado o comprar ahora y pagar después, basada en la confianza del prestamista de que pagarás. La palabra viene del latín que significa creer.",
    },
    patterns: { en: ["credit"], es: ["cr[eé]dito"] },
  },
  {
    id: "credit-score",
    term: { en: "Credit score", es: "Puntaje de crédito" },
    definition: {
      en: "A number that summarizes how reliably you have repaid what you borrowed. It is built from things like on-time payments, how much credit you use, and how long accounts have been open.",
      es: "Un número que resume qué tan confiablemente has pagado lo que pediste prestado. Se basa en cosas como los pagos a tiempo, cuánto crédito usas y cuánto tiempo llevan abiertas las cuentas.",
    },
    patterns: { en: ["credit scores?"], es: ["puntajes? de cr[eé]dito", "puntuaci[oó]n de cr[eé]dito"] },
  },
  {
    id: "debt",
    term: { en: "Debt", es: "Deuda" },
    definition: {
      en: "Money you owe to someone else. Scripture treats it as a real obligation: a claim another person holds on your future income.",
      es: "Dinero que le debes a otra persona. Las Escrituras lo tratan como una obligación real: un derecho que otra persona tiene sobre tus ingresos futuros.",
    },
    patterns: { en: ["debts?"], es: ["deudas?"] },
  },
  {
    id: "loan",
    term: { en: "Loan", es: "Préstamo" },
    definition: {
      en: "Money borrowed that must be paid back, usually with interest, over an agreed time.",
      es: "Dinero prestado que debe devolverse, normalmente con intereses, en un plazo acordado.",
    },
    patterns: { en: ["loans?"], es: ["pr[eé]stamos?"] },
  },
  {
    id: "mortgage",
    term: { en: "Mortgage", es: "Hipoteca" },
    definition: {
      en: "A long-term loan used to buy a home, with the home itself as security for the lender.",
      es: "Un préstamo a largo plazo para comprar una vivienda, con la vivienda misma como garantía para el prestamista.",
    },
    patterns: { en: ["mortgages?"], es: ["hipotecas?"] },
  },
  {
    id: "minimum-payment",
    term: { en: "Minimum payment", es: "Pago mínimo" },
    definition: {
      en: "The smallest amount a lender requires you to pay each month to stay in good standing. Paying only the minimum usually means the debt, and its interest, lasts much longer.",
      es: "La cantidad más pequeña que un prestamista exige cada mes para estar al corriente. Pagar solo el mínimo normalmente hace que la deuda, y sus intereses, dure mucho más.",
    },
    patterns: { en: ["minimum payments?", "minimums?"], es: ["pagos? m[ií]nimos?"] },
  },
  {
    id: "debt-snowball",
    term: { en: "Debt snowball", es: "Bola de nieve de deudas" },
    definition: {
      en: "A way of paying off debts by sending every extra dollar to the smallest balance while paying minimums on the rest. When it is paid off, that payment rolls onto the next one, growing like a snowball.",
      es: "Una forma de pagar deudas enviando cada dólar extra al saldo más pequeño mientras se pagan los mínimos del resto. Al terminarlo, ese pago pasa a la siguiente deuda, creciendo como una bola de nieve.",
    },
    patterns: { en: ["debt snowball", "snowball"], es: ["bola de nieve de deudas", "bola de nieve"] },
  },
  {
    id: "investing",
    term: { en: "Investing", es: "Inversión" },
    definition: {
      en: "Putting money into something, like a business, a fund, or shares, with the aim of growing it over time. Unlike saving, investing accepts the chance of losing value.",
      es: "Poner dinero en algo, como un negocio, un fondo o acciones, con el fin de hacerlo crecer con el tiempo. A diferencia del ahorro, invertir acepta la posibilidad de perder valor.",
    },
    patterns: { en: ["investing", "invest"], es: ["inversi[oó]n", "invertir"] },
  },
  {
    id: "stock",
    term: { en: "Stock (share)", es: "Acción" },
    definition: {
      en: "A small piece of ownership in a company. If the company does well, the stock may rise in value and sometimes pays dividends. If it does poorly, it can fall.",
      es: "Una pequeña parte de la propiedad de una empresa. Si a la empresa le va bien, la acción puede subir de valor y a veces paga dividendos. Si le va mal, puede bajar.",
    },
    patterns: { en: ["stocks?", "stockholders?"], es: ["acciones", "acci[oó]n", "accionistas?"] },
  },
  {
    id: "bond",
    term: { en: "Bond", es: "Bono" },
    definition: {
      en: "A loan you make to a company or government in return for regular interest and your money back later. Bonds are usually steadier than stocks, but they are not risk-free.",
      es: "Un préstamo que le haces a una empresa o gobierno a cambio de intereses regulares y la devolución de tu dinero más adelante. Los bonos suelen ser más estables que las acciones, pero no están libres de riesgo.",
    },
    patterns: { en: ["bonds?"], es: ["bonos?"] },
  },
  {
    id: "sp500",
    term: { en: "S&P 500", es: "S&P 500" },
    definition: {
      en: "A list of 500 large U.S. companies used to measure how the stock market is doing. Its long-run average yearly return has been around 10% before inflation, with big ups and downs along the way.",
      es: "Una lista de 500 grandes empresas de EE. UU. que se usa para medir cómo va el mercado de valores. Su rendimiento anual promedio de largo plazo ha sido cerca de 10% antes de la inflación, con grandes altibajos en el camino.",
    },
    patterns: { en: ["S&P 500", "S&P"], es: ["S&P 500", "S&P"] },
  },
  {
    id: "index-fund",
    term: { en: "Index fund", es: "Fondo indexado" },
    definition: {
      en: "A fund that holds all the investments in a market index, like the S&P 500, instead of picking a few. It spreads your money widely and usually charges low fees.",
      es: "Un fondo que contiene todas las inversiones de un índice del mercado, como el S&P 500, en lugar de escoger unas pocas. Reparte tu dinero ampliamente y suele cobrar comisiones bajas.",
    },
    patterns: { en: ["index funds?"], es: ["fondos? indexados?", "fondos? de [ií]ndice"] },
  },
  {
    id: "mutual-fund",
    term: { en: "Mutual fund and ETF", es: "Fondo mutuo y ETF" },
    definition: {
      en: "Ways of pooling your money with many other people's to buy a basket of investments. A mutual fund is bought at the end of the day; an ETF trades through the day like a stock.",
      es: "Formas de juntar tu dinero con el de muchas otras personas para comprar un conjunto de inversiones. Un fondo mutuo se compra al cierre del día; un ETF se negocia durante el día como una acción.",
    },
    patterns: { en: ["mutual funds?", "ETFs?"], es: ["fondos? mutuos?", "ETFs?"] },
  },
  {
    id: "diversification",
    term: { en: "Diversification", es: "Diversificación" },
    definition: {
      en: "Spreading money across many different investments so that one doing badly does not sink the whole. It is the investing version of not putting all your eggs in one basket.",
      es: "Repartir el dinero en muchas inversiones distintas para que una que vaya mal no hunda todo. Es la versión de inversión de no poner todos los huevos en una sola canasta.",
    },
    patterns: { en: ["diversif\\w*"], es: ["diversific\\w*"] },
  },
  {
    id: "dividend",
    term: { en: "Dividend", es: "Dividendo" },
    definition: {
      en: "A share of a company's profit paid out to its stockholders, usually every few months.",
      es: "Una parte de las ganancias de una empresa que se paga a sus accionistas, normalmente cada pocos meses.",
    },
    patterns: { en: ["dividends?"], es: ["dividendos?"] },
  },
  {
    id: "risk",
    term: { en: "Risk", es: "Riesgo" },
    definition: {
      en: "The chance that an outcome turns out worse than hoped, including losing some or all of the money you put in. Higher possible returns usually come with higher risk.",
      es: "La posibilidad de que un resultado sea peor de lo esperado, incluyendo perder parte o todo el dinero que pusiste. Los rendimientos posibles más altos normalmente traen más riesgo.",
    },
    patterns: { en: ["risks?"], es: ["riesgos?"] },
  },
  {
    id: "return",
    term: { en: "Return", es: "Rendimiento" },
    definition: {
      en: "What an investment earns or loses over a period, usually shown as a percentage of the amount invested. Past returns do not guarantee future ones.",
      es: "Lo que una inversión gana o pierde en un período, normalmente mostrado como porcentaje de lo invertido. Los rendimientos pasados no garantizan los futuros.",
    },
    patterns: {
      en: ["rates? of return", "(?:annual|investment|average) returns?"],
      es: ["tasas? de rendimiento", "rendimientos? (?:anual(?:es)?|promedio)"],
    },
  },
  {
    id: "asset",
    term: { en: "Asset", es: "Activo" },
    definition: {
      en: "Anything you own that has value, such as cash, investments, a car, or a home.",
      es: "Cualquier cosa que posees y que tiene valor, como efectivo, inversiones, un auto o una casa.",
    },
    patterns: { en: ["assets?"], es: ["activos?"] },
  },
  {
    id: "portfolio",
    term: { en: "Portfolio", es: "Cartera de inversiones" },
    definition: {
      en: "The whole collection of investments someone holds.",
      es: "El conjunto completo de inversiones que alguien tiene.",
    },
    patterns: { en: ["portfolios?"], es: ["carteras? de inversi[oó]n", "carteras?"] },
  },
  {
    id: "retirement-account",
    term: { en: "Retirement account (401(k), IRA)", es: "Cuenta de retiro (401(k), IRA)" },
    definition: {
      en: "An account built for long-term saving for later life, often with tax advantages. A 401(k) is offered through an employer; an IRA you open yourself.",
      es: "Una cuenta diseñada para ahorrar a largo plazo para la vejez, a menudo con ventajas fiscales. Un 401(k) se ofrece a través de un empleador; una IRA la abres tú mismo.",
    },
    patterns: {
      en: ["retirement accounts?", "401\\(k\\)s?", "IRAs?"],
      es: ["cuentas? de retiro", "401\\(k\\)s?", "IRAs?"],
    },
  },
  {
    id: "roth-ira",
    term: { en: "Roth IRA", es: "Roth IRA" },
    definition: {
      en: "A retirement account funded with money you have already paid tax on. Qualified withdrawals in retirement are generally tax-free. Rules and limits apply.",
      es: "Una cuenta de retiro que se llena con dinero sobre el que ya pagaste impuestos. Los retiros calificados en la jubilación generalmente están libres de impuestos. Aplican reglas y límites.",
    },
    patterns: { en: ["Roth IRAs?", "Roth"], es: ["Roth IRAs?", "Roth"] },
  },
  {
    id: "employer-match",
    term: { en: "Employer match", es: "Aporte del empleador" },
    definition: {
      en: "Money an employer adds to your retirement account when you contribute, usually up to a limit. It is part of your pay that is only collected if you take part.",
      es: "Dinero que un empleador añade a tu cuenta de retiro cuando tú aportas, normalmente hasta un límite. Es parte de tu pago que solo se recibe si participas.",
    },
    patterns: {
      en: ["employer match", "company match"],
      es: ["aporte del empleador", "contribuci[oó]n del empleador"],
    },
  },
  {
    id: "fees",
    term: { en: "Fees and expense ratio", es: "Comisiones y razón de gastos" },
    definition: {
      en: "Costs charged for holding or managing an account or fund. An expense ratio is a fund's yearly fee as a percentage of your money. Small fees add up over many years.",
      es: "Costos que se cobran por tener o administrar una cuenta o fondo. La razón de gastos es la comisión anual de un fondo como porcentaje de tu dinero. Las comisiones pequeñas se acumulan con los años.",
    },
    patterns: { en: ["expense ratios?", "fees?"], es: ["razón de gastos", "comisiones?"] },
  },
  {
    id: "volatility",
    term: { en: "Volatility", es: "Volatilidad" },
    definition: {
      en: "How much and how fast an investment's price swings up and down. Stocks are more volatile than savings accounts.",
      es: "Cuánto y qué tan rápido sube y baja el precio de una inversión. Las acciones son más volátiles que las cuentas de ahorro.",
    },
    patterns: { en: ["volatil\\w+"], es: ["volatilidad", "vol[aá]til(?:es)?"] },
  },
];

export function glossaryTerm(entry: GlossaryEntry, lang: Lang): string {
  return entry.term[lang];
}

export function glossaryDefinition(entry: GlossaryEntry, lang: Lang): string {
  return entry.definition[lang];
}
