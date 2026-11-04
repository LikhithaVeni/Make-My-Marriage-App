const ceremonies = ["Haldi", "Mehendi", "Sangeet", "Pelli", "Reception"];

/** The five ceremonies the PRD plans for, as a band under the hero. */
export function CeremonyStrip() {
  return (
    <section
      aria-labelledby="ceremonies-title"
      className="border-y border-border bg-surface px-4 py-8"
    >
      <h2
        id="ceremonies-title"
        className="text-center text-caption font-medium tracking-wider text-text-muted uppercase"
      >
        Every ceremony, planned in one place
      </h2>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {ceremonies.map((name) => (
          <li
            key={name}
            className="rounded-full border border-border bg-bg px-4 py-2 text-small text-text"
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
