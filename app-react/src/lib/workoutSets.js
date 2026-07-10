export function calcDayTotalCarga(day) {
  let total = 0;
  [...day.exercicios, ...day.pos].forEach(ex => {
    const count = parseInt(ex.series, 10);
    if (!count) return;
    for (let n = 1; n <= count; n++) {
      const done = localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true';
      const carga = parseFloat(localStorage.getItem(`set_${ex.nome}_${n}_carga`));
      if (done && !isNaN(carga)) total += carga;
    }
  });
  return total;
}

export function gatherExerciseDetails(day) {
  return [...day.exercicios, ...day.pos]
    .map(ex => {
      const count = parseInt(ex.series, 10) || 0;
      const sets = Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        return {
          n,
          done: localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true',
          carga: localStorage.getItem(`set_${ex.nome}_${n}_carga`) || null,
          reps: localStorage.getItem(`set_${ex.nome}_${n}_reps`) || null,
        };
      });
      return { nome: ex.nome, sets };
    })
    .filter(ex => ex.sets.length > 0);
}

export function countSets(exercises) {
  let done = 0, total = 0;
  exercises.forEach(ex => ex.sets.forEach(s => { total++; if (s.done) done++; }));
  return { done, total };
}

export function allSetsDone(ex, setCount) {
  for (let n = 1; n <= setCount; n++) {
    if (localStorage.getItem(`set_${ex.nome}_${n}_done`) !== 'true') return false;
  }
  return true;
}
