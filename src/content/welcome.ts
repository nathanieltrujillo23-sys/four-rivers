/**
 * The founder's welcome to new learners, in both languages. It shows once at the top of the course page and is emailed
 * after sign-up. An admin can rewrite it in the Admin dashboard (Testimony tab); this is what shows until they do.
 * Plain data with no imports, so the email function can read it too.
 */
export interface WelcomeText {
  title: string;
  paragraphs: string[];
  sign: string;
}

export const WELCOME: Record<"en" | "es", WelcomeText> = {
  en: {
    title: "Welcome to 4 Rivers",
    paragraphs: [
      "Thank you for signing up. However you found your way here, I'm glad you did.",
      "I built this course because I wish someone had handed it to me when I was starting out: a way to think about money as something entrusted to us, not a score to keep. You don't need to be good with numbers, and you don't need to have much. You only need to take the next small step.",
      "Start with the Introduction, go at your own pace, and come back as often as you need. When you're ready, join a group so you're not walking through it alone. You are exactly where you are supposed to start.",
    ],
    sign: "Nathaniel Trujillo, founder of 4 Rivers",
  },
  es: {
    title: "Te damos la bienvenida a 4 Rivers",
    paragraphs: [
      "Gracias por registrarte. Sea cual sea el camino que te trajo hasta aquí, me alegra que lo hayas hecho.",
      "Creé este curso porque ojalá alguien me lo hubiera dado cuando yo empezaba: una manera de ver el dinero como algo que se nos confía, no como un marcador que hay que llevar. No necesitas ser bueno con los números, y no necesitas tener mucho. Solo necesitas dar el siguiente pequeño paso.",
      "Empieza con la Introducción, avanza a tu propio ritmo y vuelve las veces que haga falta. Cuando estés listo, únete a un grupo para no recorrer este camino a solas. Estás justo donde debes empezar.",
    ],
    sign: "Nathaniel Trujillo, fundador de 4 Rivers",
  },
};
