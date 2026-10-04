import { area } from "../area";

/** River quizzes, the introduction quiz, and the final exam. */
export const quiz = area(
  {
    "quiz.back": "← Back to River {n} overview",
    "quiz.eyebrow": "River {n} quiz",
    "quiz.introNext":
      "Ten questions from this river's lessons. Score {pass}/10 or better to unlock River {n}. You can retake it as many times as you like.",
    "quiz.introLast":
      "Ten questions from this river's lessons. Score {pass}/10 or better to finish it off. You can retake it as many times as you like.",
    "quiz.passed": "You passed!",
    "quiz.notYet": "Not quite yet",
    "quiz.scoredPassNext": "You scored {score} of {total}. River {n} is now unlocked.",
    "quiz.scoredPassLast": "You scored {score} of {total}. Nice work finishing out the quizzes.",
    "quiz.scoredFail":
      "You scored {score} of {total}. You need {pass} to pass. Review the lessons below and try again whenever you're ready.",
    "quiz.retake": "Retake",
    "quiz.tryAgain": "Try again",
    "quiz.startRiver": "Start River {n}",
    "quiz.saveError":
      "Your score shows here, but saving it didn't go through ({error}). It may not stick after you leave this page, so try submitting again in a moment.",
    "quiz.saveFail": "Couldn't save your score.",
    "quiz.alreadyNext":
      "You've already passed this quiz, so River {n} is unlocked. Retaking it won't change anything already unlocked.",
    "quiz.alreadyLast":
      "You've already passed this quiz. Retaking it won't change anything already unlocked.",
    "quiz.correct": "Correct",
    "quiz.answered": "{n} of {total} answered",
    "quiz.submit": "Submit quiz",
    "quiz.submitting": "Submitting…",

    "introquiz.back": "← Back to introduction modules",
    "introquiz.eyebrow": "Introduction quiz",
    "introquiz.title": "Stewardship Quiz",
    "introquiz.text":
      "Ten questions from the introduction. This one's just for reinforcement; it doesn't unlock or gate anything. Retake it anytime.",
    "introquiz.already": "You've already passed this quiz.",
    "introquiz.scoredPass": "You scored {score} of {total}.",
    "introquiz.scoredFail":
      "You scored {score} of {total}. You need {pass} to pass. Review below and try again.",

    "exam.back": "← Back to River 4 overview",
    "exam.eyebrow": "Final exam",
    "exam.intro":
      "{count} questions covering all four rivers. Score {pass}/{count} ({pct}%) or better to unlock your certificate. Retake it as many times as you like.",
    "exam.already":
      "You've already passed the final exam, so your certificate is unlocked. Retaking it won't change that.",
    "exam.scoredPass": "You scored {score} of {count}. Your certificate is unlocked.",
    "exam.scoredFail":
      "You scored {score} of {count}. You need {pass} to pass. Review your answers below and try again whenever you're ready.",
    "exam.viewCert": "View your certificate",
    "exam.qOf": "Question {n} of {count}",
    "exam.answeredOf": "{n} of {count} answered",
    "exam.prev": "← Previous",
    "exam.next": "Next →",
    "exam.submit": "Submit exam",
    "exam.done": "Done",
    "exam.answerAll": "Answer every question to submit ({n} of {count} so far).",
  },
  {
    "quiz.back": "← Volver a la vista general del Río {n}",
    "quiz.eyebrow": "Cuestionario del Río {n}",
    "quiz.introNext":
      "Diez preguntas de las lecciones de este río. Obtén {pass}/10 o más para desbloquear el Río {n}. Puedes repetirlo las veces que quieras.",
    "quiz.introLast":
      "Diez preguntas de las lecciones de este río. Obtén {pass}/10 o más para terminarlo. Puedes repetirlo las veces que quieras.",
    "quiz.passed": "¡Aprobaste!",
    "quiz.notYet": "Todavía no",
    "quiz.scoredPassNext": "Obtuviste {score} de {total}. El Río {n} ya está desbloqueado.",
    "quiz.scoredPassLast": "Obtuviste {score} de {total}. Buen trabajo al terminar los cuestionarios.",
    "quiz.scoredFail":
      "Obtuviste {score} de {total}. Necesitas {pass} para aprobar. Repasa las lecciones de abajo e inténtalo de nuevo cuando estés listo.",
    "quiz.retake": "Repetir",
    "quiz.tryAgain": "Intentar de nuevo",
    "quiz.startRiver": "Empezar el Río {n}",
    "quiz.saveError":
      "Tu puntaje se muestra aquí, pero no se pudo guardar ({error}). Es posible que no se conserve cuando salgas de esta página, así que intenta enviarlo otra vez en un momento.",
    "quiz.saveFail": "No se pudo guardar tu puntaje.",
    "quiz.alreadyNext":
      "Ya aprobaste este cuestionario, así que el Río {n} está desbloqueado. Repetirlo no cambiará nada de lo ya desbloqueado.",
    "quiz.alreadyLast": "Ya aprobaste este cuestionario. Repetirlo no cambiará nada de lo ya desbloqueado.",
    "quiz.correct": "Correcta",
    "quiz.answered": "{n} de {total} respondidas",
    "quiz.submit": "Enviar cuestionario",
    "quiz.submitting": "Enviando…",

    "introquiz.back": "← Volver a los módulos de la introducción",
    "introquiz.eyebrow": "Cuestionario de la introducción",
    "introquiz.title": "Cuestionario de mayordomía",
    "introquiz.text":
      "Diez preguntas de la introducción. Este es solo para reforzar lo aprendido; no desbloquea ni bloquea nada. Repítelo cuando quieras.",
    "introquiz.already": "Ya aprobaste este cuestionario.",
    "introquiz.scoredPass": "Obtuviste {score} de {total}.",
    "introquiz.scoredFail":
      "Obtuviste {score} de {total}. Necesitas {pass} para aprobar. Repasa abajo e inténtalo de nuevo.",

    "exam.back": "← Volver a la vista general del Río 4",
    "exam.eyebrow": "Examen final",
    "exam.intro":
      "{count} preguntas sobre los cuatro ríos. Obtén {pass}/{count} ({pct}%) o más para desbloquear tu certificado. Puedes repetirlo las veces que quieras.",
    "exam.already":
      "Ya aprobaste el examen final, así que tu certificado está desbloqueado. Repetirlo no cambiará eso.",
    "exam.scoredPass": "Obtuviste {score} de {count}. Tu certificado está desbloqueado.",
    "exam.scoredFail":
      "Obtuviste {score} de {count}. Necesitas {pass} para aprobar. Repasa tus respuestas abajo e inténtalo de nuevo cuando estés listo.",
    "exam.viewCert": "Ver tu certificado",
    "exam.qOf": "Pregunta {n} de {count}",
    "exam.answeredOf": "{n} de {count} respondidas",
    "exam.prev": "← Anterior",
    "exam.next": "Siguiente →",
    "exam.submit": "Enviar examen",
    "exam.done": "Listo",
    "exam.answerAll": "Responde todas las preguntas para enviar ({n} de {count} hasta ahora).",
  },
);
