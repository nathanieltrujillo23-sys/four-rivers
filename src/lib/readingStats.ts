/**
 * How many readings in a row someone has done, counting back from the most recent reading that has come
 * due. A reading that is due today and not yet ticked does not break the streak (there is still time).
 */
export function readingStreak(dueDates: string[], done: Set<string>, today: string): number {
  const due = [...dueDates].sort();
  let streak = 0;
  for (let i = due.length - 1; i >= 0; i--) {
    if (done.has(due[i])) streak += 1;
    else if (due[i] === today && streak === 0) continue;
    else break;
  }
  return streak;
}
