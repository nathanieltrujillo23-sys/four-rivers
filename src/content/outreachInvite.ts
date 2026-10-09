/** The wording of the leader invitation, shared by the emails the server sends and the "open in my email app" button. */
export interface InviteOptions {
  /** The address it is written to. Left out for a message that goes to several people at once. */
  to?: string;
  approve: boolean;
  note: string;
  lang: "en" | "es";
  site: string;
}

export function inviteText({ to, approve, note, lang, site }: InviteOptions): { subject: string; body: string } {
  const link = `${site}/signin`;
  if (lang === "es") {
    const same = to ? `este mismo correo (${to})` : "el mismo correo al que llegó este mensaje";
    return {
      subject: "Te invito a dirigir un grupo de 4 Rivers",
      body: [
        "Hola,",
        "Te escribo para invitarte a dirigir un grupo de 4 Rivers, un curso gratuito de mayordomía basado en las Escrituras para jóvenes adultos. En un grupo leen juntos, conversan, oran y ven cómo va cada quien en el curso, con herramientas pensadas para líderes como tú.",
        ...(note ? [note] : []),
        approve
          ? `Crea tu cuenta gratuita con ${same} y quedarás como líder de grupo automáticamente, para que puedas crear tu primer grupo enseguida: ${link}`
          : `Crea tu cuenta gratuita con ${to ? `este correo (${to})` : "este correo"} y luego pide el estado de líder desde la página de Comunidad; lo revisaremos pronto: ${link}`,
        "Si no esperabas este mensaje, simplemente ignóralo.",
        "— Nathaniel Trujillo, fundador de 4 Rivers",
      ].join("\n\n"),
    };
  }
  const same = to ? `this same email (${to})` : "the same email address this message came to";
  return {
    subject: "An invitation to lead a 4 Rivers group",
    body: [
      "Hello,",
      "I'm writing to invite you to lead a 4 Rivers group. 4 Rivers is a free, Scripture-based course in stewardship for young adults. In a group you read together, talk, pray, and see how everyone is doing in the course, with tools made for leaders like you.",
      ...(note ? [note] : []),
      approve
        ? `Create your free account with ${same} and you will be set up as a group leader automatically, so you can start your first group right away: ${link}`
        : `Create your free account with ${to ? `this email (${to})` : "this email"}, then ask for leader status from the Community page, and we will review it soon: ${link}`,
      "If you weren't expecting this, you can simply ignore it.",
      "— Nathaniel Trujillo, founder of 4 Rivers",
    ].join("\n\n"),
  };
}
